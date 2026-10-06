import { Injectable } from "@nestjs/common";
import {
  GAME_CONFIG,
  displayGameTime,
  settleProduction,
  settleWindow,
  type BuildingQueueJob,
  type BuildingStatus,
  type WorldClock,
} from "@ascent/shared";

@Injectable()
export class SimulationService {
  readonly config = GAME_CONFIG;

  displayGameTime(clock: WorldClock, nowMs: number) {
    return displayGameTime(clock, nowMs, this.config.timeScale);
  }

  settleWindow(lastSettledAtMs: number, nowRealMs: number) {
    return settleWindow({
      lastSettledAtMs,
      nowRealMs,
      timeScale: this.config.timeScale,
      maxOfflineRealSec: this.config.maxOfflineRealSec,
    });
  }

  settleProduction(status: BuildingStatus, queue: BuildingQueueJob[], gameDeltaSec: number) {
    return settleProduction({ status, queue, gameDeltaSec });
  }
}
