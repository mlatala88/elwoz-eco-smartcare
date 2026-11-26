# ELWOZ ECO SmartCare Manager v0.3.0 – Instrukcja Uruchomienia

**Projekt:** Studencki prototyp wdrożeniowy – Uniwersytet WSB Merito w Gdańsku  
**Przedsiębiorstwo:** ELWOZ ECO Sp. z o.o. (Rejon Kartuzy)  
**Wymagania:** Komputer z systemem Windows / macOS / Linux, standardowa przeglądarka internetowa (Google Chrome, Microsoft Edge lub Mozilla Firefox).  
**Wymagania instalacyjne:** Brak. Aplikacja nie wymaga instalowania dodatkowych programów, środowisk Node.js ani serwerów bazodanowych na komputerze pracownika.

---

## 1. Szybkie uruchomienie lokalne (Wariant najprostszy)

1. Rozpakuj archiwum `elwoz-eco-smartcare-manager-v0.3.0-demo.zip` w dowolnym katalogu na dysku.
2. Wejdź do katalogu `manager/`.
3. Kliknij dwukrotnie plik `index.html` (lub otwórz go za pomocą przeglądarki Chrome, Edge lub Firefox).
4. Aplikacja uruchomi się natychmiast w trybie demonstracyjnym z kompletem 30 syntetycznych zgłoszeń.

> [!NOTE]
> W niektórych przeglądarkach (np. starszych wersjach Chrome) bezpośrednie otwieranie plików ES Modules z protokołu `file://` może być blokowane ze względów bezpieczeństwa (Cross-Origin Request Blocked). W takim przypadku skorzystaj z Wariantu 2 poniżej.

---

## 2. Uruchomienie z lokalnym serwerem HTTP (Wariant zalecany dla developerów)

Jeżeli masz zainstalowany Node.js lub Python, możesz uruchomić lokalny lekki serwer HTTP:

### Za pomocą Node.js (wbudowany skrypt testowy):
```powershell
# W katalogu repozytorium:
node manager/tests/server.js
```
Następnie otwórz w przeglądarce adres:
```
http://127.0.0.1:8092/manager/index.html
```

### Za pomocą npx (Dowolny serwer statyczny):
```powershell
npx serve manager
```

---

## 3. Uruchomienie z poziomu GitHub Pages (Wariant demonstracyjny online)

W wersji demonstracyjnej na GitHub Pages aplikacja jest dostępna pod adresem:
```
https://mlatala88.github.io/elwoz-eco-smartcare/manager/index.html
```
(lub przez plik `manager.html` przekierowujący automatycznie do folderu `/manager/`).

---

## 4. Główne scenariusze demonstracyjne do przetestowania

1. **Przegląd Pulpitu CSI (`#dashboard`):**
   - Zwróć uwagę na 16 wskaźników operacyjnych. Kliknij dowolny kafelek (np. *Pilny kontakt*, *Przeterminowane* lub *Nowe zgłoszenia*) – aplikacja natychmiast przeniesie Cię do widoku tabeli z precyzyjnie przefiltrowanymi sprawami.
   - Zmień filtr okresu na *Ostatnie 7 dni* lub *Własny zakres*.
2. **Kolejka Moje zadania (`#tasks`):**
   - Sprawdź zakładki: *Natychmiastowa reakcja*, *Przeterminowane*, *Do zrobienia dzisiaj*, *Bez opiekuna*, *Bez kolejnego kroku*.
   - Zaznacz pole *Tylko moje zadania*, aby przefiltrować sprawy dla aktualnie wybranego pracownika (np. Anny Nowak).
3. **Centrum obsługi pojedynczego zgłoszenia (`#detail?id=ELW-2026-0001`):**
   - Zobacz 3 panele: dane mieszkańca i lokalizacji (lewy), Asystent AI i komunikator (środkowy), zarządzanie statusem i SLA (prawy).
   - Kliknij szablon odpowiedzi (np. *Potwierdzenie przyjęcia*).
   - Kliknij przycisk **✨ Usprawnij styl z AI (CX/PR)** – zobacz jak model poprawia styl, usuwa niepożądane wzmianki i dodaje sygnaturę POK.
   - Wybierz przycisk **Odnotuj rozmowę telefoniczną** i zapisz notatkę.
4. **Zarządzanie satysfakcją (`#csat`):**
   - Sprawdź rozkład ocen 1-5 gwiazdek oraz rejestr komentarzy mieszkańców.
   - Sprawdź sekcję spraw wymagających ponownego kontaktu z niezadowolonym mieszkańcem.
5. **Diagnostyka i symulacja awarii (`#diagnostics`):**
   - Uruchom **Test diagnostyczny API** i zobacz zmierzone czasy odpowiedzi.
   - Włącz **Symulację błędu Gemini API**, a następnie spróbuj wygenerować odpowiedź w zgłoszeniu – sprawdź obsługę błędu bez zamykania okna!
6. **Reset danych fabrycznych (`#settings`):**
   - W zakładce Ustawienia kliknij **Przywróć dane fabryczne demo**, aby w każdej chwili zresetować bazę do stanu początkowego (30 zweryfikowanych zgłoszeń).
