import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OFFLINE_SUMMARY_FOOTNOTE, OFFLINE_SUMMARY_PENDING_TAG } from "../productCopy";
import type { OfflineSummaryResult } from "../offlineSummary";
import { OfflineSummaryNotice } from "./OfflineSummaryNotice";

const sampleSummary: OfflineSummaryResult = {
  fingerprint: "pb_field:田：已完成，待收取 🌾×2",
  lines: [{ buildingId: "pb_field", text: "田：已完成，待收取 🌾×2" }],
};

describe("OfflineSummaryNotice U11 copy", () => {
  it("shows title, 待確認 tag, and footnote without backend settlement promise", () => {
    render(<OfflineSummaryNotice summary={sampleSummary} onDismiss={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("heading", { name: "離開期間" })).toBeInTheDocument();
    expect(screen.getByText(OFFLINE_SUMMARY_PENDING_TAG)).toBeInTheDocument();
    expect(screen.getByText(OFFLINE_SUMMARY_FOOTNOTE)).toBeInTheDocument();
    expect(OFFLINE_SUMMARY_FOOTNOTE).toMatch(/並非後端結算/);
    expect(screen.getByText(/田：已完成，待收取/)).toBeInTheDocument();
  });

  it("calls onDismiss when 知道了 is pressed", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<OfflineSummaryNotice summary={sampleSummary} onDismiss={onDismiss} />);
    await user.click(screen.getByRole("button", { name: "知道了" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
