# Order API — Frontend Integration Guide

Base URL: `http://localhost:3005`

---

## Authentication

Tất cả endpoint đều yêu cầu Bearer token.

```
Authorization: Bearer <accessToken>
```

---

## Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/order/CheckoutWithPayload` | Tạo đơn hàng |
| `GET` | `/order` | Lấy tất cả đơn (admin) |
| `GET` | `/order/me` | Lấy đơn của tôi |
| `GET` | `/order/:id` | Chi tiết 1 đơn |
| `PATCH` | `/order/:id/status` | Cập nhật trạng thái (bao gồm huỷ) |

---

## 1. Tạo đơn hàng

```
POST /order/CheckoutWithPayload
```

### Request body

```json
{
  "items": [
    { "productId": "664abc123def456789012345", "quantity": 2 },
    { "productId": "664abc123def456789012346", "quantity": 1 }
  ],
  "paymentMethod": "cod",
  "fullname": "Nguyễn Văn A",
  "phone": "0901234567",
  "addressLine": "123 Lê Lợi",
  "ward": "Phường Bến Nghé",
  "district": "Quận 1",
  "province": "TP. Hồ Chí Minh",
  "coupon": "664abc000def456789099999",
  "notes": "Giao giờ hành chính",
  "orderType": "Now"
}
```

| Field | Bắt buộc | Mô tả |
|-------|----------|-------|
| `items` | ✅ | Danh sách sản phẩm |
| `items[].productId` | ✅ | ID sản phẩm |
| `items[].quantity` | ✅ | Số lượng (≥ 1) |
| `paymentMethod` | ✅ | `cod` hoặc `zalo` |
| `fullname` | ✅ | Họ tên người nhận |
| `phone` | ✅ | Số điện thoại |
| `addressLine` | ✅ | Địa chỉ cụ thể |
| `ward` | ✅ | Phường/xã |
| `district` | ✅ | Quận/huyện |
| `province` | ✅ | Tỉnh/thành phố |
| `coupon` | ❌ | ID mã giảm giá |
| `notes` | ❌ | Ghi chú |
| `orderType` | ❌ | `Now` (mặc định) hoặc `Cart` |

### Response — COD

```json
{
  "message": "Check out order",
  "status": 200,
  "metadata": {
    "_id": "664abc111def456789012300",
    "status": "pending",
    "paymentStatus": "pending",
    "paymentMethod": "cod",
    "finalPrice": 350000,
    "totalPrice": 400000
  }
}
```

### Response — ZaloPay

```json
{
  "message": "Check out order",
  "status": 200,
  "metadata": {
    "return_code": 1,
    "return_message": "success",
    "order_url": "https://sbgateway.zalopay.vn/openinapp?order=...",
    "zp_trans_token": "..."
  }
}
```

> Khi `paymentMethod=zalo`, redirect hoặc mở WebView tới `metadata.order_url` để user thanh toán.

### Error responses

```json
{ "status": 400, "message": "Đơn hàng không có sản phẩm nào." }
{ "status": 400, "message": "Sản phẩm không tồn tại" }
{ "status": 400, "message": "Không có phương thức thanh toán" }
```

---

## 2. Lấy tất cả đơn hàng (admin)

```
GET /order
```

### Query parameters

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `skip` | integer | Bỏ qua n bản ghi (mặc định `0`) |
| `limit` | integer | Số bản ghi trả về (mặc định `30`) |
| `status` | string | Lọc theo trạng thái đơn hàng — xem enum `status` |
| `paymentStatus` | string | Lọc theo trạng thái thanh toán — xem enum `paymentStatus` |
| `paymentMethod` | string | Lọc theo phương thức thanh toán (`cod` / `zalo`) |
| `userId` | string (ObjectId) | Lọc đơn hàng của một user cụ thể |
| `fromDate` | string (ISO 8601) | Lọc đơn tạo từ ngày (bao gồm, tính từ `00:00:00`) |
| `toDate` | string (ISO 8601) | Lọc đơn tạo đến ngày (bao gồm, tính đến `23:59:59`) |
| `minPrice` | number | Lọc `finalPrice ≥ minPrice` |
| `maxPrice` | number | Lọc `finalPrice ≤ maxPrice` |
| `search` | string | Tìm kiếm full-text trong trường `status` |

