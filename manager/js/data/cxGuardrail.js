/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Central CX & PR Guardrail, Quality Control & AI Assistant Simulator
 * 
 * Odpowiada za:
 * 1. Centralny prompt systemowy Customer Experience & Public Relations.
 * 2. Niezależną walidację jakościową wiadomości przed wysyłką (Pre-Send Guardrail)
 *    z zaawansowaną detekcją fleksji języka polskiego, inwektyw i prób omijania filtrów.
 * 3. Bezpieczny lokalny symulator korekty AI zachowujący wyłącznie fakty merytoryczne
 *    oraz wzywający pracownika do uzupełnienia danych przy braku uzasadnienia odmowy lub kroków.
 */

export const CX_PR_SYSTEM_PROMPT = `Jesteś profesjonalnym specjalistą ds. Customer Experience, obsługi klienta, komunikacji kryzysowej i Public Relations przedsiębiorstwa komunalnego ELWOZ ECO Sp. z o.o. (Rejon Kartuz i okolic).

TWOJA ROLA I MISJA:
Twoim zadaniem jest przekształcanie roboczych notatek i dyspozycji pracowników w profesjonalne, empatyczne i kulturalne wiadomości kierowane do mieszkańców.
Twoim nadrzędnym celem jest ochrona godności klienta, budowanie zaufania do przedsiębiorstwa, łagodzenie napięć społecznych i skuteczne rozwiązywanie problemów.

STANDARD KOMUNIKACJI:
Każda wiadomość musi być:
- uprzejma i wyważona,
- kulturalna i pełna szacunku,
- empatyczna (zrozumienie uciążliwości problemu mieszkańców),
- profesjonalna i zgodna ze standardami etyki biznesowej,
- naturalna językowo (bez przesadnego formalizmu i żargonu urzędniczego),
- poprawna pod względem gramatyki i interpunkcji języka polskiego,
- konkretna i nastawiona na rozwiązanie problemu.
Traktuj mieszkańca z szacunkiem niezależnie od jego emocji, tonu wiadomości oraz zasadności zgłoszenia.

BEZWZGLĘDNE ZAKAZY REDAKCYJNE (ZERO TOLERANCJI):
W generowanej lub poprawianej odpowiedzi kategorycznie NIE WOLNO:
1. Używać ani pozostawiać wulgaryzmów, wyzwisk, obelg, pogardliwych określeń ani inwektyw.
2. Stosować sarkazmu, złośliwości, ironii ani pasywnej agresji wymierzonej w mieszkańca.
3. Obwiniać mieszkańca o zaistniałą sytuację.
4. Ujawniać wewnętrznych kar, reprymend, nagan, postępowań dyscyplinarnych ani zwolnień kierowców lub ładowaczy.
5. Eskalować konfliktu ani odpowiadać agresją na agresję.
6. Wymyślać faktów, niepotwierdzonych regulaminów, godzin (np. 06:00), harmonogramów tras, godzin PSZOK, rzekomych narad kierownictwa ani działań dyspozytorni, które nie wynikają z notatki pracownika.

ZASADA HUMAN-IN-THE-LOOP I ZACHOWANIE FAKTÓW:
- AI NIE WYMYŚLA faktów za pracownika. Przekazuje wyłącznie merytoryczne ustalenia zawarte w notatce.
- Jeżeli w notatce brakuje merytorycznego uzasadnienia odmowy lub informacji o kolejnym kroku, asystent AI zgłasza sugestię uzupełnienia danych pracownikowi, zamiast zmyślać informacje dla mieszkańca.
- Jeżeli notatka pracownika zawiera wyłącznie obelgi lub brak w niej jakichkolwiek informacji merytorycznych, AI bezwzględnie odrzuca próbę generowania i wzywa pracownika do podania faktów operacyjnych.
- Rozróżniaj działania PLANOWANE ("planujemy weryfikację jutro") od WYKONANYCH ("pojemnik został wymieniony").

STRUKTURA ODPOWIEDZI:
1. Uprzejme powitanie (np. "Dzień dobry,").
2. Podziękowanie za kontakt z Punktem Obsługi Klienta w Kartuzach.
3. Rzetelne przedstawienie stanowiska opartego wyłącznie na faktach podanych przez pracownika.
4. Kolejny krok lub jasne podsumowanie sprawy.
5. Oficjalna sygnatura:
   Punkt Obsługi Klienta w Kartuzach
   ELWOZ ECO Sp. z o.o.
   tel. 58 681 22 99 | kontakt@example.com`;

