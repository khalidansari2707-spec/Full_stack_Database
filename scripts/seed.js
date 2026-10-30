/**
 * Database Seeder Script
 * Populates realistic sample data for Students, Drives, and Applications
 * Run via: npm run seed
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'placement_management_db';

async function seedData() {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log('🌱 [Seeder] Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);

    console.log(`🧹 [Seeder] Cleaning existing collections in "${DB_NAME}"...`);
    await db.collection('students').deleteMany({});
    await db.collection('drives').deleteMany({});

    console.log('📝 [Seeder] Inserting Students...');
    const studentsData = [
      {
        _id: new ObjectId(),
        name: 'Aarav Sharma',
        rollNo: '21CS001',
        email: 'aarav.sharma@campus.edu',
        branch: 'CSE',
        cgpa: 9.4,
        skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'System Design'],
        placementStatus: 'Placed',
        placedCompany: 'Google',
        packageOffered: 32.5,
        resumeLink: 'https://example.com/resumes/aarav.pdf',
        createdAt: new Date('2026-08-10')
      },
      {
        _id: new ObjectId(),
        name: 'Ananya Verma',
        rollNo: '21CS002',
        email: 'ananya.verma@campus.edu',
        branch: 'CSE',
        cgpa: 9.1,
        skills: ['Python', 'Machine Learning', 'TensorFlow', 'FastAPI', 'Docker'],
        placementStatus: 'Placed',
        placedCompany: 'Microsoft',
        packageOffered: 28.0,
        resumeLink: 'https://example.com/resumes/ananya.pdf',
        createdAt: new Date('2026-08-12')
      },
      {
        _id: new ObjectId(),
        name: 'Rohan Gupta',
        rollNo: '21IT001',
        email: 'rohan.gupta@campus.edu',
        branch: 'IT',
        cgpa: 8.8,
        skills: ['Java', 'Spring Boot', 'Microservices', 'PostgreSQL', 'AWS'],
        placementStatus: 'Placed',
        placedCompany: 'Amazon',
        packageOffered: 24.5,
        resumeLink: 'https://example.com/resumes/rohan.pdf',
        createdAt: new Date('2026-08-15')
      },
      {
        _id: new ObjectId(),
        name: 'Ishita Patel',
        rollNo: '21IT002',
        email: 'ishita.patel@campus.edu',
        branch: 'IT',
        cgpa: 8.6,
        skills: ['React', 'TypeScript', 'Tailwind', 'GraphQL', 'Next.js'],
        placementStatus: 'Placed',
        placedCompany: 'Cisco',
        packageOffered: 16.0,
        resumeLink: 'https://example.com/resumes/ishita.pdf',
        createdAt: new Date('2026-08-16')
      },
      {
        _id: new ObjectId(),
        name: 'Kavya Nair',
        rollNo: '21EC001',
        email: 'kavya.nair@campus.edu',
        branch: 'ECE',
        cgpa: 8.5,
        skills: ['Embedded C', 'IoT', 'Python', 'Verilog', 'MATLAB'],
        placementStatus: 'Placed',
        placedCompany: 'Deloitte',
        packageOffered: 10.5,
        resumeLink: 'https://example.com/resumes/kavya.pdf',
        createdAt: new Date('2026-08-18')
      },
      {
        _id: new ObjectId(),
        name: 'Vikram Aditya',
        rollNo: '21CS015',
        email: 'vikram.aditya@campus.edu',
        branch: 'CSE',
        cgpa: 8.9,
        skills: ['Go', 'Kubernetes', 'Cloud Architecture', 'Linux', 'Docker'],
        placementStatus: 'In-Process',
        placedCompany: null,
        packageOffered: null,
        resumeLink: 'https://example.com/resumes/vikram.pdf',
        createdAt: new Date('2026-08-20')
      },
      {
        _id: new ObjectId(),
        name: 'Pooja Reddy',
        rollNo: '21EC010',
        email: 'pooja.reddy@campus.edu',
        branch: 'ECE',
        cgpa: 7.9,
        skills: ['C++', 'Data Structures', 'Algorithms', 'Computer Networks'],
        placementStatus: 'In-Process',
        placedCompany: null,
        packageOffered: null,
        resumeLink: 'https://example.com/resumes/pooja.pdf',
        createdAt: new Date('2026-08-22')
      },
      {
        _id: new ObjectId(),
        name: 'Devendra Meena',
        rollNo: '21ME005',
        email: 'devendra.meena@campus.edu',
        branch: 'ME',
        cgpa: 7.8,
        skills: ['AutoCAD', 'SolidWorks', 'ANSYS', 'Python for CAD', 'Robotics'],
        placementStatus: 'Placed',
        placedCompany: 'Tata Consultancy Services',
        packageOffered: 7.5,
        resumeLink: 'https://example.com/resumes/devendra.pdf',
        createdAt: new Date('2026-08-25')
      },
      {
        _id: new ObjectId(),
        name: 'Sneha Kulkarni',
        rollNo: '21CS034',
        email: 'sneha.kulkarni@campus.edu',
        branch: 'CSE',
        cgpa: 8.2,
        skills: ['Flutter', 'Dart', 'Mobile Dev', 'Firebase', 'REST APIs'],
        placementStatus: 'In-Process',
        placedCompany: null,
        packageOffered: null,
        resumeLink: 'https://example.com/resumes/sneha.pdf',
        createdAt: new Date('2026-08-28')
      },
      {
        _id: new ObjectId(),
        name: 'Aditya Sen',
        rollNo: '21EE012',
        email: 'aditya.sen@campus.edu',
        branch: 'EE',
        cgpa: 7.4,
        skills: ['Power Systems', 'Circuit Design', 'MATLAB', 'PLC Automation'],
        placementStatus: 'Unplaced',
        placedCompany: null,
        packageOffered: null,
        resumeLink: 'https://example.com/resumes/aditya.pdf',
        createdAt: new Date('2026-09-01')
      },
      {
        _id: new ObjectId(),
        name: 'Tanvi Joshi',
        rollNo: '21IT023',
        email: 'tanvi.joshi@campus.edu',
        branch: 'IT',
        cgpa: 8.7,
        skills: ['Cybersecurity', 'Ethical Hacking', 'Linux Security', 'Python'],
        placementStatus: 'Unplaced',
        placedCompany: null,
        packageOffered: null,
        resumeLink: 'https://example.com/resumes/tanvi.pdf',
        createdAt: new Date('2026-09-02')
      },
      {
        _id: new ObjectId(),
        name: 'Harshvardhan Rao',
        rollNo: '21CE008',
        email: 'harsh.rao@campus.edu',
        branch: 'CIVIL',
        cgpa: 7.1,
        skills: ['AutoCAD', 'Structural Analysis', 'Project Management', 'Excel'],
        placementStatus: 'Unplaced',
        placedCompany: null,
        packageOffered: null,
        resumeLink: 'https://example.com/resumes/harsh.pdf',
        createdAt: new Date('2026-09-05')
      }
    ];

    await db.collection('students').insertMany(studentsData);
    console.log(`✅ [Seeder] Inserted ${studentsData.length} students.`);

    console.log('🏢 [Seeder] Inserting Placement Drives...');
    const now = new Date();
    const futureDate = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const pastDate = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const drivesData = [
      {
        _id: new ObjectId(),
        companyName: 'Google',
        role: 'Software Development Engineer (SWE)',
        ctc: 32.5,
        minCgpa: 8.5,
        eligibleBranches: ['CSE', 'IT'],
        deadline: futureDate(14),
        description: 'Full-time campus hiring for core software engineering infrastructure and cloud applications.',
        status: 'Active',
        applicants: [
          {
            studentId: studentsData[0]._id, // Aarav Sharma
            status: 'Selected',
            appliedAt: new Date('2026-09-01'),
            notes: 'Strong algorithms and system design performance'
          },
          {
            studentId: studentsData[5]._id, // Vikram Aditya
            status: 'Shortlisted',
            appliedAt: new Date('2026-09-02'),
            notes: 'Cleared online assessment with 100% score'
          }
        ],
        createdAt: new Date('2026-08-25')
      },
      {
        _id: new ObjectId(),
        companyName: 'Microsoft',
        role: 'Cloud Solution Engineer',
        ctc: 28.0,
        minCgpa: 8.0,
        eligibleBranches: ['CSE', 'IT', 'ECE'],
        deadline: futureDate(10),
        description: 'Join Azure core services engineering and distributed platform development.',
        status: 'Active',
        applicants: [
          {
            studentId: studentsData[1]._id, // Ananya Verma
            status: 'Selected',
            appliedAt: new Date('2026-09-05'),
            notes: 'Exceptional distributed computing project'
          },
          {
            studentId: studentsData[6]._id, // Pooja Reddy
            status: 'Shortlisted',
            appliedAt: new Date('2026-09-06'),
            notes: 'Technical round 2 scheduled'
          }
        ],
        createdAt: new Date('2026-08-28')
      },
      {
        _id: new ObjectId(),
        companyName: 'Amazon',
        role: 'SDE-1 (Retail & AWS)',
        ctc: 24.5,
        minCgpa: 7.5,
        eligibleBranches: ['CSE', 'IT'],
        deadline: futureDate(7),
        description: 'Campus recruitment for backend services, high-throughput microservices and data pipelines.',
        status: 'Active',
        applicants: [
          {
            studentId: studentsData[2]._id, // Rohan Gupta
            status: 'Selected',
            appliedAt: new Date('2026-09-08'),
            notes: 'Offer extended and accepted'
          },
          {
            studentId: studentsData[8]._id, // Sneha Kulkarni
            status: 'Applied',
            appliedAt: new Date('2026-09-10'),
            notes: 'Awaiting online assessment link'
          }
        ],
        createdAt: new Date('2026-09-01')
      },
      {
        _id: new ObjectId(),
        companyName: 'Cisco',
        role: 'Network & Security Engineer',
        ctc: 16.0,
        minCgpa: 7.0,
        eligibleBranches: ['CSE', 'IT', 'ECE', 'EE'],
        deadline: futureDate(20),
        description: 'Build enterprise switching, security threat defense, and software-defined network control planes.',
        status: 'Active',
        applicants: [
          {
            studentId: studentsData[3]._id, // Ishita Patel
            status: 'Selected',
            appliedAt: new Date('2026-09-05'),
            notes: 'Great domain knowledge'
          },
          {
            studentId: studentsData[10]._id, // Tanvi Joshi
            status: 'Applied',
            appliedAt: new Date('2026-09-12'),
            notes: 'Resume verified'
          }
        ],
        createdAt: new Date('2026-09-03')
      },
      {
        _id: new ObjectId(),
        companyName: 'Deloitte',
        role: 'Technology Analyst',
        ctc: 10.5,
        minCgpa: 6.5,
        eligibleBranches: ['CSE', 'IT', 'ECE', 'EE', 'ME', 'CIVIL'],
        deadline: futureDate(25),
        description: 'Consulting and technology advisory for global digital transformation and ERP initiatives.',
        status: 'Active',
        applicants: [
          {
            studentId: studentsData[4]._id, // Kavya Nair
            status: 'Selected',
            appliedAt: new Date('2026-09-10'),
            notes: 'Offered position'
          },
          {
            studentId: studentsData[9]._id, // Aditya Sen
            status: 'Applied',
            appliedAt: new Date('2026-09-15'),
            notes: 'Applied'
          }
        ],
        createdAt: new Date('2026-09-08')
      },
      {
        _id: new ObjectId(),
        companyName: 'Tata Consultancy Services',
        role: 'Digital Cadre Engineer',
        ctc: 7.5,
        minCgpa: 6.0,
        eligibleBranches: ['CSE', 'IT', 'ECE', 'EE', 'ME', 'CIVIL'],
        deadline: pastDate(5),
        description: 'National Qualifier hiring cycle - Digital Cadre development and enterprise solutions.',
        status: 'Closed',
        applicants: [
          {
            studentId: studentsData[7]._id, // Devendra Meena
            status: 'Selected',
            appliedAt: pastDate(15),
            notes: 'Selected'
          }
        ],
        createdAt: pastDate(25)
      }
    ];

    await db.collection('drives').insertMany(drivesData);
    console.log(`✅ [Seeder] Inserted ${drivesData.length} placement drives.`);

    console.log('\n🎉 [Seeder] Database successfully seeded with rich placement records!');
  } catch (error) {
    console.error('❌ [Seeder] Error seeding database:', error);
  } finally {
    await client.close();
    console.log('🔒 [Seeder] Connection closed.');
  }
}

// Run immediately if called directly
if (require.main === module) {
  seedData().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seedData;
