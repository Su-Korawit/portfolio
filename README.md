# TalkAlways

> "ความเงียบระหว่างสัญญาณ คือที่ที่เรายังได้ยินกัน"

TalkAlways เป็นแพลตฟอร์มแชทส่วนตัวแบบ minimal ที่เน้นความเป็นส่วนตัวและความเรียบง่าย สร้างขึ้นเพื่อเป็นพื้นที่สนทนาชั่วคราวสำหรับคนสองคนหรือกลุ่มเล็กๆ

## ✨ Features

- 🔒 **Privacy-First**: ไม่เก็บข้อมูลส่วนตัว เข้าถึงได้ด้วยรหัสผ่านเท่านั้น
- 💬 **Real-time Chat**: สนทนาแบบ real-time ด้วย Socket.io
- 📱 **Mobile-First Design**: ออกแบบให้ใช้งานบนมือถือได้อย่างสะดวก
- 🎨 **Minimal UI**: ดิไซน์เรียบง่าย เน้นการใช้งาน
- 💳 **Premium Rooms**: ระบบชำระเงินสำหรับห้องแชทส่วนตัว

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 หรือสูงกว่า)
- npm หรือ yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/talkalways.git
cd talkalways

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

สร้างไฟล์ `.env` และตั้งค่าตัวแปรต่อไปนี้:

```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/talkalways.db
JWT_SECRET=your-super-secret-jwt-key
DEFAULT_ROOM_PASSWORD=talkalways2024
```

## 📁 Project Structure

```
talkalways/
├── public/                 # Static files
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side JavaScript
│   └── images/            # Images and assets
├── src/                   # Source code
│   ├── controllers/       # Route controllers
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   └── middleware/       # Express middleware
├── config/               # Configuration files
├── data/                 # Database files
└── server.js            # Main server file
```

## 🛠 Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Database**: SQLite
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Payment**: Stripe (planned)

## 📝 API Endpoints

### Authentication
- `POST /api/auth/join` - เข้าร่วมห้องแชท
- `POST /api/auth/create-room` - สร้างห้องแชทใหม่ (premium)

### Chat
- `GET /api/chat/messages` - ดึงข้อความในห้อง
- `POST /api/chat/message` - ส่งข้อความ

### Payment
- `POST /api/payment/create-session` - สร้าง payment session
- `POST /api/payment/webhook` - Stripe webhook

## 🔧 Development

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests (when available)
npm test
```

## 🚀 Deployment

### Using Docker

```bash
# Build image
docker build -t talkalways .

# Run container
docker run -p 3000:3000 talkalways
```

### Using Render/Fly.io

1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables
4. Deploy

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Socket.io team for real-time communication
- Express.js community
- All contributors and users

---

**TalkAlways** - for the conversations that never stop.
