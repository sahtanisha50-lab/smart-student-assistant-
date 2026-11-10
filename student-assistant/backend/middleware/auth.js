'use strict';

const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;

function requireAuth(req, res, next) {
	const header = req.headers.authorization || '';
	const token = header.startsWith('Bearer ') ? header.slice(7) : '';
	if (!token) return res.status(401).json({ error: 'Missing token' });
	try {
		const payload = jwt.verify(token, ACCESS_SECRET);
		req.userId = payload.sub;
		next();
	} catch (err) {
		if (err && err.name === 'TokenExpiredError') {
			return res.status(401).json({ error: 'Token expired' });
		}
		return res.status(401).json({ error: 'Invalid token' });
	}
}

module.exports = { requireAuth };


