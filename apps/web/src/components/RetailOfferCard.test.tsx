import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RETAIL_COPY } from "../retailCopy";
import { RetailOfferCard } from "./RetailOfferCard";

const baseOffer = {
  offerId: "offer-1",
  skuId: "item_bread" as const,
  qty: 2,
  bidGold: 9,
  buyerLabel: "路過村民",
};

describe("RetailOfferCard", () => {
  it("shows slot, bid in copper ingots, and remaining ttl", () => {
    const now = 1_000_000;
    render(
      <RetailOfferCard
        offer={{ ...baseOffer, expiresAt: now + 120_000 }}
        slotIndex={1}
        breadQty={5}
        nowMs={now}
        pending={false}
        onAccept={vi.fn()}
      />,
    );

    expect(screen.getByTestId("retail-offer-slot")).toHaveTextContent("槽位 1");
    expect(screen.getByTestId("retail-offer-bid")).toHaveTextContent(RETAIL_COPY.bid(9));
    expect(screen.getByTestId("retail-offer-ttl")).toHaveTextContent("剩餘 2 分");
    expect(screen.getByTestId("retail-offer-preview")).toHaveTextContent(RETAIL_COPY.preview(18));
  });

  it("disables accept when offer expired", () => {
    render(
      <RetailOfferCard
        offer={{ ...baseOffer, expiresAt: 500 }}
        breadQty={5}
        nowMs={1000}
        expired
        pending={false}
        onAccept={vi.fn()}
      />,
    );

    expect(screen.getByTestId("retail-offer-accept")).toBeDisabled();
  });
});
