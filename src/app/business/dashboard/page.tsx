
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
  ChevronRight,
  ShieldCheck,
  Loader2,
  RefreshCw,
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
  {
    title: "Müşteri teklifini hazırla",
    detail: "Satış departmanı",
    date: "Bugün",
  },
  {
    title: "Haftalık raporu kontrol et",
    detail: "Yönetim",
    date: "Yarın",
  },
  {
    title: "Yeni müşteri görüşmesi",
    detail: "İş geliştirme",
    date: "Tamamlandı",
  },
];

const demoCustomers = [
  {
    name: "Örnek Mimarlık",
    category: "Kurumsal müşteri",
    status: "Aktif",
    color: "bg-purple-500",
  },
  {
    name: "Demo Teknoloji",
    category: "Potansiyel müşteri",
    status: "Görüşülüyor",
    color: "bg-blue-500",
  },
  {
    name: "Örnek Mobilya",
    category: "Kurumsal müşteri",
    status: "Aktif",
    color: "bg-emerald-500",
  },
];

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="mb-5 flex items-start justify-between">
        <span className="text-sm text-gray-400">{title}</span>
        <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400">
          <Icon size={19} />
        </div>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <p className="mt-2 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

export default function BusinessDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [accessStatus, setAccessStatus] =
    useState<AccessStatus>("checking");

  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<MenuId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [search, setSearch] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [completedTasks, setCompletedTasks] =
    useState<number[]>([2]);

  const [refreshKey, setRefreshKey] = useState(0);

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
        setUser(null);
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
        setUser(null);
        setAccessStatus("error");
        return;
      }

      setIsAdmin(false);

      if (application?.status === "approved") {
        setUser(currentUser);
        setAccessStatus("approved");
      } else if (application?.status === "rejected") {
        setUser(null);
        setAccessStatus("rejected");
      } else {
        setUser(null);
        setAccessStatus("pending");
      }
    }

    void checkAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setAccessStatus("checking");
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
    router.refresh();
  }

  function openTab(tab: MenuId) {
    setActiveTab(tab);
    setSidebarOpen(false);
    setSearch("");
  }

  function handleAiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!aiMessage.trim()) return;

    setAiResponse(
      "Hagy AI Asistan'ın sohbet arayüzü hazır! Gerçek yanıtlar ve işletme verileriyle işlem yapabilmesi için güvenli AI API bağlantısını sonraki aşamada ekleyeceğiz."
    );

    setAiMessage("");
  }

  function toggleTask(index: number) {
    setCompletedTasks((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index]
    );
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
              <ShieldCheck size={38} className="text-purple-400" />
            )}
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">
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
              ? "Hagy Business hesabınız oluşturuldu. Yönetici başvurunuzu onayladıktan sonra işletme panelini kullanabilirsiniz."
              : accessStatus === "rejected"
                ? "İşletme başvurunuz onaylanmadı. Destek almak için Hagy ekibiyle iletişime geçebilirsiniz."
                : "Hesap yetkileri şu anda kontrol edilemiyor. Lütfen yeniden deneyin."}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => setRefreshKey((n) => n + 1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold hover:bg-purple-500"
            >
              <RefreshCw size={17} />
              Durumu Kontrol Et
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
            >
              <LogOut size={17} />
              Çıkış Yap
            </button>
          </div>

          <Link
            href="/business"
            className="mt-7 inline-block text-sm text-gray-500 hover:text-white"
          >
            Hagy Business Ana Sayfa
          </Link>
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
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#100C1C] transition-transform duration-300 lg:translate-x-0 ${
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600">
              <Building2 size={23} />
            </div>

            <div>
              <h1 className="text-lg font-bold">Hagy Business</h1>
              <p className="text-[11px] text-gray-500">
                AI Business Platform
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 lg:hidden"
            aria-label="Menüyü kapat"
          >
            <X size={23} />
          </button>
        </div>

        <div className="px-4 pt-6">
          <div className="mb-6 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-purple-300">
              <Sparkles size={14} />
              İşletme Hesabı
            </div>
            <p className="truncate font-semibold">
              {companyName}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Yönetim paneli
            </p>
          </div>

          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-600">
            Yönetim
          </p>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const selected = activeTab === item.id;

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                    selected
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
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-amber-300 hover:bg-amber-500/10"
              >
                <ShieldCheck size={19} />
                Super Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-bold text-purple-300">
              {fullName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {fullName}
              </p>
              <p className="truncate text-xs text-gray-500">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            <LogOut size={18} />
            {loggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-[#080610]/95 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="text-gray-300 lg:hidden"
              aria-label="Menüyü aç"
            >
              <Menu size={25} />
            </button>

            <div>
              <h2 className="text-lg font-bold sm:text-xl">
                {activeItem?.label ?? "Genel Bakış"}
              </h2>
              <p className="hidden text-xs text-gray-500 sm:block">
                Hagy Business Yönetim Merkezi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 sm:inline-flex">
              Demo Panel
            </span>

            <button
              type="button"
              onClick={() => openTab("tasks")}
              aria-label="Görevleri görüntüle"
              className="rounded-xl border border-white/10 p-2.5 text-gray-400 hover:text-white"
            >
              <Bell size={19} />
            </button>

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

                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
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
                  className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-500"
                >
                  <Sparkles size={18} />
                  AI Asistanı Aç
                </button>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
                Bu panelin istatistikleri, müşterileri ve görevleri
                örnek verilerdir. Gerçek işletme kayıtları henüz
                bağlanmadı.
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Toplam Müşteri"
                  value="128"
                  icon={Users}
                  detail="Örnek müşteri sayısı"
                />
                <StatCard
                  title="Aktif Görevler"
                  value="14"
                  icon={ListTodo}
                  detail="Örnek görev sayısı"
                />
                <StatCard
                  title="Aylık Gelir"
                  value="₺85.400"
                  icon={Wallet}
                  detail="Örnek aylık gelir"
                />
                <StatCard
                  title="AI İşlemleri"
                  value="42"
                  icon={Bot}
                  detail="Örnek işlem sayısı"
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-5">
                <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 xl:col-span-3">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">
                        Görev Takibi
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Örnek yapılacak işler
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openTab("tasks")}
                      className="text-sm text-purple-400"
                    >
                      Tümünü Gör
                    </button>
                  </div>

                  <div className="space-y-3">
                    {demoTasks.map((task, index) => {
                      const done =
                        completedTasks.includes(index);

                      return (
                        <button
                          type="button"
                          key={index}
                          onClick={() => toggleTask(index)}
                          className="flex w-full items-center gap-4 rounded-xl border border-white/5 bg-white/[0.035] p-4 text-left hover:bg-white/[0.06]"
                        >
                          {done ? (
                            <CheckCircle2
                              size={21}
                              className="shrink-0 text-emerald-400"
                            />
                          ) : (
                            <Circle
                              size={21}
                              className="shrink-0 text-gray-500"
                            />
                          )}

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium ${
                                done
                                  ? "text-gray-500 line-through"
                                  : "text-white"
                              }`}
                            >
                              {task.title}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {task.detail}
                            </p>
                          </div>

                          <span className="text-xs text-gray-500">
                            {task.date}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-4 text-xs text-gray-600">
                    Görev işaretlemeleri yalnızca bu sayfa
                    açıkken korunur.
                  </p>
                </section>

                <section className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-[#151020] p-6 xl:col-span-2">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20">
                    <Bot size={25} className="text-purple-300" />
                  </div>

                  <span className="mb-3 inline-flex rounded-full bg-purple-500/15 px-3 py-1 text-xs text-purple-300">
                    Hagy AI
                  </span>

                  <h3 className="text-2xl font-bold">
                    İşletmenin AI Asistanı
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-gray-400">
                    Rapor hazırlama, müşteri analizi, görev
                    planlama ve iş süreçlerini yönetme
                    deneyimini tek panelde sunmayı hedefliyoruz.
                  </p>

                  <button
                    type="button"
                    onClick={() => openTab("assistant")}
                    className="mt-8 flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold"
                  >
                    Asistanı Aç
                    <ArrowUpRight size={17} />
                  </button>

                  <p className="mt-3 text-xs text-gray-500">
                    Gerçek AI bağlantısı henüz kurulmadı.
                  </p>
                </section>
              </div>

              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      Müşteri Yönetimi
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Örnek müşteri listesi
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openTab("customers")}
                    className="flex items-center gap-1 text-sm text-purple-400"
                  >
                    Tümünü Gör
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  {demoCustomers.map((customer) => (
                    <div
                      key={customer.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${customer.color} font-bold`}
                        >
                          {customer.name.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {customer.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {customer.category}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-xs text-gray-300">
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
                  İşletmen için akıllı yönetim asistanı
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-8">
                <div className="mb-6 rounded-2xl bg-purple-500/10 p-5">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-purple-300">
                    <Bot size={20} />
                    Hagy AI
                  </div>

                  <p className="text-sm leading-7 text-gray-300">
                    Merhaba! Ben Hagy AI Asistan. Bu ekran
                    şu anda demo modunda. Yakında işletme
                    raporlarını hazırlayabilecek, görevlerini
                    planlayabilecek ve müşteri süreçlerinde
                    sana yardımcı olabileceğim.
                  </p>
                </div>

                {aiResponse && (
                  <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="mb-2 text-sm font-semibold text-purple-300">
                      Hagy AI
                    </p>
                    <p className="text-sm leading-7 text-gray-300">
                      {aiResponse}
                    </p>
                  </div>
                )}

                <form onSubmit={handleAiSubmit}>
                  <textarea
                    value={aiMessage}
                    onChange={(e) =>
                      setAiMessage(e.target.value)
                    }
                    placeholder="Hagy AI'ya bir şey sor..."
                    rows={4}
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#0D0A17] p-4 text-sm text-white outline-none focus:border-purple-500"
                  />

                  <button
                    type="submit"
                    disabled={!aiMessage.trim()}
                    className="mt-4 flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    <Sparkles size={17} />
                    Mesaj Gönder
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">
                  Görev Yönetimi
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                  Örnek görevleri görüntüle ve işaretle.
                </p>
              </div>

              <div className="space-y-3">
                {demoTasks.map((task, index) => {
                  const done =
                    completedTasks.includes(index);

                  return (
                    <button
                      type="button"
                      key={index}
                      onClick={() => toggleTask(index)}
                      className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-5 text-left"
                    >
                      {done ? (
                        <CheckCircle2
                          size={22}
                          className="text-emerald-400"
                        />
                      ) : (
                        <Circle
                          size={22}
                          className="text-gray-500"
                        />
                      )}

                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            done
                              ? "text-gray-500 line-through"
                              : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {task.detail}
                        </p>
                      </div>

                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock3 size={14} />
                        {task.date}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "customers" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">
                  Müşteri Yönetimi
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                  Müşteri yönetimi arayüzü — örnek kayıtlar.
                </p>
              </div>

              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Müşteri ara..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-3">
                {demoCustomers
                  .filter((customer) =>
                    customer.name
                      .toLowerCase()
                      .includes(search.toLowerCase())
                  )
                  .map((customer) => (
                    <div
                      key={customer.name}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-5"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl ${customer.color} font-bold`}
                        >
                          {customer.name.charAt(0)}
                        </div>

                        <div>
                          <p className="font-semibold">
                            {customer.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {customer.category}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs text-purple-300">
                        {customer.status}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {(
            [
              "finance",
              "analytics",
              "portfolio",
              "settings",
            ] as MenuId[]
          ).includes(activeTab) && (
            <div className="mx-auto max-w-2xl py-12 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-500/10">
                {activeTab === "finance" && (
                  <Wallet
                    size={34}
                    className="text-purple-400"
                  />
                )}
                {activeTab === "analytics" && (
                  <BarChart3
                    size={34}
                    className="text-purple-400"
                  />
                )}
                {activeTab === "portfolio" && (
                  <BriefcaseBusiness
                    size={34}
                    className="text-purple-400"
                  />
                )}
                {activeTab === "settings" && (
                  <Settings
                    size={34}
                    className="text-purple-400"
                  />
                )}
              </div>

              <h1 className="text-3xl font-bold">
                {activeItem?.label}
              </h1>

              <p className="mt-4 leading-7 text-gray-400">
                Bu modülün arayüzü hazır. Gerçek işletme
                verileri, kayıt işlemleri ve gelişmiş
                özellikler sonraki aşamalarda eklenecek.
              </p>

              <div className="mt-8 flex items-center justify-center gap-2 text-sm text-purple-300">
                <ShieldCheck size={18} />
                İşletmeye özel veri erişimi planlanıyor
              </div>
            </div>
          )}

          <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-gray-600 sm:flex-row">
            <p>© 2026 Hagy Business. Tüm hakları saklıdır.</p>
            <p>AI Destekli İşletme Yönetim Platformu</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
