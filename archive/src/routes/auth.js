const express = require('express');
const router = express.Router();

// สร้าง controller instance จะทำใน server.js
let authController;

// ตั้งค่า controller
function setController(controller) {
    authController = controller;
    console.log('AuthController set in auth.route.js:', !!authController);
}

// Debugging middleware for auth router
router.use((req, res, next) => {
    console.log(`Auth Router: ${req.method} ${req.url}`);
    next();
});

// เข้าร่วมห้องแชท
router.post('/join', async (req, res) => {
    if (!authController) {
        return res.status(500).json({
            success: false,
            message: 'Server not initialized'
        });
    }
    
    await authController.joinRoom(req, res);
});

// สร้างห้องแชทใหม่ (default room)
router.post('/create-room', async (req, res) => {
    if (!authController) {
        return res.status(500).json({
            success: false,
            message: 'Server not initialized'
        });
    }
    
    await authController.createDefaultRoom(req, res);
});

// ออกจากห้อง
router.post('/leave', async (req, res) => {
    if (!authController) {
        return res.status(500).json({
            success: false,
            message: 'Server not initialized'
        });
    }
    
    await authController.leaveRoom(req, res);
});

// ตรวจสอบสถานะห้อง
router.get('/room/:roomId/status', async (req, res) => {
    if (!authController) {
        return res.status(500).json({
            success: false,
            message: 'Server not initialized'
        });
    }
    
    await authController.checkRoomStatus(req, res);
});

module.exports = { router, setController };

