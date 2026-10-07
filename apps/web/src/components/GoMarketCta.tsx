import { DEPLETION_CTA_MARKET } from "../productCopy";

type Props = {
  onClick: () => void;
};

/** Short CTA reusing MK-FE-2 / depletion copy; parent wires scroll + MarketPanel. */
export function GoMarketCta({ onClick }: Props) {
  return (
    <button type="button" className="go-market-cta" onClick={onClick} data-testid="go-market-cta">
      {DEPLETION_CTA_MARKET}
    </button>
  );
}
