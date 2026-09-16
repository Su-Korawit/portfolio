const Message = require('../models/Message');
const User = require('../models/User');
const Room = require('../models/Room');

class ChatController {
    constructor(db) {
        this.messageModel = new Message(db);
        this.userModel = new User(db);
        this.roomModel = new Room(db);
    }

    // ดึงข้อความในห้อง
    async getMessages(req, res) {
        try {
            const { roomId } = req.params;
            const { limit = 50, offset = 0 } = req.query;

            // ตรวจสอบว่าห้องมีอยู่จริง
            const room = await this.roomModel.getRoom(roomId);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบห้องแชทนี้'
                });
            }

            // ตรวจสอบว่าห้องหมดอายุหรือไม่
            const now = new Date();
            const expiresAt = new Date(room.expires_at);
            
            if (now > expiresAt) {
                return res.status(410).json({
                    success: false,
                    message: 'ห้องแชทนี้หมดอายุแล้ว'
                });
            }

            const messages = await this.messageModel.getMessages(
                roomId, 
                parseInt(limit), 
                parseInt(offset)
            );

            res.json({
                success: true,
                data: {
                    messages,
                    hasMore: messages.length === parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error getting messages:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อความ'
            });
        }
    }

    // ส่งข้อความ (ผ่าน HTTP API - สำหรับ fallback)
    async sendMessage(req, res) {
        try {
            const { roomId, userId, message } = req.body;

            if (!roomId || !userId || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
                });
            }

            // ตรวจสอบความยาวข้อความ
            if (message.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อความไม่สามารถเป็นค่าว่างได้'
                });
            }

            if (message.length > 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อความยาวเกินไป (สูงสุด 1000 ตัวอักษร)'
                });
            }

            // ตรวจสอบผู้ใช้
            const user = await this.userModel.getUser(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบผู้ใช้นี้'
                });
            }

            if (user.roomId !== roomId) {
                return res.status(403).json({
                    success: false,
                    message: 'คุณไม่มีสิทธิ์ส่งข้อความในห้องนี้'
                });
            }

            // บันทึกข้อความ
            const savedMessage = await this.messageModel.create(
                roomId, 
                userId, 
                user.username, 
                message.trim()
            );

            res.json({
                success: true,
                message: 'ส่งข้อความสำเร็จ',
                data: savedMessage
            });

        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการส่งข้อความ'
            });
        }
    }

    // ดึงรายชื่อผู้ใช้ในห้อง
    async getRoomUsers(req, res) {
        try {
            const { roomId } = req.params;
            const { onlineOnly = false } = req.query;

            // ตรวจสอบว่าห้องมีอยู่จริง
            const room = await this.roomModel.getRoom(roomId);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบห้องแชทนี้'
                });
            }

            const users = await this.userModel.getRoomUsers(roomId, onlineOnly === 'true');

            res.json({
                success: true,
                data: {
                    users,
                    count: users.length
                }
            });

        } catch (error) {
            console.error('Error getting room users:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงรายชื่อผู้ใช้'
            });
        }
    }

    // ค้นหาข้อความ
    async searchMessages(req, res) {
        try {
            const { roomId } = req.params;
            const { q: searchTerm, limit = 20 } = req.query;

            if (!searchTerm || searchTerm.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'คำค้นหาต้องมีความยาวอย่างน้อย 2 ตัวอักษร'
                });
            }

            // ตรวจสอบว่าห้องมีอยู่จริง
            const room = await this.roomModel.getRoom(roomId);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบห้องแชทนี้'
                });
            }

            const messages = await this.messageModel.searchMessages(
                roomId, 
                searchTerm.trim(), 
                parseInt(limit)
            );

            res.json({
                success: true,
                data: {
                    messages,
                    searchTerm: searchTerm.trim(),
                    count: messages.length
                }
            });

        } catch (error) {
            console.error('Error searching messages:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการค้นหา'
            });
        }
    }

    // ลบข้อความ
    async deleteMessage(req, res) {
        try {
            const { messageId } = req.params;
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่พบข้อมูลผู้ใช้'
                });
            }

            const success = await this.messageModel.deleteMessage(messageId, userId);

            if (success) {
                res.json({
                    success: true,
                    message: 'ลบข้อความสำเร็จ'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'ไม่พบข้อความนี้หรือคุณไม่มีสิทธิ์ลบ'
                });
            }

        } catch (error) {
            console.error('Error deleting message:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการลบข้อความ'
            });
        }
    }

    // ดึงสถิติห้อง
    async getRoomStats(req, res) {
        try {
            const { roomId } = req.params;

            const room = await this.roomModel.getRoom(roomId);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบห้องแชทนี้'
                });
            }

            const stats = await this.roomModel.getRoomStats(roomId);

            res.json({
                success: true,
                data: {
                    roomId,
                    isPremium: room.is_premium === 1,
                    createdAt: room.created_at,
                    expiresAt: room.expires_at,
                    stats
                }
            });

        } catch (error) {
            console.error('Error getting room stats:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงสถิติ'
            });
        }
    }
}

module.exports = ChatController;
