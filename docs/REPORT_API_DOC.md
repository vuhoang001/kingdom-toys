# Revenue Report API — Frontend Integration Guide

Base URL: `http://localhost:3005` (dev) hoặc domain production

---

## Authentication

Tất cả các endpoint báo cáo đều yêu cầu Bearer token.

```
Authorization: Bearer <accessToken>
```

---

## 1. Lấy dữ liệu báo cáo (JSON)

```
GET /report/revenue
```

### Query Parameters

| Param   | Bắt buộc | Kiểu    | Mô tả                                                          |
|---------|----------|---------|----------------------------------------------------------------|
| `type`  | ✅        | string  | `week` \| `month` \| `year`                                   |
| `year`  | ❌        | integer | Năm cần xem. Mặc định: năm hiện tại                           |
| `month` | ❌        | integer | Tháng 1–12. Chỉ dùng khi `type=month`. Mặc định: tháng hiện tại |
| `week`  | ❌        | integer | Tuần ISO 1–53. Chỉ dùng khi `type=week`. Mặc định: tuần hiện tại |

### Ví dụ gọi

```
GET /report/revenue?type=year&year=2025
GET /report/revenue?type=month&month=5&year=2025
GET /report/revenue?type=week&week=21&year=2025
GET /report/revenue?type=week          ← tuần hiện tại
```

### Response — `type=week`

```json
{
  "message": "Get revenue report success",
  "status": 200,
  "metadata": {
    "summary": {
      "totalRevenue": 4500000,
      "totalOrders": 18,
      "from": "2025-05-19T17:00:00.000Z",
      "to": "2025-05-26T17:00:00.000Z"
    },
    "breakdown": [
      { "label": "Monday",    "date": "2025-05-19", "revenue": 750000,  "orderCount": 3 },
      { "label": "Tuesday",   "date": "2025-05-20", "revenue": 0,       "orderCount": 0 },
      { "label": "Wednesday", "date": "2025-05-21", "revenue": 1200000, "orderCount": 5 },
      { "label": "Thursday",  "date": "2025-05-22", "revenue": 900000,  "orderCount": 4 },
      { "label": "Friday",    "date": "2025-05-23", "revenue": 650000,  "orderCount": 3 },
      { "label": "Saturday",  "date": "2025-05-24", "revenue": 1000000, "orderCount": 3 },
      { "label": "Sunday",    "date": "2025-05-25", "revenue": 0,       "orderCount": 0 }
    ]
  }
}
```

### Response — `type=month`

```json
{
  "metadata": {
    "summary": {
      "totalRevenue": 24000000,
      "totalOrders": 87,
      "from": "2025-05-01T17:00:00.000Z",
      "to": "2025-06-01T17:00:00.000Z"
    },
    "breakdown": [
      { "label": "Day 1",  "date": "2025-05-01", "revenue": 500000,  "orderCount": 2 },
      { "label": "Day 2",  "date": "2025-05-02", "revenue": 0,       "orderCount": 0 },
      { "label": "Day 3",  "date": "2025-05-03", "revenue": 1200000, "orderCount": 4 },
      "...",
      { "label": "Day 31", "date": "2025-05-31", "revenue": 800000,  "orderCount": 3 }
    ]
  }
}
```

### Response — `type=year`

```json
{
  "metadata": {
    "summary": {
      "totalRevenue": 180000000,
      "totalOrders": 540,
      "from": "2024-12-31T17:00:00.000Z",
      "to": "2025-12-31T17:00:00.000Z"
    },
    "breakdown": [
      { "label": "January",   "month": 1,  "revenue": 12000000, "orderCount": 38 },
      { "label": "February",  "month": 2,  "revenue": 9500000,  "orderCount": 30 },
      { "label": "March",     "month": 3,  "revenue": 15000000, "orderCount": 46 },
      "...",
      { "label": "December",  "month": 12, "revenue": 18000000, "orderCount": 55 }
    ]
  }
}
```

### Sự khác nhau của `breakdown` theo `type`

