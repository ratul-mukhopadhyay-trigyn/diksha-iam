const express = require('express');
const {
  createUserHandler,
  deleteUserHandler,
  getUserHandler,
  updateUserHandler,
} = require('../controllers/users.controller');

const router = express.Router();

router.post('/users', createUserHandler);
router.get('/users/:id', getUserHandler);
router.get('/users', getUserHandler);
router.patch('/users/:id', updateUserHandler);
router.delete('/users/:id', deleteUserHandler);

module.exports = router;
