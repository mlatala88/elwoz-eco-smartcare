/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Ticket Detail View (Centrum obsługi pojedynczego zgłoszenia – 3 kolumny)
 */

export class DetailView {
  constructor(container, router, dataProvider, state) {
    this.container = container;
    this.router = router;
    this.dataProvider = dataProvider;
    this.state = state;
    this.ticketId = null;
    this.ticket = null;
    this.staffList = [];
    this.communications = [];
  }

  async render(params = {}) {
    this.ticketId = params.id;
    if (!this.ticketId) {
      this.container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-triangle" class="empty-state-icon"></i>
          <div class="empty-state-title">Nie wybrano zgłoszenia</div>
          <button class="btn btn-navy btn-sm" id="btn-back-tickets">Wróć do listy zgłoszeń</button>
        </div>
      `;
      this.container.querySelector("#btn-back-tickets").onclick = () => this.router.navigate("tickets");
      return;
    }

    this.ticket = await this.dataProvider.getTicketById(this.ticketId);
    if (!this.ticket) {
      this.container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-octagon" class="empty-state-icon"></i>
          <div class="empty-state-title">Nie odnaleziono zgłoszenia ${this.ticketId}</div>
          <button class="btn btn-navy btn-sm" id="btn-back-tickets">Wróć do listy zgłoszeń</button>
        </div>
      `;
      this.container.querySelector("#btn-back-tickets").onclick = () => this.router.navigate("tickets");
      return;
    }

    this.staffList = await this.dataProvider.getStaff();
    this.communications = await this.dataProvider.getCommunications(this.ticketId);

    // Znajdź poprzednie i następne ID zgłoszenia do szybkiej nawigacji
    const allTickets = await this.dataProvider.getTickets();
    const currentIndex = allTickets.findIndex(t => t.id === this.ticketId);
    const prevTicket = currentIndex > 0 ? allTickets[currentIndex - 1] : null;
    const nextTicket = currentIndex < allTickets.length - 1 ? allTickets[currentIndex + 1] : null;

    const currentUserName = this.state.currentUser ? this.state.currentUser.name : "Anna Nowak";

    // Wyliczenie SLA
    const now = new Date();
    const isOverdue = this.ticket.slaOverdue === "TAK" || (this.ticket.nextActionDeadline && new Date(this.ticket.nextActionDeadline) < now && this.ticket.status !== "Rozwiązane");
    let slaDisplay = "Zgodne z normą";
    if (isOverdue) slaDisplay = "⚠️ PRZEKROCZONO SLA";
    else if (this.ticket.slaDeadline) slaDisplay = `Termin: ${this.ticket.slaDeadline}`;

    this.container.innerHTML = `
      <div class="detail-view-container">
        <!-- Górny pasek nawigacji zgłoszenia -->
        <div class="detail-top-nav">
          <div class="detail-nav-left">
            <button class="btn btn-secondary btn-sm" id="btn-detail-back" title="Wróć do listy">
              <i data-lucide="arrow-left" style="width: 15px; height: 15px;"></i>
              <span>Powrót</span>
            </button>
            <div class="detail-ticket-heading">
              <span>${this.ticket.id}</span>
              <span class="badge badge-status-${this.ticket.status.toLowerCase().replace(/\s+/g, '-')}">${this.ticket.status}</span>
              <span class="badge badge-prio-${this.ticket.priority.toLowerCase()}">${this.ticket.priority}</span>
            </div>
          </div>

          <div class="detail-nav-right">
            <button class="btn btn-secondary btn-xs" id="btn-prev-ticket" ${!prevTicket ? 'disabled' : ''} title="Poprzednie zgłoszenie">
              <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>
              <span>Poprzednie</span>
            </button>
            <button class="btn btn-secondary btn-xs" id="btn-next-ticket" ${!nextTicket ? 'disabled' : ''} title="Następne zgłoszenie">
              <span>Następne</span>
              <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </div>

        <!-- Główna siatka 3 paneli -->
        <div class="detail-panels-grid">
          
          <!-- PANEL LEWY: DANE MIESZKAŃCA I ZDARZENIA -->
          <div class="detail-panel">
            <div class="detail-panel-header">
              <span>Mieszkaniec i Lokalizacja</span>
              <i data-lucide="user" style="width: 16px; height: 16px; color: var(--brand-navy);"></i>
            </div>
            <div class="detail-panel-body">
              <div class="info-section">
                <span class="info-section-title">Dane kontaktowe</span>
                <div class="info-row">
                  <i data-lucide="user" class="info-icon"></i>
                  <div class="info-value-block">
                    <span class="info-label">Imię i nazwisko</span>
                    <span class="info-value">${this.ticket.applicantName || 'Mieszkaniec'}</span>
                  </div>
                </div>
                <div class="info-row">
                  <i data-lucide="phone" class="info-icon"></i>
                  <div class="info-value-block">
                    <span class="info-label">Telefon</span>
                    <span class="info-value">${this.ticket.applicantPhone || '<span style="color: var(--text-muted); font-weight: normal;">Brak telefonu</span>'}</span>
                  </div>
                </div>
                <div class="info-row">
                  <i data-lucide="mail" class="info-icon"></i>
                  <div class="info-value-block">
                    <span class="info-label">Adres e-mail</span>
                    <span class="info-value" style="word-break: break-all;">${this.ticket.applicantEmail || '<span style="color: var(--text-muted); font-weight: normal;">Brak e-mail</span>'}</span>
                  </div>
                </div>
                <div class="info-row">
                  <i data-lucide="message-square" class="info-icon"></i>
                  <div class="info-value-block">
                    <span class="info-label">Oczekuje na kontakt</span>
                    <span class="info-value">${this.ticket.contactRequest === 'TAK' ? 'TAK – prosi o telefon/e-mail' : 'NIE'}</span>
                  </div>
                </div>
              </div>

              <div class="info-section">
                <span class="info-section-title">Lokalizacja i Frakcja</span>
                <div class="info-row">
                  <i data-lucide="map-pin" class="info-icon"></i>
                  <div class="info-value-block">
                    <span class="info-label">Adres zdarzenia</span>
                    <span class="info-value">${this.ticket.city}, ul. ${this.ticket.street} ${this.ticket.houseNumber || '<span style="color: var(--prio-urgent);">(brak numeru posesji!)</span>'}</span>
                  </div>
                </div>
                <div class="info-row">
                  <i data-lucide="trash-2" class="info-icon"></i>
                  <div class="info-value-block">
                    <span class="info-label">Frakcja odpadów</span>
                    <span class="fraction-pill" style="margin-top: 3px;">
                      <span class="fraction-dot fraction-${this.ticket.fraction.toLowerCase().split(' ')[0]}"></span>
                      ${this.ticket.fraction}
                    </span>
                  </div>
                </div>
                <div class="info-row">
                  <i data-lucide="calendar" class="info-icon"></i>
                  <div class="info-value-block">
                    <span class="info-label">Data rejestracji / zdarzenia</span>
                    <span class="info-value">${this.ticket.timestamp} (zdarzenie: ${this.ticket.incidentDate || '-'})</span>
                  </div>
                </div>
              </div>

              <div class="info-section">
                <span class="info-section-title">Oryginalna treść zgłoszenia</span>
                <div class="ticket-original-description">
                  ${this.ticket.description || 'Brak treści opisu.'}
                </div>
              </div>

              <div class="info-section" style="border-bottom: none;">
                <span class="info-section-title">Dziennik kontaktów (${this.communications.length})</span>
                <div id="left-panel-comms-list" style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
                  ${this.renderMiniComms()}
                </div>
              </div>
            </div>
          </div>

          <!-- PANEL ŚRODKOWY: ASYSTENT AI & KREATOR WIADOMOŚCI -->
          <div class="detail-panel">
            <div class="detail-panel-header">
              <span>Asystent AI & Komunikacja z mieszkańcem</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge badge-ai-przeanalizowano" style="font-size: 10px;">Gemini 3.6 Flash</span>
              </div>
            </div>
            <div class="detail-panel-body">
              
              <!-- Karta Asystenta AI -->
              <div class="ai-card">
                <div class="ai-card-header">
                  <div class="ai-card-title">
                    <i data-lucide="sparkles" style="width: 16px; height: 16px;"></i>
                    <span>Analiza Customer Service Intelligence</span>
                  </div>
                  <span class="badge ${this.ticket.aiState === 'Błąd' ? 'badge-ai-blad' : 'badge-ai-przeanalizowano'}">${this.ticket.aiState}</span>
                </div>

                <!-- Streszczenie -->
                <div class="ai-insight-box">
                  <div class="ai-insight-label">Streszczenie problemu:</div>
                  <div>${this.ticket.aiSummary || 'Brak wygenerowanego streszczenia.'}</div>
                </div>

                <!-- Wykryte braki i sprzeczności -->
                ${this.ticket.aiMissingInfo && this.ticket.aiMissingInfo !== 'Brak braków' ? `
                  <div class="ai-alert-missing">
                    <i data-lucide="alert-circle" style="width: 16px; height: 16px; flex-shrink: 0;"></i>
                    <div><strong>Wykryte braki danych:</strong> ${this.ticket.aiMissingInfo}</div>
                  </div>
                ` : ''}

                ${this.ticket.contradictions && this.ticket.contradictions !== 'Brak sprzeczności' ? `
                  <div class="ai-alert-missing" style="background-color: #FEF0C7; border-color: #FEDF89; color: #B54708;">
                    <i data-lucide="alert-triangle" style="width: 16px; height: 16px; flex-shrink: 0;"></i>
                    <div><strong>Wykryte sprzeczności:</strong> ${this.ticket.contradictions}</div>
                  </div>
                ` : ''}

                <!-- Rekomendacja priorytetu i uzasadnienie -->
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px; font-size: 12px; align-items: center;">
                  <span style="font-weight: 700; color: var(--text-secondary);">Rekomendowany priorytet:</span>
                  <div>
                    <span class="badge badge-prio-${(this.ticket.suggestedPriority || 'standardowy').toLowerCase()}">${this.ticket.suggestedPriority || 'STANDARDOWY'}</span>
                    <span style="color: var(--text-secondary); margin-left: 6px;">${this.ticket.priorityRationale || ''}</span>
                  </div>
                </div>

                <!-- Rekomendowany kolejny krok -->
                <div style="font-size: 12px; border-top: 1px dashed #D9EAD3; padding-top: 8px;">
                  <span style="font-weight: 700; color: var(--brand-green-dark);">Rekomendowane działanie dyspozytora:</span>
                  <div style="margin-top: 2px;">${this.ticket.aiSuggestedAction || this.ticket.aiRecommendedStep || 'Weryfikacja zgłoszenia'}</div>
                </div>
              </div>

              <!-- Kreator wiadomości i komunikacja -->
              <div class="message-composer-card">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-weight: 700; font-size: 13px; color: var(--brand-navy);">Szybkie szablony wiadomości</span>
                  <span style="font-size: 11px; color: var(--text-secondary);">Wybierz szablon, aby wstawić treść:</span>
                </div>

                <!-- Pasek szybkich szablonów -->
                <div class="quick-templates-bar">
                  <button class="template-pill" data-template="confirm">Potwierdzenie przyjęcia</button>
                  <button class="template-pill" data-template="missing">Prośba o uzupełnienie</button>
                  <button class="template-pill" data-template="progress">Informacja o postępach</button>
                  <button class="template-pill" data-template="resolved">Informacja o rozwiązaniu</button>
                  <button class="template-pill" data-template="thanks">Podziękowanie</button>
                  <button class="template-pill" data-template="review">Zaproszenie do opinii Google</button>
                </div>

                <!-- Formularz edytora wiadomości -->
                <div style="display: grid; grid-template-columns: 1fr 140px; gap: 10px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Odbiorca (E-mail / Telefon)</label>
                    <input type="text" class="form-control" id="msg-recipient" 
                           value="${this.ticket.applicantEmail || this.ticket.applicantPhone || ''}" />
                  </div>

                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Kanał kontaktu</label>
                    <select class="form-select" id="msg-channel">
                      <option value="E-mail" ${this.ticket.applicantEmail ? 'selected' : ''}>E-mail</option>
                      <option value="Telefon" ${!this.ticket.applicantEmail && this.ticket.applicantPhone ? 'selected' : ''}>Telefon</option>
                      <option value="Notatka wewnętrzna">Notatka wewnętrzna</option>
                    </select>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Temat wiadomości</label>
                  <input type="text" class="form-control" id="msg-subject" 
                         value="Zgłoszenie ${this.ticket.id} – ELWOZ ECO POK Kartuzy" />
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <div class="form-label">
                    <span>Treść wiadomości do mieszkańca</span>
                    <button class="btn btn-outline btn-xs" id="btn-polish-ai" style="padding: 2px 8px; font-size: 11px;">
                      <i data-lucide="wand-2" style="width: 12px; height: 12px;"></i>
                      <span>✨ Usprawnij styl z AI (CX/PR)</span>
                    </button>
                  </div>
                  <textarea class="form-control" id="msg-content" rows="6" style="font-family: inherit; font-size: 13px;">${this.ticket.aiDraftReply || ''}</textarea>
                </div>

                <div class="ai-refine-banner">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="shield-check" style="width: 15px; height: 15px;"></i>
                    <span>Zasada Human-in-the-Loop: Wiadomość wymaga autoryzacji i zatwierdzenia przez pracownika.</span>
                  </div>
                </div>

                <!-- Przyciski akcji wysyłki -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                  <button class="btn btn-secondary btn-sm" id="btn-log-call">
                    <i data-lucide="phone-call" style="width: 14px; height: 14px;"></i>
                    <span>Odnotuj rozmowę telefoniczną</span>
                  </button>

                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary btn-sm" id="btn-send-message">
                      <i data-lucide="send" style="width: 14px; height: 14px;"></i>
                      <span>Zatwierdź i wyślij wiadomość</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- PANEL PRAWY: STATUS, ZARZĄDZANIE, SLA I KOLEJNY KROK -->
          <div class="detail-panel">
            <div class="detail-panel-header">
              <span>Zarządzanie sprawą & SLA</span>
              <i data-lucide="settings" style="width: 16px; height: 16px; color: var(--brand-navy);"></i>
            </div>
            <div class="detail-panel-body">

              <!-- Karta SLA -->
              <div class="sla-timer-card ${isOverdue ? 'overdue' : 'ok'}">
                <div>
                  <div class="sla-label">Licznik SLA 1. reakcji</div>
                  <div class="sla-value">${slaDisplay}</div>
                </div>
                <i data-lucide="${isOverdue ? 'alert-triangle' : 'shield-check'}" 
                   style="width: 22px; height: 22px; color: ${isOverdue ? 'var(--prio-urgent)' : 'var(--brand-green)'};"></i>
              </div>

              <!-- Status i Priorytet -->
              <div class="form-group">
                <label class="form-label form-label-required">Status sprawy</label>
                <select class="form-select" id="detail-status">
                  <option value="Nowe" ${this.ticket.status === 'Nowe' ? 'selected' : ''}>Nowe</option>
                  <option value="Do weryfikacji" ${this.ticket.status === 'Do weryfikacji' ? 'selected' : ''}>Do weryfikacji</option>
                  <option value="W realizacji" ${this.ticket.status === 'W realizacji' ? 'selected' : ''}>W realizacji</option>
                  <option value="Oczekuje na informacje" ${this.ticket.status === 'Oczekuje na informacje' ? 'selected' : ''}>Oczekuje na informacje</option>
                  <option value="Rozwiązane" ${this.ticket.status === 'Rozwiązane' ? 'selected' : ''}>Rozwiązane</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label form-label-required">Zatwierdzony priorytet</label>
                <select class="form-select" id="detail-priority">
                  <option value="PILNY" ${this.ticket.priority === 'PILNY' ? 'selected' : ''}>PILNY (15 min reakcja / 4h)</option>
                  <option value="WYSOKI" ${this.ticket.priority === 'WYSOKI' ? 'selected' : ''}>WYSOKI (2h reakcja / 24h)</option>
                  <option value="STANDARDOWY" ${this.ticket.priority === 'STANDARDOWY' ? 'selected' : ''}>STANDARDOWY (4h reakcja / 48h)</option>
                  <option value="NISKI" ${this.ticket.priority === 'NISKI' ? 'selected' : ''}>NISKI (24h reakcja / 72h)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label form-label-required">Pracownik odpowiedzialny</label>
                <select class="form-select" id="detail-assignee">
                  <option value="Nieprzypisany">Nieprzypisany</option>
                  ${this.staffList.map(s => `<option value="${s.name}" ${this.ticket.assignee === s.name ? 'selected' : ''}>${s.name} (${s.role})</option>`).join("")}
                </select>
              </div>

              <!-- Kolejny krok (Wymóg operacyjny) -->
              <div class="form-group">
                <label class="form-label form-label-required">Następne działanie (Kolejny krok)</label>
                <input type="text" class="form-control" id="detail-next-action" 
                       value="${this.ticket.nextAction || ''}" 
                       placeholder="np. Weryfikacja zapisu kamer trasy..." />
                ${!this.ticket.nextAction && this.ticket.status !== 'Rozwiązane' ? `
                  <div class="warning-no-step" style="margin-top: 6px;">
                    <i data-lucide="alert-octagon" style="width: 14px; height: 14px; flex-shrink: 0;"></i>
                    <span>Uwaga: Sprawa otwarta bez określonego kolejnego kroku!</span>
                  </div>
                ` : ''}
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="form-group">
                  <label class="form-label">Strona odpowiedzialna</label>
                  <select class="form-select" id="detail-responsible-side">
                    <option value="Przedsiębiorstwo" ${this.ticket.responsibleSide === 'Przedsiębiorstwo' ? 'selected' : ''}>Przedsiębiorstwo</option>
                    <option value="Mieszkaniec" ${this.ticket.responsibleSide === 'Mieszkaniec' ? 'selected' : ''}>Mieszkaniec</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Termin działania</label>
                  <input type="datetime-local" class="form-control" id="detail-next-deadline" 
                         value="${this.ticket.nextActionDeadline ? this.ticket.nextActionDeadline.replace(' ', 'T') : ''}" />
                </div>
              </div>

              <!-- Potwierdzenie sposobu rozwiązania sprawy (wymagane przy zamykaniu) -->
              <div class="form-group" id="resolution-method-group" style="display: ${this.ticket.status === 'Rozwiązane' ? 'block' : 'none'};">
                <label class="form-label form-label-required">Rzeczywisty sposób rozwiązania sprawy</label>
                <textarea class="form-control" id="detail-resolution-method" rows="2" 
                          placeholder="Opisz konkretne działania wykonane przez firmę...">${this.ticket.resolutionMethod || ''}</textarea>
                <span class="form-hint">Zgodnie ze standardem CX, nie wolno zamknąć sprawy bez opisu wykonanych działań.</span>
              </div>

              <!-- Notatka wewnętrzna pracownika -->
              <div class="form-group">
                <label class="form-label">Notatki wewnętrzne (Poufne)</label>
                <textarea class="form-control" id="detail-employee-note" rows="3" 
                          placeholder="Wpisz wewnętrzne ustalenia, nr tachografu, kontakt z dyspozytornią...">${this.ticket.employeeNote || ''}</textarea>
              </div>

              <!-- Przycisk zapisu zmian -->
              <button class="btn btn-navy btn-sm" id="btn-save-ticket-details" style="width: 100%; margin-top: 8px;">
                <i data-lucide="save" style="width: 15px; height: 15px;"></i>
                <span>Zapisz zmiany w sprawie</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    this.bindEvents(prevTicket, nextTicket);

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }
  }

  renderMiniComms() {
    if (!this.communications || this.communications.length === 0) {
      return `<div style="font-size: 11px; color: var(--text-muted); font-style: italic;">Brak zarejestrowanej korespondencji.</div>`;
    }

    return this.communications.map(c => `
      <div style="background-color: var(--bg-muted); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 8px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; font-weight: 600; color: var(--brand-navy);">
          <span>${c.actionType} (${c.channel})</span>
          <span style="font-weight: normal; color: var(--text-secondary);">${c.timestamp.substring(11, 16)}</span>
        </div>
        <div style="color: var(--text-secondary); margin-top: 2px;">Odbiorca: ${c.recipient} • Przez: ${c.author}</div>
      </div>
    `).join("");
  }

  bindEvents(prevTicket, nextTicket) {
    const backBtn = this.container.querySelector("#btn-detail-back");
    if (backBtn) backBtn.onclick = () => this.router.navigate("tickets");

    const prevBtn = this.container.querySelector("#btn-prev-ticket");
    if (prevBtn && prevTicket) prevBtn.onclick = () => this.router.navigate("detail", { id: prevTicket.id });

    const nextBtn = this.container.querySelector("#btn-next-ticket");
    if (nextBtn && nextTicket) nextBtn.onclick = () => this.router.navigate("detail", { id: nextTicket.id });

    // Zmiana statusu dynamicznie pokazuje pole rozwiązania
    const statusSelect = this.container.querySelector("#detail-status");
    const resMethodGroup = this.container.querySelector("#resolution-method-group");
    statusSelect.onchange = () => {
      if (statusSelect.value === "Rozwiązane") {
        resMethodGroup.style.display = "block";
      } else {
        resMethodGroup.style.display = "none";
      }
    };

    // Szablony wiadomości
    const templates = {
      confirm: `Dzień dobry,\n\nDziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach.\nPotwierdzamy zarejestrowanie zgłoszenia nr ${this.ticket.id} dotyczącego: ${this.ticket.type} (${this.ticket.fraction}) pod adresem: ${this.ticket.city}, ul. ${this.ticket.street} ${this.ticket.houseNumber || ''}.\n\nSprawa została przekazana do dyspozytorni w celu weryfikacji. O dalszych krokach poinformujemy w kolejnej wiadomości.\n\nZ poważaniem,\n${this.state.currentUser ? this.state.currentUser.name : 'Anna Nowak'}\nPunkt Obsługi Klienta Kartuzy\nELWOZ ECO Sp. z o.o.\ntel. 58 681 22 99 | kontakt@example.com`,
      missing: `Dzień dobry,\n\nDziękujemy za kontakt z POK Kartuzy w sprawie zgłoszenia nr ${this.ticket.id}.\n\nAbyśmy mogli skierować załogę bezpośrednio pod Państwa nieruchomość i szybko zrealizować usługę, uprzejmie prosimy o doprecyzowanie brakujących danych:\n- ${this.ticket.aiMissingInfo && this.ticket.aiMissingInfo !== 'Brak braków' ? this.ticket.aiMissingInfo : 'dokładny numer posesji / frakcja odpadów'}\n\nOdpowiedź można przesłać zwrotnie na tę wiadomość lub przekazać telefonicznie pod numerem 58 681 22 99.\n\nZ poważaniem,\n${this.state.currentUser ? this.state.currentUser.name : 'Anna Nowak'}\nPOK Kartuzy`,
      progress: `Dzień dobry,\n\nInformujemy o postępach w obsłudze zgłoszenia nr ${this.ticket.id}.\nPodjęto następujące działania: zweryfikowano trasę brygady oraz zaplanowano realizację zadania (${this.ticket.nextAction || 'podjazd pojazdu interwencyjnego'}).\n\nPrzewidywany termin realizacji: ${this.ticket.nextActionDeadline || 'w najbliższy dzień roboczy'}.\n\nZ poważaniem,\nZespół POK Kartuzy`,
      resolved: `Dzień dobry,\n\nInformujemy, że zgłoszenie nr ${this.ticket.id} dotyczące adresu ${this.ticket.city}, ul. ${this.ticket.street} ${this.ticket.houseNumber || ''} zostało pomyślnie zrealizowane.\n\nWykonane działania: ${this.ticket.resolutionMethod || 'Zrealizowano odbiór odpadów przez brygadę interwencyjną.'}\n\nDziękujemy za wyrozumiałość i współpracę.\n\nZ poważaniem,\n${this.state.currentUser ? this.state.currentUser.name : 'Anna Nowak'}\nELWOZ ECO Sp. z o.o.`,
      thanks: `Dzień dobry,\n\nSerdecznie dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach oraz za przekazane miłe słowa uznania dla naszej pracy.\n\nPaństwa opinia została przekazana pracownikom oraz kierownictwu bazy w Kartuzach. Takie sygnały są dla całego zespołu ogromną motywacją do codziennej rzetelnej pracy na rzecz czystości naszego regionu.\n\nZ poważaniem,\n${this.state.currentUser ? this.state.currentUser.name : 'Anna Nowak'}\nPOK Kartuzy`,
      review: `Dzień dobry,\n\nDziękujemy za współpracę z ELWOZ ECO w ramach obsługi zgłoszenia nr ${this.ticket.id}.\n\nNieustannie dbamy o najwyższy standard obsługi mieszkańców rejonu Kartuz i okolic. Będziemy niezwykle wdzięczni za podzielenie się swoją opinią w wizytówce Google:\nhttps://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA\n\nKażda szczera recenzja pomaga nam lepiej dopasować usługi do potrzeb mieszkańców.\n\nZ poważaniem,\nZespół Obsługi Klienta ELWOZ ECO`
    };