| `type`  | Số phần tử  | Field định danh | Label ví dụ              |
|---------|-------------|-----------------|--------------------------|
| `week`  | 7 (cố định) | `date` (YYYY-MM-DD) | `"Monday"` … `"Sunday"` |
| `month` | 28–31       | `date` (YYYY-MM-DD) | `"Day 1"` … `"Day 31"` |
| `year`  | 12 (cố định)| `month` (1–12)  | `"January"` … `"December"` |

> **Lưu ý:** Những ngày/tháng không có đơn nào vẫn xuất hiện trong mảng với `revenue: 0, orderCount: 0`. Frontend không cần tự fill.

---

## 2. Xuất file Excel

```
GET /report/revenue/export
```

Query params **giống hệt** endpoint JSON ở trên.

### Cách gọi từ frontend (download file)

```js
// Ví dụ với axios
const response = await axios.get('/report/revenue/export', {
  params: { type: 'month', month: 5, year: 2025 },
  headers: { Authorization: `Bearer ${token}` },
  responseType: 'blob',
});

const url = URL.createObjectURL(new Blob([response.data]));
const link = document.createElement('a');
link.href = url;
link.download = response.headers['content-disposition']
  ?.split('filename=')[1]
  ?.replace(/"/g, '')
  ?? 'report.xlsx';
link.click();
URL.revokeObjectURL(url);
```

### Response headers

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="bao-cao-doanh-thu-theo-thang-2025-05-22.xlsx"
```

### Cấu trúc file Excel xuất ra

```
Row 1   : [TIÊU ĐỀ] — BÁO CÁO DOANH THU - THEO THÁNG  (merge A1:D1)
Row 2   : (trống)
Row 3   : Tổng doanh thu  | 24,000,000 ₫
Row 4   : Tổng đơn hàng   | 87
Row 5   : Từ ngày         | 2025-05-01
Row 6   : Đến ngày        | 2025-06-01
Row 7   : (trống)
Row 8   : [HEADER] Kỳ | Ngày | Doanh thu (₫) | Số đơn
Row 9+  : dữ liệu từng ngày/tháng
Row cuối: [TỔNG CỘNG] | | 24,000,000 ₫ | 87
```

---

## 3. Error responses

```json
{ "status": 400, "message": "type phải là week, month hoặc year" }
{ "status": 400, "message": "month phải từ 1 đến 12" }
{ "status": 400, "message": "week phải từ 1 đến 53" }
{ "status": 401, "message": "Authentication error" }
```

---

## 4. Gợi ý UI/UX

### Bộ lọc
```
[Tuần ▼]  [Tháng ▼]  [Năm ▼]     ← Dropdown chọn type
[  Tuần 21  ][  Năm 2025  ]        ← Input phụ hiện tùy type
[ Xem báo cáo ]  [ Xuất Excel ]
```

### Hiển thị dữ liệu
- **KPI cards:** `summary.totalRevenue` và `summary.totalOrders`
- **Biểu đồ cột/đường:** dùng mảng `breakdown`, trục X là `label`, trục Y là `revenue`
- **Bảng chi tiết:** render toàn bộ `breakdown`

### Mapping label tiếng Việt (nếu cần)

```js
const DAY_VI = {
  Monday: 'Thứ Hai', Tuesday: 'Thứ Ba', Wednesday: 'Thứ Tư',
  Thursday: 'Thứ Năm', Friday: 'Thứ Sáu', Saturday: 'Thứ Bảy', Sunday: 'Chủ Nhật',
};

const MONTH_VI = {
  January: 'Tháng 1', February: 'Tháng 2', March: 'Tháng 3',
  April: 'Tháng 4', May: 'Tháng 5', June: 'Tháng 6',
  July: 'Tháng 7', August: 'Tháng 8', September: 'Tháng 9',
  October: 'Tháng 10', November: 'Tháng 11', December: 'Tháng 12',
};
```

### Format số tiền

```js
const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

formatVND(4500000); // → "4.500.000 ₫"
```

### Tính số tuần ISO hiện tại (để set default cho picker)

```js
function getCurrentISOWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
```
