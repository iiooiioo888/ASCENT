import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CONNECTION_LOAD_FAILED_TITLE, CONNECTION_RETRY_BUTTON_LABEL } from "../productCopy";
import { LoadingScreen } from "./LoadingScreen";

describe("LoadingScreen U10", () => {
  it("shows retry when load failed and calls onRetry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<LoadingScreen error="無法連線" retrying={false} onRetry={onRetry} />);

    expect(screen.getByText(CONNECTION_LOAD_FAILED_TITLE)).toBeInTheDocument();
    expect(screen.getByText("無法連線")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: CONNECTION_RETRY_BUTTON_LABEL }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("disables retry while retrying", () => {
    render(<LoadingScreen error="offline" retrying onRetry={() => undefined} />);
    expect(screen.getByRole("button", { name: "連線中…" })).toBeDisabled();
  });
});
