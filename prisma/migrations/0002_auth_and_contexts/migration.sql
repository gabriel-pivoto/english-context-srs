-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" TEXT,
    "native" TEXT,
    "target" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Context" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints / indexes for new tables
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE UNIQUE INDEX "EmailToken_token_key" ON "EmailToken"("token");
CREATE INDEX "EmailToken_email_idx" ON "EmailToken"("email");
CREATE INDEX "EmailToken_expiresAt_idx" ON "EmailToken"("expiresAt");
CREATE INDEX "Context_userId_title_idx" ON "Context"("userId", "title");

-- Add new columns to existing tables
ALTER TABLE "Item" ADD COLUMN "userId" TEXT;
ALTER TABLE "Item" ADD COLUMN "contextId" TEXT;
ALTER TABLE "Review" ADD COLUMN "userId" TEXT;

-- Seed legacy owner/context for existing rows
INSERT INTO "User" ("id", "email")
VALUES ('legacy-user', 'legacy@example.com')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Context" ("id", "userId", "title", "level")
VALUES ('legacy-context', 'legacy-user', 'Legacy context', 'B1')
ON CONFLICT ("id") DO NOTHING;

UPDATE "Item" SET "userId" = 'legacy-user', "contextId" = 'legacy-context' WHERE "userId" IS NULL OR "contextId" IS NULL;
UPDATE "Review" SET "userId" = 'legacy-user' WHERE "userId" IS NULL;

-- Make the new columns required
ALTER TABLE "Item" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Item" ALTER COLUMN "contextId" SET NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "userId" SET NOT NULL;

-- Add indexes on the new relationships
CREATE INDEX "Item_userId_idx" ON "Item"("userId");
CREATE INDEX "Item_contextId_idx" ON "Item"("contextId");
CREATE INDEX "Review_userId_createdAt_idx" ON "Review"("userId", "createdAt");

-- Add foreign keys
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Context" ADD CONSTRAINT "Context_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "Context"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigger for Context.updatedAt (reuses the existing helper function from 0001)
CREATE TRIGGER "update_context_updated_at"
BEFORE UPDATE ON "Context"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
