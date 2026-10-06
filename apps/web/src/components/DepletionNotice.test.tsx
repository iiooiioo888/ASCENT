import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEPLETION_EMPTY_TITLE } from "../productCopy";
import { DepletionNotice } from "./DepletionNotice";

describe("DepletionNotice", () => {
  it("renders nothing when visible is false", () => {
    render(<DepletionNotice visible={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders depletion copy when visible is true", () => {
    render(<DepletionNotice visible />);
    expect(screen.getByRole("status")).toHaveTextContent(DEPLETION_EMPTY_TITLE);
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
      return <Notice visible={FEATURE_SHOW_DEPLETION_EMPTY_STATE && resourceDepleted} />;
    }

    render(<Gate resourceDepleted />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    vi.doUnmock("../productCopy");
    vi.resetModules();
  });
});
