"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent, Suspense } from "react";
import { LockKeyhole, Mail } from "lucide-react";

function FacebookIcon() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-lg font-bold leading-none text-[#1877F2]">
      f
    </span>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const authError = searchParams.get("error");
  const [error, setError] = useState<string | null>(authError);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCredentialsLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Email hoac mat khau khong hop le.");
      return;
    }

    window.location.href = result?.url ?? callbackUrl;
  }

  return (
    <div className="flex min-h-[640px] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl shadow-black/30">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-300">
            Teamwork Check
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Dang nhap</h1>
        </div>

        <form className="space-y-4" onSubmit={handleCredentialsLogin}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
            <span className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 focus-within:border-blue-400">
              <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                placeholder="admin@example.com"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Mat khau</span>
            <span className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 focus-within:border-blue-400">
              <LockKeyhole className="h-5 w-5 text-slate-400" aria-hidden="true" />
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                placeholder="••••••••"
              />
            </span>
          </label>

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Dang nhap..." : "Dang nhap bang Email"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          hoac
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <button
          type="button"
          onClick={() => signIn("facebook", { callbackUrl })}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:bg-[#166FE5]"
        >
          <FacebookIcon />
          Dang nhap bang Facebook
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}
