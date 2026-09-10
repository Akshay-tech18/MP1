-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "pending_invites" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "pending_invites" ALTER COLUMN "status" TYPE "InviteStatus" USING ("status"::text::"InviteStatus");
ALTER TABLE "pending_invites" ALTER COLUMN "status" SET DEFAULT 'PENDING';
