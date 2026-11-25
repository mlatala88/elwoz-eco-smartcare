/**
 * ELWOZ ECO SmartCare - Konfiguracja aplikacji
 * Wersja: 0.2.4 (Natywne Gemini Structured Outputs, filtracja thought, obsługa błędów)
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 * Dedykowane konto testowe: wsb.student.tester@gmail.com
 */

const SMARTCARE_CONFIG = {
  appName: "ELWOZ ECO SmartCare",
  appSubtitle: "Cyfrowy Punkt Obsługi Mieszkańca – Rejon Kartuzy",
  version: "0.2.4",
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
    links: {
      schedule: "https://elwozeco.pl/harmonogram/",
      scheduleKartuzyPortal: "https://odpady.kartuzy.pl/",
      contact: "https://elwozeco.pl/kontakt/",
      faq: "https://elwozeco.pl/",
      officialClaims: "https://elwozeco.pl/kontakt/"
    }
  },

  // Dedykowane konto testowe WSB Merito (jedyny zatwierdzony serwerowy odbiorca testowy)
  testing: {
    testerAccount: "wsb.student.tester@gmail.com",
    isServerRestricted: true
  },

  // Konfiguracja natywnego formularza Google Forms
  // Utworzony na koncie wsb.student.tester@gmail.com powiązany z arkuszem CRM
  googleForm: {
    // Bezpośredni link do formularza Google Forms
    directUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdZXjHX0Tt5GqF5yacDZpouKtrcsxPBhXx-K2s5cqYfEFtnkA/viewform",
    // Link do osadzenia w iframe (z parametrem ?embedded=true)
    embedUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdZXjHX0Tt5GqF5yacDZpouKtrcsxPBhXx-K2s5cqYfEFtnkA/viewform?embedded=true",
    // Flaga gotowości formularza
    isFormConfigured: true
  },

  // Ostrzeżenie prawne i procedury bezpieczeństwa danych
  disclaimer: {
    title: "UWAGA: PROTOTYP TESTOWY",
    shortNotice: "Aplikacja stanowi studencki prototyp wdrożeniowy WSB Merito. Wprowadzaj WYŁĄCZNIE fikcyjne dane.",
    fullNotice: "System służy do celów demonstracyjnych i testowych. Zgłoszenia testowe trafiają do prywatnego arkusza Google Sheets powiązanego z kontem wsb.student.tester@gmail.com. Korespondencja testowa w systemie jest bezwarunkowo ograniczona wyłącznie do zatwierdzonego konta testerskiego."
  }
};

// Zabezpieczenie przed modyfikacją konfiguracji w runtime
Object.freeze(SMARTCARE_CONFIG);
