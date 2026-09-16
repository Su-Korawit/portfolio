const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = require('./config/database');

// Controllers
const AuthController = require('./src/controllers/AuthController');
const authController = new AuthController(db);

// Routes
const authRoutes = require('./src/routes/auth.js'); // เปลี่ยนชื่อไฟล์เป็น auth.js ตามโครงสร้างโปรเจกต์
authRoutes.setController(authController);

// Debugging middleware for incoming requests
app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    next();
});

app.use('/api/auth', authRoutes.router);

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

