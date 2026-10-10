
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ModuleName = "reports" | "portfolio" | "settings";

type Project = {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  project_url: string;
  is_published: boolean;
  created_at: string;
};

type Profile = {
  company_name: string;
  industry: string;
  phone: string;
  website: string;
  description: string;
};

type Finance = {
  type: string;
  amount: number | string;
  transaction_date: string;
};

type StatusRow = {
  status: string;
};

const emptyProject = {
  title: "",
  description: "",
  category: "Genel",
  image_url: "",
  project_url: "",
  is_published: false,
};

const emptyProfile: Profile = {
  company_name: "",
  industry: "",
  phone: "",
  website: "",
  description: "",
};

const inputStyle =
  "w-full rounded-xl border border-white/15 bg-[#141020] px-4 py-3 text-white outline-none focus:border-violet-400";

const cardStyle =
  "rounded-2xl border border-white/10 bg-[#171222] p-5";

const buttonStyle =
  "rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-50";

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

function validUrl(value: string) {
  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function dateKey(date: Date) {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0")
  );
}

export default function BusinessModulePage() {
  const router = useRouter();
  const params = useParams();

  const raw = params.module;
  const slug = Array.isArray(raw) ? raw[0] : raw;

  const moduleName: ModuleName | null =
    slug === "reports" ||
    slug === "portfolio" ||
    slug === "settings"
      ? slug
      : null;

  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState({
    ...emptyProject,
  });

  const [profile, setProfile] = useState<Profile>({
    ...emptyProfile,
  });

  const [finances, setFinances] = useState<Finance[]>([]);
  const [tasks, setTasks] = useState<StatusRow[]>([]);
  const [customers, setCustomers] = useState<StatusRow[]>([]);

  // Giriş ve işletme onayı kontrolü
  useEffect(() => {
    let active = true;

    async function checkAccess() {
      if (!moduleName) {
        setError("Sayfa bulunamadı.");
        setChecking(false);
        return;
      }

      const { data, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !data.user) {
        router.replace("/business/login");
        return;
      }

      const currentId = data.user.id;

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_business_admin");

      if (!active) return;

      if (adminError) {
        setError(adminError.message);
        setChecking(false);
        return;
      }

      if (isAdmin !== true) {
        const { data: application, error: appError } =
          await supabase
            .from("business_applications")
            .select("status")
            .eq("user_id", currentId)
            .maybeSingle();

        if (!active) return;

        if (appError) {
          setError(appError.message);
          setChecking(false);
          return;
        }

        if (application?.status !== "approved") {
          router.replace("/business/dashboard");
          return;
        }
      }

      setUserId(currentId);
      setChecking(false);
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, [moduleName, router]);

  // Supabase verilerini getir
  const loadData = useCallback(async () => {
    if (!userId || !moduleName) return;

    setLoading(true);
    setError("");

    try {
      if (moduleName === "portfolio") {
        const { data, error } = await supabase
          .from("business_portfolio")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setProjects((data ?? []) as Project[]);
      }

      if (moduleName === "settings") {
        const { data, error } = await supabase
          .from("business_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;

        setProfile(
          data
            ? {
                company_name: data.company_name ?? "",
                industry: data.industry ?? "",
                phone: data.phone ?? "",
                website: data.website ?? "",
                description: data.description ?? "",
              }
            : { ...emptyProfile }
        );
      }

      if (moduleName === "reports") {
        const [financeResult, taskResult, customerResult] =
          await Promise.all([
            supabase
              .from("business_finances")
              .select("type,amount,transaction_date")
              .eq("user_id", userId),

            supabase
              .from("business_tasks")
              .select("status")
              .eq("user_id", userId),

            supabase
              .from("business_customers")
              .select("status")
              .eq("user_id", userId),
          ]);

        if (financeResult.error) throw financeResult.error;
        if (taskResult.error) throw taskResult.error;
        if (customerResult.error) throw customerResult.error;

        setFinances((financeResult.data ?? []) as Finance[]);
        setTasks((taskResult.data ?? []) as StatusRow[]);
        setCustomers((customerResult.data ?? []) as StatusRow[]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Veriler yüklenemedi."
      );
    } finally {
      setLoading(false);
    }
  }, [userId, moduleName]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Son 6 ay
  const months = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - 5 + i,
        1
      );

      return dateKey(date);
    });
  }, []);

  const chart = useMemo(() => {
    return months.map((month) => {
      const rows = finances.filter((f) =>
        f.transaction_date?.startsWith(month)
      );

      const sum = (type: string) =>
        rows
          .filter((f) => f.type === type)
          .reduce((total, f) => total + Number(f.amount), 0);

      return {
        month,
        income: sum("income"),
        expense: sum("expense"),
      };
    });
  }, [months, finances]);

  const totalIncome = chart.reduce(
    (sum, row) => sum + row.income,
    0
  );

  const totalExpense = chart.reduce(
    (sum, row) => sum + row.expense,
    0
  );

  const maxValue = Math.max(
    1,
    ...chart.flatMap((row) => [row.income, row.expense])
  );

  const completedTasks = tasks.filter(
    (t) => t.status === "completed"
  ).length;

  const activeCustomers = customers.filter(
    (c) => c.status === "active"
  ).length;

  // Portföy işlemleri
  function newProject() {
    setEditingId(null);
    setProjectForm({ ...emptyProject });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function editProject(project: Project) {
    setEditingId(project.id);

    setProjectForm({
      title: project.title,
      description: project.description,
      category: project.category,
      image_url: project.image_url,
      project_url: project.project_url,
      is_published: project.is_published,
    });

    setError("");
    setMessage("");
    setShowForm(true);
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId || saving) return;

    if (!projectForm.title.trim()) {
      setError("Proje başlığı zorunludur.");
      return;
    }

    if (
      !validUrl(projectForm.image_url) ||
      !validUrl(projectForm.project_url)
    ) {
      setError("Bağlantılar http:// veya https:// ile başlamalı.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      title: projectForm.title.trim(),
      description: projectForm.description.trim(),
      category: projectForm.category.trim() || "Genel",
      image_url: projectForm.image_url.trim(),
      project_url: projectForm.project_url.trim(),
      is_published: projectForm.is_published,
    };

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("business_portfolio")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", userId)
          .select("id");

        if (error) throw error;

        if (!data?.length) {
          throw new Error("Proje güncellenemedi.");
        }
      } else {
        const { error } = await supabase
          .from("business_portfolio")
          .insert({
            ...payload,
            user_id: userId,
          });

        if (error) throw error;
      }

      setShowForm(false);
      setEditingId(null);

      await loadData();
      setMessage("Proje başarıyla kaydedildi.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Proje kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(project: Project) {
    if (!userId || saving) return;

    if (!window.confirm(`"${project.title}" silinsin mi?`)) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("business_portfolio")
        .delete()
        .eq("id", project.id)
        .eq("user_id", userId)
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error("Proje silinemedi.");
      }

      await loadData();
      setMessage("Proje silindi.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Silme hatası."
      );
    } finally {
      setSaving(false);
    }
  }

  // İşletme ayarlarını kaydet
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId || saving) return;

    if (!profile.company_name.trim()) {
      setError("İşletme adı zorunludur.");
      return;
    }

    if (!validUrl(profile.website)) {
      setError("Web sitesi adresi geçersiz.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("business_profiles")
      .upsert(
        {
          user_id: userId,
          company_name: profile.company_name.trim(),
          industry: profile.industry.trim(),
          phone: profile.phone.trim(),
          website: profile.website.trim(),
          description: profile.description.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      setError(error.message);
    } else {
      setMessage("İşletme bilgileri kaydedildi.");
    }

    setSaving(false);
  }

  const title =
    moduleName === "reports"
      ? "Raporlar ve Analizler"
      : moduleName === "portfolio"
        ? "Dijital Portföy"
        : "İşletme Ayarları";

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090612] text-white">
        Yükleniyor...
      </main>
    );
  }

  if (!userId || !moduleName) {
    return (
      <main className="min-h-screen bg-[#090612] p-8 text-white">
        <p>{error || "Erişim izni bulunamadı."}</p>

        <Link
          href="/business/dashboard"
          className="mt-5 inline-block text-violet-400"
        >
          Dashboard'a dön
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090612] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/business/dashboard"
          className="mb-7 inline-block text-sm text-gray-400 hover:text-white"
        >
          ← Dashboard'a Dön
        </Link>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-violet-400">
              HAGY BUSINESS
            </p>

            <h1 className="text-3xl font-bold">{title}</h1>

            <p className="mt-2 text-sm text-gray-400">
              İşletme Yönetim Merkezi
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="rounded-xl border border-white/15 px-4 py-3 text-sm disabled:opacity-50"
            >
              Yenile
            </button>

            {moduleName === "portfolio" && (
              <button
                type="button"
                onClick={newProject}
                className={buttonStyle}
              >
                + Yeni Proje
              </button>
            )}
          </div>
        </div>

        <nav className="mb-8 flex flex-wrap gap-3">
          {[
            { href: "/business/reports", label: "Raporlar" },
            { href: "/business/portfolio", label: "Portföy" },
            { href: "/business/settings", label: "Ayarlar" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-5 py-3 text-sm ${
                item.href.endsWith(moduleName)
                  ? "bg-violet-600 text-white"
                  : "border border-white/10 bg-white/5 text-gray-300"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300"
          >
            {message}
          </div>
        )}

        {loading && (
          <p className="mb-6 text-sm text-violet-300">
            Veriler yükleniyor...
          </p>
        )}

        {/* RAPORLAR */}
        {moduleName === "reports" && !loading && !error && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "6 Aylık Gelir",
                  value: money(totalIncome),
                },
                {
                  label: "6 Aylık Gider",
                  value: money(totalExpense),
                },
                {
                  label: "Gelir - Gider",
                  value: money(totalIncome - totalExpense),
                },
                {
                  label: "Toplam Müşteri",
                  value: String(customers.length),
                },
              ].map((item) => (
                <div key={item.label} className={cardStyle}>
                  <p className="text-sm text-gray-400">
                    {item.label}
                  </p>

                  <p className="mt-4 break-words text-2xl font-bold">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <section className={cardStyle}>
              <h2 className="mb-2 text-xl font-bold">
                Aylık Gelir ve Gider
              </h2>

              <p className="mb-8 text-sm text-gray-400">
                Son 6 ay · Yeşil gelir, kırmızı gider
              </p>

              <div className="space-y-7">
                {chart.map((row) => (
                  <div key={row.month}>
                    <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm">
                      <strong>{row.month}</strong>

                      <span className="text-gray-400">
                        {money(row.income)} / {money(row.expense)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="h-4 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${
                              (row.income / maxValue) * 100
                            }%`,
                          }}
                        />
                      </div>

                      <div className="h-4 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-red-500"
                          style={{
                            width: `${
                              (row.expense / maxValue) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              <section className={cardStyle}>
                <h2 className="mb-5 text-xl font-bold">
                  Müşteri Analizi
                </h2>

                <p className="mb-3 flex justify-between">
                  <span className="text-gray-400">
                    Aktif Müşteriler
                  </span>
                  <strong>{activeCustomers}</strong>
                </p>

                <p className="flex justify-between">
                  <span className="text-gray-400">
                    Potansiyel Müşteriler
                  </span>
                  <strong>
                    {
                      customers.filter(
                        (c) => c.status === "potential"
                      ).length
                    }
                  </strong>
                </p>
              </section>

              <section className={cardStyle}>
                <h2 className="mb-5 text-xl font-bold">
                  Görev Analizi
                </h2>

                <p className="mb-3 flex justify-between">
                  <span className="text-gray-400">
                    Tamamlanan Görevler
                  </span>
                  <strong>{completedTasks}</strong>
                </p>

                <p className="flex justify-between">
                  <span className="text-gray-400">
                    Bekleyen Görevler
                  </span>
                  <strong>
                    {
                      tasks.filter(
                        (t) => t.status === "pending"
                      ).length
                    }
                  </strong>
                </p>
              </section>
            </div>

            <p className="text-xs text-gray-500">
              Raporlar Supabase kayıtlarından hesaplanır.
              Gelir-gider farkı muhasebesel net kâr değildir.
            </p>
          </div>
        )}

        {/* DIJITAL PORTFOY */}
        {moduleName === "portfolio" && !loading && (
          <div>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className={cardStyle}>
                <p className="text-gray-400">Toplam Proje</p>
                <p className="mt-3 text-3xl font-bold">
                  {projects.length}
                </p>
              </div>

              <div className={cardStyle}>
                <p className="text-gray-400">Yayınlanan</p>
                <p className="mt-3 text-3xl font-bold">
                  {projects.filter((p) => p.is_published).length}
                </p>
              </div>

              <div className={cardStyle}>
                <p className="text-gray-400">Taslak</p>
                <p className="mt-3 text-3xl font-bold">
                  {projects.filter((p) => !p.is_published).length}
                </p>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className={`${cardStyle} py-16 text-center`}>
                <h2 className="text-xl font-bold">
                  Henüz proje bulunmuyor
                </h2>

                <p className="mt-3 text-gray-400">
                  Yeni Proje butonuyla ilk çalışmanı ekle.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <article key={project.id} className={cardStyle}>
                    <div className="mb-4 flex justify-between gap-3">
                      <span className="text-xs text-violet-300">
                        {project.category}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          project.is_published
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-yellow-500/15 text-yellow-300"
                        }`}
                      >
                        {project.is_published
                          ? "Yayınlandı"
                          : "Taslak"}
                      </span>
                    </div>

                    <h3 className="break-words text-xl font-bold">
                      {project.title}
                    </h3>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-400">
                      {project.description || "Açıklama yok."}
                    </p>

                    {project.image_url && (
                      <a
                        href={project.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 block break-all text-sm text-violet-300"
                      >
                        Görseli Aç ↗
                      </a>
                    )}

                    {project.project_url && (
                      <a
                        href={project.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block break-all text-sm text-violet-300"
                      >
                        Projeyi Görüntüle ↗
                      </a>
                    )}

                    <div className="mt-6 flex gap-3 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        onClick={() => editProject(project)}
                        disabled={saving}
                        className="flex-1 rounded-xl border border-white/15 p-3 text-sm disabled:opacity-50"
                      >
                        Düzenle
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteProject(project)}
                        disabled={saving}
                        className="flex-1 rounded-xl border border-red-500/20 p-3 text-sm text-red-400 disabled:opacity-50"
                      >
                        Sil
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <p className="mt-6 text-xs text-gray-500">
              Yayınlandı etiketi yönetim durumunu belirtir.
              Herkese açık portföy sayfası henüz kurulmadı.
            </p>
          </div>
        )}

        {/* ISLETME AYARLARI */}
        {moduleName === "settings" && !loading && (
          <section className={`${cardStyle} max-w-3xl`}>
            <h2 className="mb-2 text-xl font-bold">
              İşletme Bilgileri
            </h2>

            <p className="mb-8 text-sm text-gray-400">
              İşletmene ait bilgileri düzenle ve kaydet.
            </p>

            <form onSubmit={saveProfile} className="space-y-5">
              {(
                [
                  ["company_name", "İşletme Adı"],
                  ["industry", "Sektör"],
                  ["phone", "Telefon"],
                  ["website", "Web Sitesi"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="mb-2 block text-sm">
                    {label}
                  </label>

                  <input
                    type="text"
                    required={key === "company_name"}
                    maxLength={500}
                    value={profile[key]}
                    onChange={(event) =>
                      setProfile((prev) => ({
                        ...prev,
                        [key]: event.target.value,
                      }))
                    }
                    className={inputStyle}
                    placeholder={
                      key === "website"
                        ? "https://ornek.com"
                        : label
                    }
                  />
                </div>
              ))}

              <div>
                <label className="mb-2 block text-sm">
                  İşletme Açıklaması
                </label>

                <textarea
                  rows={5}
                  maxLength={3000}
                  value={profile.description}
                  onChange={(event) =>
                    setProfile((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className={inputStyle}
                  placeholder="İşletmen hakkında bilgi..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className={buttonStyle}
              >
                {saving ? "Kaydediliyor..." : "Bilgileri Kaydet"}
              </button>
            </form>
          </section>
        )}
      </div>

      {/* PROJE EKLE / DUZENLE PENCERESI */}
      {moduleName === "portfolio" && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Proje düzenleme"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/15 bg-[#1B142B] p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId ? "Projeyi Düzenle" : "Yeni Proje"}
              </h2>

              <button
                type="button"
                disabled={saving}
                onClick={() => setShowForm(false)}
                className="text-2xl text-gray-400"
                aria-label="Kapat"
              >
                ×
              </button>
            </div>

            {error && (
              <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <form onSubmit={saveProject} className="space-y-4">
              {(
                [
                  ["title", "Proje Başlığı"],
                  ["category", "Kategori"],
                  ["image_url", "Görsel URL"],
                  ["project_url", "Proje URL"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="mb-2 block text-sm">
                    {label}
                  </label>

                  <input
                    required={key === "title"}
                    maxLength={key === "title" ? 200 : 2000}
                    value={projectForm[key]}
                    onChange={(event) =>
                      setProjectForm((prev) => ({
                        ...prev,
                        [key]: event.target.value,
                      }))
                    }
                    className={inputStyle}
                    placeholder={
                      key.includes("url")
                        ? "https://..."
                        : label
                    }
                  />
                </div>
              ))}

              <div>
                <label className="mb-2 block text-sm">
                  Açıklama
                </label>

                <textarea
                  rows={4}
                  maxLength={5000}
                  value={projectForm.description}
                  onChange={(event) =>
                    setProjectForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className={inputStyle}
                />
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={projectForm.is_published}
                  onChange={(event) =>
                    setProjectForm((prev) => ({
                      ...prev,
                      is_published: event.target.checked,
                    }))
                  }
                  className="h-5 w-5 accent-violet-600"
                />
                Yayınlandı olarak işaretle
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-white/15 p-3"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 ${buttonStyle}`}
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
