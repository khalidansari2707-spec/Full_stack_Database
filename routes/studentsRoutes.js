/**
 * Student Routes
 */

const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/studentsController');

// Bulk upload route (placed before :id to prevent conflict)
router.post('/bulk', studentsController.bulkUpload);

// CRUD routes
router.post('/', studentsController.createStudent);
router.get('/', studentsController.getStudents);
router.get('/:id', studentsController.getStudentById);
router.put('/:id', studentsController.updateStudent);
router.delete('/:id', studentsController.deleteStudent);

module.exports = router;
