
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: "low" | "normal" | "high";
  status: "pending" | "completed";
  due_date: string | null;
  created_at: string;
};

type TaskForm = {
  title: string;
  description: string;
  priority: Task["priority"];
  due_date: string;
};

const emptyForm: TaskForm = {
  title: "",
  description: "",
  priority: "normal",
  due_date: "",
};

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-[#0d0a17] px-4 py-3 text-white outline-none focus:border-purple-500";

export default function BusinessTasksPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<
    "all" | "pending" | "completed"
  >("all");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTasks = useCallback(async (uid: string) => {
    const { data, error: queryError } = await supabase
      .from("business_tasks")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (queryError) throw queryError;
    setTasks((data ?? []) as Task[]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError || !auth.user) {
          router.replace("/business/login");
          return;
        }

        const uid = auth.user.id;

        const { data: admin, error: adminError } =
          await supabase.rpc("is_business_admin");

        if (adminError) throw adminError;

        if (!admin) {
          const { data: application, error: appError } =
            await supabase
              .from("business_applications")
              .select("status")
              .eq("user_id", uid)
              .maybeSingle();

          if (appError) throw appError;

          if (application?.status !== "approved") {
            router.replace("/business/dashboard");
            return;
          }
        }

        if (cancelled) return;

        setUserId(uid);
        await loadTasks(uid);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Görevler yüklenemedi."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [loadTasks, router]);

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      due_date: task.due_date ?? "",
    });
    setError("");
    setFormOpen(true);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId || saving) return;

    const title = form.title.trim();

    if (!title || title.length > 200) {
      setError("Görev başlığı 1-200 karakter olmalıdır.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      title,
      description: form.description.trim() || null,
      priority: form.priority,
      due_date: form.due_date || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { data, error: saveError } = await supabase
          .from("business_tasks")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (saveError) throw saveError;

        setTasks((current) =>
          current.map((task) =>
            task.id === editingId ? (data as Task) : task
          )
        );
      } else {
        const { data, error: saveError } = await supabase
          .from("business_tasks")
          .insert({
            ...payload,
            user_id: userId,
          })
          .select("*")
          .single();

        if (saveError) throw saveError;

        setTasks((current) => [
          data as Task,
          ...current,
        ]);
      }

      setFormOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Görev kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: Task) {
    if (!userId || busyId) return;

    setBusyId(task.id);
    setError("");

    const status =
      task.status === "pending" ? "completed" : "pending";

    const { data, error: updateError } = await supabase
      .from("business_tasks")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
    } else {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? (data as Task) : item
        )
      );
    }

    setBusyId(null);
  }

  async function deleteTask(task: Task) {
    if (
      !userId ||
      busyId ||
      !window.confirm(
        `“${task.title}” görevi silinsin mi?`
      )
    ) {
      return;
    }

    setBusyId(task.id);
    setError("");

    const { data, error: deleteError } = await supabase
      .from("business_tasks")
      .delete()
      .eq("id", task.id)
      .eq("user_id", userId)
      .select("id");

    if (deleteError || !data?.length) {
      setError(
        deleteError?.message ?? "Görev silinemedi."
      );
    } else {
      setTasks((current) =>
        current.filter((item) => item.id !== task.id)
      );
    }

    setBusyId(null);
  }

  const pending = tasks.filter(
    (task) => task.status === "pending"
  ).length;

  const completed = tasks.length - pending;

  const visible = tasks.filter(
    (task) =>
      filter === "all" || task.status === filter
  );

  return (
    <main className="min-h-screen bg-[#080610] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/business/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200"
        >
          <ArrowLeft size={18} />
          Dashboard'a Dön
        </Link>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-purple-400">
              Hagy Business
            </p>

            <h1 className="text-3xl font-bold">
              Görev Yönetimi
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              İşletmenin görevlerini oluştur, takip et
              ve tamamla.
            </p>
          </div>

          <button
            onClick={openNew}
            disabled={!userId}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold disabled:opacity-50"
          >
            <Plus size={19} />
            Yeni Görev
          </button>
        </div>

        <div className="mb-7 grid gap-4 sm:grid-cols-3">
          {[
            ["Toplam Görev", tasks.length],
            ["Bekleyen", pending],
            ["Tamamlanan", completed],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <p className="text-sm text-gray-400">
                {label}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {loading ? "..." : value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(
            ["all", "pending", "completed"] as const
          ).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-xl px-4 py-2 text-sm ${
                filter === value
                  ? "bg-purple-600"
                  : "border border-white/10 bg-white/5"
              }`}
            >
              {value === "all"
                ? "Tümü"
                : value === "pending"
                  ? "Bekleyen"
                  : "Tamamlanan"}
            </button>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2
              className="animate-spin text-purple-400"
              size={32}
            />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-gray-400">
            Bu bölümde henüz görev yok.
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5"
              >
                <button
                  disabled={!!busyId}
                  onClick={() => void toggleTask(task)}
                  aria-label="Görev durumunu değiştir"
                  className="mt-1 disabled:opacity-50"
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 className="text-emerald-400" />
                  ) : (
                    <Circle className="text-gray-400" />
                  )}
                </button>

                <div className="min-w-[180px] flex-1">
                  <p
                    className={`font-semibold ${
                      task.status === "completed"
                        ? "text-gray-500 line-through"
                        : ""
                    }`}
                  >
                    {task.title}
                  </p>

                  {task.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-400">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
                    <span>
                      {task.priority === "high"
                        ? "🔴 Yüksek"
                        : task.priority === "low"
                          ? "🟢 Düşük"
                          : "🟡 Normal"}{" "}
                      öncelik
                    </span>

                    {task.due_date && (
                      <span>
                        Son tarih:{" "}
                        {task.due_date
                          .split("-")
                          .reverse()
                          .join(".")}
                      </span>
                    )}

                    <span>
                      {task.status === "completed"
                        ? "Tamamlandı"
                        : "Bekliyor"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(task)}
                    disabled={!!busyId}
                    className="rounded-xl border border-white/10 p-3 disabled:opacity-50"
                    aria-label="Görevi düzenle"
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    onClick={() => void deleteTask(task)}
                    disabled={!!busyId}
                    className="rounded-xl border border-red-500/20 p-3 text-red-300 disabled:opacity-50"
                    aria-label="Görevi sil"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Görev formu"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#151020] p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId
                  ? "Görevi Düzenle"
                  : "Yeni Görev"}
              </h2>

              <button
                onClick={() =>
                  !saving && setFormOpen(false)
                }
                aria-label="Kapat"
                disabled={saving}
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={saveTask}
              className="space-y-4"
            >
              <label className="block text-sm">
                Görev Başlığı *
                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      title: e.target.value,
                    }))
                  }
                  className={`mt-2 ${fieldClass}`}
                  placeholder="Müşteriye teklif gönder"
                />
              </label>

              <label className="block text-sm">
                Açıklama
                <textarea
                  rows={3}
                  maxLength={3000}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  className={`mt-2 ${fieldClass}`}
                />
              </label>

              <label className="block text-sm">
                Öncelik
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      priority:
                        e.target.value as Task["priority"],
                    }))
                  }
                  className={`mt-2 ${fieldClass}`}
                >
                  <option value="low">Düşük</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yüksek</option>
                </select>
              </label>

              <label className="block text-sm">
                Son Tarih
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      due_date: e.target.value,
                    }))
                  }
                  className={`mt-2 ${fieldClass}`}
                />
              </label>

              {error && (
                <p
                  role="alert"
                  className="text-sm text-red-300"
                >
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 font-semibold disabled:opacity-50"
                >
                  {saving && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {editingId
                    ? "Güncelle"
                    : "Görev Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
