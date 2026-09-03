const express = require('express');
const router = express.Router();

const {
  getAllFines,
  getMyFines,
  updateFineStatus
} = require('../controllers/fineController');

const { protect } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/rbacMiddleware');

router.use(protect);

// Student/faculty can view only their own fines
router.get('/my-fines', getMyFines);

// Admin / librarian management
router.get(
  '/',
  restrictTo('super_admin', 'librarian'),
  getAllFines
);

// IMPORTANT:
// Students must never directly mark a fine as paid.
// Online payments are handled by /payments/create-order + /payments/verify.
router.patch(
  '/:id/pay',
  restrictTo('super_admin', 'librarian'),
  updateFineStatus
);

module.exports = router;