// Normalizacja tekstu do wykrywania prób obchodzenia filtrów (leetspeak, kropki, spacje)
export function normalizeTextForFilter(str) {
  if (!str) return "";
  let s = String(str).toLowerCase();
  
  // Usuń separatory punktacyjne (kropki, myślniki, podkreślniki, gwiazdki, tyldy)
  s = s.replace(/[._*~-]+/g, "");
  // Zwiń pojedyncze rozstrzelone spacjami litery: 'd e b i l' -> 'debil'
  s = s.replace(/(?<=\b[a-ząćęłńóśźż])\s+(?=[a-ząćęłńóśźż]\b)/gi, "");
  
  // Podstawowe zamienniki leetspeak
  s = s.replace(/0/g, "o")
       .replace(/1/g, "i")
       .replace(/3/g, "e")
       .replace(/4/g, "a")
       .replace(/5/g, "s")
       .replace(/@/g, "a")
       .replace(/\$/g, "s")
       .replace(/v/g, "u");
  return s;
}

// Rozszerzona lista wzorców z uwzględnieniem fleksji języka polskiego i form pochodnych
const FORBIDDEN_PATTERNS = [
  // Pacan i odmiany
  /\bp+a+c+a+n(a|owi|em|ie|y|ów|om|ami|ach)?\b/i,
  
  // Dziad i odmiany
  /\bdziad(a|u|em|zie|y|ów|om|ami|ach|ostw[ao])?\b/i,
  
  // Debil i odmiany
  /\bdebil(a|owi|em|u|e|i|om|ami|ach|iz[mu]|sk[aeyo]|k[aęiy])?\b/i,
  
  // Idiota, idioci i odmiany
  /\b(idiot[aąęoey]|idioci|idiotów|idiotom|idiotami|idiotach|idiotyzm[uy]?)\b/i,
  
  // Kretyn i odmiany
  /\bkretyn(a|owi|em|ie|i|ów|om|ami|ach|stw[oa]|sk[aeyo]|k[aęiy])?\b/i,
  
  // Cham, chamy i odmiany
  /\bcham(a|owi|em|ie|y|ów|om|ami|ach|sk[aieoy]|stw[oa]|ic[aę])?\b/i,
  
  // Głupi, głupek i odmiany
  /\b(głup(ek|ka|kowi|kiem|ku|cy|ków|i[aeyo]?|ot[aąęy]|iel[ea]))\b/i,
  
  // Baran i odmiany w kontekście inwektywy
  /\bbaran(a|owi|em|ie|y|ów|om|ami|ach)?\b/i,
  
  // Dureń, durnie i odmiany
  /\bdur(eń|nia|niowi|niem|niu|nie|ni|n[yąeio]|actw[ao])\b/i,
  
  // Ciul i odmiany
  /\bciul(a|owi|em|u|e|i|ów|om|ami|ach)?\b/i,
  
  // Wulgaryzmy: kurwa, chuj, pierdol, jeb, gówno, srać i wszelkie odmiany
  /\b(kurw|qurw)(a|o|ie|ę|ą|y|om|ami|ach|ic[aę]|iarz|isz|ić|ił[ao]?|isko)?\b/i,
  /\b(chuj|huj|chooy|hooy)(a|owi|em|u|e|ów|ami|ach|ow[yąe]|nia|ni[eą]|ojz[aey])?\b/i,
  /\bpierd(ol|alać|zielić|zieli|nąć|nięt[yąe]|zący|oln[yąe]|olący|olisc[ie]|olą|olił[ao]?)\b/i,
  /\b(jeb|yeb)(ać|ie|iemy|iecie|ią|ał|ała|ało|ali|an[eyą]|any|ana|ank[ao]|nij|nięt[yąe]|adł|adło|on[ey])?\b/i,
  /\b(spieprz|spierdal|wypierdal|odpieprz|odpierdol|dopierdol|przywal|odwal)(aj|ajcie|ać|asz|a|i|ił|iła|iło|ił[ay]|my|cie|onym?|ona|one)?\b/i,
  /\bgówn(o|a|em|ie|i[ao]|iarz[ey]?|ian[yąe]|ożerc[aey])?\b/i,
  /\b(sra[ćt]|sraczk[aęi]|nasra[ćł]|zasra[ćł]|wysra[ćł]|zesra[ćł])\b/i,
  /\b(sukinsyn|skurwysyn)(a|owi|em|ie|y|ów|om|ami|ach)?\b/i,
  /\b(pedał|cwel)(a|owi|em|u|e|i|ów)?\b/i,
  
  // Agresywne zwroty spławiające
  /\b(wypad\s+stąd|won\s+stąd|spadaj|odczep\s+się|odwal\s+się|idź\s+stąd)\b/i,
  
  // Agresja i obwinianie mieszkańca w różnych formach fleksyjnych
  /sam(a|i)?\s+(jesteś|jesteście|byłeś|byłaś|byliście)?\s*(sobie)?\s*win(ien|na|ni|naś|ieneś|i)/i,
  /(twoja|wasza|ich)\s+wina/i,
  /to\s+wina\s+(klienta|mieszkańca|pana|pani|zgłaszającego)/i,
  /nie\s+(nasz|mój|wasz)\s+problem/i,
  /nie\s+(nasza|moja|wasza)\s+sprawa/i,
  /nie\s+zawracaj\s+(nam|mi)?\s*(głowy|dupy)/i,
  /nie\s+obchodzi\s+(nas|mnie)/i,
  /(do|na)ucz\s+się/i,
  /nie\s+ma\s+takiej\s+opcji/i,
  /brak\s+słów\s+na\s+(pana|panią|klienta)/i,
  
  // Kary i dyscyplina pracownicza (zakaz ujawniania na zewnątrz)
  /\b(reprymend[aęy]?|nagan[aęy]?|kar[ęaey]?\s+finansow[aąey]?|dyscyplinar(n[yąe]|ka|nie)?|ukarany\s+kierowca|zwolniony\s+z\s+pracy|do\s+odpowiedzialności\s+służbowej)\b/i
];

