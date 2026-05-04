# CMU ShareCycle — สถาปัตยกรรม (Pragmatic Hexagonal)

โปรเจกต์ใช้แบ่งชั้นแบบ **Hexagonal / Ports & Adapters** แบบปฏิบัติการ: แยก HTTP, persistence, และ domain logic ให้เปลี่ยน adapter ได้โดยไม่แตะ core มาก

## Backend (`backend/src`)

| โฟลเดอร์ | บทบาท |
|-----------|--------|
| `composition/` | ประกอบร่างแอป: `app.js` (Express + routes), `server.js` (HTTP, Socket.IO bootstrap, health checks) |
| `adapters/inbound/http/` | เข้า: `routes/`, `controllers/`, `middleware/` — รับ HTTP แล้วเรียก use cases / services |
| `adapters/outbound/persistence/` | ออก: `pool.js` — PostgreSQL ผ่าน `pg` |
| `application/services/` | กรณีใช้งานข้ามโดเมน เช่น `chatService.js` (Socket.IO + อีเมล) |
| `infrastructure/config/` | การตั้งค่าและ validation ของ env (`env.js`, Zod) |
| `shared/utils/` | เครื่องมือใช้ร่วม (token, email, audit, points, CO₂, moderation) |

การโหลด `.env` ใช้ `process.cwd()` (ค่าเริ่มมิง `./.env`) หรือกำหนด `ENV_FILE` ได้ — เหมาะกับ Docker (`WORKDIR /app`) และสคริปต์ที่รันจากโฟลเดอร์ `backend/`

ไฟล์อัปโหลดแชทอยู่ที่ `uploads/chat/` ภายใต้ working directory เดียวกับที่รัน Node

## Frontend (`frontend`)

React (CRA + Craco) เรียก API ผ่าน `REACT_APP_API_URL` (ดู `src/lib/api.js`) และ Socket.IO ใช้ URL เดียวกันโดยตัด suffix `/api`

## Docker

- `docker-compose.yml` (รากโปรเจกต์) — บริการ `api` (พอร์ต 4000) และ `web` (nginx พอร์ต 3000)
- `backend/Dockerfile` — multi-stage: `deps` (`npm ci --omit=dev`) แล้ว `runner` รูปเล็ก ไม่รวม devDependencies
- `frontend/Dockerfile` — build สเตจแยกจาก nginx Alpine สำหรับ static assets

รันจากรากโปรเจกต์:

```bash
docker compose up --build
```

ตั้งค่า `CLIENT_ORIGIN` / `CLIENT_ORIGINS` ใน `backend/.env` ให้ตรงกับที่ผู้ใช้เปิดเว็บ (เช่น `http://localhost:3000`) เพื่อ CORS
