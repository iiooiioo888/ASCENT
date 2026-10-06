import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { BuildingCard } from "./components/BuildingCard";
import { ConnectionStatusBar } from "./components/ConnectionStatusBar";
import { DepletionNotice } from "./components/DepletionNotice";
import { Inventory } from "./components/Inventory";
import { LoadingScreen } from "./components/LoadingScreen";
import { nextPollFailureCount, shouldShowConnectionLost } from "./connectionPoll";
import { isResourceDepleted } from "./depletion";
import { formatActionError, formatUserError, fmtGame, isApiConflict } from "./format";
import { BUILDING_ICON } from "./meta";
import {
  BRAND_DISPLAY_NAME,
  BRAND_SUBTITLE,
  FEATURE_SHOW_DEPLETION_EMPTY_STATE,
  OFFLINE_PROGRESS_BANNER,
  OFFLINE_PROGRESS_HUD_CHIP,
  SLICE_FLOW_BANNER,
  SLICE_GOAL_BANNER,
} from "./productCopy";
import {
  collectHighlightItemIds,
  formatCollectSuccess,
  SUCCESS_FEEDBACK_MS,
} from "./successFeedback";
import type { GameState, Method } from "./types";

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadRetrying, setLoadRetrying] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const pollFailuresRef = useRef(0);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [actionSuccess, setActionSuccess] = useState<Record<string, string>>({});
  const [highlightItems, setHighlightItems] = useState<Set<string>>(() => new Set());
  const successTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [picked, setPicked] = useState<Record<string, string>>({});
  const pendingKeysRef = useRef(new Set<string>());
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    const next = await api<GameState>("/api/v1/state");
    setState(next);
    pollFailuresRef.current = 0;
    setConnectionLost(false);
    setLoadError("");
    return next;
  }, []);

  const handlePollFailure = useCallback((e: unknown) => {
    const message = formatUserError(e);
    pollFailuresRef.current = nextPollFailureCount(pollFailuresRef.current, true);
    if (!state) {
      setLoadError(message);
      return;
    }
    if (shouldShowConnectionLost(pollFailuresRef.current)) {
      setConnectionLost(true);
    }
  }, [state]);

  const runInitialLoad = useCallback(async () => {
    try {
      await refresh();
    } catch (e) {
      handlePollFailure(e);
    } finally {
      setLoadRetrying(false);
    }
  }, [refresh, handlePollFailure]);

  useEffect(() => {
    runInitialLoad();
  }, [runInitialLoad]);

  useEffect(() => {
    if (!state) return undefined;
    const t = setInterval(() => {
      refresh().catch(handlePollFailure);
    }, 2000);
    return () => clearInterval(t);
  }, [state, refresh, handlePollFailure]);

  const methodsByRule = useMemo(() => {
    const m = new Map<string, Method[]>();
    for (const method of state?.methods ?? []) {
      const arr = m.get(method.ruleId) ?? [];
      arr.push(method);
      m.set(method.ruleId, arr);
    }
    return m;
  }, [state]);

  const resourceDepleted = useMemo(() => {
    if (!state) return false;
    return isResourceDepleted(state.buildings, state.inventory, methodsByRule);
  }, [state, methodsByRule]);

  const setPending = useCallback((key: string, on: boolean) => {
    const next = new Set(pendingKeysRef.current);
    if (on) next.add(key);
    else next.delete(key);
    pendingKeysRef.current = next;
    setPendingKeys(next);
  }, []);

  const clearSuccessFeedback = useCallback((actionKey: string) => {
    const existing = successTimersRef.current.get(actionKey);
    if (existing) {
      clearTimeout(existing);
      successTimersRef.current.delete(actionKey);
    }
    setActionSuccess((prev) => {
      if (!prev[actionKey]) return prev;
      const next = { ...prev };
      delete next[actionKey];
      return next;
    });
  }, []);

  const showCollectSuccess = useCallback(
    (actionKey: string, buffered: Record<string, number>) => {
      const message = formatCollectSuccess(buffered);
      if (!message) return;

      const itemIds = collectHighlightItemIds(buffered);
      clearSuccessFeedback(actionKey);
      setActionSuccess((prev) => ({ ...prev, [actionKey]: message }));
      setHighlightItems((prev) => {
        const next = new Set(prev);
        for (const id of itemIds) next.add(id);
        return next;
      });

      const timer = setTimeout(() => {
        successTimersRef.current.delete(actionKey);
        setActionSuccess((prev) => {
          if (!prev[actionKey]) return prev;
          const next = { ...prev };
          delete next[actionKey];
          return next;
        });
        setHighlightItems((prev) => {
          const next = new Set(prev);
          for (const id of itemIds) next.delete(id);
          return next;
        });
      }, SUCCESS_FEEDBACK_MS);
      successTimersRef.current.set(actionKey, timer);
    },
    [clearSuccessFeedback],
  );

  const act = useCallback(
    async (
      actionKey: string,
      path: string,
      body?: unknown,
      opts?: { collectBuffered?: Record<string, number> },
    ) => {
      if (pendingKeysRef.current.has(actionKey)) return;

      setPending(actionKey, true);
      clearSuccessFeedback(actionKey);
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
        if (opts?.collectBuffered) {
          showCollectSuccess(actionKey, opts.collectBuffered);
        }
        await refresh();
      } catch (e) {
        if (isApiConflict(e)) {
          await refresh().catch(() => undefined);
        }
        setActionErrors((prev) => ({ ...prev, [actionKey]: formatActionError(e) }));
      } finally {
        setPending(actionKey, false);
      }
    },
    [refresh, setPending, clearSuccessFeedback, showCollectSuccess],
  );

  const retryInitialLoad = useCallback(() => {
    if (loadRetrying) return;
    setLoadRetrying(true);
    setLoadError("");
    runInitialLoad();
  }, [loadRetrying, runInitialLoad]);

  useEffect(() => {
    const timers = successTimersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  if (!state) {
    return <LoadingScreen error={loadError} retrying={loadRetrying} onRetry={retryInitialLoad} />;
  }

  const unplaced = state.buildingDefs.filter((d) => !state.buildings.some((b) => b.buildingDefId === d.id));

  return (
    <div className="world">
      <ConnectionStatusBar visible={connectionLost} />
      <header className="hud">
        <div className="crest">
          <div className="crest-mark" aria-hidden>
            🌾
          </div>
          <div>
            <h1>{BRAND_DISPLAY_NAME}</h1>
            <small>{BRAND_SUBTITLE}</small>
          </div>
        </div>
        <div className="clock">
          <span className="chip">⏳ {fmtGame(state.time.displayGameTime)}</span>
          <span className="chip">⚖ 1 : {state.time.timeScale}</span>
          <span className="chip">{OFFLINE_PROGRESS_HUD_CHIP}</span>
        </div>
      </header>

      <p className="banner banner-goal">{SLICE_GOAL_BANNER}</p>
      <p className="banner">{SLICE_FLOW_BANNER}</p>
      <p className="banner banner-muted">{OFFLINE_PROGRESS_BANNER}</p>
      <DepletionNotice visible={FEATURE_SHOW_DEPLETION_EMPTY_STATE && resourceDepleted} />

      <Inventory inventory={state.inventory} highlightItemIds={highlightItems} />

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
              building={b}
              options={options}
              inventory={state.inventory}
              selectedId={selectedId}
              selected={selected}
              timeScale={state.time.timeScale}
              actionError={actionErrors[actionKey]}
              actionSuccess={actionSuccess[actionKey]}
              pending={pendingKeys.has(actionKey)}
              onSelectMethod={(methodId) => setPicked({ ...picked, [b.id]: methodId })}
              onStart={() => act(actionKey, `/api/v1/buildings/${b.id}/start`, { methodId: selectedId })}
              onStop={() => act(actionKey, `/api/v1/buildings/${b.id}/stop`)}
              onCollect={() =>
                act(actionKey, `/api/v1/buildings/${b.id}/collect`, undefined, {
                  collectBuffered: { ...b.bufferedOutputs },
                })
              }
            />
          );
        })}

        {unplaced.map((d) => {
          const actionKey = `place:${d.id}`;
          const pending = pendingKeys.has(actionKey);
          return (
            <div key={d.id} className={`plot empty${pending ? " pending" : ""}`}>
              <fieldset className="plot-body" disabled={pending}>
                <div className="bicon">{BUILDING_ICON[d.id] ?? "🪵"}</div>
                <div>空地 · 可放置{d.name}</div>
                {actionErrors[actionKey] ? (
                  <p className="plot-action-error" role="alert">
                    {actionErrors[actionKey]}
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
