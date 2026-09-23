-- Datos de contacto ampliados del socio y ficha de emergencia.
--
-- El contacto de emergencia va en "Member" (dato de contacto) y no en
-- "MemberHealth" a proposito: ante una urgencia hay que poder llamar a la
-- familia sin acceder a informacion medica, que queda detras de 'health:read'.

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "alternatePhone" TEXT;
ALTER TABLE "Member" ADD COLUMN     "emergencyContactName" TEXT;
ALTER TABLE "Member" ADD COLUMN     "emergencyContactRelationship" TEXT;
ALTER TABLE "Member" ADD COLUMN     "emergencyContactPhone" TEXT;

-- CreateEnum
-- POS/NEG en vez de +/- porque un enum de Postgres no admite esos caracteres.
CREATE TYPE "BloodType" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG', 'UNKNOWN');

-- CreateTable
-- Tabla aparte y no columnas de "Member": 'members:read' es permiso por
-- defecto de todo socio y /members devuelve la fila entera, de modo que
-- cualquier dato de salud alojado en "Member" quedaria visible para el padron
-- completo. Todos los campos son opcionales: la carga es voluntaria.
CREATE TABLE "MemberHealth" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "bloodType" "BloodType" NOT NULL DEFAULT 'UNKNOWN',
    "allergies" TEXT,
    "medications" TEXT,
    "chronicConditions" TEXT,
    "insuranceProvider" TEXT,
    "insuranceMemberId" TEXT,
    "insuranceEmergencyPhone" TEXT,
    "primaryDoctorName" TEXT,
    "primaryDoctorPhone" TEXT,
    "implantedDevices" TEXT,
    "relevantSurgeries" TEXT,
    "organDonationOpposition" BOOLEAN NOT NULL DEFAULT false,
    "advanceDirectives" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberHealth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberHealth_memberId_key" ON "MemberHealth"("memberId");

-- AddForeignKey
ALTER TABLE "MemberHealth" ADD CONSTRAINT "MemberHealth_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
