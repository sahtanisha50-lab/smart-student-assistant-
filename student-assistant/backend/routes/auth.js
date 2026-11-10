'use strict';

const { Router } = require('express');
const { register, login, refreshToken, logout } = require('../controllers/authController');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

module.exports = router;


