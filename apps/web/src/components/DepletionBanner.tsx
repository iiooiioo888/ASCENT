import { DEPLETION_BANNER } from "../resource-loop-copy";

type Props = {
  onGoWell: () => void;
  onGoSaveSeed: () => void;
};

export function DepletionBanner({ onGoWell, onGoSaveSeed }: Props) {
  return (
    <aside className="depletion-banner" role="status" aria-live="polite">
      <strong>{DEPLETION_BANNER.title}</strong>
      <p>{DEPLETION_BANNER.body}</p>
      <div className="depletion-cta">
        <button type="button" className="ghost" onClick={onGoWell}>
          {DEPLETION_BANNER.ctaWell}
        </button>
        <button type="button" className="ghost" onClick={onGoSaveSeed}>
          {DEPLETION_BANNER.ctaSeed}
        </button>
      </div>
    </aside>
  );
}
