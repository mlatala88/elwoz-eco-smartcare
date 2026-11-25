/**
 * ELWOZ ECO SmartCare - Logika aplikacji klienckiej
 * Wersja: 0.1.0
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Inicjalizacja elementów DOM
  const form = document.getElementById("smartCareForm");
  const confirmationCard = document.getElementById("confirmationCard");
  const confirmedTicketIdEl = document.getElementById("confirmedTicketId");
  const btnNewTicket = document.getElementById("btnNewTicket");
  const btnScrollToForm = document.getElementById("btnScrollToForm");
  const btnOpenDirectForm = document.getElementById("btnOpenDirectForm");
  const incidentDateInput = document.getElementById("incidentDate");

  // 2. Ustawienie domyślnej dzisiejszej daty w polu daty zdarzenia
  if (incidentDateInput && !incidentDateInput.value) {
    const today = new Date().toISOString().split("T")[0];
    incidentDateInput.value = today;
  }

  // 3. Konfiguracja odnośnika do Google Form w zależności od SMARTCARE_CONFIG
  if (btnOpenDirectForm) {
    if (typeof SMARTCARE_CONFIG !== "undefined" && SMARTCARE_CONFIG.googleForm && SMARTCARE_CONFIG.googleForm.directUrl) {
      const url = SMARTCARE_CONFIG.googleForm.directUrl;
      btnOpenDirectForm.href = url;
      
      btnOpenDirectForm.addEventListener("click", (e) => {
        if (!SMARTCARE_CONFIG.googleForm.isFormConfigured || url.includes("PLACEHOLDER_FORM_ID")) {
          e.preventDefault();
          alert(
            "Wskazówka konfiguracyjna:\n\n" +
            "Aby podpiąć własny formularz Google Forms:\n" +
            "1. Uruchom skrypt 'google/setup.gs' w Google Apps Script.\n" +
            "2. Skopiuj wygenerowany adres formularza i wklej go w pliku 'js/config.js' (parametr directUrl).\n\n" +
            "Obecnie możesz przetestować zgłoszenie bezpośrednio w interaktywnym formularzu na stronie!"
          );
        }
      });
    }
  }

  // 4. Płynne przewijanie do sekcji formularza
  if (btnScrollToForm) {
    btnScrollToForm.addEventListener("click", (e) => {
      const target = document.getElementById("zgloszenie");
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
        // Skupienie na pierwszym polu
        setTimeout(() => {
          const firstInput = document.getElementById("ticketType");
          if (firstInput) firstInput.focus();
        }, 400);
      }
    });
  }

  // 5. Generator unikalnego numeru zgłoszenia testowego
  const generateTicketId = () => {
    const year = new Date().getFullYear();
    const storedCounter = parseInt(localStorage.getItem("elwoz_ticket_counter") || "100", 10) + 1;
    localStorage.setItem("elwoz_ticket_counter", storedCounter.toString());
    const padded = String(storedCounter).padStart(4, "0");
    return `ELW-${year}-${padded}`;
  };

  // 6. Obsługa wysłania formularza
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      // Podstawowa walidacja HTML5
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // Odczytanie wartości z formularza
      const formData = {
        id: generateTicketId(),
        timestamp: new Date().toISOString(),
        ticketType: document.getElementById("ticketType").value.trim(),
        wasteFraction: document.getElementById("wasteFraction").value.trim(),
        city: document.getElementById("city").value.trim(),
        street: document.getElementById("street").value.trim(),
        houseNumber: document.getElementById("houseNumber").value.trim(),
        incidentDate: document.getElementById("incidentDate").value,
        description: document.getElementById("description").value.trim(),
        contactName: document.getElementById("contactName").value.trim(),
        contactPhone: document.getElementById("contactPhone").value.trim(),
        contactEmail: document.getElementById("contactEmail").value.trim(),
        requestCallback: document.getElementById("requestCallback").checked ? "tak" : "nie"
      };

      // Zapis zgłoszenia w lokalnym magazynie testowym przeglądarki (do celów demonstracyjnych i audytu)
      try {
        const testTickets = JSON.parse(localStorage.getItem("elwoz_test_tickets") || "[]");
        testTickets.unshift(formData);
        // Ograniczenie bufora do 50 ostatnich zgłoszeń
        if (testTickets.length > 50) testTickets.pop();
        localStorage.setItem("elwoz_test_tickets", JSON.stringify(testTickets));
      } catch (err) {
        console.warn("Brak możliwości zapisu do localStorage:", err);
      }

      // Prezentacja potwierdzenia
      if (confirmedTicketIdEl) {
        confirmedTicketIdEl.textContent = formData.id;
      }

      // Przełączenie widoku
      const formSection = document.getElementById("zgloszenie");
      if (formSection) formSection.style.display = "none";
      if (confirmationCard) {
        confirmationCard.style.display = "block";
        confirmationCard.scrollIntoView({ behavior: "smooth" });
      }

      console.info("[SmartCare] Zarejestrowano zgłoszenie testowe:", formData);
    });
  }

  // 7. Obsługa przycisku "Wypełnij kolejne zgłoszenie"
  if (btnNewTicket) {
    btnNewTicket.addEventListener("click", () => {
      if (form) form.reset();
      // Ponowne ustawienie daty dzisiejszej
      if (incidentDateInput) {
        incidentDateInput.value = new Date().toISOString().split("T")[0];
      }
      if (confirmationCard) confirmationCard.style.display = "none";
      const formSection = document.getElementById("zgloszenie");
      if (formSection) {
        formSection.style.display = "block";
        formSection.scrollIntoView({ behavior: "smooth" });
      }
    });
  }
});