/**
 * Niezależny moduł kontroli jakości treści przed wysyłką (Pre-Send Guardrail).
 * Działa ZAWSZE przy kliknięciu "Zatwierdź i wyślij wiadomość", również po ręcznej edycji przez pracownika.
 */
export function evaluateMessageQuality(content) {
  if (!content || !content.trim()) {
    return {
      isValid: false,
      blockedReason: "Treść wiadomości nie może być pusta.",
      issues: ["Pusta treść"]
    };
  }

  const trimmed = content.trim();
  const normalized = normalizeTextForFilter(trimmed);
  const matchedIssues = [];

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed) || pattern.test(normalized)) {
      matchedIssues.push(pattern.toString());
    }
  }

  if (matchedIssues.length > 0) {
    return {
      isValid: false,
      blockedReason: "Wiadomość nie spełnia standardów komunikacji z mieszkańcem. Popraw treść lub skorzystaj z asystenta AI.",
      issues: matchedIssues,
      forbiddenViolations: matchedIssues
    };
  }

  const hasGreeting = /dzień\s+dobry|witam|szanown/i.test(trimmed);
  const hasSignature = /elwoz|pok|kartuzy|zespół|poważaniem/i.test(trimmed);

  return {
    isValid: true,
    hasGreeting,
    hasSignature,
    issues: []
  };
}

/**
 * Lokalny symulator CX/PR AI dla trybu demonstracyjnego.
 * Ściśle zachowuje sens merytoryczny notatki pracownika.
 * NIGDY nie zmyśla niepotwierdzonych regulaminów, godzin (06:00), PSZOK ani działań kierownictwa.
 * Jeśli brakuje uzasadnienia odmowy lub kolejnego kroku, zgłasza sugestię uzupełnienia danych.
 */
