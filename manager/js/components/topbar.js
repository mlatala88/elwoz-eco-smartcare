/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Topbar Component
 */

export class Topbar {
  constructor(container, router, dataProvider, state) {
    this.container = container;
    this.router = router;
    this.dataProvider = dataProvider;
    this.state = state;
    this.notifOpen = false;
    this.staffList = [];
    this.render();
  }

  async loadStaff() {
    this.staffList = await this.dataProvider.getStaff();
    this.renderStaffSelector();
  }

  renderStaffSelector() {
    const userRoleEl = this.container.querySelector("#topbar-user-role");
    const userNameEl = this.container.querySelector("#topbar-user-name");
    const userAvatarEl = this.container.querySelector("#topbar-user-avatar");

    const currentStaff = this.state.currentUser || this.staffList[0] || { name: "Anna Nowak", role: "Dyspozytor Główny" };

    if (userNameEl) userNameEl.textContent = currentStaff.name;
    if (userRoleEl) userRoleEl.textContent = currentStaff.role;
    if (userAvatarEl) {
      const initials = currentStaff.name.split(" ").map(n => n[0]).join("");
      userAvatarEl.textContent = initials;
    }
  }

  async loadNotifications() {
    try {
      const tickets = await this.dataProvider.getTickets();
      const now = new Date();
      const isClosed = s => s === "Rozwiązane" || s === "Zamknięte";
      const isOverdue = t => (t.slaDeadline && new Date(t.slaDeadline) < now) || (t.nextActionDeadline && new Date(t.nextActionDeadline) < now);
      const urgentOrOverdue = tickets.filter(t => !isClosed(t.status) && (t.priority === "PILNY" || isOverdue(t))).slice(0, 5);

      const notifBadge = this.container.querySelector("#notif-badge");
      const notifList = this.container.querySelector("#notif-list");

      if (notifBadge) {
        notifBadge.textContent = urgentOrOverdue.length;
        notifBadge.style.display = urgentOrOverdue.length > 0 ? "inline-block" : "none";
      }

      if (notifList) {
        if (urgentOrOverdue.length === 0) {
          notifList.innerHTML = `<div style="padding: 16px; text-align: center; font-size: 12px; color: var(--text-secondary);">Brak nowych powiadomień.</div>`;
        } else {
          notifList.innerHTML = urgentOrOverdue.map(t => `
            <div class="notification-item unread" data-ticket-id="${t.id}">
              <div class="notification-item-title">
                ${isOverdue(t) ? "⚠️ Przekroczenie SLA:" : "🔥 Sprawa PILNA:"} ${t.id}
              </div>
              <div style="font-size: 11px; color: var(--text-secondary);">
                ${t.city}, ${t.street} ${t.houseNumber} (${t.type})
              </div>
              <div class="notification-item-time">${t.timestamp}</div>
            </div>
          `).join("");

          notifList.querySelectorAll(".notification-item").forEach(item => {
            item.onclick = () => {
              const tid = item.getAttribute("data-ticket-id");
              this.notifOpen = false;
              this.updateDropdown();
              this.router.navigate("detail", { id: tid });
            };
          });
        }
      }
    } catch (e) {
      console.warn("Błąd ładowania powiadomień:", e);
    }
  }

  toggleNotifications() {
    this.notifOpen = !this.notifOpen;
    this.updateDropdown();
  }

  updateDropdown() {
    const dropdown = this.container.querySelector("#notif-dropdown");
    if (dropdown) {
      dropdown.classList.toggle("show", this.notifOpen);
    }
  }

