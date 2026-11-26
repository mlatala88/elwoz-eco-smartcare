/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * AppsScriptDataProvider - Pełna implementacja adaptera do rzeczywistego silnika CRM Google Apps Script.
 *
 * Komunikacja odbywa się za pośrednictwem:
 *   a) google.script.run (przy wdrożeniu jako wewnętrzna aplikacja GAS Web App - Wariant A), lub
 *   b) Autoryzowanego endpointu doPost Web App z parametrem action i payload (Wariant B).
 *
 * Zgodnie z wytycznymi bezpieczeństwa v0.3.0:
 * - Brak publicznych, anonimowych endpointów.
 * - Brak kluczy API po stronie przeglądarki klienta.
 * - Bezpieczna identyfikacja pracownika z zespołu POK Kartuzy.
 * - Ochrona niezapisanych danych podczas odpytywania (polling).
 */

import { DataProviderInterface } from "./dataProvider.js";

export class AppsScriptDataProvider extends DataProviderInterface {
  constructor(config = {}) {
    super();
    this.endpointUrl = config.endpointUrl || "";
    this.isEmbeddedGas = typeof window !== "undefined" && typeof window.google !== "undefined" && Boolean(window.google.script && window.google.script.run);
    this.currentUser = null;
    this.listeners = [];
    this.lastSyncTime = null;
    this.connectionStatus = "online"; // "online" | "syncing" | "offline"
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Pomocnicza metoda wykonująca wywołanie funkcji backendu Apps Script
   */
  async _callGas(functionName, ...args) {
    this.connectionStatus = "syncing";

    if (this.isEmbeddedGas) {
      return new Promise((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler(result => {
            this.connectionStatus = "online";
            this.lastSyncTime = new Date().toISOString();
            resolve(result);
          })
          .withFailureHandler(error => {
            this.connectionStatus = "offline";
            reject(new Error(error ? (error.message || String(error)) : "Nieznany błąd Google Apps Script"));
          })[functionName](...args);
      });
    }

    if (!this.endpointUrl) {
      // Jeśli brak endpointu i brak google.script.run, sprawdź czy jest w localStorage
      const savedUrl = typeof localStorage !== "undefined" ? localStorage.getItem("smartcare_gas_endpoint") : "";
      if (savedUrl) {
        this.endpointUrl = savedUrl;
      } else {
        throw new Error("AppsScriptDataProvider: Brak adresu URL Web App i brak środowiska google.script.run. Skonfiguruj adres Web App w Ustawieniach.");
      }
    }

    try {
      const response = await fetch(this.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8" // text/plain zapobiega preflight OPTIONS w GAS Web App
        },
        body: JSON.stringify({
          action: functionName,
          payload: args,
          operator: this.currentUser
        })
      });

      if (!response.ok) {
        this.connectionStatus = "offline";
        throw new Error(`Błąd serwera Google Apps Script: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      if (!json.success && json.error) {
        this.connectionStatus = "offline";
        throw new Error(json.error);
      }

      this.connectionStatus = "online";
      this.lastSyncTime = new Date().toISOString();
      return json.data !== undefined ? json.data : json;

    } catch (err) {
      this.connectionStatus = "offline";
      throw err;
    }
  }

  async getTickets(filters = {}) {
    const res = await this._callGas("apiGetTickets", filters);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.tickets)) return res.tickets;
    if (res && res.data && Array.isArray(res.data)) return res.data;
    return [];
  }

  async getTicketById(id) {
    const res = await this._callGas("apiGetTicketById", id);
    if (res && res.ticket) return res.ticket;
    if (res && res.data && res.data.ticket) return res.data.ticket;
    return res;
  }

  async createTicket(ticketData) {
    const res = await this._callGas("apiCreateTicket", ticketData, this.currentUser);
    this.notify();
    if (res && res.ticket) return res.ticket;
    return res;
  }

  async updateTicket(id, updates) {
    const res = await this._callGas("apiUpdateTicket", id, updates, this.currentUser);
    this.notify();
    if (res && res.ticket) return res.ticket;
    return res;
  }

  async deleteTicket(id) {
    throw new Error("Usuwanie zgłoszeń jest zablokowane ze względów audytowych i prawnych w systemie CRM.");
  }

  async getCommunications(ticketId = null) {
    const res = await this._callGas("apiGetCommunications", ticketId);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.history)) return res.history;
    if (res && res.data && Array.isArray(res.data)) return res.data;
    return [];
  }

  async addCommunication(commData) {
    const res = await this._callGas("apiAddCommunication", commData, this.currentUser);
    this.notify();
    return res;
  }

  async getStats(period = "all", customRange = null) {
    return await this._callGas("apiGetCsiStats", period, customRange);
  }

  async getDiagnostics() {
    return await this._callGas("apiGetDiagnostics");
  }

  async runDiagnosticsTest() {
    return await this._callGas("apiRunDiagnosticsTest");
  }

  async getStaff() {
    const res = await this._callGas("apiGetStaff");
    return Array.isArray(res) ? res : (res && res.staff ? res.staff : []);
  }

  async updateStaff(staffList) {
    return await this._callGas("apiUpdateStaff", staffList);
  }

  async getSettings() {
    return await this._callGas("apiGetSettings");
  }

  async updateSettings(settings) {
    return await this._callGas("apiUpdateSettings", settings);
  }

  async resetDemoData() {
    throw new Error("Resetowanie danych demonstracyjnych jest zablokowane w trybie produkcyjnym CRM.");
  }

  async polishMessageWithAi(message, context = {}) {
    const res = await this._callGas("apiPolishMessageWithAi", message, context);
    if (typeof res === "string") return res;
    if (res && res.stylizowanaTresc) return res.stylizowanaTresc;
    if (res && res.polishedMessage) return res.polishedMessage;
    return String(res || "");
  }

  async triggerAiAnalysis(ticketId) {
    const res = await this._callGas("apiTriggerAiAnalysis", ticketId);
    this.notify();
    return res;
  }

  async reconcileUnprocessedTickets() {
    const res = await this._callGas("apiReconcileUnprocessedTickets");
    this.notify();
    return res;
  }

  async checkAuth() {
    return await this._callGas("apiGetCurrentUser");
  }

  async verifyPin(email, pin) {
    const res = await this._callGas("apiVerifyUser", email, pin);
    if (res && res.success && res.user) {
      this.currentUser = res.user;
    }
    return res;
  }

  subscribe(listener) {
    if (typeof listener === "function" && !this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error("Błąd subskrybenta AppsScriptDataProvider:", e);
      }
    }
  }
}
