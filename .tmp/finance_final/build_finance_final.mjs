import fs from "node:fs/promises";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const outPath = "D:/final app/final app/docs/BÁO CÁO TÀI CHÍNH FINAL - CHAMP MẠNH CHAT.xlsx";
const qaDir = "D:/final app/final app/.tmp/finance_final/final_render";
await fs.mkdir(qaDir, { recursive: true });

const wb = Workbook.create();
const summary = wb.worksheets.add("Tóm tắt");
const part5 = wb.worksheets.add("Phần 5 nộp hồ sơ");
const assumptions = wb.worksheets.add("Giả định");
const model = wb.worksheets.add("Mô hình 5 năm");
const monthly = wb.worksheets.add("Dòng tiền 24 tháng");
const funding = wb.worksheets.add("Nguồn vốn");
const sensitivity = wb.worksheets.add("Độ nhạy");
const checks = wb.worksheets.add("Kiểm tra");

const FONT = "Arial";
const NAVY = "#17365D";
const GREEN = "#1F6B4F";
const GREEN2 = "#D9EAD3";
const BLUE = "#0000FF";
const LINK = "#008000";
const DARK = "#1F2937";
const MID = "#5B6573";
const LIGHT = "#F3F6F8";
const AMBER = "#FFF2CC";
const RED = "#C00000";
const PALE_RED = "#FCE8E6";
const WHITE = "#FFFFFF";
const BORDER = "#D9E1F2";
const MONEY = '#,##0;[Red](#,##0);-';
const PCT = '0.0%;[Red](0.0%);-';
const DEC = '0.0';

function title(sheet, text, lastCol = "H") {
  sheet.mergeCells(`A2:${lastCol}2`);
  const r = sheet.getRange(`A2:${lastCol}2`);
  r.values = [[text]];
  r.format.font = { name: FONT, size: 15, bold: true, color: NAVY };
  r.format.rowHeight = 26;
  r.format.verticalAlignment = "center";
  const rule = sheet.getRange(`A3:${lastCol}3`);
  rule.format.borders = { bottom: { style: "thin", color: NAVY } };
}

function section(sheet, row, text, lastCol = "F") {
  const r = sheet.getRange(`A${row}:${lastCol}${row}`);
  r.values = [[text]];
  r.format = {
    fill: NAVY,
    font: { name: FONT, size: 10, bold: true, color: WHITE },
    verticalAlignment: "center",
  };
  r.format.rowHeight = 22;
  r.format.borders = { preset: "outside", style: "thin", color: NAVY };
}

function header(range) {
  range.format = {
    fill: GREEN,
    font: { name: FONT, size: 10, bold: true, color: WHITE },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
  };
  range.format.borders = { preset: "all", style: "thin", color: WHITE };
}

function body(range, wrap = false) {
  range.format.font = { name: FONT, size: 10, color: DARK };
  range.format.verticalAlignment = "center";
  range.format.wrapText = wrap;
  range.format.borders = {
    insideHorizontal: { style: "thin", color: BORDER },
    bottom: { style: "thin", color: BORDER },
  };
}

function setWidths(sheet, widths) {
  for (const [col, width] of Object.entries(widths)) {
    sheet.getRange(`${col}:${col}`).format.columnWidth = width;
  }
}

function styleInput(range, fmt = null) {
  range.format.font = { name: FONT, size: 10, color: BLUE };
  range.format.fill = AMBER;
  if (fmt) range.format.numberFormat = fmt;
}

function styleCrossLink(range, fmt = null) {
  range.format.font = { name: FONT, size: 10, color: LINK };
  if (fmt) range.format.numberFormat = fmt;
}

function styleFormula(range, fmt = null) {
  range.format.font = { name: FONT, size: 10, color: DARK };
  if (fmt) range.format.numberFormat = fmt;
}

for (const s of [summary, part5, assumptions, model, monthly, funding, sensitivity, checks]) {
  s.showGridLines = false;
  s.getRange("A1:Z100").format.font = { name: FONT, size: 10, color: DARK };
}
summary.tabColor = NAVY;
part5.tabColor = NAVY;
assumptions.tabColor = "#5B9BD5";
model.tabColor = "#70AD47";
monthly.tabColor = "#70AD47";
funding.tabColor = "#70AD47";
sensitivity.tabColor = "#A5A5A5";
checks.tabColor = "#A5A5A5";

// -------------------- GIẢ ĐỊNH --------------------
title(assumptions, "Giả định tài chính có điều kiện", "I");
assumptions.getRange("A4:F4").values = [["Chỉ tiêu", "Năm 1", "Năm 2", "Năm 3", "Năm 4", "Năm 5"]];
header(assumptions.getRange("A4:F4"));
assumptions.getRange("A5:F9").values = [
  ["Doanh nghiệp trả phí bình quân", 1.5, 8, 18, 35, 60],
  ["Phí nền tảng bình quân (triệu đồng/DN/tháng)", 5, 6.5, 7.5, 8, 8.5],
  ["GMV giao dịch xác thực (triệu đồng)", 1800, 9900, 22000, 45000, 69500],
  ["Tỷ lệ phí giao dịch bình quân", 0.04, 0.04, 0.04, 0.04, 0.04],
  ["Doanh thu pilot, onboarding và dữ liệu (triệu đồng)", 70, 180, 300, 440, 600],
];
body(assumptions.getRange("A5:F9"), true);
styleInput(assumptions.getRange("B5:F7"), MONEY);
styleInput(assumptions.getRange("B8:F8"), PCT);
styleInput(assumptions.getRange("B9:F9"), MONEY);

