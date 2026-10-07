import {
  DEPLETION_CTA_MARKET,
  DEPLETION_CTA_SAVE_SEED,
  DEPLETION_CTA_WELL,
  DEPLETION_EMPTY_BODY,
  DEPLETION_EMPTY_TITLE,
} from "../productCopy";

type Props = {
  visible: boolean;
  onGoWell: () => void;
  onGoSaveSeed: () => void;
  onGoMarket?: () => void;
  /** When true, style the market CTA as the primary action (gold can buy seed/water). */
  marketCtaProminent?: boolean;
};

export function DepletionNotice({
  visible,
  onGoWell,
  onGoSaveSeed,
  onGoMarket,
  marketCtaProminent = false,
}: Props) {
  return (
    <section
      className={`banner depletion depletion-slot${visible ? " is-visible" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      {!visible ? null : (
        <>
      <strong className="depletion-title">{DEPLETION_EMPTY_TITLE}</strong>
      <p className="depletion-body">{DEPLETION_EMPTY_BODY}</p>
      <div className="depletion-cta">
        <button type="button" className="ghost" onClick={onGoWell}>
          {DEPLETION_CTA_WELL}
        </button>
        <button type="button" className="ghost" onClick={onGoSaveSeed}>
          {DEPLETION_CTA_SAVE_SEED}
        </button>
        {onGoMarket ? (
          <button
            type="button"
            className={marketCtaProminent ? "depletion-cta-market" : "ghost"}
            onClick={onGoMarket}
          >
            {DEPLETION_CTA_MARKET}
          </button>
        ) : null}
      </div>
        </>
      )}
    </section>
  );
}
