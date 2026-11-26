/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Toast Notification Service
 */

class ToastService {
  constructor() {
    this.container = null;
  }

  ensureContainer() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    }
  }

  show(message, type = "info", duration = 4000) {
    this.ensureContainer();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let iconName = "info";
    if (type === "success") iconName = "check-circle";
    if (type === "error") iconName = "alert-triangle";
    if (type === "warning") iconName = "alert-circle";

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
      <span style="flex: 1; line-height: 1.4;">${message}</span>
      <button style="background: transparent; border: none; cursor: pointer; color: #94A3B8; padding: 2px;" aria-label="Zamknij">
        <i data-lucide="x" style="width: 14px; height: 14px;"></i>
      </button>
    `;

    const closeBtn = toast.querySelector("button");
    closeBtn.onclick = () => {
      toast.remove();
    };

    this.container.appendChild(toast);

    if (window.lucide) {
      window.lucide.createIcons({ root: toast });
    }

    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.opacity = "0";
          toast.style.transition = "opacity 0.2s ease";
          setTimeout(() => toast.remove(), 200);
        }
      }, duration);
    }

    return toast;
  }

  success(msg, dur) { return this.show(msg, "success", dur); }
  error(msg, dur) { return this.show(msg, "error", dur); }
  warning(msg, dur) { return this.show(msg, "warning", dur); }
  info(msg, dur) { return this.show(msg, "info", dur); }
}

export const Toast = new ToastService();
