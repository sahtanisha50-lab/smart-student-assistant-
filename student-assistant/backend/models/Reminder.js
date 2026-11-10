'use strict';

const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
		title: { type: String, required: true },
		dueAt: { type: Date, required: true },
		type: { type: String, enum: ['assignment', 'exam', 'project', 'other'], default: 'other' },
		notes: { type: String, default: '' },
		completed: { type: Boolean, default: false }
	},
	{ timestamps: true }
);

const Reminder = mongoose.model('Reminder', reminderSchema);
module.exports = Reminder;


