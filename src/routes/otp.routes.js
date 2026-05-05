const express = require('express');
const {
  generateOtpHandler,
  verifyOtpHandler,
} = require('../controllers/otp.controller');

const router = express.Router();

/**
 * @swagger
 * /otp/generate:
 *   post:
 *     summary: Forward OTP generate request to upstream
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [request]
 *             properties:
 *               request:
 *                 type: object
 *                 required: [key, type]
 *                 properties:
 *                   key:
 *                     type: string
 *                     example: user@example.com
 *                   type:
 *                     type: string
 *                     enum: [email, phone, prevUsedEmail, prevUsedPhone, recoveryEmail, recoveryPhone]
 *                   userId:
 *                     type: string
 *                   templateId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Upstream response (may be encrypted JSON from upstream)
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/otp/generate', generateOtpHandler);

/**
 * @swagger
 * /otp/verify:
 *   post:
 *     summary: Forward OTP verify request to upstream
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [request]
 *             properties:
 *               request:
 *                 type: object
 *                 required: [key, type, otp]
 *                 properties:
 *                   key:
 *                     type: string
 *                   type:
 *                     type: string
 *                   otp:
 *                     type: string
 *                   userId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Upstream response (may be encrypted JSON from upstream)
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/otp/verify', verifyOtpHandler);

module.exports = router;
