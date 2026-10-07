-- OB-BE-1: 大宗現貨壓力價與 priceHistory（ring JSON）。
CREATE TABLE "commodity_market_state" (
    "commodity_id" TEXT NOT NULL PRIMARY KEY,
    "net_pressure_volume" DECIMAL NOT NULL DEFAULT 0,
    "price_history" TEXT NOT NULL
);
