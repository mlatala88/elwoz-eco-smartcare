/**
 * ELWOZ ECO SmartCare - Konfiguracja aplikacji
 * Wersja: 0.1.0
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 */

const SMARTCARE_CONFIG = {
  appName: "ELWOZ ECO SmartCare",
  appSubtitle: "Cyfrowy Punkt Obsługi Mieszkańca – Rejon Kartuzy",
  version: "0.1.0",
  isEducationalPrototype: true,

  // Dane oficjalne ELWOZ ECO - Punkt Obsługi Klienta Kartuzy
  company: {
    name: "ELWOZ ECO Sp. z o.o.",
    officialWebsite: "https://elwozeco.pl/",
    pokKartuzy: {
      address: "ul. Mściwoja II 14, 83-300 Kartuzy",
      phone1: "58 681 22 99",
      phone2: "605 347 455",
      email: "kartuzy@elwozeco.pl",
      workingHours: "Poniedziałek – Piątek: 07:00 – 16:00"
    },
    // Zweryfikowane oficjalne odnośniki
    links: {
      schedule: "https://elwozeco.pl/harmonogram/",
      scheduleKartuzyPortal: "https://odpady.kartuzy.pl/",
      contact: "https://elwozeco.pl/kontakt/",
      faq: "https://elwozeco.pl/",
      officialClaims: "https://elwozeco.pl/kontakt/"
    }
  },

  // Konfiguracja formularza Google Forms
  // Po uruchomieniu skryptu google/setup.gs wklej poniżej wygenerowane adresy URL:
  googleForm: {
    // Bezpośredni link do formularza Google (do otwarcia w nowej karcie)
    directUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc_PLACEHOLDER_FORM_ID/viewform",
    // Link do osadzenia formularza w iframe (opcjonalny)
    embedUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc_PLACEHOLDER_FORM_ID/viewform?embedded=true",
    // Czy formularz Google został już podpięty (false = prezentuje gotowy formularz demonstracyjny z podglądem)
    isFormConfigured: false
  },

  // Ostrzeżenie prawne i procedury bezpieczeństwa danych
  disclaimer: {
    title: "UWAGA: PROTOTYP TESTOWY",
    shortNotice: "Aplikacja stanowi studencki prototyp wdrożeniowy WSB Merito. Wprowadzaj WYŁĄCZNIE fikcyjne dane.",
    fullNotice: "System służy do celów demonstracyjnych i testowych. Zgłoszenia złożone w tym systemie NIE są przekazywane do dyspozytorni ELWOZ ECO Sp. z o.o. W przypadku pilnych spraw lub rzeczywistych reklamacji prosimy o kontakt z oficjalnym Biurem Obsługi Klienta."
  }
};

// Zabezpieczenie przed modyfikacją konfiguracji w runtime
Object.freeze(SMARTCARE_CONFIG);
