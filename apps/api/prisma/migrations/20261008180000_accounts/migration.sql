-- F1：簡單帳號。一個帳號對一個玩家世界。權威庫存仍在 players／player_inventory。
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounts_username_key" ON "accounts"("username");

CREATE UNIQUE INDEX "accounts_player_id_key" ON "accounts"("player_id");

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
