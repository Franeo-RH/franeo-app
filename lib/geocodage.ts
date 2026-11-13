// Géocodage d'une adresse française (Base Adresse Nationale, service public gratuit de l'IGN)
export async function geocoder(adresse: string): Promise<{ latitude: number; longitude: number } | null> {
  const q = encodeURIComponent(adresse.trim());
  if (!q) return null;
  const urls = [
    `https://data.geopf.fr/geocodage/search?q=${q}&limit=1`,
    `https://api-adresse.data.gouv.fr/search/?q=${q}&limit=1`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) continue;
      const d = await r.json();
      const c = d?.features?.[0]?.geometry?.coordinates;
      if (Array.isArray(c) && c.length === 2) return { longitude: Number(c[0]), latitude: Number(c[1]) };
    } catch {
      // service suivant
    }
  }
  return null;
}

/** Adresse correspondant à une position GPS (géocodage inverse, Base Adresse Nationale) */
export async function adresseDe(latitude: number, longitude: number): Promise<string | null> {
  const urls = [
    `https://data.geopf.fr/geocodage/reverse?lon=${longitude}&lat=${latitude}&limit=1`,
    `https://api-adresse.data.gouv.fr/reverse/?lon=${longitude}&lat=${latitude}&limit=1`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) continue;
      const d = await r.json();
      const label = d?.features?.[0]?.properties?.label;
      if (typeof label === "string" && label) return label;
    } catch {
      // service suivant
    }
  }
  return null;
}
