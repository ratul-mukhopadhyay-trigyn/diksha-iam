const express = require('express');
const {
  generateOtpHandler,
  verifyOtpHandler,
} = require('../controllers/otp.controller');

const router = express.Router();

router.post('/otp/generate', generateOtpHandler);
router.post('/otp/verify', verifyOtpHandler);

module.exports = router;
