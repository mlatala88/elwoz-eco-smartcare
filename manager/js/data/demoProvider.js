/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * DemoDataProvider - Pełna implementacja dostępu do danych w trybie demonstracyjnym.
 * Wykorzystuje pamięć lokalną przeglądarki (localStorage) z bezpiecznym fallbackiem w pamięci RAM.
 * Zapewnia pełną reaktywność, automatyczne przeliczanie metryk CSI i symulację AI.
 */

import { DataProviderInterface } from "./dataProvider.js";
import { INITIAL_TICKETS, INITIAL_COMMUNICATIONS, INITIAL_STAFF, INITIAL_SETTINGS } from "./initialDataset.js";
import { simulateCxAiRefine, evaluateMessageQuality } from "./cxGuardrail.js";

/**
 * Sprawdza czy dany status oznacza sprawę zakończoną (Rozwiązane lub Zamknięte)
 */
export function isClosedStatus(status) {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return s === "rozwiązane" || s === "zamknięte" || s === "rozwiazane" || s === "zamkniete";
}

/**
 * Ujednolicone, w 100% dynamiczne wyliczanie zaległości SLA.
 * Nie polega na historycznej fladze slaOverdue.
 */
export function isTicketOverdue(ticket, dateNow = new Date()) {
  if (!ticket || isClosedStatus(ticket.status)) return false;

  const hasFirstContact = Boolean(ticket.hasFirstContact || ticket.firstContactDate);
  if (!hasFirstContact && ticket.slaDeadline && !isNaN(new Date(ticket.slaDeadline).getTime())) {
    if (new Date(ticket.slaDeadline) < dateNow) return true;
  }
  if (ticket.nextActionDeadline && !isNaN(new Date(ticket.nextActionDeadline).getTime())) {
    if (new Date(ticket.nextActionDeadline) < dateNow) return true;
  }
  return false;
}

const STORAGE_KEYS = {
  TICKETS: "elwoz_smartcare_v3_tickets",
  COMMS: "elwoz_smartcare_v3_comms",
  STAFF: "elwoz_smartcare_v3_staff",
  SETTINGS: "elwoz_smartcare_v3_settings",
  DIAG_SIM: "elwoz_smartcare_v3_diag_sim"
};

export class DemoDataProvider extends DataProviderInterface {
  constructor() {
    super();
    this.listeners = new Set();
    this.initStorage();
  }

  initStorage() {
    try {
      if (!localStorage.getItem(STORAGE_KEYS.TICKETS)) {
        localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(INITIAL_TICKETS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.COMMS)) {
        localStorage.setItem(STORAGE_KEYS.COMMS, JSON.stringify(INITIAL_COMMUNICATIONS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.STAFF)) {
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.DIAG_SIM)) {
        localStorage.setItem(STORAGE_KEYS.DIAG_SIM, JSON.stringify({
          apiHealthy: true,
          dbHealthy: true,
          simulatedLatencyMs: 120,
          pendingAnalysesCount: 0,
          simulatedErrorMode: false,
          lastSyncTime: new Date().toISOString()
        }));
      }
    } catch (e) {
      console.warn("localStorage niedostępny, używam pamięci tymczasowej:", e);
      this.memTickets = JSON.parse(JSON.stringify(INITIAL_TICKETS));
      this.memComms = JSON.parse(JSON.stringify(INITIAL_COMMUNICATIONS));
      this.memStaff = JSON.parse(JSON.stringify(INITIAL_STAFF));
      this.memSettings = JSON.parse(JSON.stringify(INITIAL_SETTINGS));
      this.memDiag = {
        apiHealthy: true,
        dbHealthy: true,
        simulatedLatencyMs: 120,
        pendingAnalysesCount: 0,
        simulatedErrorMode: false,
        lastSyncTime: new Date().toISOString()
      };
    }
  }

