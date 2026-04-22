const express = require('express');
const { getSsoUrl } = require('../controllers/sso.controller');

const router = express.Router();

router.get('/sso', getSsoUrl);

module.exports = router;