    const templatePills = this.container.querySelectorAll(".template-pill");
    templatePills.forEach(pill => {
      pill.onclick = () => {
        const key = pill.getAttribute("data-template");
        if (templates[key]) {
          this.container.querySelector("#msg-content").value = templates[key];
          if (key === "review") {
            this.container.querySelector("#msg-subject").value = `Podziel się swoją opinią o obsłudze zgłoszenia ${this.ticket.id} – ELWOZ ECO`;
          } else if (key === "resolved") {
            this.container.querySelector("#msg-subject").value = `Informacja o rozwiązaniu zgłoszenia ${this.ticket.id} – POK Kartuzy`;
          } else if (key === "confirm") {
            this.container.querySelector("#msg-subject").value = `Potwierdzenie przyjęcia zgłoszenia ${this.ticket.id} – POK Kartuzy`;
          }
        }
      };
    });

    // Przycisk Usprawnij z AI
    const polishBtn = this.container.querySelector("#btn-polish-ai");
    polishBtn.onclick = async () => {
      const contentEl = this.container.querySelector("#msg-content");
      const rawText = contentEl.value;
      if (!rawText.trim()) {
        import("../components/toast.js").then(({ Toast }) => Toast.warning("Wpisz treść wiadomości przed usprawnieniem."));
        return;
      }

      polishBtn.disabled = true;
      polishBtn.innerHTML = `<span>⏳ AI analizuje i poprawia styl...</span>`;

      try {
        const polished = await this.dataProvider.polishMessageWithAi(rawText, { ticket: this.ticket });
        contentEl.value = polished;
        import("../components/toast.js").then(({ Toast }) => {
          Toast.success("AI poprawiło styl wiadomości zgodnie ze standardami CX/PR.");
        });
      } catch (err) {
        import("../components/toast.js").then(({ Toast }) => {
          Toast.error(err.message || "Błąd stylizacji AI.");
        });
      } finally {
        polishBtn.disabled = false;
        polishBtn.innerHTML = `
          <i data-lucide="wand-2" style="width: 12px; height: 12px;"></i>
          <span>✨ Usprawnij styl z AI (CX/PR)</span>
        `;
        if (window.lucide) window.lucide.createIcons({ root: polishBtn });
      }
    };

