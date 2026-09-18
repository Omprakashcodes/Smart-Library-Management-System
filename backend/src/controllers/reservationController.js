const Reservation = require('../models/Reservation');
const Book = require('../models/Book');
const BorrowTransaction = require('../models/BorrowTransaction');
const ApiResponse = require('../utils/apiResponse');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

const createReservation = async (req, res, next) => {
  try {
    const { bookId } = req.body;
    const userId = req.user.id;

    const book = await Book.findById(bookId);
    if (!book) return ApiResponse.error(res, 'Book not found', 404);

    const existingReservation = await Reservation.findOne({
      user: userId,
      book: bookId,
      status: 'pending'
    });

    if (existingReservation) {
      return ApiResponse.error(res, 'You already have an active hold reservation for this book', 400);
    }

    // Check if user already has an active issued loan for this book
    const activeLoan = await BorrowTransaction.findOne({ user: userId, book: bookId, status: 'issued' });
    if (activeLoan) {
      return ApiResponse.error(res, 'You currently have an active borrowed loan for this book.', 400);
    }

    const pendingCount = await Reservation.countDocuments({ book: bookId, status: 'pending' });

    const reservation = await Reservation.create({
      user: userId,
      book: bookId,
      queuePosition: pendingCount + 1
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
    // Dynamic Sync: auto-fulfill any pending reservations if an active loan exists
    const pendingResList = await Reservation.find({ user: req.user.id, status: 'pending' });
    for (const r of pendingResList) {
      const activeLoan = await BorrowTransaction.findOne({ user: req.user.id, book: r.book, status: 'issued' });
      if (activeLoan) {
        r.status = 'fulfilled';
        await r.save();
      }
    }

    // Return ONLY active pending hold queue reservations
    const reservations = await Reservation.find({ user: req.user.id, status: 'pending' })
      .populate('book', 'title isbn authors coverImageUrl availableCopies status')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, reservations, 'Pending hold reservations fetched');
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

    // Dynamic Sync: auto-fulfill pending reservations system-wide if loans are issued
    const pendingResList = await Reservation.find({ status: 'pending' });
    for (const r of pendingResList) {
      const activeLoan = await BorrowTransaction.findOne({ user: r.user, book: r.book, status: 'issued' });
      if (activeLoan) {
        r.status = 'fulfilled';
        await r.save();
      }
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

const cancelReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return ApiResponse.error(res, 'Reservation not found', 404);

    const isServerAdmin = req.user && (req.user.role === 'super_admin' || req.user.role === 'librarian');
    if (!isServerAdmin && reservation.user.toString() !== req.user.id.toString()) {
      return ApiResponse.error(res, 'You are not authorized to cancel this reservation', 403);
    }

    reservation.status = 'cancelled';
    await reservation.save();

    await AuditLog.create({
      performedBy: req.user.id,
      action: 'CANCEL_RESERVATION',
      module: 'RESERVATIONS',
      details: { reservationId: reservation._id }
    });

    return ApiResponse.success(res, reservation, 'Reservation cancelled');
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 🆕 BOOK QUEUE STATUS — Kisi bhi book ki live availability info
// Nearest return date + hold queue list (privacy-masked names)
// ============================================================

// Helper: privacy ke liye naam mask karo — "Anuj Srivastav" → "Anuj S."
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

    // 1️⃣ Is book ki saari issued copies — sabse jaldi return hone wali upar
    const activeLoans = await BorrowTransaction.find({
      book: bookId,
      status: 'issued'
    })
      .select('dueDate')
      .sort({ dueDate: 1 });

    const nearestReturnDate = activeLoans.length > 0 ? activeLoans[0].dueDate : null;

    // 2️⃣ Hold queue — position ke order mein
    const queue = await Reservation.find({
      book: bookId,
      status: 'pending'
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
  cancelReservation,
  getBookQueueStatus
};