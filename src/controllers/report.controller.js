const { SuccessResponse } = require("../response/success.response");
const reportService = require("../services/report.service");

class ReportController {
  GetRevenueReport = async (req, res) => {
    const { type, week, month, year } = req.query;
    new SuccessResponse({
      message: "Get revenue report success",
      metadata: await reportService.GetRevenueReport({ type, week, month, year }),
    }).send(res);
  };

  ExportRevenueReport = async (req, res) => {
    const { type, week, month, year } = req.query;
    const buffer = await reportService.ExportRevenueReportExcel({ type, week, month, year });

    const TYPE_LABEL = { week: "tuan", month: "thang", year: "nam" };
    const now = new Date().toISOString().slice(0, 10);
    const filename = `bao-cao-doanh-thu-theo-${TYPE_LABEL[type] || type}-${now}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  };
}

module.exports = new ReportController();
