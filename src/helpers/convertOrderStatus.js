function convertOrderStatus(status) {
  switch (status) {
    case "pending":
      return "Chờ xử lý";
    case "paid":
      return "Đã thanh toán";
    case "confirmed":
      return "Đã xác nhận";
    case "cancelled":
      return "Đã hủy";
    case "shipped":
      return "Đang giao hàng";
    case "delivered":
      return "Đã giao";
    case "draft":
      return "Nháp";
    default:
      return "Không xác định";
  }
}

module.exports = convertOrderStatus;
