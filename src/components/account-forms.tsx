"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOutIcon, MailIcon, ShieldIcon } from "@/components/icons";

async function request(url: string, method: string, body?: unknown): Promise<{ ok?: boolean; error?: string; message?: string; next?: string }> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string; next?: string };
  if (!response.ok || !data.ok) throw new Error(data.error ?? "Não foi possível concluir a operação.");
  return data;
}

export function LogOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function logout() {
    setLoading(true);
    try {
      await request("/api/auth/logout", "POST");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Não foi possível sair.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="flex w-full items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-sm text-zinc-500 transition-colors hover:border-red-400/20 hover:bg-red-400/5 hover:text-red-300"
    >
      <LogOutIcon /> {loading ? "Saindo..." : "Encerrar sessão"}
    </button>
  );
}

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await request("/api/account/profile", "PATCH", { name });
      toast.success("Perfil atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar perfil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="profile-name" className="label">Nome completo</label>
        <input
          id="profile-name"
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="input"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("A confirmação não coincide com a nova senha.");
      return;
    }
    setLoading(true);
    try {
      await request("/api/account/password", "POST", { currentPassword, newPassword });
      toast.success("Senha alterada. As outras sessões foram encerradas.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="current-password" className="label">Senha atual</label>
        <input
          id="current-password"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className="input"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-password" className="label">Nova senha</label>
          <input
            id="new-password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="label">Confirmar nova senha</label>
          <input
            id="confirm-password"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="input"
          />
        </div>
      </div>
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Alterando..." : "Alterar senha"}
      </button>
    </form>
  );
}

export function SessionsActions() {
  const [loading, setLoading] = useState<"others" | "all" | null>(null);
  const router = useRouter();

  async function revoke(mode: "others" | "all") {
    setLoading(mode);
    try {
      await request("/api/account/sessions/revoke", "POST", { mode });
      if (mode === "all") {
        toast.success("Todas as sessões foram encerradas.");
        router.push("/entrar");
      } else {
        toast.success("Outras sessões encerradas.");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao encerrar sessões.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => revoke("others")} disabled={loading !== null} className="btn-secondary btn-sm">
        <ShieldIcon /> {loading === "others" ? "Encerrando..." : "Encerrar outras sessões"}
      </button>
      <button type="button" onClick={() => revoke("all")} disabled={loading !== null} className="btn-danger btn-sm">
        {loading === "all" ? "Encerrando..." : "Encerrar todas as sessões"}
      </button>
    </div>
  );
}

export function ResendVerificationButton({ verified }: { verified: boolean }) {
  const [loading, setLoading] = useState(false);
  if (verified) {
    return <span className="badge border-emerald-400/20 bg-emerald-400/10 text-emerald-300">E-mail confirmado</span>;
  }

  async function resend() {
    setLoading(true);
    try {
      await request("/api/account/resend-verification", "POST");
      toast.success("Se necessário, um novo link foi enviado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar verificação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={resend} disabled={loading} className="btn-secondary btn-sm">
      <MailIcon /> {loading ? "Enviando..." : "Reenviar confirmação"}
    </button>
  );
}
