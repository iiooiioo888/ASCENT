-- AFK-BE-1：建築自動開工開關與暫停原因（舊存檔預設關閉）
ALTER TABLE "player_buildings" ADD COLUMN "auto_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "player_buildings" ADD COLUMN "auto_pause_reason" TEXT;
