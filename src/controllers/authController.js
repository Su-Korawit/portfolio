const Room = require('../models/Room');
const User = require('../models/User');

class AuthController {
    constructor(db) {
        this.roomModel = new Room(db);
        this.userModel = new User(db);
    }

    // เข้าร่วมห้องแชท
    async joinRoom(req, res) {
        try {
            const { roomId, password, username } = req.body;

            // ตรวจสอบข้อมูลที่จำเป็น
            if (!roomId || !password || !username) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
                });
            }

            // ตรวจสอบความยาวของชื่อผู้ใช้
            if (username.length < 2 || username.length > 20) {
                return res.status(400).json({
                    success: false,
                    message: 'ชื่อผู้ใช้ต้องมีความยาว 2-20 ตัวอักษร'
                });
            }

            // ตรวจสอบรหัสผ่านห้อง หรือสร้างห้องใหม่ถ้าไม่มี
            let verification = await this.roomModel.verifyPassword(roomId, password);
            
            if (!verification.valid && verification.reason === 'Room not found') {
                // สร้างห้องใหม่อัตโนมัติ
                console.log(`Creating new room with ID: ${roomId}`);
                await this.roomModel.create(password, false, 7, roomId);
                verification = await this.roomModel.verifyPassword(roomId, password);
            }
            
            if (!verification.valid) {
                let message = 'รหัสผ่านไม่ถูกต้อง';
                if (verification.reason === 'Room expired') {
                    message = 'ห้องแชทนี้หมดอายุแล้ว';
                }
                
                return res.status(401).json({
                    success: false,
                    message
                });
            }

            // ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่
            const usernameExists = await this.userModel.isUsernameExists(roomId, username);
            if (usernameExists) {
                return res.status(409).json({
                    success: false,
                    message: 'ชื่อผู้ใช้นี้ถูกใช้แล้วในห้องนี้'
                });
            }

            // เพิ่มผู้ใช้เข้าห้อง
            const user = await this.userModel.joinRoom(roomId, username);

            // ดึงข้อมูลห้อง
            const room = await this.roomModel.getRoom(roomId);
            const roomStats = await this.roomModel.getRoomStats(roomId);

            res.json({
                success: true,
                message: 'เข้าร่วมห้องแชทสำเร็จ',
                data: {
                    user,
                    room: {
                        id: room.id,
                        isPremium: room.is_premium === 1,
                        expiresAt: room.expires_at,
                        stats: roomStats
                    }
                }
            });

        } catch (error) {
            console.error('Error joining room:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในระบบ'
            });
        }
    }

    // สร้างห้องแชทใหม่ (สำหรับ default room)
    async createDefaultRoom(req, res) {
        try {
            const { password } = req.body;

            if (!password || password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
                });
            }

            // สร้างห้องฟรี (7 วัน)
            const room = await this.roomModel.create(password, false, 7);

            res.json({
                success: true,
                message: 'สร้างห้องแชทสำเร็จ',
                data: {
                    roomId: room.id,
                    isPremium: room.isPremium,
                    expiresAt: room.expiresAt
                }
            });

        } catch (error) {
            console.error('Error creating room:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการสร้างห้อง'
            });
        }
    }

    // ออกจากห้อง
    async leaveRoom(req, res) {
        try {
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่พบข้อมูลผู้ใช้'
                });
            }

            const success = await this.userModel.leaveRoom(userId);

            if (success) {
                res.json({
                    success: true,
                    message: 'ออกจากห้องแชทสำเร็จ'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'ไม่พบผู้ใช้นี้'
                });
            }

        } catch (error) {
            console.error('Error leaving room:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในระบบ'
            });
        }
    }

    // ตรวจสอบสถานะห้อง
    async checkRoomStatus(req, res) {
        try {
            const { roomId } = req.params;

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

            const stats = await this.roomModel.getRoomStats(roomId);

            res.json({
                success: true,
                data: {
                    id: room.id,
                    isPremium: room.is_premium === 1,
                    expiresAt: room.expires_at,
                    stats
                }
            });

        } catch (error) {
            console.error('Error checking room status:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในระบบ'
            });
        }
    }
}

module.exports = AuthController;
