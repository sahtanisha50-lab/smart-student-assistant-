'use strict';

const { Router } = require('express');
const authRoutes = require('./auth');
const notesRoutes = require('./notes');
const remindersRoutes = require('./reminders');
const chatRoutes = require('./chat');
const clientsRoutes = require('./clients');
const { sseHandler } = require('../sse');

const router = Router();

router.get('/', (_req, res) => {
	res.json({ message: 'API root' });
});

router.use('/auth', authRoutes);
router.use('/notes', notesRoutes);
router.use('/reminders', remindersRoutes);
router.use('/chat', chatRoutes);
router.use('/clients', clientsRoutes);
router.get('/stream', (req, res) => sseHandler(req, res));

module.exports = router;


