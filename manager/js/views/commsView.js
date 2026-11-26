/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Communications View (Komunikacja – Centralny Dziennik Korespondencji)
 */

export class CommsView {
  constructor(container, router, dataProvider, state) {
    this.container = container;
    this.router = router;
    this.dataProvider = dataProvider;
    this.state = state;
    this.filterChannel = "all";
    this.searchQuery = "";
  }

  async render() {
    this.container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1 class="view-title">Komunikacja z mieszkańcami</h1>
          <div class="view-description">Centralny rejestr korespondencji e-mail, notatek z rozmów telefonicznych oraz zaproszeń do opinii</div>
        </div>
      </div>

      <!-- Filtry dziennika -->
      <div class="card" style="margin-bottom: 16px; padding: 14px 16px;">
        <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 12px; align-items: end;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Szukaj w korespondencji</label>
            <div class="input-group">
              <i data-lucide="search" class="input-icon" style="width: 15px; height: 15px;"></i>
              <input type="text" id="comms-search" class="form-control input-with-icon" 
                     placeholder="Szukaj po ID zgłoszenia, odbiorcy, temacie lub treści..." value="${this.searchQuery}" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Kanał kontaktu</label>
            <select class="form-select" id="comms-channel">
              <option value="all">Wszystkie kanały</option>
              <option value="E-mail">E-mail</option>
              <option value="Telefon">Telefon</option>
              <option value="Notatka wewnętrzna">Notatka wewnętrzna</option>
            </select>
          </div>

          <button class="btn btn-secondary btn-sm" id="btn-comms-reset" style="height: 38px;">
            <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
            <span>Wyczyść</span>
          </button>
        </div>
      </div>

      <!-- Tabela korespondencji -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Data i godzina</th>
              <th>Nr zgłoszenia</th>
              <th>Rodzaj działania</th>
              <th>Kanał</th>
              <th>Odbiorca</th>
              <th>Temat wiadomości</th>
              <th>Treść (Podgląd)</th>
              <th>Pracownik</th>
              <th>Status</th>
              <th style="text-align: right;">Akcja</th>
            </tr>
          </thead>
          <tbody id="comms-table-body">
            <tr><td colspan="10" style="text-align: center; padding: 24px;">Ładowanie dziennika...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    this.bindEvents();
    await this.loadComms();

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }
  }

  bindEvents() {
    const searchInput = this.container.querySelector("#comms-search");
    let debounce;
    searchInput.oninput = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this.searchQuery = searchInput.value.trim().toLowerCase();
        this.loadComms();
      }, 300);
    };

    const channelSelect = this.container.querySelector("#comms-channel");
    channelSelect.onchange = () => {
      this.filterChannel = channelSelect.value;
      this.loadComms();
    };

    const resetBtn = this.container.querySelector("#btn-comms-reset");
    resetBtn.onclick = () => {
      this.searchQuery = "";
      this.filterChannel = "all";
      this.render();
    };
  }

  async loadComms() {
    let comms = await this.dataProvider.getCommunications();

    if (this.filterChannel !== "all") {
      comms = comms.filter(c => c.channel === this.filterChannel);
    }

    if (this.searchQuery) {
      const q = this.searchQuery;
      comms = comms.filter(c => 
        (c.ticketId && c.ticketId.toLowerCase().includes(q)) ||
        (c.recipient && c.recipient.toLowerCase().includes(q)) ||
        (c.subject && c.subject.toLowerCase().includes(q)) ||
        (c.content && c.content.toLowerCase().includes(q)) ||
        (c.author && c.author.toLowerCase().includes(q))
      );
    }

    const tbody = this.container.querySelector("#comms-table-body");
    if (comms.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="empty-state">
              <i data-lucide="message-square" class="empty-state-icon"></i>
              <div class="empty-state-title">Brak wpisów w dzienniku</div>
              <div class="empty-state-desc">Nie zarejestrowano korespondencji spełniającej kryteria.</div>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons({ root: tbody });
      return;
    }

    tbody.innerHTML = comms.map(c => `
      <tr>
        <td style="font-size: 12px; white-space: nowrap; color: var(--text-secondary);">${c.timestamp}</td>
        <td>
          <a href="#" class="table-ticket-id link-ticket" data-ticket-id="${c.ticketId}">${c.ticketId}</a>
        </td>
        <td style="font-weight: 600; font-size: 12px;">${c.actionType}</td>
        <td>
          <span class="badge ${c.channel === 'E-mail' ? 'badge-status-nowe' : (c.channel === 'Telefon' ? 'badge-prio-wysoki' : 'badge-status-progress')}">
            ${c.channel}
          </span>
        </td>
        <td style="font-size: 12px; word-break: break-all;">${c.recipient}</td>
        <td style="font-weight: 500; font-size: 12px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${c.subject || '-'}
        </td>
        <td style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--text-secondary);">
          ${c.content}
        </td>
        <td style="font-size: 12px;">${c.author}</td>
        <td>
          <span class="badge ${c.status === 'Wysłano' ? 'badge-status-rozwiazane' : (c.status === 'Odnotowano' ? 'badge-ai-przeanalizowano' : 'badge-status-waiting')}">
            ${c.status}
          </span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-xs btn-view-full-msg" data-comm-id="${c.id}">Podgląd</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".link-ticket").forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        const tid = link.getAttribute("data-ticket-id");
        this.router.navigate("detail", { id: tid });
      };
    });

    tbody.querySelectorAll(".btn-view-full-msg").forEach(btn => {
      btn.onclick = () => {
        const cid = btn.getAttribute("data-comm-id");
        const found = comms.find(c => c.id === cid);
        if (found) this.showFullMessageModal(found);
      };
    });
  }

  showFullMessageModal(c) {
    import("../components/modal.js").then(({ Modal }) => {
      const modal = new Modal({
        title: `Podgląd korespondencji – ${c.actionType}`,
        size: "md",
        content: `
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
            <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px;">
              <span style="font-weight: 600; color: var(--text-secondary);">Zgłoszenie:</span>
              <span class="table-ticket-id">${c.ticketId}</span>

              <span style="font-weight: 600; color: var(--text-secondary);">Data wysyłki:</span>
              <span>${c.timestamp}</span>

              <span style="font-weight: 600; color: var(--text-secondary);">Kanał:</span>
              <span>${c.channel}</span>

              <span style="font-weight: 600; color: var(--text-secondary);">Odbiorca:</span>
              <span>${c.recipient}</span>

              <span style="font-weight: 600; color: var(--text-secondary);">Pracownik:</span>
              <span>${c.author}</span>

              <span style="font-weight: 600; color: var(--text-secondary);">Temat:</span>
              <span style="font-weight: 600;">${c.subject || '-'}</span>
            </div>

            <div style="margin-top: 8px;">
              <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Pełna treść wiadomości:</div>
              <div style="background-color: var(--bg-muted); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; white-space: pre-wrap; font-size: 13px; line-height: 1.5;">${c.content}</div>
            </div>
          </div>
        `,
        footer: `
          <button class="btn btn-navy btn-sm" id="btn-close-msg-preview">Zamknij</button>
        `
      });

      modal.element.querySelector("#btn-close-msg-preview").onclick = () => modal.close();
      modal.open();
    });
  }
}
