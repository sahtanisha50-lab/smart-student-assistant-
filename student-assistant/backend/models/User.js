'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true, index: true },
		passwordHash: { type: String, required: true },
		refreshToken: { type: String },
		settings: {
			theme: { type: String, enum: ['light', 'dark'], default: 'light' }
		}
	},
	{ timestamps: true }
);

userSchema.methods.comparePassword = async function comparePassword(plain) {
	return bcrypt.compare(plain, this.passwordHash);
};

const User = mongoose.model('User', userSchema);
module.exports = User;


