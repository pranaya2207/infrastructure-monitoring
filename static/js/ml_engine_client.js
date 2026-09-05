// ==========================================================================
// National Infrastructure Monitoring & Project Risk Intelligence System (NIM-PRIS)
// Client-Side AI/ML Inference & Earned Value Management (EVM) Engine
// ==========================================================================

const GovMLEngine = {
  /**
   * Evaluates project with EVM metrics, ML delay/overrun forecasts, and Explainable AI.
   */
  evaluateProject(p) {
    const budget = parseFloat(p.sanctioned_budget_cr || p.budget || 1000);
    const actualExp = parseFloat(p.actual_expenditure_cr || p.actual_expenditure || 500);
    const actualProg = parseFloat(p.physical_progress_pct || p.completion_percentage || 50);
    const plannedProg = parseFloat(p.planned_progress_pct || p.planned_progress || (actualProg + 5));
    const delayedTasks = parseInt(p.delayed_activities || 0);
    const landPct = parseFloat(p.land_acquisition_pct || 100);
    const envClearance = p.environmental_clearance || 'Granted';
    const duration = parseFloat(p.planned_duration_months || p.planned_duration || 36);

    // 1. Earned Value Management (EVM)
    const PV = (plannedProg / 100.0) * budget; // Planned Value
    const EV = (actualProg / 100.0) * budget;  // Earned Value
    const AC = actualExp;                      // Actual Cost

    const SPI = parseFloat((EV / Math.max(0.1, PV)).toFixed(2));
    const CPI = parseFloat((EV / Math.max(0.1, AC)).toFixed(2));
    const SV_cr = parseFloat((EV - PV).toFixed(1)); // Schedule Variance in ₹ Cr
    const CV_cr = parseFloat((EV - AC).toFixed(1)); // Cost Variance in ₹ Cr

    // 2. Machine Learning Delay Forecast (in Days)
    const progDeviation = Math.max(0, plannedProg - actualProg);
    const baseDelayDays = (progDeviation / 100.0) * (duration * 30.0);
    const taskDelayDays = delayedTasks * 8.5;
    const landPenalty = landPct < 90 ? (90 - landPct) * 4.0 : 0;
    const clearancePenalty = envClearance.toLowerCase().includes('granted') ? 0 : 35;
    
    const predictedDelayDays = Math.max(0, Math.round(baseDelayDays + taskDelayDays + landPenalty + clearancePenalty));

    // 3. Machine Learning Cost Overrun Forecast (in ₹ Crores)
    let estimatedCostOverrunCr = 0;
    if (CV_cr < 0) {
      // Over budget
      estimatedCostOverrunCr = Math.abs(CV_cr) * 1.15 + (delayedTasks * 0.008 * budget);
    } else {
      estimatedCostOverrunCr = delayedTasks > 2 ? (delayedTasks * 0.005 * budget) : 0;
    }
    estimatedCostOverrunCr = parseFloat(estimatedCostOverrunCr.toFixed(1));

    // 4. Composite Risk Classification & Health Index
    let overallRisk = 'LOW';
    let delayRisk = 'LOW';
    let costRisk = 'LOW';

    if (predictedDelayDays > 90 || SPI < 0.80 || delayedTasks >= 5) {
      delayRisk = 'HIGH';
    } else if (predictedDelayDays > 30 || SPI < 0.92 || delayedTasks >= 2) {
      delayRisk = 'MEDIUM';
    }

    if (CPI < 0.85 || estimatedCostOverrunCr > (0.10 * budget)) {
      costRisk = 'HIGH';
    } else if (CPI < 0.95 || estimatedCostOverrunCr > (0.03 * budget)) {
      costRisk = 'MEDIUM';
    }

    if (delayRisk === 'HIGH' || costRisk === 'HIGH' || landPct < 85 || !envClearance.toLowerCase().includes('granted')) {
      overallRisk = 'HIGH';
    } else if (delayRisk === 'MEDIUM' || costRisk === 'MEDIUM') {
      overallRisk = 'MEDIUM';
    }

    // Health Score calculation (0 - 100%)
    let healthScore = Math.round(
      (Math.min(1.0, SPI) * 35) +
      (Math.min(1.0, CPI) * 35) +
      ((landPct / 100.0) * 15) +
      (envClearance.toLowerCase().includes('granted') ? 15 : 5) -
      (delayedTasks * 2.5)
    );
    healthScore = Math.max(8, Math.min(99, healthScore));

    // 5. Explainable AI (XAI) - Root Cause Factor Analysis
    const factors = [];
    if (progDeviation > 4.0) {
      factors.push({
        factor: 'Physical execution lag behind statutory timeline',
        impact: progDeviation > 12 ? 'HIGH' : 'MEDIUM',
        detail: `Actual physical completion (${actualProg}%) trails planned schedule target (${plannedProg}%) by ${progDeviation.toFixed(1)}%. Schedule Performance Index (SPI) is ${SPI}.`
      });
    }

    if (delayedTasks > 0) {
      factors.push({
        factor: 'Critical-path milestone activities delayed',
        impact: delayedTasks >= 4 ? 'HIGH' : 'MEDIUM',
        detail: `${delayedTasks} key contractual sub-activities have exceeded primary milestone deadlines.`
      });
    }

    if (CPI < 0.92) {
      factors.push({
        factor: 'Financial expenditure burn exceeds physical asset creation',
        impact: CPI < 0.82 ? 'HIGH' : 'MEDIUM',
        detail: `Cost Performance Index (CPI) of ${CPI} indicates a cost variance of ₹${Math.abs(CV_cr)} Crores exceeding planned baseline.`
      });
    }

    if (landPct < 95) {
      factors.push({
        factor: 'Pending Right-of-Way & Land Acquisition gazette handover',
        impact: landPct < 85 ? 'HIGH' : 'MEDIUM',
        detail: `Only ${landPct}% of sanctioned land has been unencumbered. Remaining patches are subject to district revenue clearances.`
      });
    }

    if (!envClearance.toLowerCase().includes('granted') && !envClearance.toLowerCase().includes('not required')) {
      factors.push({
        factor: 'Statutory environmental or forest clearance in review',
        impact: 'HIGH',
        detail: `Current clearance status is '${envClearance}', awaiting State / Central Nodal approval.`
      });
    }

    if (factors.length === 0) {
      factors.push({
        factor: 'Optimal project alignment with national guidelines',
        impact: 'POSITIVE',
        detail: 'Milestones, SPI/CPI metrics, land acquisition, and fund utilization meet approved Cabinet guidelines.'
      });
    }

    // Priority Risk Tag
    let priorityRisk = 'On Schedule & Within Budget';
    if (delayRisk === 'HIGH' && costRisk === 'HIGH') priorityRisk = 'Critical Delay & Budget Overrun';
    else if (delayRisk === 'HIGH') priorityRisk = 'Schedule Slippage (SPI < 0.85)';
    else if (costRisk === 'HIGH') priorityRisk = 'Cost Escalation (CPI < 0.90)';
    else if (landPct < 85) priorityRisk = 'Land Handover Encumbrance';
    else if (overallRisk === 'MEDIUM') priorityRisk = 'Intermediate Milestone Vigilance';

    // 6. Ministerial Actionable Directives
    const recommendations = [];
    if (delayedTasks > 0 || progDeviation > 5) {
      recommendations.push({
        title: 'Issue Time-Bound EPC Recovery Notice',
        action: 'Direct primary contractor to deploy accelerated shift rosters and mobilize additional machinery to recover critical path lag.',
        priority: 'High'
      });
    }

    if (landPct < 95) {
      recommendations.push({
        title: 'Convene State High-Powered Land Clearance Committee',
        action: 'Escalate pending revenue survey awards to State Chief Secretary and District Magistrates to clear right-of-way.',
        priority: 'High'
      });
    }

    if (CPI < 0.95 || estimatedCostOverrunCr > 0) {
      recommendations.push({
        title: 'Conduct Independent Cost & Quantity Audit',
        action: 'Direct Ministry Internal Audit Wing to audit material price escalation clauses and bill-of-quantities variations.',
        priority: 'Medium'
      });
    }

    recommendations.push({
      title: 'Integrate into PM GatiShakti NPG Monitoring',
      action: 'Update geo-tagged monthly physical milestones on the National Master Plan GIS platform for inter-ministerial synchronization.',
      priority: 'Low'
    });

    return {
      overall_risk: overallRisk,
      delay_risk: delayRisk,
      cost_risk: costRisk,
      health_score: healthScore,
      predicted_delay_days: predictedDelayDays,
      estimated_cost_overrun_cr: estimatedCostOverrunCr,
      priority_risk: priorityRisk,
      spi: SPI,
      cpi: CPI,
      pv_cr: parseFloat(PV.toFixed(1)),
      ev_cr: parseFloat(EV.toFixed(1)),
      ac_cr: AC,
      sv_cr: SV_cr,
      cv_cr: CV_cr,
      major_risk_factors: factors,
      recommendations: recommendations
    };
  },

  /**
   * AI Ministerial Intelligence Advisor query processor.
   */
  answerMinisterialQuery(query, activeProject, allProjects) {
    const q = query.toLowerCase().trim();

    if (activeProject) {
      const evalRes = this.evaluateProject(activeProject);
      const name = activeProject.name;
      const code = activeProject.code || 'GOV-PROJ';

      if (q.includes('brief') || q.includes('dossier') || q.includes('note') || q.includes('cabinet') || q.includes('summary')) {
        return `### 🏛️ Executive Briefing Note: ${name} (${code})
• **Union Ministry:** ${activeProject.ministry}
• **Executing Agency / Contractor:** ${activeProject.agency}
• **Sanctioned Outlay:** ₹${activeProject.sanctioned_budget_cr?.toLocaleString()} Crores
• **Actual Expenditure:** ₹${activeProject.actual_expenditure_cr?.toLocaleString()} Crores
• **Earned Value Health:** SPI = **${evalRes.spi}** | CPI = **${evalRes.cpi}**
• **Current Condition:** **${evalRes.overall_risk} RISK** (Health Index: **${evalRes.health_score}%**)
• **Forecasted Delay:** ${evalRes.predicted_delay_days} Days | **Projected Escalation:** ₹${evalRes.estimated_cost_overrun_cr} Crores
• **Key Bottleneck:** ${activeProject.critical_bottleneck || 'Milestone critical path delay'}

**Directives for Stakeholders:**
1. ${evalRes.recommendations[0]?.action || 'Expedite pending statutory clearances.'}
2. ${evalRes.recommendations[1]?.action || 'Review contractor deployment and shift schedules.'}`;
      }

      if (q.includes('why') || q.includes('delay') || q.includes('risk') || q.includes('cause')) {
        const factors = evalRes.major_risk_factors.map(f => `• **${f.factor}:** ${f.detail}`).join('\n');
        return `**${name}** is assessed at **${evalRes.overall_risk} Risk** primarily due to the following factors:\n\n${factors}\n\n• **Predicted Delay:** ${evalRes.predicted_delay_days} Days\n• **Estimated Cost Escalation:** ₹${evalRes.estimated_cost_overrun_cr} Crores\n• **Priority Attention:** ${evalRes.priority_risk}`;
      }

      if (q.includes('action') || q.includes('recommend') || q.includes('solution') || q.includes('fix')) {
        const recs = evalRes.recommendations.map((r, i) => `**${i+1}. ${r.title}** (${r.priority} Priority)\n${r.action}`).join('\n\n');
        return `### Recommended Ministerial Interventions for ${name}:\n\n${recs}`;
      }
    }

    // Global queries
    if (allProjects && allProjects.length) {
      const total = allProjects.length;
      const criticalProjects = allProjects.filter(p => this.evaluateProject(p).overall_risk === 'HIGH');
      const totalBudget = allProjects.reduce((sum, p) => sum + (parseFloat(p.sanctioned_budget_cr) || 0), 0);
      const totalExp = allProjects.reduce((sum, p) => sum + (parseFloat(p.actual_expenditure_cr) || 0), 0);

      if (q.includes('spi') || q.includes('schedule lag')) {
        const lowSpi = allProjects.filter(p => this.evaluateProject(p).spi < 0.85);
        const list = lowSpi.map(p => `• **${p.name}** (SPI: **${this.evaluateProject(p).spi}**, Ministry: ${p.ministry})`).join('\n');
        return `### Projects with Critical Schedule Lag (SPI < 0.85):\nFound **${lowSpi.length} projects** requiring immediate milestone acceleration:\n\n${list}`;
      }

      if (q.includes('critical') || q.includes('cabinet') || q.includes('high risk')) {
        const list = criticalProjects.map(p => `• **${p.name}** (₹${p.sanctioned_budget_cr} Cr, Forecast Delay: ${this.evaluateProject(p).predicted_delay_days}d)`).join('\n');
        return `### 🚨 National Priority Critical Projects (${criticalProjects.length} Projects):\nThese projects exceed statutory delay or cost thresholds:\n\n${list}`;
      }

      if (q.includes('outlay') || q.includes('budget') || q.includes('expenditure') || q.includes('financial') || q.includes('money')) {
        return `### National Infrastructure Capital Outlay Summary:\n• **Total Monitored Outlay:** ₹${(totalBudget / 100000).toFixed(2)} Lakh Crores (₹${Math.round(totalBudget).toLocaleString()} Cr)\n• **Cumulative Expenditure:** ₹${(totalExp / 100000).toFixed(2)} Lakh Crores (₹${Math.round(totalExp).toLocaleString()} Cr)\n• **Overall Capital Utilization:** ${((totalExp / Math.max(1, totalBudget)) * 100).toFixed(1)}% across ${total} strategic mega-projects.`;
      }
    }

    return `I am your **AI Ministerial Intelligence Advisor (NIM-PRIS)**. You can ask me:\n• *"Which projects have critical schedule lag (SPI < 0.85)?"*\n• *"List all high-risk projects requiring Cabinet intervention"*\n• *"Summarize total capital outlay and expenditure"* \n• *"Draft an executive briefing note for [Project Name]"*`;
  }
};
