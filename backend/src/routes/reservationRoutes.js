const express = require('express');
const router = express.Router();
const {
  createReservation,
  getMyReservations,
  getAllReservations,
  cancelReservation,
  getBookQueueStatus
} = require('../controllers/reservationController');
const { protect } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/rbacMiddleware');

router.use(protect);

router.post('/', createReservation);
router.get('/my-reservations', getMyReservations);

// 🆕 Book queue status — '/:id' wali routes se PEHLE rakhna zaroori
router.get('/book/:bookId/queue', getBookQueueStatus);

router.get('/', restrictTo('super_admin', 'librarian'), getAllReservations);
router.delete('/:id', cancelReservation);

module.exports = router;