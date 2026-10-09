import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthGate } from "./AuthGate";
import { clearSessionTokens } from "./api";

describe("AuthGate", () => {
  it("沒有憑證時顯示登入，不渲染遊戲", () => {
    clearSessionTokens();
    render(
      <AuthGate>
        <p>遊戲本體</p>
      </AuthGate>,
    );
    expect(screen.getByRole("heading", { name: "帝國掘起" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登入" })).toBeInTheDocument();
    expect(screen.queryByText("遊戲本體")).not.toBeInTheDocument();
  });
});
