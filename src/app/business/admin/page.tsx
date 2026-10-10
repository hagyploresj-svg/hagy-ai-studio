
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  Clock3,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Application = {
  user_id: string;
  company_name: string;
  full_name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
};

export default function BusinessAdminPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setAuthorized(false);
      setApplications([]);
      setMessage("Önce hesabına giriş yapmalısın.");
      setLoading(false);
      return;
    }

    const { data: isAdmin, error: adminError } =
      await supabase.rpc("is_business_admin");

    if (adminError || isAdmin !== true) {
      setAuthorized(false);
      setApplications([]);
      setMessage("Bu alan yalnızca Hagy yöneticilerine açıktır.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("business_applications")
      .select(
        "user_id, company_name, full_name, status, created_at, reviewed_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setAuthorized(false);
      setApplications([]);
      setMessage("Başvurular yüklenemedi: " + error.message);
    } else {
      setAuthorized(true);
      setApplications((data || []) as Application[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  async function updateStatus(
    userId: string,
    status: "approved" | "rejected"
  ) {
    const action = status === "approved" ? "onaylamak" : "reddetmek";

    if (!window.confirm(`Bu işletmeyi ${action} istiyor musun?`)) {
      return;
    }

    setBusyId(userId);
    setMessage("");

    const { data: isAdmin, error: adminError } =
      await supabase.rpc("is_business_admin");

    if (adminError || isAdmin !== true) {
      setMessage("Yönetici yetkisi doğrulanamadı.");
      setBusyId(null);
      return;
    }

    const { data, error } = await supabase
      .from("business_applications")
      .update({ status })
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

    if (error) {
      setMessage("İşlem başarısız: " + error.message);
    } else if (!data) {
      setMessage("Başvuru güncellenemedi. Yetkini kontrol et.");
    } else {
      await loadApplications();
      setMessage(
        status === "approved"
          ? "İşletme başarıyla onaylandı."
          : "Başvuru reddedildi."
      );
    }

    setBusyId(null);
  }

  const pending = applications.filter(
    (item) => item.status === "pending"
  ).length;

  const approved = applications.filter(
    (item) => item.status === "approved"
  ).length;

  const rejected = applications.filter(
    (item) => item.status === "rejected"
  ).length;

  return (
    <main className="min-h-screen bg-[#090912] px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/business/dashboard"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft size={17} />
          Business Paneline Dön
        </Link>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-purple-400">
              <ShieldCheck size={19} />
              HAGY SUPER ADMIN
            </div>

            <h1 className="text-3xl font-extrabold md:text-4xl">
              İşletme Başvuruları
            </h1>

            <p className="mt-3 text-sm text-white/50">
              Hagy Business Private Access Yönetimi
            </p>
          </div>

          <button
            onClick={() => void loadApplications()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Yenile
          </button>
        </div>

        {loading ? (
          <p className="mt-12 text-white/60">
            Başvurular yükleniyor...
          </p>
        ) : !authorized ? (
          <div className="mt-10 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <h2 className="font-bold">Erişim Engellendi</h2>
            <p className="mt-2 text-sm text-white/60">
              {message}
            </p>

            <Link
              href="/business/login"
              className="mt-5 inline-block text-sm text-purple-300"
            >
              Business Giriş Sayfası
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-9 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Onay Bekleyen",
                  value: pending,
                  Icon: Clock3,
                },
                {
                  label: "Onaylanan",
                  value: approved,
                  Icon: CheckCircle2,
                },
                {
                  label: "Reddedilen",
                  value: rejected,
                  Icon: XCircle,
                },
              ].map(({ label, value, Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <Icon size={23} className="text-purple-400" />
                  <p className="mt-4 text-3xl font-bold">
                    {value}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {message && (
              <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                {message}
              </p>
            )}

            <div className="mt-8 space-y-4">
              {applications.length === 0 ? (
                <div className="rounded-2xl border border-white/10 p-10 text-center text-white/50">
                  Henüz işletme başvurusu bulunmuyor.
                </div>
              ) : (
                applications.map((application) => (
                  <div
                    key={application.user_id}
                    className="flex flex-col justify-between gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center"
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl bg-purple-500/15 p-3">
                        <Building2
                          size={23}
                          className="text-purple-400"
                        />
                      </div>

                      <div>
                        <h3 className="text-lg font-bold">
                          {application.company_name ||
                            "İsimsiz İşletme"}
                        </h3>

                        <p className="mt-1 text-sm text-white/60">
                          {application.full_name ||
                            "Yetkili belirtilmemiş"}
                        </p>

                        <p className="mt-2 text-xs text-white/40">
                          Başvuru:{" "}
                          {new Date(
                            application.created_at
                          ).toLocaleString("tr-TR")}
                        </p>

                        <p className="mt-2 text-xs text-purple-300">
                          Durum:{" "}
                          {application.status === "pending"
                            ? "Onay Bekliyor"
                            : application.status === "approved"
                              ? "Onaylandı"
                              : "Reddedildi"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {application.status !== "approved" && (
                        <button
                          disabled={busyId !== null}
                          onClick={() =>
                            void updateStatus(
                              application.user_id,
                              "approved"
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold disabled:opacity-50"
                        >
                          <CheckCircle2 size={16} />
                          Onayla
                        </button>
                      )}

                      {application.status !== "rejected" && (
                        <button
                          disabled={busyId !== null}
                          onClick={() =>
                            void updateStatus(
                              application.user_id,
                              "rejected"
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-red-600/20 px-4 py-3 text-sm font-semibold text-red-300 disabled:opacity-50"
                        >
                          <XCircle size={16} />
                          Reddet
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
