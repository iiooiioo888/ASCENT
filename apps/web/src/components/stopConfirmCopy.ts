import { fmtIo } from "../format";
import { OPS_DEPTH_COPY } from "../ops-depth-copy";
import type { Method } from "../types";

/** 停止生產確認（U4）；產品 v1.1：停止唔退還已扣輸入，對話框列損失。 */
export function stopConfirmIntro(buildingName: string, methodLabel: string): string {
  return `${buildingName} 正在進行「${methodLabel}」。若確認停止，下列已投入的資源將失去，進行中的工時與尚未入帳的產出也會結束：`;
}

export function stopConfirmLossHeading(): string {
  return "將失去";
}

export type StopPaidOpsCosts = {
  wage: number;
  haul: number;
};

/** 物料＋已付工資／運費（stop 唔退）。 */
export function formatStopConfirmLossLine(
  method: Method | undefined,
  paid: StopPaidOpsCosts,
): string {
  const segments: string[] = [];
  segments.push(method ? fmtIo(method.inputs) : "（未知配方）");
  const goldParts: string[] = [];
  if (paid.wage > 0) goldParts.push(`${OPS_DEPTH_COPY.wage} 🪙${paid.wage}`);
  if (paid.haul > 0) goldParts.push(`${OPS_DEPTH_COPY.haul} 🪙${paid.haul}`);
  if (goldParts.length) segments.push(goldParts.join("、"));
  return segments.join("；");
}