section(assumptions, 11, "Chi phí vận hành", "F");
assumptions.getRange("A12:F16").values = [
  ["Nhân sự", 600, 840, 1200, 1800, 2700],
  ["Cloud, dữ liệu và bảo mật", 120, 180, 300, 480, 780],
  ["Pilot và vận hành địa bàn", 225, 210, 300, 480, 720],
  ["Bán hàng và marketing", 90, 120, 240, 420, 660],
  ["Pháp lý và hành chính", 84, 150, 210, 270, 390],
];
body(assumptions.getRange("A12:F16"));
styleInput(assumptions.getRange("B12:F16"), MONEY);
assumptions.getRange("A17:F17").values = [["Tổng chi phí vận hành", null, null, null, null, null]];
assumptions.getRange("B17").formulas = [["=SUM(B12:B16)"]];
assumptions.getRange("B17:F17").fillRight();
assumptions.getRange("A17:F17").format.font = { name: FONT, size: 10, bold: true, color: DARK };
assumptions.getRange("A17:F17").format.borders = { top: { style: "double", color: NAVY } };
styleFormula(assumptions.getRange("B17:F17"), MONEY);

section(assumptions, 19, "Đầu tư và thuế", "F");
assumptions.getRange("A20:F23").values = [
  ["Đầu tư sản phẩm và thiết bị (Capex)", 340, 150, 180, 250, 350],
  ["Thời gian khấu hao", 5, 5, 5, 5, 5],
  ["Thuế TNDN", 0.2, 0.2, 0.2, 0.2, 0.2],
  ["Nợ ngân hàng mới", 0, 0, 0, 0, 0],
];
body(assumptions.getRange("A20:F23"));
styleInput(assumptions.getRange("B20:F20"), MONEY);
styleInput(assumptions.getRange("B21:F21"), '0');
styleInput(assumptions.getRange("B22:F22"), PCT);
styleInput(assumptions.getRange("B23:F23"), MONEY);

section(assumptions, 25, "Nguyên tắc sử dụng", "F");
assumptions.mergeCells("A26:F30");
assumptions.getRange("A26:F30").values = [[
  "Các số liệu từ Năm 1 trở đi là kế hoạch có điều kiện, không phải số thực tế đã phát sinh. Mỗi tranche chỉ được giải ngân khi đạt mốc pilot hoặc thương mại. Mô hình không ghi nhận doanh thu bảo hiểm, không sử dụng nợ ngân hàng trong 24 tháng đầu và không dùng NPV/IRR làm luận điểm chính trước khi có product-market fit."
]];
assumptions.getRange("A26:F30").format = { fill: LIGHT, font: { name: FONT, size: 10, color: DARK }, wrapText: true, verticalAlignment: "top" };

assumptions.getRange("H4:I4").values = [["Nguồn", "Phạm vi sử dụng"]];
header(assumptions.getRange("H4:I4"));
assumptions.getRange("H5:I8").values = [
  ["BÁO CÁO TÀI CHÍNH SUZ2026 (3)", "Đối chiếu mô hình cũ, mức đầu tư 3.154 triệu đồng, cấu trúc vay và công thức."],
  ["File ý tưởng CHAMP MẠNH CHAT", "Giai đoạn MVP, khách hàng B2B, pilot 18 tháng và cổng kiểm chứng."],
  ["Phần 5 - Dự kiến tài chính", "Khung nội dung doanh thu, chi phí, lợi nhuận và nhu cầu nguồn lực."],
  ["Kế hoạch điều chỉnh", "Giả định mới do đội cần xác nhận bằng báo giá, phỏng vấn và hợp đồng pilot."],
];
body(assumptions.getRange("H5:I8"), true);
setWidths(assumptions, { A: 43, B: 13, C: 13, D: 13, E: 13, F: 13, G: 3, H: 33, I: 50 });
assumptions.freezePanes.freezeRows(4);

