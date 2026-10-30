/**
 * Students Controller
 * Production-ready CRUD using Native MongoDB Driver (No Mongoose)
 */

const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

/**
 * Helper to validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return ObjectId.isValid(id) && (String(new ObjectId(id)) === id);
};

/**
 * Create a new student
 * POST /api/students
 */
async function createStudent(req, res, next) {
  try {
    const db = getDB();
    const studentsCol = db.collection('students');

    const {
      name,
      rollNo,
      email,
      branch,
      cgpa,
      skills,
      placementStatus = 'Unplaced',
      placedCompany = null,
      packageOffered = null,
      resumeLink = ''
    } = req.body;

    // Basic Validation
    if (!name || !rollNo || !email || !branch || cgpa === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: name, rollNo, email, branch, cgpa'
      });
    }

    const numericCgpa = parseFloat(cgpa);
    if (isNaN(numericCgpa) || numericCgpa < 0 || numericCgpa > 10) {
      return res.status(400).json({
        success: false,
        message: 'CGPA must be a valid number between 0 and 10'
      });
    }

    // Check unique rollNo
    const existing = await studentsCol.findOne({ rollNo: rollNo.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Student with Roll Number "${rollNo}" already exists.`
      });
    }

    // Format skills array
    let skillsArray = [];
    if (Array.isArray(skills)) {
      skillsArray = skills.map(s => s.trim()).filter(Boolean);
    } else if (typeof skills === 'string') {
      skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    const newStudent = {
      name: name.trim(),
      rollNo: rollNo.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      branch: branch.trim().toUpperCase(),
      cgpa: numericCgpa,
      skills: skillsArray,
      placementStatus: ['Placed', 'In-Process', 'Unplaced'].includes(placementStatus)
        ? placementStatus
        : 'Unplaced',
      placedCompany: placedCompany ? placedCompany.trim() : null,
      packageOffered: packageOffered ? parseFloat(packageOffered) : null,
      resumeLink: resumeLink ? resumeLink.trim() : '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await studentsCol.insertOne(newStudent);

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: {
        _id: result.insertedId,
        ...newStudent
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate key error: Roll number or unique attribute already exists'
      });
    }
    next(error);
  }
}

/**
 * Get Paginated students with filters & search
 * GET /api/students
 */
async function getStudents(req, res, next) {
  try {
    const db = getDB();
    const studentsCol = db.collection('students');

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const {
      search,
      branch,
      minCgpa,
      maxCgpa,
      placementStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // 1. Text or Regex search on name, rollNo, and skills
    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { rollNo: { $regex: cleanSearch, $options: 'i' } },
        { skills: { $regex: cleanSearch, $options: 'i' } },
        { placedCompany: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    // 2. Branch Filter
    if (branch && branch !== 'ALL') {
      query.branch = branch.trim().toUpperCase();
    }

    // 3. Placement Status Filter
    if (placementStatus && placementStatus !== 'ALL') {
      query.placementStatus = placementStatus;
    }

    // 4. CGPA Range Filter
    if (minCgpa !== undefined || maxCgpa !== undefined) {
      query.cgpa = {};
      if (minCgpa !== undefined && !isNaN(parseFloat(minCgpa))) {
        query.cgpa.$gte = parseFloat(minCgpa);
      }
      if (maxCgpa !== undefined && !isNaN(parseFloat(maxCgpa))) {
        query.cgpa.$lte = parseFloat(maxCgpa);
      }
      if (Object.keys(query.cgpa).length === 0) {
        delete query.cgpa;
      }
    }

    // Sort definition
    const sort = {};
    const validSortFields = ['name', 'rollNo', 'cgpa', 'branch', 'placementStatus', 'createdAt', 'packageOffered'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sort[field] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries in parallel
    const [students, totalCount] = await Promise.all([
      studentsCol.find(query).sort(sort).skip(skip).limit(limit).toArray(),
      studentsCol.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      success: true,
      data: students,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single student by ID
 * GET /api/students/:id
 */
async function getStudentById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Student ID format' });
    }

    const db = getDB();
    const studentsCol = db.collection('students');
    const drivesCol = db.collection('drives');

    const student = await studentsCol.findOne({ _id: new ObjectId(id) });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Find all drives applied by this student
    const appliedDrives = await drivesCol.find({
      'applicants.studentId': new ObjectId(id)
    }, {
      projection: {
        companyName: 1,
        role: 1,
        ctc: 1,
        status: 1,
        deadline: 1,
        applicants: { $elemMatch: { studentId: new ObjectId(id) } }
      }
    }).toArray();

    return res.status(200).json({
      success: true,
      data: {
        ...student,
        appliedDrives
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update student by ID
 * PUT /api/students/:id
 */
async function updateStudent(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Student ID format' });
    }

    const db = getDB();
    const studentsCol = db.collection('students');

    const updateFields = {};
    const allowedFields = [
      'name', 'email', 'branch', 'cgpa', 'skills',
      'placementStatus', 'placedCompany', 'packageOffered', 'resumeLink'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'cgpa' || field === 'packageOffered') {
          updateFields[field] = req.body[field] !== null && req.body[field] !== ''
            ? parseFloat(req.body[field])
            : null;
        } else if (field === 'skills') {
          if (Array.isArray(req.body.skills)) {
            updateFields.skills = req.body.skills.map(s => s.trim()).filter(Boolean);
          } else if (typeof req.body.skills === 'string') {
            updateFields.skills = req.body.skills.split(',').map(s => s.trim()).filter(Boolean);
          }
        } else if (field === 'branch') {
          updateFields.branch = req.body.branch.trim().toUpperCase();
        } else {
          updateFields[field] = req.body[field];
        }
      }
    });

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update' });
    }

    // Set updated timestamp
    updateFields.updatedAt = new Date();

    const result = await studentsCol.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete student by ID
 * DELETE /api/students/:id
 */
async function deleteStudent(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Student ID format' });
    }

    const db = getDB();
    const studentsCol = db.collection('students');
    const drivesCol = db.collection('drives');

    const studentObjectId = new ObjectId(id);

    const deleteResult = await studentsCol.deleteOne({ _id: studentObjectId });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Pull student from any drives applicants list
    await drivesCol.updateMany(
      { 'applicants.studentId': studentObjectId },
      { $pull: { applicants: { studentId: studentObjectId } } }
    );

    return res.status(200).json({
      success: true,
      message: 'Student deleted successfully and removed from all placement drives'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk upload students (JSON array)
 * POST /api/students/bulk
 */
async function bulkUpload(req, res, next) {
  try {
    const db = getDB();
    const studentsCol = db.collection('students');

    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payload must contain a non-empty array of students under "students" key'
      });
    }

    const formattedStudents = [];
    const skippedRecords = [];

    students.forEach((s, idx) => {
      if (!s.name || !s.rollNo || !s.email || !s.branch || s.cgpa === undefined) {
        skippedRecords.push({ index: idx, rollNo: s.rollNo || 'UNKNOWN', reason: 'Missing required fields' });
        return;
      }

      let skillsArray = [];
      if (Array.isArray(s.skills)) {
        skillsArray = s.skills.map(skill => String(skill).trim()).filter(Boolean);
      } else if (typeof s.skills === 'string') {
        skillsArray = s.skills.split(',').map(skill => skill.trim()).filter(Boolean);
      }

      formattedStudents.push({
        name: String(s.name).trim(),
        rollNo: String(s.rollNo).trim().toUpperCase(),
        email: String(s.email).trim().toLowerCase(),
        branch: String(s.branch).trim().toUpperCase(),
        cgpa: parseFloat(s.cgpa) || 0.0,
        skills: skillsArray,
        placementStatus: ['Placed', 'In-Process', 'Unplaced'].includes(s.placementStatus)
          ? s.placementStatus
          : 'Unplaced',
        placedCompany: s.placedCompany ? String(s.placedCompany).trim() : null,
        packageOffered: s.packageOffered ? parseFloat(s.packageOffered) : null,
        resumeLink: s.resumeLink ? String(s.resumeLink).trim() : '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    if (formattedStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid student records found to insert',
        skippedRecords
      });
    }

    // Native insertMany with ordered: false to continue on duplicate errors
    let insertedCount = 0;
    try {
      const result = await studentsCol.insertMany(formattedStudents, { ordered: false });
      insertedCount = result.insertedCount;
    } catch (insertError) {
      if (insertError.writeErrors) {
        insertedCount = insertError.result?.nInserted || (formattedStudents.length - insertError.writeErrors.length);
        insertError.writeErrors.forEach(err => {
          skippedRecords.push({
            rollNo: formattedStudents[err.index]?.rollNo,
            reason: err.code === 11000 ? 'Duplicate rollNo' : err.errmsg
          });
        });
      } else {
        throw insertError;
      }
    }

    return res.status(201).json({
      success: true,
      message: `Bulk import completed. Inserted ${insertedCount} students.`,
      insertedCount,
      skippedCount: skippedRecords.length,
      skippedRecords
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  bulkUpload
};
