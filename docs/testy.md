# ELWOZ ECO SmartCare – Procedura Testowa i Rejestr Weryfikacji
**Wersja:** 0.2.6 (FINAL RELEASE: Naprawa Dashboardu, dynamiczne mapowanie, 2 wykresy, powiadomienia e-mail, zweryfikowany profil Google, standardy CX/PR)  
**Projekt:** Studencki prototyp wdrożeniowy – Uniwersytet WSB Merito w Gdańsku  
**Przedsiębiorstwo:** ELWOZ ECO Sp. z o.o. (Rejon Kartuzy)  
**Dedykowane konto testowe:** `wsb.student.tester@gmail.com`  
**Zweryfikowany link do opinii Google:** `https://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA`

---

## 1. Cel i zasady przeprowadzania testów

Niniejsza procedura służy do zweryfikowania poprawności działania aplikacji **ELWOZ ECO SmartCare** po wprowadzeniu poprawek końcowych v0.2.6:
1. **Wyłącznie dane fikcyjne:** Żadne testowe zgłoszenie nie może zawierać rzeczywistych nazwisk, prywatnych adresów ani numerów telefonów mieszkańców Kartuz.
2. **Brak zmyślonych rezultatów:** W tabelach poniżej pola dotyczące rzeczywistych rezultatów i pomiarów czasu pozostawiono do uzupełnienia w trakcie faktycznych sesji testowych przez zespół.
3. **Twarde zabezpieczenie serwerowe (Backend Whitelist Guard):** Backend bezwzględnie blokuje wysyłkę na jakikolwiek inny adres niż `wsb.student.tester@gmail.com`, a temat wiadomości zawsze otrzymuje prefiks `[TEST]`.
4. **Zasady etyczne Google Reviews:** Prośba o recenzję jest neutralna, bez nagród, bez sugerowania ocen, bez filtrowania zadowolonych/niezadowolonych mieszkańców i BEZ TEKSTU ZASTĘPCZEGO (placeholdera).
5. **Natywne Structured Outputs i filtracja thought:** Odpowiedź AI jest wymuszana w schemacie JSON, a bloki myśli modelu rozumującego są ignorowane.
6. **Dynamiczny Dashboard i wykresy:** Formuły bazują na dynamicznym wyszukiwaniu nagłówków kolumn i składni przecinkowej, a wykresy nie ulegają duplikacji.

---

## 2. Scenariusze testowe

