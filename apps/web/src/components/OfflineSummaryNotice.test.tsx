import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OFFLINE_SUMMARY_DISMISS_LABEL, OFFLINE_SUMMARY_TITLE } from "../productCopy";
import type { OfflineSummaryResult } from "../offlineSummary";
import { OfflineSummaryNotice } from "./OfflineSummaryNotice";

const sampleSummary: OfflineSummaryResult = {
  lines: [{ buildingId: "pb_field", text: "田完成，待收取 🌾×2" }],
  fingerprint: "test-fp",
};

describe("OfflineSummaryNotice modal a11y (U11 / PR-F P1)", () => {
  it("opens with showModal and exposes dialog semantics", async () => {
    render(<OfflineSummaryNotice summary={sampleSummary} onDismiss={vi.fn()} />);
    const el = screen.getByRole("dialog", { name: OFFLINE_SUMMARY_TITLE }) as HTMLDialogElement;
    expect(el).toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(el.open).toBe(true));
  });

  it("focuses dismiss control on open", async () => {
    render(<OfflineSummaryNotice summary={sampleSummary} onDismiss={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: OFFLINE_SUMMARY_DISMISS_LABEL })).toHaveFocus(),
    );
  });

  it("calls onDismiss on Escape and returns focus to trigger", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <div>
        <button type="button" data-testid="before">先前焦點</button>
        <OfflineSummaryNotice summary={sampleSummary} onDismiss={onDismiss} />
      </div>,
    );
    const before = screen.getByTestId("before");
    before.focus();
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    await user.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(before).toHaveFocus();
  });

  it("traps tab focus inside the panel", async () => {
    render(<OfflineSummaryNotice summary={sampleSummary} onDismiss={vi.fn()} />);
    const dismiss = await screen.findByRole("button", { name: OFFLINE_SUMMARY_DISMISS_LABEL });
    expect(dismiss).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", code: "Tab" });
    expect(dismiss).toHaveFocus();
  });
});
