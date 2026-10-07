-- MK-BE-1: 市集價目 JSON（TODO(product): 平衡未定）；SQLite 存 TEXT。
ALTER TABLE "game_config" ADD COLUMN "market_prices" TEXT;
