import { useEffect, useMemo, useState } from "react";

const ITEM_META: Record<string, { name: string; icon: string }> = {
  item_seed_wheat: { name: "小麥種子", icon: "🌱" },
  item_wheat: { name: "小麥", icon: "🌾" },
  item_straw: { name: "秸稈", icon: "🪵" },
  item_water: { name: "水", icon: "💧" },
  item_flour: { name: "麵粉", icon: "🥣" },
  item_feed: { name: "飼料", icon: "🧺" },
  item_dough: { name: "麵團", icon: "⚪" },
  item_bread: { name: "麵包", icon: "🍞" },
};

const METHOD_NAME: Record<string, string> = {
  method_grow_wheat_default: "種植小麥",
  method_grow_wheat_water_saving: "省水種植",
  method_mill_flour_default: "磨粉",
  method_mix_feed_default: "拌飼料",
  method_make_dough_default: "和麵",
  method_bake_bread_default: "烘烤麵包",
  method_bake_bread_batch: "批量烘烤",
};

const BUILDING_ICON: Record<string, string> = {
  bdef_field: "🌾",
  bdef_silo: "🏚️",
  bdef_mill: "⚙️",
  bdef_oven: "🔥",
};

type InvRow = { itemId: string; quantity: string; item: { code: string; layer: string; derivedTier: number } };
type Method = {
  id: string;
  code: string;
  ruleId: string;
  durationGameSec: number;
  inputs: { item_id: string; qty: number }[];
  outputs: { item_id: string; qty: number }[];
};
type Building = {
  id: string;
  status: string;
  buildingDefId: string;
  buildingDef: { name: string; allowedRuleIds: string[] };
  methodId: string | null;
  queue: { elapsedGameSec: number; durationGameSec: number }[];
  bufferedOutputs: Record<string, number>;
};
type State = {
  time: { displayGameTime: number; timeScale: number; serverRealTime: string };
  inventory: InvRow[];
  buildings: Building[];
  methods: Method[];
  buildingDefs: { id: string; name: string; code: string }[];
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.join("；") : body.message;
    throw new Error(msg ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

function fmtGame(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}日 ${h}時 ${m}分`;
}

function itemLabel(id: string) {
  return ITEM_META[id]?.name ?? id;
}

function fmtIo(ios: { item_id: string; qty: number }[]) {
  return ios.map((io) => `${ITEM_META[io.item_id]?.icon ?? ""} ${itemLabel(io.item_id)}×${io.qty}`).join("  ");
}

function realRemainSec(job?: { elapsedGameSec: number; durationGameSec: number }, timeScale = 60) {
  if (!job) return 0;
  return Math.max(0, (job.durationGameSec - job.elapsedGameSec) / timeScale);
}

export default function App() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string>("");
  const [picked, setPicked] = useState<Record<string, string>>({});

  async function refresh() {
    const next = await api<State>("/api/v1/state");
    setState(next);
    setError("");
  }

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
    const t = setInterval(() => refresh().catch(() => undefined), 2000);
    return () => clearInterval(t);
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

  async function act(path: string, body?: unknown) {
    try {
      await api(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  if (!state) {
    return (
      <div className="loading">
        <div>
          <h1>崛起</h1>
          <p>{error || "農莊正在甦醒…"}</p>
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
      {error ? <p className="banner error">{error}</p> : null}

      <section className="pack">
        <h2>背包</h2>
        <div className="items">
          {state.inventory.map((row) => {
            const qty = Number(row.quantity);
            const meta = ITEM_META[row.itemId] ?? { name: row.item.code, icon: "📦" };
            return (
              <div key={row.itemId} className={qty <= 0 ? "item empty" : "item"}>
                <div className="icon">{meta.icon}</div>
                <div className="name">{meta.name}</div>
                <div className="qty">{qty.toFixed(0)}</div>
              </div>
            );
          })}
        </div>
      </section>

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
          const job = b.queue[0];
          const progress = job ? Math.min(100, (job.elapsedGameSec / job.durationGameSec) * 100) : 0;
          const remain = realRemainSec(job, state.time.timeScale);
          return (
            <article key={b.id} className={`plot ${b.status}`}>
              <div className="plot-head">
                <div style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
                  <div className="bicon">{BUILDING_ICON[b.buildingDefId] ?? "🏠"}</div>
                  <div>
                    <h3 className="bname">{b.buildingDef.name}</h3>
                    <span className={`badge ${b.status}`}>{statusLabel(b.status)}</span>
                  </div>
                </div>
              </div>

              {job ? (
                <p className="jobline">
                  進行中 {progress.toFixed(0)}% · 剩 {remain.toFixed(0)} 現實秒
                </p>
              ) : (
                <p className="jobline">{b.status === "ready" ? `可收取 ${fmtBuffered(b.bufferedOutputs)}` : "等待開工"}</p>
              )}

              {options.length ? (
                <>
                  <select
                    value={selectedId ?? ""}
                    onChange={(e) => setPicked({ ...picked, [b.id]: e.target.value })}
                  >
                    {options.map((m) => (
                      <option key={m.id} value={m.id}>
                        {METHOD_NAME[m.id] ?? m.code} · {(m.durationGameSec / state.time.timeScale).toFixed(0)} 秒
                      </option>
                    ))}
                  </select>
                  <div className="recipe">
                    {selected ? (
                      <>
                        <div>消耗 {fmtIo(selected.inputs)}</div>
                        <div>產出 {fmtIo(selected.outputs)}</div>
                      </>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="recipe">倉不開工，只佔建築槽。</div>
              )}

              <div className="actions">
                <button
                  disabled={!options.length || b.status !== "idle"}
                  onClick={() => act(`/api/v1/buildings/${b.id}/start`, { methodId: selectedId })}
                >
                  開工
                </button>
                <button className="ghost" onClick={() => act(`/api/v1/buildings/${b.id}/stop`)}>
                  停止
                </button>
                <button
                  className="collect"
                  disabled={b.status !== "ready"}
                  onClick={() => act(`/api/v1/buildings/${b.id}/collect`)}
                >
                  收取
                </button>
              </div>
              {job || b.status === "ready" ? (
                <div className="bar">
                  <i style={{ width: `${b.status === "ready" ? 100 : progress}%` }} />
                </div>
              ) : null}
            </article>
          );
        })}

        {unplaced.map((d) => (
          <div key={d.id} className="plot empty">
            <div className="bicon">{BUILDING_ICON[d.id] ?? "🪵"}</div>
            <div>空地 · 可放置{d.name}</div>
            <button onClick={() => act("/api/v1/buildings", { buildingDefId: d.id })}>放置{d.name}</button>
          </div>
        ))}
      </section>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "running") return "生產中";
  if (status === "ready") return "待收取";
  return "閒置";
}

function fmtBuffered(buf: Record<string, number>) {
  const parts = Object.entries(buf)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => `${ITEM_META[id]?.icon ?? ""} ${itemLabel(id)}×${q}`);
  return parts.length ? parts.join("  ") : "（無）";
}
