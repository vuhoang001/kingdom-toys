const ExcelJS = require("exceljs");
const orderModel = require("../models/order.model");
const { ORDERSTATUS } = require("../utils/enum");
const { BadRequestError } = require("../response/error.response");

const VIETNAM_TZ = "Asia/Ho_Chi_Minh";

const DAY_LABELS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ISO week number of a given date
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Returns "YYYY-MM-DD" of the Monday of the given ISO week
function getMondayDateStr(week, year) {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dow = jan1.getUTCDay() || 7;
  // Days to Monday of week 1
  const daysToFirstMonday = dow <= 4 ? 1 - dow : 8 - dow;
  const monday = new Date(jan1.getTime() + (daysToFirstMonday + (week - 1) * 7) * 86400000);
  return monday.toISOString().split("T")[0];
}

function getDateRange(type, { week, month, year }) {
  const now = new Date();
  const y = year != null ? parseInt(year) : now.getFullYear();

  if (type === "year") {
    return {
      start: new Date(`${y}-01-01T00:00:00+07:00`),
      end: new Date(`${y + 1}-01-01T00:00:00+07:00`),
    };
  }

  if (type === "month") {
    const m = month != null ? parseInt(month) : now.getMonth() + 1;
    if (m < 1 || m > 12) throw new BadRequestError("month phải từ 1 đến 12");
    const mStr = String(m).padStart(2, "0");
    const nextY = m === 12 ? y + 1 : y;
    const nextM = m === 12 ? 1 : m + 1;
    const nextMStr = String(nextM).padStart(2, "0");
    return {
      start: new Date(`${y}-${mStr}-01T00:00:00+07:00`),
      end: new Date(`${nextY}-${nextMStr}-01T00:00:00+07:00`),
    };
  }

  if (type === "week") {
    const w = week != null ? parseInt(week) : getISOWeek(now);
    if (w < 1 || w > 53) throw new BadRequestError("week phải từ 1 đến 53");
    const mondayStr = getMondayDateStr(w, y);
    const start = new Date(`${mondayStr}T00:00:00+07:00`);
    const end = new Date(start.getTime() + 7 * 86400000);
    return { start, end };
  }

  throw new BadRequestError("type phải là week, month hoặc year");
}

// Convert UTC date to VN date string "YYYY-MM-DD"
function toVNDateStr(utcDate) {
  return new Date(utcDate.getTime() + 7 * 3600000).toISOString().split("T")[0];
}

const EXCLUDED_STATUSES = [ORDERSTATUS.CANCELLED, ORDERSTATUS.DRAFT];

