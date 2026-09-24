// Atmosfera wzorcowa (ISA) z odchyłką temperatury.
export const G = 9.80665;
export const RHO0 = 1.225;
export function atmosphere(alt, dT = 0) {
  const T = 288.15 - 0.0065 * alt + dT;
  const p = 101325 * Math.pow(1 - 2.25577e-5 * alt, 5.25588);
  return { T, p, rho: p / (287.05 * T), sigma: p / (287.05 * T) / RHO0 };
}
