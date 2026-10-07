import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { BuildingCard } from "./components/BuildingCard";
import { DepletionBanner } from "./components/DepletionBanner";
import { Inventory } from "./components/Inventory";
import type { BuildingActionErrorView } from "./building-action-error";
import { mapBuildingActionError } from "./building-action-error";
import { formatUserError, fmtGame } from "./format";
import { BUILDING_ICON } from "./meta";
import { isProductionDepleted } from "./production-depleted";
import {
  FIELD_BUILDING_DEF_ID,
  METHOD_SAVE_SEED_ID,
  isBuildingDefPlaceableInUi,
  RESOURCE_LOOP_GOAL_HINT,
  WELL_BUILDING_DEF_ID,
} from "./resource-loop-copy";
import type { GameState, Method } from "./types";

const MAIN_GOAL_BANNER =
  "田種麥 → 磨坊磨粉／拌飼 → 爐和麵烤麵包。工時以遊戲秒計，現實約為六十分之一。";

const SCROLL_HIGHLIGHT_MS = 2400;

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [pollError, setPollError] = useState("");
  const [actionErrors, setActionErrors] = useState<Record<string, BuildingActionErrorView>>({});
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [highlightDefId, setHighlightDefId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeysRef = useRef(new Set<string>());
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    const next = await api<GameState>("/api/v1/state");
    setState(next);
    setPollError("");
  }, []);

  useEffect(() => {
    refresh().catch((e) => setPollError(formatUserError(e)));
    const t = setInterval(() => {
      refresh().catch((e) => setPollError(formatUserError(e)));
    }, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const flashHighlight = useCallback((buildingDefId: string) => {
    setHighlightDefId(buildingDefId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightDefId(null), SCROLL_HIGHLIGHT_MS);
  }, []);

  const scrollToAnchor = useCallback((anchorId: string) => {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const methodsByRule = useMemo(() => {
    const m = new Map<string, Method[]>();
    for (const method of state?.methods ?? []) {
      const arr = m.get(method.ruleId) ?? [];
      arr.push(method);
      m.set(method.ruleId, arr);
    }
    return m;
  }, [state]);

  const setPending = useCallback((key: string, on: boolean) => {
    const next = new Set(pendingKeysRef.current);
    if (on) next.add(key);
    else next.delete(key);
    pendingKeysRef.current = next;
    setPendingKeys(next);
  }, []);

  const act = useCallback(
    async (actionKey: string, path: string, body?: unknown) => {
      if (pendingKeysRef.current.has(actionKey)) return;

      setPending(actionKey, true);
      setActionErrors((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });

      try {
        await api(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
        setActionErrors((prev) => {
          const next = { ...prev };
          delete next[actionKey];
          return next;
        });
        await refresh();
      } catch (e) {
        const mapped = mapBuildingActionError(e);
        if (mapped.shouldRefresh) {
          await refresh().catch(() => undefined);
        }
        setActionErrors((prev) => ({
          ...prev,
          [actionKey]: { message: mapped.message, hint: mapped.hint },
        }));
      } finally {
        setPending(actionKey, false);
      }
    },
    [refresh, setPending],
  );

  const goToWell = useCallback(() => {
    if (!state) return;
    flashHighlight(WELL_BUILDING_DEF_ID);
    const placed = state.buildings.find((b) => b.buildingDefId === WELL_BUILDING_DEF_ID);
    if (placed) scrollToAnchor(`building-${placed.id}`);
  }, [flashHighlight, scrollToAnchor, state]);

  const goToSaveSeed = useCallback(() => {
    if (!state) return;
    flashHighlight(FIELD_BUILDING_DEF_ID);
    const field = state.buildings.find((b) => b.buildingDefId === FIELD_BUILDING_DEF_ID);
    if (field) {
      setPicked((prev) => ({ ...prev, [field.id]: METHOD_SAVE_SEED_ID }));
      scrollToAnchor(`building-${field.id}`);
    }
  }, [flashHighlight, scrollToAnchor, state]);

  if (!state) {
    return (
      <div className="loading">
        <div>
          <h1>崛起</h1>
          <p>{pollError || "農莊正在甦醒…"}</p>
        </div>
      </div>
    );
  }

  const unplaced = state.buildingDefs.filter(
    (d) => isBuildingDefPlaceableInUi(d.id) && !state.buildings.some((b) => b.buildingDefId === d.id),
  );
  const depleted = isProductionDepleted(state);

  return (
    <div className="world">
      <header className="hud">
        <div className="crest">
          <div className="crest-mark" aria-hidden>
            🌾
          </div>
          <div>
            <h1>崛起</h1>
            <small>農業切片 · 莊園</small>
          </div>
        </div>
        <div className="clock">
          <span className="chip">⏳ {fmtGame(state.time.displayGameTime)}</span>
          <span className="chip">⚖ 1 : {state.time.timeScale}</span>
          <span className="chip">🌙 離線 8 時</span>
        </div>
      </header>

      <p className="banner">
        {MAIN_GOAL_BANNER}
        <span className="banner-hint"> {RESOURCE_LOOP_GOAL_HINT}</span>
      </p>
      {depleted ? <DepletionBanner onGoWell={goToWell} onGoSaveSeed={goToSaveSeed} /> : null}
      {pollError ? <p className="banner error">{pollError}</p> : null}

      <Inventory inventory={state.inventory} />

      <div className="chain">
        <span>🌾 田</span>
        <i>→</i>
        <span>⚙️ 磨坊</span>
        <i>→</i>
        <span>🔥 爐</span>
        <i>→</i>
        <span>🍞 麵包</span>
      </div>

      <section className="settlement">
        {state.buildings.map((b) => {
          const allowed = b.buildingDef.allowedRuleIds ?? [];
          const options = allowed.flatMap((rid) => methodsByRule.get(rid) ?? []);
          const selectedId = picked[b.id] ?? options[0]?.id;
          const selected = options.find((m) => m.id === selectedId);
          const actionKey = b.id;

          return (
            <BuildingCard
              key={b.id}
              scrollAnchorId={`building-${b.id}`}
              highlight={highlightDefId === b.buildingDefId}
              building={b}
              options={options}
              inventory={state.inventory}
              selectedId={selectedId}
              selected={selected}
              timeScale={state.time.timeScale}
              actionError={actionErrors[actionKey]}
              pending={pendingKeys.has(actionKey)}
              onSelectMethod={(methodId) => setPicked({ ...picked, [b.id]: methodId })}
              onStart={() => act(actionKey, `/api/v1/buildings/${b.id}/start`, { methodId: selectedId })}
              onStop={() => act(actionKey, `/api/v1/buildings/${b.id}/stop`)}
              onCollect={() => act(actionKey, `/api/v1/buildings/${b.id}/collect`)}
            />
          );
        })}

        {unplaced.map((d) => {
          const actionKey = `place:${d.id}`;
          const pending = pendingKeys.has(actionKey);
          return (
            <div
              key={d.id}
              id={`plot-unplaced-${d.id}`}
              className={`plot empty${pending ? " pending" : ""}${highlightDefId === d.id ? " scroll-highlight" : ""}`}
            >
              <fieldset className="plot-body" disabled={pending}>
                <div className="bicon">{BUILDING_ICON[d.id] ?? "🪵"}</div>
                <div>空地 · 可放置{d.name}</div>
                {actionErrors[actionKey] ? (
                  <p className="plot-action-error" role="alert" title={actionErrors[actionKey].hint}>
                    {actionErrors[actionKey].message}
                  </p>
                ) : null}
                <button type="button" onClick={() => act(actionKey, "/api/v1/buildings", { buildingDefId: d.id })}>
                  放置{d.name}
                </button>
              </fieldset>
            </div>
          );
        })}
      </section>
    </div>
  );
}
