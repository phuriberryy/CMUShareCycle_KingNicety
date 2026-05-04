#!/usr/bin/env bash
# CMU ShareCycle - Start Backend Only
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(cd "$SCRIPT_DIR/.." && pwd)" || exit 1

echo "🔵 กำลังเริ่ม Backend..."
echo ""

# ตรวจสอบว่า backend/.env มีอยู่หรือไม่
if [ ! -f "backend/.env" ]; then
    echo "⚠️  ไม่พบไฟล์ backend/.env"
    echo "📝 กำลังสร้างไฟล์ backend/.env..."
    cat > backend/.env << EOF
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sharecycle
JWT_SECRET=cmu-sharecycle-secret-key-2025-min-16-chars
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=test@cmu.ac.th
EMAIL_PASS=test-password
EMAIL_FROM=CMU ShareCycle <test@cmu.ac.th>
EOF
    echo "✅ สร้างไฟล์ backend/.env สำเร็จ"
    echo "⚠️  กรุณาแก้ไข DATABASE_URL และ EMAIL settings ใน backend/.env"
    echo ""
fi

# ตรวจสอบว่า dependencies ติดตั้งแล้วหรือยัง
if [ ! -d "backend/node_modules" ]; then
    echo "📦 กำลังติดตั้ง dependencies..."
    cd backend
    npm install
    cd ..
    echo ""
fi

# รัน Backend
echo "🚀 กำลังรัน Backend ที่ http://localhost:4000"
echo "⏹️  กด Ctrl+C เพื่อหยุด"
echo ""

cd backend
npm run dev