    // Wysłanie wiadomości
    const sendBtn = this.container.querySelector("#btn-send-message");
    sendBtn.onclick = async () => {
      const recipient = this.container.querySelector("#msg-recipient").value.trim();
      const channel = this.container.querySelector("#msg-channel").value;
      const subject = this.container.querySelector("#msg-subject").value.trim();
      const content = this.container.querySelector("#msg-content").value.trim();

      if (!recipient) {
        import("../components/toast.js").then(({ Toast }) => Toast.warning("Wprowadź adresata wiadomości."));
        return;
      }
      if (!content) {
        import("../components/toast.js").then(({ Toast }) => Toast.warning("Treść wiadomości nie może być pusta."));
        return;
      }

      // Strażnik wysyłki (wymóg z testy.md): sprawdzenie czy to nie próba wysłania bez zgody
      const commData = {
        ticketId: this.ticket.id,
        recipient,
        channel,
        subject,
        content,
        author: this.state.currentUser ? this.state.currentUser.name : "Anna Nowak",
        actionType: subject.includes("Potwierdzenie") ? "Potwierdzenie przyjęcia" : (subject.includes("opini") ? "Zaproszenie do opinii Google" : (subject.includes("rozwiązani") ? "Informacja o rozwiązaniu" : "Odpowiedź do mieszkańca")),
        status: "Wysłano"
      };

      await this.dataProvider.addCommunication(commData);
      import("../components/toast.js").then(({ Toast }) => {
        Toast.success(`[SYMULACJA] Wysłano wiadomość do: ${recipient}`);
      });

      // Odśwież widok
      this.render({ id: this.ticket.id });
    };

