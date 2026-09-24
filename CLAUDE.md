# Instrukcje dla Claude Code — PRZECZYTAJ CAŁOŚĆ PRZED PIERWSZĄ AKCJĄ

## Kontekst
Budujesz kompletną, TRUDNĄ grę 3D w przeglądarce według `docs/DESIGN.md`. Właściciel repo (Szymon) będzie w nią grał,
ale **nie może poznać gry przed zagraniem** — to warunek nadrzędny, ważniejszy od wygody raportowania.

## ZASADY TAJEMNICY (bezwzględne)
1. W wiadomościach do użytkownika NIE opisuj gry: żadnej fabuły, mechanik, poziomów, grafiki, tematu, nazw narzędzi, słów kluczowych z DESIGN.md.
   Dozwolone komunikaty: postęp etapu w procentach/numerach ("Etap 1/3: 60%"), pytania techniczne o środowisko (np. brak Node), błędy instalacji, "Gotowe — otwórz GRAJ.html".
2. Commit messages neutralne: `etap 1: postęp`, `etap 1: poprawki`, `etap 2: gotowy`. Zero opisu treści.
3. Nigdy nie otwieraj w przeglądarce użytkownika okien z grą ani zrzutów. Zrzuty zapisuj tylko do `shots/` (w .gitignore).
4. Nie pytaj użytkownika o decyzje projektowe — wszystkie są w DESIGN.md; jeśli czegoś brakuje, zdecyduj sam zgodnie z duchem dokumentu.
5. Tytuł strony (`<title>`) i ekran startowy mogą pokazywać nazwę gry — to jedyne, co gracz zobaczy przed grą.
6. Jeśli użytkownik zapyta "co robisz?", odpowiedz ogólnie: "Buduję i testuję etap N" — bez szczegółów.

## Stos
- Vite + three.js, wynik: jeden samowystarczalny plik HTML (vite-plugin-singlefile). `npm run build` → `dist/index.html` + kopia `GRAJ.html` w katalogu głównym.
- Zero zasobów z sieci w runtime: tekstury, geometria, niebo, dźwięk — wszystko proceduralne (canvas/shader/WebAudio). Fonty systemowe.
- Język UI: polski. Pseudokod w Dzienniku: w stylu C# (gracz zna C#).
- Docelowy sprzęt: Ryzen 5 5500, RTX 3060, 32 GB RAM, Chrome/Edge. Cel: 60 FPS w 1440p na jakości Wysokiej.

## Przebieg pracy
Pracuj autonomicznie w 3 etapach (sekcja "Plan budowy" w DESIGN.md). Po każdym etapie:
1. `npm run build`, pełna weryfikacja (niżej), poprawki aż wszystko przechodzi.
2. `git add -A && git commit -m "etap N: gotowy" && git push`.
3. Jedna linia do użytkownika: "Etap N/3 gotowy — możesz grać w GRAJ.html (dostępne rozdziały: X)." i kontynuuj następny etap bez czekania.

## Weryfikacja (obowiązkowa, sam — użytkownik NIE testuje)
Zbuduj i używaj, zgodnie z sekcją "Weryfikacja" w DESIGN.md:
- `window.__game` debug API (tylko przy `?debug` w URL): setLevel, teleport, setFog, capture(preset), renderOnce, runBot, stats.
- Zrzuty Playwright (tu masz prawdziwe GPU — uruchamiaj Chromium z akceleracją; jeśli WebGL nie działa headless, użyj `headless: false` z oknem poza ekranem lub `--use-angle=d3d11`). Dla każdej misji: presety kamer {gracz, mgła-off, z góry, koniec}. **Oglądaj każdy zrzut** (Read na PNG) i poprawiaj: oświetlenie, skala, czytelność HUD, kontrast tekstu, brak artefaktów, brak czarnych/białych ekranów.
- Bot na symulacji bez renderu: autopilot referencyjny i kontroler naiwny wg DESIGN.md. Setki prób, sprawdzenie progów gwiazdek i braku soft-locków.
- Wydajność: `renderer.info` — ≤150 draw calls, ≤1,5 M trójkątów, 1 światło z cieniem; pomiar FPS w Playwright z GPU.
- Konsola: zero błędów i ostrzeżeń WebGL.
- Świeże oko: uruchom subagenta, który dostaje TYLKO zrzuty onboardingu i teksty UI (bez DESIGN.md i kodu) i ma odpowiedzieć "co mam zrobić?". Jeśli odpowiada źle — popraw onboarding.
- Pełny przebieg: od ekranu startowego przez misję → debrief → hub → mapę → zapis/wczytanie (także kod postępu).

## Jakość
- Grafika ma wyglądać realistycznie (PBR, dobre światło, atmosfera) — patrz DESIGN.md. Lighting first.
- UI/UX wg sekcji "UI / UX" — to jest równie ważne jak mechanika.
- Kod modułowy wg sekcji "Architektura", jedna ścieżka logiki dla gracza i bota.

## Najważniejsze dla tego projektu
- Gracz chce WYZWANIA. Poprzednia gra była za łatwa i za krótka. Nie upraszczaj modelu lotu ani misji "dla wygody". Łagodność tylko w pierwszej godzinie.
- Model lotu jest sercem gry — poświęć mu najwięcej czasu i testów (sekcja "Serce gry" i "Weryfikacja").
- Plan ma 3 etapy (sekcja "Plan budowy"). Po każdym: commit, push, jedna linia do użytkownika.
