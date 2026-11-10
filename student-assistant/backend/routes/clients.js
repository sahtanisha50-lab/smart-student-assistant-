'use strict';

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { listClients, getClient, createClient, updateClient, deleteClient } = require('../controllers/clientController');

const router = Router();
router.use(requireAuth);

router.get('/', listClients);
router.post('/', createClient);
router.get('/:id', getClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

module.exports = router;
