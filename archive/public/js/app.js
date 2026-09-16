// TalkAlways - Main JavaScript Application

class TalkAlwaysApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentRoom = null;
        this.typingTimeout = null;
        this.isTyping = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupSocketConnection();
    }

    bindEvents() {
        // Landing page events
        document.getElementById('auth-form').addEventListener('submit', (e) => this.handleJoinRoom(e));
        document.getElementById('create-room-btn').addEventListener('click', () => this.showCreateRoomModal());
        
        // Create room modal events
        document.getElementById('create-room-form').addEventListener('submit', (e) => this.handleCreateRoom(e));
        document.getElementById('close-modal-btn').addEventListener('click', () => this.hideCreateRoomModal());
        
        // Chat room events
        document.getElementById('message-form').addEventListener('submit', (e) => this.handleSendMessage(e));
        document.getElementById('message-input').addEventListener('input', () => this.handleTyping());
        document.getElementById('leave-room-btn').addEventListener('click', () => this.handleLeaveRoom());
        
        // Auto-resize textarea
        const messageInput = document.getElementById('message-input');
        messageInput.addEventListener('input', () => this.autoResizeTextarea(messageInput));
        
        // Close modal on backdrop click
        document.getElementById('create-room-modal').addEventListener('click', (e) => {
            if (e.target.id === 'create-room-modal') {
                this.hideCreateRoomModal();
            }
        });
        
        // Enter key handling
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('message-form').dispatchEvent(new Event('submit'));
            }
        });
    }

    setupSocketConnection() {
        this.socket = io();
        
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showAlert('เชื่อมต่อกับเซิร์ฟเวอร์ขาดหาย กำลังพยายามเชื่อมต่อใหม่...', 'error');
        });
        
        // Chat events
        this.socket.on('recent-messages', (messages) => this.displayMessages(messages));
        this.socket.on('new-message', (message) => this.addMessage(message));
        this.socket.on('user-joined', (data) => this.handleUserJoined(data));
        this.socket.on('user-left', (data) => this.handleUserLeft(data));
        this.socket.on('online-users', (users) => this.updateOnlineUsers(users));
        this.socket.on('user-typing', (data) => this.handleUserTyping(data));
        this.socket.on('error', (data) => this.showAlert(data.message, 'error'));
    }

    async handleJoinRoom(e) {
        e.preventDefault();
        
        const password = document.getElementById('room-password').value.trim();
        const username = document.getElementById('username').value.trim();
        
        if (!password || !username) {
            this.showAlert('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
            return;
        }
        
        if (username.length < 2 || username.length > 20) {
            this.showAlert('ชื่อผู้ใช้ต้องมีความยาว 2-20 ตัวอักษร', 'error');
            return;
        }
        
        this.setLoading('join-btn', true);
        
        try {
            // ใช้รหัสผ่านเป็น roomId สำหรับ MVP
            const roomId = this.hashPassword(password);
            
            const response = await fetch('/api/auth/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId,
                    password,
                    username
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.data.user;
                this.currentRoom = data.data.room;
                
                // เข้าห้องแชท
                this.showChatRoom();
                this.socket.emit('join-room', {
                    roomId: this.currentRoom.id,
                    userId: this.currentUser.id
                });
                
                this.showAlert('เข้าร่วมห้องแชทสำเร็จ!', 'success');
                
            } else {
                this.showAlert(data.message, 'error');
            }
            
        } catch (error) {
            console.error('Error joining room:', error);
            this.showAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        } finally {
            this.setLoading('join-btn', false);
        }
    }

    async handleCreateRoom(e) {
        e.preventDefault();
        
        const password = document.getElementById('new-room-password').value.trim();
        const confirmPassword = document.getElementById('confirm-password').value.trim();
        
        if (!password || !confirmPassword) {
            this.showAlert('กรุณากรอกข้อมูลให้ครบถ้วน', 'error', 'create-alert-container');
            return;
        }
        
        if (password.length < 6) {
            this.showAlert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'error', 'create-alert-container');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showAlert('รหัสผ่านไม่ตรงกัน', 'error', 'create-alert-container');
            return;
        }
        
        this.setLoading('create-room-submit', true);
        
        try {
            const response = await fetch('/api/auth/create-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.hideCreateRoomModal();
                this.showAlert(`สร้างห้องสำเร็จ! รหัสห้อง: ${password}`, 'success');
                
                // เติมรหัสผ่านในฟอร์มหลัก
                document.getElementById('room-password').value = password;
                
            } else {
                this.showAlert(data.message, 'error', 'create-alert-container');
            }
            
        } catch (error) {
            console.error('Error creating room:', error);
            this.showAlert('เกิดข้อผิดพลาดในการสร้างห้อง', 'error', 'create-alert-container');
        } finally {
            this.setLoading('create-room-submit', false);
        }
    }

    handleSendMessage(e) {
        e.preventDefault();
        
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        if (message.length > 1000) {
            this.showAlert('ข้อความยาวเกินไป (สูงสุด 1000 ตัวอักษร)', 'error');
            return;
        }
        
        // ส่งข้อความผ่าน Socket.io
        this.socket.emit('send-message', { message });
        
        // ล้างช่องข้อความ
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // หยุดการแสดงสถานะ typing
        this.stopTyping();
    }

    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing', { isTyping: true });
        }
        
        // Reset timeout
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 1000);
    }

    stopTyping() {
        if (this.isTyping) {
            this.isTyping = false;
            this.socket.emit('typing', { isTyping: false });
        }
        clearTimeout(this.typingTimeout);
    }

    handleLeaveRoom() {
        if (confirm('คุณต้องการออกจากห้องแชทหรือไม่?')) {
            this.leaveRoom();
        }
    }

    async leaveRoom() {
        try {
            if (this.currentUser) {
                await fetch('/api/auth/leave', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: this.currentUser.id
                    })
                });
            }
            
            // รีเซ็ตสถานะ
            this.currentUser = null;
            this.currentRoom = null;
            
            // กลับไปหน้าแรก
            this.showLandingPage();
            
            // ล้างฟอร์ม
            document.getElementById('auth-form').reset();
            
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }

    displayMessages(messages) {
        const messagesList = document.getElementById('messages-list');
        messagesList.innerHTML = '';
        
        messages.forEach(message => this.addMessage(message, false));
        this.scrollToBottom();
    }

    addMessage(message, animate = true) {
        const messagesList = document.getElementById('messages-list');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.userId === this.currentUser?.id ? 'own' : ''}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-username">${this.escapeHtml(message.username)}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">
                ${this.escapeHtml(message.message)}
            </div>
        `;
        
        if (!animate) {
            messageElement.style.animation = 'none';
        }
        
        messagesList.appendChild(messageElement);
        this.scrollToBottom();
    }

    handleUserJoined(data) {
        this.addSystemMessage(`${data.username} เข้าร่วมห้องแชท`);
    }

    handleUserLeft(data) {
        this.addSystemMessage(`${data.username} ออกจากห้องแชท`);
    }

    addSystemMessage(message) {
        const messagesList = document.getElementById('messages-list');
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.innerHTML = `
            <div class="message-content" style="background: rgba(142, 142, 142, 0.1); color: var(--color-medium-gray); text-align: center; font-style: italic;">
                ${this.escapeHtml(message)}
            </div>
        `;
        
        messagesList.appendChild(messageElement);
        this.scrollToBottom();
    }

    updateOnlineUsers(users) {
        const onlineCount = document.getElementById('online-count');
        const onlineUsersContainer = document.getElementById('online-users');
        const onlineUsersList = document.getElementById('online-users-list');
        
        onlineCount.textContent = `${users.length} online`;
        
        if (users.length > 0) {
            onlineUsersContainer.classList.remove('hidden');
            onlineUsersList.textContent = users.map(user => user.username).join(', ');
        } else {
            onlineUsersContainer.classList.add('hidden');
        }
    }

    handleUserTyping(data) {
        const typingIndicator = document.getElementById('typing-indicator');
        const typingUser = document.getElementById('typing-user');
        
        if (data.isTyping && data.userId !== this.currentUser?.id) {
            typingUser.textContent = data.username;
            typingIndicator.classList.remove('hidden');
        } else {
            typingIndicator.classList.add('hidden');
        }
    }

    showChatRoom() {
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('chat-room').classList.remove('hidden');
        
        // อัปเดตข้อมูลห้อง
        if (this.currentRoom) {
            const expiresAt = new Date(this.currentRoom.expiresAt);
            document.getElementById('room-expires').textContent = 
                `Expires: ${expiresAt.toLocaleDateString('th-TH')}`;
        }
        
        // โฟกัสที่ช่องข้อความ
        setTimeout(() => {
            document.getElementById('message-input').focus();
        }, 100);
    }

    showLandingPage() {
        document.getElementById('chat-room').classList.add('hidden');
        document.getElementById('landing-page').classList.remove('hidden');
    }

    showCreateRoomModal() {
        document.getElementById('create-room-modal').classList.remove('hidden');
        document.getElementById('new-room-password').focus();
    }

    hideCreateRoomModal() {
        document.getElementById('create-room-modal').classList.add('hidden');
        document.getElementById('create-room-form').reset();
        this.clearAlert('create-alert-container');
    }

    showAlert(message, type = 'info', container = 'alert-container') {
        const alertContainer = document.getElementById(container);
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type}`;
        alertElement.textContent = message;
        
        // ล้าง alert เก่า
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alertElement);
        
        // ซ่อน alert หลัง 5 วินาที
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.remove();
            }
        }, 5000);
    }

    clearAlert(container = 'alert-container') {
        document.getElementById(container).innerHTML = '';
    }

    setLoading(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        const text = button.querySelector('[id$="-text"]');
        const spinner = button.querySelector('[id$="-loading"]');
        
        if (isLoading) {
            button.disabled = true;
            text.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            text.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    hashPassword(password) {
        // Simple hash function for MVP - ใช้สำหรับสร้าง roomId จาก password
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TalkAlwaysApp();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden
        console.log('Page hidden');
    } else {
        // Page is visible
        console.log('Page visible');
    }
});