| ID | Scenariusz testowy | Dane wejściowe / Akcja | Oczekiwany rezultat | Rzeczywisty rezultat | Status testu | Osoba testująca i data | Uwagi i poprawki |
|---|---|---|---|---|---|---|---|
| **TEST-01** | **Przygotowanie potwierdzenia przyjęcia zgłoszenia** | Wybór z menu: *SmartCare -> Przygotuj potwierdzenie przyjęcia* dla zaznaczonego wiersza z adresem e-mail. | Wyświetla się okno dialogowe z uzupełnionym szablonem A (nr zgłoszenia, lokalizacja, frakcja, informacja o weryfikacji przez dyspozytornię POK Kartuzy). | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-02** | **Edycja wiadomości przed wysyłką** | Zmiana treści i tematu w oknie dialogowym przed kliknięciem przycisku *Zatwierdź i wyślij*. | Zmiany wprowadzone przez pracownika są uwzględnione w wysyłanej wiadomości i zapisane w historii; brak wysyłki bez zgody. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-03** | **Wysyłka na dedykowany adres testowy (wsb.student.tester@gmail.com)** | Wysłanie wiadomości w aktywnym trybie demonstracyjnym (`USTAWIENIA: TAK`). | Wiadomość trafia WYŁĄCZNIE na `wsb.student.tester@gmail.com`; temat zawiera `[TEST]`; stopka informuje o demonstracji studenckiej WSB Merito. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-04** | **Zapis historii wysyłki w HISTORIA KOMUNIKACJI** | Wysłanie wiadomości e-mail do zgłoszenia. | W zakładce `HISTORIA KOMUNIKACJI` pojawia się nowy wiersz ze statusem `wysłano`, pełną treścią, datą i loginem pracownika. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-05** | **Obsługa zgłoszenia bez adresu e-mail** | Próba przygotowania wiadomości dla zgłoszenia, gdzie pole e-mail jest puste. | System wyświetla monit o braku e-maila; jeśli dostępny jest telefon, pyta o zarejestrowanie kontaktu telefonicznego. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-06** | **Odnotowanie kontaktu telefonicznego** | Wybór z menu: *SmartCare -> Odnotuj kontakt telefoniczny*, wpisanie wyniku i notatki. | Zapis w `HISTORIA KOMUNIKACJI` ze statusem `odnotowano kontakt`; aktualizacja pola `Data ostatniego kontaktu` i `Wynik kontaktu` w `ZGŁOSZENIA`. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-07** | **Przygotowanie informacji o rozwiązaniu problemu** | Próba wybrania *Przygotuj informację o rozwiązaniu*, gdy pole `Sposób rozwiązania sprawy` jest puste. | System blokuje przygotowanie wiadomości i wyświetla monit o konieczności wpisania rzeczywistych działań naprawczych w arkuszu. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-08** | **Weryfikacja linku do opinii Google** | Wybór *Przygotuj prośbę o opinię* przy braku zweryfikowanego adresu URL w `USTAWIENIA`. | System blokuje operację; informuje o zakazie wysyłki prośby z tekstem zastępczym (placeholderem); brak oznaczania w CRM. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-09** | **Zapis oceny satysfakcji mieszkańca (1–5)** | Wpisanie oceny w kolumnie `Ocena satysfakcji (1-5)` w `ZGŁOSZENIA`. | Formuła w `DASHBOARD` aktualizuje średnią ocenę oraz liczbę zebranych ocen; ocena nie jest wymagana do zamknięcia zgłoszenia. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-10** | **Zabezpieczenie przed ponowną prośbą o opinię** | Próba wysłania prośby o opinię do zgłoszenia, które ma już wartość `Prośba o opinię wysłana = TAK`. | Wyświetla się ostrzeżenie informujące, że prośba została już przekazana; wysyłka wymaga świadomego potwierdzenia. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-11** | **Twarda blokada serwerowa wysyłki na inny adres niż wsb.student.tester@gmail.com** | Próba wymuszenia wysyłki na obcy adres. | Backend (`processSendEmail`) bezwzględnie zwraca błąd, nie zamyka okna dialogowego, odnotowuje próbę jako błąd i chroni przed wysyłką zewnętrzną. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-12** | **Obsługa błędów wysyłki i brak zamykania modala** | Wystąpienie błędu serwera podczas wysyłki e-mail. | Klient (`showEmailComposer`) nie zamyka okna wiadomości; wyświetla czytelny komunikat błędu; pracownik może poprawić treść. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-13** | **Zabezpieczenie współbieżności LockService** | Równoczesna rejestracja formularza i generowanie ID zgłoszenia. | `LockService` kolejkuje operacje; trwały licznik `LAST_ASSIGNED_TICKET_ID` gwarantuje brak kolizji identyfikatorów. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-14** | **Obliczanie KPI w godzinach (Dashboard)** | Zgłoszenie z różnicą dat np. 2 godziny 30 minut. | Formuła `DASHBOARD` (komórki C8, D8) zwraca `2.50` godz. (dokładność do dwóch miejsc po przecinku, brak błędu INT()). | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-15** | **Odsetek próśb o opinię wyłącznie wśród zakończonych** | 10 zgłoszeń (5 nowych, 5 rozwiązanych; 2 z wysłaną prośbą). | Komórka C11 zwraca `40%` (2/5), a nie 20% (2/10). | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-16** | **Interaktywna weryfikacja danych dla AI (Human-in-the-Loop)** | Wybór z menu: *SmartCare -> Analizuj zgłoszenie przez AI*. | Wyświetla się okno dialogowe z oczyszczonym opisem (brak ulicy, posesji, nazwiska); pracownik może zmodyfikować treść przed wysłaniem do modelu Gemini Flash. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-17** | **Natywne Structured Outputs i eliminacja błędu myśli (thought)** | Kliknięcie *Wyślij do AI (Przeanalizuj)* w oknie weryfikacji. | Część `thought` jest ignorowana; poprawny obiekt JSON trafia do walidacji; brak błędu `SyntaxError: Unexpected token 'o'`; CRM zostaje uzupełniony. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-18** | **Obsługa błędów analizy AI i brak zamykania okna** | Symulacja błędu sieci, limitu quota lub niepoprawnych danych. | Okno dialogowe weryfikacji AI pozostaje otwarte; wyświetla się czytelny komunikat; przycisk zmienia stan na `🤖 Ponów analizę AI`. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-19** | **Samodzielny test diagnostyczny Gemini API z menu SmartCare** | Wybór z menu: *SmartCare -> 🔍 Test diagnostyczny Gemini API*. | Wyświetla się okno modalne z pełną diagnostyką: nazwa modelu Flash, HTTP 200, finishReason: STOP, liczba części thought (odfiltrowane), zużycie tokenów (prompt, candidates, thinking) oraz podgląd sparsowanego JSON. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-20** | **Weryfikacja puli 8192 tokenów i eliminacja błędu braku klamer JSON** | Analiza zgłoszeń ELW-2026-0001 i ELW-2026-0002 przez Gemini Flash. | Brak błędu obcięcia tokenów; model generuje kompletny JSON ze wszystkimi wymaganymi polami; pola CRM w arkuszu ZGŁOSZENIA zostają poprawnie wypełnione. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-21** | **Dynamiczny Dashboard i eliminacja błędu #ERROR!** | Przeliczenie statystyk dla 3 istniejących zgłoszeń (total = 3, kategorie = 1 każda, 1 rozwiązane). | Komórka C5 wyświetla `3`, kategorie w kolumnie C wyświetlają `1`, brak błędów `#ERROR!`; wygenerowane 2 czytelne wykresy (kategorii i statusów). | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-22** | **Automatyczne powiadomienia e-mail o nowym zgłoszeniu** | Wysłanie nowego zgłoszenia przez formularz Google Forms. | Wyzwalacz `handleNewTicketSubmit` wysyła e-mail z powiadomieniem na `wsb.student.tester@gmail.com`; zdarzenie odnotowane w `HISTORIA KOMUNIKACJI`. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-23** | **Blokada przycisków i status w oknie edycji wiadomości** | Kliknięcie *Usprawnij styl z AI* w oknie przygotowania wiadomości. | Przycisk *Zatwierdź i wyślij* zostaje zablokowany; wyświetla się komunikat `AI przygotowuje odpowiedź…`; po zakończeniu przyciski odblokowują się, a treść można edytować. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-24** | **Weryfikacja standardów PR i CX w stylizacji AI** | Przekazanie do stylizacji roboczej notatki zawierającej wzmianki o naganach kierowcy lub fikcyjnych trasach. | Model usuwa wzmianki o karach i fikcyjnych faktach, stosuje powitanie *Dzień dobry,*, dziękuje za kontakt i przeprasza za utrudnienia, zachowując oficjalne dane POK. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-25** | **Jednoklikowa aktualizacja systemu do v0.2.6** | Wybór z menu: *SmartCare -> 🚀 Aktualizuj system do v0.2.6*. | Skrypt idempotentnie aktualizuje formuły Dashboardu, wykresy, parametry USTAWIENIA, formatuje wiersze ZGŁOSZENIA (28px, CLIP) i wyświetla raport podsumowujący. | *(do uzupełnienia po teście)* | `Do wykonania` | | |

