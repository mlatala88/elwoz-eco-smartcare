# Dziennik Zmian (CHANGELOG) – ELWOZ ECO SmartCare

Wszystkie istotne zmiany i wydania w projekcie **ELWOZ ECO SmartCare** są rejestrowane w tym dokumencie zgodnie z konwencją [Semantic Versioning](https://semver.org/).

---

## [0.1.0] – 2026-11-25
### Wydanie Inicjalne (Prototyp Studencki WSB Merito)

#### Dodane funkcjonalności:
- **Interfejs WWW (Mobile-First):**
  - Responsywny layout stworzony w czystym HTML5, CSS3 i Vanilla JavaScript, zoptymalizowany pod kątem urządzeń mobilnych (skanowanie kodów QR na kubłach).
  - Identyfikacja wizualna oparta na barwach ELWOZ ECO Sp. z o.o. (zieleń ekologiczna, granat korporacyjny, neutralne tła, wysoki kontrast).
  - Wyraźny baner edukacyjny informujący o prototypie studenckim WSB Merito i wymogu stosowania wyłącznie fikcyjnych danych.
  - Szybka nawigacja kafelkowa: *Zgłoś problem*, *Harmonogram wywozu*, *Kontakt z POK Kartuzy*, *FAQ i segregacja*.
- **Moduł zgłoszeniowy (Formularz):**
  - Wszystkie wymagane pola: rodzaj zgłoszenia (obowiązkowe), frakcja odpadów, miejscowość (obowiązkowe), ulica (obowiązkowe), numer posesji (obowiązkowe), data zdarzenia, opis zgłoszenia (obowiązkowe) oraz opcjonalne dane kontaktowe z prośbą o kontakt.
  - Walidacja po stronie przeglądarki z generatorem unikalnego numeru zgłoszenia testowego (`ELW-2026-XXXX`).
  - Ekran potwierdzenia z przypomnieniem o testowym charakterze systemu i bezpiecznym odnośnikiem do oficjalnego kanału reklamacji.
  - Elastyczna konfiguracja w `js/config.js` umożliwiająca podpięcie bezpośredniego i osadzonego formularza Google Form.
- **Backend w chmurze (Google Apps Script & Google Sheets CRM):**
  - Skrypt `google/setup.gs` automatycznie konfigurujący arkusz *ELWOZ ECO SmartCare – Centrum zgłoszeń* z zakładkami: `DASHBOARD`, `ZGŁOSZENIA`, `TESTY`, `INSTRUKCJA AI`.
  - Pola operacyjne CRM: statusy z formatowaniem warunkowym (Nowe, Do weryfikacji, W realizacji, Oczekuje na informacje, Rozwiązane, Zamknięte), priorytety (Niski, Standardowy, Wysoki), pracownik odpowiedzialny, terminy, notatki, ocena satysfakcji (1–5) oraz pola analityczne AI.
  - Instalowalny wyzwalacz `onFormSubmit` do automatycznego nadawania identyfikatorów i statusów.
  - Dynamiczny `DASHBOARD` ze wskaźnikami KPI, średnim czasem pierwszej reakcji i rozwiązania (wyliczanym wyłącznie dla wypełnionych dat) oraz tabelami rozkładu zgłoszeń.
- **Wsparcie Sztucznej Inteligencji (Human-in-the-Loop):**
  - Wariant podstawowy (bezpłatny): gotowy, zoptymalizowany prompt do ChatGPT / Google Gemini w `docs/prompt-ai.md` i zakładce `INSTRUKCJA AI` z procedurą anonimizacji danych.
  - Wariant automatyczny: skrypt `google/ai.gs` dodający menu w arkuszu i integrujący Gemini API (z kluczem w `ScriptProperties`, analizą na życzenie pracownika dla zaznaczonego wiersza i restrykcyjnymi zasadami bezpieczeństwa).
- **Procedura testowa i weryfikacja:**
  - Plik `docs/testy.md` oraz zakładka `TESTY` z 10 precyzyjnymi scenariuszami weryfikacji funkcjonalnej, bezpieczeństwa i odporności na halucynacje.
  - Szablon tabeli porównania czasu obsługi tradycyjnej vs ze wsparciem AI do uzupełnienia pomiarami przez zespół.
- **Materiały wdrożeniowe:**
  - Wektorowy szablon naklejki informacyjnej na pojemnik komunalny (`assets/naklejka-pojemnik-szablon.svg`).
  - Dedykowany generator kodu QR w Node.js (`assets/generate_qr.js`) dla docelowego adresu GitHub Pages.
  - Kompleksowa dokumentacja w języku polskim w `README.md`.
