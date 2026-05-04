# 📧 ตั้งค่าส่งอีเมลจริง (ส่งไป @cmu.ac.th)

แอปจะส่งอีเมลแจ้งเตือนจริงเมื่อมีคำขอแลกเปลี่ยน/บริจาค, รีเซ็ตรหัสผ่าน ฯลฯ

## วิธีที่ 1: Gmail SMTP (แนะนำ – ส่งจาก @gmail ไป @cmu.ac.th)

- ใช้บัญชี **Gmail** เป็นผู้ส่ง อีเมลแจ้งเตือนไปถึง **Outlook @cmu.ac.th** ได้เลย
- ต้องใช้ **Gmail App Password** (ไม่ใช้รหัสผ่านปกติ)
- ถ้ามีทั้ง Gmail และ Resend ตั้งค่าไว้ ระบบจะใช้ **Gmail ก่อน**

### ขั้นตอน (Gmail)

1. **สร้าง Gmail App Password**
   - ไปที่ https://myaccount.google.com/ → Security → 2-Step Verification (ต้องเปิดก่อน)
   - ไปที่ App passwords → เลือก Mail, Other (ชื่อ: CMU ShareCycle) → Generate
   - คัดลอกรหัส 16 ตัว (ไม่ใช้รหัสผ่านปกติ)

2. **ตั้งค่าในโปรเจกต์**
   ```bash
   cd backend
   npm run email:gmail
   ```
   ใส่ Gmail (เช่น yourname@gmail.com) และ App Password ที่ได้

3. **ทดสอบส่งไป @cmu.ac.th**
   ```bash
   npm run test:email your_email@cmu.ac.th
   ```
   เปิด Inbox / Junk ของอีเมล @cmu.ac.th

4. **รีสตาร์ท backend** แล้วแจ้งเตือนจะส่งจาก Gmail ไป @cmu จริง

---

## วิธีที่ 2: Resend (ทางเลือก – ต้อง Verify Domain เพื่อส่งไป @cmu.ac.th)

- ใช้ API Key จาก resend.com (ส่งไป @cmu.ac.th ได้หลัง verify domain)

---

### ขั้นที่ 1: สมัคร Resend (ฟรี)

1. เปิดเบราว์เซอร์ไปที่ **https://resend.com**
2. คลิก **Sign Up** (มุมขวาบน)
3. สมัครด้วยอีเมล หรือ **Sign up with Google** / **GitHub** ก็ได้
4. ยืนยันอีเมล (ถ้าสมัครด้วยอีเมล) ตามลิงก์ที่ Resend ส่งมา
5. เข้าสู่ระบบแล้วจะเห็น **Dashboard**

**Free tier:** 3,000 ฉบับ/เดือน – เพียงพอสำหรับแจ้งเตือนในแอป

---

### ขั้นที่ 2: สร้าง API Key

