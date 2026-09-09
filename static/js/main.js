// ==========================================================================
// National Infrastructure Monitoring & Project Risk Intelligence System (NIM-PRIS)
// Main Platform Controller (Compatible with GitHub Pages, Vercel & Flask)
// ==========================================================================

let activeGovProjects = [];
let selectedProjectIdForDossier = null;
let deferredPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
  initGovPlatform();
});

function initGovPlatform() {
  setupTheme();
  setupPWA();
  setupTabNavigation();
  setupModals();
  setupFilterAndSearch();
  setupMinisterialAdvisor();
  setupGovSimulator();
  loadAllGovData();
}

// --------------------------------------------------------------------------
// Progressive Web App (PWA) Setup
// --------------------------------------------------------------------------
function setupPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[PWA] Service Worker registered on scope:', reg.scope))
        .catch(err => console.log('[PWA] Service Worker registration failed:', err));
    });
  }

  const installBtn = document.getElementById('installAppBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.style.display = 'none';
      }
      deferredPrompt = null;
    });
  }

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.style.display = 'none';
    console.log('[PWA] NIM-PRIS installed successfully as an application');
  });
}

// --------------------------------------------------------------------------
// Theme & Navigation
// --------------------------------------------------------------------------
function setupTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('app_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('app_theme', next);
      updateThemeIcon(next);
      refreshCharts();
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

function setupTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });
      const activePane = document.getElementById(targetTab);
      if (activePane) activePane.classList.add('active');

      if (targetTab === 'analyticsTab') {
        setTimeout(refreshCharts, 100);
      }
    });
  });
}

// --------------------------------------------------------------------------
// Data Loading & Executive KPIs
// --------------------------------------------------------------------------
function loadAllGovData() {
  activeGovProjects = getStoredGovProjects();
  renderExecutiveKPIs(activeGovProjects);
  renderGovProjectsTable(activeGovProjects);
  renderStatutoryAlerts(activeGovProjects);
  refreshCharts();
}

function renderExecutiveKPIs(projects) {
  const totalProjects = projects.length;
  let totalOutlayCr = 0;
  let totalExpCr = 0;
  let sumSPI = 0;
  let sumCPI = 0;
  let criticalCount = 0;
  let clearanceBottlenecks = 0;

  projects.forEach(p => {
    const evalRes = GovMLEngine.evaluateProject(p);
    totalOutlayCr += parseFloat(p.sanctioned_budget_cr || 0);
    totalExpCr += parseFloat(p.actual_expenditure_cr || 0);
    sumSPI += evalRes.spi;
    sumCPI += evalRes.cpi;
    if (evalRes.overall_risk === 'HIGH') criticalCount++;
    if (p.land_acquisition_pct < 90 || !p.environmental_clearance.toLowerCase().includes('granted')) {
      clearanceBottlenecks++;
    }
  });

  const avgSPI = (sumSPI / Math.max(1, totalProjects)).toFixed(2);
  const avgCPI = (sumCPI / Math.max(1, totalProjects)).toFixed(2);
  const outlayLakhCr = (totalOutlayCr / 100000).toFixed(2);
  const expLakhCr = (totalExpCr / 100000).toFixed(2);

  setElemText('kpiTotalOutlay', `₹${outlayLakhCr} L Cr`);
  setElemText('kpiCumulativeExp', `₹${expLakhCr} L Cr`);
  setElemText('kpiTotalProjects', totalProjects);
  setElemText('kpiAvgSPI', avgSPI);
  setElemText('kpiAvgCPI', avgCPI);
  setElemText('kpiCriticalCount', criticalCount);
  setElemText('kpiClearanceBottlenecks', clearanceBottlenecks);

  // Critical banner alert
  const banner = document.getElementById('criticalAlertBanner');
  if (banner) {
    if (criticalCount > 0) {
      banner.style.display = 'flex';
      setElemText('bannerCriticalText', `${criticalCount} Strategic Projects require immediate Cabinet Secretariat / NPG inter-ministerial intervention.`);
    } else {
      banner.style.display = 'none';
    }
  }

  // Update alert badge count
  const badge = document.getElementById('alertCountBadge');
  if (badge) badge.innerText = criticalCount;
}

