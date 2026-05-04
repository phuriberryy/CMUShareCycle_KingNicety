# 🌱 CMU ShareCycle

<div align="center">

![CMU ShareCycle](https://img.shields.io/badge/CMU-ShareCycle-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-Private-red)

**แพลตฟอร์มแลกเปลี่ยนและบริจาคสินค้าอย่างยั่งยืนสำหรับชุมชน CMU**

[ฟีเจอร์](#-ฟีเจอร์) • [การติดตั้ง](#-การติดตั้ง) • [เอกสาร](#-เอกสาร) • [การมีส่วนร่วม](#-การมีส่วนร่วม)

</div>

รันที่รากโปรเจกต์ (โฟลเดอร์เดียวกับ `backend/` และ `frontend/`): `npm start` หรือ `chmod +x scripts/start.sh && ./scripts/start.sh`  
รันเฉพาะ backend / frontend: `npm run start:backend` / `npm run start:frontend` (หรือ `bash scripts/start-backend.sh`, `bash scripts/start-frontend.sh`)

---

## 📖 สารบัญ

- [ภาพรวม](#-ภาพรวม)
- [ฟีเจอร์](#-ฟีเจอร์)
- [เทคโนโลยีที่ใช้](#-เทคโนโลยีที่ใช้)
- [โครงสร้างโปรเจค](#-โครงสร้างโปรเจค)
- [การติดตั้ง](#-การติดตั้ง)
- [การตั้งค่า](#-การตั้งค่า)
- [วิธีใช้งาน](#-วิธีใช้งาน)
- [เอกสาร API](#-เอกสาร-api)
- [โครงสร้างฐานข้อมูล](#-โครงสร้างฐานข้อมูล)
- [ฟีเจอร์ Real-time](#-ฟีเจอร์-realtime)
- [ความปลอดภัย](#-ความปลอดภัย)
- [การ Deploy](#-การ-deploy)
- [การมีส่วนร่วม](#-การมีส่วนร่วม)
- [สัญญาอนุญาต](#-สัญญาอนุญาต)

---

## 🎯 ภาพรวม

**CMU ShareCycle** เป็นแอปพลิเคชันเว็บที่ออกแบบมาสำหรับชุมชน CMU (มหาวิทยาลัยเชียงใหม่) เพื่ออำนวยความสะดวกในการแลกเปลี่ยนและบริจาคสินค้าอย่างยั่งยืน แพลตฟอร์มนี้ช่วยลดขยะ ส่งเสริมเศรษฐกิจหมุนเวียน และติดตามผลกระทบต่อสิ่งแวดล้อมผ่านการคำนวณ CO₂ footprint

### วัตถุประสงค์หลัก
- ♻️ ส่งเสริมการบริโภคอย่างยั่งยืนผ่านการแลกเปลี่ยนสินค้า
- ❤️ อำนวยความสะดวกในการบริจาคสินค้าให้กับสมาชิกในชุมชน
- 🌍 ติดตามและลดคาร์บอนฟุตพริ้นท์
- 💬 ส่งเสริมการสื่อสารระหว่างผู้ใช้ผ่านแชทแบบ real-time
- 🔒 รับประกันเนื้อหาที่ปลอดภัยและผ่านการกลั่นกรอง

---

## ✨ ฟีเจอร์

### 🔐 การยืนยันตัวตนและการจัดการผู้ใช้
- ✅ ลงทะเบียนและเข้าสู่ระบบ
- ✅ จัดการโปรไฟล์ (ชื่อ, คณะ, รูปโปรไฟล์)
- ✅ รีเซ็ตรหัสผ่านผ่านอีเมล
- ✅ การยืนยันตัวตนด้วย JWT
- ✅ การเข้ารหัสรหัสผ่านอย่างปลอดภัยด้วย bcrypt

### 📦 การจัดการสินค้า
- ✅ โพสต์สินค้าสำหรับแลกเปลี่ยนหรือบริจาค
- ✅ แก้ไขและลบสินค้า
- ✅ ดูรายละเอียดสินค้าพร้อมรูปภาพ
- ✅ กรองสินค้าตามหมวดหมู่
- ✅ ฟังก์ชันค้นหา
- ✅ ระบบหมดอายุอัตโนมัติ (สินค้าหมดอายุตามวันที่)
- ✅ การกลั่นกรองเนื้อหา (ตรวจจับสแปม, ตรวจสอบเนื้อหาซ้ำ)

### 🔄 ระบบแลกเปลี่ยน
- ✅ ขอแลกเปลี่ยนสินค้า
- ✅ ยอมรับ/ปฏิเสธคำขอแลกเปลี่ยน
- ✅ กระบวนการยอมรับสองทาง (เจ้าของ → ผู้ขอ)
- ✅ ติดตามประวัติการแลกเปลี่ยน
- ✅ ยืนยันการแลกเปลี่ยนด้วย QR Code
- ✅ คำนวณการลด CO₂

### ❤️ ระบบบริจาค
- ✅ โพสต์สินค้าบริจาค
- ✅ ขอรับบริจาค
- ✅ เก็บข้อมูลผู้รับบริจาค
- ✅ ยอมรับ/ปฏิเสธคำขอรับบริจาค
- ✅ ติดตามประวัติการบริจาค
- ✅ ยืนยันการบริจาคด้วย QR Code
- ✅ คำนวณการลด CO₂

### 💬 แชทแบบ Real-time
- ✅ ส่งข้อความแบบ real-time ด้วย Socket.io
- ✅ ประวัติแชท
- ✅ ยอมรับ/ปฏิเสธคำขอแชท
- ✅ ตัวบ่งชี้การพิมพ์ (พร้อมสำหรับการใช้งาน)
- ✅ การส่งข้อความแบบ real-time

### 📱 ระบบ QR Code
- ✅ สร้าง QR Code ที่ไม่ซ้ำสำหรับการแลกเปลี่ยน/บริจาค
- ✅ สแกน QR Code ด้วยกล้องของอุปกรณ์
- ✅ ยืนยัน QR Code เพื่อทำธุรกรรมให้เสร็จสมบูรณ์
- ✅ รหัสแยกสำหรับ Exchange (EX) และ Donation (DN)

### 🔔 ระบบการแจ้งเตือน
- ✅ การแจ้งเตือนแบบ real-time ผ่าน Socket.io
- ✅ การแจ้งเตือนทางอีเมล
- ✅ ประเภทการแจ้งเตือน:
  - คำขอแลกเปลี่ยน/บริจาค
  - การยอมรับ/ปฏิเสธคำขอ
  - ข้อความแชท
  - การทำธุรกรรมเสร็จสมบูรณ์

### 🌍 การติดตาม CO₂
- ✅ คำนวณ CO₂ footprint ของสินค้าตามหมวดหมู่และสภาพ
- ✅ ติดตามการลด CO₂ จากการแลกเปลี่ยน/บริจาค
- ✅ แดชบอร์ดสถิติ
- ✅ การแสดงผลผลกระทบต่อสิ่งแวดล้อม

### 🛡️ การกลั่นกรองเนื้อหา
- ✅ ตรวจจับสแปม
- ✅ กรองเนื้อหาที่ไม่เหมาะสม
- ✅ ป้องกันเนื้อหาซ้ำ
- ✅ ตรวจสอบรูปภาพ (ขนาด, รูปแบบ)
- ✅ ตรวจจับการซ้ำของตัวอักษร

---

## 🛠️ เทคโนโลยีที่ใช้

### Backend
| เทคโนโลยี | เวอร์ชัน | วัตถุประสงค์ |
|------------|---------|---------|
| **Node.js** | ล่าสุด | Runtime environment |
| **Express.js** | 4.19.2 | Web framework |
| **PostgreSQL** | ล่าสุด | ฐานข้อมูลเชิงสัมพันธ์ |
| **Socket.io** | 4.7.5 | การสื่อสารแบบ real-time |
| **JWT** | 9.0.2 | การยืนยันตัวตน |
| **bcryptjs** | 2.4.3 | การเข้ารหัสรหัสผ่าน |
| **Nodemailer** | 6.9.15 | บริการอีเมล |
| **express-validator** | 7.2.1 | การตรวจสอบข้อมูลเข้า |
| **pg** | 8.12.0 | PostgreSQL client |

### Frontend
| เทคโนโลยี | เวอร์ชัน | วัตถุประสงค์ |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **React Router** | 7.9.5 | Routing |
| **Tailwind CSS** | 3.4.14 | Styling |
| **Socket.io Client** | 4.7.5 | การสื่อสารแบบ real-time |
| **Lucide React** | 0.553.0 | ไอคอน |
| **qrcode.react** | 4.2.0 | การสร้าง QR Code |
| **html5-qrcode** | 2.3.8 | การสแกน QR Code |

### เครื่องมือพัฒนา
- **CRACO** - Create React App Configuration Override
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

---

## 📁 โครงสร้างโปรเจค

```
./                          (ราก repo — โฟลเดอร์เดียวกับ package.json ชุดนี้)
├── backend/
│   ├── src/
│   │   ├── composition/           # app.js, server.js (ประกอบร่าง)
│   │   ├── adapters/
│   │   │   ├── inbound/http/      # routes, controllers, middleware
│   │   │   └── outbound/persistence/  # pool.js
│   │   ├── application/services/  # เช่น chatService (Socket.IO)
│   │   ├── infrastructure/config/ # env (Zod)
│   │   └── shared/utils/          # email, token, points, …
│   ├── Dockerfile
│   ├── sql/                 # Database migrations
│   ├── scripts/             # Utility scripts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/           # Page components
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── ItemDetailPage.jsx
│   │   │   ├── ExchangeRequestDetailPage.jsx
│   │   │   └── DonationRequestDetailPage.jsx
│   │   ├── components/       # Reusable components
│   │   │   ├── modals/      # Modal components
│   │   │   ├── layout/      # Layout components
│   │   │   └── ui/          # UI components
│   │   ├── context/          # React Context
│   │   │   └── AuthContext.jsx
│   │   ├── lib/             # API utilities
│   │   │   └── api.js
│   │   └── utils/           # Frontend utilities
│   ├── Dockerfile
│   ├── docker/nginx.conf
│   ├── public/
│   └── package.json
│
├── docker-compose.yml
├── docs/                    # เอกสารทั้งหมด (.md)
│   ├── ARCHITECTURE.md
│   ├── PROJECT_DOCUMENTATION.md
│   ├── RUN_INSTRUCTIONS.md
│   ├── EMAIL_SETUP.md
│   ├── FEATURE_PLAN.md
│   └── BUG_REPORT.md
├── scripts/                 # สคริปต์ shell รันโปรเจกต์
│   ├── start.sh
│   ├── start-backend.sh
│   └── start-frontend.sh
├── package.json
└── README.md
```

---

## 🚀 การติดตั้ง

### ความต้องการเบื้องต้น
- **Node.js** (v18 หรือสูงกว่า)
- **PostgreSQL** (v12 หรือสูงกว่า)
- **npm** หรือ **yarn**

### ขั้นตอนที่ 1: Clone Repository
```bash
git clone <repository-url>
cd <โฟลเดอร์ที่ clone มา>   # โฟลเดอร์ที่มี backend/, frontend/, package.json ชุดนี้
```

### ขั้นตอนที่ 2: ติดตั้ง Dependencies
```bash
# ติดตั้ง dependencies ทั้งหมด (backend + frontend)
npm run install:all

# หรือติดตั้งแยกกัน
cd backend && npm install
cd ../frontend && npm install
```

### ขั้นตอนที่ 3: ตั้งค่าฐานข้อมูล
```bash
# สร้างฐานข้อมูล PostgreSQL
createdb cmu_sharecycle

# รัน database migrations
cd backend
npm run db:migrate
npm run db:migrate:donation
```

### ขั้นตอนที่ 4: ตั้งค่า Environment Variables
สร้างไฟล์ `.env` ในทั้ง `backend/` และ `frontend/`

**Backend `.env`:**
```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/cmu_sharecycle

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# CORS
CLIENT_ORIGIN=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Email (Gmail OAuth2)
EMAIL_USER=your-email@gmail.com
EMAIL_CLIENT_ID=your-client-id
EMAIL_CLIENT_SECRET=your-client-secret
EMAIL_REFRESH_TOKEN=your-refresh-token
EMAIL_ACCESS_TOKEN=your-access-token

# Email (SMTP Alternative)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_AUTH_USER=your-email@gmail.com
EMAIL_AUTH_PASS=your-app-password
```

**Frontend `.env`:**
```env
REACT_APP_API_BASE=http://localhost:4000/api
```

### ขั้นตอนที่ 5: ตั้งค่าอีเมล (ไม่บังคับ)
```bash
cd backend
npm run email:setup
# ทำตามคำแนะนำเพื่อตั้งค่าบริการอีเมล
```

### ขั้นตอนที่ 6: เริ่มต้นแอปพลิเคชัน
```bash
# เริ่มทั้ง backend และ frontend
npm start

# หรือเริ่มแยกกัน
npm run start:backend  # Backend บนพอร์ต 4000
npm run start:frontend # Frontend บนพอร์ต 3000
```

---

## ⚙️ การตั้งค่า

### การตั้งค่าฐานข้อมูล
- ฐานข้อมูลเริ่มต้น: `cmu_sharecycle`
- รูปแบบ connection string: `postgresql://user:password@host:port/database`

### การตั้งค่าอีเมล
มีสองตัวเลือก:

#### ตัวเลือกที่ 1: Gmail OAuth2 (แนะนำ)
1. สร้าง Google Cloud Project
2. เปิดใช้งาน Gmail API
3. สร้าง OAuth 2.0 credentials
4. รัน `npm run email:gmail` เพื่อตั้งค่า

#### ตัวเลือกที่ 2: SMTP
1. เปิดใช้งาน "Less secure app access" หรือใช้ App Password
2. ตั้งค่า SMTP ใน `.env`

### การตั้งค่า JWT
- Secret key: ตั้งในตัวแปร environment `JWT_SECRET`
- Expiration: เริ่มต้น 7 วัน (ปรับแต่งได้ผ่าน `JWT_EXPIRES_IN`)

### การตั้งค่า CORS
- ตั้งค่า allowed origins ใน `ALLOWED_ORIGINS`
- เริ่มต้น: `http://localhost:3000`

---

## 📖 วิธีใช้งาน

### สำหรับผู้ใช้

#### 1. ลงทะเบียนและเข้าสู่ระบบ
1. ไปที่ `/register`
2. กรอกข้อมูล: ชื่อ, อีเมล, รหัสผ่าน, คณะ
3. หลังจากลงทะเบียนแล้ว ให้เข้าสู่ระบบที่ `/login`

#### 2. โพสต์สินค้า
1. คลิกปุ่ม "Post Item"
2. เลือกประเภทการโพสต์: **Exchange** หรือ **Donation**
3. กรอกรายละเอียดสินค้า:
   - ชื่อสินค้า (จำเป็น)
   - หมวดหมู่ (จำเป็น)
   - สภาพสินค้า (จำเป็น)
   - รูปภาพ (จำเป็น)
   - ต้องการแลกเปลี่ยนกับ (จำเป็นสำหรับ Exchange)
   - วันที่หมดอายุ (จำเป็น)
   - คำอธิบาย (ไม่บังคับ)
   - สถานที่รับสินค้า (ไม่บังคับ)
4. ส่งข้อมูล

#### 3. กระบวนการแลกเปลี่ยน
1. เรียกดูสินค้าบนหน้าแรก
2. คลิก "Exchange" บนสินค้าที่ต้องการ
3. กรอกแบบฟอร์มคำขอแลกเปลี่ยน
4. รอให้เจ้าของยอมรับ
5. ยอมรับคำขอแลกเปลี่ยน
6. แชทจะเปิดอัตโนมัติ
7. สร้าง QR Code เมื่อพร้อม
8. สแกน QR Code เพื่อทำการแลกเปลี่ยนให้เสร็จสมบูรณ์

#### 4. กระบวนการบริจาค
1. เรียกดูสินค้าบนหน้าแรก
2. คลิก "Request Donation" บนสินค้าบริจาค
3. กรอกข้อมูลผู้รับบริจาค:
   - ชื่อผู้รับบริจาค (จำเป็น)
   - ข้อมูลติดต่อ (จำเป็น)
   - ข้อความ (ไม่บังคับ)
4. รอให้เจ้าของยอมรับ
5. ยอมรับคำขอรับบริจาค
6. แชทจะเปิดอัตโนมัติ
7. สร้าง QR Code เมื่อพร้อม
8. สแกน QR Code เพื่อทำการบริจาคให้เสร็จสมบูรณ์

#### 5. แชท
1. แชทจะเปิดอัตโนมัติหลังจากทั้งสองฝ่ายยอมรับ
2. ส่งข้อความแบบ real-time
3. สร้าง QR Code เมื่อพร้อมทำธุรกรรมให้เสร็จสมบูรณ์
4. สแกน QR Code เพื่อยืนยันการเสร็จสมบูรณ์

#### 6. จัดการโปรไฟล์
1. ดูโพสต์ของคุณ (ที่ใช้งานและหมดอายุ)
2. ดูประวัติการแลกเปลี่ยน/บริจาค
3. แก้ไขข้อมูลโปรไฟล์
4. ลบโพสต์ (ถ้าไม่มีคำขอที่ใช้งานอยู่)

### สำหรับนักพัฒนา

#### รันในโหมดพัฒนา
```bash
# Backend พร้อม auto-reload
cd backend
npm run dev

# Frontend พร้อม hot-reload
cd frontend
npm run dev
```

#### Database Migrations
```bash
cd backend
npm run db:migrate
npm run db:migrate:donation
```

#### ทดสอบบริการอีเมล
```bash
cd backend
npm run test:email
```

---

## 📡 เอกสาร API

### Base URL
```
http://localhost:4000/api
```

### การยืนยันตัวตน
API ส่วนใหญ่ต้องการ JWT token ใน header:
```
Authorization: Bearer <token>
```

### Endpoints

#### Authentication (`/api/auth`)
| Method | Endpoint | คำอธิบาย | ต้อง Auth |
|--------|----------|-------------|---------------|
| POST | `/register` | ลงทะเบียนผู้ใช้ใหม่ | ไม่ |
| POST | `/login` | เข้าสู่ระบบ | ไม่ |
| POST | `/logout` | ออกจากระบบ | ใช่ |
| POST | `/forgot-password` | ขอรีเซ็ตรหัสผ่าน | ไม่ |
| POST | `/reset-password` | รีเซ็ตรหัสผ่าน | ไม่ |

#### Items (`/api/items`)
| Method | Endpoint | คำอธิบาย | ต้อง Auth |
|--------|----------|-------------|---------------|
| GET | `/` | ดึงสินค้าทั้งหมด | ไม่ |
| GET | `/:itemId` | ดึงสินค้าตาม ID | ไม่ |
| POST | `/` | สร้างสินค้า | ใช่ |
| PUT | `/:itemId` | อัปเดตสินค้า | ใช่ |
| DELETE | `/:itemId` | ลบสินค้า | ใช่ |

#### Exchange (`/api/exchange`)
| Method | Endpoint | คำอธิบาย | ต้อง Auth |
|--------|----------|-------------|---------------|
| POST | `/` | สร้างคำขอแลกเปลี่ยน | ใช่ |
| GET | `/my-requests` | ดึงคำขอแลกเปลี่ยนของฉัน | ใช่ |
| GET | `/:requestId` | ดึงคำขอแลกเปลี่ยน | ใช่ |
| POST | `/:requestId/accept-owner` | เจ้าของยอมรับคำขอ | ใช่ |
| POST | `/:requestId/accept-requester` | ผู้ขอยอมรับคำขอ | ใช่ |
| POST | `/:requestId/reject` | ปฏิเสธคำขอ | ใช่ |

#### Donation (`/api/donations`)
| Method | Endpoint | คำอธิบาย | ต้อง Auth |
|--------|----------|-------------|---------------|
| POST | `/` | สร้างการบริจาค | ใช่ |
| GET | `/my-donations` | ดึงการบริจาคของฉัน | ใช่ |
| GET | `/statistics` | ดึงสถิติการบริจาค | ไม่ |

#### Donation Requests (`/api/donation-requests`)
| Method | Endpoint | คำอธิบาย | ต้อง Auth |
|--------|----------|-------------|---------------|
| POST | `/` | สร้างคำขอรับบริจาค | ใช่ |
| GET | `/my-requests` | ดึงคำขอรับบริจาคของฉัน | ใช่ |
| GET | `/:requestId` | ดึงคำขอรับบริจาค | ใช่ |
| POST | `/:requestId/accept-owner` | เจ้าของยอมรับคำขอ | ใช่ |
| POST | `/:requestId/accept-requester` | ผู้ขอยอมรับคำขอ | ใช่ |
| POST | `/:requestId/reject` | ปฏิเสธคำขอ | ใช่ |

#### Chat (`/api/chats`)
| Method | Endpoint | คำอธิบาย | ต้อง Auth |
|--------|----------|-------------|---------------|
| GET | `/` | ดึงแชททั้งหมด | ใช่ |
| GET | `/:chatId` | ดึงแชทตาม ID | ใช่ |
| POST | `/` | สร้างแชท | ใช่ |
| POST | `/:chatId/messages` | ส่งข้อความ | ใช่ |
| POST | `/:chatId/accept` | ยอมรับแชท | ใช่ |
| POST | `/:chatId/decline` | ปฏิเสธแชท | ใช่ |
| POST | `/:chatId/confirm-qr` | ยืนยัน QR Code | ใช่ |

#### Profile (`/api/profile`)
| Method | Endpoint | คำอธิบาย | ต้อง Auth |
|--------|----------|-------------|---------------|
| GET | `/me` | ดึงโปรไฟล์ผู้ใช้ปัจจุบัน | ใช่ |
| PUT | `/me` | อัปเดตโปรไฟล์ | ใช่ |
| GET | `/my-items` | ดึงสินค้าของฉัน | ใช่ |
| GET | `/exchange-history` | ดึงประวัติการแลกเปลี่ยน | ใช่ |

#### Notifications (`/api/notifications`)
| Method | Endpoint | คำอธิบาย | ต้อง Auth |
|--------|----------|-------------|---------------|
| GET | `/` | ดึงการแจ้งเตือน | ใช่ |
| PUT | `/:notificationId/read` | ทำเครื่องหมายว่าอ่านแล้ว | ใช่ |
| PUT | `/read-all` | ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว | ใช่ |

#### Statistics (`/api/statistics`)
| Method | Endpoint | คำอธิบาย | ต้อง Auth |
|--------|----------|-------------|---------------|
| GET | `/` | ดึงสถิติ | ไม่ |

---

## 🗄️ โครงสร้างฐานข้อมูล

### ตารางหลัก

#### `users`
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `faculty` (TEXT)
- `email` (TEXT, Unique)
- `password_hash` (TEXT)
- `avatar_url` (TEXT)
- `created_at` (TIMESTAMPTZ)

#### `items`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users)
- `title` (TEXT)
- `category` (TEXT)
- `item_condition` (TEXT)
- `looking_for` (TEXT)
- `description` (TEXT)
- `available_until` (DATE)
- `image_url` (TEXT)
- `pickup_location` (TEXT)
- `status` (TEXT) - 'active', 'in_progress', 'exchanged', 'donated'
- `listing_type` (TEXT) - 'exchange', 'donation'
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `exchange_requests`
- `id` (UUID, Primary Key)
- `item_id` (UUID, Foreign Key → items)
- `requester_id` (UUID, Foreign Key → users)
- `message` (TEXT)
- `status` (TEXT) - 'pending', 'chatting', 'in_progress', 'completed', 'rejected'
- `owner_accepted` (BOOLEAN)
- `requester_accepted` (BOOLEAN)
- `requester_item_name` (TEXT)
- `requester_item_image_url` (TEXT)
- `requester_item_category` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `donation_requests`
- `id` (UUID, Primary Key)
- `item_id` (UUID, Foreign Key → items)
- `requester_id` (UUID, Foreign Key → users)
- `recipient_name` (TEXT)
- `recipient_contact` (TEXT)
- `message` (TEXT)
- `status` (TEXT) - 'pending', 'chatting', 'in_progress', 'completed', 'rejected'
- `owner_accepted` (BOOLEAN)
- `requester_accepted` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `chats`
- `id` (UUID, Primary Key)
- `item_id` (UUID, Foreign Key → items)
- `exchange_request_id` (UUID, Foreign Key → exchange_requests)
- `donation_request_id` (UUID, Foreign Key → donation_requests)
- `creator_id` (UUID, Foreign Key → users)
- `participant_id` (UUID, Foreign Key → users)
- `status` (TEXT) - 'pending', 'active', 'closed', 'rejected'
- `owner_accepted` (BOOLEAN)
- `requester_accepted` (BOOLEAN)
- `qr_code` (TEXT)
- `qr_confirmed` (BOOLEAN)
- `qr_confirmed_at` (TIMESTAMPTZ)
- `closed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `messages`
- `id` (UUID, Primary Key)
- `chat_id` (UUID, Foreign Key → chats)
- `sender_id` (UUID, Foreign Key → users)
- `body` (TEXT)
- `created_at` (TIMESTAMPTZ)

#### `notifications`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users)
- `title` (TEXT)
- `body` (TEXT)
- `type` (TEXT)
- `metadata` (JSONB)
- `read` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

#### `exchange_history`
- `id` (UUID, Primary Key)
- `exchange_request_id` (UUID, Foreign Key → exchange_requests)
- `item_id` (UUID, Foreign Key → items)
- `owner_id` (UUID, Foreign Key → users)
- `requester_id` (UUID, Foreign Key → users)
- `co2_reduced` (DECIMAL)
- `exchanged_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

#### `donation_history`
- `id` (UUID, Primary Key)
- `item_id` (UUID, Foreign Key → items)
- `donor_id` (UUID, Foreign Key → users)
- `recipient_id` (UUID, Foreign Key → users)
- `recipient_name` (TEXT)
- `recipient_contact` (TEXT)
- `donation_location` (TEXT)
- `message` (TEXT)
- `status` (TEXT)
- `co2_reduced` (DECIMAL)
- `donated_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

---

## 🔄 ฟีเจอร์ Real-time

### Socket.io Events

#### Client → Server
- `chat:join` - เข้าร่วมห้องแชท
- `chat:message` - ส่งข้อความ
- `chat:typing` - ตัวบ่งชี้การพิมพ์

#### Server → Client
- `item:created` - สินค้าใหม่ถูกโพสต์
- `item:updated` - สินค้าถูกอัปเดต
- `item:deleted` - สินค้าถูกลบ
- `exchange:completed` - การแลกเปลี่ยนเสร็จสมบูรณ์
- `donation:completed` - การบริจาคเสร็จสมบูรณ์
- `notification:new` - การแจ้งเตือนใหม่
- `message:new` - ข้อความใหม่ที่ได้รับ

### การอัปเดตแบบ Real-time
- รายการสินค้าอัปเดตอัตโนมัติ
- ข้อความแชทปรากฏทันที
- การแจ้งเตือนแสดงแบบ real-time
- ข้อมูลโปรไฟล์รีเฟรชอัตโนมัติ

---

## 🔒 ความปลอดภัย

### การยืนยันตัวตน
- JWT tokens พร้อมวันหมดอายุ
- การเข้ารหัสรหัสผ่านอย่างปลอดภัย (bcrypt)
- กลไกการรีเฟรช token

### การตรวจสอบข้อมูลเข้า
- express-validator สำหรับการตรวจสอบ request
- Zod สำหรับการตรวจสอบ schema
- ป้องกัน SQL injection (parameterized queries)

### การกลั่นกรองเนื้อหา
- ตรวจจับสแปม
- กรองเนื้อหาที่ไม่เหมาะสม
- ป้องกันเนื้อหาซ้ำ
- ตรวจสอบรูปภาพ

### CORS
- ตั้งค่า allowed origins
- รองรับ credentials

### Rate Limiting
- สามารถเพิ่มผ่าน middleware (แนะนำสำหรับ production)

---

## 🚀 การ Deploy

### การ Deploy Backend

#### ใช้ PM2
```bash
npm install -g pm2
cd backend
pm2 start src/composition/server.js --name sharecycle-backend
pm2 save
pm2 startup
```

#### ใช้ Docker
จากรากโปรเจกต์ (ที่มี `docker-compose.yml`):

```bash
docker compose up --build
```

รายละเอียด image แบบ multi-stage อยู่ใน `backend/Dockerfile` และ `frontend/Dockerfile` ดู `docs/ARCHITECTURE.md`

### การ Deploy Frontend

#### Build สำหรับ Production
```bash
cd frontend
npm run build
```

#### ใช้ Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/frontend/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Environment Variables สำหรับ Production
- ตั้ง `NODE_ENV=production`
- ใช้ `JWT_SECRET` ที่ปลอดภัย
- ตั้งค่าฐานข้อมูล production
- ตั้งค่า SSL/TLS certificates
- ตั้งค่าบริการอีเมล production

---

## 🤝 การมีส่วนร่วม

### Development Workflow
1. Fork repository
2. สร้าง feature branch (`git checkout -b feature/amazing-feature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add amazing feature'`)
4. Push ไปยัง branch (`git push origin feature/amazing-feature`)
5. เปิด Pull Request

### Code Style
- ปฏิบัติตามกฎ ESLint
- ใช้ชื่อตัวแปรที่มีความหมาย
- เพิ่มความคิดเห็นสำหรับ logic ที่ซับซ้อน
- เขียน commit message ที่ชัดเจน

### Testing
- ทดสอบฟีเจอร์ทั้งหมดก่อนส่ง PR
- ทดสอบบนเบราว์เซอร์ต่างๆ
- ทดสอบฟีเจอร์ real-time
- ทดสอบฟังก์ชันอีเมล

---

## 📝 สัญญาอนุญาต

โปรเจคนี้เป็น **PRIVATE** และเป็นกรรมสิทธิ์ สงวนลิขสิทธิ์ทั้งหมด

---

## 👥 ทีม

**CMU ShareCycle Team G4**

---

## 📞 การสนับสนุน

สำหรับปัญหา คำถาม หรือการมีส่วนร่วม:
- เปิด issue บน GitHub
- ติดต่อทีมพัฒนา

---

## 🙏 คำขอบคุณ

- ชุมชน CMU (มหาวิทยาลัยเชียงใหม่)
- ผู้มีส่วนร่วมและผู้ทดสอบทั้งหมด
- ไลบรารีและเครื่องมือ open source ที่ใช้

---

<div align="center">

**สร้างด้วย ❤️ สำหรับชุมชน CMU**

🌱 **ส่งเสริมความยั่งยืนผ่านการแบ่งปัน** 🌱

</div>
