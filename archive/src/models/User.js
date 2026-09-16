const { v4: uuidv4 } = require('uuid');

class User {
    constructor(db) {
        this.db = db;
    }

    // เพิ่มผู้ใช้ใหม่เข้าห้อง
    async joinRoom(roomId, username) {
        const userId = uuidv4();
        
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO users (id, room_id, username)
                VALUES (?, ?, ?)
            `;
            
            this.db.run(query, [userId, roomId, username], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: userId,
                        roomId,
                        username,
                        joinedAt: new Date().toISOString(),
                        isOnline: true
                    });
                }
            });
        });
    }

    // อัปเดตสถานะออนไลน์
    async updateOnlineStatus(userId, isOnline) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE users 
                SET is_online = ?, last_seen = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            this.db.run(query, [isOnline ? 1 : 0, userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // ดึงรายชื่อผู้ใช้ในห้อง
    async getRoomUsers(roomId, onlineOnly = false) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT id, username, joined_at, last_seen, is_online
                FROM users 
                WHERE room_id = ?
            `;
            
            if (onlineOnly) {
                query += ` AND is_online = 1`;
            }
            
            query += ` ORDER BY joined_at ASC`;
            
            this.db.all(query, [roomId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        id: row.id,
                        username: row.username,
                        joinedAt: row.joined_at,
                        lastSeen: row.last_seen,
                        isOnline: row.is_online === 1
                    })));
                }
            });
        });
    }

    // ดึงข้อมูลผู้ใช้
    async getUser(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, room_id, username, joined_at, last_seen, is_online
                FROM users 
                WHERE id = ?
            `;
            
            this.db.get(query, [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve(null);
                } else {
                    resolve({
                        id: row.id,
                        roomId: row.room_id,
                        username: row.username,
                        joinedAt: row.joined_at,
                        lastSeen: row.last_seen,
                        isOnline: row.is_online === 1
                    });
                }
            });
        });
    }

    // ออกจากห้อง
    async leaveRoom(userId) {
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM users WHERE id = ?`;
            
            this.db.run(query, [userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // ตรวจสอบว่าชื่อผู้ใช้ซ้ำในห้องหรือไม่
    async isUsernameExists(roomId, username, excludeUserId = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT COUNT(*) as count
                FROM users 
                WHERE room_id = ? AND username = ?
            `;
            let params = [roomId, username];
            
            if (excludeUserId) {
                query += ` AND id != ?`;
                params.push(excludeUserId);
            }
            
            this.db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count > 0);
                }
            });
        });
    }

    // อัปเดตชื่อผู้ใช้
    async updateUsername(userId, newUsername) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE users 
                SET username = ?
                WHERE id = ?
            `;
            
            this.db.run(query, [newUsername, userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // ล้างผู้ใช้ที่ออฟไลน์นานเกินไป
    async cleanupInactiveUsers(hoursThreshold = 24) {
        return new Promise((resolve, reject) => {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - hoursThreshold);
            
            const query = `
                DELETE FROM users 
                WHERE is_online = 0 AND last_seen < ?
            `;
            
            this.db.run(query, [cutoffTime.toISOString()], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Cleaned up ${this.changes} inactive users`);
                    resolve(this.changes);
                }
            });
        });
    }

    // นับจำนวนผู้ใช้ในห้อง
    async getUserCount(roomId, onlineOnly = false) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT COUNT(*) as count
                FROM users 
                WHERE room_id = ?
            `;
            
            if (onlineOnly) {
                query += ` AND is_online = 1`;
            }
            
            this.db.get(query, [roomId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }
}

module.exports = User;