function renderGovProjectsTable(projects) {
  const tbody = document.getElementById('projectsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (projects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">No infrastructure projects match the selected ministerial criteria.</td></tr>`;
    return;
  }

  projects.forEach(p => {
    const evalRes = GovMLEngine.evaluateProject(p);
    const tr = document.createElement('tr');

    const riskBadgeClass = evalRes.overall_risk === 'HIGH' ? 'badge-high' :
                           evalRes.overall_risk === 'MEDIUM' ? 'badge-medium' : 'badge-low';

    const spiBadgeClass = evalRes.spi >= 1.0 ? 'badge-low' : evalRes.spi >= 0.85 ? 'badge-medium' : 'badge-high';
    const cpiBadgeClass = evalRes.cpi >= 1.0 ? 'badge-low' : evalRes.cpi >= 0.90 ? 'badge-medium' : 'badge-high';

    tr.innerHTML = `
      <td>
        <div class="project-name-cell">
          <span class="project-title" onclick="openGovDossier(${p.id})">${escapeHtml(p.name)}</span>
          <div class="project-location">
            <span class="badge badge-cat" style="font-size: 0.68rem;">${p.code || 'GOV-REF'}</span>
            <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(p.location)}</span>
          </div>
        </div>
      </td>
      <td>
        <div style="font-weight: 600; font-size: 0.8rem;">${escapeHtml(p.ministry)}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(p.agency || 'Executing Agency')}</div>
      </td>
      <td>
        <strong>₹${p.sanctioned_budget_cr?.toLocaleString()} Cr</strong>
        <div style="font-size: 0.74rem; color: var(--text-muted);">Exp: ₹${p.actual_expenditure_cr?.toLocaleString()} Cr</div>
      </td>
      <td>
        <div class="prog-wrapper">
          <div class="prog-info">
            <span>Physical: ${p.physical_progress_pct}%</span>
            <span>Target: ${p.planned_progress_pct}%</span>
          </div>
          <div class="prog-bar-bg">
            <div class="prog-bar-fill" style="width: ${p.physical_progress_pct}%"></div>
          </div>
        </div>
      </td>
      <td>
        <div style="display: flex; gap: 4px; margin-bottom: 2px;">
          <span class="badge ${spiBadgeClass}" title="Schedule Performance Index (Target >= 1.0)">SPI: ${evalRes.spi}</span>
          <span class="badge ${cpiBadgeClass}" title="Cost Performance Index (Target >= 1.0)">CPI: ${evalRes.cpi}</span>
        </div>
        <div style="font-size: 0.72rem; color: ${evalRes.predicted_delay_days > 30 ? 'var(--risk-high)' : 'var(--text-muted)'};">
          ${evalRes.predicted_delay_days > 0 ? `+${evalRes.predicted_delay_days}d delay` : 'On Schedule'}
        </div>
      </td>
      <td>
        <div style="font-size: 0.78rem; font-weight: 600;">Land: ${p.land_acquisition_pct}%</div>
        <div style="font-size: 0.72rem; color: ${p.environmental_clearance.toLowerCase().includes('granted') ? 'var(--risk-low)' : 'var(--risk-med)'};">
          <i class="fa-solid fa-tree"></i> ${escapeHtml(p.environmental_clearance)}
        </div>
      </td>
      <td>
        <span class="badge ${riskBadgeClass}">
          <i class="fa-solid fa-circle" style="font-size: 6px;"></i> ${evalRes.overall_risk}
        </span>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Health: ${evalRes.health_score}%</div>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-primary btn-xs" onclick="openGovDossier(${p.id})" title="View Complete Project Transparency Dossier">
            <i class="fa-solid fa-file-invoice"></i> Briefing
          </button>
          ${(typeof AuthModule !== 'undefined' && AuthModule.isOfficial()) ? `
          <button class="btn btn-secondary btn-xs official-only-action" onclick="openEditGovProject(${p.id})" title="Edit Project Parameters (Officials Only)">
            <i class="fa-solid fa-pen"></i>
          </button>` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderStatutoryAlerts(projects) {
  const container = document.getElementById('alertsListContainer');
  if (!container) return;
  container.innerHTML = '';

  const highRiskProjects = projects.filter(p => GovMLEngine.evaluateProject(p).overall_risk === 'HIGH');

  if (highRiskProjects.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">No critical statutory violations. All monitored projects operating within sanctioned tolerances.</div>`;
    return;
  }

  highRiskProjects.forEach(p => {
    const evalRes = GovMLEngine.evaluateProject(p);
    const card = document.createElement('div');
    card.className = 'rec-card';
    card.style.borderColor = 'var(--risk-high-border)';

    card.innerHTML = `
      <div class="rec-icon" style="color: var(--risk-high); background: var(--risk-high-bg);">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <div class="rec-content" style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h4>${escapeHtml(p.name)} (${p.code})</h4>
          <span class="badge badge-high">${p.priority || 'Critical Inter-Ministerial'}</span>
        </div>
        <p style="margin: 4px 0 6px;">
          <strong>Ministry:</strong> ${escapeHtml(p.ministry)} | 
          <strong>SPI:</strong> <span class="text-danger">${evalRes.spi}</span> | 
          <strong>CPI:</strong> <span class="text-danger">${evalRes.cpi}</span> | 
          <strong>Forecast Delay:</strong> ${evalRes.predicted_delay_days} Days | 
          <strong>Cost Escalation:</strong> ₹${evalRes.estimated_cost_overrun_cr} Cr
        </p>
        <p style="font-size: 0.75rem; color: var(--text-muted);">
          <strong>Critical Bottleneck:</strong> ${escapeHtml(p.critical_bottleneck || 'Land acquisition and utility shifting')}
        </p>
        <div style="margin-top: 8px; display: flex; gap: 8px;">
          <button class="btn btn-primary btn-xs" onclick="openGovDossier(${p.id})">
            <i class="fa-solid fa-file-pdf"></i> Generate Cabinet Briefing Dossier
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// --------------------------------------------------------------------------
// Ministerial Briefing Dossier Modal
// --------------------------------------------------------------------------
function openGovDossier(projectId) {
  const p = activeGovProjects.find(item => item.id === projectId);
  if (!p) return;

  selectedProjectIdForDossier = projectId;
  const evalRes = GovMLEngine.evaluateProject(p);

  setElemText('dossierProjectName', p.name);
  setElemText('dossierProjectCode', p.code || 'GOV-REF');
  setElemText('dossierMinistry', p.ministry);
  setElemText('dossierAgency', p.agency || 'Executing Agency');
  setElemText('dossierLocation', `${p.location} (${p.zone} Zone)`);
  setElemText('dossierPriority', p.priority);

  // Financials
  setElemText('dossierBudget', `₹${p.sanctioned_budget_cr?.toLocaleString()} Crores`);
  setElemText('dossierExp', `₹${p.actual_expenditure_cr?.toLocaleString()} Crores`);
  setElemText('dossierCostOverrun', `₹${evalRes.estimated_cost_overrun_cr} Crores`);
  setElemText('dossierDelayDays', `${evalRes.predicted_delay_days} Days`);

  // EVM
  setElemText('dossierSPI', evalRes.spi);
  setElemText('dossierCPI', evalRes.cpi);
  setElemText('dossierSV', `₹${evalRes.sv_cr} Cr`);
  setElemText('dossierCV', `₹${evalRes.cv_cr} Cr`);

  // Physical & Clearances
  setElemText('dossierPhysicalProg', `${p.physical_progress_pct}% (Planned: ${p.planned_progress_pct}%)`);
  setElemText('dossierLandAcq', `${p.land_acquisition_pct}% Handed Over`);
  setElemText('dossierEnvClearance', p.environmental_clearance);
  setElemText('dossierBottleneck', p.critical_bottleneck || 'Milestone verification pending');

  // Detailed Citizen & Operational Transparency Parameters
  setElemText('dossierPublicBenefit', p.public_benefit || 'Delivers major socio-economic enhancements, passenger/freight mobility, and regional connectivity.');
  setElemText('dossierScope', p.scope_deliverables || 'Comprehensive multi-tier civil, structural, and electrical infrastructure deliverables.');
  setElemText('dossierLeadContractor', p.lead_contractor || p.agency || 'Executing EPC Consortium');
  setElemText('dossierNodalOfficer', p.nodal_officer || 'Chief Project Director / Executive Engineer (Govt of India)');
  setElemText('dossierFundingMode', p.funding_mode || 'Central Union Sector Budget');
  setElemText('dossierCurrentStage', p.current_stage || 'Active Milestone Execution');
  setElemText('dossierLastInspection', p.last_inspection || 'Statutory Quality Audit: Grade A');
  setElemText('dossierCitizenHelpline', p.citizen_helpline || '1800-11-2026 / citizen.grievance@gov.in');

  // Health Score
  setElemText('dossierHealthScore', `${evalRes.health_score}%`);
  const gauge = document.getElementById('dossierGaugeCircle');
  if (gauge) {
    gauge.className = 'gauge-circle ' + (evalRes.overall_risk === 'HIGH' ? 'high-risk' : evalRes.overall_risk === 'MEDIUM' ? 'med-risk' : 'low-risk');
  }

  // XAI Factors
  const factorsContainer = document.getElementById('dossierFactorsList');
  if (factorsContainer) {
    factorsContainer.innerHTML = '';
    evalRes.major_risk_factors.forEach(f => {
      const item = document.createElement('div');
      item.className = `factor-item ${f.impact === 'HIGH' ? 'impact-high' : f.impact === 'MEDIUM' ? 'impact-medium' : 'impact-positive'}`;
      item.innerHTML = `
        <div class="factor-header">
          <span>✓ ${escapeHtml(f.factor)}</span>
          <span style="font-size: 0.72rem;">${f.impact} PRIORITY</span>
        </div>
        <div class="factor-desc">${escapeHtml(f.detail)}</div>
      `;
      factorsContainer.appendChild(item);
    });
  }

  // Recommendations
  const recsContainer = document.getElementById('dossierRecsList');
  if (recsContainer) {
    recsContainer.innerHTML = '';
    evalRes.recommendations.forEach((r, i) => {
      const item = document.createElement('div');
      item.className = 'rec-card';
      item.innerHTML = `
        <div class="rec-icon"><i class="fa-solid fa-gavel"></i></div>
        <div class="rec-content">
          <h4>${i+1}. ${escapeHtml(r.title)} (${r.priority} Priority)</h4>
          <p>${escapeHtml(r.action)}</p>
        </div>
      `;
      recsContainer.appendChild(item);
    });
  }

  openModal('dossierModal');
}

// Print official briefing document
function printOfficialBriefing() {
  window.print();
}

// Export Master CSV Data
function exportMasterCSV() {
  const headers = [
    'Project Code', 'Project Name', 'Union Ministry', 'Executing Agency', 'Zone',
    'Sanctioned Budget (Cr)', 'Actual Expenditure (Cr)', 'Physical Progress (%)',
    'Planned Progress (%)', 'SPI', 'CPI', 'Predicted Delay (Days)',
    'Estimated Escalation (Cr)', 'Land Acquisition (%)', 'Environmental Clearance',
    'Overall Risk', 'Health Score (%)', 'Priority Classification'
  ];

  const rows = activeGovProjects.map(p => {
    const ai = GovMLEngine.evaluateProject(p);
    return [
      `"${p.code || ''}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.ministry}"`,
      `"${p.agency || ''}"`,
      `"${p.zone || ''}"`,
      p.sanctioned_budget_cr,
      p.actual_expenditure_cr,
      p.physical_progress_pct,
      p.planned_progress_pct,
      ai.spi,
      ai.cpi,
      ai.predicted_delay_days,
      ai.estimated_cost_overrun_cr,
      p.land_acquisition_pct,
      `"${p.environmental_clearance}"`,
      ai.overall_risk,
      ai.health_score,
      `"${p.priority || ''}"`
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `NIM_PRIS_National_Infrastructure_Master_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --------------------------------------------------------------------------
// Project CRUD & Modal Management
// --------------------------------------------------------------------------
function setupModals() {
  document.querySelectorAll('.modal-close-trigger').forEach(el => {
    el.addEventListener('click', () => closeAllModals());
  });

  const form = document.getElementById('govProjectForm');
  if (form) {
    form.addEventListener('submit', handleGovProjectSubmit);
  }
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}

function openNewGovProjectModal() {
  if (typeof AuthModule !== 'undefined' && !AuthModule.isOfficial()) {
    alert('Access Restricted: You are currently signed in as a Public Citizen (View Only). Only authorized Government Officials can sanction new infrastructure projects.');
    return;
  }
  const form = document.getElementById('govProjectForm');
  if (form) form.reset();
  document.getElementById('govProjectIdHidden').value = '';
  document.getElementById('govModalTitle').innerText = 'Sanction New National Infrastructure Project';
  openModal('govProjectModal');
}

function openEditGovProject(id) {
  if (typeof AuthModule !== 'undefined' && !AuthModule.isOfficial()) {
    alert('Access Restricted: You are currently signed in as a Public Citizen (View Only). Only authorized Government Officials can edit infrastructure projects.');
    return;
  }
  const p = activeGovProjects.find(item => item.id === id);
  if (!p) return;

  document.getElementById('govProjectIdHidden').value = p.id;
  document.getElementById('govModalTitle').innerText = `Update: ${p.name}`;
  document.getElementById('projCode').value = p.code || '';
  document.getElementById('projName').value = p.name;
  document.getElementById('projMinistry').value = p.ministry;
  document.getElementById('projAgency').value = p.agency || '';
  document.getElementById('projLocation').value = p.location;
  document.getElementById('projZone').value = p.zone || 'Northern';
  document.getElementById('projPriority').value = p.priority || 'PM GatiShakti Priority';
  document.getElementById('projBudget').value = p.sanctioned_budget_cr;
  document.getElementById('projExpenditure').value = p.actual_expenditure_cr;
  document.getElementById('projDuration').value = p.planned_duration_months || 36;
  document.getElementById('projStartDate').value = p.start_date;
  document.getElementById('projEndDate').value = p.expected_completion_date;
  document.getElementById('projProgress').value = p.physical_progress_pct;
  document.getElementById('projPlannedProgress').value = p.planned_progress_pct || p.physical_progress_pct;
  document.getElementById('projLandAcq').value = p.land_acquisition_pct || 100;
  document.getElementById('projClearance').value = p.environmental_clearance || 'Granted';
  document.getElementById('projDelayedTasks').value = p.delayed_activities || 0;
  document.getElementById('projBottleneck').value = p.critical_bottleneck || '';

  // New detailed parameters
  if (document.getElementById('projPublicBenefit')) document.getElementById('projPublicBenefit').value = p.public_benefit || '';
  if (document.getElementById('projScope')) document.getElementById('projScope').value = p.scope_deliverables || '';
  if (document.getElementById('projContractor')) document.getElementById('projContractor').value = p.lead_contractor || p.agency || '';
  if (document.getElementById('projNodalOfficer')) document.getElementById('projNodalOfficer').value = p.nodal_officer || '';
  if (document.getElementById('projFundingMode')) document.getElementById('projFundingMode').value = p.funding_mode || 'Hybrid Annuity Model (HAM)';
  if (document.getElementById('projCurrentStage')) document.getElementById('projCurrentStage').value = p.current_stage || '';
  if (document.getElementById('projLastInspection')) document.getElementById('projLastInspection').value = p.last_inspection || '';
  if (document.getElementById('projCitizenHelpline')) document.getElementById('projCitizenHelpline').value = p.citizen_helpline || '';

  openModal('govProjectModal');
}

function handleGovProjectSubmit(e) {
  e.preventDefault();
  if (typeof AuthModule !== 'undefined' && !AuthModule.isOfficial()) {
    alert('Access Restricted: Public accounts have read-only access. Project creation and editing require Government Official clearance.');
    return;
  }
  const id = document.getElementById('govProjectIdHidden').value;

  const newProject = {
    id: id ? parseInt(id) : Date.now(),
    code: document.getElementById('projCode').value || `GOV-${Date.now().toString().slice(-4)}`,
    name: document.getElementById('projName').value,
    ministry: document.getElementById('projMinistry').value,
    agency: document.getElementById('projAgency').value,
    location: document.getElementById('projLocation').value,
    zone: document.getElementById('projZone').value,
    priority: document.getElementById('projPriority').value,
    sanctioned_budget_cr: parseFloat(document.getElementById('projBudget').value),
    actual_expenditure_cr: parseFloat(document.getElementById('projExpenditure').value),
    planned_duration_months: parseFloat(document.getElementById('projDuration').value),
    start_date: document.getElementById('projStartDate').value,
    expected_completion_date: document.getElementById('projEndDate').value,
    physical_progress_pct: parseFloat(document.getElementById('projProgress').value),
    planned_progress_pct: parseFloat(document.getElementById('projPlannedProgress').value),
    land_acquisition_pct: parseFloat(document.getElementById('projLandAcq').value) || 100,
    environmental_clearance: document.getElementById('projClearance').value,
    delayed_activities: parseInt(document.getElementById('projDelayedTasks').value) || 0,
    critical_bottleneck: document.getElementById('projBottleneck').value || 'Milestone verification',
    public_benefit: document.getElementById('projPublicBenefit')?.value || 'High-impact national infrastructure initiative benefiting citizens and accelerating regional commerce.',
    scope_deliverables: document.getElementById('projScope')?.value || 'Comprehensive civil, electrical, and structural engineering deliverables.',
    lead_contractor: document.getElementById('projContractor')?.value || document.getElementById('projAgency').value,
    nodal_officer: document.getElementById('projNodalOfficer')?.value || 'Chief Project Director / Executive Engineer',
    funding_mode: document.getElementById('projFundingMode')?.value || 'Hybrid Annuity Model (HAM)',
    current_stage: document.getElementById('projCurrentStage')?.value || 'Active Milestone Execution',
    last_inspection: document.getElementById('projLastInspection')?.value || `${new Date().toISOString().slice(0,10)} (Statutory Quality & Safety Audit: Grade A)`,
    citizen_helpline: document.getElementById('projCitizenHelpline')?.value || '1800-11-2026 / public.grievance@gov.in'
  };

  if (id) {
    const idx = activeGovProjects.findIndex(p => p.id === parseInt(id));
    if (idx !== -1) activeGovProjects[idx] = newProject;
  } else {
    activeGovProjects.unshift(newProject);
  }

  saveGovProjects(activeGovProjects);
  closeAllModals();
  loadAllGovData();

  // Open dossier for newly added project
  setTimeout(() => openGovDossier(newProject.id), 300);
}

// --------------------------------------------------------------------------
// Filtering & Search
// --------------------------------------------------------------------------
function setupFilterAndSearch() {
  const searchInput = document.getElementById('projectSearchInput');
  const ministryFilter = document.getElementById('ministryFilterSelect');
  const zoneFilter = document.getElementById('zoneFilterSelect');
  const riskFilter = document.getElementById('riskFilterSelect');

  const applyFilters = () => {
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const ministry = ministryFilter ? ministryFilter.value : '';
    const zone = zoneFilter ? zoneFilter.value : '';
    const risk = riskFilter ? riskFilter.value : '';

    const filtered = activeGovProjects.filter(p => {
      const evalRes = GovMLEngine.evaluateProject(p);
      const matchSearch = !q || p.name.toLowerCase().includes(q) || 
                                (p.code && p.code.toLowerCase().includes(q)) ||
                                p.location.toLowerCase().includes(q) ||
                                (p.agency && p.agency.toLowerCase().includes(q));

      const matchMinistry = !ministry || p.ministry === ministry;
      const matchZone = !zone || p.zone === zone;
      const matchRisk = !risk || evalRes.overall_risk === risk;

      return matchSearch && matchMinistry && matchZone && matchRisk;
    });

    renderGovProjectsTable(filtered);
  };

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (ministryFilter) ministryFilter.addEventListener('change', applyFilters);
  if (zoneFilter) zoneFilter.addEventListener('change', applyFilters);
  if (riskFilter) riskFilter.addEventListener('change', applyFilters);
}

// --------------------------------------------------------------------------
// AI Ministerial Intelligence Advisor
// --------------------------------------------------------------------------
function setupMinisterialAdvisor() {
  const sendBtn = document.getElementById('assistantSendBtn');
  const input = document.getElementById('assistantInput');

  const sendQuery = (text) => {
    const query = text || (input ? input.value.trim() : '');
    if (!query) return;

    if (input) input.value = '';
    appendChatMessage('user', query);

    const activeProj = selectedProjectIdForDossier ? activeGovProjects.find(p => p.id === selectedProjectIdForDossier) : null;
    const answer = GovMLEngine.answerMinisterialQuery(query, activeProj, activeGovProjects);

    setTimeout(() => {
      appendChatMessage('assistant', answer);
    }, 200);
  };

  if (sendBtn) sendBtn.addEventListener('click', () => sendQuery());
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendQuery();
    });
  }

  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.innerText.replace(/[“"”]/g, '').trim();
      sendQuery(text);
    });
  });

  const floatingBtn = document.getElementById('floatingAIBtn');
  if (floatingBtn) {
    floatingBtn.addEventListener('click', () => {
      const tab = document.querySelector('[data-tab="assistantTab"]');
      if (tab) tab.click();
    });
  }
}

