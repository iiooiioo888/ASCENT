-- CURR-BARTER：玩家 item_gold（舊金錢餘額）1:1 轉入 item_copper_ingot，之後清零金錢列。
UPDATE player_inventory AS copper
SET quantity = copper.quantity + (
  SELECT COALESCE(gold.quantity, 0)
  FROM player_inventory AS gold
  WHERE gold.player_id = copper.player_id AND gold.item_id = 'item_gold'
)
WHERE copper.item_id = 'item_copper_ingot'
  AND EXISTS (
    SELECT 1 FROM player_inventory AS gold
    WHERE gold.player_id = copper.player_id AND gold.item_id = 'item_gold' AND gold.quantity > 0
  );

INSERT INTO player_inventory (player_id, item_id, quantity)
SELECT g.player_id, 'item_copper_ingot', g.quantity
FROM player_inventory AS g
WHERE g.item_id = 'item_gold' AND g.quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM player_inventory AS c
    WHERE c.player_id = g.player_id AND c.item_id = 'item_copper_ingot'
  );

UPDATE player_inventory SET quantity = 0 WHERE item_id = 'item_gold' AND quantity > 0;
