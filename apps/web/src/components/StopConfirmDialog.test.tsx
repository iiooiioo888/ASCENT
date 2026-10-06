import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mixFeedDefault } from "../prb-demo/fixtures";
import { StopConfirmDialog } from "./StopConfirmDialog";

describe("StopConfirmDialog", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <StopConfirmDialog open={false} buildingName="磨坊" method={mixFeedDefault} onCancel={() => {}} onConfirm={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows unknown recipe when method is missing", () => {
    render(
      <StopConfirmDialog open buildingName="磨坊" method={undefined} onCancel={() => {}} onConfirm={() => {}} />,
    );
    expect(screen.getByText("（未知配方）")).toBeInTheDocument();
    expect(screen.getByText(/正在進行「…」/)).toBeInTheDocument();
  });

  it("cancel does not confirm; submit confirms once", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <StopConfirmDialog open buildingName="田" method={mixFeedDefault} onCancel={onCancel} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "確認停止" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