// -------------------- MÔ HÌNH 5 NĂM --------------------
title(model, "Mô hình tài chính 5 năm", "F");
model.getRange("A4:F4").values = [["Chỉ tiêu (triệu đồng)", "Năm 1", "Năm 2", "Năm 3", "Năm 4", "Năm 5"]];
header(model.getRange("A4:F4"));
const modelLabels = [
  "Doanh nghiệp trả phí bình quân",
  "Phí nền tảng bình quân",
  "Doanh thu thuê bao",
  "GMV giao dịch xác thực",
  "Tỷ lệ phí giao dịch",
  "Doanh thu phí giao dịch",
  "Doanh thu pilot, onboarding và dữ liệu",
  "Tổng doanh thu",
  "Nhân sự",
  "Cloud, dữ liệu và bảo mật",
  "Pilot và vận hành địa bàn",
  "Bán hàng và marketing",
  "Pháp lý và hành chính",
  "Tổng chi phí vận hành",
  "EBITDA",
  "Biên EBITDA",
  "Khấu hao",
  "EBIT",
  "Thuế TNDN",
  "Lợi nhuận ròng",
  "Capex",
  "Dòng tiền tự do trước tài trợ",
  "Vốn giải ngân",
  "Tiền đầu kỳ",
  "Tiền cuối kỳ",
  "Nợ ngân hàng cuối kỳ",
];
model.getRange("A5:A30").values = modelLabels.map(x => [x]);
body(model.getRange("A5:F30"));
for (let col = 1; col <= 5; col++) {
  const letter = String.fromCharCode(66 + col - 1);
  const aletter = String.fromCharCode(66 + col - 1);
  model.getRange(`${letter}5`).formulas = [[`='Giả định'!${aletter}5`]];
  model.getRange(`${letter}6`).formulas = [[`='Giả định'!${aletter}6`]];
  model.getRange(`${letter}7`).formulas = [[`=${letter}5*${letter}6*12`]];
  model.getRange(`${letter}8`).formulas = [[`='Giả định'!${aletter}7`]];
  model.getRange(`${letter}9`).formulas = [[`='Giả định'!${aletter}8`]];
  model.getRange(`${letter}10`).formulas = [[`=${letter}8*${letter}9`]];
  model.getRange(`${letter}11`).formulas = [[`='Giả định'!${aletter}9`]];
  model.getRange(`${letter}12`).formulas = [[`=SUM(${letter}7,${letter}10,${letter}11)`]];
  for (let r = 13; r <= 17; r++) model.getRange(`${letter}${r}`).formulas = [[`='Giả định'!${aletter}${r-1}`]];
  model.getRange(`${letter}18`).formulas = [[`=SUM(${letter}13:${letter}17)`]];
  model.getRange(`${letter}19`).formulas = [[`=${letter}12-${letter}18`]];
  model.getRange(`${letter}20`).formulas = [[`=IF(${letter}12=0,"n.a.",${letter}19/${letter}12)`]];
  const capexStart = "B";
  model.getRange(`${letter}21`).formulas = [[`=SUM('Giả định'!$${capexStart}$20:${aletter}20)/5`]];
  model.getRange(`${letter}22`).formulas = [[`=${letter}19-${letter}21`]];
  model.getRange(`${letter}23`).formulas = [[`=MAX(0,${letter}22*'Giả định'!${aletter}22)`]];
  model.getRange(`${letter}24`).formulas = [[`=${letter}22-${letter}23`]];
  model.getRange(`${letter}25`).formulas = [[`='Giả định'!${aletter}20`]];
  model.getRange(`${letter}26`).formulas = [[`=${letter}19-${letter}23-${letter}25`]];
  model.getRange(`${letter}27`).formulas = [[col === 1 ? "='Nguồn vốn'!F9" : (col === 2 ? "='Nguồn vốn'!F10" : "=0")]];
  model.getRange(`${letter}28`).formulas = [[col === 1 ? "=0" : `=${String.fromCharCode(letter.charCodeAt(0)-1)}29`]];
  model.getRange(`${letter}29`).formulas = [[`=${letter}28+${letter}27+${letter}26`]];
  model.getRange(`${letter}30`).formulas = [[`='Giả định'!${aletter}23`]];
}
styleCrossLink(model.getRange("B5:F6"));
styleCrossLink(model.getRange("B8:F9"));
styleCrossLink(model.getRange("B11:F18"));
styleCrossLink(model.getRange("B25:F25"), MONEY);
styleCrossLink(model.getRange("B27:F27"), MONEY);
styleCrossLink(model.getRange("B30:F30"), MONEY);
styleFormula(model.getRange("B7:F29"), MONEY);
model.getRange("B5:F5").format.numberFormat = DEC;
model.getRange("B6:F6").format.numberFormat = MONEY;
model.getRange("B9:F9").format.numberFormat = PCT;
model.getRange("B20:F20").format.numberFormat = PCT;
model.getRange("A12:F12").format.font = { name: FONT, size: 10, bold: true, color: DARK };
model.getRange("A18:F20").format.font = { name: FONT, size: 10, bold: true, color: DARK };
model.getRange("A29:F30").format.font = { name: FONT, size: 10, bold: true, color: DARK };
model.getRange("A12:F12").format.borders = { top: { style: "double", color: NAVY } };
model.getRange("A18:F18").format.borders = { top: { style: "double", color: NAVY } };
model.getRange("A29:F29").format.borders = { top: { style: "double", color: NAVY } };
setWidths(model, { A: 39, B: 14, C: 14, D: 14, E: 14, F: 14 });
model.freezePanes.freezeRows(4);

// -------------------- NGUỒN VỐN --------------------
title(funding, "Kế hoạch huy động theo từng tranche", "H");
funding.getRange("A4:H4").values = [["Tranche", "Thời điểm", "Nhà sáng lập", "Grant", "Angel/SAFE", "Đối tác chiến lược", "Tổng", "Điều kiện giải ngân"]];
header(funding.getRange("A4:H4"));
funding.getRange("A5:H7").values = [
  ["Tranche 0", "Tháng 1", 150, 250, 300, 0, null, "MVP ổn định, 3 đối tác pilot, danh sách 100 nông hộ tiềm năng"],
  ["Tranche 1", "Tháng 7", 0, 150, 300, 150, null, "Tối thiểu 10 giao dịch hoàn tất, 2 doanh nghiệp bắt đầu trả phí, có dữ liệu pilot"],
  ["Tranche 2", "Tháng 13", 0, 50, 250, 200, null, "4 doanh nghiệp trả phí, tỷ lệ hoàn tất >=70%, retention pilot >=60%"],
];
funding.getRange("G5").formulas = [["=SUM(C5:F5)"]];
funding.getRange("G5:G7").fillDown();
body(funding.getRange("A5:H7"), true);
styleInput(funding.getRange("C5:F7"), MONEY);
styleFormula(funding.getRange("G5:G7"), MONEY);
funding.getRange("A8:H8").values = [["Tổng nguồn", null, null, null, null, null, null, null]];
funding.getRange("C8").formulas = [["=SUM(C5:C7)"]];
funding.getRange("C8:G8").fillRight();
funding.getRange("A8:H8").format.font = { name: FONT, size: 10, bold: true, color: DARK };
funding.getRange("A8:H8").format.borders = { top: { style: "double", color: NAVY } };
styleFormula(funding.getRange("C8:G8"), MONEY);