class ReportService {
  GetRevenueReport = async ({ type, week, month, year }) => {
    if (!["week", "month", "year"].includes(type)) {
      throw new BadRequestError("type phải là week, month hoặc year");
    }

    const { start, end } = getDateRange(type, { week, month, year });

    // Group field depends on report type
    const dateExpr = { date: "$createdAt", timezone: VIETNAM_TZ };
    let groupByExpr;
    if (type === "week") groupByExpr = { $dayOfWeek: dateExpr };
    else if (type === "month") groupByExpr = { $dayOfMonth: dateExpr };
    else groupByExpr = { $month: dateExpr };

    const raw = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
          status: { $nin: EXCLUDED_STATUSES },
        },
      },
      {
        $group: {
          _id: groupByExpr,
          revenue: { $sum: "$finalPrice" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const rawMap = Object.fromEntries(raw.map((r) => [r._id, r]));
    const totalRevenue = raw.reduce((s, r) => s + r.revenue, 0);
    const totalOrders = raw.reduce((s, r) => s + r.orderCount, 0);

    let breakdown;

    if (type === "week") {
      // $dayOfWeek: 1=Sun, 2=Mon, ..., 7=Sat — display Mon → Sun
      const ISO_ORDER = [2, 3, 4, 5, 6, 7, 1];
      breakdown = ISO_ORDER.map((dow, i) => {
        const dayUtc = new Date(start.getTime() + i * 86400000);
        return {
          label: DAY_LABELS[dow === 1 ? 0 : dow - 1],
          date: toVNDateStr(dayUtc),
          revenue: rawMap[dow]?.revenue || 0,
          orderCount: rawMap[dow]?.orderCount || 0,
        };
      });
    } else if (type === "month") {
      const m = month != null ? parseInt(month) : new Date().getMonth() + 1;
      const y2 = year != null ? parseInt(year) : new Date().getFullYear();
      const daysInMonth = new Date(y2, m, 0).getDate();
      const mStr = String(m).padStart(2, "0");
      breakdown = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        return {
          label: `Day ${day}`,
          date: `${y2}-${mStr}-${String(day).padStart(2, "0")}`,
          revenue: rawMap[day]?.revenue || 0,
          orderCount: rawMap[day]?.orderCount || 0,
        };
      });
    } else {
      breakdown = MONTH_LABELS.map((label, i) => ({
        label,
        month: i + 1,
        revenue: rawMap[i + 1]?.revenue || 0,
        orderCount: rawMap[i + 1]?.orderCount || 0,
      }));
    }

    return {
      summary: {
        totalRevenue,
        totalOrders,
        from: start.toISOString(),
        to: end.toISOString(),
      },
      breakdown,
    };
  };

  ExportRevenueReportExcel = async ({ type, week, month, year }) => {
    const { summary, breakdown } = await this.GetRevenueReport({ type, week, month, year });

    const wb = new ExcelJS.Workbook();
    wb.creator = "KingdomToys";
    wb.created = new Date();

    const ws = wb.addWorksheet("Doanh thu");

    // ── Column widths ──────────────────────────────────────────────
    ws.columns = [
      { key: "a", width: 22 },
      { key: "b", width: 16 },
      { key: "c", width: 20 },
      { key: "d", width: 14 },
    ];

    // ── Styles ─────────────────────────────────────────────────────
    const titleStyle = {
      font: { bold: true, size: 14, color: { argb: "FF1F4E79" } },
      alignment: { horizontal: "center" },
    };
    const labelStyle = {
      font: { bold: true, size: 11 },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } },
      border: { bottom: { style: "thin", color: { argb: "FF4472C4" } } },
    };
    const headerStyle = {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } },
      alignment: { horizontal: "center" },
      border: {
        top: { style: "thin" }, bottom: { style: "thin" },
        left: { style: "thin" }, right: { style: "thin" },
      },
    };
    const totalRowStyle = {
      font: { bold: true, color: { argb: "FF1F4E79" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFDAE3F3" } },
      border: {
        top: { style: "medium", color: { argb: "FF4472C4" } },
        bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" },
      },
    };
    const numberFmt = "#,##0";
    const currencyFmt = '#,##0 "₫"';

    // ── Title ──────────────────────────────────────────────────────
    const TYPE_VI = { week: "Tuần", month: "Tháng", year: "Năm" };
    ws.mergeCells("A1:D1");
    const titleCell = ws.getCell("A1");
    titleCell.value = `BÁO CÁO DOANH THU - THEO ${TYPE_VI[type]?.toUpperCase() || type.toUpperCase()}`;
    Object.assign(titleCell, titleStyle);
    ws.getRow(1).height = 28;

    ws.addRow([]);

    // ── Summary section ───────────────────────────────────────────
    const summaryRows = [
      ["Tổng doanh thu", summary.totalRevenue, "", ""],
      ["Tổng đơn hàng",  summary.totalOrders,  "", ""],
      ["Từ ngày",        summary.from.slice(0, 10), "", ""],
      ["Đến ngày",       summary.to.slice(0, 10),   "", ""],
    ];

    summaryRows.forEach(([key, val]) => {
      const row = ws.addRow([key, val]);
      Object.assign(row.getCell(1), labelStyle);
      row.getCell(1).font = { bold: true, size: 11 };
      if (key === "Tổng doanh thu") row.getCell(2).numFmt = currencyFmt;
      if (key === "Tổng đơn hàng")  row.getCell(2).numFmt = numberFmt;
    });

    ws.addRow([]);

    // ── Breakdown table ───────────────────────────────────────────
    const col2Header = type === "year" ? "Tháng" : "Ngày";
    const headerRow = ws.addRow(["Kỳ", col2Header, "Doanh thu (₫)", "Số đơn"]);
    headerRow.eachCell((cell) => Object.assign(cell, headerStyle));
    headerRow.height = 20;

    breakdown.forEach((row) => {
      const dateOrMonth = row.date ?? (row.month ? `Tháng ${row.month}` : "");
      const r = ws.addRow([row.label, dateOrMonth, row.revenue, row.orderCount]);
      r.getCell(3).numFmt = currencyFmt;
      r.getCell(4).numFmt = numberFmt;
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: "hair" }, bottom: { style: "hair" },
          left: { style: "thin" }, right: { style: "thin" },
        };
      });
      // Highlight rows có doanh thu > 0
      if (row.revenue > 0) {
        r.getCell(3).font = { color: { argb: "FF1F4E79" } };
      }
    });

    // ── Total row ─────────────────────────────────────────────────
    const totalRow = ws.addRow([
      "TỔNG CỘNG",
      "",
      summary.totalRevenue,
      summary.totalOrders,
    ]);
    totalRow.eachCell({ includeEmpty: true }, (cell) => Object.assign(cell, totalRowStyle));
    totalRow.getCell(3).numFmt = currencyFmt;
    totalRow.getCell(4).numFmt = numberFmt;

    return wb.xlsx.writeBuffer();
  };
}

module.exports = new ReportService();
