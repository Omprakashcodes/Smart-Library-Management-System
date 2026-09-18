const Reservation = require('../models/Reservation');
const Book = require('../models/Book');
const BorrowTransaction = require('../models/BorrowTransaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

// Create Hold Reservation
const createReservation = async (req, res, next) => {
  try {
    const { bookId } = req.body;
    const userId = req.user.id;

    const book = await Book.findById(bookId);
    if (!book) return ApiResponse.error(res, 'Book not found', 404);

    const existingReservation = await Reservation.findOne({
      user: userId,
      book: bookId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingReservation) {
      return ApiResponse.error(res, 'You already have an active hold reservation for this book', 400);
    }

    const activeLoan = await BorrowTransaction.findOne({ user: userId, book: bookId, status: 'issued' });
    if (activeLoan) {
      return ApiResponse.error(res, 'You currently have an active borrowed loan for this book.', 400);
    }

    const pendingCount = await Reservation.countDocuments({ book: bookId, status: 'pending' });

    const reservation = await Reservation.create({
      user: userId,
      book: bookId,
      queuePosition: pendingCount + 1,
      status: 'pending'
    });

    await AuditLog.create({
      performedBy: userId,
      action: 'RESERVE_BOOK',
      module: 'RESERVATIONS',
      details: { reservationId: reservation._id, bookId, title: book.title }
    });

    return ApiResponse.success(res, reservation, 'Book reserved successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getMyReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ 
      user: req.user.id, 
      status: { $in: ['pending', 'approved'] } 
    })
      .populate('book', 'title isbn authors coverImageUrl availableCopies status')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, reservations, 'Hold reservations fetched');
  } catch (error) {
    next(error);
  }
};

const getAllReservations = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const reservations = await Reservation.find(query)
      .populate('user', 'fullName email memberId role department phone')
      .populate('book', 'title isbn authors coverImageUrl availableCopies status')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, reservations, 'All student reservation queues fetched');
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 1️⃣ STEP 1: APPROVE HOLD FOR PICKUP (Stock reduces by 1 immediately!)
// ============================================================
const approveHoldForPickup = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('book user');
    if (!reservation) return ApiResponse.error(res, 'Reservation hold record not found', 404);

    if (reservation.status === 'approved') {
      return ApiResponse.error(res, 'This hold is already approved for pickup.', 400);
    }

    const book = await Book.findById(reservation.book._id);
    if (!book || book.availableCopies <= 0) {
      return ApiResponse.error(res, `Cannot approve: "${book ? book.title : 'Book'}" is out of physical stock.`, 400);
    }

    // ⚡ DECREMENT STOCK IMMEDIATELY ON APPROVAL (Shows 0 Available on Catalog)
    book.availableCopies = Math.max(0, book.availableCopies - 1);
    await book.save();

    reservation.status = 'approved';
    await reservation.save();

    await Notification.create({
      recipient: reservation.user._id,
      title: 'Hold Approved — Ready for Pickup!',
      message: `Your hold request for "${book.title}" is approved! Please collect it from the library desk within 2 days.`,
      type: 'system'
    });

    return ApiResponse.success(res, { reservation, availableCopies: book.availableCopies }, `Hold approved! Book "${book.title}" reserved for pickup. Remaining stock: ${book.availableCopies}`);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2️⃣ STEP 2: HANDOVER / CHECKOUT BOOK AT DESK (Moves to Active Loans 1/3)
// ============================================================
const fulfillReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('book user');
    if (!reservation) return ApiResponse.error(res, 'Reservation hold record not found', 404);

    if (reservation.status === 'fulfilled') {
      return ApiResponse.error(res, 'This hold has already been fulfilled and issued.', 400);
    }

    const book = await Book.findById(reservation.book._id);
    const user = await User.findById(reservation.user._id);

    // If stock wasn't decremented during approval, decrement now
    if (reservation.status === 'pending' && book && book.availableCopies > 0) {
      book.availableCopies = Math.max(0, book.availableCopies - 1);
      await book.save();
    }

    // Check active loan limit for student
    const activeLoans = await BorrowTransaction.countDocuments({ user: user._id, status: 'issued' });
    const maxLimit = user.role === 'faculty' ? 7 : 3;
    if (activeLoans >= maxLimit) {
      return ApiResponse.error(res, `Member loan limit reached (${maxLimit} max). Clear existing loans before issuing.`, 400);
    }

    // Mark reservation fulfilled
    reservation.status = 'fulfilled';
    await reservation.save();

    // Create Active Loan Borrow Transaction (Due in 14 days)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const transaction = await BorrowTransaction.create({
      user: user._id,
      book: book._id,
      issuedBy: req.user ? req.user.id : user._id,
      dueDate,
      status: 'issued'
    });

    await Notification.create({
      recipient: user._id,
      title: 'Book Checked Out Successfully!',
      message: `"${book.title}" has been checked out to you. Due date: ${dueDate.toDateString()}`,
      type: 'system'
    });

    await AuditLog.create({
      performedBy: req.user.id,
      action: 'HANDOVER_BOOK',
      module: 'RESERVATIONS',
      details: { reservationId: reservation._id, transactionId: transaction._id }
    });

    return ApiResponse.success(
      res,
      { reservation, transaction },
      `Book handed over successfully! "${book.title}" is now active in ${user.fullName}'s loans.`
    );
  } catch (error) {
    next(error);
  }
};

const cancelReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return ApiResponse.error(res, 'Reservation not found', 404);

    // If hold was approved/held, restore 1 copy back to stock
    if (reservation.status === 'approved') {
      const book = await Book.findById(reservation.book);
      if (book) {
        book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
        await book.save();
      }
    }

    reservation.status = 'cancelled';
    await reservation.save();

    return ApiResponse.success(res, reservation, 'Reservation cancelled');
  } catch (error) {
    next(error);
  }
};

const maskName = (fullName) => {
  if (!fullName) return 'Member';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
};

const getBookQueueStatus = async (req, res, next) => {
  try {
    const { bookId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return ApiResponse.error(res, 'Invalid book ID.', 400);
    }

    const activeLoans = await BorrowTransaction.find({
      book: bookId,
      status: 'issued'
    })
      .select('dueDate')
      .sort({ dueDate: 1 });

    const nearestReturnDate = activeLoans.length > 0 ? activeLoans[0].dueDate : null;

    const queue = await Reservation.find({
      book: bookId,
      status: { $in: ['pending', 'approved'] }
    })
      .populate('user', 'fullName memberId')
      .sort({ queuePosition: 1 });

    const queueList = queue.map((r) => {
      const isYou = r.user && r.user._id.toString() === req.user.id;
      return {
        position: r.queuePosition,
        memberName: isYou ? 'You' : maskName(r.user?.fullName),
        isYou,
        reservedOn: r.createdAt
      };
    });

    return ApiResponse.success(
      res,
      {
        issuedCopies: activeLoans.length,
        nearestReturnDate,
        queueCount: queue.length,
        queue: queueList
      },
      'Book queue status fetched'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReservation,
  getMyReservations,
  getAllReservations,
  approveHoldForPickup,
  fulfillReservation,
  cancelReservation,
  getBookQueueStatus
};