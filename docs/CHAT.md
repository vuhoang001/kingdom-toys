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
| `GET` | `/chat/conversations` | Danh sách tất cả conversation (hỗ trợ `?status=open\|closed`) |
| `GET` | `/chat/conversations/:id/messages` | Lấy lịch sử tin nhắn |
| `POST` | `/chat/conversations/:id/messages` | Gửi tin nhắn (REST fallback) |
| `PATCH` | `/chat/conversations/:id/read` | Đánh dấu đã đọc |
| `PATCH` | `/chat/conversations/:id/status` | Đóng hoặc mở lại conversation |

### Chung (user & admin)

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/chat/unread-count` | Lấy số tin nhắn chưa đọc |

#### `GET /chat/unread-count`

- **Admin:** trả về `{ total, withUnread }` — tổng conversation và số conversation có tin chưa đọc.
- **User:** trả về `{ unreadByUser }` — số tin từ admin mà user chưa xem.

Dùng để hiển thị badge thông báo trên sidebar/navbar.

#### `GET /chat/conversations?status=open|closed`

Lọc danh sách theo trạng thái. Bỏ qua param để lấy tất cả.

#### `PATCH /chat/conversations/:id/status`

```json
// Request body
{ "status": "closed" }   // hoặc "open"
```

Khi thay đổi, server tự emit socket event `chat:status_changed` tới user liên quan (xem bên dưới).

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

#### `chat:status_changed`

Admin đóng hoặc mở lại conversation. Emit tới conversation room và `user_{userId}` room.

```js
socket.on("chat:status_changed", ({ conversationId, status }) => {
  // status: "open" | "closed"
  // Nếu closed → hiện thông báo "Cuộc trò chuyện đã được đóng"
});
```

---

## Luồng tích hợp mẫu

### Phía User

```js
// 1. Badge: lấy số tin chưa đọc từ admin
const { metadata: badge } = await fetch("/chat/unread-count", { headers: authHeaders }).then(r => r.json());
// badge: { unreadByUser: 3 }

// 2. Lấy conversation
const { metadata: conv } = await fetch("/chat/conversation", { headers: authHeaders }).then(r => r.json());

// 3. Join conversation room qua socket
socket.emit("chat:join", { conversationId: conv._id });

// 4. Lắng nghe tin nhắn đến
socket.on("chat:message", ({ message }) => renderMessage(message));

// 5. Lắng nghe khi admin đóng/mở conversation
socket.on("chat:status_changed", ({ status }) => {
  if (status === "closed") showNotice("Cuộc trò chuyện đã được đóng");
});

// 6. Gửi tin nhắn
socket.emit("chat:send", { conversationId: conv._id, content: "Xin chào!" });

// 7. Đánh dấu đọc khi mở chat
socket.emit("chat:read", { conversationId: conv._id });
```

### Phía Admin

```js
// 1. Badge: lấy số conversation có tin chưa đọc
const { metadata: stats } = await fetch("/chat/unread-count", { headers: authHeaders }).then(r => r.json());
// stats: { total: 42, withUnread: 7 }

// 2. Lấy danh sách conversations (lọc theo status nếu cần)
const { metadata } = await fetch("/chat/conversations?status=open", { headers: authHeaders }).then(r => r.json());

// 3. Lắng nghe tin nhắn mới (admin đã ở trong `admins` room, không cần join thêm)
socket.on("chat:message", ({ conversationId, message }) => {
  // cập nhật UI
});

// 4. Khi mở chat với user cụ thể → join conversation room để nhận đủ events
socket.emit("chat:join", { conversationId: "664abc..." });

// 5. Gửi trả lời
socket.emit("chat:send", { conversationId: "664abc...", content: "Chào bạn!" });

// 6. Đóng conversation khi xong
await fetch("/chat/conversations/664abc.../status", {
  method: "PATCH",
  headers: { ...authHeaders, "Content-Type": "application/json" },
  body: JSON.stringify({ status: "closed" }),
});
```

---

## Lưu ý triển khai

- **Phân quyền socket:** Middleware xác thực JWT ở tầng handshake, không cần xác thực lại trong từng event.
- **Race condition typing:** Event `chat:typing` không lưu DB, chỉ forward real-time. Client nên debounce ~500ms trước khi emit.
- **Pagination messages:** Mặc định trả 30 tin nhắn mới nhất, reverse về thứ tự cũ → mới. Dùng `skip` để load thêm về quá khứ.
- **Offline delivery:** Tin nhắn luôn lưu DB. Khi user/admin online trở lại, gọi `GET /chat/conversations/:id/messages` để lấy tin nhắn đã bỏ lỡ.
- **Reconnect:** Client phải emit lại `chat:join` sau mỗi lần reconnect socket để re-join conversation room.
