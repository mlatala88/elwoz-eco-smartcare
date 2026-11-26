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
          <button class="btn btn-danger btn-sm" id="btn-reset-demo-factory">
            <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
            <span>Przywróć dane fabryczne demo</span>
          </button>
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
                      <td style="font-weight: 600;">${s.name}</td>
                      <td style="font-size: 12px; color: var(--text-secondary);">${s.role}</td>
                      <td style="font-size: 12px;">${s.email}</td>
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
                  <input type="text" class="form-control" id="set-company" value="${this.settings.companyName}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Oddział / POK</label>
                  <input type="text" class="form-control" id="set-branch" value="${this.settings.branch}" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Oficjalny e-mail POK</label>
                  <input type="email" class="form-control" id="set-email" value="${this.settings.email}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Infolinia / Telefon</label>
                  <input type="text" class="form-control" id="set-phone" value="${this.settings.phone}" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Godziny pracy dyspozytorni</label>
                <input type="text" class="form-control" id="set-hours" value="${this.settings.workingHours}" />
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Zweryfikowany link opinii Google</label>
                <input type="url" class="form-control" id="set-google-url" value="${this.settings.googleReviewUrl}" />
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

          <!-- Konfiguracja Asystenta AI -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">
                <i data-lucide="sparkles" style="width: 16px; height: 16px; color: var(--brand-green);"></i>
                <span>Konfiguracja modelu Gemini Flash (AI)</span>
              </div>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Silnik językowy</label>
                <input type="text" class="form-control" value="gemini-3.6-flash (zapasowy: gemini-3.5-flash)" disabled />
                <span class="form-hint">Wykorzystuje bezpłatną pulę modeli Flash ze Structured Outputs.</span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Budżet tokenów wyjścia</label>
                  <input type="text" class="form-control" value="8192 tokenów" disabled />
                </div>
                <div class="form-group">
                  <label class="form-label">Thinking Level</label>
                  <input type="text" class="form-control" value="MINIMAL (filtr części thought)" disabled />
                </div>
              </div>

              <div style="padding: 12px; background-color: var(--brand-green-light); border: 1px solid var(--prio-low-border); border-radius: var(--radius-sm); font-size: 12px; line-height: 1.4; color: var(--brand-green-dark);">
                <i data-lucide="shield-check" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>
                <strong>Zasada bezpieczeństwa kluczy API:</strong> Klucze dostępowe do Gemini API nie są i nigdy nie będą przechowywane w kodzie JavaScript działającym w przeglądarce klienta. W trybie produkcyjnym zapytania są wykonywane po stronie backendu Google Apps Script.
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
    const resetBtn = this.container.querySelector("#btn-reset-demo-factory");
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

    const saveBtn = this.container.querySelector("#btn-save-settings");
    saveBtn.onclick = async () => {
      const updatedSettings = {
        ...this.settings,
        companyName: this.container.querySelector("#set-company").value.trim(),
        branch: this.container.querySelector("#set-branch").value.trim(),
        email: this.container.querySelector("#set-email").value.trim(),
        phone: this.container.querySelector("#set-phone").value.trim(),
        workingHours: this.container.querySelector("#set-hours").value.trim(),
        googleReviewUrl: this.container.querySelector("#set-google-url").value.trim()
      };

      await this.dataProvider.updateSettings(updatedSettings);
      import("../components/toast.js").then(({ Toast }) => {
        Toast.success("Zapisano ustawienia systemowe.");
      });
    };

    const addStaffBtn = this.container.querySelector("#btn-add-staff");
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