// Annual timing helper consumed by the model.
funding.getRange("A9:F10").values = [
  ["Vốn giải ngân Năm 1", null, null, null, null, null],
  ["Vốn giải ngân Năm 2", null, null, null, null, null],
];
funding.getRange("F9").formulas = [["=G5+G6"]];
funding.getRange("F10").formulas = [["=G7"]];
funding.getRange("A9:F10").format.font = { name: FONT, size: 9, italic: true, color: MID };
funding.getRange("F9:F10").format.numberFormat = MONEY;

section(funding, 12, "Cơ cấu sử dụng 1.800 triệu đồng", "D");
funding.getRange("A13:D13").values = [["Hạng mục", "Số tiền", "Tỷ trọng", "Mục đích"]];
header(funding.getRange("A13:D13"));
funding.getRange("A14:D19").values = [
  ["Sản phẩm, dữ liệu và Capex", 490, null, "Bảo mật, dữ liệu, hạ tầng và sản phẩm sau MVP"],
  ["Cầu nối chi phí nhân sự", 620, null, "Giữ đội ngũ tinh gọn trong 24 tháng đầu"],
  ["Pilot và vận hành địa bàn", 320, null, "Onboarding, hỗ trợ giao dịch, đo kết quả mùa vụ"],
  ["Bán hàng và phát triển đối tác", 160, null, "Pipeline B2B, hợp đồng pilot, tài liệu bán hàng"],
  ["Pháp lý và hành chính", 120, null, "Dữ liệu cá nhân, hợp đồng, kế toán và tuân thủ"],
  ["Dự phòng", 90, null, "Biến động dữ liệu, tích hợp và mùa vụ"],
];
funding.getRange("C14").formulas = [["=B14/$B$20"]];
funding.getRange("C14:C19").fillDown();
funding.getRange("A20:D20").values = [["Tổng", null, null, ""]];
funding.getRange("B20").formulas = [["=SUM(B14:B19)"]];
funding.getRange("C20").formulas = [["=SUM(C14:C19)"]];
body(funding.getRange("A14:D20"), true);
styleInput(funding.getRange("B14:B19"), MONEY);
styleFormula(funding.getRange("C14:C20"), PCT);
funding.getRange("A20:D20").format.font = { name: FONT, size: 10, bold: true, color: DARK };
funding.getRange("A20:D20").format.borders = { top: { style: "double", color: NAVY } };
funding.getRange("F13:H13").values = [["Nguồn vốn", "Số tiền", "Tỷ trọng"]];
header(funding.getRange("F13:H13"));
funding.getRange("F14:G17").values = [
  ["Nhà sáng lập", null], ["Grant", null], ["Angel/SAFE", null], ["Đối tác chiến lược", null]
];
funding.getRange("G14").formulas = [["=C8"]];
funding.getRange("G15").formulas = [["=D8"]];
funding.getRange("G16").formulas = [["=E8"]];
funding.getRange("G17").formulas = [["=F8"]];
funding.getRange("H14").formulas = [["=G14/$G$18"]];
funding.getRange("H14:H17").fillDown();
funding.getRange("F18:H18").values = [["Tổng", null, null]];
funding.getRange("G18").formulas = [["=SUM(G14:G17)"]];
funding.getRange("H18").formulas = [["=SUM(H14:H17)"]];
body(funding.getRange("F14:H18"));
styleFormula(funding.getRange("G14:G18"), MONEY);
styleFormula(funding.getRange("H14:H18"), PCT);
funding.getRange("F18:H18").format.font = { name: FONT, size: 10, bold: true, color: DARK };
funding.getRange("F18:H18").format.borders = { top: { style: "double", color: NAVY } };
setWidths(funding, { A: 24, B: 14, C: 14, D: 14, E: 14, F: 23, G: 14, H: 55 });

