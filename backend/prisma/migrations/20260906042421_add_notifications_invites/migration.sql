-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pending_invites_token_key" ON "pending_invites"("token");

-- CreateIndex
CREATE INDEX "pending_invites_email_idx" ON "pending_invites"("email");

-- CreateIndex
CREATE INDEX "pending_invites_projectId_idx" ON "pending_invites"("projectId");

-- CreateIndex
CREATE INDEX "pending_invites_token_idx" ON "pending_invites"("token");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_invites" ADD CONSTRAINT "pending_invites_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
