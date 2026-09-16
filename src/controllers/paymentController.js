const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Room = require('../models/Room');

class PaymentController {
    constructor(db) {
        this.roomModel = new Room(db);
    }

    // สร้าง Payment Intent สำหรับห้อง Premium
    async createPaymentIntent(req, res) {
        try {
            const { roomPassword, duration = 30 } = req.body; // duration in days

            if (!roomPassword || roomPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
                });
            }

            // คำนวณราคาตามระยะเวลา
            const pricePerDay = 1.63; // ฿49/30 วัน = ฿1.63/วัน
            const amount = Math.round(pricePerDay * duration * 100); // แปลงเป็น satang

            // สร้าง Payment Intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'thb',
                metadata: {
                    type: 'premium_room',
                    duration: duration.toString(),
                    roomPassword: roomPassword
                },
                description: `TalkAlways Premium Room - ${duration} วัน`
            });

            res.json({
                success: true,
                data: {
                    clientSecret: paymentIntent.client_secret,
                    amount: amount,
                    duration: duration,
                    priceDisplay: `฿${(amount / 100).toFixed(2)}`
                }
            });

        } catch (error) {
            console.error('Error creating payment intent:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการสร้างการชำระเงิน'
            });
        }
    }

    // ยืนยันการชำระเงินและสร้างห้อง Premium
    async confirmPayment(req, res) {
        try {
            const { paymentIntentId } = req.body;

            if (!paymentIntentId) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่พบข้อมูลการชำระเงิน'
                });
            }

            // ดึงข้อมูล Payment Intent จาก Stripe
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            if (paymentIntent.status !== 'succeeded') {
                return res.status(400).json({
                    success: false,
                    message: 'การชำระเงินไม่สำเร็จ'
                });
            }

            // ดึงข้อมูลจาก metadata
            const { roomPassword, duration } = paymentIntent.metadata;

            // สร้างห้อง Premium
            const room = await this.roomModel.create(
                roomPassword,
                true, // isPremium
                parseInt(duration)
            );

            // บันทึกข้อมูลการชำระเงิน
            await this.recordPayment({
                roomId: room.id,
                paymentIntentId: paymentIntentId,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                duration: parseInt(duration)
            });

            res.json({
                success: true,
                message: 'สร้างห้อง Premium สำเร็จ',
                data: {
                    roomId: room.id,
                    isPremium: true,
                    expiresAt: room.expiresAt,
                    duration: parseInt(duration)
                }
            });

        } catch (error) {
            console.error('Error confirming payment:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน'
            });
        }
    }

    // บันทึกข้อมูลการชำระเงิน
    async recordPayment(paymentData) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO payments (room_id, payment_intent_id, amount, currency, duration, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `;
            
            this.roomModel.db.run(query, [
                paymentData.roomId,
                paymentData.paymentIntentId,
                paymentData.amount,
                paymentData.currency,
                paymentData.duration
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    // ดึงประวัติการชำระเงิน
    async getPaymentHistory(req, res) {
        try {
            const { roomId } = req.params;

            const payments = await this.getPaymentsByRoom(roomId);

            res.json({
                success: true,
                data: payments
            });

        } catch (error) {
            console.error('Error getting payment history:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน'
            });
        }
    }

    // ดึงข้อมูลการชำระเงินตาม room ID
    async getPaymentsByRoom(roomId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM payments 
                WHERE room_id = ? 
                ORDER BY created_at DESC
            `;
            
            this.roomModel.db.all(query, [roomId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Webhook สำหรับ Stripe
    async handleWebhook(req, res) {
        try {
            const sig = req.headers['stripe-signature'];
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

            let event;

            try {
                event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
            } catch (err) {
                console.error('Webhook signature verification failed:', err.message);
                return res.status(400).send(`Webhook Error: ${err.message}`);
            }

            // จัดการ event ต่างๆ
            switch (event.type) {
                case 'payment_intent.succeeded':
                    console.log('Payment succeeded:', event.data.object.id);
                    break;
                case 'payment_intent.payment_failed':
                    console.log('Payment failed:', event.data.object.id);
                    break;
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            res.json({ received: true });

        } catch (error) {
            console.error('Error handling webhook:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการประมวลผล webhook'
            });
        }
    }

    // ดึงข้อมูลแพ็กเกจ Premium
    async getPremiumPackages(req, res) {
        try {
            const packages = [
                {
                    id: 'premium_30',
                    name: 'Premium 30 วัน',
                    duration: 30,
                    price: 49,
                    features: [
                        'ห้องแชทไม่หมดอายุ 30 วัน',
                        'ไม่มีโฆษณา',
                        'สามารถบันทึกประวัติแชท',
                        'รองรับผู้ใช้ไม่จำกัด',
                        'การสนับสนุนลูกค้าแบบพิเศษ'
                    ]
                },
                {
                    id: 'premium_90',
                    name: 'Premium 90 วัน',
                    duration: 90,
                    price: 129,
                    originalPrice: 147,
                    discount: 12,
                    features: [
                        'ห้องแชทไม่หมดอายุ 90 วัน',
                        'ไม่มีโฆษณา',
                        'สามารถบันทึกประวัติแชท',
                        'รองรับผู้ใช้ไม่จำกัด',
                        'การสนับสนุนลูกค้าแบบพิเศษ',
                        'ประหยัด 12%'
                    ]
                },
                {
                    id: 'premium_365',
                    name: 'Premium 1 ปี',
                    duration: 365,
                    price: 399,
                    originalPrice: 595,
                    discount: 33,
                    features: [
                        'ห้องแชทไม่หมดอายุ 1 ปีเต็ม',
                        'ไม่มีโฆษณา',
                        'สามารถบันทึกประวัติแชท',
                        'รองรับผู้ใช้ไม่จำกัด',
                        'การสนับสนุนลูกค้าแบบพิเศษ',
                        'ประหยัด 33%',
                        'คุ้มค่าที่สุด!'
                    ]
                }
            ];

            res.json({
                success: true,
                data: packages
            });

        } catch (error) {
            console.error('Error getting premium packages:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแพ็กเกจ'
            });
        }
    }
}

module.exports = PaymentController;
