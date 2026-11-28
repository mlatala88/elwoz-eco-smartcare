# Aktualizacja istniejącego SmartCare Manager v0.3.0

Stan: 28 listopada 2026. Gałąź: `integration/smartcare-v030`.

Ten pakiet naprawia istniejącą aplikację. Nie tworzy nowego formularza, arkusza ani wdrożenia. Zachowuje układ i CSS, adres formularza, kod QR oraz konfigurację Gemini. Zmiany w repozytorium nie aktualizują automatycznie opublikowanej aplikacji Google.

## Co przygotowano

- Filtry listy zgodne z wartościami wysyłanymi przez interfejs; domyślne „Wszystkie” nie ukrywają danych. KPI i lista używają spójnych reguł. Reset filtrów i ochrona przed nadpisaniem świeższej odpowiedzi RPC działają także w trybie connected.
- Jeden zestaw definicji API; poprawione kontrakty komunikacji, diagnostyki, ustawień, raportów i zadań.
- Ustawienia zapisują rzeczywiście sześć pól organizacyjnych z blokadą i odczytem po zapisie. Lista uprawnionych pracowników w connected jest tylko do odczytu.
- Google potwierdza tożsamość użytkownika przy każdej operacji serwera. Wspólny PIN i profil z pamięci przeglądarki nie przyznają uprawnień. Puste lub nieznane konto dostaje `ACCESS_DENIED`.
- Tekst mieszkańca, korespondencja i komunikaty błędów są wyświetlane jako tekst, bez wykonywania HTML.

## 1. Przygotowanie aktualizacji

Pracuj w tym samym projekcie Apps Script, który obsługuje obecny arkusz CRM i obecny adres `/exec`. Zanotuj identyfikator istniejącego wdrożenia, jego adres, obecną wersję oraz ustawienia wyzwalaczy. Zachowaj kopię dotychczasowych plików projektu. Nie uruchamiaj inicjalizacji `setupSmartCareSystem_`, resetowania danych ani aktualizatora arkuszy: nie są częścią tej poprawki.

Pakiet zawiera komplet plików Google:

| Plik w pakiecie | Operacja w dotychczasowym projekcie |
|---|---|
| `google/setup.gs` | Zastąp całą zawartość dotychczasowego pliku |
| `google/ai.gs` | Zastąp całą zawartość; nie zmieniaj Script Properties Gemini |
| `google/communication.gs` | Zastąp całą zawartość |
| `google/webapp.gs` | Zastąp całą zawartość |
| `google/access.gs` | Dodaj plik skryptu `access` albo zastąp, jeśli istnieje |
| `google/webapp.html` | Zastąp szablon HTML `webapp` |

Zastępuj pliki, nie dopisuj drugiej kopii funkcji. Zachowaj obecny manifest i zakresy autoryzacji; pakiet nie zawiera zamiennika `appsscript.json`. Nie kopiuj do edytora katalogów `manager`, `tests` ani `scripts` — są źródłem i testami dla przygotowanego szablonu HTML.

## 2. Dostęp Google i powiązanie z istniejącym CRM

W Ustawieniach projektu → Właściwości skryptu sprawdź `SMARTCARE_SPREADSHEET_ID`. Musi zawierać identyfikator istniejącego arkusza CRM, fragment jego adresu między `/d/` i `/edit`. To powiązanie jest potrzebne, gdy Web App nie ma aktywnego arkusza.

Bez właściwości `SMARTCARE_STAFF_EMAILS` dostęp ma wyłącznie istniejące konto testowe `wsb.student.tester@gmail.com`, przypisane do `staff-1`. Dla zespołu ustaw tę właściwość jako kompletny obiekt JSON: klucz to identyfikator osoby z tabeli, wartość to jej rzeczywiste konto Google. Każde konto musi być unikalne. Podany obiekt zastępuje listę domyślną; zachowaj w nim administratora, który wykonuje aktualizację. Nie dodawaj przykładowych adresów `example.com`.

