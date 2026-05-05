const express = require('express');
const {
  createUserHandler,
  deleteUserHandler,
  getUserHandler,
  updateUserHandler,
} = require('../controllers/users.controller');

const router = express.Router();

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a user
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: isEncrypted
 *         schema:
 *           type: boolean
 *           default: true
 *         description: If false, email and username in response are decrypted
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstname, lastname, dob]
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 description: 10 digits
 *                 example: "9876543210"
 *               username:
 *                 type: string
 *                 description: Optional; auto-generated if omitted
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User created successfully.
 *                 userId:
 *                   type: string
 *                 email:
 *                   type: string
 *                   nullable: true
 *                 username:
 *                   type: string
 *       400:
 *         description: Invalid payload or isEncrypted flag
 *       409:
 *         description: Identifier conflict (create)
 *       500:
 *         description: Server error (e.g. username generation exhausted)
 */
router.post('/users', createUserHandler);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: isEncrypted
 *         schema:
 *           type: boolean
 *           default: true
 *         description: If false, decrypt email, phone, username in response
 *     responses:
 *       200:
 *         description: User record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: Full user row from Cassandra (sensitive fields per isEncrypted)
 *       404:
 *         description: User not found or soft-deleted
 */
router.get('/users/:id', getUserHandler);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get user by email or phone
 *     tags: [Users]
 *     description: Exactly one of email or phone must be provided.
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *           format: email
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *       - in: query
 *         name: isEncrypted
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: User record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *       404:
 *         description: User not found or soft-deleted
 *       422:
 *         description: Validation (exactly one of email or phone, format)
 */
router.get('/users', getUserHandler);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update user fields
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Any mutable user fields; id and userid are immutable
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Update succeeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 updatedFields:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: User not found
 *       422:
 *         description: Empty body, validation, or identifier conflict on update
 */
router.patch('/users/:id', updateUserHandler);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Soft-delete user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User soft-deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *       404:
 *         description: User not found or already deleted
 */
router.delete('/users/:id', deleteUserHandler);

module.exports = router;