function appendChatMessage(sender, markdownText) {
  const chatBody = document.getElementById('assistantChatBody');
  if (!chatBody) return;

  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${sender}`;

  let formatted = markdownText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gim, '<h4 style="margin: 8px 0 4px; font-weight:700;">$1</h4>')
    .replace(/• (.*$)/gim, '<div style="margin-left: 12px; margin-bottom: 4px;">• $1</div>')
    .replace(/\n/g, '<br>');

  bubble.innerHTML = formatted;
  chatBody.appendChild(bubble);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// --------------------------------------------------------------------------
// What-If Policy Simulation Sandbox
// --------------------------------------------------------------------------
function setupGovSimulator() {
  const simBtn = document.getElementById('runSimBtn');
  if (!simBtn) return;

  simBtn.addEventListener('click', () => {
    const mock = {
      sanctioned_budget_cr: parseFloat(document.getElementById('simBudget').value) || 10000,
      actual_expenditure_cr: parseFloat(document.getElementById('simExpenditure').value) || 7500,
      planned_progress_pct: parseFloat(document.getElementById('simPlannedProgress').value) || 70,
      physical_progress_pct: parseFloat(document.getElementById('simProgress').value) || 45,
      planned_duration_months: parseFloat(document.getElementById('simDuration').value) || 48,
      delayed_activities: parseInt(document.getElementById('simDelayedTasks').value) || 4,
      land_acquisition_pct: parseFloat(document.getElementById('simLandAcq').value) || 84,
      environmental_clearance: document.getElementById('simClearance').value
    };

    const sim = GovMLEngine.evaluateProject(mock);

    setElemText('simResultRisk', sim.overall_risk);
    const riskElem = document.getElementById('simResultRisk');
    if (riskElem) {
      riskElem.className = 'badge ' + (sim.overall_risk === 'HIGH' ? 'badge-high' : sim.overall_risk === 'MEDIUM' ? 'badge-medium' : 'badge-low');
    }

    setElemText('simResultHealth', `${sim.health_score}%`);
    setElemText('simResultSPI', `SPI: ${sim.spi} (${sim.spi < 1.0 ? 'Schedule Lag' : 'On Schedule'})`);
    setElemText('simResultCPI', `CPI: ${sim.cpi} (${sim.cpi < 1.0 ? 'Cost Overrun' : 'Cost Efficient'})`);
    setElemText('simResultDelay', `${sim.predicted_delay_days} Days`);
    setElemText('simResultOverrun', `₹${sim.estimated_cost_overrun_cr} Crores`);
    setElemText('simResultPriority', sim.priority_risk);

    const simRecs = document.getElementById('simResultRecs');
    if (simRecs) {
      simRecs.innerHTML = sim.recommendations.map(r => `<li><strong>${escapeHtml(r.title)}:</strong> ${escapeHtml(r.action)}</li>`).join('');
    }
  });
}

// --------------------------------------------------------------------------
// Charts Visualizations
// --------------------------------------------------------------------------
function refreshCharts() {
  if (typeof initGovCharts === 'function') {
    initGovCharts(activeGovProjects);
  }
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function setElemText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
