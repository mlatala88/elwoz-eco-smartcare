/**
 * ELWOZ ECO SmartCare - Konfiguracja aplikacji
 * Wersja: 0.2.1 (Zarządzanie reputacją, komunikacja i dedykowane konto testowe)
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 * Dedykowane konto testowe: wsb.student.tester@gmail.com
 */

const SMARTCARE_CONFIG = {
  appName: "ELWOZ ECO SmartCare",
  appSubtitle: "Cyfrowy Punkt Obsługi Mieszkańca – Rejon Kartuzy",
  version: "0.2.1",
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

  // Dedykowane konto testowe WSB Merito (jedyny zatwierdzony serwerowy odbiorca w trybie demo)
  testing: {
    testerAccount: "wsb.student.tester@gmail.com",
    isServerRestricted: true
  },

  // Konfiguracja formularza Google Forms
  googleForm: {
    directUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc_PLACEHOLDER_FORM_ID/viewform",
    embedUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc_PLACEHOLDER_FORM_ID/viewform?embedded=true",
    isFormConfigured: false
  },

  // Ostrzeżenie prawne i procedury bezpieczeństwa danych
  disclaimer: {
    title: "UWAGA: PROTOTYP TESTOWY",
    shortNotice: "Aplikacja stanowi studencki prototyp wdrożeniowy WSB Merito. Wprowadzaj WYŁĄCZNIE fikcyjne dane.",
    fullNotice: "System służy do celów demonstracyjnych i testowych. Zgłoszenia złożone w tym systemie NIE są przekazywane do dyspozytorni ELWOZ ECO Sp. z o.o. Korespondencja testowa w systemie jest kierowana wyłącznie na zatwierdzone konto: wsb.student.tester@gmail.com."
  }
};

// Zabezpieczenie przed modyfikacją konfiguracji w runtime
Object.freeze(SMARTCARE_CONFIG);