// -------------------- DÒNG TIỀN 24 THÁNG --------------------
title(monthly, "Dòng tiền 24 tháng và runway", "P");
monthly.getRange("A4:P4").values = [["Tháng", "DN trả phí", "Phí/DN", "Thuê bao", "Phí giao dịch", "Pilot/onboarding", "Doanh thu", "Nhân sự", "Cloud/data", "Vận hành", "Bán hàng", "Pháp lý/HC", "EBITDA", "Capex", "Vốn giải ngân", "Tiền cuối kỳ"]];
header(monthly.getRange("A4:P4"));
const dates = [];
for (let i = 0; i < 24; i++) dates.push([new Date(2026, i, 1)]);
monthly.getRange("A5:A28").values = dates;
monthly.getRange("A5:A28").format.numberFormat = "mmm-yy";
const customers = [0,0,0,0,0,0,2,2,3,3,4,4,6,6,7,7,8,8,8,8,9,9,10,10];
const fees = [...Array(12).fill(5), ...Array(12).fill(6.5)];
const tx = [0,0,0,2,2,2,5,7,9,12,15,18,22,24,26,28,30,32,34,34,38,40,42,46];
const onboarding = [0,0,0,10,10,10,20,0,0,20,0,0,30,0,30,0,30,0,30,0,30,0,30,0];
const people = [...Array(6).fill(45), ...Array(6).fill(55), ...Array(12).fill(70)];
const cloud = [...Array(6).fill(8), ...Array(6).fill(12), ...Array(12).fill(15)];
const ops = [10,10,10,25,25,25,20,20,20,20,20,20,15,15,15,15,15,15,20,20,20,20,20,20];
const sales = [...Array(6).fill(5), ...Array(6).fill(10), ...Array(12).fill(10)];
const legal = [...Array(12).fill(7), ...Array(12).fill(12.5)];
const capex = [120,0,0,80,0,0,80,0,0,60,0,0,50,0,0,0,50,0,0,0,50,0,0,0];
const fund = [700,0,0,0,0,0,600,0,0,0,0,0,500,0,0,0,0,0,0,0,0,0,0,0];
for (let i = 0; i < 24; i++) {
  const r = 5 + i;
  monthly.getRange(`B${r}:C${r}`).values = [[customers[i], fees[i]]];
  monthly.getRange(`E${r}:F${r}`).values = [[tx[i], onboarding[i]]];
  monthly.getRange(`H${r}:L${r}`).values = [[people[i], cloud[i], ops[i], sales[i], legal[i]]];
  monthly.getRange(`N${r}:O${r}`).values = [[capex[i], fund[i]]];
  monthly.getRange(`D${r}`).formulas = [[`=B${r}*C${r}`]];
  monthly.getRange(`G${r}`).formulas = [[`=SUM(D${r}:F${r})`]];
  monthly.getRange(`M${r}`).formulas = [[`=G${r}-SUM(H${r}:L${r})`]];
  monthly.getRange(`P${r}`).formulas = [[i === 0 ? `=O${r}+M${r}-N${r}` : `=P${r-1}+O${r}+M${r}-N${r}`]];
}
body(monthly.getRange("A5:P28"));
styleInput(monthly.getRange("B5:C28"));
styleInput(monthly.getRange("E5:F28"), MONEY);
styleInput(monthly.getRange("H5:L28"), MONEY);
styleInput(monthly.getRange("N5:O28"), MONEY);
styleFormula(monthly.getRange("D5:D28"), MONEY);
styleFormula(monthly.getRange("G5:G28"), MONEY);
styleFormula(monthly.getRange("M5:M28"), MONEY);
styleFormula(monthly.getRange("P5:P28"), MONEY);
monthly.getRange("C5:C28").format.numberFormat = MONEY;
monthly.getRange("A29:P29").values = [["Tổng / cuối kỳ", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]];
for (const c of ["D","E","F","G","H","I","J","K","L","M","N","O"]) monthly.getRange(`${c}29`).formulas = [[`=SUM(${c}5:${c}28)`]];
monthly.getRange("P29").formulas = [["=P28"]];
monthly.getRange("A29:P29").format.font = { name: FONT, size: 10, bold: true, color: DARK };
monthly.getRange("A29:P29").format.borders = { top: { style: "double", color: NAVY } };
monthly.getRange("D29:P29").format.numberFormat = MONEY;
monthly.getRange("P5:P28").conditionalFormats.add("cellIs", { operator: "lessThan", formula: 0, format: { fill: PALE_RED, font: { bold: true, color: RED } } });
setWidths(monthly, { A: 11, B: 11, C: 11, D: 12, E: 13, F: 15, G: 13, H: 11, I: 11, J: 11, K: 11, L: 12, M: 12, N: 11, O: 13, P: 13 });
monthly.freezePanes.freezeRows(4);
const cashChart = monthly.charts.add("line", [monthly.getRange("A4:A28"), monthly.getRange("P4:P28")]);
cashChart.title = "Tiền cuối kỳ theo tháng (triệu đồng)";
cashChart.titleTextStyle.fontSize = 12;
cashChart.titleTextStyle.typeface = FONT;
cashChart.hasLegend = false;
cashChart.xAxis = { axisType: "textAxis", textStyle: { typeface: FONT, fontSize: 9 } };
cashChart.yAxis = { numberFormatCode: "#,##0", numberFormatSourceLinked: false, textStyle: { typeface: FONT, fontSize: 9 } };
cashChart.setPosition("R4", "Z18");

// -------------------- ĐỘ NHẠY --------------------
title(sensitivity, "Độ nhạy tài chính", "H");
sensitivity.getRange("A4:H4").values = [["Kịch bản", "Hệ số doanh thu", "Hệ số Opex", "Doanh thu 5 năm", "EBITDA 5 năm", "Tiền cuối Năm 2", "Vốn bổ sung cần có", "Năm EBITDA dương đầu tiên"]];
header(sensitivity.getRange("A4:H4"));
sensitivity.getRange("A5:C7").values = [
  ["Downside", 0.7, 0.95],
  ["Cơ sở", 1.0, 1.0],
  ["Upside", 1.3, 1.1],
];
for (let r = 5; r <= 7; r++) {
  sensitivity.getRange(`D${r}`).formulas = [[`=SUM('Mô hình 5 năm'!B12:F12)*B${r}`]];
  sensitivity.getRange(`E${r}`).formulas = [[`=D${r}-SUM('Mô hình 5 năm'!B18:F18)*C${r}`]];
  sensitivity.getRange(`F${r}`).formulas = [[`=SUM('Nguồn vốn'!F9:F10)+SUM('Mô hình 5 năm'!B12:C12)*B${r}-SUM('Mô hình 5 năm'!B18:C18)*C${r}-SUM('Mô hình 5 năm'!B25:C25)`]];
  sensitivity.getRange(`G${r}`).formulas = [[`=MAX(0,-F${r})`]];
  sensitivity.getRange(`H${r}`).formulas = [[`=IF('Mô hình 5 năm'!B12*B${r}-'Mô hình 5 năm'!B18*C${r}>0,1,IF('Mô hình 5 năm'!C12*B${r}-'Mô hình 5 năm'!C18*C${r}>0,2,IF('Mô hình 5 năm'!D12*B${r}-'Mô hình 5 năm'!D18*C${r}>0,3,IF('Mô hình 5 năm'!E12*B${r}-'Mô hình 5 năm'!E18*C${r}>0,4,IF('Mô hình 5 năm'!F12*B${r}-'Mô hình 5 năm'!F18*C${r}>0,5,"Sau Năm 5")))))`]];
}
body(sensitivity.getRange("A5:H7"));
styleInput(sensitivity.getRange("B5:C7"), PCT);
styleFormula(sensitivity.getRange("D5:G7"), MONEY);
sensitivity.getRange("H5:H7").format.horizontalAlignment = "center";
sensitivity.getRange("F5:G7").conditionalFormats.add("cellIs", { operator: "greaterThan", formula: 0, format: { fill: PALE_RED, font: { bold: true, color: RED } } });
section(sensitivity, 10, "Cách sử dụng", "H");
sensitivity.mergeCells("A11:H13");
sensitivity.getRange("A11:H13").values = [["Downside không phải lời tiên đoán. Đây là ngưỡng quản trị: nếu doanh thu chỉ đạt 70% kế hoạch trong khi chi phí chỉ giảm được 5%, dự án cần chuẩn bị thêm vốn cầu nối trước khi hết runway. Việc mở rộng phải dừng nếu không đạt cổng giao dịch và doanh nghiệp trả phí."]];
sensitivity.getRange("A11:H13").format = { fill: LIGHT, font: { name: FONT, size: 10, color: DARK }, wrapText: true, verticalAlignment: "top" };
setWidths(sensitivity, { A: 18, B: 15, C: 14, D: 17, E: 17, F: 17, G: 18, H: 22 });

