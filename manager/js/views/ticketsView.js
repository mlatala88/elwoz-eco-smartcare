/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Tickets View (Wszystkie zgłoszenia – Kompaktowa tabela operacyjna)
 */

export class TicketsView {
  constructor(container, router, dataProvider, state) {
    this.container = container;
    this.router = router;
    this.dataProvider = dataProvider;
    this.state = state;

    this.filters = {
      search: "",
      status: "all",
      priority: "all",
      category: "all",
      assignee: "all",
      aiState: "all",
      deadlineFilter: "all",
      sortField: "timestamp",
      sortOrder: "desc"
    };

    // Konfiguracja widoczności kolumn (domyślnie najważniejsze kolumny operacyjne)
    this.columnDefs = [
      { id: "id", label: "ID Zgłoszenia", default: true, required: true },
      { id: "timestamp", label: "Data zgłoszenia", default: true },
      { id: "location", label: "Miejscowość / Ulica", default: true },
      { id: "type", label: "Kategoria", default: true },
      { id: "fraction", label: "Frakcja", default: true },
      { id: "priority", label: "Priorytet", default: true },
      { id: "status", label: "Status", default: true },
      { id: "assignee", label: "Opiekun", default: true },
      { id: "nextAction", label: "Następne działanie", default: true },
      { id: "deadline", label: "Termin działania", default: true },
      { id: "aiState", label: "Stan AI", default: true },
      // Opcjonalne dodatkowe kolumny
      { id: "applicant", label: "Mieszkaniec (Dane)", default: false },
      { id: "contactRequest", label: "Prośba o kontakt", default: false },
      { id: "slaDeadline", label: "Termin SLA", default: false },
      { id: "satisfaction", label: "Ocena satysfakcji", default: false },
      { id: "reviewInvite", label: "Zaproszenie Google", default: false }
    ];

    this.visibleColumns = new Set(this.columnDefs.filter(c => c.default).map(c => c.id));
  }

