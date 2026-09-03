const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/authMiddleware');
const {
  createOrder,
  verifyPayment,
  getMyPayments
} = require('../controllers/paymentController');

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/my-payments', protect, getMyPayments);

module.exports = router;