// -------------------- PHẦN 5 NỘP HỒ SƠ --------------------
title(part5, "Phần 5 Dự kiến tài chính", "F");
part5.mergeCells("A4:F6");
part5.getRange("A4:F6").values = [["Kế hoạch tài chính được xây theo nguyên tắc giải ngân theo cột mốc. Dự án không sử dụng nợ ngân hàng trong 24 tháng đầu. Tổng vốn cần huy động là 1.800 triệu đồng, thấp hơn 42,9% so với mức đầu tư 3.154 triệu đồng trong mô hình cũ. Vốn được chia thành ba tranche và chỉ giải ngân khi đạt kết quả pilot hoặc thương mại đã xác định."]];
part5.getRange("A4:F6").format = { fill: LIGHT, font: { name: FONT, size: 10, color: DARK }, wrapText: true, verticalAlignment: "center" };

section(part5, 8, "1. Cơ sở lập kế hoạch", "F");
part5.getRange("A9:C9").values = [["Giả định", "Kế hoạch điều chỉnh", "Cơ sở kiểm chứng"]];
header(part5.getRange("A9:C9"));
part5.getRange("A10:C15").values = [
  ["Nhu cầu vốn", "1.800 triệu đồng theo 3 tranche", "Chỉ giải ngân sau cổng pilot, trả phí và retention"],
  ["Cấu trúc vốn 24 tháng đầu", "0% nợ ngân hàng", "Không có tài sản bảo đảm và chưa có dòng tiền ổn định"],
  ["Phí nền tảng", "5,0 triệu đồng/DN/tháng ở Năm 1", "Thử nghiệm willingness-to-pay; tăng theo giá trị sử dụng"],
  ["Phí giao dịch", "4% trên GMV đã hoàn tất", "Chỉ ghi nhận giao dịch xác thực, không tính lead"],
  ["Doanh thu bảo hiểm", "Không ghi nhận", "Chưa có đối tác được cấp phép và hợp đồng thương mại"],
  ["Điểm hòa vốn EBITDA", "Năm 3 trong kịch bản cơ sở", "Phụ thuộc vào 18 DN trả phí bình quân và 22 tỷ đồng GMV"],
];
body(part5.getRange("A10:C15"), true);

section(part5, 17, "2. Doanh thu, chi phí và lợi nhuận", "F");
part5.getRange("A18:F18").values = [["Chỉ tiêu (triệu đồng)", "Năm 1", "Năm 2", "Năm 3", "Năm 4", "Năm 5"]];
header(part5.getRange("A18:F18"));
part5.getRange("A19:A24").values = [["Doanh thu"], ["Chi phí vận hành"], ["EBITDA"], ["Lợi nhuận ròng"], ["Tiền cuối kỳ"], ["DN trả phí bình quân"]];
for (let col = 1; col <= 5; col++) {
  const l = String.fromCharCode(66 + col - 1);
  part5.getRange(`${l}19`).formulas = [[`='Mô hình 5 năm'!${l}12`]];
  part5.getRange(`${l}20`).formulas = [[`='Mô hình 5 năm'!${l}18`]];
  part5.getRange(`${l}21`).formulas = [[`='Mô hình 5 năm'!${l}19`]];
  part5.getRange(`${l}22`).formulas = [[`='Mô hình 5 năm'!${l}24`]];
  part5.getRange(`${l}23`).formulas = [[`='Mô hình 5 năm'!${l}29`]];
  part5.getRange(`${l}24`).formulas = [[`='Mô hình 5 năm'!${l}5`]];
}
body(part5.getRange("A19:F24"));
styleCrossLink(part5.getRange("B19:F23"), MONEY);
styleCrossLink(part5.getRange("B24:F24"), DEC);
part5.getRange("A21:F23").format.font = { name: FONT, size: 10, bold: true, color: DARK };

