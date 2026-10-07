/** Stop is only valid while production is in progress (backend `stop` expects running). */
export function canStopBuilding(status: string): boolean {
  return status === "running";
}
