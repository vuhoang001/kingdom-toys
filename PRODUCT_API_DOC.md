# Product API — Frontend Integration Guide

Base URL: `http://localhost:3005`

---

## Authentication

Các endpoint public (GET) không yêu cầu token. Endpoint tạo/sửa/xóa yêu cầu Bearer token admin.

```
Authorization: Bearer <accessToken>
```

---

## Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/products` | Lấy danh sách sản phẩm (có filter + phân trang) |
| `GET` | `/product/:id` | Chi tiết 1 sản phẩm |
| `GET` | `/product/name/:name` | Tìm sản phẩm theo tên thể loại |
| `POST` | `/product` | Tạo sản phẩm (admin) |
| `PATCH` | `/product/:id` | Cập nhật sản phẩm (admin) |
| `DELETE` | `/product/:id` | Xóa sản phẩm (admin) |
| `POST` | `/product/:id/comment` | Thêm bình luận |
| `DELETE` | `/product/:id/comment/:commentId` | Xóa bình luận |

---

## 1. Lấy danh sách sản phẩm

```
GET /products
```

### Query parameters

#### Phân trang

| Param | Kiểu | Mặc định | Mô tả |
|-------|------|----------|-------|
| `skip` | integer | `0` | Bỏ qua n bản ghi |
| `limit` | integer | `30` | Số bản ghi trả về |

#### Tìm kiếm

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `search` | string | Tìm kiếm trong `productName` và `descriptions` (không phân biệt hoa thường) |

#### Filter danh mục & thuộc tính

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `genre` | string (ObjectId) | Lọc theo thể loại |
| `brand` | string (ObjectId) | Lọc theo thương hiệu |
| `type` | string | Lọc theo loại sản phẩm (regex, không phân biệt hoa thường) |
| `madeIn` | string | Lọc theo quốc gia sản xuất (regex, không phân biệt hoa thường) |
| `sex` | string | Lọc theo giới tính: `M` / `F` / `O` |
| `age` | string | Lọc theo độ tuổi: giá trị đơn (`5`) hoặc khoảng (`3:7`) |
| `inStock` | string | `true` = còn hàng (`quantity > 0`), `false` = hết hàng |

#### Filter giá & giảm giá

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `price` | string | Khoảng giá — xem format bên dưới |
| `minDiscount` | number | Lọc `discount ≥ minDiscount` (%) |
| `maxDiscount` | number | Lọc `discount ≤ maxDiscount` (%) |

**Format `price`:**

| Ví dụ | Ý nghĩa |
|-------|---------|
| `price=200000` | `price ≤ 200000` |
| `price=100000:500000` | `100000 ≤ price ≤ 500000` |
| `price=:300000` | `price ≤ 300000` |
| `price=200000:` | `price ≥ 200000` |
| `price=100000:300000,500000:800000` | Hai khoảng giá (OR) |

#### Sắp xếp

| Param | Giá trị `sort` | Mô tả |
|-------|---------------|-------|
| `sort` | `price_asc` | Giá tăng dần |
| `sort` | `price_desc` | Giá giảm dần |
| `sort` | `discount_desc` | Giảm giá nhiều nhất |
| `sort` | `newest` | Mới nhất (mặc định) |
| `sort` | `oldest` | Cũ nhất |

### Ví dụ

```
# Tìm kiếm theo tên
GET /products?search=lego

# Lọc theo thể loại + còn hàng
GET /products?genre=664abc000aaa000000000001&inStock=true

# Lọc theo thương hiệu + sắp xếp giá tăng dần
GET /products?brand=664abc000bbb000000000002&sort=price_asc

# Lọc sản phẩm cho bé gái độ tuổi 3-6
GET /products?sex=F&age=3:6

# Lọc theo khoảng giá + đang giảm giá
GET /products?price=100000:500000&minDiscount=10

# Lọc theo xuất xứ
GET /products?madeIn=Việt Nam

# Kết hợp nhiều filter + phân trang
GET /products?genre=664abc000aaa000000000001&inStock=true&price=50000:300000&sort=discount_desc&skip=0&limit=12
```

### Response

```json
{
  "message": "Get all success",
  "status": 200,
  "metadata": {
    "result": [
      {
        "_id": "664abc123def456789012345",
        "productName": "Lego City Train",
        "descriptions": "Bộ đồ chơi tàu hỏa",
        "images": ["http://localhost:3005/uploads/lego.jpg"],
        "price": 350000,
        "discount": 10,
        "quantity": 15,
        "type": "Lắp ráp",
        "madeIn": "Đan Mạch",
        "sex": "O",
        "age": 6,
        "genre": {
          "_id": "664abc000aaa000000000001",
          "genreName": "Lắp ráp"
        },
        "brand": {
          "_id": "664abc000bbb000000000002",
          "brandName": "LEGO"
        },
        "createdAt": "2025-05-01T08:00:00.000Z"
      }
    ],
    "total": 120,
    "skip": 0,
    "limit": 12,
    "totalPages": 10
  }
}
```

---

## 2. Chi tiết một sản phẩm

```
GET /product/:id
```

```
GET /product/664abc123def456789012345
```

### Response

```json
{
  "message": "Get by id success",
  "status": 200,
  "metadata": {
    "_id": "664abc123def456789012345",
    "productName": "Lego City Train",
    "descriptions": "Bộ đồ chơi tàu hỏa",
    "images": ["http://localhost:3005/uploads/lego.jpg"],
    "price": 350000,
    "discount": 10,
    "quantity": 15,
    "type": "Lắp ráp",
    "madeIn": "Đan Mạch",
    "sex": "O",
    "age": 6,
    "dimensions": "30x20x10cm",
    "weight": 0.5,
    "genre": { "_id": "...", "genreName": "Lắp ráp" },
    "brand": { "_id": "...", "brandName": "LEGO" },
    "comments": [
      {
        "_id": "...",
        "user": { "_id": "...", "name": "Nguyễn Văn A" },
        "content": "Sản phẩm rất tốt",
        "rating": 5,
        "createdAt": "2025-05-10T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 3. Thêm bình luận

```
POST /product/:id/comment
```

### Request body

```json
{
  "content": "Sản phẩm rất tốt, bé nhà mình rất thích",
  "rating": 5
}
```

| Field | Bắt buộc | Mô tả |
|-------|----------|-------|
| `content` | ✅ | Nội dung bình luận |
| `rating` | ❌ | Điểm đánh giá từ 0–5 (mặc định 5) |

---

## 4. Xóa bình luận

```
DELETE /product/:id/comment/:commentId
```

> Chỉ xóa được bình luận của chính mình.

---

## Enum values

### `sex`

| Giá trị | Mô tả |
|---------|-------|
| `M` | Nam |
| `F` | Nữ |
| `O` | Không phân biệt |

### `sort`

| Giá trị | Mô tả |
|---------|-------|
| `newest` | Mới nhất (mặc định) |
| `oldest` | Cũ nhất |
| `price_asc` | Giá tăng dần |
| `price_desc` | Giá giảm dần |
| `discount_desc` | Giảm giá nhiều nhất trước |

---

## Pagination helper

```js
{
  result: [],       // mảng sản phẩm
  total: 120,       // tổng số bản ghi khớp filter
  skip: 0,
  limit: 12,
  totalPages: 10
}

// Tính trang hiện tại
const currentPage = Math.floor(skip / limit) + 1;

// Tính skip từ page number
const skip = (page - 1) * limit;
```
