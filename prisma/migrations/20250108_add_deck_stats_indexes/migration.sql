-- AddDeckStatsIndexes
-- Composite index for efficient deck statistics queries
CREATE INDEX IF NOT EXISTS "CardState_user_id_due_date_idx" ON "CardState"("user_id", "due_date");

-- Index for card state queries by user and state
CREATE INDEX IF NOT EXISTS "CardState_user_id_state_idx" ON "CardState"("user_id", "state");

-- Index for review queries by user and date
CREATE INDEX IF NOT EXISTS "Review_user_id_reviewed_at_idx" ON "Review"("user_id", "reviewed_at");

-- Composite index for card state queries with deck filtering
CREATE INDEX IF NOT EXISTS "Card_deck_id_idx" ON "Card"("deck_id");