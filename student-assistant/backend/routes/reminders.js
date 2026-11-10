'use strict';

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { listReminders, createReminder, updateReminder, deleteReminder } = require('../controllers/reminderController');

const router = Router();

router.use(requireAuth);
router.get('/', listReminders);
router.post('/', createReminder);
router.put('/:id', updateReminder);
router.delete('/:id', deleteReminder);

module.exports = router;


