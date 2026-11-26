/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * DataProvider Interface & Factory
 * 
 * Zapewnia ścisłe rozdzielenie warstwy prezentacji (UI) od warstwy danych.
 * Umożliwia natychmiastowe działanie w trybie demonstracyjnym (DemoDataProvider)
 * oraz bezproblemowe przyszłe przełączenie na Google Apps Script (AppsScriptDataProvider).
 */

export class DataProviderInterface {
  async getTickets(filters = {}) { throw new Error("Not implemented"); }
  async getTicketById(id) { throw new Error("Not implemented"); }
  async createTicket(ticketData) { throw new Error("Not implemented"); }
  async updateTicket(id, updates) { throw new Error("Not implemented"); }
  async deleteTicket(id) { throw new Error("Not implemented"); }
  
  async getCommunications(ticketId = null) { throw new Error("Not implemented"); }
  async addCommunication(commData) { throw new Error("Not implemented"); }
  
  async getStats(period = "all", customRange = null) { throw new Error("Not implemented"); }
  async getDiagnostics() { throw new Error("Not implemented"); }
  async runDiagnosticsTest() { throw new Error("Not implemented"); }
  
  async getStaff() { throw new Error("Not implemented"); }
  async updateStaff(staffList) { throw new Error("Not implemented"); }
  
  async getSettings() { throw new Error("Not implemented"); }
  async updateSettings(settings) { throw new Error("Not implemented"); }
  
  async resetDemoData() { throw new Error("Not implemented"); }
  
  async polishMessageWithAi(message, context = {}) { throw new Error("Not implemented"); }
  
  subscribe(listener) { throw new Error("Not implemented"); }
  unsubscribe(listener) { throw new Error("Not implemented"); }
}
