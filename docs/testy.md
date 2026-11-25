# ELWOZ ECO SmartCare – Procedura Testowa i Rejestr Weryfikacji
**Wersja:** 0.2.0 (w tym Moduł Komunikacji i Zarządzania Reputacją)  
**Projekt:** Studencki prototyp wdrożeniowy – Uniwersytet WSB Merito w Gdańsku  
**Przedsiębiorstwo:** ELWOZ ECO Sp. z o.o. (Rejon Kartuzy)

---

## 1. Cel i zasady przeprowadzania testów

Niniejsza procedura służy do zweryfikowania poprawności działania aplikacji **ELWOZ ECO SmartCare** po rozszerzeniu o moduł komunikacji zwrotnej, badanie satysfakcji i prośby o autentyczne opinie Google.

### Główne założenia testów:
1. **Wyłącznie dane fikcyjne:** Żadne testowe zgłoszenie nie może zawierać rzeczywistych nazwisk, prywatnych adresów ani numerów telefonów mieszkańców Kartuz.
2. **Brak zmyślonych rezultatów:** W tabelach poniżej pola dotyczące rzeczywistych rezultatów i pomiarów czasu pozostawiono puste do uzupełnienia w trakcie faktycznych sesji testowych przez zespół.
3. **Prywatność i bezpieczeństwo wysyłki (Tryb Demo):** Cała korespondencja testowa może trafiać wyłącznie na skonfigurowany w arkuszu `USTAWIENIA` testowy adres e-mail, a temat musi posiadać prefiks `[TEST]`.
4. **Zasady etyczne Google Reviews:** Prośba o recenzję jest neutralna, bez nagród, bez sugerowania ocen i bez filtrowania zadowolonych/niezadowolonych mieszkańców.

---

## 2. Scenariusze testowe (Weryfikacja modułu komunikacji i reputacji)

| ID | Scenariusz testowy | Dane wejściowe / Akcja | Oczekiwany rezultat | Rzeczywisty rezultat | Status testu | Osoba testująca i data | Uwagi i poprawki |
|---|---|---|---|---|---|---|---|
| **TEST-01** | **Przygotowanie potwierdzenia przyjęcia zgłoszenia** | Wybór z menu: *SmartCare -> Przygotuj potwierdzenie przyjęcia* dla zaznaczonego wiersza z adresem e-mail. | Wyświetla się okno dialogowe z uzupełnionym szablonem A (nr zgłoszenia, lokalizacja, frakcja, informacja o weryfikacji przez dyspozytornię POK Kartuzy). | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-02** | **Edycja wiadomości przed wysyłką** | Zmiana treści i tematu w oknie dialogowym przed kliknięciem przycisku *Zatwierdź i wyślij*. | Zmiany wprowadzone przez pracownika są uwzględnione w wysyłanej wiadomości i zapisane w historii; brak wysyłki bez zgody. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-03** | **Wysyłka na zatwierdzony adres testowy (Tryb Demo)** | Wysłanie wiadomości w aktywnym trybie demonstracyjnym (`USTAWIENIA: TAK`). | E-mail trafia WYŁĄCZNIE na skonfigurowany adres testowy; temat zawiera `[TEST]`; stopka informuje o demonstracji studenckiej WSB Merito. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-04** | **Zapis historii wysyłki w HISTORIA KOMUNIKACJI** | Wysłanie wiadomości e-mail do zgłoszenia. | W zakładce `HISTORIA KOMUNIKACJI` pojawia się nowy wiersz ze statusem `wysłano`, pełną treścią, datą i loginem pracownika. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-05** | **Obsługa zgłoszenia bez adresu e-mail** | Próba przygotowania wiadomości dla zgłoszenia, gdzie pole e-mail jest puste. | System wyświetla monit o braku e-maila; jeśli dostępny jest telefon, pyta o zarejestrowanie kontaktu telefonicznego. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-06** | **Odnotowanie kontaktu telefonicznego** | Wybór z menu: *SmartCare -> Odnotuj kontakt telefoniczny*, wpisanie wyniku i notatki. | Zapis w `HISTORIA KOMUNIKACJI` ze statusem `odnotowano kontakt`; aktualizacja pola `Data ostatniego kontaktu` i `Wynik kontaktu` w `ZGŁOSZENIA`. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-07** | **Przygotowanie informacji o rozwiązaniu problemu** | Próba wybrania *Przygotuj informację o rozwiązaniu*, gdy pole `Sposób rozwiązania sprawy` jest puste. | System blokuje przygotowanie wiadomości i wyświetla monit o konieczności wpisania rzeczywistych działań naprawczych w arkuszu. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-08** | **Dodanie linku do opinii Google** | Zaznaczenie opcji dołączenia prośby o opinię w szablonie rozwiązania lub wybór opcji 5 z menu. | Wiadomość zawiera neutralną prośbę i zweryfikowany link z `USTAWIENIA`; brak obietnic nagród, rabatów czy sugestii gwiazdek. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-09** | **Zapis oceny satysfakcji mieszkańca (1–5)** | Wpisanie oceny w kolumnie `Ocena satysfakcji (1-5)` w `ZGŁOSZENIA`. | Formuła w `DASHBOARD` aktualizuje średnią ocenę oraz liczbę zebranych ocen; ocena nie jest wymagana do zamknięcia zgłoszenia. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-10** | **Zabezpieczenie przed ponowną prośbą o opinię** | Próba wysłania prośby o opinię do zgłoszenia, które ma już wartość `Prośba o opinię wysłana = TAK`. | Wyświetla się ostrzeżenie informujące, że prośba została już przekazana; wysyłka wymaga świadomego potwierdzenia. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-11** | **Zabezpieczenie przed wysyłką do prawdziwego klienta** | Wpisanie w formularzu obcego adresu e-mail i próba wysyłki w trybie demonstracyjnym. | Poczta NIE trafia na obcy adres; system automatycznie przekierowuje ją na testowy adres e-mail zespołu. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-12** | **Obsługa błędów wysyłki (MailApp)** | Symulacja błędu (np. wyczerpany limit dzienny quota lub nieprawidłowa konfiguracja). | Status w `HISTORIA KOMUNIKACJI` otrzymuje wartość `błąd wysyłki` z opisem błędu; wiersz w `ZGŁOSZENIA` NIE jest oznaczany jako obsłużony. | *(do uzupełnienia po teście)* | `Do wykonania` | | |

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

1. Każdy zrealizowany test należy oznaczyć statusem `Zaliczony` lub `Niezaliczony`.
2. W kolumnie `Rzeczywisty rezultat` należy opisać faktyczne zachowanie systemu podczas testu.
3. Wszelkie błędy techniczne należy odnotować w pliku `CHANGELOG.md` przed przystąpieniem do prezentacji na uczelni.
