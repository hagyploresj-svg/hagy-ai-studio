
"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  Sparkles,
  Building2,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Search,
  Send,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AccessStatus =
  | "checking"
  | "approved"
  | "pending"
  | "rejected"
  | "error";

type MenuId =
  | "overview"
  | "customers"
  | "tasks"
  | "finance"
  | "assistant"
  | "analytics"
  | "portfolio"
  | "settings";

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

const emptyForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  status: "potential",
  notes: "",
};

const menuItems = [
  { id: "overview", label: "Genel Bakış", icon: LayoutDashboard },
  { id: "customers", label: "Müşteriler", icon: Users },
  { id: "tasks", label: "Görevler", icon: ListTodo },
  { id: "finance", label: "Gelir & Gider", icon: Wallet },
  { id: "assistant", label: "Hagy AI Asistan", icon: Bot },
  { id: "analytics", label: "Raporlar", icon: BarChart3 },
  { id: "portfolio", label: "Dijital Portföy", icon: BriefcaseBusiness },
  { id: "settings", label: "Ayarlar", icon: Settings },
] as const;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0D0A17] px-4 py-3 text-sm text-white outline-none focus:border-purple-500";

export default function BusinessDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [accessStatus, setAccessStatus] =
    useState<AccessStatus>("checking");
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<MenuId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [search, setSearch] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] =
    useState<CustomerForm>(emptyForm);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [taskCount, setTaskCount] = useState<number | null>(null);
  const [pendingTaskCount, setPendingTaskCount] =
    useState<number | null>(null);

  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      setAccessStatus("checking");

      const { data, error } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !data.user) {
        router.replace("/business/login");
        return;
      }

      const currentUser = data.user;

      const { data: adminResult, error: adminError } =
        await supabase.rpc("is_business_admin");

      if (!mounted) return;

      if (adminError) {
        setAccessStatus("error");
        return;
      }

      if (adminResult === true) {
        setUser(currentUser);
        setIsAdmin(true);
        setAccessStatus("approved");
        return;
      }

      const { data: application, error: applicationError } =
        await supabase
          .from("business_applications")
          .select("status")
          .eq("user_id", currentUser.id)
          .maybeSingle();

      if (!mounted) return;

      if (applicationError) {
        setAccessStatus("error");
        return;
      }

      setIsAdmin(false);

      if (application?.status === "approved") {
        setUser(currentUser);
        setAccessStatus("approved");
      } else if (application?.status === "rejected") {
        setAccessStatus("rejected");
      } else {
        setAccessStatus("pending");
      }
    }

    void checkAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        router.replace("/business/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, refreshKey]);

  useEffect(() => {
    if (accessStatus !== "approved" || !user) return;

    let cancelled = false;

    async function loadData() {
      setCustomersLoading(true);
      setCustomerError("");

      const [customerResult, taskResult, pendingResult] =
        await Promise.all([
          supabase
            .from("business_customers")
            .select("*")
            .eq("user_id", user!.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("business_tasks")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user!.id),

          supabase
            .from("business_tasks")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user!.id)
            .eq("status", "pending"),
        ]);

      if (cancelled) return;

      if (customerResult.error) {
        setCustomerError(
          "Müşteriler yüklenemedi: " +
            customerResult.error.message
        );
      } else {
        setCustomers(
          (customerResult.data ?? []) as Customer[]
        );
      }

      setTaskCount(
        taskResult.error ? null : taskResult.count ?? 0
      );

      setPendingTaskCount(
        pendingResult.error ? null : pendingResult.count ?? 0
      );

      setCustomersLoading(false);
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [accessStatus, user]);

  const companyName =
    typeof user?.user_metadata?.company_name === "string"
      ? user.user_metadata.company_name
      : "İşletmem";

  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "İşletme Yöneticisi";

  const activeItem = menuItems.find(
    (item) => item.id === activeTab
  );

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

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/business/login");
  }

  function openTab(tab: MenuId) {
    if (tab === "tasks") {
      router.push("/business/tasks");
      return;
    }

    setActiveTab(tab);
    setSidebarOpen(false);
    setSearch("");
  }

  function openNewCustomer() {
    setCustomerForm({ ...emptyForm });
    setEditingId(null);
    setCustomerError("");
    setShowCustomerForm(true);
  }

  function openEditCustomer(customer: Customer) {
    setCustomerForm({
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      status: customer.status,
      notes: customer.notes ?? "",
    });

    setEditingId(customer.id);
    setCustomerError("");
    setShowCustomerForm(true);
  }

  function closeCustomerForm() {
    if (savingCustomer) return;
    setShowCustomerForm(false);
    setEditingId(null);
    setCustomerForm({ ...emptyForm });
  }

  async function saveCustomer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user || savingCustomer) return;

    const name = customerForm.name.trim();

    if (!name || name.length > 150) {
      setCustomerError(
        "Müşteri adı 1-150 karakter olmalıdır."
      );
      return;
    }

    setSavingCustomer(true);
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
          current.map((customer) =>
            customer.id === editingId
              ? (data as Customer)
              : customer
          )
        );
      } else {
        const { data, error } = await supabase
          .from("business_customers")
          .insert({
            ...payload,
            user_id: user.id,
          })
          .select("*")
          .single();

        if (error) throw error;

        setCustomers((current) => [
          data as Customer,
          ...current,
        ]);
      }

      setShowCustomerForm(false);
      setEditingId(null);
      setCustomerForm({ ...emptyForm });
    } catch (error) {
      setCustomerError(
        error instanceof Error
          ? error.message
          : "Müşteri kaydedilemedi."
      );
    } finally {
      setSavingCustomer(false);
    }
  }

  async function deleteCustomer(customer: Customer) {
    if (!user || deletingId) return;

    const confirmed = window.confirm(
      `${customer.name} adlı müşteriyi kalıcı olarak silmek istiyor musun?`
    );

    if (!confirmed) return;

    setDeletingId(customer.id);
    setCustomerError("");

    const { data, error } = await supabase
      .from("business_customers")
      .delete()
      .eq("id", customer.id)
      .eq("user_id", user.id)
      .select("id");

    if (error || !data?.length) {
      setCustomerError(
        error?.message ?? "Müşteri silinemedi."
      );
    } else {
      setCustomers((current) =>
        current.filter((item) => item.id !== customer.id)
      );
    }

    setDeletingId(null);
  }

  async function handleAiSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const message = aiMessage.trim();

    if (!message || aiLoading) return;

    if (message.length > 2000) {
      setAiError("Mesaj en fazla 2000 karakter olabilir.");
      return;
    }

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
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Lütfen yeniden giriş yapın.");
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "AI yanıtı alınamadı."
        );
      }

      if (typeof data?.reply !== "string") {
        throw new Error("AI yanıtı geçersiz.");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply },
      ]);
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "Bağlantı hatası."
      );
    } finally {
      setAiLoading(false);
    }
  }

  if (accessStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080610] text-white">
        <Loader2
          size={36}
          className="animate-spin text-purple-400"
        />
        <span className="ml-3">
          İşletme erişimi kontrol ediliyor...
        </span>
      </div>
    );
  }

  if (accessStatus !== "approved") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080610] px-5 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <ShieldCheck
            size={44}
            className="mx-auto mb-6 text-purple-400"
          />

          <h1 className="text-3xl font-bold">
            {accessStatus === "pending"
              ? "Başvurunuz Onay Bekliyor"
              : accessStatus === "rejected"
                ? "Başvurunuz Reddedildi"
                : "Erişim Doğrulanamadı"}
          </h1>

          <p className="mt-5 text-gray-400">
            {accessStatus === "pending"
              ? "Yönetici onayından sonra paneli kullanabilirsiniz."
              : accessStatus === "rejected"
                ? "İşletme başvurunuz onaylanmadı."
                : "Lütfen tekrar deneyin."}
          </p>

          <button
            onClick={() => setRefreshKey((n) => n + 1)}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 p-3"
          >
            <RefreshCw size={18} />
            Durumu Kontrol Et
          </button>

          <button
            onClick={handleLogout}
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
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/business"
            className="flex items-center gap-3"
          >
            <div className="rounded-xl bg-purple-600 p-3">
              <Building2 size={23} />
            </div>

            <div>
              <h1 className="text-lg font-bold">
                Hagy Business
              </h1>
              <p className="text-xs text-gray-500">
                AI Business Platform
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Menüyü kapat"
          >
            <X size={23} />
          </button>
        </div>

        <div className="px-4 pt-6">
          <div className="mb-6 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
            <p className="mb-2 text-xs text-purple-300">
              İşletme Hesabı
            </p>
            <p className="truncate font-semibold">
              {companyName}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Yönetim paneli
            </p>
          </div>

          <p className="mb-3 px-3 text-xs uppercase tracking-widest text-gray-600">
            Yönetim
          </p>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${
                    activeTab === item.id
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                  {item.id === "tasks" && (
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

        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-4 rounded-xl bg-white/5 p-3">
            <p className="truncate font-semibold">
              {fullName}
            </p>
            <p className="truncate text-xs text-gray-500">
              {user?.email}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
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
                {activeItem?.label}
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
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
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
                  onClick={() => openTab("assistant")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold"
                >
                  <Sparkles size={18} />
                  AI Asistanı Aç
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    title: "Toplam Müşteri",
                    value: customersLoading
                      ? "..."
                      : String(customers.length),
                    icon: Users,
                    detail: "Gerçek müşteri kayıtları",
                  },
                  {
                    title: "Aktif Müşteriler",
                    value: customersLoading
                      ? "..."
                      : String(activeCustomers),
                    icon: CheckCircle2,
                    detail: "Aktif müşteri sayısı",
                  },
                  {
                    title: "Bekleyen Görevler",
                    value:
                      pendingTaskCount === null
                        ? "—"
                        : String(pendingTaskCount),
                    icon: ListTodo,
                    detail: "Gerçek görev kayıtları",
                  },
                  {
                    title: "Aylık Gelir",
                    value: "—",
                    icon: Wallet,
                    detail: "Finans modülü bekleniyor",
                  },
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      key={stat.title}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          {stat.title}
                        </span>
                        <Icon
                          size={20}
                          className="text-purple-400"
                        />
                      </div>

                      <p className="text-3xl font-bold">
                        {stat.value}
                      </p>

                      <p className="mt-2 text-xs text-gray-500">
                        {stat.detail}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-bold">
                      Müşteriler
                    </h3>

                    <button
                      type="button"
                      onClick={() => openTab("customers")}
                      className="text-sm text-purple-400"
                    >
                      Tümünü Gör
                    </button>
                  </div>

                  {customersLoading ? (
                    <Loader2 className="animate-spin text-purple-400" />
                  ) : customers.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Henüz müşteri eklenmedi.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {customers.slice(0, 5).map((customer) => (
                        <div
                          key={customer.id}
                          className="flex items-center justify-between rounded-xl bg-white/5 p-4"
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
                    size={35}
                    className="mb-5 text-purple-300"
                  />

                  <h3 className="text-2xl font-bold">
                    Görev Yönetimi
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-gray-400">
                    Toplam {taskCount ?? "—"} görev.
                    Bekleyen görev sayısı:{" "}
                    {pendingTaskCount ?? "—"}.
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
            </div>
          )}

          {activeTab === "customers" && (
            <section className="space-y-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="text-2xl font-bold">
                    Müşteri Yönetimi
                  </h1>

                  <p className="mt-2 text-sm text-gray-400">
                    İşletmenin gerçek müşteri kayıtlarını yönet.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openNewCustomer}
                  className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-500"
                >
                  <Plus size={19} />
                  Yeni Müşteri
                </button>
              </div>

              {customerError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
                >
                  {customerError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Toplam Müşteri", customers.length],
                  ["Aktif Müşteri", activeCustomers],
                  [
                    "Potansiyel Müşteri",
                    customers.length - activeCustomers,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <p className="text-sm text-gray-400">
                      {label}
                    </p>
                    <p className="mt-3 text-3xl font-bold">
                      {customersLoading ? "..." : value}
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
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="İsim, telefon veya e-posta ara..."
                  className={`${inputClass} pl-12`}
                />
              </div>

              {customersLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2
                    size={30}
                    className="animate-spin text-purple-400"
                  />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
                  <Users
                    size={40}
                    className="mx-auto mb-4 text-purple-400"
                  />

                  <p className="font-semibold">
                    {search
                      ? "Aradığın müşteri bulunamadı."
                      : "Henüz müşteri kaydı yok."}
                  </p>

                  <p className="mt-2 text-sm text-gray-400">
                    Yeni Müşteri butonuyla kayıt oluşturabilirsin.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {customer.name}
                        </p>

                        {customer.phone && (
                          <p className="mt-1 text-sm text-gray-400">
                            {customer.phone}
                          </p>
                        )}

                        {customer.email && (
                          <p className="break-all text-sm text-gray-400">
                            {customer.email}
                          </p>
                        )}

                        {customer.notes && (
                          <p className="mt-2 text-xs text-gray-500">
                            {customer.notes}
                          </p>
                        )}

                        <span
                          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs ${
                            customer.status === "active"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {customer.status === "active"
                            ? "Aktif"
                            : "Potansiyel"}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditCustomer(customer)
                          }
                          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
                        >
                          <Pencil size={16} />
                          Düzenle
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void deleteCustomer(customer)
                          }
                          disabled={deletingId !== null}
                          className="flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "assistant" && (
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

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-8">
                <div className="mb-6 rounded-2xl bg-purple-500/10 p-5">
                  <p className="mb-2 font-semibold text-purple-300">
                    Hagy AI
                  </p>

                  <p className="text-sm leading-7 text-gray-300">
                    Merhaba! Ben Hagy AI Asistan.
                    İşletmenle ilgili sorularını yanıtlamak
                    için buradayım.
                  </p>
                </div>

                <div
                  aria-live="polite"
                  className="mb-6 max-h-[450px] space-y-4 overflow-y-auto"
                >
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`rounded-2xl p-5 ${
                        message.role === "user"
                          ? "ml-6 bg-purple-600/20"
                          : "mr-6 border border-white/10 bg-white/5"
                      }`}
                    >
                      <p className="mb-2 text-xs font-semibold text-purple-300">
                        {message.role === "user"
                          ? "Sen"
                          : "Hagy AI"}
                      </p>

                      <p className="whitespace-pre-wrap text-sm leading-7 text-gray-200">
                        {message.content}
                      </p>
                    </div>
                  ))}

                  {aiLoading && (
                    <div className="flex items-center gap-3 p-4 text-sm text-gray-400">
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Hagy AI yanıt hazırlıyor...
                    </div>
                  )}
                </div>

                {aiError && (
                  <div
                    role="alert"
                    className="mb-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-300"
                  >
                    {aiError}
                  </div>
                )}

                <form onSubmit={handleAiSubmit}>
                  <textarea
                    value={aiMessage}
                    onChange={(event) =>
                      setAiMessage(event.target.value)
                    }
                    placeholder="Hagy AI'ya bir şey sor..."
                    rows={4}
                    maxLength={2000}
                    disabled={aiLoading}
                    className={`${inputClass} resize-none`}
                  />

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {aiMessage.length}/2000
                    </span>

                    <button
                      type="submit"
                      disabled={
                        !aiMessage.trim() || aiLoading
                      }
                      className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold disabled:opacity-50"
                    >
                      <Send size={18} />
                      Mesaj Gönder
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {(
            [
              "finance",
              "analytics",
              "portfolio",
              "settings",
            ] as MenuId[]
          ).includes(activeTab) && (
            <section className="mx-auto max-w-2xl py-12 text-center">
              <ShieldCheck
                size={42}
                className="mx-auto mb-6 text-purple-400"
              />

              <h1 className="text-3xl font-bold">
                {activeItem?.label}
              </h1>

              <p className="mt-4 text-gray-400">
                Bu modülün arayüzü hazır. Gerçek veri
                bağlantısını sonraki aşamada kuracağız.
              </p>
            </section>
          )}

          <footer className="mt-12 border-t border-white/10 pt-6 text-xs text-gray-600">
            © 2026 Hagy Business. Tüm hakları saklıdır.
          </footer>
        </main>
      </div>

      {showCustomerForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              editingId
                ? "Müşteriyi düzenle"
                : "Yeni müşteri ekle"
            }
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#151020] p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId
                  ? "Müşteriyi Düzenle"
                  : "Yeni Müşteri Ekle"}
              </h2>

              <button
                type="button"
                onClick={closeCustomerForm}
                disabled={savingCustomer}
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

            <form
              onSubmit={saveCustomer}
              className="space-y-4"
            >
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
                  placeholder="Ahmet Yılmaz"
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
                  placeholder="05XX XXX XX XX"
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
                  placeholder="ornek@email.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Müşteri Durumu
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
                  <option value="potential">
                    Potansiyel
                  </option>
                  <option value="active">
                    Aktif
                  </option>
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
                  placeholder="Müşteri hakkında not..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeCustomerForm}
                  disabled={savingCustomer}
                  className="flex-1 rounded-xl border border-white/10 px-5 py-3"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold disabled:opacity-50"
                >
                  {savingCustomer && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}
                  {savingCustomer
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
