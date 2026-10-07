import type { ReactNode } from "react";
import type { EnvironmentSnapshot } from "@ascent/shared";
import { weatherHudChipLabel } from "../environment-copy";

type Props = {
  environment: EnvironmentSnapshot;
  showYieldMult?: boolean;
};

export function EnvironmentHud({ environment, showYieldMult = true }: Props) {
  const label = weatherHudChipLabel(environment.weather, environment.yieldMult, showYieldMult);
  return (
    <span
      className={`chip chip-weather chip-weather-${environment.weather}`}
      data-testid="hud-weather-chip"
      title={showYieldMult ? `田種植產量倍率 ${environment.yieldMult}` : undefined}
    >
      {label}
    </span>
  );
}

export function maybeEnvironmentHud(environment?: EnvironmentSnapshot): ReactNode {
  if (!environment) return null;
  return <EnvironmentHud environment={environment} />;
}
