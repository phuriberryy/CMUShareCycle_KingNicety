# 📖 คำแนะนำการรันโปรเจค CMU ShareCycle

## 🔧 การตั้งค่าเบื้องต้น (ทำครั้งเดียวเท่านั้น)

### 1. ตั้งค่า PostgreSQL Database

```bash
# สร้าง database
createdb sharecycle

# หรือใช้ psql
psql postgres
CREATE DATABASE sharecycle;
\q
```

### 2. ตั้งค่า Environment Variables

#### Backend (.env)
สร้างไฟล์ `backend/.env`:
```env
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/sharecycle
JWT_SECRET=cmu-sharecycle-secret-key-2025-min-16-chars
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@cmu.ac.th
EMAIL_PASS=your-app-password
EMAIL_FROM=CMU ShareCycle <your-email@cmu.ac.th>
USE_MOCK_EMAIL=true
```

**หมายเหตุ:** 
- แทนที่ `YOUR_USERNAME` ด้วย username ของคุณ (เช่น `pmykingg`)
- ถ้าไม่มี email setup จริง ให้ตั้ง `USE_MOCK_EMAIL=true`

#### Frontend (.env)
สร้างไฟล์ `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:4000/api
```

### 3. ติดตั้ง Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. รัน Database Migrations

```bash
cd backend

# รัน schema หลัก
npm run db:migrate

# รัน donation requests migration
npm run db:migrate:donation

# รัน migrations อื่นๆ (ถ้ามี)
psql sharecycle -f sql/migrate_donation.sql
psql sharecycle -f sql/migrate_donation_recipient_info.sql
psql sharecycle -f sql/migrate_message_read_status.sql
psql sharecycle -f sql/migrate_requester_item.sql
```

## 🚀 วิธีรันโปรเจค

### วิธีที่ 1: ใช้ Start Script (แนะนำ)

```bash
cd /Users/pmykingg/Documents/MVG/hackkathon2025byg4
chmod +x start.sh
./start.sh
```

สคริปต์จะ:
- ตรวจสอบ .env files
- ติดตั้ง dependencies อัตโนมัติ
- รัน backend และ frontend พร้อมกัน

**กด Ctrl+C เพื่อหยุดการทำงาน**

### วิธีที่ 2: รันแยก Terminal

#### Terminal 1 - Backend:
```bash
cd /Users/pmykingg/Documents/MVG/hackkathon2025byg4/backend
npm run dev
```

Backend จะรันที่: http://localhost:4000

#### Terminal 2 - Frontend:
```bash
cd /Users/pmykingg/Documents/MVG/hackkathon2025byg4/frontend
npm start
```

Frontend จะรันที่: http://localhost:3000

## 📊 ตรวจสอบ Logs

### ดู Backend Logs:
```bash
tail -f /Users/pmykingg/Documents/MVG/hackkathon2025byg4/backend.log
```

### ดู Frontend Logs:
```bash
tail -f /Users/pmykingg/Documents/MVG/hackkathon2025byg4/frontend.log
```

## 🔍 คำสั่งที่มีประโยชน์

### Backend Scripts:
```bash
cd backend

# รัน database migration
npm run db:migrate

# รัน donation migration
npm run db:migrate:donation

# ทดสอบ database connection
npm run db:test

# Setup database
npm run db:setup

# Kill process บน port
npm run kill:port

# ทดสอบ email
npm run test:email
```

### Frontend Scripts:
```bash
cd frontend

# รัน development server
npm start

# Build production
npm run build

# Run tests
npm test
```

## 🛑 หยุดการทำงาน

### ถ้ารันด้วย start.sh:
กด `Ctrl+C` ใน terminal ที่รันสคริปต์

### ถ้ารันแยก Terminal:
- กด `Ctrl+C` ในแต่ละ terminal
- หรือ kill process:
```bash
# Kill backend (port 4000)
lsof -ti:4000 | xargs kill -9

# Kill frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

## ⚠️ ปัญหาที่พบบ่อย

### Port ถูกใช้งานแล้ว
```bash
# ตรวจสอบว่า port ถูกใช้งานหรือไม่
lsof -i :4000
lsof -i :3000

# Kill process บน port
lsof -ti:4000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Database connection error
- ตรวจสอบว่า PostgreSQL กำลังรัน: `pg_isready`
- ตรวจสอบ DATABASE_URL ใน `backend/.env`
- ตรวจสอบว่า database `sharecycle` ถูกสร้างแล้ว

### Module not found
```bash
# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install
```

## 📝 หมายเหตุ

- Backend รันที่ port 4000
- Frontend รันที่ port 3000
- ต้องมี PostgreSQL ทำงานอยู่
- Frontend จะเปิด browser อัตโนมัติที่ http://localhost:3000



