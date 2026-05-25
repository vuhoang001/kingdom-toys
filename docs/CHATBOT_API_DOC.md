# Chatbot API — Frontend Integration Guide

Base URL: `http://localhost:3000`

---

## Tổng quan

Chatbot sử dụng **Dialogflow ES** (Google). FE gửi tin nhắn văn bản lên server, server trả về phản hồi tự động từ AI.

Endpoint không yêu cầu xác thực — có thể gọi tự do, kể cả khi chưa đăng nhập.

---

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `POST` | `/chat` | — | Gửi tin nhắn, nhận phản hồi từ chatbot |

---

## 1. Gửi tin nhắn

```
POST /chat
Content-Type: application/json
```

### Request body

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `message` | string | ✅ | Nội dung tin nhắn người dùng nhập |
| `sessionId` | string | — | ID phiên hội thoại. Nên truyền để duy trì ngữ cảnh theo từng user |

```json
{
  "message": "Cho tôi xem các sản phẩm đồ chơi",
  "sessionId": "user-664abc123def456789012345"
}
```

> **Lưu ý về `sessionId`:**
> - Dialogflow dùng `sessionId` để nhớ ngữ cảnh của cuộc hội thoại (ví dụ: câu hỏi tiếp theo liên quan câu trước).
> - Nên dùng `_id` của user làm `sessionId` nếu đã đăng nhập, hoặc tạo một UUID ngẫu nhiên cố định cho khách.
> - Nếu không truyền, mỗi request là một phiên mới — chatbot sẽ không nhớ ngữ cảnh.

### Response

```json
{
  "message": "OK",
  "status": 200,
  "metadata": {
    "fulfillmentText": "Tìm thấy 3 sản phẩm cho \"lego\":",
    "products": [
      {
        "_id": "664abc123def456789012345",
        "productName": "Lego City Police Station",
        "price": 350000,
        "discount": 10,
        "finalPrice": 315000,
        "images": ["http://localhost:3000/uploads/lego-city.webp"],
        "quantity": 5
      }
    ],
    "intent": "tim.san.pham",
    "confidence": 0.95,
    "parameters": {}
  }
}
```

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `fulfillmentText` | string | Câu thông báo kèm kết quả (dùng hiển thị trên chat) |
| `products` | array | Danh sách sản phẩm từ DB. Mảng rỗng `[]` nếu intent không trả về sản phẩm |
| `intent` | string | Tên intent Dialogflow nhận dạng được |
| `confidence` | float (0–1) | Độ tin cậy của kết quả nhận dạng |
| `parameters` | object | Các thực thể (entity) trích xuất từ tin nhắn |

**Cấu trúc một phần tử trong `products`:**

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `_id` | string | ID sản phẩm trong MongoDB |
| `productName` | string | Tên sản phẩm |
| `price` | number | Giá gốc (VNĐ) |
| `discount` | number | % giảm giá (0 nếu không giảm) |
| `finalPrice` | number | Giá sau khi áp giảm giá (VNĐ) — **dùng để hiển thị** |
| `images` | string[] | Danh sách URL ảnh sản phẩm |
| `quantity` | number | Số lượng còn trong kho |

> **Lưu ý:** Với intent `hoi.the.loai`, `products` luôn là `[]` — chỉ có `fulfillmentText` chứa danh sách thể loại dạng text.

### Error responses

```json
{ "status": 400, "message": "message is required" }
{ "status": 500, "message": "Internal Server Error" }
```

---

## Intents & DB query

Khi Dialogflow nhận dạng được intent, backend tự động query MongoDB và trả về dữ liệu thực. FE không cần làm gì thêm — chỉ hiển thị `fulfillmentText`.

| Intent (Dialogflow) | Training phrase ví dụ | Entity cần có | Dữ liệu trả về |
|---------------------|-----------------------|---------------|----------------|
| `tim.san.pham` | "tìm đồ chơi lego", "có bán robot không" | `product-name` | Danh sách ≤5 sản phẩm khớp tên + giá |
| `hoi.gia` | "giá xe điều khiển bao nhiêu", "lego bao tiền" | `product-name` | Giá, % giảm, tình trạng còn hàng |
| `hoi.san.pham.moi` | "có sản phẩm gì mới không", "đồ chơi mới nhất" | — | 5 sản phẩm mới nhất |
| `hoi.khuyen.mai` | "đang có khuyến mãi gì", "sản phẩm giảm giá" | — | ≤5 sản phẩm giảm giá nhiều nhất |
| `hoi.the.loai` | "có những loại đồ chơi gì", "danh mục sản phẩm" | — | Danh sách thể loại |
| `hoi.san.pham.theo.the.loai` | "đồ chơi thể thao", "cho xem đồ chơi nhập vai" | `genre-name` | ≤5 sản phẩm theo thể loại |
| `hoi.gia.theo.khoang` | "đồ chơi dưới 200k", "tầm 500k có gì", "hàng xịn" | `price-range` | ≤5 sản phẩm trong khoảng giá |

> Nếu intent không nằm trong danh sách trên, backend dùng `fulfillmentText` tĩnh do Dialogflow cấu hình.

### Cách tạo Entity trong Dialogflow ES

Vào **Entities** → tạo 2 entity:

**`product-name`** — tên sản phẩm:
```
lego, robot, xe điều khiển, búp bê, xếp hình, ...
```

**`genre-name`** — tên thể loại (khớp với `genreName` trong DB):
```
đồ chơi vận động, đồ chơi sáng tạo, đồ chơi nhập vai, ...
```

**`price-range`** — khoảng giá (dùng đúng tên chuẩn bên dưới):

| Value (tên chuẩn) | Synonyms |
|-------------------|----------|
| `duoi-200k` | dưới 200, dưới 200k, rẻ, giá rẻ, bình dân, dưới 200000 |
| `200k-500k` | 200 đến 500, tầm 200-500, khoảng 300k, tầm trung |
| `500k-1tr` | 500 đến 1 triệu, tầm 500k, khoảng 700k |
| `1tr-2tr` | 1 triệu đến 2 triệu, tầm 1tr, khoảng 1.5 triệu |
| `2tr-5tr` | 2 triệu đến 5 triệu, cao cấp, hàng xịn |

---

## Hướng dẫn tích hợp giao diện

### Luồng hoạt động

```
User nhập tin nhắn
  → FE gọi POST /chat { message, sessionId }
    → Server gọi Dialogflow
      → Trả về fulfillmentText
        → FE hiển thị lên màn hình chat
```

### Gợi ý quản lý `sessionId`

```js
// Lấy hoặc tạo sessionId khi mở chat
const getSessionId = () => {
  const user = getCurrentUser(); // nếu đã đăng nhập
  if (user) return `user-${user._id}`;

  // Khách vãng lai: tạo 1 lần và lưu localStorage
  let guestId = localStorage.getItem("chat_session_id");
  if (!guestId) {
    guestId = `guest-${Date.now()}`;
    localStorage.setItem("chat_session_id", guestId);
  }
  return guestId;
};
```

### Ví dụ gọi API

```js
const sendChatMessage = async (message) => {
  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      sessionId: getSessionId(),
    }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.message);

  return data.metadata.fulfillmentText; // chuỗi hiển thị lên UI
};
```
