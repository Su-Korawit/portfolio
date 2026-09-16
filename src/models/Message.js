class Message {
    constructor(db) {
        this.db = db;
    }

    // บันทึกข้อความใหม่
    async create(roomId, userId, username, message) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO messages (room_id, user_id, username, message)
                VALUES (?, ?, ?, ?)
            `;
            
            this.db.run(query, [roomId, userId, username, message], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        roomId,
                        userId,
                        username,
                        message,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        });
    }

    // ดึงข้อความในห้อง
    async getMessages(roomId, limit = 50, offset = 0) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, user_id, username, message, timestamp
                FROM messages 
                WHERE room_id = ?
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            `;
            
            this.db.all(query, [roomId, limit, offset], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // เรียงลำดับใหม่เพื่อให้ข้อความเก่าอยู่ด้านบน
                    resolve(rows.reverse());
                }
            });
        });
    }

    // ดึงข้อความล่าสุด
    async getLatestMessages(roomId, count = 10) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, user_id, username, message, timestamp
                FROM messages 
                WHERE room_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            `;
            
            this.db.all(query, [roomId, count], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.reverse());
                }
            });
        });
    }

    // ลบข้อความ (สำหรับ admin หรือเจ้าของข้อความ)
    async deleteMessage(messageId, userId) {
        return new Promise((resolve, reject) => {
            const query = `
                DELETE FROM messages 
                WHERE id = ? AND user_id = ?
            `;
            
            this.db.run(query, [messageId, userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // นับจำนวนข้อความในห้อง
    async getMessageCount(roomId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(*) as count
                FROM messages 
                WHERE room_id = ?
            `;
            
            this.db.get(query, [roomId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }

    // ค้นหาข้อความ
    async searchMessages(roomId, searchTerm, limit = 20) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, user_id, username, message, timestamp
                FROM messages 
                WHERE room_id = ? AND message LIKE ?
                ORDER BY timestamp DESC
                LIMIT ?
            `;
            
            this.db.all(query, [roomId, `%${searchTerm}%`, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // ลบข้อความทั้งหมดในห้อง (สำหรับการล้างข้อมูล)
    async clearRoomMessages(roomId) {
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM messages WHERE room_id = ?`;
            
            this.db.run(query, [roomId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }
}

module.exports = Message;
