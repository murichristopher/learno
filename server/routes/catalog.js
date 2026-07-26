const router = require('express').Router();
const { listWorkspace } = require('../workspace');

router.get('/', (_req, res) => res.json(listWorkspace()));

module.exports = router;
