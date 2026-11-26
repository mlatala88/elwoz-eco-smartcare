/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Central CX & PR Guardrail, Quality Control & AI Assistant Simulator
 * 
 * Odpowiada za:
 * 1. Centralny prompt systemowy Customer Experience & Public Relations.
 * 2. Niezależną walidację jakościową wiadomości przed wysyłką (Pre-Send Guardrail).
 * 3. Bezpieczny lokalny symulator korekty AI obsługujący scenariusze A-H.
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

BEZWZGLĘDNE ZAKAZY REDAKCYJNE:
W generowanej lub poprawianej odpowiedzi kategorycznie NIE WOLNO:
1. Używać ani pozostawiać wulgaryzmów, wyzwisk, obelg, pogardliwych określeń ani inwektyw (np. "pacan", "dziad", "debil").
2. Stosować sarkazmu, złośliwości, ironii ani pasywnej agresji wymierzonej w mieszkańca.
3. Obwiniać mieszkańca ("sam jesteś sobie winien", "to nie nasz problem"). Zamiast obwiniania w sposób życzliwy wyjaśnia się procedury regulaminowe.
4. Ujawniać wewnętrznych kar, reprymend, nagan, postępowań dyscyplinarnych ani zwolnień kierowców lub ładowaczy.
5. Eskalować konfliktu ani odpowiadać agresją na agresję.
6. Wymyślać faktów, wykonanych działań, tras ani terminów, które nie wynikają z ustaleń.

ZASADA HUMAN-IN-THE-LOOP I OCHRONA PRAWDY:
- Jeżeli notatka pracownika zawiera wyłącznie obelgi lub brak informacji merytorycznych, AI NIE WYMYŚLA stanowiska spółki – odmawia wygenerowania tekstu i wzywa pracownika do podania faktów.
- Rozróżniaj działania PLANOWANE ("planujemy podjazd kontrolny jutro") od WYKONANYCH ("pojemnik został wymieniony").
- Jeżeli spółka odmawia realizacji prośby, przedstaw odmowę kulturalnie, podaj uzasadnienie proceduralne i wskaż alternatywne rozwiązanie (np. bezpłatny odbiór w PSZOK).

