-- Marca a los usuarios que siguen usando una contraseña asignada por un tercero
-- (alta masiva con clave compartida, o reseteo hecho por un ADMIN).
--
-- Arranca en false para todos los usuarios existentes a propósito: desde la
-- base no se puede distinguir quién conserva la clave compartida y quién ya la
-- cambió. Ese caso se resuelve en el login, que sí ve la contraseña en claro y
-- marca el registro cuando detecta la clave por defecto.
ALTER TABLE "User"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
