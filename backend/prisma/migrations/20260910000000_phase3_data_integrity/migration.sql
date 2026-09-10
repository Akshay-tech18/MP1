-- AlterTable
ALTER TABLE "activity_logs" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "one_active_sprint" ON "sprints"("projectId") WHERE status = 'ACTIVE';
