import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { BuildingCard } from "./components/BuildingCard";
import { Inventory } from "./components/Inventory";
import { formatUserError, fmtGame } from "./format";
import { BUILDING_ICON } from "./meta";
import type { GameState, Method } from "./types";

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [pollError, setPollError] = useState("");
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Record<string, string>>({});
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
        setActionErrors((prev) => ({ ...prev, [actionKey]: formatUserError(e) }));
      } finally {
        setPending(actionKey, false);
      }
    },
    [refresh, setPending],
  );

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

  const unplaced = state.buildingDefs.filter((d) => !state.buildings.some((b) => b.buildingDefId === d.id));

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

      <p className="banner">田種麥 → 磨坊磨粉／拌飼 → 爐和麵烤麵包。工時以遊戲秒計，現實約為六十分之一。</p>
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
              building={b}
              options={options}
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
