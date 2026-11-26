/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Sidebar Navigation Component
 */

export class Sidebar {
  constructor(container, router, dataProvider) {
    this.container = container;
    this.router = router;
    this.dataProvider = dataProvider;
    this.collapsed = false;
    this.currentRoute = "dashboard";
    this.render();
  }

  setRoute(route) {
    this.currentRoute = route;
    this.updateActive();
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.container.classList.toggle("collapsed", this.collapsed);
    const toggleIcon = this.container.querySelector("#sidebar-toggle-icon");
    if (toggleIcon) {
      toggleIcon.setAttribute("data-lucide", this.collapsed ? "chevron-right" : "chevron-left");
      if (window.lucide) window.lucide.createIcons({ root: this.container });
    }
  }

  async updateBadges() {
    try {
      const tickets = await this.dataProvider.getTickets();
      const urgentCount = tickets.filter(t => t.priority === "PILNY" && t.status !== "Rozwiązane").length;
      const totalCount = tickets.length;
      
      const badgeUrgent = this.container.querySelector("#badge-tasks-urgent");
      if (badgeUrgent) {
        badgeUrgent.textContent = urgentCount;
        badgeUrgent.style.display = urgentCount > 0 ? "inline-block" : "none";
      }

      const badgeTotal = this.container.querySelector("#badge-tickets-total");
      if (badgeTotal) {
        badgeTotal.textContent = totalCount;
      }
    } catch (e) {
      console.warn("Błąd aktualizacji odznak paska bocznego:", e);
    }
  }

  updateActive() {
    const items = this.container.querySelectorAll(".nav-item");
    items.forEach(item => {
      const route = item.getAttribute("data-route");
      if (route === this.currentRoute) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  render() {
    this.container.className = "app-sidebar" + (this.collapsed ? " collapsed" : "");
    this.container.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo-area">
          <div class="sidebar-logo-icon">E</div>
          <div class="sidebar-brand-text">
            <div class="sidebar-title">ELWOZ ECO</div>
            <div class="sidebar-subtitle">SmartCare Manager v0.3.0</div>
          </div>
        </div>
        <button class="sidebar-toggle-btn" id="sidebar-toggle-btn" title="Zwiń / rozwiń menu boczne">
          <i data-lucide="chevron-left" id="sidebar-toggle-icon" style="width: 16px; height: 16px;"></i>
        </button>
      </div>

      <nav class="sidebar-nav">
        <a class="nav-item ${this.currentRoute === 'dashboard' ? 'active' : ''}" data-route="dashboard" title="Pulpit">
          <i data-lucide="layout-dashboard" class="nav-item-icon"></i>
          <span class="nav-item-text">Pulpit</span>
        </a>

        <a class="nav-item ${this.currentRoute === 'tasks' ? 'active' : ''}" data-route="tasks" title="Moje zadania">
          <i data-lucide="check-square" class="nav-item-icon"></i>
          <span class="nav-item-text">Moje zadania</span>
          <span class="nav-item-badge badge-urgent" id="badge-tasks-urgent" style="display: none;">0</span>
        </a>

        <a class="nav-item ${this.currentRoute === 'tickets' ? 'active' : ''}" data-route="tickets" title="Wszystkie zgłoszenia">
          <i data-lucide="inbox" class="nav-item-icon"></i>
          <span class="nav-item-text">Wszystkie zgłoszenia</span>
          <span class="nav-item-badge" id="badge-tickets-total">30</span>
        </a>

        <a class="nav-item ${this.currentRoute === 'comms' ? 'active' : ''}" data-route="comms" title="Komunikacja">
          <i data-lucide="message-square" class="nav-item-icon"></i>
          <span class="nav-item-text">Komunikacja</span>
        </a>

        <a class="nav-item ${this.currentRoute === 'csat' ? 'active' : ''}" data-route="csat" title="Satysfakcja mieszkańców">
          <i data-lucide="smile" class="nav-item-icon"></i>
          <span class="nav-item-text">Satysfakcja</span>
        </a>

        <a class="nav-item ${this.currentRoute === 'reports' ? 'active' : ''}" data-route="reports" title="Raporty i analityka">
          <i data-lucide="bar-chart-2" class="nav-item-icon"></i>
          <span class="nav-item-text">Raporty</span>
        </a>

        <a class="nav-item ${this.currentRoute === 'diagnostics' ? 'active' : ''}" data-route="diagnostics" title="Diagnostyka systemu">
          <i data-lucide="activity" class="nav-item-icon"></i>
          <span class="nav-item-text">Diagnostyka</span>
        </a>

        <a class="nav-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings" title="Ustawienia systemu">
          <i data-lucide="settings" class="nav-item-icon"></i>
          <span class="nav-item-text">Ustawienia</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="edu-proto-badge">
          <i data-lucide="graduation-cap" style="width: 14px; height: 14px; flex-shrink: 0;"></i>
          <span>WSB Merito • Prototyp</span>
        </div>
        <div style="font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 4px;">
          Niezależny prototyp edukacyjny
        </div>
      </div>
    `;

    // Nasłuchiwanie kliknięć
    const toggleBtn = this.container.querySelector("#sidebar-toggle-btn");
    toggleBtn.onclick = () => this.toggleCollapse();

    const navItems = this.container.querySelectorAll(".nav-item");
    navItems.forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        const route = item.getAttribute("data-route");
        this.router.navigate(route);
      };
    });

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }

    this.updateBadges();
  }
}
