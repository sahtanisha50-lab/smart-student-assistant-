'use strict';

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const sse = require('../lib/sse');

const router = Router();

router.get('/', requireAuth, (req, res) => {
  sse.initStream(req, res);
});

module.exports = router;
