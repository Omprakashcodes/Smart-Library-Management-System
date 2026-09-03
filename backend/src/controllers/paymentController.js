const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Fine = require('../models/Fine');

// Lazy init — pehle use par banta hai, tab tak .env load ho chuki hoti hai
let _razorpay = null;

function getRazorpay() {
  if (_razorpay) return _razorpay;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      'Razorpay keys missing. backend/.env mein RAZORPAY_KEY_ID aur RAZORPAY_KEY_SECRET set karo.'
    );
  }

  _razorpay = new Razorpay({ key_id, key_secret });
  return _razorpay;
}

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

/**
 * POST /api/payments/create-order
 * Body: { fineId }
 */
exports.createOrder = async (req, res) => {
  try {
    const { fineId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!fineId || !mongoose.Types.ObjectId.isValid(fineId)) {
      return res.status(400).json({ success: false, message: 'Invalid fine ID' });
    }

    const fine = await Fine.findById(fineId);
    if (!fine) {
      return res.status(404).json({ success: false, message: 'Fine not found' });
    }

    // SECURITY: sirf apni fine pay kar sakta hai
    if (fine.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to pay this fine'
      });
    }

    if (fine.status === 'paid') {
      return res.status(400).json({ success: false, message: 'This fine is already paid' });
    }

    if (fine.status === 'waived') {
      return res.status(400).json({ success: false, message: 'This fine has been waived' });
    }

    // SECURITY: amount DATABASE se, frontend se NAHI
    const amountPaise = Math.round(Number(fine.amount) * 100);

    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum payable amount is ₹1'
      });
    }

    // Purana pending order hai to wahi reuse karo (duplicate orders na banein)
    const existing = await Payment.findOne({
      fine: fineId,
      status: 'created',
      amountPaise
    }).sort({ createdAt: -1 });

    if (existing) {
      return res.status(200).json({
        success: true,
        orderId: existing.razorpayOrderId,
        amount: existing.amountPaise,
        currency: existing.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        receiptId: existing.receiptId
      });
    }

    const receiptId = `FINE-${fineId.toString().slice(-6).toUpperCase()}-${Date.now()
      .toString()
      .slice(-6)}`;

    const order = await getRazorpay().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        fineId: fineId.toString(),
        userId: userId.toString(),
        overdueDays: String(fine.overdueDays || 0)
      }
    });

    await Payment.create({
      user: userId,
      fine: fineId,
      razorpayOrderId: order.id,
      amountPaise,
      currency: 'INR',
      status: 'created',
      receiptId
    });

    // key_id frontend ko dena safe hai — key_secret KABHI nahi
    return res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      receiptId
    });
  } catch (err) {
    console.error('createOrder error:', err?.error || err);
    return res.status(500).json({
      success: false,
      message: 'Could not create payment order'
    });
  }
};

/**
 * POST /api/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user._id || req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (payment.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Idempotency — refresh/retry par double process na ho
    if (payment.status === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment already processed',
        receiptId: payment.receiptId,
        paymentId: payment.razorpayPaymentId,
        amount: payment.amountPaise / 100
      });
    }

    // ⭐ SECURITY KA DIL — HMAC signature verification
    // Iske bina koi bhi browser console se fine clear kar sakta hai
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const sigBuf = Buffer.from(razorpay_signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');

    const isValid =
      sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

    if (!isValid) {
      payment.status = 'failed';
      payment.failureReason = 'Signature verification failed';
      await payment.save();
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'paid';
    await payment.save();

    // ✅ Verification ke BAAD hi fine paid mark karo
    await Fine.findOneAndUpdate(
      { _id: payment.fine, status: { $ne: 'paid' } },
      {
        $set: {
          status: 'paid',
          paidAt: new Date(),
          paymentMethod: 'online',
          transactionReference: razorpay_payment_id
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: razorpay_payment_id,
      receiptId: payment.receiptId,
      amount: payment.amountPaise / 100
    });
  } catch (err) {
    console.error('verifyPayment error:', err);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/**
 * GET /api/payments/my-payments
 */
exports.getMyPayments = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const payments = await Payment.find({ user: userId, status: 'paid' })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments.map((p) => ({
        receiptId: p.receiptId,
        paymentId: p.razorpayPaymentId,
        amount: p.amountPaise / 100,
        currency: p.currency,
        date: p.createdAt,
        status: p.status
      }))
    });
  } catch (err) {
    console.error('getMyPayments error:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch payments' });
  }
};