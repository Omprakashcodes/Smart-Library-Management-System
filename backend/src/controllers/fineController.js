const mongoose = require('mongoose');
const Fine = require('../models/Fine');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const AuditLog = require('../models/AuditLog');

// ============================================================
// GET ALL FINES - Admin / Librarian
// ============================================================
const getAllFines = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status || '';

    const query = {};

    if (status) {
      query.status = status;
    }

    const total = await Fine.countDocuments(query);

    const fines = await Fine.find(query)
      .populate('user', 'fullName email memberId department')
      .populate({
        path: 'transaction',
        populate: {
          path: 'book',
          select: 'title isbn'
        }
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return ApiResponse.paginated(
      res,
      fines,
      page,
      limit,
      total,
      'Fines list retrieved'
    );
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET CURRENT USER FINES
// ============================================================
const getMyFines = async (req, res, next) => {
  try {
    const fines = await Fine.find({
      user: req.user.id
    })
      .populate({
        path: 'transaction',
        populate: {
          path: 'book',
          select: 'title isbn coverImageUrl'
        }
      })
      .sort({ createdAt: -1 });

    const totalUnpaid = fines
      .filter((fine) => fine.status === 'unpaid')
      .reduce((sum, fine) => sum + fine.amount, 0);

    return ApiResponse.success(
      res,
      {
        fines,
        totalUnpaid
      },
      'User fines retrieved'
    );
  } catch (error) {
    next(error);
  }
};

// ============================================================
// MANUAL FINE SETTLEMENT - Admin / Librarian ONLY
//
// Student online payments DO NOT use this endpoint.
// Razorpay online payments are handled by paymentController.
// ============================================================
const updateFineStatus = async (req, res, next) => {
  try {
    const {
      status = 'paid',
      paymentMethod = 'cash',
      transactionReference = ''
    } = req.body;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return ApiResponse.error(
        res,
        'Invalid fine ID',
        400
      );
    }

    // Manual endpoint only supports these final states
    const allowedStatuses = ['paid', 'waived'];

    if (!allowedStatuses.includes(status)) {
      return ApiResponse.error(
        res,
        'Fine status can only be changed to paid or waived',
        400
      );
    }

    // IMPORTANT:
    // Online is intentionally excluded.
    // Online payment can only happen after Razorpay verification.
    const allowedMethods = [
      'cash',
      'card',
      'waived'
    ];

    if (!allowedMethods.includes(paymentMethod)) {
      return ApiResponse.error(
        res,
        'Invalid manual payment method',
        400
      );
    }

    if (
      status === 'paid' &&
      paymentMethod === 'waived'
    ) {
      return ApiResponse.error(
        res,
        'Paid fine cannot use waived payment method',
        400
      );
    }

    if (
      status === 'waived' &&
      paymentMethod !== 'waived'
    ) {
      return ApiResponse.error(
        res,
        'Waived fine must use waived payment method',
        400
      );
    }

    const fine = await Fine.findById(
      req.params.id
    ).populate(
      'user',
      'fullName email memberId'
    );

    if (!fine) {
      return ApiResponse.error(
        res,
        'Fine not found',
        404
      );
    }

    // Prevent accidental double settlement
    if (fine.status === 'paid') {
      return ApiResponse.error(
        res,
        'Fine is already paid',
        400
      );
    }

    if (fine.status === 'waived') {
      return ApiResponse.error(
        res,
        'Fine is already waived',
        400
      );
    }

    fine.status = status;
    fine.paymentMethod = paymentMethod;
    fine.paidAt = new Date();

    if (transactionReference) {
      fine.transactionReference =
        transactionReference;
    }

    await fine.save();

    // Notify admins about manually received payment
    if (status === 'paid') {
      try {
        const admins = await User.find({
          role: {
            $in: [
              'super_admin',
              'librarian'
            ]
          }
        });

        const payerName =
          fine.user?.fullName ||
          'A library member';

        for (const admin of admins) {
          await Notification.create({
            recipient: admin._id,
            title: 'Fine Payment Received',
            message:
              `Fine of ₹${fine.amount.toFixed(2)} ` +
              `was manually settled for ${payerName}.`,
            type: 'fine_added'
          });
        }
      } catch (notificationError) {
        console.error(
          'Notification creation error:',
          notificationError
        );
      }
    }

    // Audit log
    await AuditLog.create({
      performedBy: req.user.id,
      action: 'UPDATE_FINE_STATUS',
      module: 'FINES',
      details: {
        fineId: fine._id,
        status: fine.status,
        amount: fine.amount,
        paymentMethod: fine.paymentMethod
      }
    });

    return ApiResponse.success(
      res,
      fine,
      status === 'waived'
        ? 'Fine waived successfully'
        : 'Fine manually settled successfully'
    );
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  getAllFines,
  getMyFines,
  updateFineStatus
};