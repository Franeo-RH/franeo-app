// lib/siret.ts
/** SIRET : 14 chiffres (espaces acceptés à la saisie) ; vide = pas de SIRET */
export function siretPropre(v: unknown): string | null {
  const s = typeof v === "string" ? v.replace(/\s/g, "") : "";
  return s ? s.slice(0, 20) : null;
}
export const siretInvalide = (s: string | null) => !!s && !/^\d{14}$/.test(s);
