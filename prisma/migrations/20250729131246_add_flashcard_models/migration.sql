-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('BASIC', 'CLOZE');

-- CreateEnum
CREATE TYPE "CardStateEnum" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateTable
CREATE TABLE "Deck" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "user_id" TEXT NOT NULL,
    "organization_id" UUID,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deck_id" UUID NOT NULL,
    "card_type" "CardType" NOT NULL DEFAULT 'BASIC',
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "cloze_text" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "card_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" "ReviewRating" NOT NULL,
    "response_time" INTEGER NOT NULL,
    "reviewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_interval" INTEGER NOT NULL,
    "new_interval" INTEGER NOT NULL,
    "easiness_factor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardState" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "card_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "state" "CardStateEnum" NOT NULL DEFAULT 'NEW',
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "easiness_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "last_reviewed" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deck_user_id_idx" ON "Deck"("user_id");

-- CreateIndex
CREATE INDEX "Deck_organization_id_idx" ON "Deck"("organization_id");

-- CreateIndex
CREATE INDEX "Deck_created_at_idx" ON "Deck"("created_at");

-- CreateIndex
CREATE INDEX "Card_deck_id_idx" ON "Card"("deck_id");

-- CreateIndex
CREATE INDEX "Card_note_id_idx" ON "Card"("note_id");

-- CreateIndex
CREATE INDEX "Card_card_type_idx" ON "Card"("card_type");

-- CreateIndex
CREATE INDEX "Card_created_at_idx" ON "Card"("created_at");

-- CreateIndex
CREATE INDEX "Review_card_id_idx" ON "Review"("card_id");

-- CreateIndex
CREATE INDEX "Review_user_id_idx" ON "Review"("user_id");

-- CreateIndex
CREATE INDEX "Review_reviewed_at_idx" ON "Review"("reviewed_at");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "CardState_user_id_due_date_idx" ON "CardState"("user_id", "due_date");

-- CreateIndex
CREATE INDEX "CardState_user_id_state_idx" ON "CardState"("user_id", "state");

-- CreateIndex
CREATE INDEX "CardState_card_id_idx" ON "CardState"("card_id");

-- CreateIndex
CREATE INDEX "CardState_due_date_idx" ON "CardState"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "CardState_card_id_user_id_key" ON "CardState"("card_id", "user_id");

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardState" ADD CONSTRAINT "CardState_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardState" ADD CONSTRAINT "CardState_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
