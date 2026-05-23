# Coupon API — Frontend Integration Guide

Base URL: `http://localhost:3005`

---

## Authentication

Các endpoint có ký hiệu 🔒 yêu cầu Bearer token.

```
Authorization: Bearer <accessToken>
```

---

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET` | `/coupon` | ❌ | Danh sách coupon |
| `GET` | `/coupon/:id` | ❌ | Chi tiết 1 coupon |
| `POST` | `/coupon` | ❌ | Tạo coupon (admin) |
| `PATCH` | `/coupon/:id` | ❌ | Cập nhật coupon (admin) |
| `DELETE` | `/coupon/:id` | ❌ | Xoá coupon (admin) |
| `POST` | `/coupon/apply` | 🔒 | Xem trước giá sau khi áp dụng coupon |

---

## Coupon Object

```json
{
  "_id": "664abc000def456789099999",
  "CouponName": "SUMMER10",
  "CouponType": "percent",
  "CouponValue": 10,
  "minOrderValue": 200000,
  "expiryDate": "2025-12-31T23:59:59.000Z",
  "usageLimit": 100,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-05-22T09:00:00.000Z"
}
```

### Field definitions

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `CouponName` | string | Tên / mã coupon hiển thị |
| `CouponType` | string | `percent` — giảm theo %, `fixed` — giảm số tiền cố định |
| `CouponValue` | number | Giá trị giảm: nếu `percent` thì là %, nếu `fixed` thì là VNĐ |
| `minOrderValue` | number | Giá trị đơn hàng tối thiểu để áp dụng (đơn vị VNĐ) |
| `expiryDate` | ISO date | Ngày hết hạn |
| `usageLimit` | number | Số lượt sử dụng còn lại |

---

## 1. Danh sách coupon

```
GET /coupon
```

### Query parameters

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `search` | string | Tìm theo tên coupon |
| `skip` | integer | Bỏ qua n bản ghi (mặc định 0) |
| `limit` | integer | Số bản ghi trả về (mặc định 30) |

```
GET /coupon?skip=0&limit=10
GET /coupon?search=SUMMER
```

### Response

```json
{
  "message": "Get all success",
  "status": 200,
  "metadata": {
    "result": [
      {
        "_id": "664abc000def456789099999",
        "CouponName": "SUMMER10",
        "CouponType": "percent",
        "CouponValue": 10,
        "minOrderValue": 200000,
        "expiryDate": "2025-12-31T23:59:59.000Z",
        "usageLimit": 100
      }
    ],
    "total": 5,
    "skip": 0,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## 2. Chi tiết một coupon

```
GET /coupon/:id
```

```
GET /coupon/664abc000def456789099999
```

### Response

```json
{
  "message": "Get by id success",
  "status": 200,
  "metadata": {
    "_id": "664abc000def456789099999",
    "CouponName": "SUMMER10",
    "CouponType": "percent",
    "CouponValue": 10,
    "minOrderValue": 200000,
    "expiryDate": "2025-12-31T23:59:59.000Z",
    "usageLimit": 100,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-05-22T09:00:00.000Z"
  }
}
```

---

## 3. Tạo coupon (admin)

```
POST /coupon
```

### Request body

```json
{
  "CouponName": "SUMMER10",
  "CouponType": "percent",
  "CouponValue": 10,
  "minOrderValue": 200000,
  "expiryDate": "2025-12-31T23:59:59.000Z",
  "usageLimit": 100
}
```

| Field | Bắt buộc | Mô tả |
|-------|----------|-------|
| `CouponName` | ✅ | Tên coupon, phải unique |
| `CouponType` | ✅ | `percent` hoặc `fixed` |
| `CouponValue` | ✅ | Giá trị giảm |
| `expiryDate` | ✅ | Ngày hết hạn |
| `minOrderValue` | ❌ | Giá trị đơn tối thiểu (mặc định 0) |
| `usageLimit` | ❌ | Giới hạn lượt dùng (mặc định 1) |

### Response

```json
{
  "message": "Create Success",
  "status": 200,
  "metadata": {
    "_id": "664abc000def456789099999",
    "CouponName": "SUMMER10",
    "CouponType": "percent",
    "CouponValue": 10,
    "minOrderValue": 200000,
    "expiryDate": "2025-12-31T23:59:59.000Z",
    "usageLimit": 100
  }
}
```

### Error responses

```json
{ "status": 400, "message": "Đã có coupon này rồi!" }
```

---

## 4. Cập nhật coupon (admin)

```
PATCH /coupon/:id
```

Body truyền các field cần cập nhật (không cần truyền hết):

```json
{
  "usageLimit": 200,
  "expiryDate": "2026-06-30T23:59:59.000Z"
}
```

### Response

```json
{
  "message": "Update success",
  "status": 200,
  "metadata": {
    "_id": "664abc000def456789099999",
    "CouponName": "SUMMER10",
    "CouponType": "percent",
    "CouponValue": 10,
    "minOrderValue": 200000,
    "expiryDate": "2026-06-30T23:59:59.000Z",
    "usageLimit": 200
  }
}
```

---

## 5. Xoá coupon (admin)

```
DELETE /coupon/:id
```

### Response

```json
{
  "message": "DeleteCoupon",
  "status": 200,
  "metadata": "success"
}
```

---

## 6. Xem trước giá sau khi áp dụng coupon 🔒

Dùng để **preview** giá cuối trước khi đặt hàng. Không trừ `usageLimit`, không tạo đơn.

```
POST /coupon/apply
Authorization: Bearer <accessToken>
```

### Request body

```json
{
  "items": [
    { "productId": "664abc123def456789012345", "quantity": 2 },
    { "productId": "664abc123def456789012346", "quantity": 1 }
  ],
  "coupon": "664abc000def456789099999"
}
```

| Field | Bắt buộc | Mô tả |
|-------|----------|-------|
| `items` | ✅ | Danh sách sản phẩm muốn kiểm tra |
| `items[].productId` | ✅ | ID sản phẩm |
| `items[].quantity` | ✅ | Số lượng |
| `coupon` | ✅ | ID của coupon muốn áp dụng |

### Response

```json
{
  "message": "Apply success",
  "status": 200,
  "metadata": {
    "totalPrice": 700000,
    "discountValue": 70000,
    "finalPrice": 630000,
    "couponValue": 10,
    "couponId": "664abc000def456789099999"
  }
}
```

| Field | Mô tả |
|-------|-------|
| `totalPrice` | Giá gốc trước khi giảm |
| `discountValue` | Số tiền được giảm (VNĐ) |
| `finalPrice` | Giá cuối sau khi giảm |
| `couponValue` | Giá trị coupon gốc (% hoặc VNĐ tuỳ `CouponType`) |
| `couponId` | ID coupon đã áp dụng |

### Error responses

```json
{ "status": 400, "message": "Mã giảm giá không tồn tại" }
{ "status": 400, "message": "Mã giảm giá SUMMER10 đã hết hạn vào ngày 31/12/2024" }
{ "status": 400, "message": "Đơn hàng phải từ 200000 mới áp dụng mã giảm giá" }
{ "status": 400, "message": "Đã hết mã giảm giá này" }
{ "status": 400, "message": "Sản phẩm không tồn tại hoặc đã bị vô hiệu hóa" }
```

---

## Logic tính giá giảm

```js
// CouponType = "percent"
discountValue = totalPrice * (CouponValue / 100)

// CouponType = "fixed"
discountValue = CouponValue

// Giảm tối đa không vượt quá totalPrice
if (discountValue > totalPrice) discountValue = totalPrice

finalPrice = totalPrice - discountValue
```

### Ví dụ

| CouponType | CouponValue | totalPrice | discountValue | finalPrice |
|------------|-------------|------------|---------------|------------|
| `percent` | 10 | 700.000 | 70.000 | 630.000 |
| `percent` | 50 | 700.000 | 350.000 | 350.000 |
| `fixed` | 100.000 | 700.000 | 100.000 | 600.000 |
| `fixed` | 800.000 | 700.000 | 700.000 | 0 |

---

## Luồng tích hợp ở trang checkout

```
1. User nhập coupon ID / chọn từ danh sách
      ↓
2. Gọi POST /coupon/apply để preview giá
      ↓
3. Hiển thị: giá gốc, số tiền giảm, giá cuối
      ↓
4. User xác nhận → gọi POST /order/CheckoutWithPayload
   (truyền coupon ID vào field "coupon")
      ↓
5. Backend tự trừ usageLimit khi tạo đơn thành công
```

> **Lưu ý:** Chỉ truyền `couponId` (field `_id` từ response) vào checkout, **không truyền `CouponName`**.

---

## Enum values

| Giá trị | Mô tả |
|---------|-------|
| `percent` | Giảm theo phần trăm |
| `fixed` | Giảm số tiền cố định (VNĐ) |
