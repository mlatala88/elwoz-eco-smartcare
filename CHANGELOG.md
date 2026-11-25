# Dziennik Zmian (CHANGELOG) – ELWOZ ECO SmartCare

Wszystkie istotne zmiany i wydania w projekcie **ELWOZ ECO SmartCare** są rejestrowane w tym dokumencie zgodnie z konwencją [Semantic Versioning](https://semver.org/).

---

## [0.2.0] – 2026-11-25
### Rozszerzenie: Moduł Komunikacji z Klientem i Zarządzania Reputacją

#### Dodane funkcjonalności:
- **Menu pracownika „SmartCare” w Google Sheets:**
  - Utworzono niestandardowe menu `SmartCare` integrujące pełny cykl obsługi:
    1. *Analizuj zgłoszenie przez AI* (automatyczna diagnoza problemu)
    2. *Przygotuj potwierdzenie przyjęcia* (szablon A)
    3. *Przygotuj informację o postępach* (szablon B)
    4. *Przygotuj informację o rozwiązaniu* (szablon C)
    5. *Przygotuj prośbę o opinię Google* (szablon D)
    6. *Odnotuj kontakt telefoniczny* (rejestracja rozmowy w CRM)
    7. *Wyświetl historię komunikacji* (podgląd korespondencji danej sprawy)
- **Moduł przygotowywania i edycji wiadomości (`google/communication.gs`):**
  - Obsługa okien dialogowych HTML (modal dialogs) z podglądem i edycją tematu oraz treści przed wysyłką.
  - Opcjonalny asystent AI do wygładzania treści szablonu (z zachowaniem restrykcyjnych reguł zakazu wymyślania faktów).
  - Walidacja wymagająca uzupełnienia pola `Sposób rozwiązania sprawy` przed przygotowaniem informacji o rozwiązaniu.
  - Zabezpieczenie przed wielokrotnym wysłaniem prośby o opinię Google bez wyraźnej zgody pracownika.
- **Zarządzanie Reputacją i Opinie Google:**
  - Dodano dedykowaną zakładkę `USTAWIENIA` zawierającą oficjalne dane POK Kartuzy, zweryfikowany link do wystawienia recenzji Google, flagę trybu demonstracyjnego i testowy adres e-mail.
  - Wdrożono zasady pełnej zgodności z polityką Google Reviews: neutralny ton prośby, brak zachęt finansowych, brak filtrowania (review gatingu) i brak automatycznego publikowania recenzji w imieniu mieszkańców.
- **Rejestr korespondencji (`HISTORIA KOMUNIKACJI`):**
  - Utworzono nową zakładkę audytową przechowującą pełną historię każdego kontaktu (e-mail, telefon, inny) ze statusem operacji (`przygotowano`, `wysłano`, `odnotowano kontakt`, `anulowano`, `błąd wysyłki`).
- **Rozszerzenie bazy `ZGŁOSZENIA`:**
  - Dodano kolumny operacyjne: `Data potwierdzenia przyjęcia`, `Data ostatniego kontaktu`, `Wynik kontaktu z mieszkańcem`, `Uwagi mieszkańca`, `Prośba o opinię wysłana` oraz `Data wysłania prośby o opinię`.
- **Rozszerzenie analityki w `DASHBOARD`:**
  - Dodano wskaźniki: liczba spraw oczekujących na kontakt, odsetek zakończonych spraw, liczba zebranych ocen satysfakcji, liczba wysłanych próśb o opinię Google oraz odsetek spraw zakończonych z prośbą o opinię.
- **Tryb demonstracyjny i bezpieczeństwo:**
  - Automatyczne przekierowywanie całej korespondencji w trybie demo na skonfigurowany adres testowy.
  - Wymuszony prefiks `[TEST]` w temacie oraz stopka studenckiego projektu WSB Merito.

---

## [0.1.0] – 2026-11-25
### Wydanie Inicjalne (Prototyp Studencki WSB Merito)
- Responsywny interfejs WWW (HTML5, CSS3, Vanilla JS, mobile-first) w barwach ELWOZ ECO.
- Formularz zgłoszeniowy z walidacją i generatorem unikalnego ID sprawy (`ELW-2026-XXXX`).
- Arkusz CRM *ELWOZ ECO SmartCare – Centrum zgłoszeń* z zakładkami: `DASHBOARD`, `ZGŁOSZENIA`, `TESTY`, `INSTRUKCJA AI`.
- Wariant manualny promptu AI w `docs/prompt-ai.md` oraz automatyczny w `google/ai.gs`.
- Generator kodu QR `assets/generate_qr.js` i szablon naklejki `assets/naklejka-pojemnik-szablon.svg`.
