# Web Bán Hàng (Production Ready)

Hệ thống bán hàng, quản lý kho, và cộng đồng mua bán được xây dựng với công nghệ hiện đại, bảo mật cao và sẵn sàng cho môi trường Production.

## 🚀 Tech Stack

- **Backend**: Node.js, Express, MySQL, Redis, Socket.IO
- **Frontend**: React, Vite, TailwindCSS
- **Database**: MySQL 8.0
- **Cache**: Redis
- **Container**: Docker, Docker Compose
- **Server**: Nginx (Reverse Proxy)

## ✨ Tính năng chính

- **Authentication**: JWT Access/Refresh Token Rotation, Secure Cookies, Session Management (Max 5 devices), Logout All.
- **Real-time**: Socket.IO cho thông báo, chat.
- **Database**: Tự động migration khi khởi động.
- **Security**: Rate Limiting, Helmet (Headers), CORS, CSRF Protection, Input Validation.
- **Monitoring**: Logging (Winston), Health Checks.

## 🛠 Cài đặt và Chạy (Docker - Khuyên dùng)

Cách đơn giản nhất để chạy toàn bộ hệ thống là sử dụng Docker Compose.

### 1. Clone Repo
```bash
git clone https://github.com/username/repo.git
cd webbanhang
```

### 2. Cấu hình biến môi trường
Copy file mẫu và chỉnh sửa nếu cần:
```bash
cp .env.example .env
```
*Lưu ý: Mặc định cấu hình trong `.env.example` đã tương thích với `docker-compose.yml`.*

### 3. Khởi chạy
```bash
docker-compose up -d --build
```
Hệ thống sẽ tự động:
- Build backend và frontend.
- Khởi tạo MySQL và Redis.
- Chạy script migration để tạo bảng dữ liệu.
- Backend chạy tại port `3000`.
- Frontend chạy tại port `80` (truy cập `http://localhost`).

### 4. Truy cập
- Web App: [http://localhost](http://localhost)
- API Health Check: [http://localhost/api/health](http://localhost/api/health)

## 💻 Cài đặt và Chạy (Local - Backend/Frontend riêng)

Nếu muốn chạy dev mode hoặc không dùng Docker:

### Backend
1. `cd backend`
2. `cp .env.example .env` (Chỉnh DB_HOST thành localhost)
3. `npm install`
4. `npm run dev`

### Frontend
1. `cd frontend`
2. `cp .env.example .env`
3. `npm install`
4. `npm run dev`

## 📂 Cấu trúc thư mục

```
root/
├── backend/            # Source code Node.js
│   ├── src/
│   │   ├── modules/    # Module based structure
│   │   ├── scripts/    # Migration & Utilities
│   │   └── ...
│   ├── Dockerfile
│   └── ...
├── frontend/           # Source code React
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf      # Config Nginx cho Frontend container
│   └── ...
├── docker-compose.yml  # Orchestration
├── .env.example        # Mẫu biến môi trường
└── README.md
```

## 🔒 Security & Production Notes

- **JWT Rotation**: Refresh token có thời hạn 30 ngày, tự động xoay vòng. Access token 15 phút.
- **Cookies**: Sử dụng `HttpOnly`, `SameSite=Strict` (trong Production).
- **Session Limit**: Giới hạn 5 thiết bị/user. Tự động thu hồi session cũ nhất.
- **CORS**: Chỉ cho phép domain frontend gọi API.

## 🤝 Đóng góp
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License
[MIT](https://choosealicense.com/licenses/mit/)
