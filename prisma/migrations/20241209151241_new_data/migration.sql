/*
  Warnings:

  - You are about to alter the column `discount` on the `DiscountCoupon` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "DiscountCoupon" ALTER COLUMN "discount" SET DATA TYPE INTEGER;