section(part5, 26, "3. Phương án huy động vốn", "F");
part5.getRange("A27:F27").values = [["Tranche", "Thời điểm", "Số tiền", "Nguồn chính", "Điều kiện", "Nợ ngân hàng"]];
header(part5.getRange("A27:F27"));
part5.getRange("A28:F30").values = [
  ["0", "Tháng 1", 700, "Nhà sáng lập, grant, angel", "MVP ổn định và có đối tác pilot", 0],
  ["1", "Tháng 7", 600, "Grant, angel, đối tác", "10 giao dịch hoàn tất và bắt đầu trả phí", 0],
  ["2", "Tháng 13", 500, "Grant, angel, đối tác", "4 DN trả phí, completion >=70%, retention >=60%", 0],
];
body(part5.getRange("A28:F30"), true);
part5.getRange("C28:C30").format.numberFormat = MONEY;
part5.getRange("F28:F30").format.numberFormat = MONEY;

section(part5, 32, "4. Kỷ luật tài chính", "F");
part5.mergeCells("A33:F38");
part5.getRange("A33:F38").values = [["Mô hình ưu tiên runway và cổng kiểm chứng thay vì tối đa hóa NPV trên giấy. Đội không tuyển đủ biên chế ngay từ đầu, không giải ngân toàn bộ chi phí phát triển ứng dụng, không ghi nhận doanh thu bảo hiểm và không vay ngân hàng khi chưa có dòng tiền. Nếu doanh thu chỉ đạt 70% kế hoạch, dự án phải giảm nhịp mở rộng hoặc huy động thêm khoảng vốn cầu nối thể hiện tại sheet Độ nhạy trước khi tiền mặt âm. Sau 24 tháng, hạn mức tín dụng chỉ được xem xét khi có MRR lặp lại, hợp đồng/receivable đủ điều kiện và DSCR có thể kiểm chứng."]];
part5.getRange("A33:F38").format = { fill: LIGHT, font: { name: FONT, size: 10, color: DARK }, wrapText: true, verticalAlignment: "top" };
setWidths(part5, { A: 29, B: 16, C: 18, D: 24, E: 38, F: 15 });

// -------------------- KIỂM TRA --------------------
title(checks, "Kiểm tra mô hình", "D");
checks.getRange("A4:D4").values = [["Kiểm tra", "Giá trị", "Ngưỡng", "Kết quả"]];
header(checks.getRange("A4:D4"));
checks.getRange("A5:A13").values = [
  ["Doanh thu 5 năm khớp chi tiết"],
  ["Chi phí 5 năm khớp giả định"],
  ["Doanh thu 24 tháng khớp Năm 1-2"],
  ["Opex 24 tháng khớp Năm 1-2"],
  ["Capex 24 tháng khớp Năm 1-2"],
  ["Nguồn vốn theo tranche khớp 1.800"],
  ["Cơ cấu nguồn vốn khớp tranche"],
  ["Tiền cuối Tháng 24 khớp cuối Năm 2"],
  ["Nợ ngân hàng trong 24 tháng đầu bằng 0"],
];
checks.getRange("B5").formulas = [["=SUM('Mô hình 5 năm'!B12:F12)-SUM('Mô hình 5 năm'!B7:F7)-SUM('Mô hình 5 năm'!B10:F10)-SUM('Mô hình 5 năm'!B11:F11)"]];
checks.getRange("B6").formulas = [["=SUM('Mô hình 5 năm'!B18:F18)-SUM('Giả định'!B17:F17)"]];
checks.getRange("B7").formulas = [["=SUM('Dòng tiền 24 tháng'!G5:G28)-SUM('Mô hình 5 năm'!B12:C12)"]];
checks.getRange("B8").formulas = [["=SUM('Dòng tiền 24 tháng'!H5:L28)-SUM('Mô hình 5 năm'!B18:C18)"]];
checks.getRange("B9").formulas = [["=SUM('Dòng tiền 24 tháng'!N5:N28)-SUM('Mô hình 5 năm'!B25:C25)"]];
checks.getRange("B10").formulas = [["='Nguồn vốn'!G8-1800"]];
checks.getRange("B11").formulas = [["='Nguồn vốn'!G18-'Nguồn vốn'!G8"]];
checks.getRange("B12").formulas = [["='Dòng tiền 24 tháng'!P28-'Mô hình 5 năm'!C29"]];
checks.getRange("B13").formulas = [["=SUM('Mô hình 5 năm'!B30:C30)"]];
checks.getRange("C5:C13").values = [[0.01],[0.01],[0.01],[0.01],[0.01],[0.01],[0.01],[0.01],[0.01]];
for (let r = 5; r <= 13; r++) checks.getRange(`D${r}`).formulas = [[`=IF(ABS(B${r})<=C${r},"OK","Lệch")`]];
body(checks.getRange("A5:D13"));
styleFormula(checks.getRange("B5:C13"), '0.00');
checks.getRange("D5:D13").format.horizontalAlignment = "center";
checks.getRange("D5:D13").conditionalFormats.add("containsText", { text: "Lệch", format: { fill: PALE_RED, font: { bold: true, color: RED } } });
setWidths(checks, { A: 48, B: 15, C: 12, D: 15 });

