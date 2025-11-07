ALTER TABLE "EmailToken" RENAME COLUMN "token" TO "tokenHash";
ALTER TABLE "EmailToken" ADD COLUMN "requestIp" TEXT;
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_tokenHash_key" UNIQUE ("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailToken_email_idx" ON "EmailToken"("email");
CREATE INDEX IF NOT EXISTS "EmailToken_expiresAt_idx" ON "EmailToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "EmailToken_requestIp_idx" ON "EmailToken"("requestIp");
