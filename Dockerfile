# ใช้ Node.js image เป็นฐาน
FROM node:18-alpine

# กำหนด directory สำหรับการทำงาน
WORKDIR /app

# คัดลอกไฟล์ package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอกโค้ดทั้งหมดของแอป
COPY . .

# สร้างแอปพลิเคชัน
RUN npm run build

# เปิดพอร์ต 3000 สำหรับเชื่อมต่อ
EXPOSE 3000

# คำสั่งเพื่อรันแอปพลิเคชัน
CMD ["npm", "run", "start:prod"]
