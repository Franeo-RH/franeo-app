-- CreateTable
CREATE TABLE "BuddyContexte" (
    "userId" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuddyContexte_pkey" PRIMARY KEY ("userId")
);
