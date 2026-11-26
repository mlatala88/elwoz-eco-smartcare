/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Dashboard View (Pulpit - Customer Service Intelligence)
 */

export class DashboardView {
  constructor(container, router, dataProvider, state) {
    this.container = container;
    this.router = router;
    this.dataProvider = dataProvider;
    this.state = state;
    this.currentPeriod = "all";
    this.customRange = null;
    this.charts = {};
  }

  async render() {
    this.destroyCharts();

    this.container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1 class="view-title">Pulpit – Customer Service Intelligence</h1>
          <div class="view-description">Centrum analityczno-operacyjne biura obsługi mieszkańców ELWOZ ECO (Rejon Kartuzy)</div>
        </div>
        <div class="view-actions">
          <button class="btn btn-primary btn-sm" id="btn-quick-new-ticket">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
            <span>Nowe zgłoszenie</span>
          </button>
        </div>
      </div>

      <!-- Pasek filtrów okresu -->
      <div class="dashboard-filter-bar">
        <div class="period-buttons">
          <button class="period-btn ${this.currentPeriod === 'today' ? 'active' : ''}" data-period="today">Dzisiaj</button>
          <button class="period-btn ${this.currentPeriod === '7days' ? 'active' : ''}" data-period="7days">Ostatnie 7 dni</button>
          <button class="period-btn ${this.currentPeriod === '30days' ? 'active' : ''}" data-period="30days">Ostatnie 30 dni</button>
          <button class="period-btn ${this.currentPeriod === 'all' ? 'active' : ''}" data-period="all">Wszystkie</button>
          <button class="period-btn ${this.currentPeriod === 'custom' ? 'active' : ''}" data-period="custom">Własny zakres</button>
        </div>

        <div class="custom-range-inputs" id="custom-range-inputs" style="display: ${this.currentPeriod === 'custom' ? 'flex' : 'none'};">
          <label style="color: var(--text-secondary);">Od:</label>
          <input type="date" id="range-from" class="custom-date-input" value="${this.customRange ? this.customRange.from : ''}" />
          <label style="color: var(--text-secondary);">Do:</label>
          <input type="date" id="range-to" class="custom-date-input" value="${this.customRange ? this.customRange.to : ''}" />
          <button class="btn btn-secondary btn-xs" id="btn-apply-custom-range">Zastosuj</button>
        </div>
      </div>

      <!-- Siatka 16 wskaźników CSI -->
      <div class="kpi-grid" id="kpi-grid">
        <div style="grid-column: 1 / -1; text-align: center; padding: 20px;">Ładowanie wskaźników...</div>
      </div>

      <!-- Top 5 pilnych spraw -->
      <div class="top-urgent-section">
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="alert-triangle" style="width: 18px; height: 18px; color: var(--prio-urgent);"></i>
              <span>Najważniejsze sprawy wymagające pilnego działania (Top 5)</span>
            </div>
            <button class="btn btn-secondary btn-xs" id="btn-view-all-urgent">Zobacz całą kolejkę pilnych</button>
          </div>
          <div class="table-container" style="border: none; border-radius: 0;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID Zgłoszenia</th>
                  <th>Miejscowość / Ulica</th>
                  <th>Kategoria i Frakcja</th>
                  <th>Priorytet</th>
                  <th>SLA / Czas oczekiwania</th>
                  <th>Opiekun</th>
                  <th>Następne działanie</th>
                  <th style="text-align: right;">Akcja</th>
                </tr>
              </thead>
              <tbody id="top-urgent-tbody">
                <tr><td colspan="8" style="text-align: center; padding: 16px;">Ładowanie...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 6 Wykresów analitycznych -->
      <div class="charts-grid">
        <!-- 1. Zgłoszenia w czasie -->
        <div class="card chart-card chart-wide">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="trending-up" style="width: 16px; height: 16px;"></i>
              <span>Liczba zgłoszeń w czasie</span>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chart-time-trend"></canvas>
            </div>
          </div>
        </div>

        <!-- 2. Kategorie -->
        <div class="card chart-card">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="pie-chart" style="width: 16px; height: 16px;"></i>
              <span>Zgłoszenia według kategorii</span>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chart-categories"></canvas>
            </div>
          </div>
        </div>

        <!-- 3. Statusy -->
        <div class="card chart-card">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="activity" style="width: 16px; height: 16px;"></i>
              <span>Sprawy według statusów</span>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chart-statuses"></canvas>
            </div>
          </div>
        </div>

        <!-- 4. Priorytety -->
        <div class="card chart-card">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="layers" style="width: 16px; height: 16px;"></i>
              <span>Sprawy według priorytetów</span>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chart-priorities"></canvas>
            </div>
          </div>
        </div>

        <!-- 5. Rozwiązane a nowe -->
        <div class="card chart-card">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="check-circle-2" style="width: 16px; height: 16px;"></i>
              <span>Zgłoszenia rozwiązane a nowe</span>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chart-resolved-vs-new"></canvas>
            </div>
          </div>
        </div>

        <!-- 6. Satysfakcja w czasie -->
        <div class="card chart-card chart-wide">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="smile" style="width: 16px; height: 16px;"></i>
              <span>Rozkład ocen satysfakcji mieszkańców (skala 1–5)</span>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chart-csat"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    await this.loadData();

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }
  }

  bindEvents() {
    // Filtry okresu
    const periodBtns = this.container.querySelectorAll(".period-btn");
    periodBtns.forEach(btn => {
      btn.onclick = () => {
        const period = btn.getAttribute("data-period");
        this.currentPeriod = period;
        periodBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const rangeInputs = this.container.querySelector("#custom-range-inputs");
        if (period === "custom") {
          rangeInputs.style.display = "flex";
        } else {
          rangeInputs.style.display = "none";
          this.loadData();
        }
      };
    });

    const applyRangeBtn = this.container.querySelector("#btn-apply-custom-range");
    if (applyRangeBtn) {
      applyRangeBtn.onclick = () => {
        const from = this.container.querySelector("#range-from").value;
        const to = this.container.querySelector("#range-to").value;
        if (!from || !to) {
          import("../components/toast.js").then(({ Toast }) => Toast.warning("Wybierz obie daty zakresu."));
          return;
        }
        this.customRange = { from, to };
        this.loadData();
      };
    }

    // Nowe zgłoszenie
    const newBtn = this.container.querySelector("#btn-quick-new-ticket");
    if (newBtn) {
      newBtn.onclick = () => this.showNewTicketModal();
    }

    // Wszystkie pilne
    const viewAllUrgentBtn = this.container.querySelector("#btn-view-all-urgent");
    if (viewAllUrgentBtn) {
      viewAllUrgentBtn.onclick = () => this.router.navigate("tickets", { metricKey: "urgent" });
    }
  }

  async loadData() {
    const stats = await this.dataProvider.getStats(this.currentPeriod, this.customRange);
    this.renderKpis(stats);
    this.renderTopUrgent(stats.topUrgent);
    this.renderCharts(stats);

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }
  }

  renderKpis(s) {
    const kpis = [
      { key: "all", title: "Wszystkie zgłoszenia", val: s.total, icon: "inbox", hint: "Zobacz całą bazę", colorClass: "" },
      { key: "new", title: "Nowe zgłoszenia", val: s.newCount, icon: "sparkles", hint: "Oczekują na dyspozycję", colorClass: s.newCount > 0 ? "kpi-warning" : "" },
      { key: "no_response", title: "Bez 1. odpowiedzi", val: s.noFirstResponse, icon: "message-circle", hint: "Wymagają kontaktu POK", colorClass: s.noFirstResponse > 0 ? "kpi-warning" : "" },
      { key: "urgent", title: "Pilny kontakt", val: s.urgent, icon: "alert-triangle", hint: "Najwyższy priorytet", colorClass: s.urgent > 0 ? "kpi-urgent" : "" },
      { key: "overdue", title: "Przeterminowane (SLA)", val: s.overdue, icon: "clock", hint: "Przekroczone terminy", colorClass: s.overdue > 0 ? "kpi-urgent" : "" },
      { key: "today", title: "Zadania na dzisiaj", val: s.dueToday, icon: "calendar", hint: "Termin mija dziś", colorClass: "" },
      { key: "no_step", title: "Bez kolejnego kroku", val: s.noNextStep, icon: "alert-octagon", hint: "Wymagają zaplanowania", colorClass: s.noNextStep > 0 ? "kpi-urgent" : "" },
      { key: "awaiting_citizen", title: "Oczekuje na mieszkańca", val: s.awaitingCitizen, icon: "user-check", hint: "Prośba o dane/posesję", colorClass: "" },
      { key: "awaiting_company", title: "Oczekuje na firmę", val: s.awaitingCompany, icon: "truck", hint: "Działania operacyjne ELWOZ", colorClass: "" },
      { key: "resolved", title: "Sprawy rozwiązane", val: s.resolved, icon: "check-circle", hint: "Zakończone sukcesem", colorClass: "kpi-success" },
      { key: "resolved", title: "Wskaźnik rozwiązań", val: s.resolutionRate !== "-" ? `${s.resolutionRate}%` : "-", icon: "percent", hint: "Efektywność zamykania", colorClass: "kpi-success" },
      { key: "all", title: "Śr. czas 1. reakcji", val: s.avgFirstResponseFormatted, icon: "timer", hint: "Od wpłynięcia do kontaktu", colorClass: "" },
      { key: "resolved", title: "Śr. czas rozwiązania", val: s.avgResolutionFormatted, icon: "check-check", hint: "Pełny cykl obsługi", colorClass: "" },
      { key: "rated", title: "Średnia satysfakcja", val: s.avgSatisfactionFormatted !== "-" ? `${s.avgSatisfactionFormatted} ★` : "-", icon: "star", hint: "Oceny mieszkańców (1–5)", colorClass: "kpi-success" },
      { key: "rated", title: "Zebrane oceny", val: s.feedbackCount, icon: "thumbs-up", hint: "Liczba ankiet powrotnych", colorClass: "" },
      { key: "review_invites", title: "Zaproszenia do opinii", val: s.reviewInvitesCount, icon: "share-2", hint: "Wizytówka Google Reviews", colorClass: "" }
    ];

    const kpiGrid = this.container.querySelector("#kpi-grid");
    kpiGrid.innerHTML = kpis.map(k => `
      <div class="kpi-card ${k.colorClass}" data-metric="${k.key}" title="Kliknij, aby przefiltrować listę zgłoszeń">
        <div class="kpi-header">
          <span class="kpi-title">${k.title}</span>
          <i data-lucide="${k.icon}" class="kpi-icon"></i>
        </div>
        <div class="kpi-value-row">
          <div class="kpi-value">${k.val}</div>
        </div>
        <div class="kpi-hint">
          <span>${k.hint}</span>
          <i data-lucide="arrow-right" style="width: 12px; height: 12px;"></i>
        </div>
      </div>
    `).join("");

    kpiGrid.querySelectorAll(".kpi-card").forEach(card => {
      card.onclick = () => {
        const metric = card.getAttribute("data-metric");
        this.router.navigate("tickets", { metricKey: metric });
      };
    });
  }

  renderTopUrgent(tickets) {
    const tbody = this.container.querySelector("#top-urgent-tbody");
    if (!tickets || tickets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 20px;">Brak spraw wymagających natychmiastowego działania. Świetna robota!</td></tr>`;
      return;
    }

    tbody.innerHTML = tickets.map(t => `
      <tr class="row-clickable ${t.priority === 'PILNY' ? 'row-urgent' : ''}" data-ticket-id="${t.id}">
        <td class="table-ticket-id">${t.id}</td>
        <td>
          <div style="font-weight: 600;">${t.city}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${t.street} ${t.houseNumber || '(brak nr)'}</div>
        </td>
        <td>
          <div>${t.type}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${t.fraction}</div>
        </td>
        <td>
          <span class="badge badge-prio-${t.priority.toLowerCase()}">${t.priority}</span>
        </td>
        <td>
          ${t.slaOverdue === 'TAK' 
            ? '<span class="badge badge-prio-pilny">⚠️ Przekroczone SLA</span>' 
            : `<span style="font-size: 11px; color: var(--text-secondary);">${t.slaDeadline ? 'Do: ' + t.slaDeadline.substring(11, 16) : 'Brak terminu'}</span>`}
        </td>
        <td>${t.assignee || 'Nieprzypisany'}</td>
        <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${t.nextAction || '<span style="color: var(--prio-urgent); font-weight: 600;">Brak kolejnego kroku!</span>'}
        </td>
        <td style="text-align: right;">
          <button class="btn btn-navy btn-xs btn-open-detail" data-ticket-id="${t.id}">Otwórz</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".row-clickable").forEach(row => {
      row.onclick = (e) => {
        const tid = row.getAttribute("data-ticket-id");
        this.router.navigate("detail", { id: tid });
      };
    });
  }

  destroyCharts() {
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) {
        this.charts[key].destroy();
        delete this.charts[key];
      }
    });
  }

  renderCharts(s) {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js nie jest załadowany.");
      return;
    }

    this.destroyCharts();

    const brandNavy = "#252D72";
    const brandGreen = "#6BAA43";
    const prioUrgent = "#B42318";
    const prioHigh = "#B54708";
    const prioLow = "#376522";

    // 1. Liczba zgłoszeń w czasie
    const ctxTrend = this.container.querySelector("#chart-time-trend");
    if (ctxTrend) {
      this.charts.trend = new Chart(ctxTrend, {
        type: "line",
        data: {
          labels: s.trendLabels.length > 0 ? s.trendLabels : ["Brak danych"],
          datasets: [{
            label: "Nowe zgłoszenia",
            data: s.trendValues.length > 0 ? s.trendValues : [0],
            borderColor: brandNavy,
            backgroundColor: "rgba(37, 45, 114, 0.08)",
            tension: 0.3,
            fill: true,
            pointBackgroundColor: brandNavy,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Kategorie
    const ctxCat = this.container.querySelector("#chart-categories");
    if (ctxCat) {
      const catLabels = Object.keys(s.categoryMap);
      const catValues = Object.values(s.categoryMap);
      this.charts.cat = new Chart(ctxCat, {
        type: "doughnut",
        data: {
          labels: catLabels,
          datasets: [{
            data: catValues,
            backgroundColor: [brandNavy, brandGreen, "#F59E0B", "#10B981", "#6366F1", "#84CC16", "#EC4899"]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }

    // 3. Statusy
    const ctxStatus = this.container.querySelector("#chart-statuses");
    if (ctxStatus) {
      this.charts.status = new Chart(ctxStatus, {
        type: "bar",
        data: {
          labels: Object.keys(s.statusMap),
          datasets: [{
            label: "Liczba spraw",
            data: Object.values(s.statusMap),
            backgroundColor: ["#0284C7", "#D97706", "#4B5563", "#DC2626", brandGreen],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }

    // 4. Priorytety
    const ctxPrio = this.container.querySelector("#chart-priorities");
    if (ctxPrio) {
      this.charts.prio = new Chart(ctxPrio, {
        type: "bar",
        data: {
          labels: ["PILNY", "WYSOKI", "STANDARDOWY", "NISKI"],
          datasets: [{
            data: [s.priorityMap.PILNY || 0, s.priorityMap.WYSOKI || 0, s.priorityMap.STANDARDOWY || 0, s.priorityMap.NISKI || 0],
            backgroundColor: [prioUrgent, prioHigh, brandNavy, prioLow],
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }

    // 5. Rozwiązane vs Nowe
    const ctxRes = this.container.querySelector("#chart-resolved-vs-new");
    if (ctxRes) {
      this.charts.res = new Chart(ctxRes, {
        type: "bar",
        data: {
          labels: ["Wszystkie zgłoszenia", "W toku", "Rozwiązane"],
          datasets: [{
            data: [s.total, s.total - s.resolved, s.resolved],
            backgroundColor: [brandNavy, "#F59E0B", brandGreen],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }

    // 6. Satysfakcja
    const ctxCsat = this.container.querySelector("#chart-csat");
    if (ctxCsat) {
      this.charts.csat = new Chart(ctxCsat, {
        type: "bar",
        data: {
          labels: ["1 ★ (Bardzo źle)", "2 ★ (Źle)", "3 ★ (Średnio)", "4 ★ (Dobrze)", "5 ★ (Wzorowo)"],
          datasets: [{
            label: "Liczba ocen mieszkańców",
            data: [s.csatDistribution[1], s.csatDistribution[2], s.csatDistribution[3], s.csatDistribution[4], s.csatDistribution[5]],
            backgroundColor: [prioUrgent, "#F97316", "#FBBF24", "#84CC16", brandGreen],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }
  }

  showNewTicketModal() {
    import("../components/modal.js").then(({ Modal }) => {
      const modal = new Modal({
        title: "Dodaj nowe zgłoszenie do systemu",
        size: "md",
        content: `
          <form id="new-ticket-form">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label form-label-required">Kategoria zgłoszenia</label>
                <select class="form-select" id="new-type" required>
                  <option value="Brak odbioru odpadów">Brak odbioru odpadów</option>
                  <option value="Uszkodzony pojemnik">Uszkodzony pojemnik</option>
                  <option value="Brak worków">Brak worków</option>
                  <option value="Bałagan po odbiorze">Bałagan po odbiorze</option>
                  <option value="Pochwała">Pochwała</option>
                  <option value="Sugestia">Sugestia</option>
                  <option value="Inne">Inne</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label form-label-required">Frakcja odpadów</label>
                <select class="form-select" id="new-fraction" required>
                  <option value="BIO">BIO</option>
                  <option value="Plastik i metale">Plastik i metale</option>
                  <option value="Papier">Papier</option>
                  <option value="Szkło">Szkło</option>
                  <option value="Zmieszane">Zmieszane</option>
                  <option value="Wielkogabarytowe">Wielkogabarytowe</option>
                  <option value="Nie dotyczy">Nie dotyczy</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label form-label-required">Miejscowość</label>
                <select class="form-select" id="new-city" required>
                  <option value="Kartuzy">Kartuzy</option>
                  <option value="Żukowo">Żukowo</option>
                  <option value="Sierakowice">Sierakowice</option>
                  <option value="Somonino">Somonino</option>
                  <option value="Chmielno">Chmielno</option>
                  <option value="Przodkowo">Przodkowo</option>
                  <option value="Stężyca">Stężyca</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label form-label-required">Ulica</label>
                <input type="text" class="form-control" id="new-street" placeholder="np. Gdańska" required />
              </div>

              <div class="form-group">
                <label class="form-label form-label-required">Nr posesji</label>
                <input type="text" class="form-control" id="new-house-num" placeholder="np. 14B" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label form-label-required">Opis zgłoszenia</label>
              <textarea class="form-control" id="new-desc" rows="3" placeholder="Opisz problem zgłaszany przez mieszkańca..." required></textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Imię i nazwisko mieszkańca</label>
                <input type="text" class="form-control" id="new-name" placeholder="Jan Kowalski" />
              </div>

              <div class="form-group">
                <label class="form-label">Telefon kontaktowy</label>
                <input type="text" class="form-control" id="new-phone" placeholder="+48 600 000 000" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Adres e-mail</label>
                <input type="email" class="form-control" id="new-email" placeholder="mieszkaniec@przyklad.pl" />
              </div>

              <div class="form-group">
                <label class="form-label">Wstępny priorytet</label>
                <select class="form-select" id="new-prio">
                  <option value="STANDARDOWY">STANDARDOWY</option>
                  <option value="PILNY">PILNY</option>
                  <option value="WYSOKI">WYSOKI</option>
                  <option value="NISKI">NISKI</option>
                </select>
              </div>
            </div>
          </form>
        `,
        footer: `
          <button class="btn btn-secondary btn-sm" id="btn-cancel-new">Anuluj</button>
          <button class="btn btn-primary btn-sm" id="btn-submit-new">Zapisz zgłoszenie</button>
        `
      });

      const cancelBtn = modal.element.querySelector("#btn-cancel-new");
      cancelBtn.onclick = () => modal.close();

      const submitBtn = modal.element.querySelector("#btn-submit-new");
      submitBtn.onclick = async () => {
        const form = modal.element.querySelector("#new-ticket-form");
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const newTicketData = {
          type: modal.element.querySelector("#new-type").value,
          fraction: modal.element.querySelector("#new-fraction").value,
          city: modal.element.querySelector("#new-city").value,
          street: modal.element.querySelector("#new-street").value,
          houseNumber: modal.element.querySelector("#new-house-num").value,
          description: modal.element.querySelector("#new-desc").value,
          applicantName: modal.element.querySelector("#new-name").value || "Mieszkaniec",
          applicantPhone: modal.element.querySelector("#new-phone").value,
          applicantEmail: modal.element.querySelector("#new-email").value,
          priority: modal.element.querySelector("#new-prio").value,
          status: "Nowe",
          assignee: "Nieprzypisany"
        };

        const created = await this.dataProvider.createTicket(newTicketData);
        modal.close();
        import("../components/toast.js").then(({ Toast }) => {
          Toast.success(`Dodano nowe zgłoszenie: ${created.id}`);
        });
        this.loadData();
      };

      modal.open();
    });
  }
}
