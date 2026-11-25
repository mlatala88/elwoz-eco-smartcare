/**
 * ELWOZ ECO SmartCare - Logika aplikacji klienckiej
 * Wersja: 0.2.2 (Poprawki po niezależnym audycie: usunięcie pozorowanego localStorage, natywna integracja Google Forms)
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 */

document.addEventListener("DOMContentLoaded", () => {
  const formContainer = document.getElementById("googleFormContainer");
  const formPlaceholder = document.getElementById("googleFormPlaceholder");
  const formIframe = document.getElementById("googleFormIframe");
  const btnOpenDirectForm = document.getElementById("btnOpenDirectForm");
  const btnScrollToForm = document.getElementById("btnScrollToForm");

  // Konfiguracja natywnego formularza Google Forms
  const config = (typeof SMARTCARE_CONFIG !== "undefined") ? SMARTCARE_CONFIG : null;
  const googleFormCfg = config ? config.googleForm : null;

  const hasValidUrl = googleFormCfg && 
    googleFormCfg.directUrl && 
    googleFormCfg.directUrl.trim() !== "" && 
    !googleFormCfg.directUrl.includes("PLACEHOLDER");

  if (hasValidUrl) {
    // 1. Formularz został podpięty – aktywacja bezpośredniego linku i iframe
    const directUrl = googleFormCfg.directUrl.trim();
    const embedUrl = googleFormCfg.embedUrl ? googleFormCfg.embedUrl.trim() : (directUrl + "?embedded=true");

    if (btnOpenDirectForm) {
      btnOpenDirectForm.href = directUrl;
      btnOpenDirectForm.target = "_blank";
      btnOpenDirectForm.rel = "noopener noreferrer";
    }

    if (formIframe && formContainer) {
      formIframe.src = embedUrl;
      formContainer.style.display = "block";
      if (formPlaceholder) formPlaceholder.style.display = "none";
    }
  } else {
    // 2. Formularz oczekuje na wklejenie linku po uruchomieniu setup.gs
    if (formContainer) formContainer.style.display = "none";
    if (formPlaceholder) formPlaceholder.style.display = "block";

    if (btnOpenDirectForm) {
      btnOpenDirectForm.href = "#";
      btnOpenDirectForm.addEventListener("click", (e) => {
        e.preventDefault();
        alert(
          "Instrukcja podpięcia formularza Google Forms:\n\n" +
          "1. Otwórz arkusz Google Sheets na koncie wsb.student.tester@gmail.com.\n" +
          "2. Przejdź do: Rozszerzenia -> Apps Script i uruchom 'setupSmartCareSystem'.\n" +
          "3. Skopiuj wygenerowany link formularza i wklej go w pliku 'js/config.js' (parametr directUrl).\n\n" +
          "Wszystkie zgłoszenia trafiają bezpośrednio do arkusza Google Sheets bez pośrednictwa pamięci lokalnej przeglądarki."
        );
      });
    }
  }

  // Płynne przewijanie do sekcji formularza
  if (btnScrollToForm) {
    btnScrollToForm.addEventListener("click", (e) => {
      const target = document.getElementById("zgloszenie");
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  }
});
