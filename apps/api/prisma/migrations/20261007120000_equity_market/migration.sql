-- EQ-BE-1: 莊股持倉與行情（含 priceHistory JSON ring）。
CREATE TABLE "player_equity_holdings" (
    "player_id" TEXT NOT NULL,
    "equity_id" TEXT NOT NULL,
    "shares" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "player_equity_holdings_pkey" PRIMARY KEY ("player_id","equity_id"),
    CONSTRAINT "player_equity_holdings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "equity_ticker_state" (
    "equity_id" TEXT NOT NULL,
    "net_buy_volume" INTEGER NOT NULL DEFAULT 0,
    "current_price" INTEGER NOT NULL,
    "price_history" TEXT NOT NULL,
    CONSTRAINT "equity_ticker_state_pkey" PRIMARY KEY ("equity_id")
);
