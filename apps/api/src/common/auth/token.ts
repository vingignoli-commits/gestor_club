import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';

export type TokenPayload = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  memberId: string | null;
};

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function getTokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET;

  if (!secret) {
    throw new Error('AUTH_TOKEN_SECRET no está configurada.');
  }

  return secret;
}

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;

  return timingSafeEqual(aBuffer, bBuffer);
}

export function signToken(user: TokenPayload) {
  const payload = { ...user, exp: Date.now() + TOKEN_TTL_MS };

  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );

  const signature = createHmac('sha256', getTokenSecret())
    .update(payloadEncoded)
    .digest('base64url');

  return `${payloadEncoded}.${signature}`;
}

export function verifyToken(token: string): TokenPayload {
  const [payloadEncoded, signature] = token.split('.');

  if (!payloadEncoded || !signature) {
    throw new UnauthorizedException('Token inválido.');
  }

  const expectedSignature = createHmac('sha256', getTokenSecret())
    .update(payloadEncoded)
    .digest('base64url');

  if (!safeCompare(signature, expectedSignature)) {
    throw new UnauthorizedException('Token inválido.');
  }

  let payload: TokenPayload & { exp: number };

  try {
    payload = JSON.parse(
      Buffer.from(payloadEncoded, 'base64url').toString('utf8'),
    ) as TokenPayload & { exp: number };
  } catch {
    throw new UnauthorizedException('Token inválido.');
  }

  if (!payload?.id || typeof payload.exp !== 'number') {
    throw new UnauthorizedException('Token inválido.');
  }

  if (payload.exp < Date.now()) {
    throw new UnauthorizedException('Sesión vencida.');
  }

  return {
    id: payload.id,
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role,
    memberId: payload.memberId ?? null,
  };
}

export function extractBearerToken(authorization?: string) {
  if (!authorization) {
    throw new UnauthorizedException('Falta token de sesión.');
  }

  const [type, token] = authorization.split(' ');

  if (type !== 'Bearer' || !token) {
    throw new UnauthorizedException('Token de sesión inválido.');
  }

  return token;
}
