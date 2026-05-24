# User & Membership API — Frontend Integration Guide

Base URL: `http://localhost:3000`

---

## Authentication

Các endpoint có ký hiệu 🔒 yêu cầu Bearer token trong header:

```
Authorization: Bearer <accessToken>
```

---

## Hệ thống hạng thẻ (Membership Tier)

Hạng thẻ được tính tự động dựa trên **tổng tiền của các đơn hàng đã giao thành công** (`status = delivered`).

| Hạng | Điều kiện (`totalSpent`) | Giảm giá | Freeship | Voucher |
|------|--------------------------|----------|----------|---------|
| `bronze` | Mặc định (≥ 0đ) | — | — | — |
| `silver` | ≥ 2.000.000đ | 3% | — | — |
| `gold` | ≥ 5.000.000đ | 5% | — | — |
| `platinum` | ≥ 10.000.000đ | — | ✅ | ✅ |

> **Cách hoạt động:** Mỗi khi admin chuyển đơn hàng sang trạng thái `delivered`, hệ thống tự động cộng `finalPrice` vào `totalSpent` của user và nâng hạng nếu đủ điều kiện. Hạng chỉ tăng, không giảm.

---

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `POST` | `/login` | — | Đăng nhập |
| `POST` | `/register` | — | Đăng ký |
| `POST` | `/handleRF` | 🔒 | Làm mới access token |
| `GET` | `/get-me` | 🔒 | Thông tin cá nhân |
| `GET` | `/users` | 🔒 | Danh sách user (admin) |
| `PATCH` | `/update-me` | 🔒 | Cập nhật hồ sơ |
| `PATCH` | `/update-password` | 🔒 | Đổi mật khẩu |

---

## 1. Đăng nhập

```
POST /login
```

### Request body

```json
{
  "username": "user@gmail.com",
  "password": "123"
}
```

### Response

```json
{
  "message": "login success",
  "status": 200,
  "metadata": {
    "user": {
      "_id": "664abc123def456789012345",
      "name": "Nguyễn Văn A",
      "email": "user@gmail.com",
      "thumbnail": "",
      "role": "C"
    },
    "accessToken": "<jwt>",
    "atokenExp": 1748000000,
    "refreshToken": "<jwt>",
    "rtokenExp": 1748600000
  }
}
```

| Field | Mô tả |
|-------|-------|
| `role` | `A` = Admin, `C` = Client |
| `atokenExp` | Unix timestamp hết hạn access token |
| `rtokenExp` | Unix timestamp hết hạn refresh token |

### Error responses

```json
{ "status": 401, "message": "Tài khoản chưa được đăng ký" }
{ "status": 401, "message": "Tài khoản hoặc mật khẩu không chính xác" }
```

---

## 2. Đăng ký

```
POST /register
```

### Request body

```json
{
  "name": "Nguyễn Văn A",
  "email": "user@gmail.com",
  "password": "123"
}
```

### Response

```json
{
  "message": "register success",
  "status": 200,
  "metadata": {
    "user": {
      "_id": "664abc123def456789012345",
      "name": "Nguyễn Văn A",
      "email": "user@gmail.com"
    }
  }
}
```

### Error responses

```json
{ "status": 401, "message": "Tài khoản đã tồn tại trong hệ thống" }
```

---

## 3. Làm mới access token

```
POST /handleRF
```

Gửi refresh token qua header thay vì body.

### Headers

```
x-rtoken-id: <refreshToken>
```

### Response

```json
{
  "message": "handle rf success",
  "status": 200,
  "metadata": {
    "user": { "_id": "...", "name": "...", "email": "..." },
    "accessToken": "<jwt mới>",
    "atokenExp": 1748000000,
    "refreshToken": "<jwt mới>",
    "rtokenExp": 1748600000
  }
}
```

> Sau khi gọi thành công, **refresh token cũ bị vô hiệu**. Lưu cả `accessToken` lẫn `refreshToken` mới.

---

## 4. Thông tin cá nhân

```
GET /get-me
```

### Response

```json
{
  "message": "get me success",
  "status": 200,
  "metadata": {
    "_id": "664abc123def456789012345",
    "name": "Nguyễn Văn A",
    "email": "user@gmail.com",
    "status": "active",
    "thumbnail": "http://localhost:3000/uploads/avatar.jpg",
    "phone": "0901234567",
    "addressLine": "123 Lê Lợi",
    "ward": "Phường Bến Nghé",
    "district": "Quận 1",
    "province": "TP. Hồ Chí Minh",
    "role": "C",
    "membershipTier": "silver",
    "totalSpent": 3200000,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-05-24T00:00:00.000Z"
  }
}
```

---

## 5. Danh sách user (admin)

```
GET /users
```

### Query parameters

| Param | Kiểu | Mặc định | Mô tả |
|-------|------|----------|-------|
| `skip` | integer | `0` | Bỏ qua n bản ghi |
| `limit` | integer | `20` | Số bản ghi trả về |
| `search` | string | — | Tìm kiếm theo `name` hoặc `email` |
| `tier` | string | — | Lọc theo hạng thẻ: `bronze` / `silver` / `gold` / `platinum` |

### Ví dụ

```
GET /users?skip=0&limit=20&tier=gold
GET /users?skip=0&limit=20&search=nguyen
```

### Response

```json
{
  "message": "get users success",
  "status": 200,
  "metadata": {
    "result": [
      {
        "_id": "664abc123def456789012345",
        "name": "Nguyễn Văn A",
        "email": "user@gmail.com",
        "status": "active",
        "thumbnail": "",
        "phone": "0901234567",
        "role": "C",
        "membershipTier": "gold",
        "totalSpent": 6500000,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "skip": 0,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## 6. Cập nhật hồ sơ

```
PATCH /update-me
Content-Type: multipart/form-data
```

### Form fields

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `items` | string (JSON) | Object chứa các trường cần cập nhật |
| `images` | file | Ảnh đại diện mới (không bắt buộc) |

### Ví dụ `items`

```json
{
  "name": "Nguyễn Văn B",
  "phone": "0909999999",
  "addressLine": "456 Nguyễn Trãi",
  "ward": "Phường 3",
  "district": "Quận 5",
  "province": "TP. Hồ Chí Minh"
}
```

### Response

```json
{
  "message": "update success",
  "status": 200,
  "metadata": { ...thông tin user đã cập nhật... }
}
```

---

## 7. Đổi mật khẩu

```
PATCH /update-password
```

### Request body

```json
{
  "password": "mật_khẩu_cũ",
  "newPassword": "mật_khẩu_mới"
}
```

### Response

```json
{
  "message": "Register success",
  "status": 200,
  "metadata": "Đổi mật khẩu thành công"
}
```

### Error responses

```json
{ "status": 400, "message": "Đổi mật khẩu lỗi" }
```

---

## Enum tham chiếu

### `role`
| Giá trị | Mô tả |
|---------|-------|
| `A` | Admin |
| `C` | Client |

### `status` (tài khoản)
| Giá trị | Mô tả |
|---------|-------|
| `active` | Đang hoạt động |
| `inactive` | Tạm ngưng |
| `deleted` | Đã xoá |

### `membershipTier`
| Giá trị | Điều kiện |
|---------|-----------|
| `bronze` | Mặc định |
| `silver` | `totalSpent` ≥ 2.000.000đ |
| `gold` | `totalSpent` ≥ 5.000.000đ |
| `platinum` | `totalSpent` ≥ 10.000.000đ |
