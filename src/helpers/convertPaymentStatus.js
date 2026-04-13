/** Nhãn hiển thị cho PAYMENT_STATUS (thanh toán), tách khỏi trạng thái đơn hàng */
function convertPaymentStatus(status) {
  switch (status) {
    case "pending":
      return "Chờ thanh toán";
    case "paid":
      return "Thanh toán thành công";
    case "failed":
      return "Thanh toán thất bại";
    case "refunded":
      return "Đã hoàn tiền";
    default:
      return "Không xác định";
  }
}

module.exports = convertPaymentStatus;
