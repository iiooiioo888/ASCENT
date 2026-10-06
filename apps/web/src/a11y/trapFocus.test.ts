// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { trapTabKey } from "./trapFocus";

describe("trapTabKey (U15 QA)", () => {
  it("wraps forward Tab from last to first focusable", () => {
    const root = document.createElement("div");
    const a = document.createElement("button");
    a.textContent = "a";
    const b = document.createElement("button");
    b.textContent = "b";
    root.append(a, b);
    document.body.append(root);
    b.focus();

    const e = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    const prevent = vi.spyOn(e, "preventDefault");
    trapTabKey(e, root);
    expect(prevent).toHaveBeenCalled();
    expect(document.activeElement).toBe(a);
    root.remove();
  });

  it("with a single focusable, Tab still preventDefault (first===last) but focus stays on that control", () => {
    const root = document.createElement("div");
    const only = document.createElement("button");
    only.textContent = "only";
    root.append(only);
    document.body.append(root);
    only.focus();

    const e = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    const prevent = vi.spyOn(e, "preventDefault");
    trapTabKey(e, root);
    expect(prevent).toHaveBeenCalled();
    expect(document.activeElement).toBe(only);
    root.remove();
  });
});
