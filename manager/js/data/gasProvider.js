/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * AppsScriptDataProvider - Kontrakt i szkielet integracji z rzeczywistym silnikiem CRM w Google Apps Script.
 * 
 * Ten plik definiuje i dokumentuje adapter, który zastąpi DemoDataProvider w etapie produkcyjnym.
 * Komunikacja odbywa się za pośrednictwem:
 *   a) google.script.run (w przypadku wdrożenia jako wewnętrzna aplikacja GAS Web App), lub
 *   b) Autoryzowanego endpointu doPost/doGet Web App z nagłówkiem Authorization Bearer token Google.
 * 
 * Zgodnie z wytycznymi bezpieczeństwa v0.3.0:
 * - Brak publicznych, niezabezpieczonych endpointów.
 * - Brak kluczy API po stronie przeglądarki klienta.
 * - Wykorzystanie kontrolek dostępu domeny Google Workspace przedsiębiorstwa.
 */

import { DataProviderInterface } from "./dataProvider.js";

export class AppsScriptDataProvider extends DataProviderInterface {
  constructor(config = {}) {
    super();
    this.endpointUrl = config.endpointUrl || "";
    this.isEmbeddedGas = typeof window !== "undefined" && typeof window.google !== "undefined" && Boolean(window.google.script && window.google.script.run);
  }

  /**
   * Pomocnicza metoda wykonująca wywołanie funkcji backendu Apps Script
   */
  async _callGas(functionName, ...args) {
    if (this.isEmbeddedGas) {
      return new Promise((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler(result => resolve(result))
          .withFailureHandler(error => reject(error))[functionName](...args);
      });
    }

    if (!this.endpointUrl) {
      throw new Error("AppsScriptDataProvider nie jest skonfigurowany (brak adresu URL Web App i brak środowiska google.script.run).");
    }

    // Bezpieczne wywołanie HTTP z przekazaniem metody i parametrów
    const response = await fetch(this.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: functionName,
        payload: args
      })
    });

    if (!response.ok) {
      throw new Error(`Błąd serwera Google Apps Script: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(json.error);
    }
    return json.data;
  }

  async getTickets(filters = {}) {
    return await this._callGas("apiGetTickets", filters);
  }

  async getTicketById(id) {
    return await this._callGas("apiGetTicketById", id);
  }

  async createTicket(ticketData) {
    return await this._callGas("apiCreateTicket", ticketData);
  }

  async updateTicket(id, updates) {
    return await this._callGas("apiUpdateTicket", id, updates);
  }

  async deleteTicket(id) {
    return await this._callGas("apiDeleteTicket", id);
  }

  async getCommunications(ticketId = null) {
    return await this._callGas("apiGetCommunications", ticketId);
  }

  async addCommunication(commData) {
    return await this._callGas("apiAddCommunication", commData);
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
    return await this._callGas("apiGetStaff");
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
    return await this._callGas("apiPolishMessageWithAi", message, context);
  }

  subscribe(listener) {
    // W trybie Web App polling lub SSE
    return () => {};
  }

  unsubscribe(listener) {}
}
