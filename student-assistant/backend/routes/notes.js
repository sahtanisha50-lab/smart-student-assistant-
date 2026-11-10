'use strict';

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { listNotes, createNote, updateNote, deleteNote } = require('../controllers/noteController');

const router = Router();

router.use(requireAuth);
router.get('/', listNotes);
router.post('/', createNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;


