import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function passwordPolicyIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 10) issues.push("A senha deve ter pelo menos 10 caracteres.");
  if (password.length > 128) issues.push("A senha deve ter no máximo 128 caracteres.");
  if (!/[a-z]/.test(password)) issues.push("A senha deve conter uma letra minúscula.");
  if (!/[A-Z]/.test(password)) issues.push("A senha deve conter uma letra maiúscula.");
  if (!/[0-9]/.test(password)) issues.push("A senha deve conter um número.");
  if (!/[^A-Za-z0-9]/.test(password)) issues.push("A senha deve conter um caractere especial.");
  return issues;
}
