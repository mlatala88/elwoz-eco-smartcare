/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Diagnostics View (Diagnostyka systemu i testy integracyjne)
 */

export class DiagnosticsView {
  constructor(container, router, dataProvider, state) {
    this.container = container;
    this.router = router;
    this.dataProvider = dataProvider;
    this.state = state;
  }

  async render() {
    this.container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1 class="view-title">Diagnostyka systemu & Integracja</h1>
          <div class="view-description">Telemetria techniczna, stan połączeń z bazą danych i Gemini API, rejestr błędów operacyjnych</div>
        </div>
        <div class="view-actions">
          <button class="btn btn-secondary btn-sm" id="btn-sync-now">
            <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
            <span>Wymuś synchronizację</span>
          </button>
          <button class="btn btn-primary btn-sm" id="btn-run-diag-test">
            <i data-lucide="play" style="width: 14px; height: 14px;"></i>
            <span>Uruchom test diagnostyczny API</span>
          </button>
        </div>
      </div>

      <!-- Kafelki telemetryczne -->
      <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;" id="diag-kpi-grid">
        <div class="kpi-card" id="card-status-crm">
          <div class="kpi-header"><span class="kpi-title">Baza danych (Arkusz CRM)</span><i data-lucide="database" class="kpi-icon"></i></div>
          <div class="kpi-value-row"><div class="kpi-value" style="font-size: 20px;" id="val-db-status">Łączenie...</div></div>
          <div class="kpi-hint" id="hint-db-mode">Demo DataProvider</div>
        </div>

        <div class="kpi-card" id="card-status-ai">
          <div class="kpi-header"><span class="kpi-title">Gemini API (Silnik AI)</span><i data-lucide="cpu" class="kpi-icon"></i></div>
          <div class="kpi-value-row"><div class="kpi-value" style="font-size: 20px;" id="val-ai-status">Łączenie...</div></div>
          <div class="kpi-hint" id="hint-ai-model">gemini-3.6-flash</div>
        </div>

        <div class="kpi-card" id="card-status-latency">
          <div class="kpi-header"><span class="kpi-title">Średnie opóźnienie</span><i data-lucide="zap" class="kpi-icon"></i></div>
          <div class="kpi-value-row"><div class="kpi-value" id="val-latency">- ms</div></div>
          <div class="kpi-hint">Czas odpowiedzi warstwy danych</div>
        </div>

        <div class="kpi-card" id="card-status-errors">
          <div class="kpi-header"><span class="kpi-title">Błędy operacyjne</span><i data-lucide="alert-triangle" class="kpi-icon"></i></div>
          <div class="kpi-value-row"><div class="kpi-value" id="val-errors-count">0</div></div>
          <div class="kpi-hint" id="hint-errors-desc">Walidacja i komunikacja</div>
        </div>
      </div>

      <!-- Tryb symulacji błędów dla testów akceptacyjnych -->
      <div class="card" style="margin-bottom: 20px; border-left: 4px solid var(--prio-high);">
        <div class="card-body" style="padding: 16px 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-weight: 700; font-size: 14px; color: var(--text-primary); margin-bottom: 4px;">
                Symulator awarii i limitów API (Narzędzie testowe QA)
              </div>
              <div style="font-size: 13px; color: var(--text-secondary); max-width: 650px;">
                Umożliwia zasymulowanie błędu limitu quota (HTTP 429 / 503) w Gemini API w celu zweryfikowania odporności interfejsu (brak zamykania okna dialogowego, czytelny komunikat błędu, możliwość ponowienia próby zgodnie ze scenariuszami TEST-12 i TEST-18).
              </div>
            </div>
            <button class="btn btn-outline btn-sm" id="btn-toggle-sim-error">
              <i data-lucide="toggle-left" id="icon-sim-toggle" style="width: 16px; height: 16px;"></i>
              <span id="text-sim-toggle">Włącz symulację błędu Gemini API</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Wyniki ostatniego testu diagnostycznego -->
      <div class="card" style="margin-bottom: 20px;" id="diag-results-card">
        <div class="card-header">
          <div class="card-title">
            <i data-lucide="check-circle" style="width: 16px; height: 16px; color: var(--brand-green);"></i>
            <span>Wyniki automatycznego pakietu diagnostycznego</span>
          </div>
          <span style="font-size: 12px; color: var(--text-secondary);" id="diag-last-run-time">-</span>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Testowany komponent / reguła</th>
                <th>Status testu</th>
                <th>Czas odpowiedzi</th>
                <th>Szczegóły weryfikacji</th>
              </tr>
            </thead>
            <tbody id="diag-test-tbody">
              <tr><td colspan="4" style="text-align: center; padding: 16px;">Kliknij „Uruchom test diagnostyczny API”, aby zainicjować procedurę.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Karta specyfikacji technicznej środowiska -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <i data-lucide="info" style="width: 16px; height: 16px;"></i>
            <span>Metadane i architektura wersji demonstracyjnej v0.3.0</span>
          </div>
        </div>
        <div class="card-body" style="font-size: 13px; line-height: 1.6;">
          <div style="display: grid; grid-template-columns: 220px 1fr; gap: 8px; margin-bottom: 12px;">
            <span style="font-weight: 600; color: var(--text-secondary);">Wersja aplikacji:</span>
            <span>ELWOZ ECO SmartCare Manager v0.3.0-demo (WSB Merito)</span>

            <span style="font-weight: 600; color: var(--text-secondary);">Warstwa dostępu do danych:</span>
            <span>DemoDataProvider (izolacja interfejsu, adapter gotowy na AppsScriptDataProvider)</span>

            <span style="font-weight: 600; color: var(--text-secondary);">Model językowy AI:</span>
            <span>Gemini 3.6 Flash (Structured Outputs, 10 pól schematu, filtr thought)</span>

            <span style="font-weight: 600; color: var(--text-secondary);">Format bazy CRM:</span>
            <span>43 kolumny CSI zgodne ze strukturą Google Sheets v0.2.7/v0.2.8</span>

            <span style="font-weight: 600; color: var(--text-secondary);">Zabezpieczenie przed wyciekiem:</span>
            <span>Twardy filtr PII (anonimizacja ulic i nazwisk przed modelem AI)</span>
          </div>
          <div style="padding: 10px; background-color: var(--bg-muted); border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 12px; color: var(--text-secondary);">
            <strong>Uwaga bezpieczeństwa:</strong> Niniejsza wersja demonstracyjna działa w 100% po stronie przeglądarki klienta i nie wysyła żadnych rzeczywistych wiadomości e-mail ani zapytań do zewnętrznych baz danych.
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    await this.loadDiagnostics();

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }
  }

  bindEvents() {
    const runBtn = this.container.querySelector("#btn-run-diag-test");
    runBtn.onclick = async () => {
      runBtn.disabled = true;
      runBtn.innerHTML = `<span>⏳ Uruchamianie testów...</span>`;

      const results = await this.dataProvider.runDiagnosticsTest();
      this.renderTestResults(results);

      runBtn.disabled = false;
      runBtn.innerHTML = `
        <i data-lucide="play" style="width: 14px; height: 14px;"></i>
        <span>Uruchom test diagnostyczny API</span>
      `;
      if (window.lucide) window.lucide.createIcons({ root: runBtn });

      import("../components/toast.js").then(({ Toast }) => {
        Toast.success("Pakiet testów diagnostycznych zakończony pomyślnie.");
      });
    };

    const syncBtn = this.container.querySelector("#btn-sync-now");
    syncBtn.onclick = async () => {
      syncBtn.disabled = true;
      syncBtn.innerHTML = `<span>Synchronizacja...</span>`;
      await new Promise(r => setTimeout(r, 600));
      await this.loadDiagnostics();
      syncBtn.disabled = false;
      syncBtn.innerHTML = `
        <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
        <span>Wymuś synchronizację</span>
      `;
      if (window.lucide) window.lucide.createIcons({ root: syncBtn });
      import("../components/toast.js").then(({ Toast }) => {
        Toast.success("Zsynchronizowano stan telemetrii.");
      });
    };

    const toggleSimBtn = this.container.querySelector("#btn-toggle-sim-error");
    toggleSimBtn.onclick = async () => {
      const updated = await this.dataProvider.toggleSimulatedError();
      await this.loadDiagnostics();
      import("../components/toast.js").then(({ Toast }) => {
        if (updated.simulatedErrorMode) {
          Toast.warning("Włączono symulację błędu Gemini API (HTTP 503).");
        } else {
          Toast.success("Wyłączono symulację błędu – Gemini API działa normalnie.");
        }
      });
    };
  }

  async loadDiagnostics() {
    const diag = await this.dataProvider.getDiagnostics();

    const dbStatus = this.container.querySelector("#val-db-status");
    if (dbStatus) {
      dbStatus.textContent = diag.sheetsConnection;
      dbStatus.style.color = diag.sheetsConnection === "OK" ? "var(--brand-green)" : "var(--prio-urgent)";
    }

    const aiStatus = this.container.querySelector("#val-ai-status");
    if (aiStatus) {
      aiStatus.textContent = diag.simulatedErrorMode ? "Błąd symulowany" : "Dostępne";
      aiStatus.style.color = diag.simulatedErrorMode ? "var(--prio-urgent)" : "var(--brand-green)";
    }

    const latencyEl = this.container.querySelector("#val-latency");
    if (latencyEl) latencyEl.textContent = `${diag.latencyMs} ms`;

    const errorsEl = this.container.querySelector("#val-errors-count");
    if (errorsEl) {
      const totalErrors = diag.aiErrors + diag.commErrors + diag.validationIssues;
      errorsEl.textContent = totalErrors;
      errorsEl.style.color = totalErrors > 0 ? "var(--prio-high)" : "var(--brand-green)";
    }

    const toggleText = this.container.querySelector("#text-sim-toggle");
    const toggleIcon = this.container.querySelector("#icon-sim-toggle");
    if (toggleText && toggleIcon) {
      if (diag.simulatedErrorMode) {
        toggleText.textContent = "Wyłącz symulację błędu (Przywróć stan OK)";
        toggleIcon.setAttribute("data-lucide", "toggle-right");
        toggleIcon.style.color = "var(--prio-urgent)";
      } else {
        toggleText.textContent = "Włącz symulację błędu Gemini API";
        toggleIcon.setAttribute("data-lucide", "toggle-left");
        toggleIcon.style.color = "";
      }
    }
  }

  renderTestResults(res) {
    const lastRunEl = this.container.querySelector("#diag-last-run-time");
    if (lastRunEl) lastRunEl.textContent = `Wykonano: ${res.timestamp}`;

    const tbody = this.container.querySelector("#diag-test-tbody");
    tbody.innerHTML = res.tests.map(t => `
      <tr>
        <td style="font-weight: 600;">${t.name}</td>
        <td>
          <span class="badge ${t.status === 'PASSED' ? 'badge-status-rozwiazane' : 'badge-prio-pilny'}">
            ${t.status === 'PASSED' ? '✓ ZALICZONY' : '✗ BŁĄD'}
          </span>
        </td>
        <td style="font-family: monospace; font-size: 12px;">${t.latency}</td>
        <td style="font-size: 12px; color: var(--text-secondary);">
          ${t.status === 'PASSED' ? 'Parametry w normie operacyjnej' : 'Wykryto symulowaną awarię komponentu'}
        </td>
      </tr>
    `).join("");
  }
}
