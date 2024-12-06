// routes/performanceRoute.js
const express = require('express');
const router = express.Router();
const performanceMonitor = require('../utils/performanceMonitor');

router.get('/stats', (req, res) => {
    const stats = performanceMonitor.getAllStats();
    res.json({
        success: true,
        data: { stats }
    });
});

module.exports = router;
