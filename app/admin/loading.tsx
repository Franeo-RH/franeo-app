// Affiché immédiatement à chaque clic, le temps que la page se charge
export default function Chargement() {
  return (
    <div className="fr-chargement" role="status" aria-live="polite">
      <div className="fr-chargement-barre" />
      <div className="fr-chargement-centre">
        <span className="fr-spinner" aria-hidden="true" />
        <span>Chargement…</span>
      </div>
    </div>
  );
}
