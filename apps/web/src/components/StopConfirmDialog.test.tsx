import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { growWheatDefault, mixFeedDefault } from "../prb-demo/fixtures";
import { StopConfirmDialog } from "./StopConfirmDialog";

function ControlledStopDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" data-testid="trigger" onClick={() => setOpen(true)}>停止</button>
      <StopConfirmDialog
        open={open}
        buildingName="田"
        method={growWheatDefault}
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}

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
    expect(screen.getByText(/下列已投入的資源將失去/)).toBeInTheDocument();
    expect(screen.getByText("將失去：")).toBeInTheDocument();
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

  it("lists wage and haul in loss line", () => {
    render(
      <StopConfirmDialog
        open
        buildingName="磨坊"
        method={mixFeedDefault}
        paidOpsCosts={{ wage: 2, haul: 1 }}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText(/工資 🪙2/)).toBeInTheDocument();
    expect(screen.getByText(/運費 🪙1/)).toBeInTheDocument();
  });
});

describe("StopConfirmDialog keyboard (U15)", () => {
  it("calls onCancel on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<ControlledStopDialog />);
    const trigger = screen.getByTestId("trigger");
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole("button", { name: "取消" })).toHaveFocus());

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("traps tab focus inside the panel", () => {
    render(
      <StopConfirmDialog
        open
        buildingName="田"
        method={growWheatDefault}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    const cancel = screen.getByRole("button", { name: "取消" });
    const confirm = screen.getByRole("button", { name: "確認停止" });
    expect(dialog).toBeInTheDocument();
    expect(cancel).toHaveFocus();

    confirm.focus();
    fireEvent.keyDown(document, { key: "Tab", code: "Tab" });
    expect(cancel).toHaveFocus();

    cancel.focus();
    fireEvent.keyDown(document, { key: "Tab", code: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
  });
});
