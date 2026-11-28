import { escapeHtml } from "../components/escapeHtml.js";

/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Settings View (Ustawienia systemu i konfiguracja POK)
 */

export class SettingsView {
  constructor(container, router, dataProvider, state) {
    this.container = container;
    this.router = router;
    this.dataProvider = dataProvider;
    this.state = state;
    this.settings = null;
    this.staffList = [];
  }

  async render() {
    this.settings = await this.dataProvider.getSettings();
    this.staffList = await this.dataProvider.getStaff();

    this.container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1 class="view-title">Ustawienia systemu</h1>
          <div class="view-description">Parametry operacyjne POK Kartuzy, progi SLA, konfiguracja personelu i asystenta AI</div>
        </div>
        <div class="view-actions">
          ${this.state.mode !== 'connected' ? `
          <button class="btn btn-danger btn-sm" id="btn-reset-demo-factory">
            <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
            <span>Przywróć dane fabryczne demo</span>
          </button>
          ` : `
          <span class="badge badge-ai-przeanalizowano" style="padding: 6px 12px; font-size: 12px;">
            Połączono z CRM (Google Sheets)
          </span>
          `}
        </div>
      </div>

      <!-- Karta Dual Mode Architecture -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <div class="card-title">
            <i data-lucide="network" style="width: 16px; height: 16px;"></i>
            <span>Tryb działania aplikacji (Dual Mode Architecture)</span>
          </div>
          <span class="badge ${this.state.mode === 'connected' ? 'badge-ai-przeanalizowano' : 'badge-prio-wysoki'}">
            ${this.state.mode === 'connected' ? 'CONNECTED (Google Sheets CRM)' : 'DEMO (30 syntetycznych zgłoszeń)'}
          </span>
        </div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px; align-items: end;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Aktywny tryb danych</label>
              <select class="form-select" id="set-app-mode">
                <option value="demo" ${this.state.mode !== 'connected' ? 'selected' : ''}>Tryb DEMO (Syntetyczny symulator)</option>
                <option value="connected" ${this.state.mode === 'connected' ? 'selected' : ''}>Tryb CONNECTED (Rzeczywisty CRM Google Sheets)</option>
              </select>
            </div>
            <div class="form-group" id="group-gas-endpoint" style="margin-bottom: 0; display: ${this.state.mode === 'connected' ? 'block' : 'none'};">
              <label class="form-label">Adres URL Web App Google Apps Script (Wariant B)</label>
              <input type="url" class="form-control" id="set-gas-endpoint" value="${escapeHtml(typeof localStorage !== 'undefined' ? (localStorage.getItem('smartcare_gas_endpoint') || '') : '')}" placeholder="https://script.google.com/macros/s/.../exec" />
              <span class="form-hint">W środowisku Web App (Wariant A) aplikacja korzysta bezpośrednio z google.script.run.</span>
            </div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        
        <!-- Kolumna lewa: Personel POK i Godziny pracy -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Personel -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">
                <i data-lucide="users" style="width: 16px; height: 16px;"></i>
                <span>Personel biura obsługi (POK Kartuzy)</span>
              </div>
              <button class="btn btn-secondary btn-xs" id="btn-add-staff">
                <i data-lucide="user-plus" style="width: 13px; height: 13px;"></i>
                <span>Dodaj pracownika</span>
              </button>
            </div>
            <div class="table-container" style="border: none; border-radius: 0;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Imię i nazwisko</th>
                    <th>Rola / Stanowisko</th>
                    <th>Adres e-mail</th>
                    <th style="text-align: right;">Status</th>
                  </tr>
                </thead>
                <tbody id="settings-staff-tbody">
                  ${this.staffList.map(s => `
                    <tr>
                      <td style="font-weight: 600;">${escapeHtml(s.name)}</td>
                      <td style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(s.role)}</td>
                      <td style="font-size: 12px;">${escapeHtml(s.email)}</td>
                      <td style="text-align: right;">
                        <span class="badge badge-ai-przeanalizowano">Aktywny</span>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Dane kontaktowe i godziny pracy -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">
                <i data-lucide="building" style="width: 16px; height: 16px;"></i>
                <span>Dane adresowe i godziny pracy</span>
              </div>
            </div>
            <div class="card-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Nazwa przedsiębiorstwa</label>
                  <input type="text" class="form-control" id="set-company" value="${escapeHtml(this.settings.companyName)}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Oddział / POK</label>
                  <input type="text" class="form-control" id="set-branch" value="${escapeHtml(this.settings.branch)}" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Oficjalny e-mail POK</label>
                  <input type="email" class="form-control" id="set-email" value="${escapeHtml(this.settings.email)}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Infolinia / Telefon</label>
                  <input type="text" class="form-control" id="set-phone" value="${escapeHtml(this.settings.phone)}" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Godziny pracy dyspozytorni</label>
                <input type="text" class="form-control" id="set-hours" value="${escapeHtml(this.settings.workingHours)}" />
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Zweryfikowany link opinii Google</label>
                <input type="url" class="form-control" id="set-google-url" value="${escapeHtml(this.settings.googleReviewUrl)}" />
                <span class="form-hint">Docelowy link przekazywany w neutralnych zaproszeniach.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Kolumna prawa: Progi SLA i Asystent AI -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Progi SLA -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">
                <i data-lucide="clock" style="width: 16px; height: 16px;"></i>
                <span>Progi czasowe SLA (Customer Service Intelligence)</span>
              </div>
            </div>
            <div class="card-body">
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: grid; grid-template-columns: 140px 1fr 1fr; gap: 10px; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--border-light);">
                  <span class="badge badge-prio-pilny">PILNY</span>
                  <div style="font-size: 12px;">Reakcja: <strong>15 minut</strong></div>
                  <div style="font-size: 12px;">Rozwiązanie: <strong>4 godziny</strong></div>
                </div>

                <div style="display: grid; grid-template-columns: 140px 1fr 1fr; gap: 10px; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--border-light);">
                  <span class="badge badge-prio-wysoki">WYSOKI</span>
                  <div style="font-size: 12px;">Reakcja: <strong>2 godziny</strong></div>
                  <div style="font-size: 12px;">Rozwiązanie: <strong>24 godziny</strong></div>
                </div>

                <div style="display: grid; grid-template-columns: 140px 1fr 1fr; gap: 10px; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--border-light);">
                  <span class="badge badge-prio-standardowy">STANDARDOWY</span>
                  <div style="font-size: 12px;">Reakcja: <strong>4 godziny</strong></div>
                  <div style="font-size: 12px;">Rozwiązanie: <strong>48 godzin</strong></div>
                </div>

                <div style="display: grid; grid-template-columns: 140px 1fr 1fr; gap: 10px; align-items: center;">
                  <span class="badge badge-prio-niski">NISKI</span>
                  <div style="font-size: 12px;">Reakcja: <strong>24 godziny</strong></div>
                  <div style="font-size: 12px;">Rozwiązanie: <strong>72 godziny</strong></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Konfiguracja Asystenta AI i Architektura Multi-Provider -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">
                <i data-lucide="sparkles" style="width: 16px; height: 16px; color: var(--brand-green);"></i>
                <span>Konfiguracja sztucznej inteligencji (AI Multi-Provider)</span>
              </div>
              <span class="badge badge-ai-przeanalizowano" style="font-size: 10px;">Symulacja lokalna v0.3.0</span>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Dostawca sztucznej inteligencji (AI Provider)</label>
                <select class="form-select" id="set-ai-provider">
                  <option value="gemini" selected>Google Gemini (Aktywny dostawca v0.3.0 backend)</option>
                  <option value="openai" disabled>OpenAI ChatGPT (Planowana integracja v0.4.0)</option>
                  <option value="claude" disabled>Anthropic Claude (Planowana integracja v0.4.0)</option>
                </select>
                <span class="form-hint">Docelowa architektura umożliwia wybór dostawcy przez administratora. Obecnie aktywny: Google Gemini.</span>
              </div>

              <div class="form-group">
                <label class="form-label">Aktywny model językowy (Backend Google Apps Script)</label>
                <input type="text" class="form-control" value="gemini-2.5-flash / gemini-1.5-flash (Zweryfikowany w ScriptProperties)" disabled />
                <span class="form-hint">Model pobierany dynamicznie z konfiguracji backendu. Aplikacja frontendowa nie wpisuje nazw na sztywno.</span>
              </div>

              <div class="form-group">
                <label class="form-label">Centralne zarządzanie kluczem API</label>
                <input type="password" class="form-control" value="••••••••••••••••••••••••••••••••" disabled />
                <span class="form-hint">Zarządzany centralnie przez administratora w ScriptProperties backendu. Niedostępny w przeglądarce.</span>
              </div>

              <div class="form-group" style="margin-bottom: 12px;">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                  <input type="checkbox" id="set-allow-employee-keys" ${this.settings.allowEmployeeApiKeys ? 'checked' : ''} ${this.state.mode === 'connected' ? 'disabled' : ''} />
                  <span>Zezwalaj pracownikom na indywidualny klucz API (jeżeli administrator zezwoli)</span>
                </label>
                <span class="form-hint" style="margin-left: 22px;">Umożliwia zaawansowanym pracownikom użycie własnego klucza sesyjnego bez ujawniania go w localStorage.</span>
              </div>

              <div style="padding: 10px 12px; background-color: #FEF0C7; border: 1px solid #FEDF89; border-radius: var(--radius-sm); font-size: 12px; line-height: 1.45; color: #B54708; margin-bottom: 10px;">
                <i data-lucide="alert-circle" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>
                <strong>Ważna uwaga:</strong> Abonament konsumencki ChatGPT Plus lub Gemini Advanced <u>nie zapewnia</u> dostępu do API. Dostęp wymaga konta w Google AI Studio lub OpenAI Platform i rozliczenia per-token.
              </div>

              <div style="padding: 10px 12px; background-color: var(--brand-green-light); border: 1px solid var(--prio-low-border); border-radius: var(--radius-sm); font-size: 12px; line-height: 1.45; color: var(--brand-green-dark);">
                <i data-lucide="shield-check" style="width: 15px; height: 15px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>
                <strong>Polityka bezpieczeństwa:</strong> Klucze API nie są przechowywane w localStorage, ciasteczkach ani publicznym kodzie. W trybie demo działanie AI jest symulowane lokalnie przez DemoDataProvider.
              </div>

              <button class="btn btn-navy btn-sm" id="btn-save-settings" style="margin-top: 16px; width: 100%;">
                <i data-lucide="save" style="width: 14px; height: 14px;"></i>
                <span>Zapisz ustawienia</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }
  }

  bindEvents() {
    const modeSelect = this.container.querySelector("#set-app-mode");
    const endpointInput = this.container.querySelector("#set-gas-endpoint");
    const endpointGroup = this.container.querySelector("#group-gas-endpoint");

    if (modeSelect) {
      modeSelect.onchange = () => {
        const selected = modeSelect.value;
        if (endpointGroup) endpointGroup.style.display = selected === "connected" ? "block" : "none";
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("smartcare_mode", selected);
        }
        import("../components/toast.js").then(({ Toast }) => {
          Toast.info(`Zmieniono tryb na: ${selected === 'connected' ? 'CONNECTED' : 'DEMO'}. Przeładowywanie...`);
        });
        setTimeout(() => {
          if (typeof window !== "undefined") window.location.reload();
        }, 800);
      };
    }

    if (endpointInput) {
      endpointInput.onchange = () => {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("smartcare_gas_endpoint", endpointInput.value.trim());
        }
      };
    }

    const resetBtn = this.container.querySelector("#btn-reset-demo-factory");
    if (resetBtn) {
      resetBtn.onclick = () => {
        import("../components/modal.js").then(({ Modal }) => {
          Modal.confirm(
            "Czy na pewno chcesz przywrócić fabryczny zbiór danych demonstracyjnych?<br><br>Wszystkie lokalne zmiany, dodane zgłoszenia i edycje zostaną cofnięte do stanu początkowego (30 zweryfikowanych zgłoszeń testowych).",
            async () => {
              await this.dataProvider.resetDemoData();
              import("../components/toast.js").then(({ Toast }) => {
                Toast.success("Przywrócono fabryczny zbiór danych demonstracyjnych.");
              });
              this.router.navigate("dashboard");
            },
            "Przywracanie danych demonstracyjnych",
            "Przywróć dane",
            "Anuluj",
            true
          );
        });
      };
    }

    const saveBtn = this.container.querySelector("#btn-save-settings");
    saveBtn.onclick = async () => {
      const allowKeysEl = this.container.querySelector("#set-allow-employee-keys");
      const updatedSettings = {
        ...(this.state.mode === 'connected' ? {} : this.settings),
        companyName: this.container.querySelector("#set-company").value.trim(),
        branch: this.container.querySelector("#set-branch").value.trim(),
        email: this.container.querySelector("#set-email").value.trim(),
        phone: this.container.querySelector("#set-phone").value.trim(),
        workingHours: this.container.querySelector("#set-hours").value.trim(),
        googleReviewUrl: this.container.querySelector("#set-google-url").value.trim(),
        ...(this.state.mode === 'connected' ? {} : { allowEmployeeApiKeys: allowKeysEl ? allowKeysEl.checked : false })
      };

      saveBtn.disabled = true;
      try {
        await this.dataProvider.updateSettings(updatedSettings);
        this.settings = await this.dataProvider.getSettings();
        import("../components/toast.js").then(({ Toast }) => Toast.success("Zapisano ustawienia systemowe."));
      } catch (error) {
        import("../components/toast.js").then(({ Toast }) => Toast.error(error.message || "Nie zapisano ustawień."));
      } finally {
        saveBtn.disabled = false;
      }
    };

    const addStaffBtn = this.container.querySelector("#btn-add-staff");
    if (this.state.mode === 'connected') {
      addStaffBtn.disabled = true;
      addStaffBtn.title = "Lista uprawnionych pracowników jest zarządzana w konfiguracji CRM.";
      return;
    }
    addStaffBtn.onclick = () => {
      import("../components/modal.js").then(({ Modal }) => {
        const modal = new Modal({
          title: "Dodaj nowego pracownika do POK",
          size: "sm",
          content: `
            <div class="form-group">
              <label class="form-label form-label-required">Imię i nazwisko</label>
              <input type="text" class="form-control" id="staff-new-name" placeholder="np. Janina Kowalczyk" />
            </div>
            <div class="form-group">
              <label class="form-label form-label-required">Rola / Stanowisko</label>
              <input type="text" class="form-control" id="staff-new-role" placeholder="np. Młodszy Dyspozytor" />
            </div>
            <div class="form-group">
              <label class="form-label form-label-required">Adres e-mail</label>
              <input type="email" class="form-control" id="staff-new-email" placeholder="j.kowalczyk@example.com" />
            </div>
          `,
          footer: `
            <button class="btn btn-secondary btn-sm" id="btn-cancel-staff">Anuluj</button>
            <button class="btn btn-primary btn-sm" id="btn-save-new-staff">Zapisz</button>
          `
        });

        modal.element.querySelector("#btn-cancel-staff").onclick = () => modal.close();
        modal.element.querySelector("#btn-save-new-staff").onclick = async () => {
          const name = modal.element.querySelector("#staff-new-name").value.trim();
          const role = modal.element.querySelector("#staff-new-role").value.trim();
          const email = modal.element.querySelector("#staff-new-email").value.trim();

          if (!name || !role || !email) {
            import("../components/toast.js").then(({ Toast }) => Toast.warning("Wypełnij wszystkie pola."));
            return;
          }

          const newStaff = {
            id: `staff-${Date.now()}`,
            name,
            role,
            email,
            active: true
          };

          this.staffList.push(newStaff);
          await this.dataProvider.updateStaff(this.staffList);
          modal.close();
          import("../components/toast.js").then(({ Toast }) => Toast.success(`Dodano pracownika: ${name}`));
          this.render();
        };

        modal.open();
      });
    };
  }
}
