
"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type FinanceType = "income" | "expense";

type FinanceRecord = {
  id: string;
  user_id: string;
  type: FinanceType;
  title: string;
  amount: number;
  category: string;
  description: string | null;
  transaction_date: string;
  created_at: string;
};

type FinanceForm = {
  type: FinanceType;
  title: string;
  amount: string;
  category: string;
  description: string;
  transaction_date: string;
};

const categories = {
  income: [
    "Satış",
    "Hizmet",
    "Komisyon",
    "Proje",
    "Diğer Gelir",
  ],
  expense: [
    "Personel",
    "Kira",
    "Fatura",
    "Reklam",
    "Malzeme",
    "Vergi",
    "Ulaşım",
    "Diğer Gider",
  ],
};

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyForm(): FinanceForm {
  return {
    type: "income",
    title: "",
    amount: "",
    category: "Satış",
    description: "",
    transaction_date: today(),
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-[#100D1A] px-4 py-3 text-white outline-none transition focus:border-purple-500";

export default function FinancePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [filter, setFilter] = useState<"all" | FinanceType>("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FinanceForm>(emptyForm);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !data.user) {
        router.replace("/business/login");
        return;
      }

      const currentUser = data.user;

      const { data: admin, error: adminError } =
        await supabase.rpc("is_business_admin");

      if (!active) return;

      if (adminError) {
        setError("Yetki kontrolü yapılamadı.");
        setChecking(false);
        return;
      }

      if (admin !== true) {
        const { data: application, error: applicationError } =
          await supabase
            .from("business_applications")
            .select("status")
            .eq("user_id", currentUser.id)
            .maybeSingle();

        if (!active) return;

        if (applicationError) {
          setError("İşletme durumu kontrol edilemedi.");
          setChecking(false);
          return;
        }

        if (application?.status !== "approved") {
          router.replace("/business/dashboard");
          return;
        }
      }

      setUserId(currentUser.id);
      setChecking(false);
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  const loadRecords = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("business_finances")
      .select("*")
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (queryError) {
      setError("Kayıtlar yüklenemedi: " + queryError.message);
    } else {
      setRecords((data ?? []) as FinanceRecord[]);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void loadRecords();
    }
  }, [userId, loadRecords]);

  const availableMonths = useMemo(() => {
    return Array.from(
      new Set(records.map((record) => record.transaction_date.slice(0, 7)))
    ).sort().reverse();
  }, [records]);

  const periodRecords = useMemo(() => {
    return records.filter(
      (record) =>
        monthFilter === "all" ||
        record.transaction_date.startsWith(monthFilter)
    );
  }, [records, monthFilter]);

  const totals = useMemo(() => {
    const incomeCents = periodRecords
      .filter((record) => record.type === "income")
      .reduce(
        (sum, record) => sum + Math.round(Number(record.amount) * 100),
        0
      );

    const expenseCents = periodRecords
      .filter((record) => record.type === "expense")
      .reduce(
        (sum, record) => sum + Math.round(Number(record.amount) * 100),
        0
      );

    return {
      income: incomeCents / 100,
      expense: expenseCents / 100,
      difference: (incomeCents - expenseCents) / 100,
    };
  }, [periodRecords]);

  const filteredRecords = useMemo(() => {
    return periodRecords.filter(
      (record) => filter === "all" || record.type === filter
    );
  }, [periodRecords, filter]);

  function openNew(type: FinanceType = "income") {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      type,
      category: categories[type][0],
    });
    setError("");
    setNotice("");
    setFormOpen(true);
  }

  function openEdit(record: FinanceRecord) {
    setEditingId(record.id);
    setForm({
      type: record.type,
      title: record.title,
      amount: String(record.amount),
      category: record.category,
      description: record.description ?? "",
      transaction_date: record.transaction_date,
    });
    setError("");
    setNotice("");
    setFormOpen(true);
  }

  function changeType(type: FinanceType) {
    setForm((current) => ({
      ...current,
      type,
      category: categories[type][0],
    }));
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId || saving) return;

    const title = form.title.trim();
    const amountText = form.amount.trim().replace(",", ".");
    const amount = Number(amountText);

    if (!title || title.length > 200) {
      setError("Başlık 1-200 karakter olmalıdır.");
      return;
    }

    if (
      !/^\d+(\.\d{1,2})?$/.test(amountText) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 999999999999.99
    ) {
      setError("Geçerli ve pozitif bir tutar girin (en fazla 2 ondalık).");
      return;
    }

    if (!categories[form.type].includes(form.category)) {
      setError("Geçerli bir kategori seçin.");
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(form.transaction_date) ||
      Number.isNaN(new Date(`${form.transaction_date}T12:00:00`).getTime())
    ) {
      setError("Geçerli bir tarih seçin.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      type: form.type,
      title,
      amount: amount.toFixed(2),
      category: form.category,
      description: form.description.trim() || null,
      transaction_date: form.transaction_date,
    };

    try {
      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("business_finances")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", userId)
          .select("id");

        if (updateError) throw updateError;
        if (!data?.length) throw new Error("Kayıt güncellenemedi.");
      } else {
        const { error: insertError } = await supabase
          .from("business_finances")
          .insert({
            ...payload,
            user_id: userId,
          });

        if (insertError) throw insertError;
      }

      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      setNotice("Finans kaydı başarıyla kaydedildi.");
      await loadRecords();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kayıt kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record: FinanceRecord) {
    if (!userId || deletingId) return;

    if (
      !window.confirm(
        `"${record.title}" kaydını kalıcı olarak silmek istiyor musun?`
      )
    ) {
      return;
    }

    setDeletingId(record.id);
    setError("");
    setNotice("");

    const { data, error: deleteError } = await supabase
      .from("business_finances")
      .delete()
      .eq("id", record.id)
      .eq("user_id", userId)
      .select("id");

    if (deleteError || !data?.length) {
      setError(deleteError?.message ?? "Kayıt silinemedi.");
    } else {
      setNotice("Kayıt silindi.");
      await loadRecords();
    }

    setDeletingId(null);
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#080610] text-white">
        <Loader2 className="animate-spin text-purple-400" />
        Finans paneli açılıyor...
      </div>
    );
  }

  if (!userId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#080610] px-5 text-white">
        <p>{error || "Bu sayfaya erişim izni bulunamadı."}</p>
        <Link
          href="/business/dashboard"
          className="rounded-xl bg-purple-600 px-5 py-3"
        >
          Dashboard'a Dön
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080610] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/business/dashboard"
              className="mb-5 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              <ArrowLeft size={17} />
              Dashboard'a Dön
            </Link>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-purple-600/20 p-3 text-purple-300">
                <Wallet size={29} />
              </div>

              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  Gelir & Gider
                </h1>
                <p className="mt-1 text-sm text-gray-400">
                  Hagy Business Finans Yönetimi
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openNew()}
            className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-semibold hover:bg-purple-500"
          >
            <Plus size={20} />
            Yeni Kayıt
          </button>
        </header>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <CalendarDays size={18} />
            Dönem
          </div>

          <div className="flex gap-3">
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#171123] px-4 py-3 text-sm"
            >
              <option value="all">Tüm Zamanlar</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {month.slice(5, 7)}/{month.slice(0, 4)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadRecords()}
              disabled={loading}
              title="Kayıtları yenile"
              className="rounded-xl border border-white/10 p-3 hover:bg-white/5"
            >
              <RefreshCw
                size={19}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm text-gray-400">Toplam Gelir</span>
              <ArrowUpCircle size={25} className="text-emerald-400" />
            </div>
            <p className="break-words text-2xl font-bold text-emerald-400">
              {formatMoney(totals.income)}
            </p>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm text-gray-400">Toplam Gider</span>
              <ArrowDownCircle size={25} className="text-red-400" />
            </div>
            <p className="break-words text-2xl font-bold text-red-400">
              {formatMoney(totals.expense)}
            </p>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.08] p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Gelir - Gider Farkı
              </span>
              <Wallet size={25} className="text-purple-400" />
            </div>
            <p
              className={`break-words text-2xl font-bold ${
                totals.difference < 0
                  ? "text-red-400"
                  : "text-purple-300"
              }`}
            >
              {formatMoney(totals.difference)}
            </p>
          </div>
        </section>

        <p className="mb-8 text-xs text-gray-500">
          Hesaplamalar seçilen döneme ait kayıtlardan yapılır.
          Gelir-gider farkı muhasebesel net kâr veya banka bakiyesi değildir.
          Tüm tutarlar TL olarak değerlendirilir.
        </p>

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold">Finans Kayıtları</h2>
              <p className="mt-1 text-sm text-gray-500">
                {filteredRecords.length} kayıt görüntüleniyor
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "Tümü" },
                { id: "income", label: "Gelirler" },
                { id: "expense", label: "Giderler" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setFilter(item.id as "all" | FinanceType)
                  }
                  className={`rounded-xl px-4 py-2 text-sm ${
                    filter === item.id
                      ? "bg-purple-600 text-white"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2
                size={32}
                className="animate-spin text-purple-400"
              />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-14 text-center">
              <Wallet
                size={45}
                className="mx-auto mb-4 text-purple-400"
              />
              <h3 className="font-semibold">
                Bu filtrede henüz finans kaydı yok.
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Yeni Kayıt butonuyla gelir veya gider ekleyebilirsin.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#100D1A] p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`rounded-xl p-3 ${
                        record.type === "income"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {record.type === "income" ? (
                        <ArrowUpCircle size={22} />
                      ) : (
                        <ArrowDownCircle size={22} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">
                        {record.title}
                      </h3>
                      <p className="mt-1 text-xs text-gray-400">
                        {record.category} •{" "}
                        {formatDate(record.transaction_date)}
                      </p>
                      {record.description && (
                        <p className="mt-2 break-words text-xs text-gray-500">
                          {record.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <span
                      className={`mr-auto font-bold sm:mr-2 ${
                        record.type === "income"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {record.type === "income" ? "+" : "-"}
                      {formatMoney(Number(record.amount))}
                    </span>

                    <button
                      type="button"
                      onClick={() => openEdit(record)}
                      aria-label="Kaydı düzenle"
                      className="rounded-lg border border-white/10 p-2 hover:bg-white/10"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteRecord(record)}
                      disabled={deletingId !== null}
                      aria-label="Kaydı sil"
                      className="rounded-lg border border-red-500/20 p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {deletingId === record.id ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Trash2 size={17} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Finans kaydı formu"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#191327] p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId ? "Kaydı Düzenle" : "Yeni Finans Kaydı"}
              </h2>

              <button
                type="button"
                onClick={() => !saving && setFormOpen(false)}
                disabled={saving}
                aria-label="Kapat"
              >
                <X size={23} />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => changeType("income")}
                className={`rounded-xl border p-3 ${
                  form.type === "income"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 text-gray-400"
                }`}
              >
                Gelir
              </button>

              <button
                type="button"
                onClick={() => changeType("expense")}
                className={`rounded-xl border p-3 ${
                  form.type === "expense"
                    ? "border-red-500 bg-red-500/10 text-red-300"
                    : "border-white/10 text-gray-400"
                }`}
              >
                Gider
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <form onSubmit={saveRecord} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm">
                  İşlem Başlığı *
                </label>
                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Örn: Web sitesi ödemesi"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Tutar (TL) *
                </label>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="Örn: 15000 veya 15000,50"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Kategori
                </label>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className={fieldClass}
                >
                  {categories[form.type].map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  İşlem Tarihi
                </label>
                <input
                  required
                  type="date"
                  value={form.transaction_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      transaction_date: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Açıklama
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="İşlem hakkında not..."
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-white/10 p-3"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 p-3 font-semibold disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 size={18} className="animate-spin" />
                  )}
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
