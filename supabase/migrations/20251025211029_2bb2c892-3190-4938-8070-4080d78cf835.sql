-- Add DELETE policy for user_preferences table
-- This allows users to remove their own preference data, addressing GDPR compliance
CREATE POLICY "Users can delete their own preferences" 
ON user_preferences
FOR DELETE
USING (auth.uid() = user_id);