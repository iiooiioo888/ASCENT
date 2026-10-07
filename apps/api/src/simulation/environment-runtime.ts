import {
  advanceWeatherState,
  environmentConfigFromDb,
  environmentSnapshot,
  initialWeatherState,
  persistedWeatherFromRow,
  type EnvironmentConfig,
  type EnvironmentSnapshot,
  type PersistedWeatherState,
  type WeatherId,
} from "@ascent/shared";
import type { PrismaService } from "../prisma/prisma.service";

export type WeatherTx = Pick<PrismaService, "serverState" | "gameConfig">;

export class EnvironmentRuntime {
  private config: EnvironmentConfig = environmentConfigFromDb(null);

  setConfigFromDb(raw: unknown) {
    this.config = environmentConfigFromDb(raw);
  }

  get configSnapshot(): EnvironmentConfig {
    return this.config;
  }

  async refreshConfig(tx: WeatherTx) {
    const row = await tx.gameConfig.findUnique({ where: { id: 1 } });
    this.config = environmentConfigFromDb(row?.environment);
  }

  async ensureWeatherFresh(tx: WeatherTx, currentGameSec: number): Promise<PersistedWeatherState> {
    const row = await tx.serverState.findUniqueOrThrow({ where: { id: 1 } });
    let state =
      persistedWeatherFromRow(row.weather, row.weatherNextChangeAtGame) ??
      initialWeatherState(this.config, currentGameSec);
    const advanced = advanceWeatherState(this.config, state, currentGameSec);
    if (
      advanced.weather !== state.weather ||
      advanced.nextChangeAtGame !== state.nextChangeAtGame
    ) {
      await tx.serverState.update({
        where: { id: 1 },
        data: {
          weather: advanced.weather,
          weatherNextChangeAtGame: BigInt(Math.max(0, Math.floor(advanced.nextChangeAtGame))),
        },
      });
    } else if (!persistedWeatherFromRow(row.weather, row.weatherNextChangeAtGame)) {
      await tx.serverState.update({
        where: { id: 1 },
        data: {
          weather: advanced.weather,
          weatherNextChangeAtGame: BigInt(Math.max(0, Math.floor(advanced.nextChangeAtGame))),
        },
      });
    }
    return advanced;
  }

  snapshot(
    weatherState: PersistedWeatherState,
    currentGameSec: number,
  ): EnvironmentSnapshot {
    return environmentSnapshot(
      this.config,
      weatherState.weather,
      weatherState.nextChangeAtGame,
      currentGameSec,
    );
  }

  currentWeatherId(weatherState: PersistedWeatherState): WeatherId {
    return weatherState.weather;
  }
}
