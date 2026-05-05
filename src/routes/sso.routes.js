const express = require('express');
const { getSsoUrl } = require('../controllers/sso.controller');

const router = express.Router();

/**
 * @swagger
 * /sso:
 *   get:
 *     summary: Generate LMS SSO URL for a user
 *     tags: [SSO]
 *     description: Provide exactly one of email or phone as a query parameter.
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: User email (mutually exclusive with phone)
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: User phone (mutually exclusive with email)
 *     responses:
 *       200:
 *         description: SSO URL generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ssoUrl:
 *                   type: string
 *       400:
 *         description: Must provide exactly one identifier
 *       404:
 *         description: User not found
 *       422:
 *         description: User data incomplete
 */
router.get('/sso', getSsoUrl);

module.exports = router;
