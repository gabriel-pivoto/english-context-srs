-- Drop old constraint if it still exists
ALTER TABLE "EmailToken"
  DROP CONSTRAINT IF EXISTS "EmailToken_token_key";

-- Rename column only if we're still on the legacy schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'EmailToken'
      AND column_name = 'token'
  ) THEN
    ALTER TABLE "EmailToken" RENAME COLUMN "token" TO "tokenHash";
  END IF;
END $$;

-- Ensure the new unique constraint exists (ignore if already created)
DO $$
BEGIN
  ALTER TABLE "EmailToken"
    ADD CONSTRAINT "EmailToken_tokenHash_key" UNIQUE ("tokenHash");
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Add metadata column if missing
ALTER TABLE "EmailToken"
  ADD COLUMN IF NOT EXISTS "requestIp" TEXT;

-- Recreate indexes idempotently
CREATE INDEX IF NOT EXISTS "EmailToken_email_idx" ON "EmailToken"("email");
CREATE INDEX IF NOT EXISTS "EmailToken_expiresAt_idx" ON "EmailToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "EmailToken_requestIp_idx" ON "EmailToken"("requestIp");
