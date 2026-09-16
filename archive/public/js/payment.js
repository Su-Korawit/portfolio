class PaymentManager {
    constructor() {
        this.stripe = null;
        this.elements = null;
        this.card = null;
        this.selectedPackage = null;
        this.clientSecret = null;
        
        this.init();
    }

    async init() {
        try {
            // Initialize Stripe
            this.stripe = Stripe('pk_test_51234567890abcdef'); // This should come from server
            
            // Load packages
            await this.loadPackages();
            
            // Setup event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing payment:', error);
            this.showError('เกิดข้อผิดพลาดในการเริ่มต้นระบบชำระเงิน');
        }
    }

    async loadPackages() {
        try {
            const response = await fetch('/api/payment/packages');
            const result = await response.json();
            
            if (result.success) {
                this.renderPackages(result.data);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error loading packages:', error);
            this.showError('ไม่สามารถโหลดข้อมูลแพ็กเกจได้');
        }
    }

    renderPackages(packages) {
        const grid = document.getElementById('packages-grid');
        grid.innerHTML = '';

        packages.forEach(pkg => {
            const packageCard = document.createElement('div');
            packageCard.className = `package-card ${pkg.id === 'premium_90' ? 'recommended' : ''}`;
            packageCard.dataset.packageId = pkg.id;

            let discountBadge = '';
            if (pkg.discount) {
                discountBadge = `<div class="discount-badge">ประหยัด ${pkg.discount}%</div>`;
            }

            let originalPrice = '';
            if (pkg.originalPrice) {
                originalPrice = `<span class="original-price">฿${pkg.originalPrice}</span>`;
            }

            packageCard.innerHTML = `
                ${discountBadge}
                <h3>${pkg.name}</h3>
                <div class="price">
                    ${originalPrice}
                    <span class="current-price">฿${pkg.price}</span>
                </div>
                <div class="duration">${pkg.duration} วัน</div>
                <ul class="features">
                    ${pkg.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                <button class="btn btn-primary select-package" data-package-id="${pkg.id}">
                    เลือกแพ็กเกจนี้
                </button>
            `;

            grid.appendChild(packageCard);
        });
    }

    setupEventListeners() {
        // Package selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('select-package')) {
                const packageId = e.target.dataset.packageId;
                this.selectPackage(packageId);
            }
        });

        // Payment form
        const form = document.getElementById('payment-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handlePaymentSubmit(e));
        }

        // Room password input
        const passwordInput = document.getElementById('room-password');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => this.validateForm());
        }
    }

    async selectPackage(packageId) {
        try {
            // Find selected package
            const response = await fetch('/api/payment/packages');
            const result = await response.json();
            
            if (result.success) {
                this.selectedPackage = result.data.find(pkg => pkg.id === packageId);
                
                // Update UI
                this.highlightSelectedPackage(packageId);
                this.showPaymentSection();
                this.setupStripeElements();
            }
        } catch (error) {
            console.error('Error selecting package:', error);
            this.showError('เกิดข้อผิดพลาดในการเลือกแพ็กเกจ');
        }
    }

    highlightSelectedPackage(packageId) {
        // Remove previous selection
        document.querySelectorAll('.package-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Highlight selected package
        const selectedCard = document.querySelector(`[data-package-id="${packageId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }

    showPaymentSection() {
        const paymentSection = document.getElementById('payment-section');
        const summary = document.getElementById('payment-summary');
        
        if (this.selectedPackage && paymentSection && summary) {
            // Update summary
            summary.innerHTML = `
                <div class="summary-item">
                    <span>แพ็กเกจ:</span>
                    <span>${this.selectedPackage.name}</span>
                </div>
                <div class="summary-item">
                    <span>ระยะเวลา:</span>
                    <span>${this.selectedPackage.duration} วัน</span>
                </div>
                <div class="summary-item total">
                    <span>ยอดรวม:</span>
                    <span>฿${this.selectedPackage.price}</span>
                </div>
            `;

            // Show payment section
            paymentSection.classList.remove('hidden');
            paymentSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    setupStripeElements() {
        if (!this.stripe) return;

        // Create elements instance
        this.elements = this.stripe.elements();

        // Create card element
        this.card = this.elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#2E2E2E',
                    '::placeholder': {
                        color: '#888888',
                    },
                },
            },
        });

        // Mount card element
        this.card.mount('#card-element');

        // Handle real-time validation errors from the card Element
        this.card.on('change', ({error}) => {
            const displayError = document.getElementById('card-errors');
            if (error) {
                displayError.textContent = error.message;
            } else {
                displayError.textContent = '';
            }
            this.validateForm();
        });
    }

    validateForm() {
        const passwordInput = document.getElementById('room-password');
        const submitButton = document.getElementById('submit-payment');
        
        const isPasswordValid = passwordInput && passwordInput.value.length >= 6;
        const isCardReady = this.card; // Simplified check
        
        if (submitButton) {
            submitButton.disabled = !(isPasswordValid && isCardReady);
        }
    }

    async handlePaymentSubmit(event) {
        event.preventDefault();

        if (!this.selectedPackage) {
            this.showError('กรุณาเลือกแพ็กเกจก่อน');
            return;
        }

        const roomPassword = document.getElementById('room-password').value;
        if (!roomPassword || roomPassword.length < 6) {
            this.showError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
            return;
        }

        this.setLoading(true);

        try {
            // Create payment intent
            const intentResponse = await fetch('/api/payment/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomPassword: roomPassword,
                    duration: this.selectedPackage.duration
                }),
            });

            const intentResult = await intentResponse.json();
            
            if (!intentResult.success) {
                throw new Error(intentResult.message);
            }

            this.clientSecret = intentResult.data.clientSecret;

            // Confirm payment
            const {error, paymentIntent} = await this.stripe.confirmCardPayment(
                this.clientSecret,
                {
                    payment_method: {
                        card: this.card,
                    }
                }
            );

            if (error) {
                throw new Error(error.message);
            }

            if (paymentIntent.status === 'succeeded') {
                await this.handlePaymentSuccess(paymentIntent.id);
            }

        } catch (error) {
            console.error('Payment error:', error);
            this.showError(error.message || 'เกิดข้อผิดพลาดในการชำระเงิน');
        } finally {
            this.setLoading(false);
        }
    }

    async handlePaymentSuccess(paymentIntentId) {
        try {
            // Confirm payment on server
            const response = await fetch('/api/payment/confirm-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paymentIntentId: paymentIntentId
                }),
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(result.data);
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('Error confirming payment:', error);
            this.showError('การชำระเงินสำเร็จ แต่เกิดข้อผิดพลาดในการสร้างห้อง กรุณาติดต่อฝ่ายสนับสนุน');
        }
    }

    showSuccess(roomData) {
        // Hide other sections
        document.getElementById('payment-section').classList.add('hidden');
        
        // Update room info
        const roomInfo = document.getElementById('room-info');
        if (roomInfo && roomData) {
            roomInfo.innerHTML = `
                <div class="room-detail">
                    <strong>รหัสห้อง:</strong> ${roomData.roomId}
                </div>
                <div class="room-detail">
                    <strong>ระยะเวลา:</strong> ${roomData.duration} วัน
                </div>
                <div class="room-detail">
                    <strong>หมดอายุ:</strong> ${new Date(roomData.expiresAt).toLocaleDateString('th-TH')}
                </div>
            `;
        }
        
        // Show success section
        document.getElementById('success-section').classList.remove('hidden');
        document.getElementById('success-section').scrollIntoView({ behavior: 'smooth' });
    }

    showError(message) {
        // Simple error display - in production, use a proper modal or toast
        alert(message);
    }

    setLoading(isLoading) {
        const submitButton = document.getElementById('submit-payment');
        const buttonText = document.getElementById('button-text');
        const spinner = document.getElementById('spinner');
        
        if (submitButton && buttonText && spinner) {
            submitButton.disabled = isLoading;
            
            if (isLoading) {
                buttonText.textContent = 'กำลังประมวลผล...';
                spinner.classList.remove('hidden');
            } else {
                buttonText.textContent = 'ชำระเงิน';
                spinner.classList.add('hidden');
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PaymentManager();
});