  render() {
    this.container.className = "app-topbar";
    this.container.innerHTML = `
      <div class="topbar-left">
        <div class="global-search-wrapper">
          <i data-lucide="search" class="global-search-icon"></i>
          <input type="text" 
                 id="global-search-input" 
                 class="global-search-input" 
                 placeholder="Szukaj zgłoszenia (nr ELW, nazwisko, ulica, telefon, opis)..." 
                 autocomplete="off" />
        </div>
      </div>

      <div class="topbar-right">
        <!-- Status połączenia i tryb pracy -->
        <div class="system-status-indicator" id="system-status-btn" style="cursor: pointer;" title="Kliknij, aby otworzyć panel diagnostyki">
          <span class="status-dot" id="system-status-dot"></span>
          <span id="system-status-label">Ładowanie...</span>
        </div>

        <!-- Przycisk ręcznego odświeżenia danych -->
        <button class="btn btn-secondary btn-xs" id="btn-manual-sync" style="display: flex; align-items: center; gap: 4px; padding: 6px 10px;" title="Ręczne odświeżenie danych z CRM">
          <i data-lucide="refresh-cw" style="width: 13px; height: 13px;"></i>
          <span style="font-size: 11px;">Odśwież</span>
        </button>

        <!-- Centrum Powiadomień -->
        <div style="position: relative;">
          <button class="notifications-btn" id="notif-toggle-btn" title="Centrum powiadomień">
            <i data-lucide="bell" style="width: 18px; height: 18px;"></i>
            <span class="notifications-badge" id="notif-badge" style="display: none;">0</span>
          </button>

          <div class="notifications-dropdown" id="notif-dropdown">
            <div class="notifications-header">
              <span>Powiadomienia operacyjne</span>
              <span style="font-size: 11px; font-weight: normal; color: var(--text-secondary);">Pilne i SLA</span>
            </div>
            <div class="notifications-list" id="notif-list">
              <!-- Renderowane dynamicznie -->
            </div>
          </div>
        </div>

        <!-- Profil pracownika -->
        <div class="user-profile-menu" id="user-profile-btn" title="Zmień profil aktywnego pracownika">
          <div class="user-avatar" id="topbar-user-avatar">AN</div>
          <div class="user-info">
            <span class="user-name" id="topbar-user-name">Anna Nowak</span>
            <span class="user-role" id="topbar-user-role">Dyspozytor Główny</span>
          </div>
          <i data-lucide="chevron-down" style="width: 14px; height: 14px; color: var(--text-secondary);"></i>
        </div>
      </div>
    `;

    // Obsługa wyszukiwarki
    const searchInput = this.container.querySelector("#global-search-input");
    searchInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        const query = searchInput.value.trim();
        this.router.navigate("tickets", { search: query });
      }
    };

    // Obsługa statusu
    const statusBtn = this.container.querySelector("#system-status-btn");
    statusBtn.onclick = () => this.router.navigate("diagnostics");

    // Obsługa ręcznego odświeżenia
    const syncBtn = this.container.querySelector("#btn-manual-sync");
    if (syncBtn) {
      syncBtn.onclick = async () => {
        syncBtn.disabled = true;
        try {
          if (typeof this.dataProvider.notify === "function") this.dataProvider.notify();
          await this.loadNotifications();
          this.updateSystemStatus();
          this.router.refreshCurrent();
          import("./toast.js").then(({ Toast }) => Toast.success("Dane zostały zsynchronizowane."));
        } catch (err) {
          import("./toast.js").then(({ Toast }) => Toast.error("Błąd odświeżania: " + err.message));
        } finally {
          syncBtn.disabled = false;
        }
      };
    }

    // Obsługa powiadomień
    const notifBtn = this.container.querySelector("#notif-toggle-btn");
    notifBtn.onclick = (e) => {
      e.stopPropagation();
      this.toggleNotifications();
    };

    document.addEventListener("click", (e) => {
      if (this.notifOpen && !this.container.querySelector("#notif-dropdown").contains(e.target) && e.target !== notifBtn) {
        this.notifOpen = false;
        this.updateDropdown();
      }
    });

    // Przełącznik pracownika
    const profileBtn = this.container.querySelector("#user-profile-btn");
    profileBtn.onclick = () => this.showStaffSwitchModal();

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }

    this.loadStaff();
    this.loadNotifications();
    this.updateSystemStatus();
  }

  updateSystemStatus() {
    const dot = this.container.querySelector("#system-status-dot");
    const label = this.container.querySelector("#system-status-label");
    if (!dot || !label) return;

    const isConnected = Boolean(this.dataProvider && (this.dataProvider.isEmbeddedGas || (this.dataProvider.constructor && this.dataProvider.constructor.name === "AppsScriptDataProvider")));
    if (isConnected) {
      dot.className = "status-dot";
      label.textContent = "Połączono z CRM (Google Sheets)";
    } else {
      dot.className = "status-dot dot-warning";
      label.textContent = "Tryb DEMO (30 zgłoszeń)";
    }
  }

  showStaffSwitchModal() {
    const listHtml = this.staffList.map(s => `
      <div class="staff-select-card" data-staff-id="${s.id}" style="
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);
        margin-bottom: 8px; cursor: pointer; transition: all 0.15s ease;
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            width: 36px; height: 36px; border-radius: 4px; background-color: var(--brand-navy);
            color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 600;
          ">${s.name.split(" ").map(n => n[0]).join("")}</div>
          <div>
            <div style="font-weight: 600; font-size: 13px;">${s.name}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${s.role} • ${s.email}</div>
          </div>
        </div>
        ${this.state.currentUser && this.state.currentUser.id === s.id ? '<span class="badge badge-ai-przeanalizowano">Aktywny</span>' : ''}
      </div>
    `).join("");

    import("./modal.js").then(({ Modal }) => {
      const modal = new Modal({
        title: "Wybierz aktywnego pracownika",
        size: "sm",
        content: `
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
            Wybór pracownika symuluje zalogowanego użytkownika w kolejce "Moje zadania" oraz przy podpisie korespondencji.
          </p>
          <div>${listHtml}</div>
        `
      });

      modal.element.querySelectorAll(".staff-select-card").forEach(card => {
        card.onmouseenter = () => { card.style.backgroundColor = "var(--bg-muted)"; card.style.borderColor = "var(--brand-navy)"; };
        card.onmouseleave = () => { card.style.backgroundColor = ""; card.style.borderColor = "var(--border-color)"; };
        card.onclick = () => {
          const sid = card.getAttribute("data-staff-id");
          const selected = this.staffList.find(s => s.id === sid);
          if (selected) {
            this.state.currentUser = selected;
            this.renderStaffSelector();
            modal.close();
            import("./toast.js").then(({ Toast }) => {
              Toast.success(`Przełączono profil na: ${selected.name}`);
            });
            this.router.refreshCurrent();
          }
        };
      });

      modal.open();
    });
  }
}
