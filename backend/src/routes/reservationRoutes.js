const express = require('express');
const router = express.Router();
const {
  createReservation,
  getMyReservations,
  getAllReservations,
  approveHoldForPickup,
  fulfillReservation,
  cancelReservation,
  getBookQueueStatus
} = require('../controllers/reservationController');
const { protect } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/rbacMiddleware');

router.use(protect);

router.post('/', createReservation);
router.get('/my-reservations', getMyReservations);
router.get('/', restrictTo('super_admin', 'librarian'), getAllReservations);
router.post('/:id/approve', restrictTo('super_admin', 'librarian'), approveHoldForPickup); // 🆕 APPROVE FOR PICKUP (Stock -1)
router.post('/:id/fulfill', restrictTo('super_admin', 'librarian'), fulfillReservation);    // 🆕 HANDOVER AT DESK (Active Loan 1/3)
router.delete('/:id', cancelReservation);
router.get('/book/:bookId/queue', getBookQueueStatus);

module.exports = router;