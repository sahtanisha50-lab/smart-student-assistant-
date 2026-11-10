'use strict';

const Note = require('../models/Note');
const { createNoteSchema, updateNoteSchema } = require('../validators/notes');

async function listNotes(req, res) {
	const notes = await Note.find({ userId: req.userId }).sort({ updatedAt: -1 });
	res.json({ notes });
}

async function createNote(req, res) {
	try {
		const parsed = createNoteSchema.parse(req.body);
		const note = await Note.create({ userId: req.userId, title: parsed.title, content: parsed.content || '', tags: parsed.tags || [] });
		try { const { broadcast } = require('../sse'); broadcast('note:created', note); } catch (_e) {}
		res.status(201).json({ note });
	} catch (err) {
		if (err && err.errors) return res.status(400).json({ error: err.errors });
		return res.status(500).json({ error: 'Create note failed' });
	}
}

async function updateNote(req, res) {
	try {
		const parsed = updateNoteSchema.parse(req.body);
		const { id } = req.params;
		const note = await Note.findOneAndUpdate(
			{ _id: id, userId: req.userId },
			{ $set: parsed },
			{ new: true }
		);
		if (!note) return res.status(404).json({ error: 'Not found' });
		try { const { broadcast } = require('../sse'); broadcast('note:updated', note); } catch (_e) {}
		res.json({ note });
	} catch (err) {
		if (err && err.errors) return res.status(400).json({ error: err.errors });
		return res.status(500).json({ error: 'Update note failed' });
	}
}

async function deleteNote(req, res) {
	const { id } = req.params;
	const deleted = await Note.findOneAndDelete({ _id: id, userId: req.userId });
	if (!deleted) return res.status(404).json({ error: 'Not found' });
	try { const { broadcast } = require('../sse'); broadcast('note:deleted', { id }); } catch (_e) {}
	res.json({ success: true });
}

module.exports = { listNotes, createNote, updateNote, deleteNote };


