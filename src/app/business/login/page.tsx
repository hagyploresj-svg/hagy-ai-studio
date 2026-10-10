
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Building2, Mail, Lock, LogIn, ArrowLeft } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BusinessLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      router.push("/business/dashboard");
      router.refresh();
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090612] text-white flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/business"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft size={17} />
          Hagy Business'a dön
        </Link>

        <div className="rounded-3xl border border-purple-500/20 bg-white/[0.04] p-7 sm:p-9 shadow-2xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/20 mb-6">
            <Building2 className="text-purple-400" size={28} />
          </div>

          <h1 className="text-3xl font-bold mb-2">
            İşletme Girişi
          </h1>

          <p className="text-gray-400 text-sm mb-8">
            Hagy Business hesabına giriş yap ve işletmeni yönet.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                E-posta Adresi
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="isletme@ornek.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Şifre
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrenizi girin"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3.5 font-semibold transition hover:bg-purple-500 disabled:opacity-50"
            >
              <LogIn size={19} />
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-gray-400">
            Henüz işletme hesabın yok mu?{" "}
            <Link
              href="/business/register"
              className="font-semibold text-purple-400 hover:text-purple-300"
            >
              Ücretsiz Kayıt Ol
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Hagy Business · AI Destekli İşletme Yönetimi
        </p>
      </div>
    </main>
  );
}
