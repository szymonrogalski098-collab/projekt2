# PROJEKT 2 (UKRYTY PRZED GRACZEM) — robocza nazwa: "PRZEŁĘCZ"

## Założenia
- Gracz: Szymon, lubi wyzwania, wcześniejsza gra (edukacyjna, łagodna) była za łatwa i za krótka (~1 h). Teraz: **trudna gra umiejętnościowa**, 6–10 h do ukończenia kampanii, 15+ h do wszystkich złotych medali. Nauka ma być "nieliteralna" — gracz uczy się opanowania trudnej umiejętności, nie teorii. Zero wykładów.
- Platforma: przeglądarka, three.js, jeden plik HTML, wszystko proceduralne (teren, tekstury, dźwięk). RTX 3060, cel 60 FPS 1440p.
- Grafika: realizm (PBR, fizyczne niebo, cienie kaskadowe, mgła atmosferyczna, chmury wolumetryczne niskiej rozdzielczości, woda z odbiciami SSR/planar, noc z reflektorem).

## Premisa
Jesteś pilotem lekkiego śmigłowca w firmie usług lotniczych w wysokich górach. Zaczynasz jako nowicjusz na starym, słabym śmigłowcu. Wykonujesz zlecenia: transport ładunków na linie, lądowania w trudnych miejscach, akcje ratunkowe, gaszenie pożarów, loty nocne i w złej pogodzie. Zarabiasz, naprawiasz, kupujesz lepsze maszyny, awansujesz. Finał: wielka akcja ratunkowa w burzy po lawinie.

## Serce gry: model lotu (musi być świetny)
- Fizyka bryły sztywnej 6DOF, stały krok 120 Hz, niezależny od FPS.
- Siły: ciąg wirnika (zależny od skoku ogólnego, gęstości powietrza = wysokość + temperatura, prędkości obrotowej wirnika), efekt przypowierzchniowy (ground effect, <1 średnica wirnika), translational lift (wzrost wydajności powyżej ~15 węzłów), vortex ring state (szybkie opadanie pionowe z małą prędkością poziomą → utrata ciągu — kluczowa pułapka dla zaawansowanych), moment obrotowy wirnika kompensowany śmigłem ogonowym (pedały), opór, bezwładność, wiatr (pole wektorowe z turbulencją, rotory za graniami, prądy wstępujące/zstępujące na zboczach nasłonecznionych/zawietrznych).
- Moc silnika ograniczona: przeciążenie → spadek obrotów wirnika (ostrzeżenie dźwiękowe i HUD), rotor droop.
- Autorotacja przy awarii silnika (misje awaryjne + losowe awarie w trybie Hardcore).
- Uszkodzenia: twarde lądowanie (prędkość pionowa progi), uderzenie łopat o przeszkodę = katastrofa, przegrzanie, przeciążenie konstrukcji. Koszty naprawy.
- **Ładunek na linie (sling load):** fizyka wahadła z liną sprężystą (Verlet, kilka segmentów), ładunki o różnej masie i oporze (belki się obracają, zbiorniki kołyszą). Odczepienie precyzyjne w strefie docelowej. To główne źródło trudności i satysfakcji.
- Wciągarka ratownicza: opuszczanie ratownika na linie do poszkodowanego na półce skalnej — trzeba utrzymać zawis w wietrze przy ścianie.

## Sterowanie (klawiatura+mysz domyślnie, pad opcjonalnie)
- Mysz = drążek cykliczny (przechylenie przód/tył/boki), W/S = skok ogólny (stopniowy, zapamiętuje pozycję), A/D = pedały, Shift = precyzyjny tryb (mniejsza czułość), Spacja = hak/wciągarka akcja, C = kamera (kokpit / za śmigłowcem / widok w dół na hak), R = restart misji, Esc = pauza.
- Pad (Gamepad API): lewa gałka skok+pedały, prawa cykliczny — pełne wsparcie + ustawienia martwej strefy i krzywych.
- **Poziomy asysty** (wybór w ustawieniach i przy misji): Pełna (stabilizacja pozycji, auto-pedały), Częściowa (stabilizacja postawy — domyślna na start), Brak (realizm). Mnożnik wypłaty/medali: złote medale tylko przy Częściowej lub Brak; osiągnięcia "Bez asysty".
- Czułość, odwracanie osi, krzywe ekspo, rebinding klawiszy.

## Świat
- Region ~8×8 km: dolina z miasteczkiem i lądowiskiem bazy, jezioro, las, hale, lodowiec, grań z przełęczą, schronisko, kolejka linowa (przewody = zabójcze przeszkody), tama, budowa masztu, droga serpentyn.
- Teren: heightmap proceduralny (erozja hydrauliczna uproszczona, offline przy generacji z seeda) + LOD (quadtree/geoclipmap), materiały wg nachylenia/wysokości (trawa, skała, piarg, śnieg), lasy instancjonowane z impostorami.
- Pora dnia i pogoda per misja: słońce, pochmurno, mgła w dolinach, wiatr halny, burza śnieżna, noc (reflektor, NVG w późniejszej maszynie).

