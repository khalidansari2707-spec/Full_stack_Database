/**
 * Campus Placement Management System - Frontend Application Logic
 * Vanilla JavaScript (ES6+ async/await, Fetch API)
 * Zero External Frameworks
 */

(function () {
  'use strict';

  // ==================== STATE MANAGEMENT ====================
  const state = {
    currentTab: 'tab-overview',
    stats: null,
    students: [],
    drives: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      limit: 10
    },
    studentFilters: {
      search: '',
      branch: 'ALL',
      placementStatus: 'ALL',
      minCgpa: 0
    },
    driveFilterStatus: 'ALL',
    driveSearch: '',
    selectedPipelineDriveId: null,
    selectedDriveForApply: null,
    editingStudentId: null,
    editingDriveId: null
  };

  // ==================== 1. API SERVICE LAYER ====================
  async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(endpoint, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error on [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  // ==================== 2. TOAST NOTIFICATION SYSTEM ====================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-solid fa-circle-info';
    if (type === 'success') iconClass = 'fa-solid fa-circle-check';
    if (type === 'error') iconClass = 'fa-solid fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="${iconClass}"></i>
      <span class="toast-msg">${escapeHtml(message)}</span>
      <button class="toast-close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ==================== 3. TAB NAVIGATION ====================
  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const pageHeading = document.getElementById('page-heading');
    const pageSubheading = document.getElementById('page-subheading');

    const headings = {
      'tab-overview': {
        title: 'Analytics & Metrics',
        sub: 'Live campus placement overview, real-time KPI stats & distribution'
      },
      'tab-students': {
        title: 'Student Directory',
        sub: 'Explore, filter, and manage registered campus candidates and placement status'
      },
      'tab-drives': {
        title: 'Placement Drives',
        sub: 'Campus recruitment drives, active hiring cycles, and company criteria'
      },
      'tab-pipeline': {
        title: 'Application Board',
        sub: 'Candidate recruitment pipeline: Applied, Shortlisted, Selected, and Rejected stages'
      }
    };

    navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  }

  function switchTab(tabId) {
    state.currentTab = tabId;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(el => {
      el.classList.toggle('active', el.id === tabId);
    });

    const pageHeading = document.getElementById('page-heading');
    const pageSubheading = document.getElementById('page-subheading');

    const meta = {
      'tab-overview': ['Analytics & Metrics', 'Live campus placement overview, real-time KPI stats & distribution'],
      'tab-students': ['Student Directory', 'Explore, filter, and manage registered campus candidates and placement status'],
      'tab-drives': ['Placement Drives', 'Campus recruitment drives, active hiring cycles, and company criteria'],
      'tab-pipeline': ['Application Board', 'Candidate recruitment pipeline: Applied, Shortlisted, Selected, and Rejected stages']
    }[tabId];

    if (meta && pageHeading) {
      pageHeading.textContent = meta[0];
      pageSubheading.textContent = meta[1];
    }

    // Refresh tab data
    if (tabId === 'tab-overview') loadStats();
    if (tabId === 'tab-students') loadStudents();
    if (tabId === 'tab-drives') loadDrives();
    if (tabId === 'tab-pipeline') loadPipelineBoard(state.selectedPipelineDriveId);

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }

  // ==================== 4. TAB 1: OVERVIEW & STATS ====================
  async function loadStats() {
    try {
      const res = await apiCall('/api/stats/overview');
      if (res.success && res.data) {
        state.stats = res.data;
        renderStats(res.data);
      }
    } catch (err) {
      showToast('Could not load overview statistics', 'error');
    }
  }

  function renderStats(data) {
    const kpi = data.kpi || {};

    // Header mini stats
    const headerRate = document.getElementById('header-placement-rate');
    const headerDrives = document.getElementById('header-active-drives');
    if (headerRate) headerRate.textContent = `${kpi.placementRate || 0}%`;
    if (headerDrives) headerDrives.textContent = `${kpi.activeDrives || 0} Companies`;

    // Sidebar counters
    const sbStudents = document.getElementById('sidebar-student-count');
    const sbDrives = document.getElementById('sidebar-drives-count');
    if (sbStudents) sbStudents.textContent = kpi.totalStudents || 0;
    if (sbDrives) sbDrives.textContent = kpi.activeDrives || 0;

    // KPI Cards
    const totalEl = document.getElementById('kpi-total-students');
    const unplacedEl = document.getElementById('kpi-unplaced-students');
    const rateEl = document.getElementById('kpi-placement-rate');
    const placedEl = document.getElementById('kpi-placed-students');
    const highestCtcEl = document.getElementById('kpi-highest-ctc');
    const avgCtcEl = document.getElementById('kpi-avg-ctc');
    const activeDrivesEl = document.getElementById('kpi-active-drives');
    const totalDrivesEl = document.getElementById('kpi-total-drives');

    if (totalEl) totalEl.textContent = kpi.totalStudents || 0;
    if (unplacedEl) unplacedEl.textContent = `${kpi.unplacedStudents || 0} Unplaced • ${kpi.inProcessStudents || 0} In-Process`;
    if (rateEl) rateEl.textContent = `${kpi.placementRate || 0}%`;
    if (placedEl) placedEl.textContent = `${kpi.placedStudents || 0} Students Placed`;
    if (highestCtcEl) highestCtcEl.textContent = `₹${kpi.highestCtc || 0} LPA`;
    if (avgCtcEl) avgCtcEl.textContent = `Avg Package: ₹${kpi.averageCtc || 0} LPA`;
    if (activeDrivesEl) activeDrivesEl.textContent = kpi.activeDrives || 0;
    if (totalDrivesEl) totalDrivesEl.textContent = `${kpi.totalDrives || 0} Total Drives`;

    // Branch Progress Bars
    const branchContainer = document.getElementById('branch-bars-container');
    if (branchContainer) {
      if (!data.branchWise || data.branchWise.length === 0) {
        branchContainer.innerHTML = '<div class="col-empty">No branch placement data available yet.</div>';
      } else {
        branchContainer.innerHTML = data.branchWise.map(b => {
          const rate = b.placementRate || 0;
          return `
            <div class="branch-bar-item">
              <div class="branch-bar-meta">
                <span class="branch-name">
                  <span class="branch-pill">${escapeHtml(b.branch)}</span>
                  <span>${b.placed} / ${b.total} Placed</span>
                </span>
                <span class="branch-stats-detail">
                  ${rate}% (${b.avgCtc ? `₹${b.avgCtc} LPA Avg` : 'No Offers'})
                </span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${rate}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Top Recruiting Companies
    const companiesContainer = document.getElementById('top-companies-list');
    if (companiesContainer) {
      if (!data.topCompanies || data.topCompanies.length === 0) {
        companiesContainer.innerHTML = '<div class="col-empty">No placed company offers recorded yet.</div>';
      } else {
        companiesContainer.innerHTML = data.topCompanies.map(c => `
          <div class="company-item-card">
            <div class="company-info-wrap">
              <div class="company-avatar">${escapeHtml(c.company.substring(0, 2).toUpperCase())}</div>
              <div class="company-names">
                <h4>${escapeHtml(c.company)}</h4>
                <span>${c.hires} Candidate${c.hires > 1 ? 's' : ''} Hired</span>
              </div>
            </div>
            <div class="company-ctc-badge">
              <span class="ctc-amount">₹${c.maxCtc} LPA</span>
              <span class="ctc-hires">Top Package</span>
            </div>
          </div>
        `).join('');
      }
    }

    // Top In-Demand Skills Cloud
    const skillsCloud = document.getElementById('top-skills-cloud');
    if (skillsCloud) {
      if (!data.topSkills || data.topSkills.length === 0) {
        skillsCloud.innerHTML = '<span class="text-muted">No skill data available.</span>';
      } else {
        skillsCloud.innerHTML = data.topSkills.map(s => `
          <div class="skill-tag-cloud">
            <span>${escapeHtml(s._id)}</span>
            <span class="count">${s.count}</span>
          </div>
        `).join('');
      }
    }

    // Pipeline Stages Summary
    const stagesContainer = document.getElementById('stages-summary-grid');
    if (stagesContainer) {
      const stageMap = { Applied: 0, Shortlisted: 0, Selected: 0, Rejected: 0 };
      (data.applicationStages || []).forEach(st => {
        if (stageMap[st._id] !== undefined) stageMap[st._id] = st.count;
      });

      stagesContainer.innerHTML = `
        <div class="stage-stat-box">
          <span class="count text-cyan">${stageMap.Applied}</span>
          <span class="label">Applied</span>
        </div>
        <div class="stage-stat-box">
          <span class="count text-indigo">${stageMap.Shortlisted}</span>
          <span class="label">Shortlisted</span>
        </div>
        <div class="stage-stat-box">
          <span class="count text-emerald">${stageMap.Selected}</span>
          <span class="label">Selected (Placed)</span>
        </div>
        <div class="stage-stat-box">
          <span class="count text-muted">${stageMap.Rejected}</span>
          <span class="label">Rejected</span>
        </div>
      `;
    }
  }

  // ==================== 5. TAB 2: STUDENTS DIRECTORY ====================
  async function loadStudents() {
    const tableBody = document.getElementById('students-table-body');
    if (!tableBody) return;

    // Show loading skeleton
    tableBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="skeleton-loader-bar"></div>
          <div class="skeleton-loader-bar"></div>
          <div class="skeleton-loader-bar"></div>
        </td>
      </tr>
    `;

    try {
      const { search, branch, placementStatus, minCgpa } = state.studentFilters;
      const { currentPage, limit } = state.pagination;

      const params = new URLSearchParams({
        page: currentPage,
        limit
      });

      if (search) params.append('search', search);
      if (branch && branch !== 'ALL') params.append('branch', branch);
      if (placementStatus && placementStatus !== 'ALL') params.append('placementStatus', placementStatus);
      if (minCgpa > 0) params.append('minCgpa', minCgpa);

      const res = await apiCall(`/api/students?${params.toString()}`);

      if (res.success) {
        state.students = res.data || [];
        state.pagination = res.pagination || state.pagination;
        renderStudentsTable();
      }
    } catch (err) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <i class="fa-solid fa-triangle-exclamation text-rose"></i>
              <h4>Failed to load students</h4>
              <p>${escapeHtml(err.message)}</p>
            </div>
          </td>
        </tr>
      `;
    }
  }

  function renderStudentsTable() {
    const tableBody = document.getElementById('students-table-body');
    const paginationInfo = document.getElementById('pagination-info');
    const pageIndicator = document.getElementById('current-page-indicator');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');

    if (!tableBody) return;

    const { totalCount, currentPage, totalPages, limit } = state.pagination;
    const students = state.students;

    // Update pagination info
    const start = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
    const end = Math.min(currentPage * limit, totalCount);
    if (paginationInfo) paginationInfo.textContent = `Showing ${start} to ${end} of ${totalCount} students`;
    if (pageIndicator) pageIndicator.textContent = `${currentPage} / ${totalPages || 1}`;
    if (btnPrev) btnPrev.disabled = currentPage <= 1;
    if (btnNext) btnNext.disabled = currentPage >= totalPages;

    if (students.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <i class="fa-solid fa-user-slash"></i>
              <h4>No students found</h4>
              <p>Try modifying your search or filter criteria, or add a new student.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = students.map(s => {
      // Status Badge class
      let statusClass = 'unplaced';
      if (s.placementStatus === 'Placed') statusClass = 'placed';
      if (s.placementStatus === 'In-Process') statusClass = 'in-process';

      // CGPA Pill class
      let cgpaClass = 'cgpa-avg';
      if (s.cgpa >= 8.5) cgpaClass = 'cgpa-high';
      else if (s.cgpa >= 7.5) cgpaClass = 'cgpa-mid';

      // Skills tags
      const skillsHtml = (s.skills || []).slice(0, 3).map(sk =>
        `<span class="skill-mini">${escapeHtml(sk)}</span>`
      ).join('');
      const extraSkillsCount = (s.skills || []).length > 3 ? `<span class="skill-mini">+${s.skills.length - 3}</span>` : '';

      // Placement Company & CTC
      let placementInfo = '<span class="text-muted">—</span>';
      if (s.placementStatus === 'Placed') {
        placementInfo = `
          <div>
            <strong class="text-emerald">${escapeHtml(s.placedCompany || 'Company')}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">
              ₹${s.packageOffered || 0} LPA
            </div>
          </div>
        `;
      } else if (s.placementStatus === 'In-Process') {
        placementInfo = '<span class="text-amber" style="font-size:0.8rem;"><i class="fa-solid fa-clock"></i> In Interviews</span>';
      }

      const initials = s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      return `
        <tr data-student-id="${s._id}">
          <td>
            <div class="student-cell">
              <div class="student-avatar">${escapeHtml(initials)}</div>
              <div class="student-info">
                <span class="student-name">${escapeHtml(s.name)}</span>
                <span class="student-email">${escapeHtml(s.email)}</span>
              </div>
            </div>
          </td>
          <td><span class="roll-badge">${escapeHtml(s.rollNo)}</span></td>
          <td><span class="branch-pill">${escapeHtml(s.branch)}</span></td>
          <td><span class="cgpa-pill ${cgpaClass}">${s.cgpa.toFixed(2)}</span></td>
          <td><div class="skills-tags">${skillsHtml}${extraSkillsCount}</div></td>
          <td><span class="status-badge ${statusClass}">${escapeHtml(s.placementStatus)}</span></td>
          <td>${placementInfo}</td>
          <td>
            <div class="table-actions">
              <button class="action-btn btn-view-student" data-id="${s._id}" title="View Profile">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="action-btn btn-edit-student" data-id="${s._id}" title="Edit Student">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="action-btn btn-delete btn-delete-student" data-id="${s._id}" data-name="${escapeHtml(s.name)}" title="Delete Student">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Wire table row action listeners
    tableBody.querySelectorAll('.btn-view-student').forEach(btn => {
      btn.addEventListener('click', () => viewStudent(btn.getAttribute('data-id')));
    });

    tableBody.querySelectorAll('.btn-edit-student').forEach(btn => {
      btn.addEventListener('click', () => openStudentModal(btn.getAttribute('data-id')));
    });

    tableBody.querySelectorAll('.btn-delete-student').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        confirmDeleteStudent(id, name);
      });
    });
  }

  function initStudentFilters() {
    const searchInput = document.getElementById('filter-student-search');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const branchSelect = document.getElementById('filter-student-branch');
    const statusSelect = document.getElementById('filter-student-status');
    const cgpaSlider = document.getElementById('filter-student-cgpa');
    const cgpaDisplay = document.getElementById('filter-cgpa-display');
    const btnReset = document.getElementById('btn-reset-filters');
    const pageSizeSelect = document.getElementById('students-page-size');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');

    const debouncedSearch = debounce(() => {
      state.studentFilters.search = searchInput.value.trim();
      state.pagination.currentPage = 1;
      loadStudents();
    }, 350);

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        if (clearSearchBtn) {
          clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
        }
        debouncedSearch();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        state.studentFilters.search = '';
        state.pagination.currentPage = 1;
        loadStudents();
      });
    }

    if (branchSelect) {
      branchSelect.addEventListener('change', () => {
        state.studentFilters.branch = branchSelect.value;
        state.pagination.currentPage = 1;
        loadStudents();
      });
    }

    if (statusSelect) {
      statusSelect.addEventListener('change', () => {
        state.studentFilters.placementStatus = statusSelect.value;
        state.pagination.currentPage = 1;
        loadStudents();
      });
    }

    if (cgpaSlider) {
      cgpaSlider.addEventListener('input', () => {
        const val = parseFloat(cgpaSlider.value) || 0;
        if (cgpaDisplay) cgpaDisplay.textContent = val.toFixed(1);
        state.studentFilters.minCgpa = val;
        state.pagination.currentPage = 1;
        debouncedSearch();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';
        if (branchSelect) branchSelect.value = 'ALL';
        if (statusSelect) statusSelect.value = 'ALL';
        if (cgpaSlider) cgpaSlider.value = 0;
        if (cgpaDisplay) cgpaDisplay.textContent = '0.0';

        state.studentFilters = { search: '', branch: 'ALL', placementStatus: 'ALL', minCgpa: 0 };
        state.pagination.currentPage = 1;
        loadStudents();
        showToast('Filters reset to default', 'info');
      });
    }

    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', () => {
        state.pagination.limit = parseInt(pageSizeSelect.value, 10);
        state.pagination.currentPage = 1;
        loadStudents();
      });
    }

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (state.pagination.currentPage > 1) {
          state.pagination.currentPage--;
          loadStudents();
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (state.pagination.currentPage < state.pagination.totalPages) {
          state.pagination.currentPage++;
          loadStudents();
        }
      });
    }
  }

  // ==================== 6. STUDENT CRUD MODAL ====================
  function openStudentModal(studentId = null) {
    state.editingStudentId = studentId;
    const modal = document.getElementById('student-modal');
    const form = document.getElementById('student-form');
    const modalTitle = document.getElementById('student-modal-title');
    const extraFields = document.getElementById('placement-extra-fields');
    const statusSelect = document.getElementById('student-status');

    if (!modal || !form) return;
    form.reset();

    const rollInput = document.getElementById('student-roll');
    if (rollInput) rollInput.disabled = false;

    if (statusSelect && extraFields) {
      statusSelect.onchange = () => {
        extraFields.style.display = statusSelect.value === 'Placed' ? 'flex' : 'none';
      };
    }

    if (studentId) {
      modalTitle.innerHTML = '<i class="fa-solid fa-user-pen text-indigo"></i> Edit Student Profile';
      const student = state.students.find(s => s._id === studentId);
      if (student) {
        document.getElementById('student-form-id').value = student._id;
        document.getElementById('student-name').value = student.name || '';
        document.getElementById('student-roll').value = student.rollNo || '';
        document.getElementById('student-roll').disabled = true; // Roll number unique key
        document.getElementById('student-email').value = student.email || '';
        document.getElementById('student-branch').value = student.branch || 'CSE';
        document.getElementById('student-cgpa').value = student.cgpa || '';
        document.getElementById('student-status').value = student.placementStatus || 'Unplaced';
        document.getElementById('student-skills').value = (student.skills || []).join(', ');
        document.getElementById('student-company').value = student.placedCompany || '';
        document.getElementById('student-package').value = student.packageOffered || '';
        document.getElementById('student-resume').value = student.resumeLink || '';

        extraFields.style.display = student.placementStatus === 'Placed' ? 'flex' : 'none';
      }
    } else {
      modalTitle.innerHTML = '<i class="fa-solid fa-user-plus text-indigo"></i> Add New Student';
      document.getElementById('student-form-id').value = '';
      extraFields.style.display = 'none';
    }

    openModal('student-modal');
  }

  async function handleStudentFormSubmit(e) {
    e.preventDefault();
    const studentId = state.editingStudentId;

    const name = document.getElementById('student-name').value.trim();
    const rollNo = document.getElementById('student-roll').value.trim();
    const email = document.getElementById('student-email').value.trim();
    const branch = document.getElementById('student-branch').value;
    const cgpa = parseFloat(document.getElementById('student-cgpa').value);
    const placementStatus = document.getElementById('student-status').value;
    const skillsRaw = document.getElementById('student-skills').value;
    const placedCompany = document.getElementById('student-company').value.trim();
    const packageOffered = document.getElementById('student-package').value;
    const resumeLink = document.getElementById('student-resume').value.trim();

    if (!name || !rollNo || !email || !branch || isNaN(cgpa)) {
      showToast('Please fill all required student fields correctly', 'error');
      return;
    }

    const payload = {
      name,
      rollNo,
      email,
      branch,
      cgpa,
      placementStatus,
      skills: skillsRaw,
      placedCompany: placementStatus === 'Placed' ? placedCompany : null,
      packageOffered: placementStatus === 'Placed' && packageOffered ? parseFloat(packageOffered) : null,
      resumeLink
    };

    const saveBtn = document.getElementById('btn-save-student');
    if (saveBtn) saveBtn.disabled = true;

    try {
      if (studentId) {
        // Update existing student
        const res = await apiCall(`/api/students/${studentId}`, 'PUT', payload);
        if (res.success) {
          showToast(`Student "${name}" updated successfully`, 'success');
          closeModal('student-modal');
          loadStudents();
          loadStats();
        }
      } else {
        // Create new student
        const res = await apiCall('/api/students', 'POST', payload);
        if (res.success) {
          showToast(`Student "${name}" registered successfully!`, 'success');
          closeModal('student-modal');
          loadStudents();
          loadStats();
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  async function confirmDeleteStudent(id, name) {
    if (!confirm(`Are you sure you want to delete student "${name}"? This will also remove them from all placement drive applications.`)) {
      return;
    }

    try {
      const res = await apiCall(`/api/students/${id}`, 'DELETE');
      if (res.success) {
        showToast(`Student "${name}" deleted successfully`, 'success');
        loadStudents();
        loadStats();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function viewStudent(id) {
    const modalBody = document.getElementById('student-view-body');
    if (!modalBody) return;

    modalBody.innerHTML = '<div class="skeleton-loader-card"></div><div class="skeleton-loader-bar"></div>';
    openModal('student-view-modal');

    try {
      const res = await apiCall(`/api/students/${id}`);
      if (res.success && res.data) {
        const s = res.data;
        const appliedDrives = s.appliedDrives || [];

        modalBody.innerHTML = `
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:18px;">
            <div class="student-avatar" style="width:54px; height:54px; font-size:1.3rem;">
              ${escapeHtml(s.name.substring(0, 2).toUpperCase())}
            </div>
            <div>
              <h3 style="font-size:1.2rem; color:#fff;">${escapeHtml(s.name)}</h3>
              <p style="color:var(--text-muted); font-size:0.85rem;">${escapeHtml(s.email)}</p>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px;">
            <div class="status-card">
              <div>
                <span style="font-size:0.75rem; color:var(--text-dim); text-transform:uppercase;">Roll Number</span>
                <p style="font-family:var(--font-mono); font-weight:700;">${escapeHtml(s.rollNo)}</p>
              </div>
            </div>
            <div class="status-card">
              <div>
                <span style="font-size:0.75rem; color:var(--text-dim); text-transform:uppercase;">Branch & CGPA</span>
                <p style="font-family:var(--font-mono); font-weight:700;">${escapeHtml(s.branch)} • CGPA ${s.cgpa.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div style="margin-bottom:18px;">
            <h4 style="font-size:0.85rem; color:var(--text-muted); margin-bottom:8px;">KEY SKILLS</h4>
            <div class="skills-tags">
              ${(s.skills || []).map(sk => `<span class="skill-mini">${escapeHtml(sk)}</span>`).join('') || '<span class="text-muted">None specified</span>'}
            </div>
          </div>

          <div style="margin-bottom:18px;">
            <h4 style="font-size:0.85rem; color:var(--text-muted); margin-bottom:8px;">PLACEMENT STATUS</h4>
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="status-badge ${s.placementStatus === 'Placed' ? 'placed' : s.placementStatus === 'In-Process' ? 'in-process' : 'unplaced'}">
                ${escapeHtml(s.placementStatus)}
              </span>
              ${s.placedCompany ? `<strong class="text-emerald">${escapeHtml(s.placedCompany)} (₹${s.packageOffered} LPA)</strong>` : ''}
            </div>
          </div>

          <div>
            <h4 style="font-size:0.85rem; color:var(--text-muted); margin-bottom:8px;">DRIVES APPLIED (${appliedDrives.length})</h4>
            ${appliedDrives.length === 0 ? '<p class="text-muted" style="font-size:0.82rem;">No drives applied yet.</p>' : `
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${appliedDrives.map(d => {
                  const applicant = (d.applicants && d.applicants[0]) || {};
                  return `
                    <div class="company-item-card" style="padding:10px 12px;">
                      <div>
                        <strong>${escapeHtml(d.companyName)}</strong>
                        <div style="font-size:0.75rem; color:var(--text-dim);">${escapeHtml(d.role)} • ₹${d.ctc} LPA</div>
                      </div>
                      <span class="pill ${applicant.status === 'Selected' ? 'pill-ctc' : applicant.status === 'Shortlisted' ? 'pill-branches' : 'pill-cgpa'}">
                        ${escapeHtml(applicant.status || 'Applied')}
                      </span>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        `;
      }
    } catch (err) {
      modalBody.innerHTML = `<p class="text-rose">Failed to load student details: ${escapeHtml(err.message)}</p>`;
    }
  }

  // ==================== 7. TAB 3: PLACEMENT DRIVES ====================
  async function loadDrives() {
    const container = document.getElementById('drives-grid-container');
    if (!container) return;

    container.innerHTML = `
      <div class="skeleton-loader-card"></div>
      <div class="skeleton-loader-card"></div>
      <div class="skeleton-loader-card"></div>
    `;

    try {
      const params = new URLSearchParams();
      if (state.driveFilterStatus && state.driveFilterStatus !== 'ALL') {
        params.append('status', state.driveFilterStatus);
      }
      if (state.driveSearch) {
        params.append('search', state.driveSearch);
      }

      const res = await apiCall(`/api/drives?${params.toString()}`);
      if (res.success) {
        state.drives = res.data || [];
        renderDrivesGrid();
        populatePipelineDriveSelector();
      }
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation text-rose"></i>
          <h4>Failed to load placement drives</h4>
          <p>${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }

  function renderDrivesGrid() {
    const container = document.getElementById('drives-grid-container');
    if (!container) return;

    const drives = state.drives;

    if (drives.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-building-circle-xmark"></i>
          <h4>No placement drives found</h4>
          <p>No active or matching drives. Create a new drive using the button above.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = drives.map(drive => {
      const deadlineDate = new Date(drive.deadline);
      const isExpired = new Date() > deadlineDate;
      const formattedDeadline = deadlineDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const branchTags = (drive.eligibleBranches || []).map(b =>
        `<span class="branch-mini-tag">${escapeHtml(b)}</span>`
      ).join('') || '<span class="branch-mini-tag">Open to All Branches</span>';

      const applicantCount = drive.stats ? drive.stats.totalApplicants : (drive.applicants || []).length;
      const selectedCount = drive.stats ? drive.stats.selected : (drive.applicants || []).filter(a => a.status === 'Selected').length;

      return `
        <div class="drive-card" data-drive-id="${drive._id}">
          <div class="drive-card-header">
            <div class="drive-brand">
              <div class="drive-logo">${escapeHtml(drive.companyName.substring(0, 2).toUpperCase())}</div>
              <div class="drive-titles">
                <h3>${escapeHtml(drive.companyName)}</h3>
                <p>${escapeHtml(drive.role)}</p>
              </div>
            </div>
            <span class="drive-badge-status ${drive.status === 'Active' ? 'active' : 'closed'}">
              ${escapeHtml(drive.status)}
            </span>
          </div>

          <div class="drive-ctc-row">
            <div>
              <span style="font-size:0.72rem; color:var(--text-muted); display:block; text-transform:uppercase;">Package (CTC)</span>
              <span class="ctc-highlight">₹${drive.ctc} LPA</span>
            </div>
            <div class="min-cgpa-spec">
              Min CGPA: <strong>${drive.minCgpa.toFixed(1)}</strong>
            </div>
          </div>

          <div class="drive-criteria">
            <div class="criteria-item">
              <i class="fa-solid fa-graduation-cap"></i>
              <span>Branches:</span>
            </div>
            <div class="branch-tag-list">${branchTags}</div>
          </div>

          <div class="drive-stats-row">
            <span class="drive-applicant-metric">
              <strong>${applicantCount}</strong> Applied • <strong>${selectedCount}</strong> Placed
            </span>
            <span class="deadline-metric ${isExpired ? 'expired' : ''}">
              <i class="fa-regular fa-clock"></i> ${isExpired ? 'Expired' : formattedDeadline}
            </span>
          </div>

          <div class="drive-actions-row">
            <button class="btn btn-primary btn-sm btn-apply-trigger" data-id="${drive._id}" ${drive.status === 'Closed' || isExpired ? 'disabled' : ''}>
              <i class="fa-solid fa-paper-plane"></i> Apply Student
            </button>
            <button class="btn btn-secondary btn-sm btn-pipeline-trigger" data-id="${drive._id}">
              <i class="fa-solid fa-users-viewfinder"></i> Applicants
            </button>
            <button class="btn btn-secondary btn-sm btn-icon-only btn-toggle-status" data-id="${drive._id}" data-current="${drive.status}" title="Toggle Active/Closed">
              <i class="fa-solid ${drive.status === 'Active' ? 'fa-ban' : 'fa-check'}"></i>
            </button>
            <button class="btn btn-secondary btn-sm btn-icon-only btn-delete-drive" data-id="${drive._id}" data-company="${escapeHtml(drive.companyName)}" title="Delete Drive">
              <i class="fa-solid fa-trash-can text-rose"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Wire Card Listeners
    container.querySelectorAll('.btn-apply-trigger').forEach(btn => {
      btn.addEventListener('click', () => openApplyModal(btn.getAttribute('data-id')));
    });

    container.querySelectorAll('.btn-pipeline-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const driveId = btn.getAttribute('data-id');
        state.selectedPipelineDriveId = driveId;
        switchTab('tab-pipeline');
      });
    });

    container.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', () => {
        const driveId = btn.getAttribute('data-id');
        const current = btn.getAttribute('data-current');
        const newStatus = current === 'Active' ? 'Closed' : 'Active';
        toggleDriveStatus(driveId, newStatus);
      });
    });

    container.querySelectorAll('.btn-delete-drive').forEach(btn => {
      btn.addEventListener('click', () => {
        const driveId = btn.getAttribute('data-id');
        const company = btn.getAttribute('data-company');
        confirmDeleteDrive(driveId, company);
      });
    });
  }

  function initDriveFilters() {
    const pillButtons = document.querySelectorAll('.filter-pill');
    const searchInput = document.getElementById('filter-drives-search');

    pillButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        pillButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.driveFilterStatus = btn.getAttribute('data-drive-status');
        loadDrives();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        state.driveSearch = searchInput.value.trim();
        loadDrives();
      }, 350));
    }
  }

  // ==================== 8. CREATE / EDIT DRIVE MODAL ====================
  function openDriveModal(driveId = null) {
    state.editingDriveId = driveId;
    const modal = document.getElementById('drive-modal');
    const form = document.getElementById('drive-form');
    const title = document.getElementById('drive-modal-title');

    if (!modal || !form) return;
    form.reset();

    // Default deadline to 14 days from now
    const now = new Date();
    now.setDate(now.getDate() + 14);
    const deadlineInput = document.getElementById('drive-deadline');
    if (deadlineInput) {
      deadlineInput.value = now.toISOString().slice(0, 16);
    }

    if (driveId) {
      title.innerHTML = '<i class="fa-solid fa-briefcase text-emerald"></i> Edit Placement Drive';
      const drive = state.drives.find(d => d._id === driveId);
      if (drive) {
        document.getElementById('drive-form-id').value = drive._id;
        document.getElementById('drive-company').value = drive.companyName || '';
        document.getElementById('drive-role').value = drive.role || '';
        document.getElementById('drive-ctc').value = drive.ctc || '';
        document.getElementById('drive-min-cgpa').value = drive.minCgpa || '';
        document.getElementById('drive-status').value = drive.status || 'Active';
        document.getElementById('drive-desc').value = drive.description || '';

        if (drive.deadline) {
          deadlineInput.value = new Date(drive.deadline).toISOString().slice(0, 16);
        }

        const branchSelect = document.getElementById('drive-branches');
        if (branchSelect && drive.eligibleBranches) {
          Array.from(branchSelect.options).forEach(opt => {
            opt.selected = drive.eligibleBranches.includes(opt.value);
          });
        }
      }
    } else {
      title.innerHTML = '<i class="fa-solid fa-briefcase text-emerald"></i> Create Placement Drive';
      document.getElementById('drive-form-id').value = '';
    }

    openModal('drive-modal');
  }

  async function handleDriveFormSubmit(e) {
    e.preventDefault();
    const driveId = state.editingDriveId;

    const companyName = document.getElementById('drive-company').value.trim();
    const role = document.getElementById('drive-role').value.trim();
    const ctc = parseFloat(document.getElementById('drive-ctc').value);
    const minCgpa = parseFloat(document.getElementById('drive-min-cgpa').value);
    const deadline = document.getElementById('drive-deadline').value;
    const status = document.getElementById('drive-status').value;
    const description = document.getElementById('drive-desc').value.trim();

    const branchSelect = document.getElementById('drive-branches');
    const selectedBranches = Array.from(branchSelect.selectedOptions).map(opt => opt.value);

    if (!companyName || !role || isNaN(ctc) || isNaN(minCgpa) || !deadline) {
      showToast('Please fill all required drive details', 'error');
      return;
    }

    const payload = {
      companyName,
      role,
      ctc,
      minCgpa,
      eligibleBranches: selectedBranches,
      deadline: new Date(deadline).toISOString(),
      status,
      description
    };

    const saveBtn = document.getElementById('btn-save-drive');
    if (saveBtn) saveBtn.disabled = true;

    try {
      if (driveId) {
        const res = await apiCall(`/api/drives/${driveId}`, 'PUT', payload);
        if (res.success) {
          showToast(`Drive for "${companyName}" updated successfully`, 'success');
          closeModal('drive-modal');
          loadDrives();
          loadStats();
        }
      } else {
        const res = await apiCall('/api/drives', 'POST', payload);
        if (res.success) {
          showToast(`Placement drive for "${companyName}" created!`, 'success');
          closeModal('drive-modal');
          loadDrives();
          loadStats();
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  async function toggleDriveStatus(id, newStatus) {
    try {
      const res = await apiCall(`/api/drives/${id}/status`, 'PATCH', { status: newStatus });
      if (res.success) {
        showToast(res.message, 'success');
        loadDrives();
        loadStats();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function confirmDeleteDrive(id, company) {
    if (!confirm(`Are you sure you want to delete the placement drive for "${company}"?`)) {
      return;
    }

    try {
      const res = await apiCall(`/api/drives/${id}`, 'DELETE');
      if (res.success) {
        showToast('Drive deleted successfully', 'success');
        loadDrives();
        loadStats();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==================== 9. APPLY STUDENT WORKFLOW ====================
  async function openApplyModal(driveId) {
    const drive = state.drives.find(d => d._id === driveId);
    if (!drive) return;

    state.selectedDriveForApply = drive;
    document.getElementById('apply-drive-id').value = drive._id;

    const summaryEl = document.getElementById('apply-drive-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4 style="font-size:1.05rem; color:#fff;">${escapeHtml(drive.companyName)}</h4>
            <span style="color:var(--color-cyan); font-size:0.85rem;">${escapeHtml(drive.role)} • ₹${drive.ctc} LPA</span>
          </div>
          <span class="pill pill-cgpa">Min CGPA: ${drive.minCgpa.toFixed(1)}</span>
        </div>
      `;
    }

    // Populate Student dropdown
    const select = document.getElementById('apply-student-select');
    const notice = document.getElementById('apply-eligibility-msg');
    if (notice) notice.innerHTML = '';

    if (select) {
      select.innerHTML = '<option value="">Loading students...</option>';

      try {
        const res = await apiCall('/api/students?limit=100');
        if (res.success && res.data) {
          const appliedStudentIds = (drive.applicants || []).map(a =>
            typeof a.studentId === 'object' ? a.studentId._id || a.studentId : a.studentId
          );

          select.innerHTML = '<option value="">-- Choose Candidate --</option>' +
            res.data.map(s => {
              const alreadyApplied = appliedStudentIds.includes(s._id);
              const eligibleCgpa = s.cgpa >= drive.minCgpa;
              const eligibleBranch = !drive.eligibleBranches || drive.eligibleBranches.length === 0 || drive.eligibleBranches.includes(s.branch);
              const isEligible = eligibleCgpa && eligibleBranch && !alreadyApplied;

              let suffix = '';
              if (alreadyApplied) suffix = ' (Already Applied)';
              else if (!eligibleCgpa) suffix = ` (CGPA ${s.cgpa} < ${drive.minCgpa})`;
              else if (!eligibleBranch) suffix = ` (Branch ${s.branch} Not Eligible)`;

              return `<option value="${s._id}" data-eligible="${isEligible}" data-reason="${suffix}">
                ${escapeHtml(s.name)} [${s.rollNo} - ${s.branch} - CGPA ${s.cgpa}]${suffix}
              </option>`;
            }).join('');

          select.onchange = () => {
            const selectedOpt = select.selectedOptions[0];
            if (!selectedOpt || !selectedOpt.value) {
              notice.innerHTML = '';
              return;
            }

            const isEligible = selectedOpt.getAttribute('data-eligible') === 'true';
            const reason = selectedOpt.getAttribute('data-reason');

            if (isEligible) {
              notice.className = 'eligibility-notice valid';
              notice.innerHTML = '<i class="fa-solid fa-check-circle"></i> Candidate meets all eligibility criteria!';
            } else {
              notice.className = 'eligibility-notice invalid';
              notice.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Ineligible: ${escapeHtml(reason)}`;
            }
          };
        }
      } catch (err) {
        select.innerHTML = '<option value="">Failed to load candidates</option>';
      }
    }

    openModal('apply-modal');
  }

  async function handleApplyFormSubmit(e) {
    e.preventDefault();
    const driveId = document.getElementById('apply-drive-id').value;
    const studentSelect = document.getElementById('apply-student-select');
    const studentId = studentSelect ? studentSelect.value : null;
    const notes = document.getElementById('apply-notes').value.trim();

    if (!driveId || !studentId) {
      showToast('Please select a student to apply', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-apply');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await apiCall(`/api/drives/${driveId}/apply`, 'POST', {
        studentId,
        notes
      });

      if (res.success) {
        showToast(res.message, 'success');
        closeModal('apply-modal');
        loadDrives();
        loadStudents();
        loadStats();
        if (state.selectedPipelineDriveId === driveId) {
          loadPipelineBoard(driveId);
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // ==================== 10. TAB 4: KANBAN APPLICATION BOARD ====================
  function populatePipelineDriveSelector() {
    const select = document.getElementById('pipeline-drive-select');
    if (!select) return;

    if (state.drives.length === 0) {
      select.innerHTML = '<option value="">No drives available</option>';
      return;
    }

    select.innerHTML = state.drives.map(d =>
      `<option value="${d._id}" ${d._id === state.selectedPipelineDriveId ? 'selected' : ''}>
        ${escapeHtml(d.companyName)} — ${escapeHtml(d.role)} (${d.status})
      </option>`
    ).join('');

    if (!state.selectedPipelineDriveId && state.drives.length > 0) {
      state.selectedPipelineDriveId = state.drives[0]._id;
      select.value = state.selectedPipelineDriveId;
    }

    select.onchange = () => {
      state.selectedPipelineDriveId = select.value;
      loadPipelineBoard(select.value);
    };
  }

  async function loadPipelineBoard(driveId) {
    if (!driveId) {
      if (state.drives.length > 0) {
        driveId = state.drives[0]._id;
        state.selectedPipelineDriveId = driveId;
      } else {
        return;
      }
    }

    // Set select dropdown
    const select = document.getElementById('pipeline-drive-select');
    if (select) select.value = driveId;

    try {
      const res = await apiCall(`/api/drives/${driveId}`);
      if (res.success && res.data) {
        renderPipelineBoard(res.data);
      }
    } catch (err) {
      showToast('Could not load drive pipeline board', 'error');
    }
  }

  function renderPipelineBoard(drive) {
    // Banner stats
    const banner = document.getElementById('pipeline-drive-banner');
    if (banner) {
      banner.style.display = 'flex';
      document.getElementById('banner-ctc').textContent = `₹${drive.ctc} LPA`;
      document.getElementById('banner-min-cgpa').textContent = `Min CGPA: ${drive.minCgpa.toFixed(1)}`;
      document.getElementById('banner-branches').textContent = (drive.eligibleBranches || []).join(', ') || 'All Branches';
      document.getElementById('banner-deadline').textContent = `Deadline: ${new Date(drive.deadline).toLocaleDateString()}`;
    }

    const stages = ['Applied', 'Shortlisted', 'Selected', 'Rejected'];
    const applicantsByStage = {
      Applied: [],
      Shortlisted: [],
      Selected: [],
      Rejected: []
    };

    (drive.applicants || []).forEach(applicant => {
      const stage = applicant.status || 'Applied';
      if (applicantsByStage[stage]) {
        applicantsByStage[stage].push(applicant);
      }
    });

    stages.forEach(stage => {
      const countEl = document.getElementById(`count-${stage}`);
      const cardsWrap = document.getElementById(`cards-${stage}`);

      const stageApplicants = applicantsByStage[stage];
      if (countEl) countEl.textContent = stageApplicants.length;

      if (!cardsWrap) return;

      if (stageApplicants.length === 0) {
        cardsWrap.innerHTML = `<div class="col-empty">No candidates in ${stage}</div>`;
        return;
      }

      cardsWrap.innerHTML = stageApplicants.map(app => {
        const student = app.student || {};
        const studentId = app.studentId;
        const name = student.name || 'Candidate';
        const rollNo = student.rollNo || 'Roll N/A';
        const branch = student.branch || '';
        const cgpa = student.cgpa ? student.cgpa.toFixed(2) : '';

        // Contextual Stage Buttons
        let actionButtonsHtml = '';
        if (stage === 'Applied') {
          actionButtonsHtml = `
            <button class="stage-btn to-shortlist btn-move-stage" data-drive-id="${drive._id}" data-student-id="${studentId}" data-stage="Shortlisted">
              <i class="fa-solid fa-arrow-right"></i> Shortlist
            </button>
            <button class="stage-btn to-reject btn-move-stage" data-drive-id="${drive._id}" data-student-id="${studentId}" data-stage="Rejected">
              <i class="fa-solid fa-xmark"></i> Reject
            </button>
          `;
        } else if (stage === 'Shortlisted') {
          actionButtonsHtml = `
            <button class="stage-btn to-select btn-move-stage" data-drive-id="${drive._id}" data-student-id="${studentId}" data-stage="Selected">
              <i class="fa-solid fa-trophy"></i> Select (Hire)
            </button>
            <button class="stage-btn to-reject btn-move-stage" data-drive-id="${drive._id}" data-student-id="${studentId}" data-stage="Rejected">
              <i class="fa-solid fa-xmark"></i> Reject
            </button>
          `;
        } else if (stage === 'Selected') {
          actionButtonsHtml = `
            <span class="pill pill-ctc" style="width:100%; text-align:center;">
              <i class="fa-solid fa-check"></i> Hired & Placed!
            </span>
          `;
        } else if (stage === 'Rejected') {
          actionButtonsHtml = `
            <button class="stage-btn to-shortlist btn-move-stage" data-drive-id="${drive._id}" data-student-id="${studentId}" data-stage="Applied">
              <i class="fa-solid fa-rotate-left"></i> Re-evaluate
            </button>
          `;
        }

        return `
          <div class="candidate-card" data-student-id="${studentId}">
            <div class="candidate-header">
              <span class="cand-name">${escapeHtml(name)}</span>
              <span class="cand-roll">${escapeHtml(rollNo)}</span>
            </div>
            <div class="cand-meta">
              <span class="branch-pill">${escapeHtml(branch)}</span>
              ${cgpa ? `<span class="cgpa-pill cgpa-mid">CGPA ${cgpa}</span>` : ''}
            </div>
            ${app.notes ? `<div class="cand-notes">${escapeHtml(app.notes)}</div>` : ''}
            <div class="cand-stage-actions">
              ${actionButtonsHtml}
            </div>
          </div>
        `;
      }).join('');
    });

    // Wire stage transition buttons
    document.querySelectorAll('.btn-move-stage').forEach(btn => {
      btn.addEventListener('click', async () => {
        const driveId = btn.getAttribute('data-drive-id');
        const studentId = btn.getAttribute('data-student-id');
        const stage = btn.getAttribute('data-stage');
        await moveCandidateStage(driveId, studentId, stage);
      });
    });
  }

  async function moveCandidateStage(driveId, studentId, stage) {
    try {
      const res = await apiCall(`/api/drives/${driveId}/candidates/${studentId}`, 'PATCH', {
        stage
      });

      if (res.success) {
        showToast(res.message, 'success');
        loadPipelineBoard(driveId);
        loadStats(); // Update placement percentage
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==================== 11. BULK IMPORT MODAL ====================
  function initBulkUpload() {
    const btnOpen = document.getElementById('btn-open-bulk-modal');
    const btnLoadSample = document.getElementById('btn-load-json-sample');
    const btnClear = document.getElementById('btn-clear-bulk');
    const btnSubmit = document.getElementById('btn-submit-bulk');
    const jsonInput = document.getElementById('bulk-json-input');
    const resultBanner = document.getElementById('bulk-result-banner');

    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        if (resultBanner) resultBanner.style.display = 'none';
        openModal('bulk-modal');
      });
    }

    if (btnLoadSample && jsonInput) {
      btnLoadSample.addEventListener('click', () => {
        const sample = [
          {
            name: "Rishi Kapoor",
            rollNo: "21CS088",
            email: "rishi.kapoor@campus.edu",
            branch: "CSE",
            cgpa: 8.65,
            skills: ["React", "TypeScript", "Node.js", "Docker"],
            placementStatus: "Unplaced"
          },
          {
            name: "Priyanka Chopra",
            rollNo: "21IT077",
            email: "priyanka.c@campus.edu",
            branch: "IT",
            cgpa: 9.02,
            skills: ["Python", "TensorFlow", "Kubernetes", "AWS"],
            placementStatus: "Unplaced"
          },
          {
            name: "Manish Tiwari",
            rollNo: "21EC055",
            email: "manish.t@campus.edu",
            branch: "ECE",
            cgpa: 7.8,
            skills: ["Embedded C", "C++", "IoT"],
            placementStatus: "Unplaced"
          }
        ];
        jsonInput.value = JSON.stringify(sample, null, 2);
      });
    }

    if (btnClear && jsonInput) {
      btnClear.addEventListener('click', () => {
        jsonInput.value = '';
        if (resultBanner) resultBanner.style.display = 'none';
      });
    }

    if (btnSubmit && jsonInput) {
      btnSubmit.addEventListener('click', async () => {
        const raw = jsonInput.value.trim();
        if (!raw) {
          showToast('Please provide a valid JSON array of students', 'error');
          return;
        }

        let parsedArray = null;
        try {
          parsedArray = JSON.parse(raw);
          if (!Array.isArray(parsedArray)) {
            throw new Error('Root JSON must be an array of student objects [...]');
          }
        } catch (err) {
          showToast(`Invalid JSON syntax: ${err.message}`, 'error');
          return;
        }

        btnSubmit.disabled = true;

        try {
          const res = await apiCall('/api/students/bulk', 'POST', { students: parsedArray });
          if (res.success) {
            showToast(res.message, 'success');
            if (resultBanner) {
              resultBanner.style.display = 'block';
              resultBanner.style.background = 'rgba(16, 185, 129, 0.15)';
              resultBanner.style.color = 'var(--color-emerald)';
              resultBanner.style.border = '1px solid rgba(16, 185, 129, 0.35)';
              resultBanner.innerHTML = `
                ✅ <strong>Success:</strong> Inserted ${res.insertedCount} records.
                ${res.skippedCount > 0 ? `<br>⚠️ Skipped ${res.skippedCount} duplicates/invalid.` : ''}
              `;
            }
            loadStudents();
            loadStats();
          }
        } catch (err) {
          if (resultBanner) {
            resultBanner.style.display = 'block';
            resultBanner.style.background = 'rgba(239, 68, 68, 0.15)';
            resultBanner.style.color = 'var(--color-rose)';
            resultBanner.style.border = '1px solid rgba(239, 68, 68, 0.35)';
            resultBanner.innerHTML = `❌ <strong>Import Failed:</strong> ${escapeHtml(err.message)}`;
          }
          showToast(err.message, 'error');
        } finally {
          btnSubmit.disabled = false;
        }
      });
    }
  }

  // ==================== 12. GENERAL MODAL UTILITIES ====================
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function initModals() {
    // Close on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal.id);
        }
      });
    });

    // Close on close button click
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        closeModal(modalId);
      });
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach(m => closeModal(m.id));
      }
    });

    // Action button triggers
    const btnAddStudent = document.getElementById('btn-open-add-student');
    if (btnAddStudent) {
      btnAddStudent.addEventListener('click', () => openStudentModal());
    }

    const btnCreateDrive = document.getElementById('btn-open-create-drive');
    if (btnCreateDrive) {
      btnCreateDrive.addEventListener('click', () => openDriveModal());
    }

    const btnQuickSeed = document.getElementById('btn-quick-seed');
    if (btnQuickSeed) {
      btnQuickSeed.addEventListener('click', async () => {
        if (!confirm('Seed sample campus placement dataset into MongoDB? Existing data will be refreshed.')) {
          return;
        }

        btnQuickSeed.disabled = true;
        btnQuickSeed.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Seeding...';

        try {
          const res = await apiCall('/api/stats/seed', 'POST');
          if (res.success) {
            showToast(res.message, 'success');
            loadStats();
            loadStudents();
            loadDrives();
          }
        } catch (err) {
          showToast(`Seeding failed: ${err.message}`, 'error');
        } finally {
          btnQuickSeed.disabled = false;
          btnQuickSeed.innerHTML = '<i class="fa-solid fa-seedling"></i> Seed Sample Data';
        }
      });
    }

    // Form Submissions
    const studentForm = document.getElementById('student-form');
    if (studentForm) studentForm.addEventListener('submit', handleStudentFormSubmit);

    const driveForm = document.getElementById('drive-form');
    if (driveForm) driveForm.addEventListener('submit', handleDriveFormSubmit);

    const applyForm = document.getElementById('apply-form');
    if (applyForm) applyForm.addEventListener('submit', handleApplyFormSubmit);
  }

  // ==================== 13. INITIALIZATION ====================
  function init() {
    initNavigation();
    initStudentFilters();
    initDriveFilters();
    initModals();
    initBulkUpload();

    // Initial Data Fetch
    loadStats();
    loadStudents();
    loadDrives();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