| ID | Osoba | Uprawnienia aplikacji |
|---|---|---|
| `staff-1` | Michał Latała | Administrator; odczyt, edycja, zamykanie, komunikacja, AI, ustawienia, diagnostyka |
| `staff-2` | Barbara Seroka | Odczyt, edycja, zamykanie, komunikacja, AI |
| `staff-3` | Diana Skierka | Odczyt, edycja, zamykanie, komunikacja, AI |
| `staff-4` | Anna Fedoruk | Odczyt, edycja, zamykanie, komunikacja, AI |
| `staff-5` | Michał Wadyński | Tylko odczyt |

Minimalne poprawne mapowanie istniejącego konta testowego:

```json
{"staff-1":"wsb.student.tester@gmail.com"}
```

Przed dopisaniem innych osób ustal ich rzeczywiste adresy. Nazwy i role pochodzą z kodu serwera, nie z przesłanego przez przeglądarkę profilu. `SMARTCARE_PIN` nie jest używany. Nie zmieniaj `GEMINI_API_KEY`, właściwości modelu, limitów, formularza ani danych CRM.

Zalecany tryb Web App: **Wykonaj jako użytkownik uzyskujący dostęp do aplikacji**. Wybierz dostęp wymagający konta Google albo właściwą domenę Workspace, zależnie od dostępnych opcji. Użytkownicy potrzebują również odpowiedniego dostępu Google do istniejącego arkusza i zgody na wymagane uprawnienia skryptu. Uprawnienia aplikacji nie zastępują uprawnień pliku Google; edytor arkusza może edytować go poza aplikacją.

