# InvoiceDesk — GST Invoice Creator

A simple, browser-based GST invoice you can edit and export to **PDF** (single A4 landscape page, scaled to fit).

## How to use

1. Open `index.html` in a modern browser (Chrome, Edge, or Firefox).
2. Edit party details, invoice number, date, and line items.
3. Use **+ Add Item** for more rows; use the trash icon to remove a row.
4. **Download PDF** needs an internet connection the first time (loads `html2canvas` + `jsPDF` from CDN).

## Calculations

- **Taxable** = Qty × Rate  
- **GST Amt** = Taxable × GST% ÷ 100  
- **SGST / CGST** (summary) = each half of the line GST% on taxable (e.g. 5% → 2.5% + 2.5%). Labels use **PAYBLE** to match common invoice print style.  
- **Grand total** = rounded to the nearest rupee; **Round Off** shows the adjustment.

## Files

| File        | Role                          |
|------------|--------------------------------|
| `index.html` | Structure + row template     |
| `styles.css` | Layout, print, PDF export tweaks |
| `script.js`  | Rows, totals, PDF export     |

## Print

Use the browser’s **Print** dialog for paper; `.no-print` hides action buttons.
