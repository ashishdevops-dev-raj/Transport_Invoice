const itemsBody = document.getElementById("itemsBody");
const rowTemplate = document.getElementById("rowTemplate");
const addRowBtn = document.getElementById("addRowBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const printBtn = document.getElementById("printBtn");

const grandTotalEl = document.getElementById("grandTotal");
const amountWordsEl = document.getElementById("amountWords");

const PDF_MARGIN_MM = 4;
const PDF_CANVAS_SCALE = 2;
const PDF_JPEG_QUALITY = 0.92;
const PDF_DEFAULT_FILENAME = "GST-Invoice";
const CSS_DPI = 96;

function trackEvent(eventName, params = {}) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

/** @param {number} n */
function formatMoney(n) {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** @param {number} n */
function clampInt(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function toWordsIndian(numValue) {
  const n = clampInt(numValue);
  if (n === 0) return "Zero Only.";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(x) {
    if (x === 0) return "";
    if (x < 20) return ones[x];
    const t = Math.trunc(x / 10);
    const o = x % 10;
    return `${tens[t]}${o ? ` ${ones[o]}` : ""}`.trim();
  }

  function threeDigits(x) {
    const h = Math.trunc(x / 100);
    const r = x % 100;
    const parts = [];
    if (h) parts.push(`${ones[h]} Hundred`);
    if (r) parts.push(twoDigits(r));
    return parts.join(" ").trim();
  }

  const crore = Math.trunc(n / 10000000);
  const lakh = Math.trunc((n / 100000) % 100);
  const thousand = Math.trunc((n / 1000) % 100);
  const hundredPart = n % 1000;

  const out = [];
  if (crore) out.push(`${twoDigits(crore)} Crore`);
  if (lakh) out.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) out.push(`${twoDigits(thousand)} Thousand`);
  if (hundredPart) out.push(threeDigits(hundredPart));

  return `${out.join(" ").replace(/\s+/g, " ").trim()} Only.`;
}

const newItemDefaults = {
  desc: "",
  qty: 1,
  rate: 0
};

function num(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createRow(data = {}) {
  const fragment = rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector("tr");

  row.querySelector(".desc").value = data.desc ?? "";
  row.querySelector(".qty").value = data.qty ?? 1;
  row.querySelector(".rate").value = data.rate ?? 0;

  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", recalculateAll);
  });

  row.querySelector(".deleteBtn").addEventListener("click", () => {
    row.remove();
    recalculateAll();
  });

  itemsBody.appendChild(fragment);
  recalculateAll();
}

function recalculateRow(row) {
  const qty = num(row.querySelector(".qty").value);
  const rate = num(row.querySelector(".rate").value);

  const amount = qty * rate;
  row.querySelector(".amountCell").textContent = formatMoney(amount);

  return { amount };
}

function recalculateAll() {
  const rows = [...itemsBody.querySelectorAll("tr")];
  let total = 0;

  rows.forEach((row, idx) => {
    row.querySelector(".rowNo").textContent = idx + 1;
    const values = recalculateRow(row);
    total += values.amount;
  });

  grandTotalEl.textContent = formatMoney(total);
  if (amountWordsEl) amountWordsEl.textContent = toWordsIndian(total);
}

addRowBtn.addEventListener("click", () => {
  createRow(newItemDefaults);
  trackEvent("add_item", {
    source: "invoice_table",
    item_count: itemsBody.querySelectorAll("tr").length
  });
});
if (printBtn) {
  printBtn.addEventListener("click", () => {
    trackEvent("print_click", {
      invoice_no: document.getElementById("invoiceNo")?.value?.trim() || ""
    });
    window.print();
  });
}

function addCanvasAsPagedPdf(pdf, canvas, marginMm) {
  const pageInnerW = pdf.internal.pageSize.getWidth() - 2 * marginMm;
  const pageInnerH = pdf.internal.pageSize.getHeight() - 2 * marginMm;
  const mmPerPx = pageInnerW / canvas.width;
  const pageSliceHeightPx = Math.max(1, Math.floor(pageInnerH / mmPerPx));
  let yOffsetPx = 0;
  let pageIndex = 0;

  while (yOffsetPx < canvas.height) {
    const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - yOffsetPx);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const pageCtx = pageCanvas.getContext("2d");
    if (!pageCtx) break;

    pageCtx.drawImage(
      canvas,
      0,
      yOffsetPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      pageCanvas.width,
      pageCanvas.height
    );

    const pageImgData = pageCanvas.toDataURL("image/jpeg", PDF_JPEG_QUALITY);
    const sliceHeightMm = sliceHeightPx * mmPerPx;

    if (pageIndex > 0) {
      pdf.addPage();
    }
    pdf.addImage(pageImgData, "JPEG", marginMm, marginMm, pageInnerW, sliceHeightMm);

    yOffsetPx += sliceHeightPx;
    pageIndex += 1;
  }
}

