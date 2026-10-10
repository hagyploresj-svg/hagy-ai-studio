
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, type User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Users,
  ListTodo,
  Wallet,
  Bot,
  BarChart3,
  BriefcaseBusiness,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Search,
  Send,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Access = "checking" | "approved" | "pending" | "rejected" | "error";
type Tab = "overview" | "customers" | "assistant";

type Customer = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: "potential" | "active";
  notes: string | null;
  created_at: string;
};

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  status: "potential" | "active";
  notes: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const emptyCustomer: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  status: "potential",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#100C1C] px-4 py-3 text-sm text-white outline-none focus:border-purple-500";

const cardClass =
  "rounded-2xl border border-white/10 bg-white/[0.035] p-5";

const menu = [
  {
    id: "overview",
    label: "Genel Bakış",
    icon: LayoutDashboard,
    href: "",
  },
  {
    id: "customers",
    label: "Müşteriler",
    icon: Users,
    href: "",
  },
  {
    id: "tasks",
    label: "Görevler",
    icon: ListTodo,
    href: "/business/tasks",
  },
  {
    id: "finance",
    label: "Gelir & Gider",
    icon: Wallet,
    href: "/business/finance",
  },
  {
    id: "assistant",
    label: "Hagy AI Asistan",
    icon: Bot,
    href: "",
  },
  {
    id: "reports",
    label: "Raporlar",
    icon: BarChart3,
    href: "/business/reports",
  },
  {
    id: "portfolio",
    label: "Dijital Portföy",
    icon: BriefcaseBusiness,
    href: "/business/portfolio",
  },
  {
    id: "settings",
    label: "Ayarlar",
    icon: Settings,
    href: "/business/settings",
  },
] as const;

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

function currentMonth() {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const next = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  function key(date: Date) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-01"
    );
  }

  return {
    start: key(start),
    end: key(next),
  };
}