STRUKTURA ODPOWIEDZI:
1. Uprzejme powitanie (np. "Dzień dobry,").
2. Podziękowanie za kontakt z Punktem Obsługi Klienta w Kartuzach.
3. Potwierdzenie zrozumienia sedna problemu mieszkańca.
4. Wyrażenie empatii lub przeprosiny za uciążliwości (jeżeli uzasadnione).
5. Rzetelna informacja merytoryczna.
6. Jasno sprecyzowany kolejny krok i termin.
7. Oficjalna sygnatura POK Kartuzy ELWOZ ECO Sp. z o.o.`;

// Wzorce słownikowe i kontekstowe zakazanych wyrażeń
const FORBIDDEN_PATTERNS = [
  // Wulgaryzmy i inwektywy
  /\b(pacan|pacanie|pacana)\b/i,
  /\b(dziad|dziadu|dziada)\b/i,
  /\b(spieprzaj|spierdalaj|wypierdalaj|odpieprz|odwal)\b/i,
  /\b(debil|idiot|kretyn|cham|głupek|baron|baran|dureń)\b/i,
  /\b(chuj|kurw|jeb|pierd|gówn|srać|cholera)\b/i,
  
  // Agresja i obwinianie mieszkańca
  /sam\s+jesteś\s+(sobie\s+)?winien/i,
  /twoja\s+wina/i,
  /nie\s+nasz\s+problem/i,
  /nie\s+mój\s+problem/i,
  /nie\s+zawracaj\s+(nam\s+)?głowy/i,
  /nie\s+obchodzi\s+(nas|mnie)/i,
  /doucz\s+się/i,
  /naucz\s+się\s+(wreszcie\s+)?segreg/i,
  /nie\s+ma\s+takiej\s+opcji\b/i,
  
  // Wewnętrzne kary i reprymendy pracowników (zakaz ujawniania na zewnątrz)
  /\b(reprymend|nagan|karę\s+finansow|dyscyplinar|ukarany\s+kierowca|zwolniony\s+z\s+pracy)\b/i
];

/**
 * Niezależny moduł kontroli jakości treści przed wysyłką (Pre-Send Guardrail).
 * Działa ZAWSZE przy kliknięciu "Wyślij wiadomość", również po ręcznej edycji przez pracownika.
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
  const matchedIssues = [];

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      matchedIssues.push(pattern.toString());
    }
  }

  if (matchedIssues.length > 0) {
    return {
      isValid: false,
      blockedReason: "Wiadomość nie spełnia standardów komunikacji z mieszkańcem. Popraw treść lub skorzystaj z asystenta AI.",
      issues: matchedIssues
    };
  }

  // Weryfikacja czy wiadomość zawiera jakiekolwiek minimum uprzejmości i podpisu
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
 * Zaawansowany lokalny symulator CX/PR AI dla trybu demonstracyjnego.
 * Precyzyjnie modeluje zachowanie agenta AI dla scenariuszy A-H.
 */
export function simulateCxAiRefine(rawMessage, context = {}) {
  const text = (rawMessage || "").trim();
  const ticket = context.ticket || {};
  const currentStaff = context.staffName || "Anna Nowak";

  if (!text) {
    throw new Error("Wpisz roboczą notatkę przed uruchomieniem asystenta AI.");
  }

  const lower = text.toLowerCase();

  // SCENARIUSZ B: Notatka bez żadnej wartości merytorycznej (czysta inwektywa)
  // Np. "Spieprzaj dziadu", "Idź stąd", "Brak słów"
  const isPureInsult = /^(spieprzaj\s+dziadu|odwal\s+się|spierdalaj|debil|pacanie|brak\s+słów)[!.]*$/i.test(text) ||
                       (FORBIDDEN_PATTERNS.some(p => p.test(text)) && text.split(/\s+/).length <= 4 && !/(pojemnik|odbiór|work|adres|ulica|termin|jutro|godz)/i.test(text));

  if (isPureInsult) {
    throw new Error("Notatka pracownika nie zawiera informacji merytorycznych niezbędnych do przygotowania odpowiedzi. Podaj faktyczne ustalenia operacyjne.");
  }

  // SCENARIUSZ A: Agresywna odmowa ("NIE MA TAKIEJ OPCJI PACANIE")
  if (/nie\s+ma\s+takiej\s+opcji/i.test(lower) || (lower.includes("pacan") && lower.includes("opcji"))) {
    return `Dzień dobry,

Dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach w sprawie zgłoszenia ${ticket.id || ''}.

Uprzejmie informujemy, że z przyczyn formalno-regulaminowych oraz ze względu na obowiązujący harmonogram tras zbiórki nie mamy możliwości zrealizowania wnioskowanej usługi w proponowany sposób.

