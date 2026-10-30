/**
 * Analytics & Statistics Controller
 * Advanced MongoDB Aggregation Pipelines ($match, $group, $facet, $project)
 * Native MongoDB Driver (No Mongoose)
 */

const { getDB } = require('../config/db');

/**
 * Get placement metrics & dashboard analytics
 * GET /api/stats/overview
 */
async function getOverviewStats(req, res, next) {
  try {
    const db = getDB();
    const studentsCol = db.collection('students');
    const drivesCol = db.collection('drives');

    // Multi-faceted aggregation on students collection
    const [studentStatsFacet] = await studentsCol.aggregate([
      {
        $facet: {
          // 1. Overall Totals & CTC Metrics
          overall: [
            {
              $group: {
                _id: null,
                totalStudents: { $sum: 1 },
                placedStudents: {
                  $sum: {
                    $cond: [{ $eq: ['$placementStatus', 'Placed'] }, 1, 0]
                  }
                },
                inProcessStudents: {
                  $sum: {
                    $cond: [{ $eq: ['$placementStatus', 'In-Process'] }, 1, 0]
                  }
                },
                unplacedStudents: {
                  $sum: {
                    $cond: [{ $eq: ['$placementStatus', 'Unplaced'] }, 1, 0]
                  }
                },
                avgCgpa: { $avg: '$cgpa' }
              }
            }
          ],

          // 2. CTC Metrics for Placed Students
          ctcMetrics: [
            {
              $match: {
                placementStatus: 'Placed',
                packageOffered: { $ne: null, $gt: 0 }
              }
            },
            {
              $group: {
                _id: null,
                highestCtc: { $max: '$packageOffered' },
                averageCtc: { $avg: '$packageOffered' },
                lowestCtc: { $min: '$packageOffered' },
                placedCountWithCtc: { $sum: 1 }
              }
            }
          ],

          // 3. Branch-wise Placement Breakdown
          branchWise: [
            {
              $group: {
                _id: '$branch',
                total: { $sum: 1 },
                placed: {
                  $sum: {
                    $cond: [{ $eq: ['$placementStatus', 'Placed'] }, 1, 0]
                  }
                },
                inProcess: {
                  $sum: {
                    $cond: [{ $eq: ['$placementStatus', 'In-Process'] }, 1, 0]
                  }
                },
                unplaced: {
                  $sum: {
                    $cond: [{ $eq: ['$placementStatus', 'Unplaced'] }, 1, 0]
                  }
                },
                avgCgpa: { $avg: '$cgpa' },
                avgCtc: {
                  $avg: {
                    $cond: [
                      { $eq: ['$placementStatus', 'Placed'] },
                      '$packageOffered',
                      null
                    ]
                  }
                }
              }
            },
            {
              $project: {
                branch: '$_id',
                total: 1,
                placed: 1,
                inProcess: 1,
                unplaced: 1,
                avgCgpa: { $round: ['$avgCgpa', 2] },
                avgCtc: { $round: ['$avgCtc', 2] },
                placementRate: {
                  $cond: [
                    { $gt: ['$total', 0] },
                    { $round: [{ $multiply: [{ $divide: ['$placed', '$total'] }, 100] }, 1] },
                    0
                  ]
                }
              }
            },
            { $sort: { total: -1 } }
          ],

          // 4. Top Recruiting Companies
          topCompanies: [
            {
              $match: {
                placementStatus: 'Placed',
                placedCompany: { $ne: null, $ne: '' }
              }
            },
            {
              $group: {
                _id: '$placedCompany',
                hires: { $sum: 1 },
                maxCtc: { $max: '$packageOffered' },
                avgCtc: { $avg: '$packageOffered' }
              }
            },
            {
              $project: {
                company: '$_id',
                hires: 1,
                maxCtc: { $round: ['$maxCtc', 2] },
                avgCtc: { $round: ['$avgCtc', 2] }
              }
            },
            { $sort: { hires: -1, avgCtc: -1 } },
            { $limit: 6 }
          ],

          // 5. In-Demand Skills among Placed Students
          topSkills: [
            { $unwind: '$skills' },
            {
              $group: {
                _id: { $toLower: '$skills' },
                count: { $sum: 1 },
                placedCount: {
                  $sum: {
                    $cond: [{ $eq: ['$placementStatus', 'Placed'] }, 1, 0]
                  }
                }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 8 }
          ]
        }
      }
    ]).toArray();

    // Aggregation on Drives collection
    const [driveStats] = await drivesCol.aggregate([
      {
        $facet: {
          drivesSummary: [
            {
              $group: {
                _id: null,
                totalDrives: { $sum: 1 },
                activeDrives: {
                  $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
                },
                closedDrives: {
                  $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] }
                },
                highestDriveCtc: { $max: '$ctc' },
                avgDriveCtc: { $avg: '$ctc' }
              }
            }
          ],
          totalApplications: [
            { $unwind: { path: '$applicants', preserveNullAndEmptyArrays: false } },
            {
              $group: {
                _id: '$applicants.status',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]).toArray();

    // Normalize results
    const overall = studentStatsFacet?.overall[0] || {
      totalStudents: 0,
      placedStudents: 0,
      inProcessStudents: 0,
      unplacedStudents: 0,
      avgCgpa: 0
    };

    const ctc = studentStatsFacet?.ctcMetrics[0] || {
      highestCtc: 0,
      averageCtc: 0,
      lowestCtc: 0
    };

    const drivesSummary = driveStats?.drivesSummary[0] || {
      totalDrives: 0,
      activeDrives: 0,
      closedDrives: 0,
      highestDriveCtc: 0,
      avgDriveCtc: 0
    };

    const placementRate = overall.totalStudents > 0
      ? Number(((overall.placedStudents / overall.totalStudents) * 100).toFixed(1))
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        kpi: {
          totalStudents: overall.totalStudents,
          placedStudents: overall.placedStudents,
          inProcessStudents: overall.inProcessStudents,
          unplacedStudents: overall.unplacedStudents,
          placementRate,
          highestCtc: Number((ctc.highestCtc || drivesSummary.highestDriveCtc || 0).toFixed(2)),
          averageCtc: Number((ctc.averageCtc || 0).toFixed(2)),
          activeDrives: drivesSummary.activeDrives,
          totalDrives: drivesSummary.totalDrives
        },
        branchWise: studentStatsFacet?.branchWise || [],
        topCompanies: studentStatsFacet?.topCompanies || [],
        topSkills: studentStatsFacet?.topSkills || [],
        applicationStages: driveStats?.totalApplications || []
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverviewStats
};