### Ví dụ

```
# Lọc theo trạng thái đơn + thanh toán
GET /order?status=confirmed&paymentStatus=paid

# Lọc đơn COD chưa thanh toán, phân trang
GET /order?paymentMethod=cod&paymentStatus=pending&skip=0&limit=20

# Lọc đơn của một user
GET /order?userId=664abc000def000000000001

# Lọc theo khoảng ngày
GET /order?fromDate=2025-05-01&toDate=2025-05-31

# Lọc theo khoảng giá (finalPrice)
GET /order?minPrice=100000&maxPrice=500000

# Kết hợp nhiều filter
GET /order?status=pending&paymentMethod=zalo&fromDate=2025-05-01&minPrice=200000&limit=10
```

### Response

```json
{
  "message": "Get order success",
  "status": 200,
  "metadata": {
    "result": [
      {
        "_id": "664abc111def456789012300",
        "user": {
          "_id": "664abc000def000000000001",
          "name": "Nguyễn Văn A",
          "email": "a@example.com",
          "phone": "0901234567",
          "thumbnail": "http://localhost:3005/uploads/avatar.jpg"
        },
        "items": [
          {
            "_id": "...",
            "productId": "664abc123def456789012345",
            "productName": "Lego City",
            "images": ["http://localhost:3005/uploads/lego.jpg"],
            "price": 350000,
            "quantity": 2,
            "discount": 10
          }
        ],
        "status": "pending",
        "paymentStatus": "pending",
        "paymentMethod": "cod",
        "totalPrice": 700000,
        "finalPrice": 630000,
        "shippingAddress": {
          "fullName": "Nguyễn Văn A",
          "phone": "0901234567",
          "addressLine": "123 Lê Lợi",
          "ward": "Phường Bến Nghé",
          "district": "Quận 1",
          "province": "TP. Hồ Chí Minh"
        },
        "notes": "Giao giờ hành chính",
        "createdAt": "2025-05-22T09:00:00.000Z",
        "updatedAt": "2025-05-22T09:00:00.000Z"
      }
    ],
    "total": 87,
    "skip": 0,
    "limit": 10,
    "totalPages": 9
  }
}
```

---

## 3. Lấy đơn hàng của tôi

```
GET /order/me
```

### Query parameters

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `skip` | integer | Bỏ qua n bản ghi (mặc định 0) |
| `limit` | integer | Số bản ghi trả về (mặc định 30) |
| `status` | string | Lọc theo trạng thái |

```
GET /order/me?skip=0&limit=5&status=pending
```

> Response có cấu trúc giống endpoint `GET /order` nhưng chỉ trả về đơn của user đang đăng nhập.

---

## 4. Chi tiết một đơn hàng

```
GET /order/:id
```

```
GET /order/664abc111def456789012300
```

### Response

```json
{
  "message": "Get by id",
  "status": 200,
  "metadata": {
    "_id": "664abc111def456789012300",
    "user": {
      "_id": "664abc000def000000000001",
      "name": "Nguyễn Văn A",
      "email": "a@example.com"
    },
    "items": [
      {
        "_id": "...",
        "productId": "664abc123def456789012345",
        "productName": "Lego City",
        "images": ["http://localhost:3005/uploads/lego.jpg"],
        "price": 350000,
        "quantity": 2,
        "discount": 10
      }
    ],
    "coupon": {
      "_id": "664abc000def456789099999",
      "code": "SUMMER10",
      "discountType": "percent",
      "discountValue": 10
    },
    "status": "pending",
    "paymentStatus": "pending",
    "paymentMethod": "cod",
    "totalPrice": 700000,
    "finalPrice": 630000,
    "shippingAddress": {
      "fullName": "Nguyễn Văn A",
      "phone": "0901234567",
      "addressLine": "123 Lê Lợi",
      "ward": "Phường Bến Nghé",
      "district": "Quận 1",
      "province": "TP. Hồ Chí Minh"
    },
    "notes": "Giao giờ hành chính",
    "createdAt": "2025-05-22T09:00:00.000Z"
  }
}
```

---

## 5. Cập nhật trạng thái đơn hàng

