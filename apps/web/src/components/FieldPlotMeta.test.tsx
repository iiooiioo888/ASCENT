import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FALLOW_ACTIVE_COPY } from "../environment-copy";
import { FieldPlotMeta } from "./FieldPlotMeta";

describe("FieldPlotMeta", () => {
  it("shows fallow countdown for field in fallow", () => {
    render(
      <FieldPlotMeta
        buildingDefId="bdef_field"
        fallowUntil={100_000}
        displayGameTime={0}
        timeScale={60}
        serverRealTime={new Date().toISOString()}
      />,
    );
    expect(screen.getByTestId("field-plot-meta")).toHaveTextContent(FALLOW_ACTIVE_COPY);
  });

  it("shows weather hint when not in fallow", () => {
    render(
      <FieldPlotMeta
        buildingDefId="bdef_field"
        displayGameTime={0}
        timeScale={60}
        serverRealTime={new Date().toISOString()}
        environment={{ weather: "rain", yieldMult: 0.8 }}
      />,
    );
    expect(screen.getByTestId("field-plot-meta")).toHaveTextContent(/產量/);
  });
});
