# ELWOZ ECO SmartCare – Procedura Testowa i Rejestr Weryfikacji
**Wersja:** 0.1.0  
**Projekt:** Studencki prototyp wdrożeniowy – Uniwersytet WSB Merito w Gdańsku  
**Przedsiębiorstwo:** ELWOZ ECO Sp. z o.o. (Rejon Kartuzy)

---

## 1. Cel i zasady przeprowadzania testów

Niniejsza procedura służy do zweryfikowania poprawności działania aplikacji **ELWOZ ECO SmartCare** przez członków studenckiego zespołu projektowego przed prezentacją końcową.

### Główne założenia testów:
1. **Wyłącznie dane fikcyjne:** Żadne testowe zgłoszenie nie może zawierać rzeczywistych nazwisk, prywatnych adresów ani numerów telefonów mieszkańców Kartuz.
2. **Brak zmyślonych rezultatów:** W tabelach poniżej pola dotyczące rzeczywistych rezultatów i pomiarów czasu pozostawiono puste do uzupełnienia w trakcie faktycznych sesji testowych przez zespół.
3. **Prywatność CRM:** Potwierdzenie, że arkusz Google Sheets pozostaje w 100% prywatny i zabezpieczony przed dostępem publicznym.

---

## 2. Scenariusze testowe (Weryfikacja funkcjonalna i bezpieczeństwa)

| ID | Scenariusz testowy | Dane wejściowe / Akcja | Oczekiwany rezultat | Rzeczywisty rezultat | Status testu | Osoba testująca i data | Uwagi i poprawki |
|---|---|---|---|---|---|---|---|
| **TEST-01** | **Brak odbioru odpadów** | Wybór: *brak odbioru odpadów*, frakcja: *BIO*, lokalizacja: *Kartuzy, ul. Jeziorna 15*, opis: *„Pojemnik bio wystawiony o 06:15, nieodebrany”*. | Formularz przyjmuje zgłoszenie; generuje identyfikator testowy (np. ELW-2026-0001); w arkuszu pojawia się wiersz ze statusem „Nowe” i priorytetem „Standardowy”. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-02** | **Uszkodzenie pojemnika** | Wybór: *uszkodzony pojemnik*, frakcja: *odpady zmieszane*, lokalizacja: *Kartuzy, ul. Parkowa 4*, opis: *„Pęknięte koło i pokrywa po dzisiejszym opróżnieniu”*. | Prawidłowy zapis wiersza w arkuszu; możliwość przypisania pracownika do weryfikacji i wymiany pojemnika w kolumnach CRM. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-03** | **Bałagan po odbiorze** | Wybór: *bałagan po odbiorze*, frakcja: *papier*, lokalizacja: *Kartuzy, ul. Rynek 2*, opis: *„Rozsypane kartony i folia wokół altany po odjeździe załogi”*. | Prawidłowa rejestracja; wiersz oznaczony jako Nowe; wskaźnik kategorii zlicza sprawę czystościową w Dashboardzie. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-04** | **Zgłoszenie bez danych kontaktowych** | Pozostawienie pól: *imię i nazwisko*, *telefon*, *e-mail* oraz *prośba o kontakt* całkowicie pustych. | Zgłoszenie zostaje pomyślnie wysłane (dane kontaktowe są opcjonalne); brak błędów zapisu wiersza w CRM. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-05** | **Zgłoszenie z fikcyjnymi danymi kontaktowymi** | Wpisanie telefonu: *„500-000-000”*, e-mail: *„test@student.wsb.pl”*, nazwisko: *„Jan Testowy”*. | Dane kontaktowe są poprawnie zapisane w kolumnach arkusza; nie występują błędy formatowania numeru telefonu. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-06** | **Nieuzupełnione pole obowiązkowe** | Próba wysłania formularza bez podania ulicy / miejscowości lub opisu. | Przeglądarka / Formularz blokuje wysłanie zgłoszenia i wskazuje brakujące pole; brak zapisu pustego rekordu w arkuszu. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-07** | **Zgłoszenie pochwały** | Wybór: *pochwała*, opis: *„Podziękowania dla ekipy z rejonu 3 za uprzątnięcie gałęzi i punktualność”*. | Prawidłowa kategoryzacja; pracownik w CRM może bezpośrednio zamknąć sprawę bez angażowania dyspozytorni. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-08** | **Prywatność arkusza CRM** | Próba otwarcia bezpośredniego linku do Google Sheets w oknie incognito (bez zalogowania na uprawnione konto Google). | Odmowa dostępu (ekran logowania Google / monit „Brak uprawnień”); arkusz NIE jest dostępny publicznie. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-09** | **Analiza zgłoszenia przez AI** | Przekazanie zanonimizowanego opisu z TEST-01 do analizy (manualnie lub przez menu SmartCare AI). | AI zwraca 6 pól: kategorię, 2-zdaniowe streszczenie, sugerowany priorytet, brakujące informacje, działanie i szkic odpowiedzi. | *(do uzupełnienia po teście)* | `Do wykonania` | | |
| **TEST-10** | **Weryfikacja rzetelności AI (Brak halucynacji)** | Analiza zgłoszenia zawierającego niepełne informacje i roszczenia finansowe mieszkańca. | AI NIE deklaruje uznania winy, NIE obiecuje odszkodowania ani bonifikaty, NIE wyznacza sztywnej daty podjazdu bez potwierdzenia dyspozytora. | *(do uzupełnienia po teście)* | `Do wykonania` | | |

---

## 3. Tabela porównania czasu obsługi zgłoszenia (Badanie efektywności AI)

> [!NOTE]
> Poniższa tabela stanowi metrykę badawczą projektu studenckiego. Pomiary czasu zostaną zarejestrowane przez członków zespołu w minutach dla próby rzeczywistych zgłoszeń testowych.

| Etap obsługi zgłoszenia | Czas tradycyjny (bez AI) [min] | Czas ze wsparciem AI [min] | Oszczędność czasu [%] | Ocena jakości odpowiedzi (skala 1–5) | Uwagi i spostrzeżenia zespołu |
|---|:---:|:---:|:---:|:---:|---|
| **1. Kategoryzacja i wstępna weryfikacja opisu** | *(pomiar w toku)* | *(pomiar w toku)* | *(do obliczenia)* | *(ocena zespołu)* | Wstępne przypisanie do frakcji i wagi sprawy |
| **2. Wykrycie brakujących danych (np. brak godziny wystawienia kubła)** | *(pomiar w toku)* | *(pomiar w toku)* | *(do obliczenia)* | *(ocena zespołu)* | Analiza kompletności zgłoszenia |
| **3. Sformułowanie profesjonalnej, empatycznej odpowiedzi do mieszkańca** | *(pomiar w toku)* | *(pomiar w toku)* | *(do obliczenia)* | *(ocena zespołu)* | Przygotowanie szkicu wiadomości |
| **ŁĄCZNY CZAS OBSŁUGI JEDNEGO ZGŁOSZENIA:** | **—** | **—** | **—** | **—** | **Syntetyczny wynik badania efektywności** |

---

## 4. Instrukcja raportowania błędów

W przypadku wykrycia błędu podczas testów:
1. Zapisz dokładny krok i treść komunikatu w kolumnie **Uwagi i poprawki**.
2. Oznacz status testu jako `Niezaliczony`.
3. Skonsultuj poprawkę z zespołem i zaktualizuj plik `CHANGELOG.md` po wdrożeniu korekty.