    // Odnotowanie telefonu
    const logCallBtn = this.container.querySelector("#btn-log-call");
    logCallBtn.onclick = () => {
      import("../components/modal.js").then(({ Modal }) => {
        const modal = new Modal({
          title: "Odnotuj rozmowę telefoniczną z mieszkańcem",
          size: "md",
          content: `
            <div class="form-group">
              <label class="form-label form-label-required">Numer telefonu rozmówcy</label>
              <input type="text" class="form-control" id="call-phone" value="${this.ticket.applicantPhone || ''}" placeholder="+48..." />
            </div>
            <div class="form-group">
              <label class="form-label form-label-required">Wynik rozmowy</label>
              <select class="form-select" id="call-result">
                <option value="Potwierdzono szczegóły sprawy i termin">Potwierdzono szczegóły sprawy i termin</option>
                <option value="Uzyskano brakujący numer posesji">Uzyskano brakujący numer posesji</option>
                <option value="Mieszkaniec poinformowany o rozwiązaniu">Mieszkaniec poinformowany o rozwiązaniu</option>
                <option value="Nie odebrano – wysłano SMS">Nie odebrano – wysłano SMS</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label form-label-required">Notatka z przebiegu rozmowy</label>
              <textarea class="form-control" id="call-notes" rows="4" placeholder="Wpisz kluczowe ustalenia z mieszkańcem..."></textarea>
            </div>
          `,
          footer: `
            <button class="btn btn-secondary btn-sm" id="btn-call-cancel">Anuluj</button>
            <button class="btn btn-primary btn-sm" id="btn-call-save">Zapisz rozmowę w historii</button>
          `
        });

        modal.element.querySelector("#btn-call-cancel").onclick = () => modal.close();
        modal.element.querySelector("#btn-call-save").onclick = async () => {
          const phone = modal.element.querySelector("#call-phone").value.trim();
          const result = modal.element.querySelector("#call-result").value;
          const notes = modal.element.querySelector("#call-notes").value.trim();

          if (!notes) {
            import("../components/toast.js").then(({ Toast }) => Toast.warning("Wpisz notatkę z rozmowy."));
            return;
          }

          const commData = {
            ticketId: this.ticket.id,
            recipient: phone || "Mieszkaniec",
            channel: "Telefon",
            subject: `Rozmowa telefoniczna – ${result}`,
            content: `Wynik: ${result}\nNotatka: ${notes}`,
            author: this.state.currentUser ? this.state.currentUser.name : "Anna Nowak",
            actionType: "Rozmowa telefoniczna",
            status: "Odnotowano"
          };

          await this.dataProvider.addCommunication(commData);
          await this.dataProvider.updateTicket(this.ticket.id, {
            contactResult: result
          });

          modal.close();
          import("../components/toast.js").then(({ Toast }) => {
            Toast.success("Odnotowano rozmowę telefoniczną w historii sprawy.");
          });
          this.render({ id: this.ticket.id });
        };

        modal.open();
      });
    };

