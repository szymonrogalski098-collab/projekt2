// Definicje misji kampanii. Czasy medali złotych/srebrnych liczone z czasu autopilota (medals-ref.js).
import { BASE, MEADOW, HUT, HALA, SLOPE_SITE, RESERVOIR, valleyX } from '../world/layout.js';

export const CHAPTERS = [
  { n: 1, title: 'Nowicjusz', desc: 'Pierwsze loty starym Wróblem. Zawis, lądowania, pierwszy ładunek.' },
  { n: 2, title: 'Budowa', desc: 'Belki, beton i segmenty masztu. Precyzja co do pół metra.' },
  { n: 3, title: 'Góry', desc: 'Granie, rotory za przełęczą, rzadkie powietrze.' },
  { n: 4, title: 'Ratownictwo', desc: 'Wciągarka, półki skalne, szczeliny lodowca.' },
  { n: 5, title: 'Ogień i noc', desc: 'Wiadro, dym, reflektor i autorotacja.' },
  { n: 6, title: 'Burza', desc: 'Lawina. Wszystko naraz.' },
];

const V = z => ({ x: valleyX(z) + 40, z });

export const MISSIONS = [
  {
    id: 'c1m1', chapter: 1, title: 'Pierwszy lot', aircraft: 'wrobel', assist: 'partial', tutorial: true,
    brief: 'Lot z instruktorem na lądowisku bazy. Zawis, obrót, przelot kilkadziesiąt metrów i lądowanie.',
    time: 10.5, weather: { wind: { dir: 250, speed: 1.5, gust: 0.5, turb: 0.1 }, clouds: 0.25, fog: 0.1 },
    start: { at: 'pad:base1', heading: 180 }, fuel: 30,
    objectives: [
      { type: 'hover', at: 'pad:base1', agl: [2, 7], r: 10, hold: 4, text: 'Zawiśnij 2–7 m nad lądowiskiem',
        radio: 'Silnik pracuje, obroty 100%. Przytrzymaj W – skok ogólny w górę. Gdy się oderwiesz, puść W i łap zawis na 2–7 metrach. Mysz to drążek: małe ruchy.' },
      { type: 'heading', toward: { x: BASE.x + 58, z: BASE.z + 44 }, tol: 12, hold: 2, inAir: true, text: 'Obróć się nosem do rękawa wiatrowego',
        radio: 'Dobrze. Teraz pedały: A i D obracają śmigłowiec. Ustaw nos na pomarańczowy rękaw wiatrowy.' },
      { type: 'hover', at: { x: BASE.x, z: BASE.z + 85 }, agl: [2, 10], r: 7, hold: 3, text: 'Przeleć nad żółty znacznik i zawiśnij',
        radio: 'Przelecimy nad żółty znacznik 65 metrów na południe. Pochyl drążek w jego stronę, a przed nim wyhamuj, odchylając drążek do tyłu.' },
      { type: 'hover', at: 'pad:base1', agl: [2, 8], r: 6, hold: 3, text: 'Wróć nad lądowisko',
        radio: 'Świetnie. Wracamy nad lądowisko. Spokojnie, bez pośpiechu.' },
      { type: 'land', at: 'pad:base1', r: 6, hold: 2, text: 'Wyląduj łagodnie na lądowisku',
        radio: 'Lądujemy. Zmniejszaj skok (S) powoli – przy ziemi opadaj wolniej niż pół metra na sekundę. Po przyziemieniu opuść skok do końca.' },
    ],
    radio: { start: 'Instruktor: Witaj w firmie. Dziś tylko podstawy – zrób to po swojemu, będę podpowiadał.', success: 'Instruktor: Wylądowane. Nieźle jak na pierwszy raz.' },
    medals: { silver: { impact: 1.0 }, gold: { impact: 0.5 } },
  },
  {
    id: 'c1m2', chapter: 1, title: 'Polana', aircraft: 'wrobel', assist: 'partial',
    brief: 'Przeleć nad lasem na polanę na zachodnim zboczu i wyląduj w wyznaczonym kręgu.',
    time: 11, weather: { wind: { dir: 230, speed: 3, gust: 1.5, turb: 0.25 }, clouds: 0.35, fog: 0.15 },
    start: { at: 'pad:base1', heading: 0 }, fuel: 30,
    objectives: [
      { type: 'waypoint', at: { x: MEADOW.x, z: MEADOW.z }, r: 250, botAgl: 80, text: 'Leć na polanę', radio: 'Baza: Polana jest na zachodnim zboczu, na północny zachód od bazy. Uważaj na linię energetyczną wzdłuż doliny.' },
      { type: 'land', at: { x: MEADOW.x, z: MEADOW.z }, r: 8, hold: 3, text: 'Wyląduj w kręgu', radio: 'Baza: Widzisz krąg? Podejście pod wiatr, łagodnie.' },
    ],
    radio: { success: 'Baza: Stoisz na polanie. Dobra robota.' },
    medals: { silver: { impact: 1.0, dist: 5 }, gold: { impact: 0.6, dist: 2.5 } },
  },
  {
    id: 'c1m3', chapter: 1, title: 'Dostawa do schroniska', aircraft: 'wrobel', assist: 'partial',
    brief: 'Zaopatrzenie w kabinie (60 kg). Lądowisko schroniska leży wysoko – mniej mocy, wiatr zachodni.',
    time: 9.5, weather: { wind: { dir: 265, speed: 6, gust: 2.5, turb: 0.35 }, clouds: 0.4, fog: 0.1, dT: 3 },
    start: { at: 'pad:base1', heading: 0 }, fuel: 34, cargo: 60,
    objectives: [
      { type: 'waypoint', at: { x: HUT.x, z: HUT.z }, r: 300, botAgl: 120, text: 'Leć do schroniska', radio: 'Baza: Schronisko na wschodnim zboczu, na północ. Nad lądowiskiem wieje z zachodu – podchodź pod wiatr.' },
      { type: 'land', at: 'pad:hut', hold: 3, text: 'Wyląduj na lądowisku schroniska', radio: 'Gospodarz: Czekamy! Lądowisko obok budynku, uważaj na dach.' },
    ],
    radio: { success: 'Gospodarz: Jest towar. Dzięki!' },
    medals: { silver: { impact: 1.0, dist: 3 }, gold: { impact: 0.6, dist: 1.8 } },
  },
  {
    id: 'c1m4', chapter: 1, title: 'Pierwszy ładunek', aircraft: 'wrobel', assist: 'partial', line: true,
    brief: 'Lina 12 m. Podczep skrzynię (90 kg) przy bazie, odstaw ją na hali w kręgu i wróć.',
    time: 13, weather: { wind: { dir: 200, speed: 3, gust: 1, turb: 0.2 }, clouds: 0.3, fog: 0.05 },
    start: { at: 'pad:base1', heading: 90 }, fuel: 28,
    loads: [{ id: 'crate', kind: 'crate', name: 'Skrzynia', mass: 90, size: [1.2, 1.0, 1.2], cda: 1.3, at: { x: BASE.x - 60, z: BASE.z + 75 } }],
    objectives: [
      { type: 'hook', load: 'crate', text: 'Zawiśnij hakiem nad skrzynią i naciśnij Spację', radio: 'Baza: Lina wisi 12 metrów pod tobą. Ustaw hak nad skrzynią – kamera C pokaże widok w dół. Spacja podczepia.' },
      { type: 'deliver', load: 'crate', at: { x: HALA.x - 120, z: HALA.z + 60 }, r: 7, text: 'Odstaw skrzynię w kręgu na hali (Spacja odczepia)', radio: 'Baza: Leć spokojnie, ładunek będzie się kołysał. Nad kręgiem opuść go na ziemię i dopiero wtedy odczep.' },
      { type: 'land', at: 'pad:base1', hold: 2, text: 'Wróć do bazy i wyląduj', radio: 'Baza: Dobrze. Wracaj, lina zostaje pod tobą – przy lądowaniu zejdź powoli.' },
    ],
    radio: { success: 'Baza: Pierwszy ładunek dowieziony.' },
    medals: { silver: { impact: 1.0, dist: 4, loadImpact: 1.5 }, gold: { impact: 0.7, dist: 2, loadImpact: 0.8 } },
  },
  {
    id: 'c1m5', chapter: 1, title: 'Pochyłe zbocze', aircraft: 'wrobel', assist: 'partial',
    brief: 'Lądowanie na zboczu o nachyleniu 10°. Najpierw płoza od strony stoku, potem powoli druga.',
    time: 15, weather: { wind: { dir: 290, speed: 4, gust: 1.5, turb: 0.3 }, clouds: 0.5, fog: 0.1 },
    start: { at: 'pad:base1', heading: 270 }, fuel: 30,
    objectives: [
      { type: 'waypoint', at: { x: SLOPE_SITE.x, z: SLOPE_SITE.z }, r: 220, botAgl: 70, text: 'Leć na zbocze z chorągiewkami', radio: 'Baza: Zbocze z chorągiewkami na zachodzie, za tamą na południe. Ustaw się bokiem do stoku.' },
      { type: 'land', at: { x: SLOPE_SITE.x, z: SLOPE_SITE.z }, r: 7, hold: 5, slope: true, text: 'Wyląduj na zboczu i utrzymaj 5 s', radio: 'Baza: Dotknij płozą od strony stoku, drążek lekko w stronę zbocza, i powoli opuszczaj skok.' },
      { type: 'land', at: 'pad:base1', hold: 2, text: 'Wróć do bazy', radio: 'Baza: Stało. Wracaj do bazy.' },
    ],
    radio: { success: 'Baza: Zbocze zaliczone.' },
    medals: { silver: { impact: 1.0, dist: 4 }, gold: { impact: 0.6, dist: 2 } },
  },
  {
    id: 'c1ex', chapter: 1, exam: true, title: 'Egzamin: licencja I', aircraft: 'wrobel', assist: 'partial',
    brief: 'Egzamin praktyczny. Trzy bramki nad doliną, precyzyjny zawis nad tamą, lądowanie na dachu budynku bazy. Twarde lądowanie = niezaliczone.',
    time: 16.5, weather: { wind: { dir: 240, speed: 5, gust: 2, turb: 0.35 }, clouds: 0.45, fog: 0.1 },
    start: { at: 'pad:base2', heading: 0 }, fuel: 32,
    limits: { time: 600 },
    objectives: [
      { type: 'gate', at: { ...V(1700) }, agl: 35, r: 14, dir: 0, label: '1', text: 'Bramka 1', radio: 'Egzaminator: Trzy bramki na północ wzdłuż doliny, około 35 m nad ziemią. Potem tama.' },
      { type: 'gate', at: { ...V(1150) }, agl: 35, r: 14, dir: 350, label: '2', text: 'Bramka 2' },
      { type: 'gate', at: { x: valleyX(700) - 120, z: 700 }, agl: 40, r: 14, dir: 300, label: '3', text: 'Bramka 3' },
      { type: 'hover', at: { x: RESERVOIR.damX, z: RESERVOIR.damZ + 30, y: RESERVOIR.crest }, agl: [3, 6], r: 3, hold: 8, maxSpeed: 1.5, text: 'Zawis nad znacznikiem na koronie tamy (3–6 m, ±3 m, 8 s)', radio: 'Egzaminator: Zawis nad znacznikiem na koronie tamy. Trzy do sześciu metrów, osiem sekund, w promieniu trzech metrów.' },
      { type: 'land', at: 'pad:roof', hold: 3, maxImpact: 1.2, text: 'Wyląduj na dachu budynku bazy', radio: 'Egzaminator: Na koniec lądowisko na dachu biura w bazie. Delikatnie.' },
    ],
    radio: { success: 'Egzaminator: Zaliczone. Licencja I stopnia – rozdział 2 otwarty.' },
    medals: { silver: { impact: 0.9, dist: 2.5 }, gold: { impact: 0.5, dist: 1.5 } },
  },
];

export function missionById(id) { return MISSIONS.find(m => m.id === id); }
