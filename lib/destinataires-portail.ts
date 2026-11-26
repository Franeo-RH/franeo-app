// Destinataires des e-mails d'information de l'admin (nouveau ticket, demande ponctuelle, helpdesk…), réglés dans le portail admin :
// par client, sinon par app, sinon l'adresse par défaut. Sans portail joignable : MAIL_ADMIN, sinon l'adresse habituelle.
const cache = new Map<string, { exp: number; emails: string[] }>();

export async function destinatairesAdmin(app: string, clientId: string | null | undefined, defaut: string[]): Promise<string[]> {
  const portail = (process.env.HUB_PORTAIL_URL || "").replace(/\/$/, "");
  const secret = process.env.HUB_SECRET || "";
  if (!portail || secret.length < 32 || portail.includes("localhost")) return defaut;
  const cle = `${app}:${clientId ?? ""}`;
  const c = cache.get(cle);
  if (c && c.exp > Date.now()) return c.emails;
  try {
    const r = await fetch(`${portail}/api/notifications/destinataires?app=${encodeURIComponent(app)}${clientId ? `&client=${encodeURIComponent(clientId)}` : ""}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(4000) });
    const d = r.ok ? await r.json() : null;
    const emails = Array.isArray(d?.emails) ? d.emails.filter((x: unknown): x is string => typeof x === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)) : [];
    const res = emails.length ? emails : defaut;
    cache.set(cle, { exp: Date.now() + 60_000, emails: res });
    return res;
  } catch {
    return defaut;
  }
}
