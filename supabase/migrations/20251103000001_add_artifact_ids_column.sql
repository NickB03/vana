-- Add artifact_ids column to chat_messages table for lovable cloud instance
-- This migration was applied to vana-dev but needs to be applied to lovable cloud (xfwlneedhqealtktaacv)

-- Add column with default value (safe if column already exists)
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS artifact_ids text[] DEFAULT '{}';

-- Add GIN index for efficient array queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_artifact_ids
ON chat_messages USING GIN (artifact_ids);

-- Add column comment for documentation
COMMENT ON COLUMN chat_messages.artifact_ids IS 'Array of artifact IDs referenced in this message';

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