export default function BusinessDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<Access>("checking");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    ...emptyCustomer,
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [taskCount, setTaskCount] = useState<number | null>(null);
  const [pendingTasks, setPendingTasks] = useState<number | null>(null);
  const [income, setIncome] = useState<number | null>(null);
  const [expense, setExpense] = useState<number | null>(null);

  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      setAccess("checking");

      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        router.replace("/business/login");
        return;
      }

      const currentUser = data.user;

      const { data: admin, error: adminError } =
        await supabase.rpc("is_business_admin");

      if (!active) return;

      if (adminError) {
        setAccess("error");
        return;
      }

      if (admin === true) {
        setUser(currentUser);
        setIsAdmin(true);
        setAccess("approved");
        return;
      }

      const { data: application, error: appError } =
        await supabase
          .from("business_applications")
          .select("status")
          .eq("user_id", currentUser.id)
          .maybeSingle();

      if (!active) return;

      if (appError) {
        setAccess("error");
        return;
      }

      setUser(currentUser);
      setIsAdmin(false);

      if (application?.status === "approved") {
        setAccess("approved");
      } else if (application?.status === "rejected") {
        setAccess("rejected");
      } else {
        setAccess("pending");
      }
    }

    void checkAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/business/login");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router, refreshKey]);

  const loadData = useCallback(async () => {
    if (!user || access !== "approved") return;

    setLoading(true);
    setCustomerError("");

    const range = currentMonth();

    const [c, t, p, f] = await Promise.all([
      supabase
        .from("business_customers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("business_tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),

      supabase
        .from("business_tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending"),

      supabase
        .from("business_finances")
        .select("type,amount")
        .eq("user_id", user.id)
        .gte("transaction_date", range.start)
        .lt("transaction_date", range.end),
    ]);

    if (c.error) {
      setCustomerError(c.error.message);
    } else {
      setCustomers((c.data ?? []) as Customer[]);
    }

    setTaskCount(t.error ? null : t.count ?? 0);
    setPendingTasks(p.error ? null : p.count ?? 0);

    if (f.error) {
      setIncome(null);
      setExpense(null);
    } else {
      const records = f.data ?? [];

      const sum = (type: string) =>
        records
          .filter((item) => item.type === type)
          .reduce(
            (total, item) =>
              total + Math.round(Number(item.amount) * 100),
            0
          ) / 100;

      setIncome(sum("income"));
      setExpense(sum("expense"));
    }

    setLoading(false);
  }, [user, access]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const companyName =
    typeof user?.user_metadata?.company_name === "string"
      ? user.user_metadata.company_name
      : "İşletmem";

  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "İşletme Yöneticisi";

  const activeCustomers = customers.filter(
    (customer) => customer.status === "active"
  ).length;

  const filteredCustomers = customers.filter((customer) => {
    const query = search.toLocaleLowerCase("tr-TR");

    return (
      customer.name.toLocaleLowerCase("tr-TR").includes(query) ||
      (customer.phone ?? "").includes(search) ||
      (customer.email ?? "")
        .toLocaleLowerCase("tr-TR")
        .includes(query)
    );
  });

  function openTab(id: string, href: string) {
    setSidebarOpen(false);

    if (href) {
      router.push(href);
      return;
    }

    if (id === "overview" || id === "customers" || id === "assistant") {
      setTab(id);
      setSearch("");
    }
  }

  async function logout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/business/login");
  }

  function newCustomer() {
    setEditingId(null);
    setCustomerForm({ ...emptyCustomer });
    setCustomerError("");
    setFormOpen(true);
  }

  function editCustomer(customer: Customer) {
    setEditingId(customer.id);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      status: customer.status,
      notes: customer.notes ?? "",
    });
    setCustomerError("");
    setFormOpen(true);
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;

    const name = customerForm.name.trim();

    if (!name || name.length > 150) {
      setCustomerError("Müşteri adı 1-150 karakter olmalı.");
      return;
    }

    setSaving(true);
    setCustomerError("");

    const payload = {
      name,
      phone: customerForm.phone.trim() || null,
      email: customerForm.email.trim() || null,
      status: customerForm.status,
      notes: customerForm.notes.trim() || null,
    };

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("business_customers")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (error) throw error;

        setCustomers((current) =>
          current.map((item) =>
            item.id === editingId ? (data as Customer) : item
          )
        );
      } else {
        const { data, error } = await supabase
          .from("business_customers")
          .insert({ ...payload, user_id: user.id })
          .select("*")
          .single();

        if (error) throw error;

        setCustomers((current) => [
          data as Customer,
          ...current,
        ]);
      }

      setFormOpen(false);
      setEditingId(null);
      setCustomerForm({ ...emptyCustomer });
    } catch (err) {
      setCustomerError(
        err instanceof Error ? err.message : "Kayıt başarısız."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer: Customer) {
    if (!user || deletingId) return;

    if (!window.confirm(`${customer.name} silinsin mi?`)) {
      return;
    }

    setDeletingId(customer.id);
    setCustomerError("");

    const { data, error } = await supabase
      .from("business_customers")
      .delete()
      .eq("id", customer.id)
      .eq("user_id", user.id)
      .select("id");

    if (error || !data?.length) {
      setCustomerError(error?.message ?? "Silme başarısız.");
    } else {
      setCustomers((current) =>
        current.filter((item) => item.id !== customer.id)
      );
    }

    setDeletingId(null);
  }

  async function sendAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = aiMessage.trim();

    if (!message || aiLoading) return;

    setAiLoading(true);
    setAiError("");
    setAiMessage("");

    setMessages((current) => [
      ...current,
      { role: "user", content: message },
    ]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Tekrar giriş yapmalısın.");
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "AI yanıtı alınamadı.");
      }

      if (typeof result?.reply !== "string") {
        throw new Error("Geçersiz AI yanıtı.");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: result.reply },
      ]);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "AI bağlantı hatası."
      );
    } finally {
      setAiLoading(false);
    }
  }

  if (access === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#080610] text-white">
        <Loader2 className="animate-spin text-purple-400" />
        Erişim kontrol ediliyor...
      </div>
    );
  }

  if (access !== "approved") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080610] p-5 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <ShieldCheck
            size={44}
            className="mx-auto mb-5 text-purple-400"
          />

          <h1 className="text-2xl font-bold">
            {access === "pending"
              ? "Başvurunuz Onay Bekliyor"
              : access === "rejected"
                ? "Başvurunuz Reddedildi"
                : "Erişim Doğrulanamadı"}
          </h1>

          <p className="mt-4 text-gray-400">
            {access === "pending"
              ? "Yönetici onayından sonra panel açılacaktır."
              : access === "rejected"
                ? "İşletme başvurunuz onaylanmadı."
                : "Lütfen tekrar deneyin."}
          </p>

          <button
            onClick={() => setRefreshKey((value) => value + 1)}
            className="mt-6 w-full rounded-xl bg-purple-600 p-3"
          >
            Durumu Kontrol Et
          </button>

          <button
            onClick={logout}
            disabled={loggingOut}
            className="mt-3 w-full rounded-xl border border-white/10 p-3"
          >
            Çıkış Yap
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#080610] text-white">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#100C1C] transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/business"
            className="flex items-center gap-3"
          >
            <div className="rounded-xl bg-purple-600 p-3">
              <Building2 size={22} />
            </div>

            <div>
              <h1 className="text-lg font-bold">
                Hagy Business
              </h1>
              <p className="text-xs text-gray-500">
                Business Management
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Menüyü kapat"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-6 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
            <p className="text-xs text-purple-300">
              İşletme Hesabı
            </p>
            <p className="mt-2 truncate font-semibold">
              {companyName}
            </p>
          </div>

          <p className="mb-3 px-3 text-xs uppercase tracking-widest text-gray-500">
            Yönetim
          </p>

          <nav className="space-y-1">
            {menu.map((item) => {
              const Icon = item.icon;
              const selected = !item.href && tab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openTab(item.id, item.href)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${
                    selected
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                  {item.href && (
                    <ArrowRight
                      size={15}
                      className="ml-auto"
                    />
                  )}
                </button>
              );
            })}

            {isAdmin && (
              <Link
                href="/business/admin"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-amber-300 hover:bg-white/5"
              >
                <ShieldCheck size={19} />
                Super Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/5 p-3">
            <p className="truncate font-semibold">
              {fullName}
            </p>
            <p className="truncate text-xs text-gray-500">
              {user?.email}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={18} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-[#080610]/95 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              aria-label="Menüyü aç"
            >
              <Menu size={25} />
            </button>

            <div>
              <h2 className="text-lg font-bold">
                {tab === "overview"
                  ? "Genel Bakış"
                  : tab === "customers"
                    ? "Müşteriler"
                    : "Hagy AI Asistan"}
              </h2>
              <p className="text-xs text-gray-500">
                Hagy Business Yönetim Merkezi
              </p>
            </div>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-bold">
            {fullName.charAt(0).toUpperCase()}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          {tab === "overview" && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <p className="mb-2 text-sm text-purple-400">
                    İşletme Kontrol Merkezi
                  </p>
                  <h1 className="text-3xl font-bold sm:text-4xl">
                    Hoş geldin, {fullName.split(" ")[0]} 👋
                  </h1>
                  <p className="mt-3 text-sm text-gray-400">
                    {companyName} için tüm iş süreçlerini
                    tek merkezden yönet.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setTab("assistant")}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3"
                >
                  <Sparkles size={18} />
                  AI Asistanı Aç
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Toplam Müşteri",
                    value: loading ? "..." : String(customers.length),
                    icon: Users,
                  },
                  {
                    label: "Aktif Müşteriler",
                    value: loading ? "..." : String(activeCustomers),
                    icon: Users,
                  },
                  {
                    label: "Bekleyen Görevler",
                    value:
                      pendingTasks === null
                        ? "—"
                        : String(pendingTasks),
                    icon: ListTodo,
                  },
                  {
                    label: "Aylık Gelir",
                    value: income === null ? "—" : money(income),
                    icon: Wallet,
                  },
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div key={stat.label} className={cardClass}>
                      <div className="mb-5 flex justify-between gap-3">
                        <span className="text-sm text-gray-400">
                          {stat.label}
                        </span>
                        <Icon size={20} className="text-purple-400" />
                      </div>
                      <p className="break-words text-2xl font-bold">
                        {stat.value}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className={cardClass}>
                  <div className="mb-5 flex justify-between">
                    <h2 className="text-lg font-bold">
                      Müşteriler
                    </h2>
                    <button
                      onClick={() => setTab("customers")}
                      className="text-sm text-purple-400"
                    >
                      Tümünü Gör
                    </button>
                  </div>

                  {customers.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Henüz müşteri eklenmedi.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {customers.slice(0, 5).map((customer) => (
                        <div
                          key={customer.id}
                          className="flex justify-between gap-3 rounded-xl bg-white/5 p-4"
                        >
                          <span>{customer.name}</span>
                          <span className="text-xs text-purple-300">
                            {customer.status === "active"
                              ? "Aktif"
                              : "Potansiyel"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-[#151020] p-6">
                  <ListTodo
                    size={34}
                    className="mb-5 text-purple-300"
                  />
                  <h2 className="text-2xl font-bold">
                    Görev Yönetimi
                  </h2>
                  <p className="mt-3 text-gray-400">
                    Toplam {taskCount ?? "—"} görev.
                    Bekleyen: {pendingTasks ?? "—"}.
                  </p>
                  <Link
                    href="/business/tasks"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3"
                  >
                    Görevleri Yönet
                    <ArrowRight size={17} />
                  </Link>
                </section>
              </div>

              <section className={cardClass}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      Finansal Özet
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                      Bu ayın kayıtlı gelir ve giderleri
                    </p>
                  </div>

                  <Link
                    href="/business/finance"
                    className="rounded-xl bg-purple-600 px-5 py-3 text-sm"
                  >
                    Finans Panelini Aç
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-emerald-500/10 p-4">
                    <p className="text-sm text-gray-400">
                      Aylık Gelir
                    </p>
                    <p className="mt-2 break-words text-xl font-bold text-emerald-400">
                      {income === null ? "—" : money(income)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-500/10 p-4">
                    <p className="text-sm text-gray-400">
                      Aylık Gider
                    </p>
                    <p className="mt-2 break-words text-xl font-bold text-red-400">
                      {expense === null ? "—" : money(expense)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-purple-500/10 p-4">
                    <p className="text-sm text-gray-400">
                      Gelir - Gider
                    </p>
                    <p className="mt-2 break-words text-xl font-bold text-purple-300">
                      {income === null || expense === null
                        ? "—"
                        : money(income - expense)}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  Gelir-gider farkı muhasebesel net kâr değildir.
                </p>
              </section>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    href: "/business/reports",
                    title: "Raporlar",
                    description: "Gelir-gider ve performans analizi",
                    icon: BarChart3,
                  },
                  {
                    href: "/business/portfolio",
                    title: "Dijital Portföy",
                    description: "Projelerini yönet",
                    icon: BriefcaseBusiness,
                  },
                  {
                    href: "/business/settings",
                    title: "Ayarlar",
                    description: "İşletme bilgilerini düzenle",
                    icon: Settings,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${cardClass} hover:border-purple-500/40`}
                    >
                      <Icon
                        size={26}
                        className="mb-4 text-purple-400"
                      />
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="mt-2 text-sm text-gray-400">
                        {item.description}
                      </p>
                      <p className="mt-4 text-sm text-purple-300">
                        Modülü Aç →
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "customers" && (
            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">
                    Müşteri Yönetimi
                  </h1>
                  <p className="mt-2 text-sm text-gray-400">
                    Müşteri kayıtlarını yönet.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={newCustomer}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3"
                >
                  <Plus size={18} />
                  Yeni Müşteri
                </button>
              </div>

              {customerError && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-500/10 p-4 text-red-300"
                >
                  {customerError}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Toplam", customers.length],
                  ["Aktif", activeCustomers],
                  ["Potansiyel", customers.length - activeCustomers],
                ].map(([label, value]) => (
                  <div key={String(label)} className={cardClass}>
                    <p className="text-sm text-gray-400">
                      {label}
                    </p>
                    <p className="mt-3 text-3xl font-bold">
                      {loading ? "..." : value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Müşteri ara..."
                  className={`${inputClass} pl-12`}
                />
              </div>

              <div className="space-y-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`${cardClass} flex flex-wrap items-center justify-between gap-4`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {customer.name}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        {customer.phone || "Telefon yok"}
                      </p>
                      {customer.email && (
                        <p className="break-all text-sm text-gray-400">
                          {customer.email}
                        </p>
                      )}
                      {customer.notes && (
                        <p className="mt-2 whitespace-pre-wrap text-xs text-gray-500">
                          {customer.notes}
                        </p>
                      )}
                      <span className="mt-3 inline-block rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
                        {customer.status === "active"
                          ? "Aktif"
                          : "Potansiyel"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editCustomer(customer)}
                        className="rounded-xl border border-white/10 p-3"
                        aria-label="Müşteriyi düzenle"
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteCustomer(customer)}
                        disabled={deletingId !== null}
                        className="rounded-xl border border-red-500/20 p-3 text-red-400 disabled:opacity-50"
                        aria-label="Müşteriyi sil"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                ))}

                {!loading && filteredCustomers.length === 0 && (
                  <div className={`${cardClass} py-12 text-center text-gray-400`}>
                    {search
                      ? "Aradığın müşteri bulunamadı."
                      : "Henüz müşteri eklenmedi."}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="flex items-center gap-2 text-sm text-purple-300"
              >
                <RefreshCw size={16} />
                Listeyi Yenile
              </button>
            </section>
          )}

          {tab === "assistant" && (
            <section className="mx-auto max-w-4xl">
              <div className="mb-8 text-center">
                <Sparkles
                  size={40}
                  className="mx-auto mb-5 text-purple-400"
                />
                <h1 className="text-3xl font-bold">
                  Hagy AI Asistan
                </h1>
                <p className="mt-3 text-sm text-gray-400">
                  İşletmen için yapay zekâ destekli asistan
                </p>
              </div>

              <div className={cardClass}>
                <div className="mb-5 rounded-xl bg-purple-500/10 p-5">
                  <p className="font-semibold text-purple-300">
                    Hagy AI
                  </p>
                  <p className="mt-2 text-sm text-gray-300">
                    Merhaba! İşletmenle ilgili sorularını
                    yanıtlamak için buradayım.
                  </p>
                  <p className="mt-3 text-xs text-gray-500">
                    AI yanıtları için sunucuda geçerli API anahtarı
                    ve kullanılabilir API bakiyesi gereklidir.
                  </p>
                </div>

                <div
                  aria-live="polite"
                  className="mb-6 max-h-[450px] space-y-3 overflow-y-auto"
                >
                  {messages.map((item, index) => (
                    <div
                      key={index}
                      className={`rounded-xl p-4 ${
                        item.role === "user"
                          ? "ml-6 bg-purple-600/20"
                          : "mr-6 bg-white/5"
                      }`}
                    >
                      <p className="mb-2 text-xs text-purple-300">
                        {item.role === "user" ? "Sen" : "Hagy AI"}
                      </p>
                      <p className="whitespace-pre-wrap text-sm">
                        {item.content}
                      </p>
                    </div>
                  ))}

                  {aiLoading && (
                    <p className="text-sm text-gray-400">
                      Yanıt hazırlanıyor...
                    </p>
                  )}
                </div>

                {aiError && (
                  <p
                    role="alert"
                    className="mb-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-300"
                  >
                    {aiError}
                  </p>
                )}

                <form onSubmit={sendAi}>
                  <textarea
                    value={aiMessage}
                    onChange={(event) =>
                      setAiMessage(event.target.value)
                    }
                    rows={4}
                    maxLength={2000}
                    disabled={aiLoading}
                    placeholder="Hagy AI'ya bir şey sor..."
                    className={`${inputClass} resize-none`}
                  />

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={!aiMessage.trim() || aiLoading}
                      className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 disabled:opacity-50"
                    >
                      <Send size={17} />
                      Mesaj Gönder
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          <footer className="mt-12 border-t border-white/10 pt-6 text-xs text-gray-600">
            © 2026 Hagy Business. Tüm hakları saklıdır.
          </footer>
        </main>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Müşteri formu"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#171123] p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId
                  ? "Müşteriyi Düzenle"
                  : "Yeni Müşteri Ekle"}
              </h2>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
                aria-label="Kapat"
              >
                <X size={22} />
              </button>
            </div>

            {customerError && (
              <p
                role="alert"
                className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300"
              >
                {customerError}
              </p>
            )}

            <form onSubmit={saveCustomer} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm">
                  Müşteri Adı *
                </label>
                <input
                  required
                  maxLength={150}
                  value={customerForm.name}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Telefon
                </label>
                <input
                  type="tel"
                  maxLength={40}
                  value={customerForm.phone}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  E-posta
                </label>
                <input
                  type="email"
                  maxLength={254}
                  value={customerForm.email}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Durum
                </label>
                <select
                  value={customerForm.status}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      status: event.target.value as
                        | "potential"
                        | "active",
                    }))
                  }
                  className={inputClass}
                >
                  <option value="potential">Potansiyel</option>
                  <option value="active">Aktif</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Notlar
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={customerForm.notes}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className={`${inputClass} resize-none`}
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
                  className="flex-1 rounded-xl bg-purple-600 p-3 font-semibold disabled:opacity-50"
                >
                  {saving
                    ? "Kaydediliyor..."
                    : editingId
                      ? "Güncelle"
                      : "Müşteri Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
