// ==========================================================================
// National Infrastructure Monitoring & Project Risk Intelligence System (NIM-PRIS)
// Government Visual Analytics & EVM Charts Engine
// ==========================================================================

let govCharts = {
  ministryChart: null,
  progressChart: null,
  evmChart: null,
  delayChart: null
};

function getGovChartPalette() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    textColor: isLight ? '#334155' : '#cbd5e1',
    gridColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  };
}

function initGovCharts(projects) {
  if (!projects || !projects.length) return;
  const palette = getGovChartPalette();

  // 1. Ministry-wise Capital Outlay vs Expenditure
  const minCtx = document.getElementById('ministryChart');
  if (minCtx) {
    if (govCharts.ministryChart) govCharts.ministryChart.destroy();

    const ministries = {};
    projects.forEach(p => {
      const m = p.ministry.replace('Ministry of ', '');
      if (!ministries[m]) ministries[m] = { outlay: 0, exp: 0 };
      ministries[m].outlay += parseFloat(p.sanctioned_budget_cr || 0);
      ministries[m].exp += parseFloat(p.actual_expenditure_cr || 0);
    });

    const labels = Object.keys(ministries);
    const outlayData = labels.map(m => Math.round(ministries[m].outlay));
    const expData = labels.map(m => Math.round(ministries[m].exp));

    govCharts.ministryChart = new Chart(minCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sanctioned Capital Outlay (₹ Cr)',
            data: outlayData,
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: '#6366f1',
            borderWidth: 1.5,
            borderRadius: 6
          },
          {
            label: 'Cumulative Expenditure (₹ Cr)',
            data: expData,
            backgroundColor: 'rgba(6, 182, 212, 0.85)',
            borderColor: '#06b6d4',
            borderWidth: 1.5,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: palette.textColor, font: { family: palette.fontFamily, size: 10 } },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: palette.textColor,
              font: { family: palette.fontFamily },
              callback: val => '₹' + val.toLocaleString() + ' Cr'
            },
            grid: { color: palette.gridColor }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: palette.textColor, font: { family: palette.fontFamily } }
          }
        }
      }
    });
  }

  // 2. Physical vs Planned Progress (%)
  const progCtx = document.getElementById('progressChart');
  if (progCtx) {
    if (govCharts.progressChart) govCharts.progressChart.destroy();

    const topProj = projects.slice(0, 8);
    const labels = topProj.map(p => (p.code || p.name.substring(0, 15)));
    const physical = topProj.map(p => p.physical_progress_pct);
    const planned = topProj.map(p => p.planned_progress_pct);

    govCharts.progressChart = new Chart(progCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Planned Target Schedule (%)',
            data: planned,
            backgroundColor: 'rgba(148, 163, 184, 0.3)',
            borderColor: '#94a3b8',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Verified Physical Progress (%)',
            data: physical,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#10b981',
            borderWidth: 1.5,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: palette.textColor, font: { family: palette.fontFamily, size: 11 } },
            grid: { display: false }
          },
          y: {
            max: 100,
            ticks: { color: palette.textColor, font: { family: palette.fontFamily } },
            grid: { color: palette.gridColor }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: palette.textColor, font: { family: palette.fontFamily } }
          }
        }
      }
    });
  }

  // 3. Earned Value SPI vs CPI Scatter/Quadrant
  const evmCtx = document.getElementById('evmChart');
  if (evmCtx) {
    if (govCharts.evmChart) govCharts.evmChart.destroy();

    const evmData = projects.map(p => {
      const evalRes = GovMLEngine.evaluateProject(p);
      return {
        x: evalRes.spi,
        y: evalRes.cpi,
        name: p.name,
        code: p.code
      };
    });

    govCharts.evmChart = new Chart(evmCtx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Mega-Projects (Target: Top-Right Quadrant SPI ≥ 1, CPI ≥ 1)',
          data: evmData,
          backgroundColor: evmData.map(d => (d.x >= 0.95 && d.y >= 0.95) ? '#10b981' : (d.x < 0.85 || d.y < 0.85) ? '#f43f5e' : '#f59e0b'),
          pointRadius: 7,
          pointHoverRadius: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: 'Schedule Performance Index (SPI)', color: palette.textColor },
            ticks: { color: palette.textColor, font: { family: palette.fontFamily } },
            grid: { color: palette.gridColor },
            min: 0.6,
            max: 1.2
          },
          y: {
            title: { display: true, text: 'Cost Performance Index (CPI)', color: palette.textColor },
            ticks: { color: palette.textColor, font: { family: palette.fontFamily } },
            grid: { color: palette.gridColor },
            min: 0.6,
            max: 1.2
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.raw.code}: SPI ${ctx.raw.x}, CPI ${ctx.raw.y} (${ctx.raw.name})`
            }
          },
          legend: {
            position: 'top',
            labels: { color: palette.textColor, font: { family: palette.fontFamily } }
          }
        }
      }
    });
  }

  // 4. Forecasted Delay Days Bar Chart
  const delayCtx = document.getElementById('delayChart');
  if (delayCtx) {
    if (govCharts.delayChart) govCharts.delayChart.destroy();

    const sortedProj = [...projects]
      .map(p => ({ ...p, delay: GovMLEngine.evaluateProject(p).predicted_delay_days }))
      .sort((a, b) => b.delay - a.delay)
      .slice(0, 8);

    const labels = sortedProj.map(p => (p.code || p.name.substring(0, 16)));
    const delays = sortedProj.map(p => p.delay);

    govCharts.delayChart = new Chart(delayCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          axis: 'y',
          label: 'ML Forecasted Delay (Days)',
          data: delays,
          backgroundColor: delays.map(d => d > 90 ? '#f43f5e' : d > 30 ? '#f59e0b' : '#10b981'),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: palette.textColor, font: { family: palette.fontFamily } },
            grid: { color: palette.gridColor }
          },
          y: {
            ticks: { color: palette.textColor, font: { family: palette.fontFamily, size: 10 } },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}