## Kampania (6 rozdziałów, ~40 misji + zlecenia losowe)
1. **Nowicjusz** — pierwszy lot (onboarding: zawis, przemieszczanie, lądowanie), lądowanie na łące, dostawa do schroniska, pierwszy ładunek na linie (lekki), lądowanie na pochyłym zboczu.
2. **Budowa** — transport belek i betonu na budowę masztu (precyzyjne odczepienie), montaż segmentu masztu (ustawienie ładunku w oknie ±0,5 m), lot między przewodami kolejki.
3. **Góry** — lądowanie na grani (wirnik nad przepaścią, jedna płoza), rotor za granią przy wietrze, loty na dużej wysokości (słaby ciąg — trzeba zrzucić paliwo/ładunek), dostawa do schroniska przy halnym.
4. **Ratownictwo** — wciągarka: poszkodowany w żlebie, na półce ściany, w szczelinie lodowca (ciasno), w jeziorze; ograniczenie czasu (stan poszkodowanego).
5. **Ogień i noc** — gaszenie pożaru lasu wiadrem (nabieranie wody z jeziora w zawisie nad powierzchnią, zrzut w dym i prądy termiczne), nocna ewakuacja z reflektorem, awaria silnika → autorotacja do lądowania.
6. **Burza** — finał wieloetapowy: lawina, kilku poszkodowanych, pogarszająca się widoczność, ograniczone paliwo, trzeba tankować w bazie tymczasowej; wybór kolejności ratunków.
- Każda misja: cele główne + 3 medale (brąz = ukończenie, srebro = czas/precyzja, złoto = bardzo wymagające, ustalone względem autopilota referencyjnego z marginesem, np. 115% czasu autopilota i bez uszkodzeń). Kampania wymaga tylko brązu, ale odblokowanie niektórych maszyn wymaga srebra/złota.
- **Zlecenia losowe** z tablicy w bazie (proceduralne: dostawa/wyciągnięcie/lądowanie/obserwacja) — grind pieniędzy i trening; generator dopasowuje trudność.
- **Wyzwania** (odblokowywane): slalom między przewodami, "jedna kropla" — przewieź pełną szklankę wody na linie (wskaźnik chlapania), precyzyjne odłożenie jajka (ładunek kruchy, max prędkość uderzenia).
- **Tryb Hardcore** po ukończeniu kampanii: bez asyst, losowe awarie, prawdziwy zużyty sprzęt, jeden zapis.

## Ekonomia i progresja
- Pieniądze za misje; koszty: paliwo, naprawy, ubezpieczenie (utrata maszyny = duży koszt, ale nie game over — pożyczka).
- 4 śmigłowce: stary lekki tłokowy (słaby na wysokości), lekki turbinowy, średni z wciągarką i reflektorem, mocny dwusilnikowy (finał). Każdy ma inny charakter lotu (bezwładność, moc, rozmiar wirnika — trudniejsze w ciasnych miejscach).
- Ulepszenia: mocniejszy hak, dłuższa lina, lepsze reflektory, NVG, dodatkowy zbiornik, kamera haka.
- Licencje pilota (stopnie) = zdane egzaminy (wymagające misje-testy) odblokowują rozdziały. Egzaminy to główne "bramki trudności".

## UI / UX
- Zasady: realizm + czytelność. HUD minimalny, zdejmowalny. Kokpit 3D z działającymi przyrządami (prędkościomierz, wysokościomierz, wariometr, obrotomierz wirnika/silnika, temperatura, paliwo, sztuczny horyzont) — w widoku zewnętrznym te same dane jako czysty HUD w rogu.
- Najważniejsze wskaźniki dodatkowe (włączalne): prędkość pionowa przy ziemi (kolorowy pasek przy lądowaniu), wektor wiatru, cień/marker punktu pod hakiem, strefa docelowa jako pierścień na ziemi, strzałka kierunku do celu z odległością.
- Ostrzeżenia: dźwięk niskich obrotów wirnika (klasyczny ton), migający napis, bez przesady.
- Menu: baza jako hub 3D (hangar z maszyną, tablica zleceń, warsztat, dziennik pilota ze statystykami i medalami), sterowanie myszą. Wybór misji z mapy regionu (widok z góry terenu).
- Brief misji: krótki (cel, pogoda, masa ładunku, paliwo, medale), bez ścian tekstu. Debrief: medale, czas, twardość lądowania, wykres wysokości/prędkości, powtórka (replay z kamerą swobodną — zapis stanów co tick), przycisk "Spróbuj ponownie" natychmiast.
- **Szybki restart**: R w trakcie misji → restart <1 s. Opcjonalne checkpointy w długich misjach.
- Onboarding: pierwsza misja to lot z instruktorem (głos syntezowany niepotrzebny — tekst w radiu u dołu ekranu), prowadzi krok po kroku przez zawis, ale gracz się uczy przez robienie; podpowiedzi kontekstowe tylko gdy gracz się męczy (np. 3 twarde lądowania → wskazówka o prędkości pionowej).
- Krzywa trudności: pierwsza godzina ma być przystępna (asysta Częściowa), potem rośnie stromo. Frustracja łagodzona szybkim restartem, replayami i jasną informacją CO poszło źle (debrief: "Uderzenie łopat o skałę przy 14 m/s wiatru bocznym" / "Opadanie 4,2 m/s przy prędkości 5 kt — wir pierścieniowy").
- Ustawienia: grafika (Niska–Ultra + auto), FOV, czułość, asysty, jednostki (metryczne domyślnie / lotnicze), głośność, ograniczenie ruchu kamery.
- Zapis: localStorage (try/catch) + eksport kodu zapisu (base64) w menu.
- Typografia: system-ui, liczby tabular. Paleta HUD: biały/zielony lotniczy, ostrzeżenia bursztyn/czerwony. Kontrast sprawdzany na zrzutach.