// -------------------- TÓM TẮT --------------------
title(summary, "Báo cáo tài chính điều chỉnh CHAMP MẠNH CHAT", "N");
summary.getRange("A4:B4").values = [["Chỉ tiêu", "Kết quả"]];
header(summary.getRange("A4:B4"));
summary.getRange("A5:A11").values = [
  ["Tổng vốn cần huy động"], ["Nợ ngân hàng 24 tháng đầu"], ["Giảm nhu cầu vốn so với mô hình cũ"], ["Điểm hòa vốn EBITDA"], ["Tiền cuối Năm 2"], ["Doanh thu Năm 5"], ["EBITDA Năm 5"]
];
summary.getRange("B5").formulas = [["='Nguồn vốn'!G8"]];
summary.getRange("B6").formulas = [["=SUM('Mô hình 5 năm'!B30:C30)"]];
summary.getRange("B7").formulas = [["=1-B5/3154"]];
summary.getRange("B8").values = [["Năm 3"]];
summary.getRange("B9").formulas = [["='Mô hình 5 năm'!C29"]];
summary.getRange("B10").formulas = [["='Mô hình 5 năm'!F12"]];
summary.getRange("B11").formulas = [["='Mô hình 5 năm'!F19"]];
body(summary.getRange("A5:B11"));
styleCrossLink(summary.getRange("B5:B6"), MONEY);
summary.getRange("B7").format.numberFormat = PCT;
styleCrossLink(summary.getRange("B9:B11"), MONEY);
summary.getRange("A13:F13").values = [["Chỉ tiêu", "Năm 1", "Năm 2", "Năm 3", "Năm 4", "Năm 5"]];
header(summary.getRange("A13:F13"));
summary.getRange("A14:A19").values = [["Doanh thu"],["Chi phí vận hành"],["EBITDA"],["Lợi nhuận ròng"],["Tiền cuối kỳ"],["DN trả phí bình quân"]];
for (let col = 1; col <= 5; col++) {
  const l = String.fromCharCode(66 + col - 1);
  summary.getRange(`${l}14`).formulas = [[`='Mô hình 5 năm'!${l}12`]];
  summary.getRange(`${l}15`).formulas = [[`='Mô hình 5 năm'!${l}18`]];
  summary.getRange(`${l}16`).formulas = [[`='Mô hình 5 năm'!${l}19`]];
  summary.getRange(`${l}17`).formulas = [[`='Mô hình 5 năm'!${l}24`]];
  summary.getRange(`${l}18`).formulas = [[`='Mô hình 5 năm'!${l}29`]];
  summary.getRange(`${l}19`).formulas = [[`='Mô hình 5 năm'!${l}5`]];
}
body(summary.getRange("A14:F19"));
styleCrossLink(summary.getRange("B14:F18"), MONEY);
styleCrossLink(summary.getRange("B19:F19"), DEC);

summary.getRange("H20:J20").values = [["Năm", "Doanh thu", "EBITDA"]];
for (let i = 0; i < 5; i++) {
  const r = 21 + i;
  const l = String.fromCharCode(66 + i);
  summary.getRange(`H${r}`).values = [[`Năm ${i+1}`]];
  summary.getRange(`I${r}`).formulas = [[`='Mô hình 5 năm'!${l}12`]];
  summary.getRange(`J${r}`).formulas = [[`='Mô hình 5 năm'!${l}19`]];
}
summary.getRange("I21:J25").format.numberFormat = MONEY;
const revChart = summary.charts.add("line", summary.getRange("H20:J25"));
revChart.title = "Doanh thu và EBITDA (triệu đồng)";
revChart.titleTextStyle.fontSize = 12;
revChart.titleTextStyle.typeface = FONT;
revChart.legend = { position: "top", textStyle: { typeface: FONT } };
revChart.xAxis = { axisType: "textAxis", textStyle: { typeface: FONT, fontSize: 9 } };
revChart.yAxis = { numberFormatCode: "#,##0", numberFormatSourceLinked: false, textStyle: { typeface: FONT, fontSize: 9 } };
revChart.setPosition("H4", "N17");

section(summary, 28, "Quyết định tài chính", "N");
summary.mergeCells("A29:N32");
summary.getRange("A29:N32").values = [["Không vay 1.262 triệu đồng ở giai đoạn pre-revenue. Huy động 1.800 triệu đồng theo ba tranche từ nhà sáng lập, grant, angel/SAFE và đối tác chiến lược. Kịch bản cơ sở chỉ được mở rộng khi đạt số doanh nghiệp trả phí, tỷ lệ hoàn tất giao dịch và retention. Nếu doanh thu chỉ đạt 70% kế hoạch, cần chuẩn bị vốn cầu nối trước khi tiền mặt âm thay vì tiếp tục tuyển dụng hoặc mở địa bàn."]];
summary.getRange("A29:N32").format = { fill: AMBER, font: { name: FONT, size: 10, bold: true, color: DARK }, wrapText: true, verticalAlignment: "center" };
setWidths(summary, { A: 32, B: 16, C: 3, D: 13, E: 13, F: 13, G: 3, H: 12, I: 14, J: 14, K: 12, L: 12, M: 12, N: 12 });

// Final formatting adjustments.
for (const s of [summary, part5, assumptions, model, monthly, funding, sensitivity, checks]) {
  const used = s.getUsedRange();
  if (used) used.format.verticalAlignment = "center";
}

wb.recalculate();

// Verification output before export.
const keyChecks = await wb.inspect({
  kind: "table",
  range: "Tóm tắt!A4:F19",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 8,
  maxChars: 12000,
});
console.log(keyChecks.ndjson);
const audit = await wb.inspect({
  kind: "table",
  range: "Kiểm tra!A4:D13",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 6,
  maxChars: 9000,
});
console.log(audit.ndjson);
const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

for (const s of [summary, part5, assumptions, model, monthly, funding, sensitivity, checks]) {
  const preview = await wb.render({ sheetName: s.name, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${qaDir}/${s.name.replace(/[\\/:*?\"<>|]/g, "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

await fs.mkdir("D:/final app/final app/docs", { recursive: true });
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(outPath);
console.log(outPath);
