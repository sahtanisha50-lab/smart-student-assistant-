'use strict';

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
		title: { type: String, required: true },
		content: { type: String, default: '' },
		tags: { type: [String], default: [] },
		attachments: {
			files: { type: [String], default: [] } // store URLs or paths
		}
	},
	{ timestamps: true }
);

const Note = mongoose.model('Note', noteSchema);
module.exports = Note;


