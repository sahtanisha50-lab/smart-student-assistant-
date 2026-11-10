'use strict';

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { generateReply } = require('../services/ai');

const router = Router();

router.use(requireAuth);

router.post('/', async (req, res) => {
	try {
		const { prompt = '' } = req.body || {};
		const reply = await generateReply(prompt);
		res.json({ reply });
	} catch (e) {
		res.status(400).json({ error: e.message || 'AI error' });
	}
});

module.exports = router;


