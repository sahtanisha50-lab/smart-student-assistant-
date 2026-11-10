'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { registerSchema, loginSchema } = require('../validators/auth');

const ACCESS_EXPIRES = process.env.ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.REFRESH_EXPIRES || '7d';
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

function signAccessToken(userId) {
	return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(userId) {
	return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

async function register(req, res, next) {
	try {
		const parsed = registerSchema.parse(req.body);
		const { name, email, password } = parsed;
		const exists = await User.findOne({ email });
		if (exists) return res.status(409).json({ error: 'Email already in use' });
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await User.create({ name, email, passwordHash });
		const accessToken = signAccessToken(user._id.toString());
		const refreshToken = signRefreshToken(user._id.toString());
		user.refreshToken = refreshToken;
		await user.save();
		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000
		});
		res.status(201).json({ accessToken, user: { id: user._id, name: user.name, email: user.email } });
	} catch (err) {
		next(err);
	}
}

async function login(req, res, next) {
	try {
		const parsed = loginSchema.parse(req.body);
		const { email, password } = parsed;
		const user = await User.findOne({ email });
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });
		const ok = await user.comparePassword(password);
		if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
		const accessToken = signAccessToken(user._id.toString());
		const refreshToken = signRefreshToken(user._id.toString());
		user.refreshToken = refreshToken;
		await user.save();
		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000
		});
		res.json({ accessToken, user: { id: user._id, name: user.name, email: user.email } });
	} catch (err) {
		next(err);
	}
}

async function refreshToken(req, res, next) {
	try {
		const token = req.cookies && req.cookies.refreshToken;
		if (!token) return res.status(401).json({ error: 'Missing refresh token' });
		let payload;
		try {
			payload = jwt.verify(token, REFRESH_SECRET);
		} catch (err) {
			return res.status(401).json({ error: 'Invalid refresh token' });
		}
		const userId = payload.sub;
		const user = await User.findById(userId);
		if (!user || !user.refreshToken || user.refreshToken !== token) {
			return res.status(401).json({ error: 'Invalid refresh token' });
		}
		// rotate refresh token
		const newAccess = signAccessToken(userId);
		const newRefresh = signRefreshToken(userId);
		user.refreshToken = newRefresh;
		await user.save();
		res.cookie('refreshToken', newRefresh, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000
		});
		res.json({ accessToken: newAccess, user: { id: user._id, name: user.name, email: user.email } });
	} catch (err) {
		next(err);
	}
}

async function logout(req, res, next) {
	try {
		const token = req.cookies && req.cookies.refreshToken;
		if (token) {
			try {
				const payload = jwt.verify(token, REFRESH_SECRET);
				const user = await User.findById(payload.sub);
				if (user) {
					user.refreshToken = undefined;
					await user.save();
				}
			} catch (_e) {
				// ignore
			}
		}
		res.clearCookie('refreshToken');
		res.json({ ok: true });
	} catch (err) {
		next(err);
	}
}

module.exports = { register, login, refreshToken, logout };


