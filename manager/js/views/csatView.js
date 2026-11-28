import { escapeHtml } from "../components/escapeHtml.js";

/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * CSAT View (Satysfakcja mieszkańców i reputacja Google)
 */

export class CsatView {
  constructor(container, router, dataProvider, state) {
    this.container = container;
    this.router = router;
    this.dataProvider = dataProvider;
    this.state = state;
  }

  async render() {
    this.container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1 class="view-title">Satysfakcja mieszkańców & Reputacja</h1>
          <div class="view-description">Wskaźniki CSAT, opinie mieszkańców i etyczny moduł zaproszeń do Google Reviews</div>
        </div>
      </div>

      <!-- Kafelki wskaźników CSAT -->
      <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;" id="csat-kpi-grid">
        <div class="kpi-card kpi-success">
          <div class="kpi-header">
            <span class="kpi-title">Średnia ocena satysfakcji</span>
            <i data-lucide="star" class="kpi-icon"></i>
          </div>
          <div class="kpi-value-row">
            <div class="kpi-value" id="csat-avg-val">-</div>
          </div>
          <div class="kpi-hint">Skala ocen od 1 do 5 gwiazdek</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Zebrane ankiety / oceny</span>
            <i data-lucide="message-square" class="kpi-icon"></i>
          </div>
          <div class="kpi-value-row">
            <div class="kpi-value" id="csat-count-val">0</div>
          </div>
          <div class="kpi-hint">Liczba unikalnych odpowiedzi</div>
        </div>

        <div class="kpi-card kpi-warning">
          <div class="kpi-header">
            <span class="kpi-title">Wymagające ponownego kontaktu</span>
            <i data-lucide="alert-triangle" class="kpi-icon"></i>
          </div>
          <div class="kpi-value-row">
            <div class="kpi-value" id="csat-low-count-val">0</div>
          </div>
          <div class="kpi-hint">Oceny 1–2 ★ (Niezadowolenie)</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Wysłane zaproszenia Google</span>
            <i data-lucide="share-2" class="kpi-icon"></i>
          </div>
          <div class="kpi-value-row">
            <div class="kpi-value" id="csat-reviews-count-val">0</div>
          </div>
          <div class="kpi-hint">Neutralne linki do wizytówki POK</div>
        </div>
      </div>

      <!-- Etyka Google Reviews Banner -->
      <div class="card" style="margin-bottom: 20px; border-left: 4px solid var(--brand-green); background-color: #F8FBF6;">
        <div class="card-body" style="padding: 14px 18px;">
          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <i data-lucide="shield-check" style="width: 24px; height: 24px; color: var(--brand-green); flex-shrink: 0; margin-top: 2px;"></i>
            <div>
              <div style="font-weight: 700; font-size: 14px; color: var(--brand-green-dark); margin-bottom: 4px;">
                Standard etyczny Google Reviews w ELWOZ ECO SmartCare
              </div>
              <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5;">
                Zgodnie z regulacjami prawnymi i polityką Google: zaproszenia do wystawienia opinii są <strong>bezwzględnie neutralne</strong> (nie sugerują liczby gwiazdek, nie obiecują nagród ani korzyści materialnych, nie filtrują niezadowolonych klientów i nie publikują fikcyjnych opinii).
              </div>
              <div style="margin-top: 8px;">
                <a href="https://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA" 
                   target="_blank" rel="noopener noreferrer" 
                   class="btn btn-outline btn-xs" style="text-decoration: none;">
                  <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
                  <span>Zweryfikowany link wizytówki POK Kartuzy</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dwie kolumny: Rozkład ocen i Pilny ponowny kontakt -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <!-- Rozkład ocen -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="bar-chart-2" style="width: 16px; height: 16px;"></i>
              <span>Rozkład ocen od 1 do 5 gwiazdek</span>
            </div>
          </div>
          <div class="card-body" id="csat-bars-body">
            <!-- Paski rozkładu -->
          </div>
        </div>

        <!-- Sprawy wymagające ponownego kontaktu -->
        <div class="card" style="border-color: var(--prio-urgent-border);">
          <div class="card-header" style="background-color: var(--prio-urgent-bg);">
            <div class="card-title" style="color: var(--prio-urgent);">
              <i data-lucide="alert-circle" style="width: 16px; height: 16px;"></i>
              <span>Sprawy z niską oceną (Wymagające ponownego kontaktu)</span>
            </div>
          </div>
          <div class="card-body" id="low-csat-list" style="padding: 12px; max-height: 280px; overflow-y: auto;">
            <!-- Lista spraw z ocenami 1-2 -->
          </div>
        </div>
      </div>

      <!-- Tabela zebranych opinii i komentarzy -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <i data-lucide="message-circle" style="width: 16px; height: 16px;"></i>
            <span>Rejestr komentarzy i uwag mieszkańców</span>
          </div>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID Zgłoszenia</th>
                <th>Miejscowość</th>
                <th>Kategoria</th>
                <th>Ocena</th>
                <th>Komentarz mieszkańca</th>
                <th>Opinia Google</th>
                <th>Data rozwiązania</th>
                <th style="text-align: right;">Akcja</th>
              </tr>
            </thead>
            <tbody id="csat-comments-tbody">
              <tr><td colspan="8" style="text-align: center; padding: 20px;">Ładowanie opinii...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.loadCsatData();

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }
  }

  async loadCsatData() {
    const stats = await this.dataProvider.getStats("all");
    const tickets = await this.dataProvider.getTickets();

    // Uzupełnienie kafelków KPI
    const avgEl = this.container.querySelector("#csat-avg-val");
    if (avgEl) avgEl.textContent = stats.avgSatisfactionFormatted !== "-" ? `${stats.avgSatisfactionFormatted} ★` : "-";

    const countEl = this.container.querySelector("#csat-count-val");
    if (countEl) countEl.textContent = stats.feedbackCount;

    const lowRatedTickets = tickets.filter(t => t.satisfactionScore != null && t.satisfactionScore <= 2);
    const lowCountEl = this.container.querySelector("#csat-low-count-val");
    if (lowCountEl) lowCountEl.textContent = lowRatedTickets.length;

    const revCountEl = this.container.querySelector("#csat-reviews-count-val");
    if (revCountEl) revCountEl.textContent = stats.reviewInvitesCount;

    // Paski rozkładu ocen
    const barsContainer = this.container.querySelector("#csat-bars-body");
    const totalRated = stats.feedbackCount || 1;
    const scores = [5, 4, 3, 2, 1];

    barsContainer.innerHTML = scores.map(star => {
      const count = stats.csatDistribution[star] || 0;
      const pct = Math.round((count / totalRated) * 100);
      let barColor = "var(--brand-green)";
      if (star === 3) barColor = "#FBBF24";
      if (star <= 2) barColor = "var(--prio-urgent)";

      return `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px; font-size: 13px;">
          <div style="width: 70px; font-weight: 600;">${star} ★ (${escapeHtml(count)})</div>
          <div style="flex: 1; height: 16px; background-color: var(--bg-muted); border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color);">
            <div style="width: ${pct}%; height: 100%; background-color: ${barColor}; transition: width 0.3s ease;"></div>
          </div>
          <div style="width: 45px; text-align: right; color: var(--text-secondary); font-size: 12px;">${pct}%</div>
        </div>
      `;
    }).join("");

    // Lista niskich ocen
    const lowListContainer = this.container.querySelector("#low-csat-list");
    if (lowRatedTickets.length === 0) {
      lowListContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Brak spraw z niską oceną.</div>`;
    } else {
      lowListContainer.innerHTML = lowRatedTickets.map(t => `
        <div style="background-color: #FFFFFF; border: 1px solid var(--prio-urgent-border); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <a href="#" class="table-ticket-id link-ticket" data-ticket-id="${escapeHtml(t.id)}">${escapeHtml(t.id)}</a>
            <span class="badge badge-prio-pilny">${escapeHtml(t.satisfactionScore)} ★</span>
          </div>
          <div style="font-size: 12px; color: var(--text-primary); margin: 4px 0; font-style: italic;">
            "${escapeHtml(t.citizenFeedback || 'Brak komentarza tekstowego')}"
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
            <span style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(t.applicantName)} (${escapeHtml(t.city)})</span>
            <button class="btn btn-navy btn-xs btn-open-ticket" data-ticket-id="${escapeHtml(t.id)}">Obsłuż sprawę</button>
          </div>
        </div>
      `).join("");
    }

    // Tabela opinii
    const ratedTickets = tickets.filter(t => t.satisfactionScore != null);
    const tbody = this.container.querySelector("#csat-comments-tbody");
    if (ratedTickets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Brak zarejestrowanych ocen.</td></tr>`;
      return;
    }

    tbody.innerHTML = ratedTickets.map(t => `
      <tr>
        <td class="table-ticket-id">${escapeHtml(t.id)}</td>
        <td>${escapeHtml(t.city)}</td>
        <td>${escapeHtml(t.type)}</td>
        <td>
          <span class="badge ${t.satisfactionScore >= 4 ? 'badge-status-rozwiazane' : (t.satisfactionScore === 3 ? 'badge-status-do-weryfikacji' : 'badge-prio-pilny')}">
            ${escapeHtml(t.satisfactionScore)} ★
          </span>
        </td>
        <td style="max-width: 320px; font-size: 12px; color: var(--text-primary);">
          ${t.citizenFeedback ? `„${escapeHtml(t.citizenFeedback)}”` : '<span style="color: var(--text-muted); font-style: italic;">(Brak uwag tekstowych)</span>'}
        </td>
        <td>
          ${t.reviewInviteSent === 'TAK' 
            ? '<span class="badge badge-status-rozwiazane">Wysłano zaproszenie</span>' 
            : '<span style="font-size: 11px; color: var(--text-secondary);">Nie wysłano</span>'}
        </td>
        <td style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(t.resolvedDate || '-')}</td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-xs btn-open-ticket" data-ticket-id="${escapeHtml(t.id)}">Szczegóły</button>
        </td>
      </tr>
    `).join("");

    this.container.querySelectorAll(".btn-open-ticket, .link-ticket").forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const tid = btn.getAttribute("data-ticket-id");
        this.router.navigate("detail", { id: tid });
      };
    });
  }
}
