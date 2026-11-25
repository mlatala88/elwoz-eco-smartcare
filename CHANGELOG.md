# Dziennik Zmian (CHANGELOG) – ELWOZ ECO SmartCare

Wszystkie istotne zmiany i wydania w projekcie **ELWOZ ECO SmartCare** są rejestrowane w tym dokumencie zgodnie z konwencją [Semantic Versioning](https://semver.org/).

---

## [0.2.1] – 2026-11-25
### Wydanie Bezpieczeństwa: Dedykowane Konto Testowe i Twarda Blokada Serwerowa

#### Dodane zabezpieczenia i zmiany:
- **Dedykowane konto ekosystemu Google:**
  - Powiązano wszystkie usługi Google (Google Sheets CRM, Google Forms, Apps Script oraz Gemini API) z dedykowanym kontem projektowym: `wsb.student.tester@gmail.com`.
  - Repozytorium GitHub pozostaje na dotychczasowym koncie użytkownika.
- **Twarde zabezpieczenie serwerowe (Backend Whitelist Guard):**
  - W module [google/communication.gs](google/communication.gs) wdrożono bezwzględną weryfikację po stronie serwera w funkcji `processSendEmail`.
  - W trybie demonstracyjnym wysyłka na jakikolwiek inny adres niż `wsb.student.tester@gmail.com` jest natychmiast blokowana na poziomie backendu, logowana w `HISTORIA KOMUNIKACJI` jako błąd wysyłki i zgłaszana pracownikowi w alercie bezpieczeństwa.
  - Ochrona jest całkowicie odporna na manipulacje parametrami w przeglądarce czy zmiany w arkuszu.
- **Aktualizacja konfiguracji i procedur testowych:**
  - W [google/setup.gs](google/setup.gs) ustawiono `wsb.student.tester@gmail.com` jako domyślny i wymuszany adres w zakładce `USTAWIENIA`.
  - W [docs/testy.md](docs/testy.md) zaktualizowano scenariusze TEST-03 i TEST-11 pod kątem weryfikacji twardej blokady serwerowej.
  - Zaktualizowano [README.md](README.md) ze szczegółowym podziałem ról (konto Google `wsb.student.tester@gmail.com` vs repozytorium GitHub na koncie użytkownika).

---

## [0.2.0] – 2026-11-25
### Rozszerzenie: Moduł Komunikacji z Klientem i Zarządzania Reputacją

#### Dodane funkcjonalności:
- **Menu pracownika „SmartCare” w Google Sheets:**
  - Utworzono menu `SmartCare` (Analiza AI, Potwierdzenie, Postępy, Rozwiązanie, Opinia Google, Kontakt tel., Historia).
- **Moduł przygotowywania i edycji wiadomości (`google/communication.gs`):**
  - Obsługa okien dialogowych HTML z podglądem i edycją tematu oraz treści przed wysyłką.
  - Opcjonalny asystent AI do wygładzania treści szablonu.
  - Walidacja wymagająca uzupełnienia pola `Sposób rozwiązania sprawy` przed przygotowaniem wiadomości o rozwiązaniu.
  - Zabezpieczenie przed wielokrotnym wysłaniem prośby o opinię Google.
- **Zarządzanie Reputacją i Opinie Google:**
  - Zakładka `USTAWIENIA` z danymi POK Kartuzy i zweryfikowanym linkiem do Profilu Firmy Google.
  - Pełna zgodność z polityką Google Reviews (brak review gatingu, brak zachęt finansowych, neutralność).
- **Rejestr korespondencji (`HISTORIA KOMUNIKACJI`):**
  - Dziennik audytowy każdego kontaktu ze statusem operacji.
- **Rozszerzenie bazy `ZGŁOSZENIA` i wskaźników w `DASHBOARD`:**
  - Nowe kolumny operacyjne i wskaźniki KPI (sprawy oczekujące na kontakt, odsetek zakończonych, wskaźniki satysfakcji i opinii).

---

## [0.1.0] – 2026-11-25
### Wydanie Inicjalne (Prototyp Studencki WSB Merito)
- Responsywny interfejs WWW (HTML5, CSS3, Vanilla JS, mobile-first) w barwach ELWOZ ECO.
- Formularz zgłoszeniowy z walidacją i generatorem unikalnego ID sprawy (`ELW-2026-XXXX`).
- Arkusz CRM *ELWOZ ECO SmartCare – Centrum zgłoszeń* z zakładkami: `DASHBOARD`, `ZGŁOSZENIA`, `TESTY`, `INSTRUKCJA AI`.
- Wariant manualny promptu AI w `docs/prompt-ai.md` oraz automatyczny w `google/ai.gs`.
- Generator kodu QR `assets/generate_qr.js` i szablon naklejki `assets/naklejka-pojemnik-szablon.svg`.
