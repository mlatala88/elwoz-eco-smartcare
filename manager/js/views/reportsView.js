/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Reports & Analytics View (Raporty i analityka)
 */

export class ReportsView {
  constructor(container, router, dataProvider, state) {
    this.container = container;
    this.router = router;
    this.dataProvider = dataProvider;
    this.state = state;
    this.currentPeriod = "all";
  }

  async render() {
    this.container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1 class="view-title">Raporty i analityka operacyjna</h1>
          <div class="view-description">Zestawienia efektywności, terminowości SLA, obciążenia pracowników i powtarzających się problemów</div>
        </div>
        <div class="view-actions">
          <button class="btn btn-secondary btn-sm" id="btn-export-reports-csv">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            <span>Eksportuj raport do CSV</span>
          </button>
        </div>
      </div>

      <!-- Filtry raportu -->
      <div class="dashboard-filter-bar">
        <div class="period-buttons">
          <button class="period-btn ${this.currentPeriod === 'all' ? 'active' : ''}" data-rep-period="all">Pełny okres</button>
          <button class="period-btn ${this.currentPeriod === '30days' ? 'active' : ''}" data-rep-period="30days">Ostatnie 30 dni</button>
          <button class="period-btn ${this.currentPeriod === '7days' ? 'active' : ''}" data-rep-period="7days">Ostatnie 7 dni</button>
          <button class="period-btn ${this.currentPeriod === 'today' ? 'active' : ''}" data-rep-period="today">Dzisiaj</button>
        </div>
        <div style="font-size: 11px; color: var(--text-secondary);">
          Raport wygenerowany dla danych demonstracyjnych WSB Merito
        </div>
      </div>

      <!-- Główne KPI Raportu -->
      <div class="kpi-grid" style="grid-template-columns: repeat(6, 1fr); margin-bottom: 24px;" id="rep-kpi-grid">
        <!-- Renderowane dynamicznie -->
      </div>

      <!-- Dwie sekcje tabelaryczne: Obciążenie pracowników oraz Powtarzające się problemy -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <!-- Obciążenie pracowników -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="users" style="width: 16px; height: 16px;"></i>
              <span>Obciążenie i efektywność pracowników POK</span>
            </div>
          </div>
          <div class="table-container" style="border: none; border-radius: 0;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Pracownik</th>
                  <th>Przypisane</th>
                  <th>Rozwiązane</th>
                  <th>W realizacji</th>
                  <th>Skuteczność</th>
                </tr>
              </thead>
              <tbody id="rep-staff-tbody">
                <tr><td colspan="5" style="text-align: center; padding: 16px;">Ładowanie...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Najczęstsze problemy i kategorie -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="layers" style="width: 16px; height: 16px;"></i>
              <span>Najczęściej zgłaszane kategorie problemów</span>
            </div>
          </div>
          <div class="table-container" style="border: none; border-radius: 0;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Kategoria zgłoszenia</th>
                  <th>Liczba spraw</th>
                  <th>Udział procentowy</th>
                  <th>Wskaźnik rozwiązań</th>
                </tr>
              </thead>
              <tbody id="rep-cat-tbody">
                <tr><td colspan="4" style="text-align: center; padding: 16px;">Ładowanie...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    await this.loadReportData();

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }
  }

  bindEvents() {
    const periodBtns = this.container.querySelectorAll("[data-rep-period]");
    periodBtns.forEach(btn => {
      btn.onclick = () => {
        periodBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentPeriod = btn.getAttribute("data-rep-period");
        this.loadReportData();
      };
    });

    const exportBtn = this.container.querySelector("#btn-export-reports-csv");
    exportBtn.onclick = () => this.exportCsv();
  }

  async loadReportData() {
    const stats = await this.dataProvider.getStats(this.currentPeriod);
    const tickets = await this.dataProvider.getTickets();
    const staffList = await this.dataProvider.getStaff();

    // KPI grid
    const kpiGrid = this.container.querySelector("#rep-kpi-grid");
    kpiGrid.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-header"><span class="kpi-title">Nowe sprawy</span></div>
        <div class="kpi-value">${stats.newCount}</div>
        <div class="kpi-hint">Wpłynęły w okresie</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-header"><span class="kpi-title">Sprawy rozwiązane</span></div>
        <div class="kpi-value">${stats.resolved}</div>
        <div class="kpi-hint">Zakończone pomyślnie</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-header"><span class="kpi-title">Odsetek rozwiązań</span></div>
        <div class="kpi-value">${stats.resolutionRate !== '-' ? stats.resolutionRate + '%' : '-'}</div>
        <div class="kpi-hint">Wskaźnik finalizacji</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header"><span class="kpi-title">Śr. czas 1. reakcji</span></div>
        <div class="kpi-value">${stats.avgFirstResponseFormatted}</div>
        <div class="kpi-hint">Odpowiedź do klienta</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header"><span class="kpi-title">Śr. czas rozwiązania</span></div>
        <div class="kpi-value">${stats.avgResolutionFormatted}</div>
        <div class="kpi-hint">Czas cyklu sprawy</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-header"><span class="kpi-title">Średnia satysfakcja</span></div>
        <div class="kpi-value">${stats.avgSatisfactionFormatted !== '-' ? stats.avgSatisfactionFormatted + ' ★' : '-'}</div>
        <div class="kpi-hint">${stats.feedbackCount} ankiet powrotnych</div>
      </div>
    `;

    // Tabela pracowników
    const isClosed = s => s === "Rozwiązane" || s === "Zamknięte";
    const staffTbody = this.container.querySelector("#rep-staff-tbody");
    const staffRows = staffList.map(s => {
      const assigned = tickets.filter(t => t.assignee === s.name);
      const res = assigned.filter(t => isClosed(t.status));
      const inProg = assigned.filter(t => !isClosed(t.status));
      const rate = assigned.length > 0 ? ((res.length / assigned.length) * 100).toFixed(0) + "%" : "-";

      return `
        <tr>
          <td>
            <div style="font-weight: 600;">${s.name}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${s.role}</div>
          </td>
          <td style="font-weight: 600;">${assigned.length}</td>
          <td style="color: var(--brand-green); font-weight: 600;">${res.length}</td>
          <td>${inProg.length}</td>
          <td><span class="badge badge-status-rozwiazane">${rate}</span></td>
        </tr>
      `;
    });
    staffTbody.innerHTML = staffRows.join("");

    // Tabela kategorii
    const catTbody = this.container.querySelector("#rep-cat-tbody");
    const total = stats.total || 1;
    const catEntries = Object.entries(stats.categoryMap).sort((a, b) => b[1] - a[1]);

    catTbody.innerHTML = catEntries.map(([cat, count]) => {
      const pct = ((count / total) * 100).toFixed(1);
      const resolvedCount = tickets.filter(t => t.type === cat && isClosed(t.status)).length;
      const resRate = count > 0 ? ((resolvedCount / count) * 100).toFixed(0) + "%" : "-";

      return `
        <tr>
          <td style="font-weight: 600;">${cat}</td>
          <td>${count}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 6px; background-color: var(--bg-muted); border-radius: 3px; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background-color: var(--brand-navy);"></div>
              </div>
              <span style="font-size: 11px; color: var(--text-secondary); width: 35px;">${pct}%</span>
            </div>
          </td>
          <td><span class="badge badge-ai-przeanalizowano">${resRate}</span></td>
        </tr>
      `;
    }).join("");
  }

  async exportCsv() {
    const stats = await this.dataProvider.getStats(this.currentPeriod);
    const tickets = await this.dataProvider.getTickets();

    const headers = ["Wskaznik / Kategoria", "Wartosc", "Opis"];
    const rows = [
      ["Wszystkie zgloszenia w okresie", stats.total, "Laczna liczba zgloszen"],
      ["Zgloszenia rozwiazane", stats.resolved, "Liczba spraw ze statusem Rozwiazane"],
      ["Wskaznik rozwiazan", stats.resolutionRate + "%", "Odsetek zakonczonych sukcesem"],
      ["Sredni czas 1. reakcji", stats.avgFirstResponseFormatted, "Czas od zgloszenia do kontaktu"],
      ["Sredni czas rozwiazania", stats.avgResolutionFormatted, "Pelny cykl obslugi"],
      ["Srednia ocena satysfakcji", stats.avgSatisfactionFormatted, "Skala 1-5 gwiazdek"],
      ["Liczba opinii Google", stats.reviewInvitesCount, "Wyslane zaproszenia"]
    ];

    Object.entries(stats.categoryMap).forEach(([k, v]) => {
      rows.push([`Kategoria: ${k}`, v, "Liczba zgloszen w kategorii"]);
    });

    const disclaimer = "# RAPORT ANALITYCZNY - ELWOZ ECO SMARTCARE MANAGER V0.3.0 (DANE DEMONSTRACYJNE)\n";
    const csvContent = disclaimer + [headers.join(";")].concat(rows.map(r => r.join(";"))).join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elwoz-smartcare-raport-${this.currentPeriod}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    import("../components/toast.js").then(({ Toast }) => {
      Toast.success("Pomyślnie wygenerowano i pobrano plik CSV z raportem.");
    });
  }
}
