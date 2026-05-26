# Tính năng Chat real-time

## Tổng quan

Hệ thống chat cho phép:
- **User** chỉ được chat với admin (mỗi user có đúng một conversation).
- **Admin** có thể chat với tất cả user.

Tin nhắn được lưu vào MongoDB và phân phối qua Socket.IO.

---

## Mô hình dữ liệu

### Conversation (`Conversations` collection)

| Trường | Kiểu | Mô tả |
|---|---|---|
| `userId` | ObjectId | Ref → Account. Unique — mỗi user có 1 conversation. |
| `status` | `open` \| `closed` | Trạng thái conversation. |
| `lastMessage` | String | Nội dung tin nhắn cuối. |
| `lastMessageAt` | Date | Thời gian tin nhắn cuối. |
| `unreadByAdmin` | Number | Số tin chưa đọc từ phía admin. |
| `unreadByUser` | Number | Số tin chưa đọc từ phía user. |

### ChatMessage (`ChatMessages` collection)

| Trường | Kiểu | Mô tả |
|---|---|---|
| `conversationId` | ObjectId | Ref → Conversation. |
| `senderId` | ObjectId | Ref → Account. |
| `senderRole` | `A` \| `C` | A = admin, C = client. |
| `content` | String | Nội dung (max 2000 ký tự). |
| `isRead` | Boolean | Đã đọc chưa. |
| `readAt` | Date | Thời điểm đọc. |

---

## REST API

Base URL: `/chat`

### User

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/chat/conversation` | Lấy/tạo conversation của mình với admin |
| `GET` | `/chat/conversations/:id/messages` | Lấy lịch sử tin nhắn |
| `POST` | `/chat/conversations/:id/messages` | Gửi tin nhắn (REST fallback) |
| `PATCH` | `/chat/conversations/:id/read` | Đánh dấu đã đọc |

### Admin (thêm vào)

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/chat/conversations` | Danh sách tất cả conversation |
| `GET` | `/chat/conversations/:id/messages` | Lấy lịch sử tin nhắn |
| `POST` | `/chat/conversations/:id/messages` | Gửi tin nhắn (REST fallback) |
| `PATCH` | `/chat/conversations/:id/read` | Đánh dấu đã đọc |

Xem chi tiết request/response tại Swagger UI: `GET /api-docs`

---

## Socket.IO

### Kết nối

```js
const socket = io("http://localhost:3005", {
  auth: { token: "<accessToken>" }
});
```

Server tự join client vào:
- `user_{userId}` — room riêng của user.
- `admins` — room chung cho tất cả admin đang online (chỉ khi role = `A`).

### Events: Client → Server

#### `chat:join`

Join vào room của một conversation để nhận tin nhắn real-time.

```js
socket.emit("chat:join", { conversationId: "664abc..." }, (res) => {
  // res: { ok: true, room: "conversation_664abc..." }
  //    | { ok: false, message: "..." }
});
```

> Phải gọi sau mỗi lần reconnect.

#### `chat:send`

Gửi tin nhắn.

```js
socket.emit("chat:send", {
  conversationId: "664abc...",
  content: "Xin chào, tôi cần hỗ trợ!"
}, (res) => {
  // res: { ok: true, message: { _id, content, senderId, ... } }
  //    | { ok: false, message: "..." }
});
```

#### `chat:typing`

Thông báo đang gõ (không có ack).

```js
socket.emit("chat:typing", { conversationId: "664abc..." });
```

#### `chat:read`

Đánh dấu đã đọc tin nhắn trong conversation.

```js
socket.emit("chat:read", { conversationId: "664abc..." }, (res) => {
  // res: { ok: true } | { ok: false, message: "..." }
});
```

---

### Events: Server → Client

#### `connected`

Gửi ngay sau khi kết nối thành công.

```js
socket.on("connected", ({ userId, room }) => { ... });
```

#### `chat:message`

Tin nhắn mới trong conversation.

```js
socket.on("chat:message", ({ conversationId, message }) => {
  // message: { _id, conversationId, senderId, senderRole, content, isRead, createdAt }
});
```

> Nhận được kể cả khi chưa `chat:join` conversation room (server emit thêm vào `user_{id}` / `admins` room).

#### `chat:typing`

Phía đối diện đang gõ.

```js
socket.on("chat:typing", ({ conversationId, userId }) => { ... });
```

#### `chat:read`

Phía đối diện đã đọc tin nhắn.

```js
socket.on("chat:read", ({ conversationId, readBy }) => { ... });
```

---

## Luồng tích hợp mẫu

### Phía User

```js
// 1. Lấy conversation
const { metadata: conv } = await fetch("/chat/conversation", { headers: authHeaders }).then(r => r.json());

// 2. Join conversation room qua socket
socket.emit("chat:join", { conversationId: conv._id });

// 3. Lắng nghe tin nhắn đến
socket.on("chat:message", ({ message }) => renderMessage(message));

// 4. Gửi tin nhắn
socket.emit("chat:send", { conversationId: conv._id, content: "Xin chào!" });

// 5. Đánh dấu đọc khi mở chat
socket.emit("chat:read", { conversationId: conv._id });
```

### Phía Admin

```js
// 1. Lấy danh sách conversations
const { metadata } = await fetch("/chat/conversations", { headers: authHeaders }).then(r => r.json());

// 2. Lắng nghe tin nhắn mới (admin đã ở trong `admins` room, không cần join thêm)
socket.on("chat:message", ({ conversationId, message }) => {
  // cập nhật UI
});

// 3. Khi mở chat với user cụ thể → join conversation room để nhận đủ events
socket.emit("chat:join", { conversationId: "664abc..." });

// 4. Gửi trả lời
socket.emit("chat:send", { conversationId: "664abc...", content: "Chào bạn!" });
```

---

## Lưu ý triển khai

- **Phân quyền socket:** Middleware xác thực JWT ở tầng handshake, không cần xác thực lại trong từng event.
- **Race condition typing:** Event `chat:typing` không lưu DB, chỉ forward real-time. Client nên debounce ~500ms trước khi emit.
- **Pagination messages:** Mặc định trả 30 tin nhắn mới nhất, reverse về thứ tự cũ → mới. Dùng `skip` để load thêm về quá khứ.
- **Offline delivery:** Tin nhắn luôn lưu DB. Khi user/admin online trở lại, gọi `GET /chat/conversations/:id/messages` để lấy tin nhắn đã bỏ lỡ.
- **Reconnect:** Client phải emit lại `chat:join` sau mỗi lần reconnect socket để re-join conversation room.
