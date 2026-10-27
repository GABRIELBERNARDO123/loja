import { redirect } from "next/navigation";
import { getCurrentSession, type SessionUser } from "@/lib/auth/session";

export class UnauthorizedError extends Error {
  status: number;
  constructor(message = "Não autenticado", status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(nextPath = "/conta"): Promise<SessionUser> {
  const current = await getCurrentSession();
  if (!current) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  return current.user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const current = await getCurrentSession();
  if (!current) redirect("/entrar?next=/admin");
  if (current.user.role.name !== "ADMIN" || !current.user.isActive) redirect("/");
  if (!current.session.mfaVerified) redirect("/verificar-2fa?next=/admin");
  return current.user;
}

export async function requireUserApi(): Promise<SessionUser> {
  const current = await getCurrentSession();
  if (!current) throw new UnauthorizedError();
  return current.user;
}

export async function requireAdminApi(): Promise<SessionUser> {
  const current = await getCurrentSession();
  if (!current || current.user.role.name !== "ADMIN" || !current.user.isActive) {
    throw new UnauthorizedError("Acesso negado", 403);
  }
  if (!current.session.mfaVerified) {
    throw new UnauthorizedError("Verificação em duas etapas necessária", 403);
  }
  return current.user;
}