    // Zapis zmian w prawym panelu
    const saveBtn = this.container.querySelector("#btn-save-ticket-details");
    saveBtn.onclick = async () => {
      const newStatus = this.container.querySelector("#detail-status").value;
      const newPriority = this.container.querySelector("#detail-priority").value;
      const newAssignee = this.container.querySelector("#detail-assignee").value;
      const newNextAction = this.container.querySelector("#detail-next-action").value.trim();
      const newSide = this.container.querySelector("#detail-responsible-side").value;
      const newDeadlineRaw = this.container.querySelector("#detail-next-deadline").value;
      const newDeadline = newDeadlineRaw ? newDeadlineRaw.replace("T", " ") : "";
      const newNote = this.container.querySelector("#detail-employee-note").value.trim();
      const resolutionMethod = this.container.querySelector("#detail-resolution-method").value.trim();

      // Walidacja zamykania zgłoszenia (wymóg z promptu i testy.md TEST-07)
      if (newStatus === "Rozwiązane" && !resolutionMethod) {
        import("../components/toast.js").then(({ Toast }) => {
          Toast.error("Błąd: Przed oznaczeniem sprawy jako rozwiązana musisz wpisać rzeczywisty sposób rozwiązania sprawy.");
        });
        this.container.querySelector("#detail-resolution-method").focus();
        return;
      }

      // Ostrzeżenie przy braku kolejnego kroku w otwartej sprawie
      if (newStatus !== "Rozwiązane" && !newNextAction) {
        import("../components/toast.js").then(({ Toast }) => {
          Toast.warning("Uwaga: Sprawa otwarta bez określonego kolejnego kroku!");
        });
      }

      const updates = {
        status: newStatus,
        priority: newPriority,
        assignee: newAssignee,
        nextAction: newNextAction,
        responsibleSide: newSide,
        nextActionDeadline: newDeadline,
        employeeNote: newNote
      };

      if (newStatus === "Rozwiązane") {
        updates.resolutionMethod = resolutionMethod;
      }

      await this.dataProvider.updateTicket(this.ticket.id, updates);
      import("../components/toast.js").then(({ Toast }) => {
        Toast.success(`Pomyślnie zaktualizowano sprawę ${this.ticket.id}.`);
      });

      this.render({ id: this.ticket.id });
    };
  }
}
