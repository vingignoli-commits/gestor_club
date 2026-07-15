-- Avisos del taller: comunicación masiva del admin hacia los socios con acceso
-- al dashboard "Nuestro Taller". El estado de leído/no leído se resuelve por
-- usuario en el cliente, por eso acá no hay tabla de lecturas.
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_isActive_isPinned_createdAt_idx"
    ON "Announcement" ("isActive", "isPinned", "createdAt" DESC);
