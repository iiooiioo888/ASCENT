-- P0：結算索引、Refresh Token、里程碑 progress、最小 NPC 訂單。

CREATE INDEX "player_buildings_player_id_idx" ON "player_buildings"("player_id");

CREATE INDEX "player_buildings_player_id_last_settled_at_idx" ON "player_buildings"("player_id", "last_settled_at");

ALTER TABLE "accounts" ADD COLUMN "refresh_token_hash" TEXT;
ALTER TABLE "accounts" ADD COLUMN "refresh_token_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "accounts_refresh_token_hash_key" ON "accounts"("refresh_token_hash");

ALTER TABLE "players" ADD COLUMN "progress" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "player_npc_orders" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "spawn_bucket" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "required_items" JSONB NOT NULL,
    "rewards_snapshot" JSONB NOT NULL,
    "created_game_sec" BIGINT NOT NULL,
    "expires_game_sec" BIGINT NOT NULL,

    CONSTRAINT "player_npc_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "player_npc_orders_player_id_spawn_bucket_rule_id_key" ON "player_npc_orders"("player_id", "spawn_bucket", "rule_id");

CREATE INDEX "player_npc_orders_player_id_status_idx" ON "player_npc_orders"("player_id", "status");

ALTER TABLE "player_npc_orders" ADD CONSTRAINT "player_npc_orders_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "player_npc_order_scans" (
    "player_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "last_scanned_bucket" BIGINT NOT NULL,

    CONSTRAINT "player_npc_order_scans_pkey" PRIMARY KEY ("player_id","rule_id")
);

ALTER TABLE "player_npc_order_scans" ADD CONSTRAINT "player_npc_order_scans_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