---

## 3. Tabela porównania czasu obsługi zgłoszenia (Badanie efektywności AI)

> [!NOTE]
> Pomiary czasu zostaną zarejestrowane przez członków zespołu w minutach dla próby rzeczywistych zgłoszeń testowych.

| Etap obsługi zgłoszenia | Czas tradycyjny (bez AI) [min] | Czas ze wsparciem AI [min] | Oszczędność czasu [%] | Ocena jakości odpowiedzi (skala 1–5) | Uwagi i spostrzeżenia zespołu |
|---|:---:|:---:|:---:|:---:|---|
| **1. Kategoryzacja i wstępna weryfikacja opisu** | *(pomiar w toku)* | *(pomiar w toku)* | *(do obliczenia)* | *(ocena zespołu)* | Przypisanie do frakcji i wagi sprawy |
| **2. Wykrycie brakujących danych w zgłoszeniu** | *(pomiar w toku)* | *(pomiar w toku)* | *(do obliczenia)* | *(ocena zespołu)* | Analiza kompletności (np. brak numeru kubła) |
| **3. Przygotowanie potwierdzenia przyjęcia sprawy** | *(pomiar w toku)* | *(pomiar w toku)* | *(do obliczenia)* | *(ocena zespołu)* | Wypełnienie szablonu A z danymi |
| **4. Przygotowanie informacji o rozwiązaniu i prośby o opinię** | *(pomiar w toku)* | *(pomiar w toku)* | *(do obliczenia)* | *(ocena zespołu)* | Zredagowanie notatki i neutralnego zaproszenia |
| **ŁĄCZNY CZAS OBSŁUGI JEDNEGO ZGŁOSZENIA:** | **—** | **—** | **—** | **—** | **Syntetyczny wynik badania efektywności** |

---

## 4. Wytyczne audytu i weryfikacji przez zespół

1. Wszystkie operacje testowe wykonujemy z poziomu dedykowanego konta Google: `wsb.student.tester@gmail.com`.
2. Każdy zrealizowany test należy oznaczyć statusem `Zaliczony` lub `Niezaliczony`.
3. W kolumnie `Rzeczywisty rezultat` należy opisać faktyczne zachowanie systemu podczas testu.
4. Wszelkie uwagi i spostrzeżenia należy zarejestrować w kolumnie `Uwagi`.
