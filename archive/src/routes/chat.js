const express = require('express');
const router = express.Router();

// สร้าง controller instance จะทำใน server.js
let chatController;

// ตั้งค่า controller
function setController(controller) {
    chatController = controller;
}

// ดึงข้อความในห้อง
router.get('/room/:roomId/messages', async (req, res) => {
    if (!chatController) {
        return res.status(500).json({
            success: false,
            message: 'Server not initialized'
        });
    }
    
    await chatController.getMessages(req, res);
});

// ส่งข้อความ (HTTP fallback)
router.post('/message', async (req, res) => {
    if (!chatController) {
        return res.status(500).json({
            success: false,
            message: 'Server not initialized'
        });
    }
    
    await chatController.sendMessage(req, res);
});

// ดึงรายชื่อผู้ใช้ในห้อง
router.get('/room/:roomId/users', async (req, res) => {
    if (!chatController) {
        return res.status(500).json({
            success: false,
            message: 'Server not initialized'
        });
    }
    
    await chatController.getRoomUsers(req, res);
});

// ค้นหาข้อความ
router.get('/room/:roomId/search', async (req, res) => {
    if (!chatController) {
        return res.status(500).json({
            success: false,
            message: 'Server not initialized'
        });
    }
    
    await chatController.searchMessages(req, res);
});

// ลบข้อความ
router.delete('/message/:messageId', async (req, res) => {
    if (!chatController) {
        return res.status(500).json({
            success: false,
            message: 'Server not initialized'
        });
    }
    
    await chatController.deleteMessage(req, res);
});

// ดึงสถิติห้อง
router.get('/room/:roomId/stats', async (req, res) => {
    if (!chatController) {
        return res.status(500).json({
            success: false,
            message: 'Server not initialized'
        });
    }
    
    await chatController.getRoomStats(req, res);
});

module.exports = { router, setController };