1. ใน Dashboard ด้านซ้ายคลิก **API Keys** (หรือไปที่ **https://resend.com/api-keys**)
2. คลิกปุ่ม **Create API Key**
3. ตั้งชื่อ key (เช่น `CMU ShareCycle` หรือ `Production`)
4. เลือก Permission: **Sending access** (ส่งอีเมลได้อย่างเดียว)
5. คลิก **Add**
6. **สำคัญ:** Resend จะแสดง API Key แค่ครั้งเดียว (ขึ้นต้นด้วย `re_` เช่น `re_123abc...`)
   - คลิก **Copy** แล้วเก็บไว้ในที่ปลอดภัย
   - ถ้าไม่ copy ตอนนี้ จะต้องสร้าง key ใหม่

ตัวอย่างรูปแบบ key: `re_8aB3cD5fG7hJ9kL2mN4pQ6rS8tU0vWxYz`

---

### ขั้นที่ 3: ตั้งค่าในโปรเจกต์ (รันบนเครื่องตัวเอง)

**วิธี A – ใช้สคริปต์ (แนะนำ)**

1. เปิด Terminal
2. ไปที่โฟลเดอร์ backend ของโปรเจกต์:

   ```bash
   cd backend
   ```

   (รันจากรากโปรเจกต์ — โฟลเดอร์ที่มี `backend/` และ `frontend/`)

3. รันคำสั่ง:

   ```bash
   npm run email:resend
   ```

4. เมื่อถาม **Resend API Key (re_...):** วาง key ที่ copy ไว้ (จากขั้นที่ 2) แล้วกด Enter
5. สคริปต์จะเขียน `RESEND_API_KEY` ลงไฟล์ `backend/.env` ให้อัตโนมัติ

**วิธี B – แก้ไข .env เอง**

1. เปิดไฟล์ `backend/.env` (ถ้าไม่มี ให้ copy จาก `backend/.env.example` แล้วเปลี่ยนชื่อ)
2. เพิ่มหรือแก้บรรทัดนี้ (ใช้ key จริงที่ได้จาก Resend):

   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. บันทึกไฟล์

**หมายเหตุ:** ถ้าใน `.env` มี `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` อยู่แล้ว และคุณต้องการใช้ Resend เป็นหลัก สคริปต์ `email:resend` จะลบกลุ่ม SMTP ออกและใส่เฉพาะ `RESEND_API_KEY` – โค้ดจะเลือกใช้ Resend ก่อนเสมอเมื่อมี `RESEND_API_KEY`

---

### ⚠️ สำคัญ: ข้อจำกัดของ Resend (ทำไมส่งไป @cmu.ac.th ไม่ได้ตอนนี้)

**ถ้ายังไม่เคย Verify Domain ใน Resend:**
- Resend จะให้ส่งได้เฉพาะไปยัง **อีเมลที่ใช้สมัคร Resend** (เช่น Gmail ที่ใช้ Sign up)
- ถ้าส่งไปอีเมลอื่น (เช่น xxx@cmu.ac.th) จะได้ error: *"You can only send testing emails to your own email address"*

**ถ้าต้องการให้ส่งไป Outlook @cmu.ac.th ได้จริง** ต้องทำ **Verify Domain** (ขั้นที่ 7 ด้านล่าง) แล้วตั้ง `EMAIL_FROM` เป็นอีเมลบนโดเมนที่ verify แล้ว

---

### ขั้นที่ 4: ทดสอบส่งอีเมล

**แบบที่ 1 – ทดสอบเร็ว (ส่งไปอีเมลที่สมัคร Resend)**

ถ้าคุณสมัคร Resend ด้วย Gmail (เช่น kingphurichayaaaaa@gmail.com) ให้ทดสอบส่งไปอีเมลนั้นก่อน:

```bash
npm run test:email kingphurichayaaaaa@gmail.com
```

(ใส่ **อีเมลที่ใช้สมัคร Resend** ของคุณเท่านั้น ถ้ายังไม่ได้ verify domain)

ถ้าสำเร็จ = ระบบส่งเมลทำงาน แค่ยังส่งไป @cmu.ac.th ไม่ได้จนกว่าจะ verify domain

**แบบที่ 2 – หลัง Verify Domain แล้ว (ส่งไป @cmu.ac.th ได้)**

```bash
npm run test:email your_email@cmu.ac.th
```

ถ้าสำเร็จ จะเห็นข้อความ "✅ ส่งอีเมลสำเร็จ!" แล้วไปเช็ค Inbox / Junk ของอีเมลนั้น

---

### ขั้นที่ 5: รีสตาร์ท Backend

1. ถ้ารัน backend อยู่ (เช่น `npm start` หรือ `bash scripts/start-backend.sh`) ให้กด **Ctrl+C** หยุด
2. รันใหม่:

   ```bash
   npm start
   ```
   หรือจาก root โปรเจกต์: `bash scripts/start-backend.sh`

3. ตอนเริ่มต้นควรเห็นข้อความประมาณ:
   - `✅ Email Service: Resend (ส่งอีเมลจริงไปยัง @cmu.ac.th และอื่นๆ)`
   - `ใช้ RESEND_API_KEY จาก .env`

หลังขั้นนี้ แจ้งเตือนในแอป (คำขอแลกเปลี่ยน, คำขอบริจาค, รีเซ็ตรหัสผ่าน ฯลฯ) จะส่งไปยัง Outlook @cmu จริงผ่าน Resend

---

### ขั้นที่ 6: ตั้งค่าบน Production (Render – backend ที่ deploy แล้ว)

ถ้า backend รันบน **Render** (หรือโฮสต์อื่นที่ใช้ Environment Variables):

1. เข้า **https://dashboard.render.com** แล้วล็อกอิน
2. เลือก **Web Service** ที่เป็น backend ของ CMU ShareCycle
3. ไปที่แท็บ **Environment** (เมนูซ้าย)
4. คลิก **Add Environment Variable**
5. ตั้งค่า:
   - **Key:** `RESEND_API_KEY`
   - **Value:** วาง API Key จาก Resend (ที่ขึ้นต้น `re_...`)
6. กด **Save Changes**
7. Render จะ **redeploy** backend ให้เอง – รอ deploy เสร็จ

หลัง deploy เสร็จ backend บน Render จะใช้ Resend ส่งอีเมลจริงไป @cmu.ac.th ได้เหมือนบนเครื่องตัวเอง

**หมายเหตุ:** Supabase ใช้เป็น Database; การส่งอีเมลทำที่ **backend (Node.js)** ที่รันบน Render ดังนั้นให้ใส่ `RESEND_API_KEY` ที่ **Render** (ที่รัน backend) ไม่ต้องตั้งใน Supabase Dashboard (ยกเว้นจะรัน backend ที่อื่นและอยากเก็บ key ใน Supabase Vault – โปรเจกต์นี้ใช้ .env / Render env ก็เพียงพอ)

---

### ขั้นที่ 7: ให้ส่งไป @cmu.ac.th ได้ (Verify Domain ใน Resend)

**ถ้าต้องการให้แอปส่งเมลไป Outlook @cmu.ac.th ได้** Resend ต้องการให้คุณ **Verify Domain** ก่อน (ไม่ใช่แค่ทดสอบส่งไปอีเมลตัวเอง)

1. เข้า **https://resend.com/domains** (หรือ Dashboard → **Domains** → **Add Domain**)
2. กด **Add Domain** แล้วใส่โดเมนที่คุณเป็นเจ้าของ เช่น
   - ถ้ามีเว็บโปรเจกต์อยู่แล้ว (เช่น `myproject.github.io`) ใช้โดเมนนั้นไม่ได้โดยตรง – ต้องมีโดเมนแบบมี DNS จัดการได้ (เช่น `cmusharecycle.com` หรือ subdomain ที่ชี้มาที่คุณ)
   - หรือใช้ **โดเมนฟรี** ที่ให้จัดการ DNS ได้ (เช่น Freenom, หรือ subdomain จากบริการที่ใช้อยู่)
3. Resend จะแสดง **DNS records** (แบบ TXT และ/หรือ CNAME) ให้คุณไปเพิ่มที่ผู้ให้บริการโดเมน (ที่จัดการ DNS)
4. เพิ่ม records ตามที่ Resend บอก แล้วรอสักครู่ กด **Verify** ใน Resend
5. หลัง Verify ผ่าน แล้วในโปรเจกต์ตั้งค่า **ผู้ส่ง** เป็นอีเมลบนโดเมนนั้น ใน `backend/.env` (หรือบน Render):

   ```env
   EMAIL_FROM=noreply@yourdomain.com
   ```
   แทน `yourdomain.com` ด้วยโดเมนที่ verify แล้ว (เช่น `cmusharecycle.com`)

6. รีสตาร์ท backend (หรือ redeploy บน Render)

หลังขั้นนี้ จะส่งไป **อีเมลใดก็ได้** รวมถึง **xxx@cmu.ac.th**

**ถ้าไม่มีโดเมนของตัวเอง:** ใช้ **วิธีที่ 2 (Outlook SMTP)** ส่งจากบัญชี @cmu.ac.th โดยตรง – ไม่ต้อง verify domain (แค่สร้าง App Password)

---

### สรุปลำดับทำ (Resend – ทางที่ 2)

| ลำดับ | ทำอะไร |
|-------|--------|
| 1 | สมัคร Resend ที่ resend.com |
| 2 | สร้าง API Key ใน Resend → Copy key (re_...) |
| 3 | ในโปรเจกต์: `cd backend` แล้ว `npm run email:resend` ใส่ key (หรือเขียน `RESEND_API_KEY=re_...` ใน `.env`) |
| 4 | ทดสอบ: `npm run test:email your_email@cmu.ac.th` |
| 5 | รีสตาร์ท backend |
| 6 | บน Render: เพิ่ม Environment Variable `RESEND_API_KEY` แล้ว Save (redeploy อัตโนมัติ) |

---

## วิธีที่ 3: Outlook @cmu.ac.th (SMTP)

ส่งจากบัญชี Outlook @cmu.ac.th โดยตรง (ต้องใช้ App Password)

1. สร้าง App Password ของบัญชี Microsoft @cmu.ac.th:
   - [account.microsoft.com](https://account.microsoft.com) → Security → Advanced security options
   - App passwords → Create a new app password
   - ใช้รหัสที่ได้แทนรหัสผ่านปกติ

2. ตั้งค่าใน `backend/.env`:

   ```env
   EMAIL_HOST=smtp.office365.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@cmu.ac.th
   EMAIL_PASS=your-16-char-app-password
   EMAIL_FROM=your_email@cmu.ac.th
   ```

3. **อย่า** ตั้ง `USE_MOCK_EMAIL=true` (ถ้ามีให้ลบหรือตั้งเป็น false)

4. ทดสอบ: `npm run test:email your_email@cmu.ac.th`

5. รีสตาร์ท backend

---

## เมลไม่ส่งบน Render – ตรวจเช็ค

1. **ดู Logs บน Render**
   - เข้า Dashboard → Web Service → **Logs**
   - ตอนสตาร์ทต้องเห็นอย่างใดอย่างหนึ่ง:
     - `✅ Email Service: SMTP (Gmail → ส่งไป @cmu.ac.th ได้)` และ `Host: smtp.gmail.com Port: 587 User: xx***@gmail.com`
     - หรือ `❌ Email server connection failed:` ตามด้วยข้อความ error
   - ถ้าเห็น `MOCK MODE` = ตัวแปรอีเมลยังไม่ถูกอ่าน (ตรวจสอบ Key ตรงกับ `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` และไม่มีเว้นวรรค/ตัวสะกดผิด)

2. **ค่า Environment Variables ต้องตรง**
   - `EMAIL_HOST` = `smtp.gmail.com` (ตัวเล็ก ไม่มีช่องว่าง)
   - `EMAIL_PORT` = `587`
   - `EMAIL_USER` = อีเมล Gmail เต็ม (เช่น yourname@gmail.com)
   - `EMAIL_FROM` = อีเมลเดียวกับ EMAIL_USER
   - `EMAIL_PASS` = **Gmail App Password 16 ตัว** (ไม่ใช้รหัสผ่านเข้า Gmail ปกติ)  
     สร้างได้ที่ https://myaccount.google.com/apppasswords (ต้องเปิด 2-Step Verification ก่อน)

3. **ลบ RESEND_API_KEY ถ้าจะใช้แค่ Gmail**
   - ถ้ามีทั้ง `RESEND_API_KEY` และตัวแปร Gmail ระบบจะใช้ **Gmail ก่อน** แล้ว (โค้ดอัปเดตแล้ว)
   - ถ้ายังไม่ส่ง ให้ลองลบ `RESEND_API_KEY` ออกจาก Environment แล้วกด Save (ให้ Render redeploy)

4. **หลังแก้ env แล้ว**
   - กด **Save Changes** ใน Environment → Render จะ redeploy เอง
   - รอ deploy เสร็จ แล้วดู Logs อีกครั้งว่าขึ้น `✅ Email Service: SMTP` หรือยัง

---

## บน Production (Render)

- **Gmail SMTP:** ใส่ `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=587`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` (Gmail) ใน Environment Variables
- **Outlook SMTP:** ใส่ `EMAIL_HOST=smtp.office365.com`, `EMAIL_PORT=587`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` (@cmu.ac.th) ใน Environment Variables
- **Resend:** ใส่ `RESEND_API_KEY` (ใช้เมื่อไม่มี SMTP)
