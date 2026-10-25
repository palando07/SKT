// Tahmini raf ömrü (gün), buzdolabı koşulunda
const SHELF: Record<string, number> = {
  süt: 5, yoğurt: 10, ayran: 7, kefir: 7, "beyaz peynir": 21, kaşar: 30, lor: 5, tereyağı: 30, kaymak: 4, krema: 5,
  yumurta: 21, tavuk: 2, kıyma: 2, et: 3, balık: 1, sucuk: 20, salam: 7, sosis: 10, pastırma: 30,
  ıspanak: 4, marul: 5, roka: 3, maydanoz: 5, dereotu: 4, domates: 7, salatalık: 6, biber: 7, patlıcan: 6, kabak: 6,
  havuç: 21, patates: 30, soğan: 30, sarımsak: 60, limon: 21, elma: 21, muz: 5, çilek: 3, üzüm: 6, portakal: 14,
  ekmek: 3, lavaş: 5, mantar: 4, zeytin: 30, humus: 5, brokoli: 5, karnabahar: 7, pırasa: 10,
};
const DEFAULT_DAYS = 7;

export function guessShelfDays(name: string): number {
  const n = name.toLocaleLowerCase("tr");
  let best: string | null = null;
  for (const k of Object.keys(SHELF)) if (n.includes(k) && (!best || k.length > best.length)) best = k;
  return best ? SHELF[best] : DEFAULT_DAYS;
}
