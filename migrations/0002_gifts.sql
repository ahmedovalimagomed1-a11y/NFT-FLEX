ALTER TABLE users ADD COLUMN gift_upgrades INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inventory ADD COLUMN gift_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory ADD COLUMN gift_model TEXT;
ALTER TABLE inventory ADD COLUMN gift_backdrop TEXT;
ALTER TABLE inventory ADD COLUMN gift_symbol TEXT;

CREATE INDEX IF NOT EXISTS idx_inventory_gift ON inventory(item_key, gift_level);
