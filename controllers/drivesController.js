/**
 * Placement Drives Controller
 * Native MongoDB Driver Implementation (STRICT: No Mongoose)
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
 * Create a new placement drive
 * POST /api/drives
 */
async function createDrive(req, res, next) {
  try {
    const db = getDB();
    const drivesCol = db.collection('drives');

    const {
      companyName,
      role,
      ctc,
      minCgpa,
      eligibleBranches,
      deadline,
      description = '',
      status = 'Active'
    } = req.body;

    // Validation
    if (!companyName || !role || ctc === undefined || minCgpa === undefined || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: companyName, role, ctc, minCgpa, deadline'
      });
    }

    const numericCtc = parseFloat(ctc);
    const numericMinCgpa = parseFloat(minCgpa);
    const deadlineDate = new Date(deadline);

    if (isNaN(numericCtc) || numericCtc <= 0) {
      return res.status(400).json({ success: false, message: 'CTC must be a positive number' });
    }

    if (isNaN(numericMinCgpa) || numericMinCgpa < 0 || numericMinCgpa > 10) {
      return res.status(400).json({ success: false, message: 'Minimum CGPA must be between 0 and 10' });
    }

    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid deadline date format' });
    }

    let branches = [];
    if (Array.isArray(eligibleBranches)) {
      branches = eligibleBranches.map(b => b.trim().toUpperCase()).filter(Boolean);
    } else if (typeof eligibleBranches === 'string') {
      branches = eligibleBranches.split(',').map(b => b.trim().toUpperCase()).filter(Boolean);
    }

    const newDrive = {
      companyName: companyName.trim(),
      role: role.trim(),
      ctc: numericCtc,
      minCgpa: numericMinCgpa,
      eligibleBranches: branches,
      deadline: deadlineDate,
      description: description.trim(),
      status: ['Active', 'Closed'].includes(status) ? status : 'Active',
      applicants: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await drivesCol.insertOne(newDrive);

    return res.status(201).json({
      success: true,
      message: 'Placement drive created successfully',
      data: {
        _id: result.insertedId,
        ...newDrive
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all drives with filters
 * GET /api/drives
 */
async function getDrives(req, res, next) {
  try {
    const db = getDB();
    const drivesCol = db.collection('drives');

    const { status, search, sortBy = 'deadline', sortOrder = 'asc' } = req.query;

    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      query.$or = [
        { companyName: { $regex: cleanSearch, $options: 'i' } },
        { role: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    const sort = {};
    const validSortFields = ['deadline', 'ctc', 'minCgpa', 'companyName', 'createdAt'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'deadline';
    sort[field] = sortOrder === 'desc' ? -1 : 1;

    const drives = await drivesCol.find(query).sort(sort).toArray();

    // Map summary metrics for each drive
    const drivesWithStats = drives.map(drive => {
      const applicants = drive.applicants || [];
      const stats = {
        totalApplicants: applicants.length,
        applied: applicants.filter(a => a.status === 'Applied').length,
        shortlisted: applicants.filter(a => a.status === 'Shortlisted').length,
        selected: applicants.filter(a => a.status === 'Selected').length,
        rejected: applicants.filter(a => a.status === 'Rejected').length
      };

      const isExpired = new Date() > new Date(drive.deadline);

      return {
        ...drive,
        stats,
        isExpired
      };
    });

    return res.status(200).json({
      success: true,
      count: drivesWithStats.length,
      data: drivesWithStats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single drive with full applicant details populated
 * GET /api/drives/:id
 */
async function getDriveById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Drive ID format' });
    }

    const db = getDB();
    const drivesCol = db.collection('drives');
    const studentsCol = db.collection('students');

    const drive = await drivesCol.findOne({ _id: new ObjectId(id) });
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    const applicants = drive.applicants || [];
    const studentIds = applicants.map(a => a.studentId);

    // Fetch student profiles for applicants
    let detailedApplicants = [];
    if (studentIds.length > 0) {
      const students = await studentsCol.find(
        { _id: { $in: studentIds } },
        { projection: { name: 1, rollNo: 1, email: 1, branch: 1, cgpa: 1, skills: 1, placementStatus: 1, resumeLink: 1 } }
      ).toArray();

      const studentMap = new Map(students.map(s => [s._id.toString(), s]));

      detailedApplicants = applicants.map(app => {
        const studentInfo = studentMap.get(app.studentId.toString()) || null;
        return {
          studentId: app.studentId,
          status: app.status,
          appliedAt: app.appliedAt,
          notes: app.notes || '',
          student: studentInfo
        };
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...drive,
        applicants: detailedApplicants,
        applicantCount: detailedApplicants.length
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update drive details
 * PUT /api/drives/:id
 */
async function updateDrive(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Drive ID format' });
    }

    const db = getDB();
    const drivesCol = db.collection('drives');

    const updateFields = {};
    const allowed = ['companyName', 'role', 'ctc', 'minCgpa', 'eligibleBranches', 'deadline', 'description', 'status'];

    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'ctc' || field === 'minCgpa') {
          updateFields[field] = parseFloat(req.body[field]);
        } else if (field === 'deadline') {
          updateFields[field] = new Date(req.body[field]);
        } else if (field === 'eligibleBranches') {
          if (Array.isArray(req.body.eligibleBranches)) {
            updateFields.eligibleBranches = req.body.eligibleBranches.map(b => b.trim().toUpperCase()).filter(Boolean);
          } else if (typeof req.body.eligibleBranches === 'string') {
            updateFields.eligibleBranches = req.body.eligibleBranches.split(',').map(b => b.trim().toUpperCase()).filter(Boolean);
          }
        } else {
          updateFields[field] = req.body[field];
        }
      }
    });

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid update fields provided' });
    }

    updateFields.updatedAt = new Date();

    const result = await drivesCol.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Drive updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update drive status (Active / Closed)
 * PATCH /api/drives/:id/status
 */
async function updateDriveStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Drive ID format' });
    }

    if (!['Active', 'Closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "Active" or "Closed"' });
    }

    const db = getDB();
    const drivesCol = db.collection('drives');

    const result = await drivesCol.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Drive status changed to ${status}`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a placement drive
 * DELETE /api/drives/:id
 */
async function deleteDrive(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Drive ID format' });
    }

    const db = getDB();
    const drivesCol = db.collection('drives');

    const result = await drivesCol.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Drive deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Apply a student to a placement drive
 * Atomic update using $addToSet / $push condition
 * POST /api/drives/:id/apply
 */
async function applyToDrive(req, res, next) {
  try {
    const { id: driveId } = req.params;
    const { studentId, notes = '' } = req.body;

    if (!isValidObjectId(driveId) || !isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: 'Valid Drive ID and Student ID are required' });
    }

    const db = getDB();
    const drivesCol = db.collection('drives');
    const studentsCol = db.collection('students');

    const driveObjId = new ObjectId(driveId);
    const studentObjId = new ObjectId(studentId);

    // Verify Drive
    const drive = await drivesCol.findOne({ _id: driveObjId });
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    if (drive.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Cannot apply: This placement drive is Closed' });
    }

    if (new Date() > new Date(drive.deadline)) {
      return res.status(400).json({ success: false, message: 'Cannot apply: Application deadline has passed' });
    }

    // Verify Student
    const student = await studentsCol.findOne({ _id: studentObjId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check Eligibility Criteria
    if (student.cgpa < drive.minCgpa) {
      return res.status(400).json({
        success: false,
        message: `Eligibility failed: Minimum CGPA required is ${drive.minCgpa}, but student has ${student.cgpa}`
      });
    }

    if (drive.eligibleBranches && drive.eligibleBranches.length > 0) {
      if (!drive.eligibleBranches.includes(student.branch)) {
        return res.status(400).json({
          success: false,
          message: `Eligibility failed: Drive is open to [${drive.eligibleBranches.join(', ')}], but student is in ${student.branch}`
        });
      }
    }

    // Check if already applied
    const alreadyApplied = drive.applicants?.some(a => a.studentId.toString() === studentId);
    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: `Student "${student.name}" has already applied to this drive.`
      });
    }

    const newApplicant = {
      studentId: studentObjId,
      status: 'Applied',
      appliedAt: new Date(),
      notes: notes.trim()
    };

    // Atomic update preventing race condition
    const updateResult = await drivesCol.updateOne(
      {
        _id: driveObjId,
        'applicants.studentId': { $ne: studentObjId }
      },
      {
        $push: { applicants: newApplicant },
        $set: { updatedAt: new Date() }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not apply. Application already exists or drive was updated.'
      });
    }

    // If student status is Unplaced, update to In-Process
    if (student.placementStatus === 'Unplaced') {
      await studentsCol.updateOne(
        { _id: studentObjId },
        { $set: { placementStatus: 'In-Process', updatedAt: new Date() } }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Successfully applied ${student.name} to ${drive.companyName}`,
      data: newApplicant
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update candidate stage inside drive applicants array
 * Uses Native Positional Operator ($)
 * PATCH /api/drives/:id/candidates/:studentId
 */
async function updateCandidateStage(req, res, next) {
  try {
    const { id: driveId, studentId } = req.params;
    const { stage, notes } = req.body;

    if (!isValidObjectId(driveId) || !isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: 'Valid Drive ID and Student ID are required' });
    }

    const validStages = ['Applied', 'Shortlisted', 'Selected', 'Rejected'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage. Stage must be one of: ${validStages.join(', ')}`
      });
    }

    const db = getDB();
    const drivesCol = db.collection('drives');
    const studentsCol = db.collection('students');

    const driveObjId = new ObjectId(driveId);
    const studentObjId = new ObjectId(studentId);

    // Positional update query
    const setQuery = {
      'applicants.$.status': stage,
      'applicants.$.updatedAt': new Date(),
      updatedAt: new Date()
    };

    if (notes !== undefined) {
      setQuery['applicants.$.notes'] = notes;
    }

    const driveUpdate = await drivesCol.updateOne(
      {
        _id: driveObjId,
        'applicants.studentId': studentObjId
      },
      {
        $set: setQuery
      }
    );

    if (driveUpdate.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Applicant record not found in this drive'
      });
    }

    // If selected, automatically mark student as Placed with company and CTC!
    if (stage === 'Selected') {
      const drive = await drivesCol.findOne({ _id: driveObjId });
      if (drive) {
        await studentsCol.updateOne(
          { _id: studentObjId },
          {
            $set: {
              placementStatus: 'Placed',
              placedCompany: drive.companyName,
              packageOffered: drive.ctc,
              updatedAt: new Date()
            }
          }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `Candidate stage updated to "${stage}" successfully`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createDrive,
  getDrives,
  getDriveById,
  updateDrive,
  updateDriveStatus,
  deleteDrive,
  applyToDrive,
  updateCandidateStage
};
