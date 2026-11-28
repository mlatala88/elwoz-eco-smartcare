import { escapeHtml } from "../components/escapeHtml.js";

/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Tasks View (Moje zadania – Operacyjna Kolejka CRM)
 */

export class TasksView {
  constructor(container, router, dataProvider, state) {
    this.container = container;
    this.router = router;
    this.dataProvider = dataProvider;
    this.state = state;
    this.activeQueue = "immediate"; // immediate, overdue, today, scheduled, awaiting_citizen, unassigned, no_step
    this.filterOnlyMine = false;
  }

  async render() {
    const currentUserName = this.state.currentUser ? this.state.currentUser.name : "Anna Nowak";

    this.container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1 class="view-title">Moje zadania – Kolejka operacyjna</h1>
          <div class="view-description">Bieżący rejestr spraw wg pilności i terminów wykonania • Aktywny pracownik: <strong>${escapeHtml(currentUserName)}</strong></div>
        </div>
        <div class="view-actions">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; user-select: none;">
            <input type="checkbox" id="toggle-only-mine" ${this.filterOnlyMine ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--brand-navy);" />
            <span>Tylko moje zadania (${escapeHtml(currentUserName)})</span>
          </label>
        </div>
      </div>

      <!-- Zakładki kolejek operacyjnych -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="tab-nav" id="tasks-tab-nav" style="overflow-x: auto;">
          <button class="tab-btn ${this.activeQueue === 'immediate' ? 'active' : ''}" data-queue="immediate">
            <i data-lucide="flame" style="width: 15px; height: 15px; color: var(--prio-urgent);"></i>
            <span>Natychmiastowa reakcja</span>
            <span class="tab-badge" id="tab-badge-immediate">0</span>
          </button>

          <button class="tab-btn ${this.activeQueue === 'overdue' ? 'active' : ''}" data-queue="overdue">
            <i data-lucide="clock" style="width: 15px; height: 15px; color: var(--prio-urgent);"></i>
            <span>Przeterminowane</span>
            <span class="tab-badge" id="tab-badge-overdue">0</span>
          </button>

          <button class="tab-btn ${this.activeQueue === 'today' ? 'active' : ''}" data-queue="today">
            <i data-lucide="calendar" style="width: 15px; height: 15px; color: var(--brand-navy);"></i>
            <span>Do zrobienia dzisiaj</span>
            <span class="tab-badge" id="tab-badge-today">0</span>
          </button>

          <button class="tab-btn ${this.activeQueue === 'scheduled' ? 'active' : ''}" data-queue="scheduled">
            <i data-lucide="calendar-check" style="width: 15px; height: 15px; color: var(--brand-green);"></i>
            <span>Zaplanowane</span>
            <span class="tab-badge" id="tab-badge-scheduled">0</span>
          </button>

          <button class="tab-btn ${this.activeQueue === 'awaiting_citizen' ? 'active' : ''}" data-queue="awaiting_citizen">
            <i data-lucide="user-check" style="width: 15px; height: 15px; color: var(--prio-high);"></i>
            <span>Oczekujące na mieszkańca</span>
            <span class="tab-badge" id="tab-badge-citizen">0</span>
          </button>

          <button class="tab-btn ${this.activeQueue === 'unassigned' ? 'active' : ''}" data-queue="unassigned">
            <i data-lucide="user-x" style="width: 15px; height: 15px; color: var(--text-secondary);"></i>
            <span>Bez opiekuna</span>
            <span class="tab-badge" id="tab-badge-unassigned">0</span>
          </button>

          <button class="tab-btn ${this.activeQueue === 'no_step' ? 'active' : ''}" data-queue="no_step">
            <i data-lucide="alert-octagon" style="width: 15px; height: 15px; color: var(--prio-urgent);"></i>
            <span>Bez kolejnego kroku</span>
            <span class="tab-badge" id="tab-badge-no-step">0</span>
          </button>
        </div>

        <div class="card-body" style="padding: 0;">
          <div class="table-container" style="border: none; border-radius: 0;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID Zgłoszenia</th>
                  <th>Miejscowość / Adres</th>
                  <th>Kategoria i Frakcja</th>
                  <th>Priorytet</th>
                  <th>Czas oczekiwania / SLA</th>
                  <th>Pracownik</th>
                  <th>Następne działanie</th>
                  <th>Termin działania</th>
                  <th style="text-align: right;">Akcja</th>
                </tr>
              </thead>
              <tbody id="tasks-table-body">
                <tr><td colspan="9" style="text-align: center; padding: 24px;">Ładowanie zadań...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    await this.loadTasks();

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }
  }

  bindEvents() {
    const tabs = this.container.querySelectorAll(".tab-btn");
    tabs.forEach(tab => {
      tab.onclick = () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        this.activeQueue = tab.getAttribute("data-queue");
        this.loadTasks();
      };
    });

    const toggleMine = this.container.querySelector("#toggle-only-mine");
    if (toggleMine) {
      toggleMine.onchange = () => {
        this.filterOnlyMine = toggleMine.checked;
        this.loadTasks();
      };
    }
  }

  async loadTasks() {
    let tickets = await this.dataProvider.getTickets();
    const currentUserName = this.state.currentUser ? this.state.currentUser.name : "Anna Nowak";

    // Wyklucz sprawy zakończone (Rozwiązane i Zamknięte)
    const isClosed = s => s === "Rozwiązane" || s === "Zamknięte";
    const openTickets = tickets.filter(t => !isClosed(t.status) && (!this.filterOnlyMine || t.assignee === currentUserName));

    const now = new Date();
    const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

    // Dynamiczny sprawdzian SLA bez opierania się na historycznej fladze
    // Zgłoszenie z udzieloną odpowiedzią NIE JEST oznaczane jako zalegające z 1. reakcją
    const isOverdueCheck = t => {
      const hasFirst = Boolean(t.hasFirstContact || t.firstContactDate);
      const isFirstOverdue = !hasFirst && Boolean(t.slaDeadline && new Date(t.slaDeadline) < now);
      const isNextOverdue = Boolean(t.nextActionDeadline && new Date(t.nextActionDeadline) < now);
      return isFirstOverdue || isNextOverdue;
    };

    // Oblicz liczebności zakładek
    const counts = {
      immediate: openTickets.filter(t => t.priority === "PILNY" || t.status === "Nowe").length,
      overdue: openTickets.filter(isOverdueCheck).length,
      today: openTickets.filter(t => t.nextActionDeadline && t.nextActionDeadline.startsWith(todayStr)).length,
      scheduled: openTickets.filter(t => t.nextActionDeadline && new Date(t.nextActionDeadline) > now && !t.nextActionDeadline.startsWith(todayStr)).length,
      awaiting_citizen: openTickets.filter(t => t.responsibleSide === "Mieszkaniec").length,
      unassigned: openTickets.filter(t => !t.assignee || t.assignee === "Nieprzypisany").length,
      no_step: openTickets.filter(t => !t.nextAction || t.nextAction.trim() === "").length
    };

    const setBadge = (id, val) => {
      const el = this.container.querySelector(id);
      if (el) el.textContent = val;
    };
    setBadge("#tab-badge-immediate", counts.immediate);
    setBadge("#tab-badge-overdue", counts.overdue);
    setBadge("#tab-badge-today", counts.today);
    setBadge("#tab-badge-scheduled", counts.scheduled);
    setBadge("#tab-badge-citizen", counts.awaiting_citizen);
    setBadge("#tab-badge-unassigned", counts.unassigned);
    setBadge("#tab-badge-no-step", counts.no_step);

    // Filtrowanie wybranej kolejki
    let filtered = [];
    switch (this.activeQueue) {
      case "immediate":
        filtered = openTickets.filter(t => t.priority === "PILNY" || t.status === "Nowe");
        break;
      case "overdue":
        filtered = openTickets.filter(isOverdueCheck);
        break;
      case "today":
        filtered = openTickets.filter(t => t.nextActionDeadline && t.nextActionDeadline.startsWith(todayStr));
        break;
      case "scheduled":
        filtered = openTickets.filter(t => t.nextActionDeadline && new Date(t.nextActionDeadline) > now && !t.nextActionDeadline.startsWith(todayStr));
        break;
      case "awaiting_citizen":
        filtered = openTickets.filter(t => t.responsibleSide === "Mieszkaniec");
        break;
      case "unassigned":
        filtered = openTickets.filter(t => !t.assignee || t.assignee === "Nieprzypisany");
        break;
      case "no_step":
        filtered = openTickets.filter(t => !t.nextAction || t.nextAction.trim() === "");
        break;
    }

    if (this.filterOnlyMine) {
      filtered = filtered.filter(t => t.assignee === currentUserName);
    }

    // Sortowanie: Pilne pierwsze, potem przeterminowane
    filtered.sort((a, b) => {
      const pOrder = { "PILNY": 4, "WYSOKI": 3, "STANDARDOWY": 2, "NISKI": 1 };
      const diff = (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      if (diff !== 0) return diff;
      return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
    });

    const tbody = this.container.querySelector("#tasks-table-body");
    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="empty-state">
              <i data-lucide="check-circle" class="empty-state-icon" style="color: var(--brand-green);"></i>
              <div class="empty-state-title">Kolejka jest pusta</div>
              <div class="empty-state-desc">Brak otwartych spraw w tej kategorii${this.filterOnlyMine ? ' przypisanych do Ciebie' : ''}.</div>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons({ root: tbody });
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const hasFirst = Boolean(t.hasFirstContact || t.firstContactDate);
      const isOverdue = (!hasFirst && t.slaDeadline && new Date(t.slaDeadline) < now) || (t.nextActionDeadline && new Date(t.nextActionDeadline) < now);
      const isMine = t.assignee === currentUserName;

      return `
        <tr class="row-clickable ${t.priority === 'PILNY' ? 'row-urgent' : ''}" data-ticket-id="${escapeHtml(t.id)}">
          <td class="table-ticket-id">${escapeHtml(t.id)}</td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(t.city)}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(t.street)} ${escapeHtml(t.houseNumber || '(brak posesji)')}</div>
          </td>
          <td>
            <div>${escapeHtml(t.type)}</div>
            <span class="fraction-pill" style="margin-top: 2px;">
              <span class="fraction-dot fraction-${escapeHtml(t.fraction.toLowerCase().split(' ')[0])}"></span>
              ${escapeHtml(t.fraction)}
            </span>
          </td>
          <td>
            <span class="badge badge-prio-${escapeHtml(t.priority.toLowerCase())}">${escapeHtml(t.priority)}</span>
          </td>
          <td>
            ${isOverdue 
              ? '<span class="badge badge-prio-pilny">⚠️ Przekroczone!</span>' 
              : `<span style="font-size: 11px; color: var(--text-secondary);">SLA do: ${escapeHtml(t.slaDeadline ? t.slaDeadline.substring(11, 16) : '-')}</span>`}
          </td>
          <td>
            <div style="font-weight: 500;">${escapeHtml(t.assignee) || '<span style="color: var(--prio-urgent);">Nieprzypisany</span>'}</div>
            ${!isMine ? `<button class="btn btn-secondary btn-xs btn-assign-me" data-ticket-id="${escapeHtml(t.id)}" style="margin-top: 4px;">Przypisz do mnie</button>` : ''}
          </td>
          <td style="max-width: 200px;">
            ${t.nextAction 
              ? `<div style="font-size: 12px; line-height: 1.3;">${escapeHtml(t.nextAction)}</div><div style="font-size: 10px; color: var(--text-secondary);">Strona: ${escapeHtml(t.responsibleSide)}</div>`
              : '<span class="badge badge-prio-pilny">Brak kolejnego kroku!</span>'}
          </td>
          <td>
            <div style="font-size: 12px; font-weight: 600; color: ${isOverdue ? 'var(--prio-urgent)' : 'var(--text-primary)'};">
              ${escapeHtml(t.nextActionDeadline) || '<span style="color: var(--text-muted); font-weight: normal;">Nie określono</span>'}
            </div>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-navy btn-xs btn-handle-ticket" data-ticket-id="${escapeHtml(t.id)}">Obsłuż sprawę</button>
          </td>
        </tr>
      `;
    }).join("");

    // Obsługa kliknięć
    tbody.querySelectorAll(".row-clickable").forEach(row => {
      row.onclick = (e) => {
        if (e.target.closest("button")) return;
        const tid = row.getAttribute("data-ticket-id");
        this.router.navigate("detail", { id: tid });
      };
    });

    tbody.querySelectorAll(".btn-handle-ticket").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const tid = btn.getAttribute("data-ticket-id");
        this.router.navigate("detail", { id: tid });
      };
    });

    tbody.querySelectorAll(".btn-assign-me").forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const tid = btn.getAttribute("data-ticket-id");
        await this.dataProvider.updateTicket(tid, { assignee: currentUserName });
        import("../components/toast.js").then(({ Toast }) => {
          Toast.success(`Przypisano zgłoszenie ${tid} do ${currentUserName}`);
        });
        this.loadTasks();
      };
    });

    if (window.lucide) {
      window.lucide.createIcons({ root: tbody });
    }
  }
}
