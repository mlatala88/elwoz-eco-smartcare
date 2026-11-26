/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Główny kontroler aplikacji i router SPA
 */

import { DemoDataProvider } from "./data/demoProvider.js";
import { Topbar } from "./components/topbar.js";
import { Sidebar } from "./components/sidebar.js";

import { DashboardView } from "./views/dashboardView.js";
import { TasksView } from "./views/tasksView.js";
import { TicketsView } from "./views/ticketsView.js";
import { DetailView } from "./views/detailView.js";
import { CommsView } from "./views/commsView.js";
import { CsatView } from "./views/csatView.js";
import { ReportsView } from "./views/reportsView.js";
import { DiagnosticsView } from "./views/diagnosticsView.js";
import { SettingsView } from "./views/settingsView.js";

class App {
  constructor() {
    this.dataProvider = new DemoDataProvider();
    this.state = {
      currentUser: null,
      currentRoute: "dashboard",
      routeParams: {}
    };

    this.topbar = null;
    this.sidebar = null;
    this.currentViewInstance = null;
  }

  async init() {
    const staffList = await this.dataProvider.getStaff();
    this.state.currentUser = staffList[0] || { name: "Anna Nowak", role: "Dyspozytor Główny" };

    const topbarContainer = document.getElementById("topbar-container");
    const sidebarContainer = document.getElementById("sidebar-container");

    this.sidebar = new Sidebar(sidebarContainer, this, this.dataProvider);
    this.topbar = new Topbar(topbarContainer, this, this.dataProvider, this.state);

    // Subskrypcja zmian w danych dla aktualizacji odznak i wskaźników
    this.dataProvider.subscribe(() => {
      if (this.sidebar) this.sidebar.updateBadges();
      if (this.topbar) this.topbar.loadNotifications();
    });

    // Obsługa historii przeglądarki
    window.addEventListener("hashchange", () => this.handleHashChange());
    this.handleHashChange();
  }

  navigate(route, params = {}) {
    let hash = `#${route}`;
    const query = new URLSearchParams(params).toString();
    if (query) hash += `?${query}`;
    window.location.hash = hash;
  }

  refreshCurrent() {
    this.handleHashChange();
  }

  async handleHashChange() {
    let hash = window.location.hash.substring(1) || "dashboard";
    let route = hash;
    let params = {};

    if (hash.includes("?")) {
      const parts = hash.split("?");
      route = parts[0];
      const searchParams = new URLSearchParams(parts[1]);
      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }
    }

    this.state.currentRoute = route;
    this.state.routeParams = params;

    if (this.sidebar) this.sidebar.setRoute(route);

    const contentContainer = document.getElementById("content-container");
    contentContainer.scrollTop = 0;

    switch (route) {
      case "dashboard":
        this.currentViewInstance = new DashboardView(contentContainer, this, this.dataProvider, this.state);
        break;
      case "tasks":
        this.currentViewInstance = new TasksView(contentContainer, this, this.dataProvider, this.state);
        break;
      case "tickets":
        this.currentViewInstance = new TicketsView(contentContainer, this, this.dataProvider, this.state);
        break;
      case "detail":
        this.currentViewInstance = new DetailView(contentContainer, this, this.dataProvider, this.state);
        break;
      case "comms":
        this.currentViewInstance = new CommsView(contentContainer, this, this.dataProvider, this.state);
        break;
      case "csat":
        this.currentViewInstance = new CsatView(contentContainer, this, this.dataProvider, this.state);
        break;
      case "reports":
        this.currentViewInstance = new ReportsView(contentContainer, this, this.dataProvider, this.state);
        break;
      case "diagnostics":
        this.currentViewInstance = new DiagnosticsView(contentContainer, this, this.dataProvider, this.state);
        break;
      case "settings":
        this.currentViewInstance = new SettingsView(contentContainer, this, this.dataProvider, this.state);
        break;
      default:
        this.currentViewInstance = new DashboardView(contentContainer, this, this.dataProvider, this.state);
        route = "dashboard";
    }

    await this.currentViewInstance.render(params);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
}

// Start aplikacji po załadowaniu DOM
document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init();
  window.__smartcareApp = app;
});