## Dźwięk (WebAudio, proceduralny)
- Wirnik: modulowany szum + harmoniczne zależne od obrotów i obciążenia (charakterystyczne "łopotanie" przy manewrach), turbina (wysoki świst), wiatr, alarm niskich obrotów, trzask uderzenia, radio (krótki szum przed komunikatem). Dźwięk jest ważną informacją zwrotną o obciążeniu.

## Architektura
```
src/core     (pętla stałokrokowa, rng seed, input+gamepad, save, events)
src/sim      (heli.js model lotu, rotor.js, wind.js pole wiatru, sling.js lina Verlet, winch.js, damage.js, fuel.js, bucket.js)
src/world    (terrain gen+erozja, LOD, materiały, lasy, obiekty: baza, schronisko, maszt, kolejka+przewody, tama, miasteczko; woda; sky; weather; fire)
src/render   (post: ACES, SSAO, bloom lekki, mgła atmosferyczna, chmury; quality tiers)
src/game     (missions defs, objectives, medals, career, economy, contracts generator, exams, replay)
src/ui       (hud, cockpit instruments, menus, hub, briefs, debrief z wykresem, settings)
src/audio
src/debug    (window.__game przy ?debug)
tools/       (shot.mjs, bot.mjs, perf.mjs)
```
- Symulacja w pełni oddzielona od renderu i deterministyczna (seed + zapis wejść) → replaye i testy.

## Weryfikacja (obowiązkowa, Claude Code robi sam)
- **Autopilot referencyjny** (kaskadowe PID: pozycja→prędkość→postawa→sterowanie, + kontroler tłumienia wahadła ładunku) przechodzi KAŻDĄ misję przez te same wejścia co gracz (wirtualny drążek, nie teleport). Dowód wykonalności; złoto ustalane z jego czasu z marginesem. Test w symulacji bez renderu, wielokrotnie z różnymi seedami wiatru.
- **Test "zbyt łatwe"**: prosty kontroler naiwny (bez kompensacji wiatru/wahadła) NIE może zdobyć srebra w misjach od rozdziału 2 wzwyż.
- Testy jednostkowe fizyki: zawis przy maks. masie na różnych wysokościach zgodny z tabelą osiągów maszyny; ground effect; VRS występuje w zadanych warunkach; autorotacja pozwala wylądować; energia wahadła maleje z tłumieniem.
- Zrzuty Playwright z GPU dla każdej misji: start, w trakcie (kamera zewn.), kokpit, widok haka, debrief — oglądać każdy PNG i poprawiać realizm, oświetlenie, czytelność HUD, kontrast.
- Wydajność: pomiar FPS w najcięższej misji (burza + las + noc), renderer.info (≤200 draw calls, 1 światło z cieniem + reflektor bez cienia lub z tanim).
- Konsola bez błędów. Test zapisu/wczytania i kodu zapisu. Test pada: symulowany Gamepad API.
- Świeże oko: subagent dostaje tylko zrzuty onboardingu + teksty UI (bez DESIGN.md) → musi poprawnie powiedzieć, jak wystartować i co jest celem.
- Test gry ręcznej przez przyciskanie klawiszy w Playwright w misji 1 (czy da się wystartować i wylądować na asyście Częściowej sekwencją prostych wejść).

## Plan budowy
- Etap 1: symulacja lotu + teren doliny + baza + HUD/kokpit + rozdział 1 + egzamin 1 + autopilot/testy → grywalne.
- Etap 2: lina, wciągarka, pogoda, rozdziały 2–4, ekonomia, hub, zlecenia losowe, replaye.
- Etap 3: ogień, noc, autorotacja, rozdziały 5–6, wyzwania, Hardcore, 4 maszyny, polish, pełna weryfikacja.
