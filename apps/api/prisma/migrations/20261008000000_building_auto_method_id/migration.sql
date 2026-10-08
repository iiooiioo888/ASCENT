-- P4-S1 D6：每建築可選自動配方
ALTER TABLE "player_buildings" ADD COLUMN "auto_method_id" TEXT;

ALTER TABLE "player_buildings" ADD CONSTRAINT "player_buildings_auto_method_id_fkey" FOREIGN KEY ("auto_method_id") REFERENCES "production_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
