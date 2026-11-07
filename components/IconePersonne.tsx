/** Petit bonhomme bleu (organigramme, rôles) */
export default function IconePersonne({ taille = 16 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-2px", flexShrink: 0 }}>
      <circle cx="12" cy="7.5" r="4.5" fill="#2563eb" />
      <path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" fill="#2563eb" />
    </svg>
  );
}