export function simulateCxAiRefine(rawMessage, context = {}) {
  const text = (rawMessage || "").trim();
  const ticket = context.ticket || {};
  const currentStaff = context.staffName || "Anna Nowak";

  if (!text) {
    throw new Error("Wpisz roboczą notatkę przed uruchomieniem asystenta AI.");
  }

  const lower = text.toLowerCase();
  const normalized = normalizeTextForFilter(text);

  // 1. Sprawdzenie czy tekst zawiera wulgaryzmy lub inwektywy
  const hasForbidden = FORBIDDEN_PATTERNS.some(p => p.test(text) || p.test(normalized));

  // 2. Notatka bez wartości merytorycznej (sama inwektywa, spławienie, brak ustaleń)
  const isPureInsult = /^(spieprzaj\s+dziadu|odwal\s+się|spierdalaj|debil[a-z]*|pacan[a-z]*|brak\s+słów|idź\s+stąd)[!.]*$/i.test(text) ||
                       (hasForbidden && text.split(/\s+/).length <= 4 && !/(pojemnik|odbiór|work|adres|ulica|data|posesj|wymian|termin|jutro)/i.test(text));

  if (isPureInsult) {
    throw new Error("Notatka pracownika nie zawiera informacji merytorycznych niezbędnych do przygotowania odpowiedzi. Podaj faktyczne ustalenia operacyjne.");
  }

  // 3. Odmowa bez merytorycznego uzasadnienia lub bez dalszych kroków
  // Np. "NIE MA TAKIEJ OPCJI PACANIE", "Odmowa", "Nie zrobimy tego"
  const isRefusal = /nie\s+ma\s+takiej\s+opcji|odmow[aęy]|nie\s+zrobimy|nie\s+będzie\s+odbioru/i.test(lower);
  const hasSubstantiveReason = /(ze\s+względu\s+na|ponieważ|brak\s+deklaracj|nie\s+podlegaj|błędn|przepełnion|brak\s+dojazdu|gabaryt|opon)/i.test(lower);

  if (isRefusal && !hasSubstantiveReason) {
    throw new Error("Notatka zawiera odmowę, lecz brakuje merytorycznego uzasadnienia oraz informacji o dalszych krokach. Podaj powód odmowy lub proponowane rozwiązanie, zamiast generować niepotwierdzone informacje.");
  }

  // 4. Obwinianie mieszkańca bez faktów operacyjnych
  // Np. "To nie nasz problem, sam jesteś sobie winien"
  const isBlaming = /to\s+nie\s+nasz\s+problem|sam(a)?\s+jesteś\s+(sobie\s+)?win(ien|na)|twoja\s+wina/i.test(lower);
  const hasOperationalFacts = /(pojemnik|wystawion|odbiór|godzin|tras|posesj|bram|kierowca|rejon|gruz|odpad|frakcj)/i.test(lower);

  if (isBlaming && !hasOperationalFacts) {
    throw new Error("Notatka obwinia mieszkańca i nie zawiera informacji merytorycznych. Podaj faktyczne ustalenia ze zlecenia, aby przygotować profesjonalną odpowiedź.");
  }

  // 5. Kwestie dyscyplinarne bez faktów merytorycznych
  // Np. "Kierowca dostał reprymendę i ma przeprosić klienta"
  const hasReprimand = /reprymend|nagan|karę|dyscyplinar|ukarany/i.test(lower);
  const hasServiceResolution = /(zostanie\s+odebran|podjedziemy|wymienimy|zaplanowan|nowy\s+pojemnik|zrealizowan|odbiór)/i.test(lower);

  if (hasReprimand && !hasServiceResolution && !/(posesj|ulic|adres|pojemnik)/i.test(lower)) {
    throw new Error("Notatka odnosi się do wewnętrznych kwestii dyscyplinarnych personelu i nie zawiera informacji merytorycznych dla mieszkańca. Podaj faktyczne ustalenia operacyjne.");
  }

  // 6. Jeżeli w tekście występują wulgaryzmy i agresja, których lokalny symulator nie potrafi bezpiecznie oddzielić
  const hasSubstantiveContent = /(odebran|wymienion|podjedz|sprawdzim|zweryfikuj|adres|pojemnik|gruz|odpad|frakcj|posesj|ulic|data|termin|odbiór)/i.test(lower);
  if (hasForbidden && !hasSubstantiveContent) {
    throw new Error("Notatka zawiera niedopuszczalne treści i nie może zostać bezpiecznie przetworzona. Przeredaguj notatkę, zachowując wyłącznie fakty merytoryczne.");
  }

  // --- KOREKTA ZACHOWUJĄCA WYŁĄCZNIE FAKTY Z NOTATKI ---

  // Oczyszczenie tekstu z wulgaryzmów i wewnętrznych wzmianek o naganach kierowców
  let sanitized = text;
  sanitized = sanitized.replace(/(kierowca|pracownik|ładowacz|załoga)?\s*(dostał[a]?|otrzymał[a]?)\s*(reprymend[aęy]?|nagan[aęy]?|kar[ęaey]?)(\s*i\s*ma\s*przeprosić(\s*(klienta|mieszkańca|pana|panią))?)?[,.]?/gi, "");
  sanitized = sanitized.replace(/\b(i\s+)?ma\s+przeprosić(\s+(klienta|mieszkańca|pana|panią))?[,.]?/gi, "");
  for (const pattern of FORBIDDEN_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }
  sanitized = sanitized.replace(/^[,.\s-]+|[,.\s-]+$/g, "").replace(/\s{2,}/g, " ").trim();

  // SCENARIUSZ: Prośba o brakujący adres (gdy pracownik w notatce wskazał brak adresu)
  if (/brak.*adres|bez\s+podania\s+adresu|nie\s+ma\s+adresu/i.test(lower)) {
    return `Dzień dobry,

Dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach w sprawie zgłoszenia ${ticket.id || ''}.

W celu zrealizowania obsługi zgłoszenia uprzejmie prosimy o podanie dokładnego adresu nieruchomości (miejscowość, ulica, numer posesji).

Dane można przesłać zwrotnie w odpowiedzi na tę wiadomość lub przekazać telefonicznie pod numerem 58 681 22 99.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
  }

  // SCENARIUSZ: Działanie wykonane (potwierdzenie realizacji faktów podanych w notatce)
  if (/został\s+(dzisiaj\s+)?(wymieniony|odebrany|podstawiony|uprzątnięty)|wykonano|zrealizowano/i.test(lower)) {
    return `Dzień dobry,

Dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach w sprawie zgłoszenia ${ticket.id || ''}.

Informujemy, że zgłoszenie zostało zrealizowane: ${sanitized.charAt(0).toLowerCase() + sanitized.slice(1)}.

Dziękujemy za współpracę i wyrozumiałość.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
  }

  // SCENARIUSZ: Działanie planowane (precyzyjnie oznaczone jako plan, bez zmyślania narad kierownictwa ani terminów)
  if (/jutro|planowan|sprawdzimy|zweryfikujemy/i.test(lower)) {
    return `Dzień dobry,

Dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach w sprawie zgłoszenia ${ticket.id || ''}.

Informujemy o planowanych działaniach: ${sanitized.charAt(0).toLowerCase() + sanitized.slice(1)}.

O kolejnych krokach poinformujemy w odrębnej wiadomości.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
  }

  // SCENARIUSZ: Merytoryczna odmowa (posiada uzasadnienie podane przez pracownika)
  if (isRefusal && hasSubstantiveReason) {
    return `Dzień dobry,

Dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach w sprawie zgłoszenia ${ticket.id || ''}.

Uprzejmie informujemy, że wnioskowana usługa nie może zostać zrealizowana: ${sanitized.charAt(0).toLowerCase() + sanitized.slice(1)}.

W razie dodatkowych pytań zapraszamy do kontaktu z naszym biurem obsługi.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
  }

  // OGÓLNA KOREKTA ZACHOWUJĄCA WYŁĄCZNIE FAKTY Z NOTATKI
  return `Dzień dobry,

Dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach w sprawie zgłoszenia ${ticket.id || ''}.

Informujemy, że: ${sanitized.charAt(0).toLowerCase() + sanitized.slice(1)}.

W razie dodatkowych pytań pozostajemy do dyspozycji.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
}
