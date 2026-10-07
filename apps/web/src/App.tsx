import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { BuildingCard } from "./components/BuildingCard";
import { IndustryChain } from "./components/IndustryChain";
import { SiloBuildingCard } from "./components/SiloBuildingCard";
import { TradingPostBuildingCard } from "./components/TradingPostBuildingCard";
import { ConnectionStatusBar } from "./components/ConnectionStatusBar";
import { DepletionNotice } from "./components/DepletionNotice";
import { Inventory } from "./components/Inventory";
import { MarketPanel, marketPendingKey, type MarketTabFocusRequest } from "./components/MarketPanel";
import { OfflineSummaryNotice } from "./components/OfflineSummaryNotice";
import { LoadingScreen } from "./components/LoadingScreen";
import type { BuildingActionErrorView } from "./building-action-error";
import { mapBuildingActionError } from "./building-action-error";
import type { MarketActionErrorView } from "./market-action-error";
import { mapMarketActionError } from "./market-action-error";
import { fetchMarket, postMarketBuy, postMarketSell, type MarketSnapshot } from "./market";
import {
  canAffordAnyMarketBuy,
  formatMarketTradeSuccess,
  hudGoldChipLabel,
  MARKET_PANEL_ANCHOR_ID,
  resolveHudGold,
} from "./market-feedback";
import { nextPollFailureCount, shouldShowConnectionLost } from "./connectionPoll";
import {
  buildingScrollAnchorId,
  findFieldBuilding,
  pickSaveSeedMethodId,
  isPreplacedBuildingPlotHidden,
  resolveTradingPostScrollAnchorId,
  resolveWellScrollAnchorId,
  SCROLL_HIGHLIGHT_MS,
} from "./depletion-scroll";
import { isResourceDepleted } from "./depletion";
import { FEATURE_SHOW_DEPLETION_EMPTY_STATE, FEATURE_SHOW_SILO_PLACEMENT, FEATURE_SILO_CARD_MODE } from "./featureFlags";
import { formatUserError, fmtGameClockChip } from "./format";
import { sortInventoryRows } from "./inventorySort";
import { BUILDING_ICON } from "./meta";
import {
  BRAND_DISPLAY_NAME,
  BRAND_SUBTITLE,
  FEATURE_OFFLINE_SUMMARY,
  GAME_TIME_CHIP_PREFIX,
  OFFLINE_PROGRESS_BANNER,
  OFFLINE_PROGRESS_HUD_CHIP,
  SLICE_FLOW_BANNER,
  SLICE_GOAL_BANNER,
  timeScaleHudChip,
} from "./productCopy";
import {
  FIELD_BUILDING_DEF_ID,
  TRADING_POST_BUILDING_DEF_ID,
  WELL_BUILDING_DEF_ID,
} from "./resource-loop-copy";
import { isSiloBuilding, isSiloBuildingDef } from "./silo";
import { isTradingPostBuilding } from "./trading-post";
import {
  collectHighlightItemIds,
  formatCollectSuccess,
  SUCCESS_FEEDBACK_MS,
} from "./successFeedback";
import type { GameState, Method } from "./types";
import {
  diffOfflineSnapshot,
  isOfflineSummaryEnabled,
  loadStoredSnapshot,
  saveStoredSnapshot,
  snapshotFromGameState,
  type OfflineSummaryResult,
} from "./offlineSummary";

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadRetrying, setLoadRetrying] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const pollFailuresRef = useRef(0);
  const [actionErrors, setActionErrors] = useState<Record<string, BuildingActionErrorView>>({});
  const [actionSuccess, setActionSuccess] = useState<Record<string, string>>({});
  const [highlightItems, setHighlightItems] = useState<Set<string>>(() => new Set());
  const successTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [highlightDefId, setHighlightDefId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeysRef = useRef(new Set<string>());
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());
  const stateRef = useRef<GameState | null>(null);
  const offlineSummaryVisibleRef = useRef(false);
  const offlineEvaluatedRef = useRef(false);
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummaryResult | null>(null);
  const [marketSnapshot, setMarketSnapshot] = useState<MarketSnapshot | null>(null);
  const [marketPanelError, setMarketPanelError] = useState<MarketActionErrorView | null>(null);
  const [marketSuccessToast, setMarketSuccessToast] = useState<string | null>(null);
  const marketToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [marketTabFocusRequest, setMarketTabFocusRequest] = useState<MarketTabFocusRequest | undefined>();
  const [marketPanelOpen, setMarketPanelOpen] = useState(false);

  stateRef.current = state;

  const refresh = useCallback(async () => {
    const next = await api<GameState>("/api/v1/state");
    setState(next);
    pollFailuresRef.current = 0;
    setConnectionLost(false);
    setLoadError("");
    return next;
  }, []);

  const refreshMarket = useCallback(async () => {
    const snapshot = await fetchMarket();
    setMarketSnapshot(snapshot);
    return snapshot;
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
    if (!state || !isOfflineSummaryEnabled(FEATURE_OFFLINE_SUMMARY)) return;
    if (offlineEvaluatedRef.current) return;
    offlineEvaluatedRef.current = true;

    const previous = loadStoredSnapshot();
    if (previous) {
      const summary = diffOfflineSnapshot(previous, state);
      if (summary) {
        setOfflineSummary(summary);
        offlineSummaryVisibleRef.current = true;
        return;
      }
    }
    saveStoredSnapshot(snapshotFromGameState(state));
  }, [state]);

  useEffect(() => {
    if (!state || !isOfflineSummaryEnabled(FEATURE_OFFLINE_SUMMARY)) return undefined;

    const persistUnlessSummaryOpen = () => {
      if (offlineSummaryVisibleRef.current) return;
      const current = stateRef.current;
      if (current) saveStoredSnapshot(snapshotFromGameState(current));
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") persistUnlessSummaryOpen();
    };

    window.addEventListener("pagehide", persistUnlessSummaryOpen);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", persistUnlessSummaryOpen);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [state]);

  const dismissOfflineSummary = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    setOfflineSummary(null);
    offlineSummaryVisibleRef.current = false;
    saveStoredSnapshot(snapshotFromGameState(current));
  }, []);

  useEffect(() => {
    if (!state) return undefined;
    const t = setInterval(() => {
      refresh().catch(handlePollFailure);
    }, 2000);
    return () => clearInterval(t);
  }, [state, refresh, handlePollFailure]);

  useEffect(() => {
    if (!state) return;
    refreshMarket().catch(() => undefined);
  }, [state, refreshMarket]);

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
    document.getElementById(anchorId)?.focus({ preventScroll: true });
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

  const resourceDepleted = useMemo(() => {
    if (!state) return false;
    return isResourceDepleted(state.buildings, state.inventory, methodsByRule);
  }, [state, methodsByRule]);

  const sortedInventory = useMemo(() => {
    if (!state) return [];
    return sortInventoryRows(state.inventory);
  }, [state]);

  const hudGold = useMemo(
    () => (state ? resolveHudGold(marketSnapshot?.gold, state.inventory) : 0),
    [marketSnapshot?.gold, state],
  );

  const marketCtaProminent = useMemo(
    () => canAffordAnyMarketBuy(hudGold, marketSnapshot?.prices),
    [hudGold, marketSnapshot?.prices],
  );

  const goToWell = useCallback(() => {
    if (!state) return;
    const anchor = resolveWellScrollAnchorId(state.buildings);
    if (!anchor) return;
    flashHighlight(WELL_BUILDING_DEF_ID);
    scrollToAnchor(anchor);
  }, [flashHighlight, scrollToAnchor, state]);

  const goToSaveSeed = useCallback(() => {
    if (!state) return;
    flashHighlight(FIELD_BUILDING_DEF_ID);
    const field = findFieldBuilding(state.buildings);
    if (field) {
      const saveSeedId = pickSaveSeedMethodId(field, methodsByRule);
      if (saveSeedId) {
        setPicked((prev) => ({ ...prev, [field.id]: saveSeedId }));
      }
      scrollToAnchor(buildingScrollAnchorId(field.id));
    }
  }, [flashHighlight, methodsByRule, scrollToAnchor, state]);

  const goToMarket = useCallback(
    (opts?: { preferBuyTab?: boolean }) => {
      if (!state) return;
      setMarketPanelOpen(true);
      if (opts?.preferBuyTab) {
        setMarketTabFocusRequest({ tab: "buy", seq: Date.now() });
      }
      flashHighlight(TRADING_POST_BUILDING_DEF_ID);
      const buildingAnchor = resolveTradingPostScrollAnchorId(state.buildings);
      if (buildingAnchor) scrollToAnchor(buildingAnchor);
      requestAnimationFrame(() => scrollToAnchor(MARKET_PANEL_ANCHOR_ID));
    },
    [flashHighlight, scrollToAnchor, state],
  );

  const showMarketSuccess = useCallback((message: string, tradedItemId: string) => {
    if (marketToastTimerRef.current) {
      clearTimeout(marketToastTimerRef.current);
      marketToastTimerRef.current = null;
    }
    setMarketSuccessToast(message);
    setHighlightItems((prev) => {
      const next = new Set(prev);
      next.add("item_gold");
      next.add(tradedItemId);
      return next;
    });
    marketToastTimerRef.current = setTimeout(() => {
      marketToastTimerRef.current = null;
      setMarketSuccessToast(null);
      setHighlightItems((prev) => {
        const next = new Set(prev);
        next.delete("item_gold");
        next.delete(tradedItemId);
        return next;
      });
    }, SUCCESS_FEEDBACK_MS);
  }, []);

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
    [refresh, setPending, clearSuccessFeedback, showCollectSuccess],
  );

  const marketTrade = useCallback(
    async (side: "sell" | "buy", itemId: string, quantity: number) => {
      const actionKey = marketPendingKey(side, itemId);
      if (pendingKeysRef.current.has(actionKey)) return;

      const unitPrice =
        side === "sell"
          ? (marketSnapshot?.prices.sell[itemId] ?? 0)
          : (marketSnapshot?.prices.buy[itemId] ?? 0);
      const goldAmount = unitPrice * quantity;

      setPending(actionKey, true);
      setMarketPanelError(null);

      try {
        if (side === "sell") {
          await postMarketSell(itemId, quantity);
        } else {
          await postMarketBuy(itemId, quantity);
        }
        showMarketSuccess(formatMarketTradeSuccess(side, itemId, quantity, goldAmount), itemId);
        await refresh();
        await refreshMarket();
      } catch (e) {
        const mapped = mapMarketActionError(e);
        if (mapped.shouldRefresh) {
          await refresh().catch(() => undefined);
          await refreshMarket().catch(() => undefined);
        }
        setMarketPanelError({ message: mapped.message, hint: mapped.hint });
      } finally {
        setPending(actionKey, false);
      }
    },
    [marketSnapshot, refresh, refreshMarket, setPending, showMarketSuccess],
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
      if (marketToastTimerRef.current) clearTimeout(marketToastTimerRef.current);
    };
  }, []);

  if (!state) {
    return <LoadingScreen error={loadError} retrying={loadRetrying} onRetry={retryInitialLoad} />;
  }

  const unplaced = state.buildingDefs.filter((d) => {
    if (isPreplacedBuildingPlotHidden(d.id)) return false;
    if (!FEATURE_SHOW_SILO_PLACEMENT && isSiloBuildingDef(d.id)) return false;
    return !state.buildings.some((b) => b.buildingDefId === d.id);
  });

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
          <span className="chip chip-muted">
            {fmtGameClockChip(state.time.displayGameTime, GAME_TIME_CHIP_PREFIX)}
          </span>
          <span className="chip">{timeScaleHudChip(state.time.timeScale)}</span>
          <span className="chip chip-gold" data-testid="hud-gold-chip">
            {hudGoldChipLabel(hudGold)}
          </span>
          <span className="chip">{OFFLINE_PROGRESS_HUD_CHIP}</span>
        </div>
      </header>

      <p className="banner banner-goal">{SLICE_GOAL_BANNER}</p>
      <p className="banner">{SLICE_FLOW_BANNER}</p>
      <p className="banner banner-muted">{OFFLINE_PROGRESS_BANNER}</p>
      {offlineSummary ? (
        <OfflineSummaryNotice summary={offlineSummary} onDismiss={dismissOfflineSummary} />
      ) : null}
      <DepletionNotice
        visible={FEATURE_SHOW_DEPLETION_EMPTY_STATE && resourceDepleted}
        onGoWell={goToWell}
        onGoSaveSeed={goToSaveSeed}
        onGoMarket={() => goToMarket({ preferBuyTab: marketCtaProminent })}
        marketCtaProminent={marketCtaProminent}
      />

      <Inventory inventory={sortedInventory} highlightItemIds={highlightItems} />

      <IndustryChain buildings={state.buildings} />

      <section className="settlement">
        {state.buildings.map((b) => {
          const allowed = b.buildingDef.allowedRuleIds ?? [];
          const options = allowed.flatMap((rid) => methodsByRule.get(rid) ?? []);
          const selectedId = picked[b.id] ?? options[0]?.id;
          const selected = options.find((m) => m.id === selectedId);
          const actionKey = b.id;

          if (isSiloBuilding(b) && FEATURE_SILO_CARD_MODE === "simplified") {
            return (
              <SiloBuildingCard
                key={b.id}
                building={b}
                actionError={actionErrors[actionKey]}
                pending={pendingKeys.has(actionKey)}
              />
            );
          }

          if (isTradingPostBuilding(b)) {
            return (
              <Fragment key={b.id}>
                <TradingPostBuildingCard
                  building={b}
                  scrollAnchorId={buildingScrollAnchorId(b.id)}
                  highlight={highlightDefId === b.buildingDefId}
                  marketOpen={marketPanelOpen}
                  onToggleMarket={() => setMarketPanelOpen((open) => !open)}
                />
                {marketPanelOpen ? (
                  <MarketPanel
                    market={marketSnapshot}
                    panelError={marketPanelError}
                    pendingKeys={pendingKeys}
                    successToast={marketSuccessToast}
                    tabFocusRequest={marketTabFocusRequest}
                    onSell={(itemId, quantity) => marketTrade("sell", itemId, quantity)}
                    onBuy={(itemId, quantity) => marketTrade("buy", itemId, quantity)}
                  />
                ) : null}
              </Fragment>
            );
          }

          return (
            <BuildingCard
              key={b.id}
              scrollAnchorId={buildingScrollAnchorId(b.id)}
              highlight={highlightDefId === b.buildingDefId}
              building={b}
              options={options}
              inventory={state.inventory}
              selectedId={selectedId}
              selected={selected}
              timeScale={state.time.timeScale}
              serverRealTime={state.time.serverRealTime}
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
            <div
              key={d.id}
              id={`plot-unplaced-${d.id}`}
              className={`plot empty${pending ? " pending" : ""}${highlightDefId === d.id ? " scroll-highlight" : ""}`}
            >
              <fieldset className="plot-body" disabled={pending}>
                <div className="bicon" role="img" aria-label={d.name}>
                  {BUILDING_ICON[d.id] ?? "🪵"}
                </div>
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
