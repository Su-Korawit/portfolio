const express = require('express');
const router = express.Router();

// Payment routes
module.exports = (paymentController) => {
    // สร้าง Payment Intent
    router.post('/create-payment-intent', (req, res) => {
        paymentController.createPaymentIntent(req, res);
    });

    // ยืนยันการชำระเงิน
    router.post('/confirm-payment', (req, res) => {
        paymentController.confirmPayment(req, res);
    });

    // ดึงประวัติการชำระเงิน
    router.get('/history/:roomId', (req, res) => {
        paymentController.getPaymentHistory(req, res);
    });

    // ดึงข้อมูลแพ็กเกจ Premium
    router.get('/packages', (req, res) => {
        paymentController.getPremiumPackages(req, res);
    });

    // Stripe Webhook
    router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
        paymentController.handleWebhook(req, res);
    });

    return router;
};
