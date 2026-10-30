/**
 * Statistics & Analytics Routes
 */

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// Overview Metrics & Pipelines
router.get('/overview', statsController.getOverviewStats);

// Database seed endpoint for easy testing
router.post('/seed', async (req, res, next) => {
  try {
    const seedData = require('../scripts/seed');
    await seedData();
    return res.status(200).json({
      success: true,
      message: 'Sample campus placement data successfully seeded into MongoDB!'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