W celu znalezienia dogodnego rozwiązania zachęcamy do bezpłatnego skorzystania z Punktu Selektywnej Zbiórki Odpadów Komunalnych (PSZOK) w Kartuzach lub kontaktu z naszym biurem w celu ustalenia terminu w kolejnym cyklu odbioru.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
  }

  // SCENARIUSZ C: Obwinianie mieszkańca ("To nie nasz problem, sam jesteś sobie winien")
  if (/to\s+nie\s+nasz\s+problem/i.test(lower) || /sam\s+jesteś\s+(sobie\s+)?winien/i.test(lower)) {
    return `Dzień dobry,

Dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO. Odnosząc się do zgłoszenia ${ticket.id || ''}, pragniemy wyjaśnić uwarunkowania związane z prawidłowym przygotowaniem odpadów do odbioru.

Zgodnie z regulaminem utrzymania czystości i porządku na terenie gminy, pojemniki oraz worki powinny być wystawione przed posesję do godziny 06:00 w wyznaczonym dniu odbioru w miejscu łatwo dostępnym dla załogi. Brak spełnienia tych wytycznych uniemożliwia realizację usługi w standardowym trybie.

Chcemy pomóc w rozwiązaniu tej sytuacji – prosimy o wystawienie odpadów zgodnie z zasadami przy kolejnym planowanym terminie lub o kontakt w sprawie ewentualnego kursu uzupełniającego.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
  }

  // SCENARIUSZ D: Ujawnianie kar kierowcy ("Kierowca dostał reprymendę i ma przeprosić klienta")
  if (/reprymend|nagana|ukarany|zwolniony|ma\s+przeprosić/i.test(lower)) {
    return `Dzień dobry,

Dziękujemy za przekazanie zgłoszenia dotyczącego obsługi Państwa posesji (${ticket.city || 'rejon Kartuz'}, ul. ${ticket.street || ''} ${ticket.houseNumber || ''}).

Przepraszamy za zaistniałe niedogodności i uchybienia w standardzie realizacji usługi. Sprawa została niezwłocznie skierowana do kierownictwa działu transportu w celu weryfikacji procedur jakościowych załogi obsługującej ten rejon. Zapewniamy, że dołożymy wszelkich starań, aby podobna sytuacja nie powtórzyła się w przyszłości.

O podjętych krokach operacyjnych poinformujemy Państwa niezwłocznie.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
  }

  // SCENARIUSZ G: Odmowa bez adresu ("Nie możemy zrealizować dodatkowego odbioru bez podania adresu")
  if (/nie\s+możemy.*(bez\s+podania\s+adresu|brak.*adres)/i.test(lower)) {
    return `Dzień dobry,

Dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach w sprawie zgłoszenia ${ticket.id || ''}.

Chcemy jak najszybciej skierować pojazd po odbiór odpadów, jednak do prawidłowego zaplanowania trasy dyspozytorskiej niezbędne jest wskazanie dokładnego adresu nieruchomości (miejscowość, nazwa ulicy oraz numer posesji).

Uprzejmie prosimy o przesłanie brakujących danych w odpowiedzi na tę wiadomość lub telefonicznie pod numerem 58 681 22 99, co pozwoli nam natychmiast zlecić podjazd załodze rejonowej.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
  }

  // SCENARIUSZ E: Działanie planowane ("Jutro sprawdzimy możliwość wymiany pojemnika")
  if (/jutro|planowan|sprawdzimy|zweryfikujemy/i.test(lower)) {
    let cleanInfo = text.replace(/kierowca\s+dostał\s+naganę/gi, "").trim();
    return `Dzień dobry,

Dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach.

Informujemy o przyjęciu zgłoszenia ${ticket.id || ''}. Zgodnie z ustaleniami z dyspozytornią, informujemy o planowanych działaniach: ${cleanInfo.charAt(0).toLowerCase() + cleanInfo.slice(1)}.

O wyniku weryfikacji i dokładnym terminie realizacji poinformujemy Państwa w kolejnej wiadomości.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
  }

  // SCENARIUSZ F: Działanie wykonane ("Pojemnik został dzisiaj wymieniony")
  if (/został\s+(dzisiaj\s+)?(wymieniony|odebrany|podstawiony|uprzątnięty)|wykonano|zrealizowano/i.test(lower)) {
    return `Dzień dobry,

Dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach.

Z przyjemnością informujemy, że zgłoszenie ${ticket.id || ''} zostało pomyślnie zrealizowane: ${text.charAt(0).toLowerCase() + text.slice(1)}.

Dziękujemy za współpracę i wyrozumiałość. W razie dodatkowych pytań pozostajemy do dyspozycji.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
  }

  // OGÓLNA KOREKTA Z USUWANIEM NIEPOŻĄDANYCH ZWROTÓW
  let sanitized = text;
  for (const pattern of FORBIDDEN_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }
  sanitized = sanitized.replace(/\s{2,}/g, " ").trim();

  return `Dzień dobry,

Dziękujemy za kontakt z Punktem Obsługi Klienta ELWOZ ECO w Kartuzach w sprawie zgłoszenia ${ticket.id || ''}.

Informujemy, że: ${sanitized.charAt(0).toLowerCase() + sanitized.slice(1)}.

W razie dodatkowych pytań pozostajemy do Państwa dyspozycji.

Z poważaniem,
${currentStaff}
Punkt Obsługi Klienta w Kartuzach
ELWOZ ECO Sp. z o.o.
tel. 58 681 22 99 | kontakt@example.com`;
}