function addCanvasFitToSinglePdfPage(pdf, canvas, marginMm) {
  const pageInnerW = pdf.internal.pageSize.getWidth() - 2 * marginMm;
  const pageInnerH = pdf.internal.pageSize.getHeight() - 2 * marginMm;

  const imgAspect = canvas.width / canvas.height;
  const boxAspect = pageInnerW / pageInnerH;
  let finalW;
  let finalH;
  if (imgAspect > boxAspect) {
    finalW = pageInnerW;
    finalH = pageInnerW / imgAspect;
  } else {
    finalH = pageInnerH;
    finalW = pageInnerH * imgAspect;
  }

  const x = marginMm + (pageInnerW - finalW) / 2;
  const y = marginMm + (pageInnerH - finalH) / 2;
  const imgData = canvas.toDataURL("image/jpeg", PDF_JPEG_QUALITY);
  pdf.addImage(imgData, "JPEG", x, y, finalW, finalH);
}

function restorePdfUiState(hideElements, pageElement, tableWrap, prevPageMaxWidth, prevTableOverflow, prevTableOverflowX) {
  hideElements.forEach((element) => {
    element.style.display = element.dataset.prevDisplay || "";
    delete element.dataset.prevDisplay;
  });
  document.body.classList.remove("pdf-export");
  pageElement.style.maxWidth = prevPageMaxWidth;
  if (tableWrap) {
    tableWrap.style.overflow = prevTableOverflow;
    tableWrap.style.overflowX = prevTableOverflowX;
  }
}

downloadPdfBtn.addEventListener("click", async () => {
  const JsPDF = window.jspdf?.jsPDF || window.jspdf?.default;
  if (typeof html2canvas === "undefined" || typeof JsPDF !== "function") {
    alert("PDF libraries are not loaded. Please check internet and reload the page.");
    return;
  }

  const invoiceNo = document.getElementById("invoiceNo").value.trim() || "invoice";
  const fileName = `Invoice-${invoiceNo}.pdf`;
  const pageElement = document.querySelector(".page");
  const hideElements = document.querySelectorAll(".no-print");
  const tableWrap = document.querySelector(".table-wrap");

  const pdfLabelDefault = downloadPdfBtn.textContent;
  downloadPdfBtn.disabled = true;
  downloadPdfBtn.setAttribute("aria-busy", "true");
  downloadPdfBtn.textContent = "Generating…";

  hideElements.forEach((element) => {
    element.dataset.prevDisplay = element.style.display;
    element.style.display = "none";
  });
  document.body.classList.add("pdf-export");

  const prevPageMaxWidth = pageElement.style.maxWidth;
  const prevPageWidth = pageElement.style.width;
  const prevPageMargin = pageElement.style.margin;
  const prevTableOverflow = tableWrap ? tableWrap.style.overflow : "";
  const prevTableOverflowX = tableWrap ? tableWrap.style.overflowX : "";
  pageElement.style.maxWidth = "none";
  if (tableWrap) {
    tableWrap.style.overflow = "visible";
    tableWrap.style.overflowX = "visible";
  }

  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const pdf = new JsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true
    });
    const pageInnerW = pdf.internal.pageSize.getWidth() - 2 * PDF_MARGIN_MM;
    const exportCssWidthPx = Math.max(1, Math.round((pageInnerW / 25.4) * CSS_DPI));
    pageElement.style.width = `${exportCssWidthPx}px`;
    pageElement.style.margin = "0";

    const canvas = await html2canvas(pageElement, {
      scale: PDF_CANVAS_SCALE,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: pageElement.scrollWidth,
      windowHeight: pageElement.scrollHeight
    });

    addCanvasFitToSinglePdfPage(pdf, canvas, PDF_MARGIN_MM);
    pdf.save(fileName);
    trackEvent("download_pdf_success", {
      invoice_no: invoiceNo
    });
  } catch (err) {
    console.error(err);
    trackEvent("download_pdf_failed", {
      invoice_no: invoiceNo
    });
    alert("Could not create PDF. Try again or use fewer rows.");
  } finally {
    restorePdfUiState(hideElements, pageElement, tableWrap, prevPageMaxWidth, prevTableOverflow, prevTableOverflowX);
    pageElement.style.width = prevPageWidth;
    pageElement.style.margin = prevPageMargin;
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.setAttribute("aria-busy", "false");
    downloadPdfBtn.textContent = pdfLabelDefault;
  }
});

const today = new Date().toISOString().split("T")[0];
document.getElementById("invoiceDate").value = today;

createRow({
  desc: "Vehicle",
  qty: 2,
  rate: 42000
});

createRow({
  desc: "EXTRA 10 hrs (100rs per hr)",
  qty: 2,
  rate: 1000
});