```
PATCH /order/:id/status
```

Dùng chung cho cả **admin cập nhật** và **user tự huỷ đơn**.

### Request body

```json
{ "status": "confirmed" }
```

### Luồng trạng thái hợp lệ

```
draft ──→ pending ──→ confirmed ──→ shipped ──→ delivered
            ↘              ↘
           cancelled     cancelled
```

| `status` hiện tại | Được chuyển sang |
|-------------------|-----------------|
| `draft` | `pending`, `cancelled` |
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `shipped`, `cancelled` |
| `shipped` | `delivered` |
| `delivered` | ❌ không thể thay đổi |
| `cancelled` | ❌ không thể thay đổi |

### Ví dụ theo từng luồng

```js
// Admin xác nhận đơn
PATCH /order/664abc111def456789012300/status
{ "status": "confirmed" }

// Admin chuyển sang đang giao
PATCH /order/664abc111def456789012300/status
{ "status": "shipped" }

// Admin đánh dấu đã giao
PATCH /order/664abc111def456789012300/status
{ "status": "delivered" }

// User hoặc admin huỷ đơn
PATCH /order/664abc111def456789012300/status
{ "status": "cancelled" }
```

> **Lưu ý khi huỷ:** User chỉ được huỷ đơn của chính mình (`pending` hoặc `confirmed`). Admin có thể huỷ bất kỳ đơn nào.

### Response thành công

```json
{
  "message": "Update status success",
  "status": 200,
  "metadata": {
    "orderId": "664abc111def456789012300",
    "status": "confirmed",
    "paymentStatus": "pending",
    "userId": "664abc000def000000000001"
  }
}
```

### Error responses

```json
{ "status": 400, "message": "Thiếu trạng thái cần cập nhật" }
{ "status": 400, "message": "Trạng thái không hợp lệ: \"xyz\"" }
{ "status": 400, "message": "Không thể chuyển từ \"delivered\" sang \"pending\"" }
{ "status": 400, "message": "Bạn không có quyền huỷ đơn hàng này" }
{ "status": 400, "message": "Không tìm thấy đơn hàng" }
```

---

## Enum values

### `status` (trạng thái đơn hàng)

| Giá trị | Mô tả |
|---------|-------|
| `draft` | Nháp |
| `pending` | Chờ xác nhận |
| `confirmed` | Đã xác nhận |
| `shipped` | Đang giao |
| `delivered` | Đã giao |
| `cancelled` | Đã huỷ |

### `paymentStatus` (trạng thái thanh toán)

| Giá trị | Mô tả |
|---------|-------|
| `pending` | Chờ thanh toán |
| `paid` | Đã thanh toán |
| `failed` | Thanh toán thất bại |
| `refunded` | Đã hoàn tiền |

### `paymentMethod`

| Giá trị | Mô tả |
|---------|-------|
| `cod` | Thanh toán khi nhận hàng |
| `zalo` | ZaloPay |

---

## Realtime — Socket.io

Sau khi trạng thái đơn thay đổi, server tự động emit event tới user qua Socket.io.

### Kết nối

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3005', {
  auth: { token: accessToken },
});

socket.on('connected', ({ userId, room }) => {
  console.log('Joined room:', room); // "user_<userId>"
});
```

### Lắng nghe cập nhật đơn hàng

```js
socket.on('order_updated', (data) => {
  console.log(data);
  // {
  //   orderId: "664abc111def456789012300",
  //   status: "confirmed",
  //   paymentStatus: "pending"
  // }
});
```

> Event `order_updated` chỉ gửi tới đúng user sở hữu đơn hàng, không broadcast toàn bộ.

---

## Pagination helper

Tất cả các endpoint danh sách đều trả về cấu trúc pagination giống nhau:

```js
{
  result: [],       // mảng dữ liệu
  total: 87,        // tổng số bản ghi
  skip: 0,          // đã bỏ qua bao nhiêu
  limit: 10,        // số bản ghi mỗi trang
  totalPages: 9     // tổng số trang
}
```

```js
// Tính trang hiện tại
const currentPage = Math.floor(skip / limit) + 1;

// Tính skip từ page number
const skip = (page - 1) * limit;
```
