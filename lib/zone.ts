/** Position envoyée par le navigateur pour fixer la zone d'un établissement */
export function lireZone(b: Record<string, unknown>): { latitude: number; longitude: number } | null {
  const latitude = Number(b?.latitude), longitude = Number(b?.longitude);
  if (b?.latitude == null || b?.longitude == null || b.latitude === "" || b.longitude === "" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

/** Rayon de la zone de badge : entre 50 m et 2 km (200 m par défaut) */
export function rayonValide(v: unknown, defaut = 200): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 50 && n <= 2000 ? n : defaut;
}
