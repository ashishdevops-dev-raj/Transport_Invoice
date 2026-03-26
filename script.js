const itemsBody = document.getElementById("itemsBody");
const rowTemplate = document.getElementById("rowTemplate");
const addRowBtn = document.getElementById("addRowBtn");
const printBtn = document.getElementById("printBtn");

const grandTotalEl = document.getElementById("grandTotal");
const amountWordsEl = document.getElementById("amountWords");

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
