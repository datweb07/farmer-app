import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = "D:/final app/final app/docs/BÁO CÁO TÀI CHÍNH FINAL - CHAMP MẠNH CHAT.xlsx";
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(source));

const overview = await wb.inspect({
  kind: "workbook,sheet",
  maxChars: 6000,
});
console.log(overview.ndjson);

const checks = await wb.inspect({
  kind: "table",
  range: "Kiểm tra!A4:D13",
  include: "values,formulas",
  maxChars: 6000,
});
console.log(checks.ndjson);

const cash = await wb.inspect({
  kind: "table",
  range: "Dòng tiền 24 tháng!A4:P29",
  include: "values,formulas",
  maxChars: 9000,
});
console.log(cash.ndjson);

const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula errors",
});
console.log(errors.ndjson);
