"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeIcon, EyeOffIcon, KeyIcon, MailIcon, ShieldIcon, UserIcon } from "@/components/icons";

type ApiResponse = { ok?: boolean; error?: string; message?: string; next?: string; fields?: Record<string, string[]> };

async function postJson(url: string, body: unknown): Promise<ApiResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as ApiResponse;
  if (!response.ok || !data.ok) {
    const fieldMessage = data.fields ? Object.values(data.fields).flat()[0] : undefined;
    throw new Error(fieldMessage ?? data.error ?? "Não foi possível concluir a operação.");
  }
  return data;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-red-400">{message}</p>;
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await postJson("/api/auth/login", { email, password, ...(nextPath ? { next: nextPath } : {}) });
      toast.success("Acesso liberado.");
      router.push(data.next ?? "/conta");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="login-email" className="label">E-mail</label>
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input pl-11"
            placeholder="voce@email.com"
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="label">Senha</label>
          <Link href="/esqueci-senha" className="mb-2 text-xs text-zinc-500 hover:text-white">Esqueci minha senha</Link>
        </div>
        <div className="relative">
          <KeyIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input px-11"
            placeholder="Sua senha"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
        {loading ? "Entrando..." : "Entrar na conta"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        Ainda não tem conta?{" "}
        <Link href="/criar-conta" className="font-semibold text-white hover:text-wine-300">Criar conta</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!accepted) {
      setError("É necessário aceitar os termos e a política de privacidade.");
      return;
    }
    setLoading(true);
    try {
      await postJson("/api/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6 text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-400/10 text-xl text-emerald-300">
          <MailIcon />
        </span>
        <h2 className="font-display text-lg font-semibold text-white">Verifique seu e-mail</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Se os dados estiverem corretos, enviamos as instruções para <strong className="text-zinc-200">{form.email}</strong>.
          Você também pode entrar com a senha cadastrada.
        </p>
        <Link href="/entrar" className="btn-primary mt-5 w-full">Ir para o login</Link>
      </div>
    );
  }

  const strength = [
    form.password.length >= 10,
    /[A-Z]/.test(form.password),
    /[a-z]/.test(form.password),
    /[0-9]/.test(form.password),
    /[^A-Za-z0-9]/.test(form.password),
  ].filter(Boolean).length;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="register-name" className="label">Nome completo</label>
        <div className="relative">
          <UserIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="register-name"
            required
            minLength={2}
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="input pl-11"
            placeholder="Seu nome"
          />
        </div>
      </div>
      <div>
        <label htmlFor="register-email" className="label">E-mail</label>
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="register-email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="input pl-11"
            placeholder="voce@email.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="register-password" className="label">Senha</label>
        <div className="relative">
          <KeyIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="register-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={10}
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            className="input px-11"
            placeholder="Mínimo de 10 caracteres"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((index) => (
            <span
              key={index}
              className={`h-1 flex-1 rounded-full ${
                strength >= index ? (strength >= 4 ? "bg-emerald-400" : "bg-amber-400") : "bg-white/10"
              }`}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-600">Use maiúscula, minúscula, número e caractere especial.</p>
      </div>
      <div>
        <label htmlFor="register-confirm" className="label">Confirmar senha</label>
        <input
          id="register-confirm"
          type="password"
          required
          autoComplete="new-password"
          value={form.confirm}
          onChange={(event) => setForm({ ...form, confirm: event.target.value })}
          className="input"
          placeholder="Repita a senha"
        />
        <FieldError message={form.confirm && form.password !== form.confirm ? "As senhas não coincidem." : undefined} />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs leading-5 text-zinc-500">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-[color:var(--brand)]"
        />
        <span>
          Li e aceito os{" "}
          <Link href="/paginas/termos" className="text-zinc-300 underline underline-offset-2">Termos de uso</Link>{" "}
          e a{" "}
          <Link href="/paginas/privacidade" className="text-zinc-300 underline underline-offset-2">Política de privacidade</Link>.
        </span>
      </label>
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
        {loading ? "Criando conta..." : "Criar minha conta"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        Já possui conta?{" "}
        <Link href="/entrar" className="font-semibold text-white hover:text-wine-300">Entrar</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await postJson("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar recuperação.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6 text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-400/10 text-xl text-emerald-300">
          <MailIcon />
        </span>
        <h2 className="font-display text-lg font-semibold text-white">Verifique seu e-mail</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Se o endereço estiver cadastrado, enviaremos um link para redefinir a senha. O link expira em 30 minutos.
        </p>
        <Link href="/entrar" className="btn-secondary mt-5 w-full">Voltar ao login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="forgot-email" className="label">E-mail cadastrado</label>
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input pl-11"
            placeholder="voce@email.com"
          />
        </div>
      </div>
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
        {loading ? "Enviando..." : "Enviar instruções"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        <Link href="/entrar" className="font-semibold text-white hover:text-wine-300">Voltar ao login</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await postJson("/api/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm text-zinc-400">Link inválido ou incompleto.</p>
        <Link href="/esqueci-senha" className="btn-primary mt-5 w-full">Solicitar novo link</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6 text-center">
        <h2 className="font-display text-lg font-semibold text-white">Senha alterada</h2>
        <p className="mt-2 text-sm text-zinc-400">Todas as sessões anteriores foram encerradas por segurança.</p>
        <Link href="/entrar" className="btn-primary mt-5 w-full">Entrar com a nova senha</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="reset-password" className="label">Nova senha</label>
        <div className="relative">
          <KeyIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="reset-password"
            type={show ? "text" : "password"}
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input px-11"
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="reset-confirm" className="label">Confirmar nova senha</label>
        <input
          id="reset-confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="input"
        />
      </div>
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
        {loading ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    if (!token) {
      setError("Link inválido ou incompleto.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await postJson("/api/auth/verify-email", { token });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar e-mail.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-400/10 text-xl text-emerald-300">
          <ShieldIcon />
        </span>
        <p className="text-sm text-zinc-300">E-mail confirmado com sucesso.</p>
        <Link href="/conta" className="btn-primary mt-5 w-full">Acessar minha conta</Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm leading-6 text-zinc-400">
        Clique no botão abaixo para confirmar seu endereço de e-mail. O link é de uso único.
      </p>
      {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
      <button type="button" onClick={verify} disabled={loading} className="btn-primary mt-5 w-full py-3.5">
        {loading ? "Confirmando..." : "Confirmar meu e-mail"}
      </button>
      <Link href="/entrar" className="btn-ghost mt-2 w-full">Voltar ao login</Link>
    </div>
  );
}

export function TwoFactorForm({ nextPath }: { nextPath: string }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await postJson("/api/auth/2fa", { code, next: nextPath });
      router.push(data.next ?? "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="totp-code" className="label">Código do aplicativo autenticador</label>
        <div className="relative">
          <ShieldIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="totp-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            className="input pl-11 text-center font-display text-2xl tracking-[0.4em]"
            placeholder="000000"
          />
        </div>
      </div>
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
      <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full py-3.5">
        {loading ? "Verificando..." : "Confirmar código"}
      </button>
    </form>
  );
}
