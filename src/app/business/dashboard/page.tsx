
"use client";

import { useEffect, useState } from "react";
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
  Bell,
  Search,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  Circle,
  Sparkles,
  Building2,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Send,
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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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

const demoTasks = [
  "Müşteri teklifini hazırla",
  "Haftalık raporu kontrol et",
  "Yeni müşteri görüşmesi",
];

const demoCustomers = [
  { name: "Örnek Mimarlık", status: "Aktif" },
  { name: "Demo Teknoloji", status: "Görüşülüyor" },
  { name: "Örnek Mobilya", status: "Aktif" },
];

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

  const [search, setSearch] = useState("");
  const [completedTasks, setCompletedTasks] =
    useState<number[]>([2]);

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

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/business/login");
  }

  function openTab(tab: MenuId) {
    setActiveTab(tab);
    setSidebarOpen(false);
    setSearch("");
  }

  function toggleTask(index: number) {
    setCompletedTasks((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index]
    );
  }

  async function handleAiSubmit(
    event: React.FormEvent<HTMLFormElement>
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
        throw new Error(
          "Oturumunuz sona ermiş. Lütfen yeniden giriş yapın."
        );
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
          data?.error || "AI servisine bağlanılamadı."
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
          : "Bir bağlantı hatası oluştu."
      );
    } finally {
      setAiLoading(false);
    }
  }

  if (accessStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080610] text-white">
        <div className="text-center">
          <Loader2
            size={36}
            className="mx-auto mb-4 animate-spin text-purple-400"
          />
          <p className="text-sm text-gray-400">
            İşletme erişimi kontrol ediliyor...
          </p>
        </div>
      </div>
    );
  }

  if (accessStatus !== "approved") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080610] px-5 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-500/10">
            {accessStatus === "pending" ? (
              <Clock3 size={38} className="text-amber-400" />
            ) : accessStatus === "rejected" ? (
              <X size={38} className="text-red-400" />
            ) : (
              <ShieldCheck
                size={38}
                className="text-purple-400"
              />
            )}
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-400">
            HAGY BUSINESS PRIVATE ACCESS
          </p>

          <h1 className="text-3xl font-bold">
            {accessStatus === "pending"
              ? "Başvurunuz Onay Bekliyor"
              : accessStatus === "rejected"
                ? "Başvurunuz Reddedildi"
                : "Erişim Doğrulanamadı"}
          </h1>

          <p className="mt-5 text-sm leading-7 text-gray-400">
            {accessStatus === "pending"
              ? "İşletme hesabınız oluşturuldu. Yönetici onayından sonra paneli kullanabilirsiniz."
              : accessStatus === "rejected"
                ? "İşletme başvurunuz onaylanmadı."
                : "Yetki kontrolü yapılamadı. Lütfen tekrar deneyin."}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => setRefreshKey((n) => n + 1)}
              className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-semibold"
            >
              <RefreshCw size={18} />
              Durumu Kontrol Et
            </button>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-xl border border-white/10 px-6 py-3"
            >
              Çıkış Yap
            </button>
          </div>
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
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
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
                  key={item.id}
                  onClick={() => openTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                    activeTab === item.id
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
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
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
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

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 sm:block">
              Demo Panel
            </span>
            <Bell size={20} className="text-gray-400" />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-bold">
              {fullName.charAt(0).toUpperCase()}
            </div>
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
                  onClick={() => openTab("assistant")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-500"
                >
                  <Sparkles size={18} />
                  AI Asistanı Aç
                </button>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
                İstatistikler, müşteriler ve görevler
                şimdilik örnek verilerdir.
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    title: "Toplam Müşteri",
                    value: "128",
                    icon: Users,
                  },
                  {
                    title: "Aktif Görevler",
                    value: "14",
                    icon: ListTodo,
                  },
                  {
                    title: "Aylık Gelir",
                    value: "₺85.400",
                    icon: Wallet,
                  },
                  {
                    title: "AI İşlemleri",
                    value: "42",
                    icon: Bot,
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
                        Örnek veri
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-6 xl:grid-cols-5">
                <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 xl:col-span-3">
                  <h3 className="mb-5 text-lg font-bold">
                    Görev Takibi
                  </h3>

                  <div className="space-y-3">
                    {demoTasks.map((task, index) => (
                      <button
                        key={index}
                        onClick={() => toggleTask(index)}
                        className="flex w-full items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-4 text-left"
                      >
                        {completedTasks.includes(index) ? (
                          <CheckCircle2
                            size={21}
                            className="text-emerald-400"
                          />
                        ) : (
                          <Circle
                            size={21}
                            className="text-gray-500"
                          />
                        )}

                        <span
                          className={
                            completedTasks.includes(index)
                              ? "text-gray-500 line-through"
                              : ""
                          }
                        >
                          {task}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-[#151020] p-6 xl:col-span-2">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20">
                    <Bot
                      size={25}
                      className="text-purple-300"
                    />
                  </div>

                  <h3 className="text-2xl font-bold">
                    İşletmenin AI Asistanı
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-gray-400">
                    Satış, pazarlama, görev planlama ve
                    işletme yönetimi konularında yapay zekâ
                    desteği al.
                  </p>

                  <button
                    onClick={() => openTab("assistant")}
                    className="mt-8 flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold"
                  >
                    Asistanı Aç
                    <ArrowUpRight size={18} />
                  </button>
                </section>
              </div>

              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                <h3 className="mb-5 text-lg font-bold">
                  Müşteri Yönetimi
                </h3>

                <div className="space-y-3">
                  {demoCustomers.map((customer) => (
                    <div
                      key={customer.name}
                      className="flex items-center justify-between rounded-xl bg-white/5 p-4"
                    >
                      <p className="font-semibold">
                        {customer.name}
                      </p>
                      <span className="text-xs text-purple-300">
                        {customer.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === "assistant" && (
            <div className="mx-auto max-w-4xl">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20">
                  <Sparkles
                    size={32}
                    className="text-purple-400"
                  />
                </div>

                <h1 className="text-3xl font-bold">
                  Hagy AI Asistan
                </h1>

                <p className="mt-3 text-sm text-gray-400">
                  İşletmen için yapay zekâ destekli asistan
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-8">
                <div className="mb-6 rounded-2xl bg-purple-500/10 p-5">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-purple-300">
                    <Bot size={20} />
                    Hagy AI
                  </div>

                  <p className="text-sm leading-7 text-gray-300">
                    Merhaba! Ben Hagy AI Asistan.
                    İşletmenle ilgili sorularını
                    yanıtlamak için buradayım.
                    Sana nasıl yardımcı olabilirim?
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
                    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4 text-sm text-gray-400">
                      <Loader2
                        size={18}
                        className="animate-spin text-purple-400"
                      />
                      Hagy AI yanıt hazırlıyor...
                    </div>
                  )}
                </div>

                {aiError && (
                  <div
                    role="alert"
                    className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
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
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#0D0A17] p-4 text-sm text-white outline-none focus:border-purple-500 disabled:opacity-50"
                  />

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-500">
                      {aiMessage.length}/2000
                    </span>

                    <button
                      type="submit"
                      disabled={
                        !aiMessage.trim() || aiLoading
                      }
                      className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold hover:bg-purple-500 disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <Send size={18} />
                      )}
                      {aiLoading
                        ? "Yanıtlanıyor..."
                        : "Mesaj Gönder"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <section className="space-y-5">
              <h1 className="text-2xl font-bold">
                Görev Yönetimi
              </h1>

              {demoTasks.map((task, index) => (
                <button
                  key={index}
                  onClick={() => toggleTask(index)}
                  className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-5 text-left"
                >
                  {completedTasks.includes(index) ? (
                    <CheckCircle2
                      className="text-emerald-400"
                    />
                  ) : (
                    <Circle className="text-gray-500" />
                  )}

                  <span
                    className={
                      completedTasks.includes(index)
                        ? "line-through text-gray-500"
                        : ""
                    }
                  >
                    {task}
                  </span>
                </button>
              ))}
            </section>
          )}

          {activeTab === "customers" && (
            <section className="space-y-5">
              <h1 className="text-2xl font-bold">
                Müşteri Yönetimi
              </h1>

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
                  placeholder="Müşteri ara..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 outline-none focus:border-purple-500"
                />
              </div>

              {demoCustomers
                .filter((customer) =>
                  customer.name
                    .toLowerCase()
                    .includes(search.toLowerCase())
                )
                .map((customer) => (
                  <div
                    key={customer.name}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-5"
                  >
                    <span className="font-semibold">
                      {customer.name}
                    </span>

                    <span className="text-xs text-purple-300">
                      {customer.status}
                    </span>
                  </div>
                ))}
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
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-500/10">
                <ShieldCheck
                  size={34}
                  className="text-purple-400"
                />
              </div>

              <h1 className="text-3xl font-bold">
                {activeItem?.label}
              </h1>

              <p className="mt-4 leading-7 text-gray-400">
                Bu modülün arayüzü hazır.
                Gerçek işletme verileri ve gelişmiş
                özellikler sonraki aşamada eklenecek.
              </p>
            </section>
          )}

          <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-gray-600 sm:flex-row">
            <p>© 2026 Hagy Business.</p>
            <p>AI Destekli İşletme Yönetim Platformu</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