W trybie „Wykonaj jako ja” Google może zwracać pusty adres osoby odwiedzającej, szczególnie dla zewnętrznych kont Gmail. Aplikacja wtedy odmawia dostępu; nie omija tej sytuacji PIN-em. Zalogowanie właściciela nie dowodzi jeszcze, że inne konto zobaczy swoją tożsamość. Zasady opisuje [Google Session](https://developers.google.com/apps-script/reference/base/session) i [Google Web Apps](https://developers.google.com/apps-script/guides/web).

## 3. Migracja wyzwalaczy

Część funkcji wewnętrznych ma teraz końcowy `_`, aby nie były dostępne przez `google.script.run`. Trzeba przenieść wyzwalacze, które używały dawnych nazw. Nie uruchamiaj samych handlerów kolejki, analizy ani formularza jako testu — mogą przetwarzać zgłoszenia.

Po zapisaniu wszystkich plików, jako uprawniony administrator i dotychczasowy właściciel wyzwalaczy, uruchom w edytorze wyłącznie `migrateSmartCareTriggers`. Funkcja zakłada nowe wyzwalacze przed usunięciem starych, nie przetwarza zgłoszeń. Wyzwalacze mogą później wykonywać zwykłą pracę automatyczną zgodnie z harmonogramem. Powtórne uruchomienie migracji jest bezpieczne.

| Stary handler | Nowy handler | Tryb |
|---|---|---|
| `handleNewTicketSubmit` | `handleNewTicketSubmit_` | Z istniejącego arkusza, po przesłaniu formularza |
| `scheduledQueueAndReconcile` | `scheduledQueueAndReconcile_` | Czasowy, co 5 minut |
| `processAiAnalysisQueue` | `processAiAnalysisQueue_` | Ręcznie zachowaj dotychczasowy harmonogram, jeśli ten dodatkowy handler był zainstalowany |
| `checkOverdueTicketsAndNotify` | `checkOverdueTicketsAndNotify_` | Ręcznie zachowaj dotychczasowy harmonogram, jeśli był zainstalowany |

Migracja zatrzymuje się bez zmian, jeśli wykryje dwa ostatnie stare handlery; najpierw przenieś je ręcznie i ponów migrację. W zakładce Wyzwalacze sprawdź brak duplikatów. Wyzwalacze należące do innych kont trzeba zweryfikować z tych kont — skrypt nie widzi wszystkich cudzych instalacji. Jeśli istnieją inne niestandardowe wyzwalacze, dopasuj ich nazwy do funkcji w aktualnym kodzie i zachowaj parametry.

## 4. Aktualizacja tego samego wdrożenia — bez zmiany adresu

1. W tym samym projekcie wybierz **Wdróż → Zarządzaj wdrożeniami**.
2. Wybierz istniejące aktywne wdrożenie Web App, zgodne z zapisanym identyfikatorem i adresem `/exec`.
3. Kliknij ikonę edycji. W polu wersji wybierz **Nowa wersja**. Dodaj opis „v0.3.0 — poprawki integracji i dostępu 2026-11-28”.
4. Sprawdź opisany wyżej tryb wykonania i ograniczenie dostępu. Zapisz aktualizację wybranego wdrożenia.
5. Otwórz zapisany dotychczasowy adres `/exec` w nowej karcie. Porównaj go z adresem sprzed aktualizacji. Nie wybieraj „Nowe wdrożenie” i nie zastępuj adresu formularza ani QR.

Google potwierdza, że przypisanie nowej wersji do istniejącego wdrożenia zachowuje URL i deployment ID: [Create and manage deployments](https://developers.google.com/apps-script/concepts/deployments).

## 5. Odbiór po aktualizacji

Weryfikacja w prawdziwym wdrożeniu pozostaje do wykonania przez administratora. Testy lokalne nie potwierdzają ustawień konta Google, uprawnień do arkusza, instalacji wyzwalaczy, limitów Gemini ani doręczenia poczty.

- Jako uprawniony użytkownik: sprawdź profil, listę bez filtrów oraz przejścia z KPI. Dla tego samego okresu i bez zmian danych liczby listy i KPI powinny być zgodne. Nie zakładaj, że obecny CRM nadal zawiera liczbę 12/9/9 z przykładu regresyjnego.
- Sprawdź wyszukiwanie, priorytet, status, pracownika, AI, terminy oraz reset filtrów; przełącz kilka filtrów szybko.
- Otwórz istniejące zgłoszenie i historię komunikacji. Kanał E-mail powinien znajdować zapisane wiadomości, a rodzaj działania powinien być widoczny.
- Sprawdź raport dla krótszego okresu i kolejkę „Tylko moje”.
- Jako administrator uruchom diagnostykę. Odczytuje arkusz i konfigurację; nie wykonuje zapytania Gemini ani wysyłki. „Klucz skonfigurowany” nie oznacza potwierdzonej dostępności API.
- Sprawdź konto spoza listy oraz — jeśli skonfigurowany — obserwatora. Nieuprawniony odczyt/zapis musi kończyć się odmową po stronie serwera.
- Próby rzeczywistego zapisu, wysyłki i analizy AI wykonuj wyłącznie w osobno zaakceptowanym scenariuszu testowym. Odbiorca testowy nadal jest wymuszany po stronie serwera.

Wariant zewnętrznego `fetch` z GitHub Pages nie ma w tym repozytorium kompletnego przepływu OAuth/CORS. Do rzeczywistego CRM używaj istniejącego osadzonego Web App i `google.script.run`; panel lokalny/GitHub Pages pozostaje właściwy do demonstracji.

## 6. Wycofanie i lokalna weryfikacja

Wycofanie wersji Web App: w **Zarządzaj wdrożeniami** przypisz poprzednią zapisaną wersję do tego samego wdrożenia. Wyzwalacze wykonują zapisany kod projektu, niezależnie od wersji Web App. Pełne wycofanie wymaga także przywrócenia zapisanych plików projektu i dawnych handlerów/harmonogramów. Nie usuwaj ani nie odtwarzaj arkusza/formularza. Nie przywracaj szerokiego dostępu przez PIN.

Sprawdzenie pakietu lokalnie, bez połączeń z Google:

```text
node scripts/test-all.js
```

Polecenie uruchamia wszystkie zestawy regresji, odbudowuje `google/webapp.html` i sprawdza składnię jego skryptu. Wyniki oraz ograniczenia opisuje [RAPORT-TESTOW.md](RAPORT-TESTOW.md).
