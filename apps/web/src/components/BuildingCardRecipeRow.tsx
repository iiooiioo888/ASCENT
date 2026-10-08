import type { ReactNode } from "react";

type Props = {
  inputs: ReactNode;
  outputs: ReactNode;
};

/** FE-RICH-1：當前配方一行（輸入→輸出）。 */
export function BuildingCardRecipeRow({ inputs, outputs }: Props) {
  return (
    <p className="recipe-row" data-testid="building-recipe-row">
      <span className="recipe-row-in">{inputs}</span>
      <span className="recipe-row-arrow" aria-hidden="true">→</span>
      <span className="recipe-row-out">{outputs}</span>
    </p>
  );
}