  async render(params = {}) {
    if (params.search) this.filters.search = params.search;
    if (params.metricKey) this.filters.metricKey = params.metricKey;

    const staffList = await this.dataProvider.getStaff();

    this.container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1 class="view-title">Wszystkie zgłoszenia</h1>
          <div class="view-description">Centralny rejestr CRM • Filtry wielokryterialne • Widok operacyjny</div>
        </div>
        <div class="view-actions">
          <button class="btn btn-secondary btn-sm" id="btn-toggle-columns">
            <i data-lucide="sliders-horizontal" style="width: 14px; height: 14px;"></i>
            <span>Widoczność kolumn</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-export-csv">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            <span>Eksport CSV</span>
          </button>
          <button class="btn btn-primary btn-sm" id="btn-new-ticket">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
            <span>Dodaj zgłoszenie</span>
          </button>
        </div>
      </div>

      <!-- Pasek filtrów wielokryterialnych -->
      <div class="card" style="margin-bottom: 16px; padding: 14px 16px;">
        <div style="display: grid; grid-template-columns: 2fr repeat(6, 1fr) auto; gap: 10px; align-items: end;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Szukaj</label>
            <div class="input-group">
              <i data-lucide="search" class="input-icon" style="width: 15px; height: 15px;"></i>
              <input type="text" id="filter-search" class="form-control input-with-icon" 
                     placeholder="ID, nazwisko, adres, opis..." value="${this.filters.search || ''}" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Status</label>
            <select class="form-select" id="filter-status">
              <option value="all">Wszystkie statusy</option>
              <option value="Nowe" ${this.filters.status === 'Nowe' ? 'selected' : ''}>Nowe</option>
              <option value="Do weryfikacji" ${this.filters.status === 'Do weryfikacji' ? 'selected' : ''}>Do weryfikacji</option>
              <option value="W realizacji" ${this.filters.status === 'W realizacji' ? 'selected' : ''}>W realizacji</option>
              <option value="Oczekuje na informacje" ${this.filters.status === 'Oczekuje na informacje' ? 'selected' : ''}>Oczekuje na informacje</option>
              <option value="Rozwiązane" ${this.filters.status === 'Rozwiązane' ? 'selected' : ''}>Rozwiązane</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Priorytet</label>
            <select class="form-select" id="filter-priority">
              <option value="all">Wszystkie priorytety</option>
              <option value="PILNY">PILNY</option>
              <option value="WYSOKI">WYSOKI</option>
              <option value="STANDARDOWY">STANDARDOWY</option>
              <option value="NISKI">NISKI</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Kategoria</label>
            <select class="form-select" id="filter-category">
              <option value="all">Wszystkie kategorie</option>
              <option value="Brak odbioru odpadów">Brak odbioru</option>
              <option value="Uszkodzony pojemnik">Uszkodzony pojemnik</option>
              <option value="Brak worków">Brak worków</option>
              <option value="Bałagan po odbiorze">Bałagan po odbiorze</option>
              <option value="Pochwała">Pochwała</option>
              <option value="Sugestia">Sugestia</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Opiekun</label>
            <select class="form-select" id="filter-assignee">
              <option value="all">Wszyscy pracownicy</option>
              <option value="Nieprzypisany">Nieprzypisany</option>
              ${staffList.map(s => `<option value="${s.name}">${s.name}</option>`).join("")}
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Termin</label>
            <select class="form-select" id="filter-deadline">
              <option value="all">Wszystkie terminy</option>
              <option value="overdue">Przeterminowane (SLA)</option>
              <option value="today">Termin dzisiaj</option>
              <option value="no_step">Bez kolejnego kroku</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Stan analizy AI</label>
            <select class="form-select" id="filter-ai-state">
              <option value="all">Wszystkie stany</option>
              <option value="Przeanalizowano">Przeanalizowano</option>
              <option value="Wymaga weryfikacji">Wymaga weryfikacji</option>
              <option value="Błąd">Błąd analizy</option>
            </select>
          </div>

          <button class="btn btn-secondary btn-sm" id="btn-reset-filters" style="height: 38px;">
            <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
            <span>Reset</span>
          </button>
        </div>
      </div>

      <!-- Licznik wyników i aktywny filtr wskaźnika -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <div style="font-size: 13px; color: var(--text-secondary);" id="tickets-count-label">
          Ładowanie wyników...
        </div>
        <div id="active-metric-badge" style="display: none;"></div>
      </div>

      <!-- Tabela zgłoszeń -->
      <div class="table-container">
        <table class="data-table" id="tickets-table">
          <thead id="tickets-table-head">
            <!-- Dynamicznie wg widocznych kolumn -->
          </thead>
          <tbody id="tickets-table-body">
            <tr><td colspan="12" style="text-align: center; padding: 24px;">Ładowanie danych...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    this.bindEvents();
    await this.loadTickets();

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }
  }

  bindEvents() {
    // Filtry
    const searchInput = this.container.querySelector("#filter-search");
    let debounceTimer;
    searchInput.oninput = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.filters.search = searchInput.value;
        this.loadTickets();
      }, 300);
    };

    const statusSel = this.container.querySelector("#filter-status");
    statusSel.onchange = () => { this.filters.status = statusSel.value; this.loadTickets(); };

    const prioSel = this.container.querySelector("#filter-priority");
    prioSel.onchange = () => { this.filters.priority = prioSel.value; this.loadTickets(); };

    const catSel = this.container.querySelector("#filter-category");
    catSel.onchange = () => { this.filters.category = catSel.value; this.loadTickets(); };

    const assigneeSel = this.container.querySelector("#filter-assignee");
    assigneeSel.onchange = () => { this.filters.assignee = assigneeSel.value; this.loadTickets(); };

    const deadlineSel = this.container.querySelector("#filter-deadline");
    deadlineSel.onchange = () => { this.filters.deadlineFilter = deadlineSel.value; this.loadTickets(); };

    const aiSel = this.container.querySelector("#filter-ai-state");
    aiSel.onchange = () => { this.filters.aiState = aiSel.value; this.loadTickets(); };

    const resetBtn = this.container.querySelector("#btn-reset-filters");
    resetBtn.onclick = () => {
      this.filters = {
        search: "",
        status: "all",
        priority: "all",
        category: "all",
        assignee: "all",
        aiState: "all",
        deadlineFilter: "all",
        sortField: "timestamp",
        sortOrder: "desc"
      };
      this.render();
    };

    // Widoczność kolumn
    const toggleColsBtn = this.container.querySelector("#btn-toggle-columns");
    toggleColsBtn.onclick = () => this.showColumnVisibilityModal();

    // Eksport CSV
    const exportBtn = this.container.querySelector("#btn-export-csv");
    exportBtn.onclick = () => this.exportCsv();

    // Nowe zgłoszenie
    const newBtn = this.container.querySelector("#btn-new-ticket");
    newBtn.onclick = () => {
      import("./dashboardView.js").then(({ DashboardView }) => {
        const dv = new DashboardView(this.container, this.router, this.dataProvider, this.state);
        dv.showNewTicketModal();
      });
    };
  }

  async loadTickets() {
    const tickets = await this.dataProvider.getTickets(this.filters);

    const countLabel = this.container.querySelector("#tickets-count-label");
    if (countLabel) {
      countLabel.textContent = `Wyświetlono: ${tickets.length} zgłoszeń`;
    }

    const metricBadge = this.container.querySelector("#active-metric-badge");
    if (metricBadge) {
      if (this.filters.metricKey) {
        metricBadge.style.display = "inline-flex";
        metricBadge.innerHTML = `
          <span class="badge badge-status-w-realizacji">
            Filtr wskaźnika: ${this.filters.metricKey}
            <button id="btn-clear-metric" style="background: none; border: none; cursor: pointer; margin-left: 4px;">&times;</button>
          </span>
        `;
        metricBadge.querySelector("#btn-clear-metric").onclick = () => {
          delete this.filters.metricKey;
          metricBadge.style.display = "none";
          this.loadTickets();
        };
      } else {
        metricBadge.style.display = "none";
      }
    }

    this.renderTableHeader();
    this.renderTableBody(tickets);

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }
  }

  renderTableHeader() {
    const thead = this.container.querySelector("#tickets-table-head");
    let headersHtml = "<tr>";

    const isVis = id => this.visibleColumns.has(id);

    if (isVis("id")) headersHtml += `<th class="sortable" data-sort="id">ID ${this.getSortIcon("id")}</th>`;
    if (isVis("timestamp")) headersHtml += `<th class="sortable" data-sort="timestamp">Data zgłoszenia ${this.getSortIcon("timestamp")}</th>`;
    if (isVis("location")) headersHtml += `<th class="sortable" data-sort="city">Lokalizacja ${this.getSortIcon("city")}</th>`;
    if (isVis("type")) headersHtml += `<th class="sortable" data-sort="type">Kategoria ${this.getSortIcon("type")}</th>`;
    if (isVis("fraction")) headersHtml += `<th>Frakcja</th>`;
    if (isVis("priority")) headersHtml += `<th class="sortable" data-sort="priority">Priorytet ${this.getSortIcon("priority")}</th>`;
    if (isVis("status")) headersHtml += `<th class="sortable" data-sort="status">Status ${this.getSortIcon("status")}</th>`;
    if (isVis("assignee")) headersHtml += `<th class="sortable" data-sort="assignee">Opiekun ${this.getSortIcon("assignee")}</th>`;
    if (isVis("nextAction")) headersHtml += `<th>Następne działanie</th>`;
    if (isVis("deadline")) headersHtml += `<th class="sortable" data-sort="nextActionDeadline">Termin ${this.getSortIcon("nextActionDeadline")}</th>`;
    if (isVis("aiState")) headersHtml += `<th>Stan AI</th>`;

    // Opcjonalne
    if (isVis("applicant")) headersHtml += `<th>Mieszkaniec</th>`;
    if (isVis("contactRequest")) headersHtml += `<th>Kontakt</th>`;
    if (isVis("slaDeadline")) headersHtml += `<th>SLA Reakcji</th>`;
    if (isVis("satisfaction")) headersHtml += `<th>Ocena</th>`;
    if (isVis("reviewInvite")) headersHtml += `<th>Opinia Google</th>`;

    headersHtml += `<th style="text-align: right;">Akcja</th></tr>`;
    thead.innerHTML = headersHtml;

    // Obsługa sortowania
    thead.querySelectorAll("th.sortable").forEach(th => {
      th.onclick = () => {
        const field = th.getAttribute("data-sort");
        if (this.filters.sortField === field) {
          this.filters.sortOrder = this.filters.sortOrder === "asc" ? "desc" : "asc";
        } else {
          this.filters.sortField = field;
          this.filters.sortOrder = "asc";
        }
        this.loadTickets();
      };
    });
  }

  getSortIcon(field) {
    if (this.filters.sortField !== field) return "";
    return this.filters.sortOrder === "asc" ? "▲" : "▼";
  }

  renderTableBody(tickets) {
    const tbody = this.container.querySelector("#tickets-table-body");
    if (tickets.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="15">
            <div class="empty-state">
              <i data-lucide="search-x" class="empty-state-icon"></i>
              <div class="empty-state-title">Brak pasujących zgłoszeń</div>
              <div class="empty-state-desc">Zmień parametry wyszukiwania lub zresetuj aktywne filtry.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const isVis = id => this.visibleColumns.has(id);

    tbody.innerHTML = tickets.map(t => {
      const isUrgent = t.priority === "PILNY";
      let rowHtml = `<tr class="row-clickable ${isUrgent ? 'row-urgent' : ''}" data-ticket-id="${t.id}">`;

      if (isVis("id")) rowHtml += `<td class="table-ticket-id">${t.id}</td>`;
      if (isVis("timestamp")) rowHtml += `<td style="white-space: nowrap; font-size: 12px; color: var(--text-secondary);">${t.timestamp}</td>`;
      if (isVis("location")) {
        rowHtml += `
          <td>
            <div style="font-weight: 600;">${t.city}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${t.street} ${t.houseNumber || '(brak nr)'}</div>
          </td>
        `;
      }
      if (isVis("type")) rowHtml += `<td style="font-weight: 500;">${t.type}</td>`;
      if (isVis("fraction")) {
        rowHtml += `
          <td>
            <span class="fraction-pill">
              <span class="fraction-dot fraction-${t.fraction.toLowerCase().split(' ')[0]}"></span>
              ${t.fraction}
            </span>
          </td>
        `;
      }
      if (isVis("priority")) {
        rowHtml += `<td><span class="badge badge-prio-${t.priority.toLowerCase()}">${t.priority}</span></td>`;
      }
      if (isVis("status")) {
        const statusSlug = t.status.toLowerCase().replace(/\s+/g, '-');
        rowHtml += `<td><span class="badge badge-status-${statusSlug}">${t.status}</span></td>`;
      }
      if (isVis("assignee")) {
        rowHtml += `<td>${t.assignee || '<span style="color: var(--prio-urgent);">Nieprzypisany</span>'}</td>`;
      }
      if (isVis("nextAction")) {
        rowHtml += `
          <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.nextAction || ''}">
            ${t.nextAction || '<span class="badge badge-prio-pilny">Brak kroku</span>'}
          </td>
        `;
      }
      if (isVis("deadline")) {
        rowHtml += `<td style="font-size: 12px; white-space: nowrap;">${t.nextActionDeadline || '-'}</td>`;
      }
      if (isVis("aiState")) {
        let aiBadgeClass = "badge-ai-przeanalizowano";
        if (t.aiState === "Wymaga weryfikacji") aiBadgeClass = "badge-ai-weryfikacja";
        if (t.aiState === "Błąd") aiBadgeClass = "badge-ai-blad";
        if (t.aiState === "Brak") aiBadgeClass = "badge-ai-brak";
        rowHtml += `<td><span class="badge ${aiBadgeClass}">${t.aiState || 'Brak'}</span></td>`;
      }

      // Opcjonalne
      if (isVis("applicant")) {
        rowHtml += `<td><div style="font-size: 12px; font-weight: 600;">${t.applicantName || '-'}</div><div style="font-size: 11px; color: var(--text-secondary);">${t.applicantPhone || ''}</div></td>`;
      }
      if (isVis("contactRequest")) {
        rowHtml += `<td><span class="badge ${t.contactRequest === 'TAK' ? 'badge-prio-wysoki' : 'badge-status-progress'}">${t.contactRequest}</span></td>`;
      }
      if (isVis("slaDeadline")) {
        rowHtml += `<td style="font-size: 12px;">${t.slaDeadline || '-'}</td>`;
      }
      if (isVis("satisfaction")) {
        rowHtml += `<td>${t.satisfactionScore ? `${t.satisfactionScore} ★` : '-'}</td>`;
      }
      if (isVis("reviewInvite")) {
        rowHtml += `<td>${t.reviewInviteSent === 'TAK' ? '<span class="badge badge-status-rozwiazane">Wysłano</span>' : 'NIE'}</td>`;
      }

      rowHtml += `
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-navy btn-xs btn-open-detail" data-ticket-id="${t.id}">Otwórz</button>
        </td>
      </tr>`;
      return rowHtml;
    }).join("");

    tbody.querySelectorAll(".row-clickable").forEach(row => {
      row.onclick = (e) => {
        if (e.target.closest("button")) return;
        const tid = row.getAttribute("data-ticket-id");
        this.router.navigate("detail", { id: tid });
      };
    });

    tbody.querySelectorAll(".btn-open-detail").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const tid = btn.getAttribute("data-ticket-id");
        this.router.navigate("detail", { id: tid });
      };
    });
  }

  showColumnVisibilityModal() {
    import("../components/modal.js").then(({ Modal }) => {
      const colItemsHtml = this.columnDefs.map(c => `
        <label style="display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px; cursor: pointer;">
          <input type="checkbox" class="col-toggle-checkbox" data-col-id="${c.id}" 
                 ${this.visibleColumns.has(c.id) ? 'checked' : ''} 
                 ${c.required ? 'disabled' : ''} style="width: 16px; height: 16px; accent-color: var(--brand-navy);" />
          <span style="${c.required ? 'font-weight: 600;' : ''}">${c.label} ${c.required ? '(wymagana)' : ''}</span>
        </label>
      `).join("");

      const modal = new Modal({
        title: "Konfiguracja widoczności kolumn tabeli",
        size: "sm",
        content: `
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
            Wybierz kolumny, które mają być prezentowane w widoku operacyjnym:
          </p>
          <div style="display: flex; flex-direction: column; max-height: 360px; overflow-y: auto;">
            ${colItemsHtml}
          </div>
        `,
        footer: `
          <button class="btn btn-secondary btn-sm" id="btn-col-default">Domyślne</button>
          <button class="btn btn-primary btn-sm" id="btn-col-save">Zastosuj</button>
        `
      });

      modal.element.querySelector("#btn-col-default").onclick = () => {
        this.visibleColumns = new Set(this.columnDefs.filter(c => c.default).map(c => c.id));
        modal.close();
        this.loadTickets();
      };

      modal.element.querySelector("#btn-col-save").onclick = () => {
        const checkboxes = modal.element.querySelectorAll(".col-toggle-checkbox");
        const newSet = new Set();
        checkboxes.forEach(cb => {
          if (cb.checked) newSet.add(cb.getAttribute("data-col-id"));
        });
        this.visibleColumns = newSet;
        modal.close();
        this.loadTickets();
      };

      modal.open();
    });
  }

  async exportCsv() {
    const tickets = await this.dataProvider.getTickets(this.filters);
    if (!tickets || tickets.length === 0) {
      import("../components/toast.js").then(({ Toast }) => Toast.warning("Brak danych do eksportu."));
      return;
    }

    const headers = [
      "ID Zgłoszenia", "Data zgłoszenia", "Kategoria", "Frakcja", "Miejscowość", "Ulica", "Numer posesji",
      "Status", "Priorytet", "Opiekun", "Następne działanie", "Termin działania", "Stan AI", "Ocena satysfakcji"
    ];

    const rows = tickets.map(t => [
      t.id,
      t.timestamp,
      t.type,
      t.fraction,
      t.city,
      t.street,
      t.houseNumber,
      t.status,
      t.priority,
      t.assignee,
      `"${(t.nextAction || '').replace(/"/g, '""')}"`,
      t.nextActionDeadline,
      t.aiState,
      t.satisfactionScore || ""
    ]);

    const disclaimer = "# DANE DEMONSTRACYJNE - ELWOZ ECO SMARTCARE MANAGER V0.3.0 (PROTOTYP EDUKACYJNY WSB MERITO)\n";
    const csvContent = disclaimer + [headers.join(";")].concat(rows.map(r => r.join(";"))).join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elwoz-smartcare-zgloszenia-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    import("../components/toast.js").then(({ Toast }) => {
      Toast.success(`Wyeksportowano ${tickets.length} zgłoszeń do pliku CSV.`);
    });
  }
}
