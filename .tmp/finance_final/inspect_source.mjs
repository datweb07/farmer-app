import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = "D:/final app/final app/docs/BÁO CÁO TÀI CHÍNH SUZ2026  (3).xlsx";
const outDir = "D:/final app/final app/.tmp/finance_final/source_render";
await fs.mkdir(outDir, { recursive: true });
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const overview = await wb.inspect({
  kind: "workbook,sheet,table",
  maxChars: 9000,
  tableMaxRows: 8,
  tableMaxCols: 10,
  tableMaxCellChars: 100,
});
console.log(overview.ndjson);
for (const sheetName of ["1. Giả định & Thông số", "2. Báo cáo Ngân lưu", "6. Đánh Giá Tài Chính"]) {
  const img = await wb.render({ sheetName, autoCrop: "all", scale: 0.8, format: "png" });
  await fs.writeFile(`${outDir}/${sheetName.replace(/[\\/:*?\"<>|]/g, "_")}.png`, new Uint8Array(await img.arrayBuffer()));
}
