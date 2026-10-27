import { TOTP, Secret } from "otpauth";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function totpUri(secret: string, email: string, issuer: string): string {
  return new TOTP({
    issuer,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  }).toString();
}

export function verifyTotpToken(encodedSecret: string, token: string): boolean {
  try {
    const totp = new TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(decryptSecret(encodedSecret)),
    });
    const delta = totp.validate({ token: token.replace(/\s/g, ""), window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

export function encryptTotpSecret(secret: string): string {
  return encryptSecret(secret);
}
