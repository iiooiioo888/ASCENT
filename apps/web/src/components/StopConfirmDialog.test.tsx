import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StopConfirmDialog } from "./StopConfirmDialog";
import { growWheatDefault } from "../prb-demo/fixtures";

afterEach(() => cleanup());

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
