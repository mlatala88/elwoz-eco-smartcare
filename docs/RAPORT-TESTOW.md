# Raport weryfikacji poprawki integracyjnej v0.3.0

Data: 28 listopada 2026. Gałąź: `integration/smartcare-v030`.

Weryfikacja została wykonana lokalnie w Node.js na Windows. Zestawy GAS używają atrap arkuszy, tożsamości Google, wyzwalaczy, poczty oraz odpowiedzi Gemini. Testy widoków wykonują rzeczywiste metody JavaScript z uproszczonym DOM. Nie są testami end-to-end opublikowanego panelu.

## Wyniki

| Zestaw | Przypadki | Zakres |
|---|---:|---|
| `tests/test-v028-audit.js` | 48 | Istniejące reguły silnika, SLA, kolejka, blokady i walidacja |
| `tests/test-v030-integration.js` | 44 | API na połączonych plikach GAS; aktualne reguły tożsamości Google |
| `manager/tests/runTests.js` | 65 | Dane demonstracyjne, CSI, CX/PR, komunikacja i diagnostyka demo |
| `tests/test-deployed-regressions.js` | 30 | Odtworzenie 12/9/9, domyślne filtry, KPI, terminy, sortowanie i brak kolizji funkcji |
| `tests/test-browser-contracts.js` | 4 | Faktyczny payload widoku i adaptera, reset, błąd strukturalny, kolejność odpowiedzi |
| `tests/test-rpc-security.js` | 33 | Odmowa anonimowym RPC, ochrona starych wejść i brak zaufania do PIN/operatora |
| `tests/test-access.js` | 10 | Mapowanie kont Google, role, start panelu i migracja wyzwalaczy |
| `tests/test-module-contracts.js` | 11 | Ustawienia, komunikacja/opinie, diagnostyka, raporty, zadania, Web App bez aktywnego arkusza |
| `tests/test-html-safety.js` | 8 | Escapowanie pól CRM, wyszukiwania, tabel, ustawień, raportów i powiadomień |
| `tests/test-shared-text.js` | 2 | Komunikaty toast i potwierdzenia jako tekst |
| `tests/test-legacy-html-safety.js` | 2 | Starsza kolejka arkusza i bezpieczne osadzanie JSON w skrypcie HTML |
| **Razem** | **257** | **257 zaliczonych, 0 błędów** |

Dodatkowo przebudowano `google/webapp.html` z aktualnych źródeł i sprawdzono składnię skompilowanego JavaScript. Pliki CSS nie były modyfikowane.

## Odtworzenie błędów przed naprawą

Regresje modułów najpierw wykazały 10 błędów: brak aliasów komunikacji, niespójne zaproszenia do opinii, nieprzekazany okres raportów, błędny dzień i liczniki zadań, nieobsługiwane przyciski connected, diagnostykę innego kształtu, nieprawdziwy zapis ustawień oraz brak odrzucenia nieobsługiwanych ustawień i komunikacji. Dodatkowy test odtworzył błąd `getSheetByName` przy braku aktywnego arkusza w Web App. Dwa testy wspólnych komunikatów i dwa testy starszych okien odtworzyły wstrzykiwanie HTML/skryptu przed poprawką. Każdy z tych przypadków przechodzi po naprawie.

## Jak powtórzyć

```text
node scripts/test-all.js
```

Polecenie zatrzymuje się przy błędzie, uruchamia wszystkie 11 zestawów, buduje szablon oraz weryfikuje jego składnię. Nie wymaga klucza Gemini ani dostępu do Google.

## Granice potwierdzenia

Nie wdrażano kodu do Google, nie uruchamiano rzeczywistych wyzwalaczy, nie zmieniano danych CRM, nie wysyłano wiadomości i nie wykonywano zapytań Gemini. Nie wykonywano nowej sesji wizualnej w przeglądarce na opublikowanej aplikacji. Zapis poczty, ustawień i analizy w testach dotyczy wyłącznie atrap w pamięci.

Do odbioru w Google pozostają: dostęp rzeczywistych kont, uprawnienia do arkusza, konfiguracja istniejącego wdrożenia, widoczność i działanie wyzwalaczy oraz — po osobnej decyzji administratora — wysyłka i AI. Procedura: [INSTRUKCJA-WDROZENIA-V030.md](INSTRUKCJA-WDROZENIA-V030.md).
