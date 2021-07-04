'use strict';

const express = require('express');
const rep = require('./api/rep');

const router = express.Router();
router.use('/api', api);

router.get('/', function(req, res, next) {
  res.json({ title: 'Hello Express!' });
});

module.exports = router;
