const { generateOtp, verifyOtp } = require('../services/otp.service');

async function generateOtpHandler(req, res, next) {
  try {
    const response = await generateOtp(req.body);
    setNoStoreHeaders(res);
    res.status(response.statusCode).json(response.body);
  } catch (err) {
    next(err);
  }
}

async function verifyOtpHandler(req, res, next) {
  try {
    const response = await verifyOtp(req.body);
    setNoStoreHeaders(res);
    res.status(response.statusCode).json(response.body);
  } catch (err) {
    next(err);
  }
}

function setNoStoreHeaders(res) {
  res.set({
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
  });
}

module.exports = {
  generateOtpHandler,
  verifyOtpHandler,
};
