'use strict';

const Reminder = require('../models/Reminder');
const { createReminderSchema, updateReminderSchema } = require('../validators/reminders');

async function listReminders(req, res) {
	const reminders = await Reminder.find({ userId: req.userId }).sort({ dueAt: 1 });
	res.json({ reminders });
}

async function createReminder(req, res) {
	try {
		const parsed = createReminderSchema.parse(req.body);
			const reminder = await Reminder.create({ userId: req.userId, title: parsed.title, dueAt: parsed.dueAt, type: parsed.type || 'other', notes: parsed.notes || '' });
			try { const { broadcast } = require('../sse'); broadcast('reminder:created', reminder); } catch (_e) {}
			res.status(201).json({ reminder });
	} catch (err) {
		if (err && err.errors) return res.status(400).json({ error: err.errors });
		return res.status(500).json({ error: 'Create reminder failed' });
	}
}

async function updateReminder(req, res) {
	try {
		const parsed = updateReminderSchema.parse(req.body);
		const { id } = req.params;
		const reminder = await Reminder.findOneAndUpdate(
			{ _id: id, userId: req.userId },
			{ $set: parsed },
			{ new: true }
		);
		if (!reminder) return res.status(404).json({ error: 'Not found' });
		try { const { broadcast } = require('../sse'); broadcast('reminder:updated', reminder); } catch (_e) {}
		res.json({ reminder });
	} catch (err) {
		if (err && err.errors) return res.status(400).json({ error: err.errors });
		return res.status(500).json({ error: 'Update reminder failed' });
	}
}

async function deleteReminder(req, res) {
	const { id } = req.params;
	const deleted = await Reminder.findOneAndDelete({ _id: id, userId: req.userId });
	if (!deleted) return res.status(404).json({ error: 'Not found' });
	try { const { broadcast } = require('../sse'); broadcast('reminder:deleted', { id }); } catch (_e) {}
	res.json({ success: true });
}

module.exports = { listReminders, createReminder, updateReminder, deleteReminder };


