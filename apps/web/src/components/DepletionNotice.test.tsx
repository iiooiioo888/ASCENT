import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DEPLETION_CTA_SAVE_SEED,
  DEPLETION_CTA_WELL,
  DEPLETION_EMPTY_BODY,
  DEPLETION_EMPTY_TITLE,
} from "../productCopy";
import { DepletionNotice } from "./DepletionNotice";

describe("DepletionNotice", () => {
  it("renders nothing when visible is false", () => {
    render(<DepletionNotice visible={false} onGoWell={() => {}} onGoSaveSeed={() => {}} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders depletion copy and CTAs when visible", () => {
    render(<DepletionNotice visible onGoWell={() => {}} onGoSaveSeed={() => {}} />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(DEPLETION_EMPTY_TITLE);
    expect(banner).toHaveTextContent(DEPLETION_EMPTY_BODY);
    expect(screen.getByRole("button", { name: DEPLETION_CTA_WELL })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: DEPLETION_CTA_SAVE_SEED })).toBeInTheDocument();
  });

  it("invokes scroll/highlight handlers when CTAs are clicked", async () => {
    const user = userEvent.setup();
    const onGoWell = vi.fn();
    const onGoSaveSeed = vi.fn();
    render(<DepletionNotice visible onGoWell={onGoWell} onGoSaveSeed={onGoSaveSeed} />);

    await user.click(screen.getByRole("button", { name: DEPLETION_CTA_WELL }));
    await user.click(screen.getByRole("button", { name: DEPLETION_CTA_SAVE_SEED }));

    expect(onGoWell).toHaveBeenCalledTimes(1);
    expect(onGoSaveSeed).toHaveBeenCalledTimes(1);
  });
});

describe("DepletionNotice U6 feature flag (App parity)", () => {
  it("does not render when FEATURE_SHOW_DEPLETION_EMPTY_STATE is false even if depleted", async () => {
    vi.resetModules();
    vi.doMock("../productCopy", async () => {
      const actual = await vi.importActual<typeof import("../productCopy")>("../productCopy");
      return {
        ...actual,
        FEATURE_SHOW_DEPLETION_EMPTY_STATE: false,
      };
    });

    const { DepletionNotice: Notice } = await import("./DepletionNotice");
    const { FEATURE_SHOW_DEPLETION_EMPTY_STATE } = await import("../productCopy");

    function Gate({ resourceDepleted }: { resourceDepleted: boolean }) {
      return (
        <Notice
          visible={FEATURE_SHOW_DEPLETION_EMPTY_STATE && resourceDepleted}
          onGoWell={() => {}}
          onGoSaveSeed={() => {}}
        />
      );
    }

    render(<Gate resourceDepleted />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    vi.doUnmock("../productCopy");
    vi.resetModules();
  });
});
