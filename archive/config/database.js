const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

class Database {
    constructor() {
        this.db = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            const dbPath = process.env.DB_PATH || './data/talkalways.db';
            
            // สร้างโฟลเดอร์ data หากยังไม่มี
            const fs = require('fs');
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.initTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async initTables() {
        return new Promise((resolve, reject) => {
            // สร้างตาราง rooms
            const createRoomsTable = `
                CREATE TABLE IF NOT EXISTS rooms (
                    id TEXT PRIMARY KEY,
                    password_hash TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    is_premium BOOLEAN DEFAULT 0,
                    max_users INTEGER DEFAULT 10,
                    settings TEXT DEFAULT '{}'
                )
            `;

            // สร้างตาราง messages
            const createMessagesTable = `
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    username TEXT NOT NULL,
                    message TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (room_id) REFERENCES rooms (id)
                )
            `;

            // สร้างตาราง users (สำหรับ session tracking)
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    room_id TEXT NOT NULL,
                    username TEXT NOT NULL,
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_online BOOLEAN DEFAULT 1,
                    FOREIGN KEY (room_id) REFERENCES rooms (id)
                )
            `;

            // สร้างตาราง payments (สำหรับ premium rooms)
            const createPaymentsTable = `
                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_id TEXT NOT NULL,
                    payment_intent_id TEXT UNIQUE NOT NULL,
                    amount INTEGER NOT NULL,
                    currency TEXT DEFAULT 'thb',
                    duration INTEGER NOT NULL,
                    status TEXT DEFAULT 'completed',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (room_id) REFERENCES rooms (id)
                )
            `;

            // Execute all table creation queries
            this.db.serialize(() => {
                this.db.run(createRoomsTable);
                this.db.run(createMessagesTable);
                this.db.run(createUsersTable);
                this.db.run(createPaymentsTable, (err) => {
                    if (err) {
                        console.error('Error creating tables:', err.message);
                        reject(err);
                    } else {
                        console.log('Database tables initialized');
                        resolve();
                    }
                });
            });
        });
    }

    getDb() {
        return this.db;
    }

    close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                    } else {
                        console.log('Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = new Database();