  _get(key) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      if (key === STORAGE_KEYS.TICKETS) return this.memTickets;
      if (key === STORAGE_KEYS.COMMS) return this.memComms;
      if (key === STORAGE_KEYS.STAFF) return this.memStaff;
      if (key === STORAGE_KEYS.SETTINGS) return this.memSettings;
      if (key === STORAGE_KEYS.DIAG_SIM) return this.memDiag;
      return null;
    }
  }

  _set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      if (key === STORAGE_KEYS.TICKETS) this.memTickets = data;
      if (key === STORAGE_KEYS.COMMS) this.memComms = data;
      if (key === STORAGE_KEYS.STAFF) this.memStaff = data;
      if (key === STORAGE_KEYS.SETTINGS) this.memSettings = data;
      if (key === STORAGE_KEYS.DIAG_SIM) this.memDiag = data;
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  unsubscribe(listener) {
    this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error("Błąd subskrybenta danych:", e);
      }
    }
  }

  // --- TICKETS ---

  async getTickets(filters = {}) {
    let tickets = this._get(STORAGE_KEYS.TICKETS) || [];

    // Filtrowanie po wybranym okresie (jeżeli przekazano)
    if (filters.period && filters.period !== "all") {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      if (filters.period === "today") {
        tickets = tickets.filter(t => t.timestamp && t.timestamp.startsWith(todayStr));
      } else if (filters.period === "7days") {
        const past7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        tickets = tickets.filter(t => t.timestamp && new Date(t.timestamp) >= past7);
      } else if (filters.period === "30days") {
        const past30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        tickets = tickets.filter(t => t.timestamp && new Date(t.timestamp) >= past30);
      } else if (filters.period === "custom" && filters.customRange && filters.customRange.from && filters.customRange.to) {
        const fromD = new Date(filters.customRange.from);
        const toD = new Date(filters.customRange.to + "T23:59:59");
        tickets = tickets.filter(t => {
          const d = new Date(t.timestamp);
          return d >= fromD && d <= toD;
        });
      }
    }

    // Filtrowanie po tekście (wyszukiwarka)
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      tickets = tickets.filter(t => 
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.applicantName && t.applicantName.toLowerCase().includes(q)) ||
        (t.applicantPhone && t.applicantPhone.toLowerCase().includes(q)) ||
        (t.applicantEmail && t.applicantEmail.toLowerCase().includes(q)) ||
        (t.city && t.city.toLowerCase().includes(q)) ||
        (t.street && t.street.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.nextAction && t.nextAction.toLowerCase().includes(q)) ||
        (t.employeeNote && t.employeeNote.toLowerCase().includes(q))
      );
    }

    // Filtry precyzyjne
    if (filters.status && filters.status !== "all") {
      if (isClosedStatus(filters.status)) {
        tickets = tickets.filter(t => isClosedStatus(t.status));
      } else {
        tickets = tickets.filter(t => t.status === filters.status);
      }
    }

    if (filters.priority && filters.priority !== "all") {
      tickets = tickets.filter(t => t.priority === filters.priority);
    }

    if (filters.category && filters.category !== "all") {
      tickets = tickets.filter(t => t.type === filters.category);
    }

    if (filters.assignee && filters.assignee !== "all") {
      tickets = tickets.filter(t => t.assignee === filters.assignee);
    }

    if (filters.aiState && filters.aiState !== "all") {
      tickets = tickets.filter(t => t.aiState === filters.aiState);
    }

    // Filtry terminu
    if (filters.deadlineFilter && filters.deadlineFilter !== "all") {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      
      if (filters.deadlineFilter === "overdue") {
        tickets = tickets.filter(t => isTicketOverdue(t, now));
      } else if (filters.deadlineFilter === "today") {
        tickets = tickets.filter(t => t.nextActionDeadline && t.nextActionDeadline.startsWith(todayStr));
      } else if (filters.deadlineFilter === "no_step") {
        tickets = tickets.filter(t => !isClosedStatus(t.status) && (!t.nextAction || t.nextAction.trim() === ""));
      }
    }

    // Filtrowanie z kliknięcia wskaźnika KPI (metricKey)
    if (filters.metricKey) {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      switch (filters.metricKey) {
        case "new":
          tickets = tickets.filter(t => t.status === "Nowe");
          break;
        case "no_response":
          tickets = tickets.filter(t => !isClosedStatus(t.status) && !t.firstContactDate);
          break;
        case "urgent":
          tickets = tickets.filter(t => t.priority === "PILNY" && !isClosedStatus(t.status));
          break;
        case "overdue":
          tickets = tickets.filter(t => isTicketOverdue(t, now));
          break;
        case "today":
          tickets = tickets.filter(t => t.nextActionDeadline && t.nextActionDeadline.startsWith(todayStr));
          break;
        case "no_step":
          tickets = tickets.filter(t => !isClosedStatus(t.status) && (!t.nextAction || t.nextAction.trim() === ""));
          break;
        case "awaiting_citizen":
          tickets = tickets.filter(t => t.responsibleSide === "Mieszkaniec" && !isClosedStatus(t.status));
          break;
        case "awaiting_company":
          tickets = tickets.filter(t => t.responsibleSide === "Przedsiębiorstwo" && !isClosedStatus(t.status));
          break;
        case "resolved":
          tickets = tickets.filter(t => isClosedStatus(t.status));
          break;
        case "review_invites":
          tickets = tickets.filter(t => t.reviewInviteSent === "TAK");
          break;
        case "rated":
          tickets = tickets.filter(t => t.satisfactionScore != null);
          break;
        case "low_rated":
          tickets = tickets.filter(t => t.satisfactionScore != null && t.satisfactionScore <= 2);
          break;
      }
    }

    // Sortowanie
    const sortField = filters.sortField || "timestamp";
    const sortOrder = filters.sortOrder === "asc" ? 1 : -1;

    tickets.sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    return tickets;
  }

  async getTicketById(id) {
    const tickets = this._get(STORAGE_KEYS.TICKETS) || [];
    return tickets.find(t => t.id === id) || null;
  }

  async createTicket(ticketData) {
    const tickets = this._get(STORAGE_KEYS.TICKETS) || [];
    const maxNum = tickets.reduce((max, t) => {
      const match = t.id && t.id.match(/ELW-2026-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);

    const newId = `ELW-2026-${String(maxNum + 1).padStart(4, "0")}`;
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

    const newTicket = {
      id: newId,
      timestamp: nowStr,
      type: ticketData.type || "Inne",
      fraction: ticketData.fraction || "Nie dotyczy",
      city: ticketData.city || "Kartuzy",
      street: ticketData.street || "",
      houseNumber: ticketData.houseNumber || "",
      incidentDate: ticketData.incidentDate || nowStr.split(" ")[0],
      description: ticketData.description || "",
      applicantName: ticketData.applicantName || "Mieszkaniec",
      applicantPhone: ticketData.applicantPhone || "",
      applicantEmail: ticketData.applicantEmail || "",
      contactRequest: ticketData.contactRequest || "TAK",
      status: ticketData.status || "Nowe",
      priority: ticketData.priority || "STANDARDOWY",
      suggestedPriority: ticketData.suggestedPriority || ticketData.priority || "STANDARDOWY",
      priorityRationale: ticketData.priorityRationale || "Automatyczna rejestracja w panelu managera.",
      aiState: ticketData.aiState || "Przeanalizowano",
      localValidation: ticketData.localValidation || "OK",
      contradictions: ticketData.contradictions || "Brak sprzeczności",
      assignee: ticketData.assignee || "Nieprzypisany",
      nextAction: ticketData.nextAction || "Wstępna weryfikacja zgłoszenia",
      responsibleSide: ticketData.responsibleSide || "Przedsiębiorstwo",
      nextActionDeadline: ticketData.nextActionDeadline || "",
      slaDeadline: ticketData.slaDeadline || "",
      slaOverdue: "NIE",
      employeeNote: ticketData.employeeNote || "",
      receiptConfirmedDate: "",
      firstContactDate: "",
      lastContactDate: "",
      resolvedDate: "",
      resolutionMethod: "",
      contactResult: "",
      satisfactionScore: null,
      citizenFeedback: "",
      reviewInviteSent: "NIE",
      reviewInviteDate: "",
      aiCategory: ticketData.type || "Inne",
      aiSummary: ticketData.description ? ticketData.description.substring(0, 120) + "..." : "",
      aiMissingInfo: "Brak braków",
      aiSuggestedAction: "Weryfikacja dyspozytorska",
      aiRecommendedStep: "Kontakt z mieszkańcem",
      aiDraftReply: `Dzień dobry, dziękujemy za kontakt z POK Kartuzy. Potwierdzamy przyjęcie zgłoszenia ${newId}.`
    };

    tickets.unshift(newTicket);
    this._set(STORAGE_KEYS.TICKETS, tickets);
    return newTicket;
  }

  async updateTicket(id, updates) {
    const tickets = this._get(STORAGE_KEYS.TICKETS) || [];
    const index = tickets.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Zgłoszenie o ID ${id} nie zostało odnalezione.`);
    }

    const current = tickets[index];
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

    // Wymóg nienaruszalności standardu: nie można zamknąć zgłoszenia bez rzeczywistego sposobu rozwiązania sprawy
    if (isClosedStatus(updates.status)) {
      const resMethod = (updates.resolutionMethod !== undefined ? updates.resolutionMethod : current.resolutionMethod) || "";
      if (!resMethod.trim()) {
        throw new Error("Nie można zamknąć zgłoszenia bez wpisania rzeczywistego sposobu rozwiązania sprawy.");
      }
    }

    // Automatyczna aktualizacja dat cyklu życia
    if (isClosedStatus(updates.status) && !isClosedStatus(current.status) && !updates.resolvedDate) {
      updates.resolvedDate = nowStr;
    }

    if (updates.status && !isClosedStatus(updates.status) && isClosedStatus(current.status)) {
      updates.resolvedDate = "";
    }

    const updated = { ...current, ...updates };
    tickets[index] = updated;
    this._set(STORAGE_KEYS.TICKETS, tickets);
    return updated;
  }

  async deleteTicket(id) {
    let tickets = this._get(STORAGE_KEYS.TICKETS) || [];
    tickets = tickets.filter(t => t.id !== id);
    this._set(STORAGE_KEYS.TICKETS, tickets);
    return true;
  }

  // --- COMMUNICATIONS ---

  async getCommunications(ticketId = null) {
    const comms = this._get(STORAGE_KEYS.COMMS) || [];
    if (ticketId) {
      return comms.filter(c => c.ticketId === ticketId);
    }
    return comms;
  }

  async addCommunication(commData) {
    const comms = this._get(STORAGE_KEYS.COMMS) || [];
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);
    const newId = `COMM-${String(comms.length + 1).padStart(3, "0")}`;

    const newComm = {
      id: newId,
      ticketId: commData.ticketId,
      timestamp: nowStr,
      actionType: commData.actionType || "Wiadomość robocza",
      channel: commData.channel || "E-mail",
      recipient: commData.recipient || "",
      subject: commData.subject || "",
      content: commData.content || "",
      author: commData.author || "Pracownik POK",
      status: commData.status || "Wysłano",
      errorMessage: commData.errorMessage || ""
    };

    comms.unshift(newComm);
    this._set(STORAGE_KEYS.COMMS, comms);

    // Zaktualizuj powiązane zgłoszenie (data pierwszego i ostatniego kontaktu)
    // Bezpieczeństwo: Nie aktualizuj dat kontaktu ani statusu, jeżeli status komunikacji to Błąd
    if (commData.ticketId && commData.status !== "Błąd") {
      const ticket = await this.getTicketById(commData.ticketId);
      if (ticket) {
        const ticketUpdates = {
          lastContactDate: nowStr
        };
        if (!ticket.firstContactDate) {
          ticketUpdates.firstContactDate = nowStr;
        }
        if (commData.actionType === "Potwierdzenie przyjęcia" && !ticket.receiptConfirmedDate) {
          ticketUpdates.receiptConfirmedDate = nowStr;
        }
        if (commData.actionType === "Zaproszenie do opinii Google") {
          ticketUpdates.reviewInviteSent = "TAK";
          ticketUpdates.reviewInviteDate = nowStr;
        }
        if (commData.actionType === "Informacja o rozwiązaniu" && !isClosedStatus(ticket.status)) {
          // Funkcja addCommunication nie może samodzielnie wymyślać sposobu rozwiązania zgłoszenia.
          if (ticket.resolutionMethod && ticket.resolutionMethod.trim()) {
            ticketUpdates.status = "Rozwiązane";
            ticketUpdates.resolvedDate = nowStr;
          }
        }
        await this.updateTicket(commData.ticketId, ticketUpdates);
      }
    }

    return newComm;
  }

  // --- STATS & ANALYTICS ---

  async getStats(period = "all", customRange = null) {
    let tickets = this._get(STORAGE_KEYS.TICKETS) || [];

    // Filtrowanie po wybranym okresie
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (period === "today") {
      tickets = tickets.filter(t => t.timestamp && t.timestamp.startsWith(todayStr));
    } else if (period === "7days") {
      const past7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      tickets = tickets.filter(t => t.timestamp && new Date(t.timestamp) >= past7);
    } else if (period === "30days") {
      const past30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      tickets = tickets.filter(t => t.timestamp && new Date(t.timestamp) >= past30);
    } else if (period === "custom" && customRange && customRange.from && customRange.to) {
      const fromD = new Date(customRange.from);
      const toD = new Date(customRange.to + "T23:59:59");
      tickets = tickets.filter(t => {
        const d = new Date(t.timestamp);
        return d >= fromD && d <= toD;
      });
    }

    const total = tickets.length;
    const newCount = tickets.filter(t => t.status === "Nowe").length;
    const noFirstResponse = tickets.filter(t => !isClosedStatus(t.status) && !t.firstContactDate).length;
    const urgent = tickets.filter(t => t.priority === "PILNY" && !isClosedStatus(t.status)).length;
    const overdue = tickets.filter(t => isTicketOverdue(t, now)).length;
    const dueToday = tickets.filter(t => t.nextActionDeadline && t.nextActionDeadline.startsWith(todayStr)).length;
    const noNextStep = tickets.filter(t => !isClosedStatus(t.status) && (!t.nextAction || t.nextAction.trim() === "")).length;
    const awaitingCitizen = tickets.filter(t => t.responsibleSide === "Mieszkaniec" && !isClosedStatus(t.status)).length;
    const awaitingCompany = tickets.filter(t => t.responsibleSide === "Przedsiębiorstwo" && !isClosedStatus(t.status)).length;
    const resolved = tickets.filter(t => isClosedStatus(t.status)).length;

    const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : "-";

    // Średni czas 1. reakcji (w minutach / godzinach)
    let totalFirstResponseMinutes = 0;
    let responseCount = 0;
    tickets.forEach(t => {
      if (t.timestamp && t.firstContactDate) {
        const start = new Date(t.timestamp);
        const first = new Date(t.firstContactDate);
        const diffMs = first.getTime() - start.getTime();
        if (diffMs > 0) {
          totalFirstResponseMinutes += Math.round(diffMs / (60 * 1000));
          responseCount++;
        }
      }
    });

    let avgFirstResponseFormatted = "-";
    if (responseCount > 0) {
      const avgMins = Math.round(totalFirstResponseMinutes / responseCount);
      if (avgMins < 60) {
        avgFirstResponseFormatted = `${avgMins} min`;
      } else {
        const hrs = Math.floor(avgMins / 60);
        const mins = avgMins % 60;
        avgFirstResponseFormatted = `${hrs}h ${mins}m`;
      }
    }

    // Średni czas rozwiązania
    let totalResolutionHours = 0;
    let resolvedCalcCount = 0;
    tickets.forEach(t => {
      if (t.timestamp && t.resolvedDate && isClosedStatus(t.status)) {
        const start = new Date(t.timestamp);
        const end = new Date(t.resolvedDate);
        const diffMs = end.getTime() - start.getTime();
        if (diffMs > 0) {
          totalResolutionHours += diffMs / (3600 * 1000);
          resolvedCalcCount++;
        }
      }
    });

    let avgResolutionFormatted = "-";
    if (resolvedCalcCount > 0) {
      const avgH = totalResolutionHours / resolvedCalcCount;
      if (avgH < 24) {
        avgResolutionFormatted = `${avgH.toFixed(1)} godz.`;
      } else {
        const days = (avgH / 24).toFixed(1);
        avgResolutionFormatted = `${days} dni`;
      }
    }

    // Średnia satysfakcja i liczba ocen
    const ratedTickets = tickets.filter(t => t.satisfactionScore != null && t.satisfactionScore > 0);
    const feedbackCount = ratedTickets.length;
    let avgSatisfactionFormatted = "-";
    if (feedbackCount > 0) {
      const sum = ratedTickets.reduce((acc, t) => acc + Number(t.satisfactionScore), 0);
      avgSatisfactionFormatted = (sum / feedbackCount).toFixed(2);
    }

    const reviewInvitesCount = tickets.filter(t => t.reviewInviteSent === "TAK").length;

    // Podział na kategorie
    const categoryMap = {};
    tickets.forEach(t => {
      const cat = t.type || "Inne";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    // Podział na statusy
    const statusMap = {
      "Nowe": 0,
      "Do weryfikacji": 0,
      "W realizacji": 0,
      "Oczekuje na informacje": 0,
      "Rozwiązane": 0,
      "Zamknięte": 0
    };
    tickets.forEach(t => {
      if (statusMap[t.status] !== undefined) {
        statusMap[t.status]++;
      } else {
        statusMap[t.status] = 1;
      }
    });

    // Podział na priorytety
    const priorityMap = {
      "PILNY": 0,
      "WYSOKI": 0,
      "STANDARDOWY": 0,
      "NISKI": 0
    };
    tickets.forEach(t => {
      if (priorityMap[t.priority] !== undefined) {
        priorityMap[t.priority]++;
      }
    });

    // Rozkład ocen 1-5
    const csatDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratedTickets.forEach(t => {
      const s = Math.round(t.satisfactionScore);
      if (csatDistribution[s] !== undefined) csatDistribution[s]++;
    });

    // Zgłoszenia w czasie (grupowane wg daty)
    const timeTrendMap = {};
    tickets.forEach(t => {
      const dateKey = t.timestamp ? t.timestamp.split(" ")[0] : "Brak daty";
      timeTrendMap[dateKey] = (timeTrendMap[dateKey] || 0) + 1;
    });

    // Posortowane daty trendu
    const trendLabels = Object.keys(timeTrendMap).sort();
    const trendValues = trendLabels.map(d => timeTrendMap[d]);

    // Top 5 spraw wymagających natychmiastowego działania
    const topUrgent = [...tickets]
      .filter(t => !isClosedStatus(t.status))
      .sort((a, b) => {
        const pOrder = { "PILNY": 4, "WYSOKI": 3, "STANDARDOWY": 2, "NISKI": 1 };
        const pDiff = (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        const aOverdue = isTicketOverdue(a, now);
        const bOverdue = isTicketOverdue(b, now);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
      })
      .slice(0, 5);

    return {
      period,
      total,
      newCount,
      noFirstResponse,
      urgent,
      overdue,
      dueToday,
      noNextStep,
      awaitingCitizen,
      awaitingCompany,
      resolved,
      resolutionRate,
      avgFirstResponseFormatted,
      avgResolutionFormatted,
      avgSatisfactionFormatted,
      feedbackCount,
      reviewInvitesCount,
      categoryMap,
      statusMap,
      priorityMap,
      csatDistribution,
      trendLabels,
      trendValues,
      topUrgent
    };
  }

  // --- DIAGNOSTICS ---

  async getDiagnostics() {
    const diag = this._get(STORAGE_KEYS.DIAG_SIM) || {};
    const tickets = this._get(STORAGE_KEYS.TICKETS) || [];
    const comms = this._get(STORAGE_KEYS.COMMS) || [];

    const totalTickets = tickets.length;
    const aiErrors = tickets.filter(t => t.aiState === "Błąd").length;
    const unprocessed = tickets.filter(t => !t.aiState || t.aiState === "Brak").length;
    const validationIssues = tickets.filter(t => t.localValidation && t.localValidation !== "OK").length;
    const commErrors = comms.filter(c => c.status === "Błąd").length;

    return {
      appVersion: "v0.3.0 (Demo Prototype)",
      environment: "GitHub Pages / Localhost Demonstration Mode",
      dataBackend: "LocalStorage (DemoDataProvider)",
      sheetsConnection: diag.dbHealthy ? "OK" : "Błąd połączenia",
      geminiApiStatus: diag.apiHealthy ? "Dostępne (Model gemini-3.6-flash)" : "Błąd API / Quota limit",
      latencyMs: diag.simulatedLatencyMs || 120,
      totalTickets,
      aiErrors,
      unprocessed,
      validationIssues,
      commErrors,
      lastSyncTime: diag.lastSyncTime || new Date().toISOString(),
      simulatedErrorMode: !!diag.simulatedErrorMode
    };
  }

  async runDiagnosticsTest() {
    const diag = this._get(STORAGE_KEYS.DIAG_SIM) || {};
    diag.lastSyncTime = new Date().toISOString();
    this._set(STORAGE_KEYS.DIAG_SIM, diag);

    const tests = [];

    // 1. Rzeczywisty test zapisu i odczytu magazynu (LocalStorage / RAM fallback)
    const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    let storagePassed = false;
    try {
      const testKey = "__smartcare_diag_test__";
      const testVal = JSON.stringify({ ping: "pong", ts: Date.now() });
      localStorage.setItem(testKey, testVal);
      const readVal = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      storagePassed = (readVal === testVal);
    } catch (e) {
      storagePassed = false;
    }
    const t1 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const storageLatency = Math.max(1, Math.round(t1 - t0));
    tests.push({
      name: "Połączenie z magazynem demonstracyjnym",
      status: storagePassed ? "PASSED" : "FAILED",
      latency: `${storageLatency} ms`
    });

    // 2. Rzeczywista weryfikacja integralności schematu (43 kolumny CSI)
    const t2 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const tickets = this._get(STORAGE_KEYS.TICKETS) || [];
    const requiredCols = [
      "id", "timestamp", "type", "fraction", "city", "street", "houseNumber",
      "incidentDate", "description", "applicantName", "applicantPhone", "applicantEmail",
      "contactRequest", "status", "priority", "suggestedPriority", "priorityRationale",
      "aiState", "localValidation", "contradictions", "assignee", "nextAction",
      "responsibleSide", "nextActionDeadline", "slaDeadline", "slaOverdue", "employeeNote",
      "receiptConfirmedDate", "firstContactDate", "lastContactDate", "resolvedDate",
      "resolutionMethod", "contactResult", "satisfactionScore", "citizenFeedback",
      "reviewInviteSent", "reviewInviteDate", "aiCategory", "aiSummary", "aiMissingInfo",
      "aiSuggestedAction", "aiRecommendedStep", "aiDraftReply"
    ];
    let schemaValid = tickets.length > 0;
    if (schemaValid) {
      const sample = tickets[0];
      for (const col of requiredCols) {
        if (!(col in sample)) {
          schemaValid = false;
          break;
        }
      }
    }
    const t3 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const schemaLatency = Math.max(1, Math.round(t3 - t2));
    tests.push({
      name: "Format danych (43 kolumny CSI)",
      status: schemaValid ? "PASSED" : "FAILED",
      latency: `${schemaLatency} ms`
    });

    // 3. Symulator Gemini API 3.6 Flash (stan faktyczny z konfiguracji diagnostycznej)
    const apiAvailable = !!(diag.apiHealthy && !diag.simulatedErrorMode);
    const apiLatency = diag.simulatedLatencyMs || 120;
    tests.push({
      name: "Symulator Gemini API 3.6 Flash",
      status: apiAvailable ? "PASSED" : "FAILED",
      latency: `${apiLatency} ms`
    });

    // 4. Rzeczywista ewaluacja reguł i filtrów CX/PR Guardrail
    const t4 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    let cxPassed = false;
    try {
      const evalSample = evaluateMessageQuality("Dzień dobry, potwierdzamy przyjęcie zgłoszenia. Sprawa została przekazana do realizacji.");
      const profanityCheck = evaluateMessageQuality("Ty pacanie, załatw to sam.");
      cxPassed = (evalSample.isValid && !profanityCheck.isValid && profanityCheck.forbiddenViolations.length > 0);
    } catch (e) {
      cxPassed = false;
    }
    const t5 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const cxLatency = Math.max(1, Math.round(t5 - t4));
    tests.push({
      name: "Weryfikacja reguł i filtrów CX/PR",
      status: cxPassed ? "PASSED" : "FAILED",
      latency: `${cxLatency} ms`
    });

    // 5. Sprawdzenie spójności statusów cyklu życia zgłoszeń
    const t6 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const validStatuses = ["Nowe", "Do weryfikacji", "W realizacji", "Oczekuje na informacje", "Rozwiązane", "Zamknięte"];
    const statusIntegrity = tickets.length > 0 && tickets.every(t => validStatuses.includes(t.status));
    const t7 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const statusLatency = Math.max(1, Math.round(t7 - t6));
    tests.push({
      name: "Spójność statusów cyklu życia zgłoszeń",
      status: statusIntegrity ? "PASSED" : "FAILED",
      latency: `${statusLatency} ms`
    });

    const allPassed = tests.every(t => t.status === "PASSED");

    return {
      success: allPassed,
      timestamp: new Date().toLocaleTimeString("pl-PL"),
      tests
    };
  }

  async toggleSimulatedError() {
    const diag = this._get(STORAGE_KEYS.DIAG_SIM) || {};
    diag.apiHealthy = !diag.apiHealthy;
    diag.simulatedErrorMode = !diag.apiHealthy;
    this._set(STORAGE_KEYS.DIAG_SIM, diag);
    return diag;
  }

  // --- STAFF & SETTINGS ---

  async getStaff() {
    return this._get(STORAGE_KEYS.STAFF) || INITIAL_STAFF;
  }

  async updateStaff(staffList) {
    this._set(STORAGE_KEYS.STAFF, staffList);
    return staffList;
  }

  async getSettings() {
    return this._get(STORAGE_KEYS.SETTINGS) || INITIAL_SETTINGS;
  }

  async updateSettings(settings) {
    this._set(STORAGE_KEYS.SETTINGS, settings);
    return settings;
  }

  async resetDemoData() {
    try {
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(INITIAL_TICKETS));
      localStorage.setItem(STORAGE_KEYS.COMMS, JSON.stringify(INITIAL_COMMUNICATIONS));
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      localStorage.setItem(STORAGE_KEYS.DIAG_SIM, JSON.stringify({
        apiHealthy: true,
        dbHealthy: true,
        simulatedLatencyMs: 120,
        pendingAnalysesCount: 0,
        simulatedErrorMode: false,
        lastSyncTime: new Date().toISOString()
      }));
    } catch (e) {
      this.memTickets = JSON.parse(JSON.stringify(INITIAL_TICKETS));
      this.memComms = JSON.parse(JSON.stringify(INITIAL_COMMUNICATIONS));
      this.memStaff = JSON.parse(JSON.stringify(INITIAL_STAFF));
      this.memSettings = JSON.parse(JSON.stringify(INITIAL_SETTINGS));
      this.memDiag = {
        apiHealthy: true,
        dbHealthy: true,
        simulatedLatencyMs: 120,
        pendingAnalysesCount: 0,
        simulatedErrorMode: false,
        lastSyncTime: new Date().toISOString()
      };
    }
    this.notify();
    return true;
  }

  // --- AI MESSAGE POLISHING SIMULATION ---

  async polishMessageWithAi(rawMessage, context = {}) {
    const diag = this._get(STORAGE_KEYS.DIAG_SIM) || {};
    if (!diag.apiHealthy || diag.simulatedErrorMode) {
      throw new Error("Gemini API (tryb symulacji błędu): Usługa chwilowo niedostępna. Spróbuj ponownie.");
    }

    // Krótka sztuczna zwłoka symulująca odpowiedź modelu (100 ms)
    await new Promise(r => setTimeout(r, 100));

    return simulateCxAiRefine(rawMessage, context);
  }
}
