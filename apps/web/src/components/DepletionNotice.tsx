import {
  DEPLETION_CTA_SAVE_SEED,
  DEPLETION_CTA_WELL,
  DEPLETION_EMPTY_BODY,
  DEPLETION_EMPTY_TITLE,
} from "../productCopy";

type Props = {
  visible: boolean;
  onGoWell: () => void;
  onGoSaveSeed: () => void;
};

export function DepletionNotice({ visible, onGoWell, onGoSaveSeed }: Props) {
  if (!visible) return null;

  return (
    <section className="banner depletion" role="status" aria-live="polite">
      <strong className="depletion-title">{DEPLETION_EMPTY_TITLE}</strong>
      <p className="depletion-body">{DEPLETION_EMPTY_BODY}</p>
      <div className="depletion-cta">
        <button type="button" className="ghost" onClick={onGoWell}>
          {DEPLETION_CTA_WELL}
        </button>
        <button type="button" className="ghost" onClick={onGoSaveSeed}>
          {DEPLETION_CTA_SAVE_SEED}
        </button>
      </div>
    </section>
  );
}
