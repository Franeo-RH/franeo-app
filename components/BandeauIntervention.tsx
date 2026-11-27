import { cookies } from "next/headers";

/** Bandeau visible quand un admin FRANEO intervient dans l'espace du client depuis le portail */
export default async function BandeauIntervention() {
  const v = (await cookies()).get("franeo_intervention")?.value;
  if (!v) return null;
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 60, background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 13, padding: "6px 14px", textAlign: "center" }}>
      🛟 Intervention FRANEO RH ({decodeURIComponent(v)}) : vous agissez dans l&apos;espace de ce client, à sa place.
    </div>
  );
}
