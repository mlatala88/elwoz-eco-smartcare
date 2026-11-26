/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Accessible Modal Component
 */

export class Modal {
  constructor(options = {}) {
    this.title = options.title || "";
    this.content = options.content || "";
    this.footer = options.footer || "";
    this.size = options.size || "md"; // sm, md, lg, xl
    this.onClose = options.onClose || null;
    this.element = null;
    this.render();
  }

  render() {
    this.element = document.createElement("div");
    this.element.className = "modal-backdrop";
    
    let sizeClass = "";
    if (this.size === "lg") sizeClass = "modal-lg";
    if (this.size === "xl") sizeClass = "modal-xl";

    this.element.innerHTML = `
      <div class="modal-dialog ${sizeClass}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${this.title}</h3>
          <button class="modal-close-btn" aria-label="Zamknij okno">
            <i data-lucide="x" style="width: 18px; height: 18px;"></i>
          </button>
        </div>
        <div class="modal-body">
          ${typeof this.content === "string" ? this.content : ""}
        </div>
        ${this.footer ? `<div class="modal-footer">${this.footer}</div>` : ""}
      </div>
    `;

    if (typeof this.content !== "string" && this.content instanceof HTMLElement) {
      this.element.querySelector(".modal-body").appendChild(this.content);
    }

    const closeBtn = this.element.querySelector(".modal-close-btn");
    closeBtn.onclick = () => this.close();

    this.element.onclick = (e) => {
      if (e.target === this.element) this.close();
    };

    document.body.appendChild(this.element);

    if (window.lucide) {
      window.lucide.createIcons({ root: this.element });
    }
  }

  open() {
    requestAnimationFrame(() => {
      this.element.classList.add("open");
    });
  }

  close() {
    this.element.classList.remove("open");
    setTimeout(() => {
      if (this.element && this.element.parentElement) {
        this.element.remove();
      }
      if (typeof this.onClose === "function") {
        this.onClose();
      }
    }, 200);
  }

  static confirm(message, onConfirm, title = "Potwierdzenie operacji", confirmText = "Potwierdź", cancelText = "Anuluj", isDanger = false) {
    const modal = new Modal({
      title,
      size: "sm",
      content: `<p style="font-size: 14px; line-height: 1.5; color: var(--text-primary);">${message}</p>`,
      footer: `
        <button class="btn btn-secondary btn-sm" id="modal-cancel-btn">${cancelText}</button>
        <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'} btn-sm" id="modal-confirm-btn">${confirmText}</button>
      `
    });

    const confirmBtn = modal.element.querySelector("#modal-confirm-btn");
    const cancelBtn = modal.element.querySelector("#modal-cancel-btn");

    confirmBtn.onclick = () => {
      modal.close();
      onConfirm();
    };

    cancelBtn.onclick = () => modal.close();

    modal.open();
    return modal;
  }
}
