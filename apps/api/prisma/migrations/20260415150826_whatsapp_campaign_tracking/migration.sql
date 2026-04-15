-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MemberCategory" AS ENUM ('SIMPLE', 'DOBLE', 'ESTUDIANTE', 'SOCIAL', 'MENOR', 'HONOR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('REGISTERED', 'VOID');

-- CreateEnum
CREATE TYPE "CashDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('MEMBERSHIP', 'SALE', 'DONATION', 'TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('SUPPLIES', 'SERVICES', 'SALARY', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "category" "MemberCategory" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "grade" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberStatusHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "MemberStatus" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberCategoryHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "category" "MemberCategory" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberCategoryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyRate" (
    "id" TEXT NOT NULL,
    "category" "MemberCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPeriod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "billingPeriodId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "methodCode" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'REGISTERED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashTransaction" (
    "id" TEXT NOT NULL,
    "direction" "CashDirection" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "methodCode" TEXT,
    "description" TEXT NOT NULL,
    "incomeType" "IncomeType",
    "expenseType" "ExpenseType",
    "receiptUrl" TEXT,
    "receiptNote" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageDispatch" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "templateId" TEXT,
    "destination" TEXT NOT NULL,
    "renderedBody" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "campaignCode" TEXT,
    "campaignYear" INTEGER,
    "campaignMonth" INTEGER,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_matricula_key" ON "Member"("matricula");

-- CreateIndex
CREATE INDEX "Member_lastName_firstName_idx" ON "Member"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Member_status_category_idx" ON "Member"("status", "category");

-- CreateIndex
CREATE INDEX "MemberStatusHistory_memberId_effectiveFrom_idx" ON "MemberStatusHistory"("memberId", "effectiveFrom" DESC);

-- CreateIndex
CREATE INDEX "MemberStatusHistory_status_effectiveFrom_idx" ON "MemberStatusHistory"("status", "effectiveFrom" DESC);

-- CreateIndex
CREATE INDEX "MemberCategoryHistory_memberId_effectiveFrom_idx" ON "MemberCategoryHistory"("memberId", "effectiveFrom" DESC);

-- CreateIndex
CREATE INDEX "MemberCategoryHistory_category_effectiveFrom_idx" ON "MemberCategoryHistory"("category", "effectiveFrom" DESC);

-- CreateIndex
CREATE INDEX "MonthlyRate_category_validFrom_idx" ON "MonthlyRate"("category", "validFrom" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "BillingPeriod_code_key" ON "BillingPeriod"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPeriod_periodYear_periodMonth_key" ON "BillingPeriod"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "Charge_memberId_idx" ON "Charge"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Charge_memberId_billingPeriodId_key" ON "Charge"("memberId", "billingPeriodId");

-- CreateIndex
CREATE INDEX "Payment_memberId_paidAt_idx" ON "Payment"("memberId", "paidAt" DESC);

-- CreateIndex
CREATE INDEX "Payment_periodYear_periodMonth_idx" ON "Payment"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "CashTransaction_occurredAt_direction_idx" ON "CashTransaction"("occurredAt", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappTemplate_code_key" ON "WhatsappTemplate"("code");

-- CreateIndex
CREATE INDEX "MessageDispatch_status_scheduledAt_idx" ON "MessageDispatch"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "MessageDispatch_campaignCode_campaignYear_campaignMonth_idx" ON "MessageDispatch"("campaignCode", "campaignYear", "campaignMonth");

-- CreateIndex
CREATE INDEX "MessageDispatch_memberId_campaignCode_campaignYear_campaign_idx" ON "MessageDispatch"("memberId", "campaignCode", "campaignYear", "campaignMonth");

-- CreateIndex
CREATE INDEX "AuditLog_entityName_entityId_createdAt_idx" ON "AuditLog"("entityName", "entityId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "MemberStatusHistory" ADD CONSTRAINT "MemberStatusHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberCategoryHistory" ADD CONSTRAINT "MemberCategoryHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_billingPeriodId_fkey" FOREIGN KEY ("billingPeriodId") REFERENCES "BillingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDispatch" ADD CONSTRAINT "MessageDispatch_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDispatch" ADD CONSTRAINT "MessageDispatch_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsappTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
