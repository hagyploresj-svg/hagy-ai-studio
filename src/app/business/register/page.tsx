
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  Building2,
  Mail,
  LockKeyhole,
  ArrowRight,
  UserRound,
} from "lucide-react";

export default function BusinessRegister() {
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Şifren en az 8 karakter olmalı.");
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      setError("Kayıt sistemi henüz yapılandırılmadı.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient(url, key);

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: company,
            full_name: name,
            account_type: "business",
          },
          emailRedirectTo: `${window.location.origin}/business/login`,
        },
      });

      if (authError) throw authError;

      setMessage(
        "Kayıt talebin alındı. E-posta doğrulaması gerekiyorsa gelen kutunu kontrol et."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080811] px-4 py-16 text-white">
      <div className="w-full max-w-md rounded-3xl border border-violet-500/20 bg-[#111121] p-7 shadow-2xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20">
            <Building2 className="text-violet-400" size={28} />
          </div>

          <h1 className="text-3xl font-extrabold">
            Hagy Business
          </h1>

          <p className="mt-2 text-sm text-white/50">
            İşletme hesabını oluştur
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/70">
              İşletme Adı
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3.5 text-white/40" size={18} />
              <input
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="İşletmenizin adı"
                className="w-full rounded-xl border border-white/10 bg-[#080811] py-3 pl-11 pr-4 outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">
              Ad Soyad
            </label>
            <div className="relative">
              <UserRound className="absolute left-3 top-3.5 text-white/40" size={18} />
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adınız ve soyadınız"
                className="w-full rounded-xl border border-white/10 bg-[#080811] py-3 pl-11 pr-4 outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">
              E-posta
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-white/40" size={18} />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="firma@ornek.com"
                className="w-full rounded-xl border border-white/10 bg-[#080811] py-3 pl-11 pr-4 outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">
              Şifre
            </label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-3.5 text-white/40" size={18} />
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 8 karakter"
                className="w-full rounded-xl border border-white/10 bg-[#080811] py-3 pl-11 pr-4 outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          {message && (
            <p role="status" className="rounded-xl bg-green-500/10 p-3 text-sm text-green-400">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 font-semibold transition hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Kaydediliyor..." : "İşletme Hesabı Oluştur"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Zaten hesabın var mı?{" "}
          <Link
            href="/business/login"
            className="font-semibold text-violet-400 hover:underline"
          >
            Giriş Yap
          </Link>
        </p>

        <Link
          href="/business"
          className="mt-5 block text-center text-xs text-white/40 hover:text-white"
        >
          ← İşletme sayfasına dön
        </Link>
      </div>
    </main>
  );
}
