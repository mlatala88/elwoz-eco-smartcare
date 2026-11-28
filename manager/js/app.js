/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Główny kontroler aplikacji i router SPA
 * 
 * Wspiera dwa tryby działania (Dual Mode Architecture):
 * 1. CONNECTED Mode: Połączony z rzeczywistym silnikiem Google Apps Script CRM (AppsScriptDataProvider),
 *    działa natywnie w Apps Script Web App (google.script.run) lub autoryzowanym REST endpoint.
 * 2. DEMO Mode: Niezależny symulator (30 spraw, LocalStorage, DemoDataProvider),
 *    działa na GitHub Pages oraz lokalnie.
 */

import { DemoDataProvider } from "./data/demoProvider.js";
import { AppsScriptDataProvider } from "./data/gasProvider.js";
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
    // 1. Detekcja środowiska uruchomieniowego (GAS Web App vs Local/GitHub Pages)
    const isEmbeddedGas = typeof window !== "undefined" && typeof window.google !== "undefined" && Boolean(window.google.script && window.google.script.run);
    const searchParams = typeof window !== "undefined" && window.location.search ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const paramMode = searchParams.get("mode");
    const storedMode = typeof localStorage !== "undefined" ? localStorage.getItem("smartcare_mode") : null;

    const useConnectedMode = isEmbeddedGas || paramMode === "connected" || storedMode === "connected";

    if (useConnectedMode) {
      const endpoint = searchParams.get("endpoint") || (typeof localStorage !== "undefined" ? localStorage.getItem("smartcare_gas_endpoint") : "");
      this.dataProvider = new AppsScriptDataProvider({ endpointUrl: endpoint });
      this.mode = "connected";
    } else {
      this.dataProvider = new DemoDataProvider();
      this.mode = "demo";
    }

    this.state = {
      currentUser: null,
      currentRoute: "dashboard",
      routeParams: {},
      mode: this.mode,
      isEmbeddedGas: isEmbeddedGas
    };

    this.topbar = null;
    this.sidebar = null;
    this.currentViewInstance = null;
    this.pollingTimer = null;
  }

  async init() {
    // 2. Inicjalizacja tożsamości użytkownika i zespołu POK Kartuzy
    try {
      await this.resolveUserIdentity();
    } catch (_) {
      this.showAccessError();
      return;
    }

    const topbarContainer = document.getElementById("topbar-container");
    const sidebarContainer = document.getElementById("sidebar-container");

    this.sidebar = new Sidebar(sidebarContainer, this, this.dataProvider);
    this.topbar = new Topbar(topbarContainer, this, this.dataProvider, this.state);

    // Subskrypcja zmian w danych dla aktualizacji odznak i wskaźników
    this.dataProvider.subscribe(() => {
      if (this.sidebar) this.sidebar.updateBadges();
      if (this.topbar) {
        this.topbar.loadNotifications();
        this.topbar.updateSystemStatus();
      }
    });

    // 3. Automatyczne odświeżanie danych (polling) z ochroną niezapisanych zmian
    this.startAutoRefreshPolling(30000);

    // 4. Obsługa historii przeglądarki
    window.addEventListener("hashchange", () => this.handleHashChange());
    this.handleHashChange();
  }

  async resolveUserIdentity() {
    this.state.currentUser = null;
    if (typeof this.dataProvider.setCurrentUser === "function") this.dataProvider.setCurrentUser(null);
    if (this.mode === "connected") {
      // Autoryzacja przed pobraniem listy zespołu lub jakichkolwiek danych CRM.
      // Pamięć przeglądarki oraz przełącznik profilu nie potwierdzają tożsamości.
      const auth = await this.dataProvider.checkAuth();
      if (!auth || auth.authenticated !== true || !auth.user) {
        throw new Error("Brak dostępu: nie potwierdzono tożsamości Google.");
      }
      this.state.currentUser = auth.user;
      this.dataProvider.setCurrentUser(auth.user);
      return;
    }

    const staffList = await this.dataProvider.getStaff();
    this.state.currentUser = (staffList && staffList[0]) || null;
    if (typeof this.dataProvider.setCurrentUser === "function") this.dataProvider.setCurrentUser(this.state.currentUser);
  }

  showAccessError() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.state.currentUser = null;
    if (typeof this.dataProvider.setCurrentUser === "function") this.dataProvider.setCurrentUser(null);
    const container = document.getElementById("content-container");
    if (!container) return;
    container.innerHTML = `
      <div class="card" role="alert" style="padding: 24px; max-width: 680px; margin: 32px auto;">
        <h2>Nie można potwierdzić dostępu do SmartCare</h2>
        <p>Zaloguj się na uprawnione konto Google i otwórz aplikację ponownie. Jeśli problem się powtarza, skontaktuj się z administratorem.</p>
        <p>Nie udało się potwierdzić tożsamości lub połączenia. Dane CRM nie zostały pobrane.</p>
      </div>`;
  }

  startAutoRefreshPolling(intervalMs = 30000) {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    this.pollingTimer = setInterval(async () => {
      // Ochrona niezapisanych danych:
      // Jeśli pracownik edytuje pole formularza lub modal jest otwarty, nie przeładowuj widoku
      const activeEl = document.activeElement;
      const isUserEditing = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.tagName === "SELECT" ||
        activeEl.isContentEditable
      );
      const isModalOpen = Boolean(document.querySelector(".modal-backdrop") || document.querySelector(".modal-container"));

      // Aktualizacja wskaźników w tle
      if (this.sidebar) this.sidebar.updateBadges();
      if (this.topbar) {
        this.topbar.loadNotifications();
        this.topbar.updateSystemStatus();
      }

      // Ciche odświeżenie danych widoku wyłącznie gdy pracownik nie wprowadza danych
      if (!isUserEditing && !isModalOpen && this.currentViewInstance) {
        if (typeof this.currentViewInstance.loadData === "function") {
          try {
            await this.currentViewInstance.loadData();
          } catch (_) {}
        }
      }
    }, intervalMs);
  }

  navigate(route, params = {}) {
    let hash = `#${route}`;
    // Bezpieczna serializacja parametrów (unikanie [object Object])
    const cleanParams = {};
    for (const k in params) {
      if (params[k] !== undefined && params[k] !== null) {
        if (typeof params[k] === "object") {
          if (k === "customRange" && params[k].from && params[k].to) {
            cleanParams.from = params[k].from;
            cleanParams.to = params[k].to;
          } else {
            cleanParams[k] = JSON.stringify(params[k]);
          }
        } else {
          cleanParams[k] = String(params[k]);
        }
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    if (query) hash += `?${query}`;
    window.location.hash = hash;
  }

  refreshCurrent() {
    this.handleHashChange();
  }

  async handleHashChange() {
    if (this.mode === "connected" && !this.state.currentUser) return;
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
