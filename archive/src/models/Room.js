const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class Room {
    constructor(db) {
        this.db = db;
    }

    // สร้างห้องใหม่
    async create(password, isPremium = false, expiryDays = 7, customRoomId = null) {
        const roomId = customRoomId || uuidv4();
        const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO rooms (id, password_hash, expires_at, is_premium)
                VALUES (?, ?, ?, ?)
            `;
            
            this.db.run(query, [roomId, passwordHash, expiresAt.toISOString(), isPremium ? 1 : 0], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: roomId,
                        isPremium,
                        expiresAt: expiresAt.toISOString(),
                        created: true
                    });
                }
            });
        });
    }

    // ตรวจสอบรหัสผ่านห้อง
    async verifyPassword(roomId, password) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT password_hash, expires_at, is_premium 
                FROM rooms 
                WHERE id = ?
            `;
            
            this.db.get(query, [roomId], async (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve({ valid: false, reason: 'Room not found' });
                } else {
                    // ตรวจสอบว่าห้องหมดอายุหรือไม่
                    const now = new Date();
                    const expiresAt = new Date(row.expires_at);
                    
                    if (now > expiresAt) {
                        resolve({ valid: false, reason: 'Room expired' });
                        return;
                    }

                    // ตรวจสอบรหัสผ่าน
                    const isValid = await bcrypt.compare(password, row.password_hash);
                    resolve({ 
                        valid: isValid, 
                        isPremium: row.is_premium === 1,
                        reason: isValid ? null : 'Invalid password'
                    });
                }
            });
        });
    }

    // ดึงข้อมูลห้อง
    async getRoom(roomId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, created_at, expires_at, is_premium, max_users, settings
                FROM rooms 
                WHERE id = ?
            `;
            
            this.db.get(query, [roomId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // ลบห้องที่หมดอายุ
    async cleanupExpiredRooms() {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            
            // ลบข้อความในห้องที่หมดอายุก่อน
            const deleteMessages = `
                DELETE FROM messages 
                WHERE room_id IN (
                    SELECT id FROM rooms WHERE expires_at < ?
                )
            `;
            
            // ลบผู้ใช้ในห้องที่หมดอายุ
            const deleteUsers = `
                DELETE FROM users 
                WHERE room_id IN (
                    SELECT id FROM rooms WHERE expires_at < ?
                )
            `;
            
            // ลบห้องที่หมดอายุ
            const deleteRooms = `DELETE FROM rooms WHERE expires_at < ?`;
            
            this.db.serialize(() => {
                this.db.run(deleteMessages, [now]);
                this.db.run(deleteUsers, [now]);
                this.db.run(deleteRooms, [now], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`Cleaned up ${this.changes} expired rooms`);
                        resolve(this.changes);
                    }
                });
            });
        });
    }

    // ดึงสถิติห้อง
    async getRoomStats(roomId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    (SELECT COUNT(*) FROM messages WHERE room_id = ?) as message_count,
                    (SELECT COUNT(*) FROM users WHERE room_id = ? AND is_online = 1) as online_users,
                    (SELECT COUNT(*) FROM users WHERE room_id = ?) as total_users
            `;
            
            this.db.get(query, [roomId, roomId, roomId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
}

module.exports = Room;
