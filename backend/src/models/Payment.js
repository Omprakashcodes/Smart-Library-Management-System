const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    fine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fine',
      required: true,
      index: true
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    razorpayPaymentId: {
      type: String,
      default: null
    },
    razorpaySignature: {
      type: String,
      default: null
    },
    // Paise mein store: ₹60 = 6000 (floating point errors se bachne ke liye)
    amountPaise: {
      type: Number,
      required: true,
      min: 100
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created',
      index: true
    },
    receiptId: {
      type: String,
      required: true
    },
    failureReason: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

paymentSchema.virtual('amountRupees').get(function () {
  return this.amountPaise / 100;
});

paymentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Payment', paymentSchema);