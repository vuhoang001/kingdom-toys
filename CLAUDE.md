# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start       # Start dev server with nodemon + inspector on port 9229
```

No test runner or linter is configured.

## Architecture

Toy rental backend: Node.js + Express.js REST API, MongoDB (Mongoose), Socket.io for real-time updates, JWT auth.

**Entry points:**
- `server.js` — Creates HTTP server, initializes Socket.io
- `src/app.js` — Express middleware stack (CORS, compression, morgan, helmet), mounts all routers

**Layer structure:**
```
routers/ → controllers/ → services/ → models/
```

**Key services subdirectories:**
- `services/payments/` — PaymentFactory + PaymentHandler (strategy pattern for COD vs. Zalo Pay)
- `services/discountHandler/` — Coupon/discount validation
- `services/ValidateOrder/` — Order validation with coupon application
- `services/cartHandler/` — Cart price synchronization
- `services/repos/` — User repository queries

**Auth flow:** JWT access + refresh tokens. Middleware lives in `src/helpers/auth.js`. Socket.io also authenticates via JWT at handshake (`src/socket/socket.js`).

**Socket.io:** Room-based per user (`user_{userId}`). Only emits `order_updated` to the specific user's room — not broadcast.

**Response format:** All responses go through `src/response/success.response.js` (supports pagination) or error classes in `src/response/error.response.js` (AuthFailure, NotFound, etc.).

**Async error handling:** Wrap controller/service functions with `src/helpers/AsyncHandle.js` to propagate errors to Express error middleware.

**File uploads:** Multer config in `src/configs/multer.config.js`; uploaded files stored in `uploads/`. FFmpeg used for video duration extraction.

**Location data:** Vietnam province/district/ward hierarchy loaded from JSON files at startup.

**Environment:** `.env` at project root — requires `PORT`, `DB_PORT`, `DB_HOST`, `DB_NAME`, `ACCESS_TOKEN`, `REFRESH_TOKEN`, `URL_SERVER`, and Zalo Pay credentials.
