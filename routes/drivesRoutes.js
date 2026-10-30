/**
 * Placement Drives Routes
 */

const express = require('express');
const router = express.Router();
const drivesController = require('../controllers/drivesController');

// Standard Drive CRUD
router.post('/', drivesController.createDrive);
router.get('/', drivesController.getDrives);
router.get('/:id', drivesController.getDriveById);
router.put('/:id', drivesController.updateDrive);
router.patch('/:id/status', drivesController.updateDriveStatus);
router.delete('/:id', drivesController.deleteDrive);

// Application actions
router.post('/:id/apply', drivesController.applyToDrive);
router.patch('/:id/candidates/:studentId', drivesController.updateCandidateStage);

module.exports = router;
