-- CreateTable
CREATE TABLE "AIGeneration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "deck_id" UUID,
    "input_text" TEXT NOT NULL,
    "generated_cards" JSONB NOT NULL,
    "tokens_used" INTEGER NOT NULL,
    "model_used" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" UUID,
    "feature" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "input_cost" DECIMAL(10,6) NOT NULL,
    "output_cost" DECIMAL(10,6) NOT NULL,
    "total_cost" DECIMAL(10,6) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "latency_ms" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUserQuota" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "monthly_limit" INTEGER NOT NULL DEFAULT 1000000,
    "current_usage" INTEGER NOT NULL DEFAULT 0,
    "reset_date" TIMESTAMPTZ(6) NOT NULL,
    "tier" VARCHAR(20) NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUserQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageAnalytics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period" VARCHAR(10) NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "total_requests" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "total_cost" DECIMAL(10,6) NOT NULL,
    "avg_latency_ms" INTEGER NOT NULL,
    "success_rate" DECIMAL(5,2) NOT NULL,
    "top_features" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIGeneration_user_id_idx" ON "AIGeneration"("user_id");

-- CreateIndex
CREATE INDEX "AIGeneration_deck_id_idx" ON "AIGeneration"("deck_id");

-- CreateIndex
CREATE INDEX "AIGeneration_created_at_idx" ON "AIGeneration"("created_at");

-- CreateIndex
CREATE INDEX "AIUsageLog_user_id_created_at_idx" ON "AIUsageLog"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "AIUsageLog_organization_id_created_at_idx" ON "AIUsageLog"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "AIUsageLog_feature_created_at_idx" ON "AIUsageLog"("feature", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "AIUserQuota_user_id_key" ON "AIUserQuota"("user_id");

-- CreateIndex
CREATE INDEX "AIUsageAnalytics_user_id_period_start_idx" ON "AIUsageAnalytics"("user_id", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsageAnalytics_user_id_period_period_start_key" ON "AIUsageAnalytics"("user_id", "period", "period_start");

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "Deck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUserQuota" ADD CONSTRAINT "AIUserQuota_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageAnalytics" ADD CONSTRAINT "AIUsageAnalytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
