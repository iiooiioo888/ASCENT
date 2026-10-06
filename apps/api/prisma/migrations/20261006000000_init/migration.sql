-- CreateTable
CREATE TABLE "item_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "released_in_version" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "item_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "item_properties" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value_kind" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "released_in_version" TEXT NOT NULL,
    CONSTRAINT "item_properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "layer" TEXT NOT NULL,
    "derived_tier" INTEGER NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "rarity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "released_in_version" TEXT NOT NULL,
    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "parent_rule_id" TEXT,
    "inputs" JSONB NOT NULL,
    "outputs" JSONB NOT NULL,
    "duration_game_sec" INTEGER NOT NULL,
    "formulas" JSONB NOT NULL DEFAULT '{}',
    "compositions" JSONB NOT NULL DEFAULT '[]',
    "overrides" JSONB NOT NULL DEFAULT '{}',
    "optimizations" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "released_in_version" TEXT NOT NULL,
    CONSTRAINT "production_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_methods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "optimization" JSONB NOT NULL DEFAULT '{}',
    "inputs" JSONB NOT NULL DEFAULT '[]',
    "outputs" JSONB NOT NULL DEFAULT '[]',
    "duration_game_sec" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "released_in_version" TEXT NOT NULL,
    CONSTRAINT "production_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "building_defs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "system_code" TEXT NOT NULL,
    "footprint" INTEGER NOT NULL DEFAULT 1,
    "can_upgrade" BOOLEAN NOT NULL DEFAULT true,
    "can_specialize" BOOLEAN NOT NULL DEFAULT true,
    "allowed_rule_ids" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "released_in_version" TEXT NOT NULL,
    CONSTRAINT "building_defs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "building_levels" (
    "building_def_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "modifiers" JSONB NOT NULL DEFAULT '{}',
    "queue_limit" INTEGER NOT NULL,
    CONSTRAINT "building_levels_pkey" PRIMARY KEY ("building_def_id","level")
);

CREATE TABLE "game_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "time_scale" INTEGER NOT NULL DEFAULT 60,
    "game_day_game_sec" INTEGER NOT NULL DEFAULT 86400,
    "max_offline_real_sec" INTEGER NOT NULL DEFAULT 28800,
    "max_offline_game_sec" INTEGER NOT NULL DEFAULT 1728000,
    "tick_interval_real_ms" INTEGER NOT NULL DEFAULT 5000,
    CONSTRAINT "game_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "server_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "start_real_time" TIMESTAMP(3) NOT NULL,
    "start_game_time" BIGINT NOT NULL,
    "finish_at" TIMESTAMP(3),
    "last_update" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "server_state_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "player_inventory" (
    "player_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "quality" DECIMAL(65,30) NOT NULL DEFAULT 100,
    CONSTRAINT "player_inventory_pkey" PRIMARY KEY ("player_id","item_id")
);

CREATE TABLE "player_buildings" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "building_def_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "specialization" TEXT,
    "durability" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "method_id" TEXT,
    "last_settled_at" TIMESTAMP(3) NOT NULL,
    "last_settled_game" BIGINT NOT NULL,
    "last_update" TIMESTAMP(3) NOT NULL,
    "last_update_game" BIGINT NOT NULL,
    "finish_at" TIMESTAMP(3),
    "queue" JSONB NOT NULL DEFAULT '[]',
    "inputs" JSONB NOT NULL DEFAULT '{}',
    "outputs" JSONB NOT NULL DEFAULT '{}',
    "buffered_outputs" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL,
    CONSTRAINT "player_buildings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "item_types_code_key" ON "item_types"("code");
CREATE UNIQUE INDEX "item_properties_code_key" ON "item_properties"("code");
CREATE UNIQUE INDEX "items_code_key" ON "items"("code");
CREATE UNIQUE INDEX "production_rules_code_key" ON "production_rules"("code");
CREATE UNIQUE INDEX "production_methods_code_key" ON "production_methods"("code");
CREATE UNIQUE INDEX "building_defs_code_key" ON "building_defs"("code");
CREATE INDEX "items_properties_gin" ON "items" USING GIN ("properties");
CREATE INDEX "production_rules_inputs_gin" ON "production_rules" USING GIN ("inputs");
CREATE INDEX "production_rules_formulas_gin" ON "production_rules" USING GIN ("formulas");
CREATE INDEX "player_buildings_inputs_gin" ON "player_buildings" USING GIN ("inputs");

ALTER TABLE "items" ADD CONSTRAINT "items_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "item_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_methods" ADD CONSTRAINT "production_methods_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "production_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "building_levels" ADD CONSTRAINT "building_levels_building_def_id_fkey" FOREIGN KEY ("building_def_id") REFERENCES "building_defs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "player_inventory" ADD CONSTRAINT "player_inventory_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "player_inventory" ADD CONSTRAINT "player_inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "player_buildings" ADD CONSTRAINT "player_buildings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "player_buildings" ADD CONSTRAINT "player_buildings_building_def_id_fkey" FOREIGN KEY ("building_def_id") REFERENCES "building_defs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "player_buildings" ADD CONSTRAINT "player_buildings_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "production_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
