
function openTab(tab: MenuId) {
  if (tab === "tasks") {
    router.push("/business/tasks");
    return;
  }

  if (tab === "finance") {
    router.push("/business/finance");
    return;
  }

  if (tab === "analytics") {
    router.push("/business/reports");
    return;
  }

  if (tab === "portfolio") {
    router.push("/business/portfolio");
    return;
  }

  if (tab === "settings") {
    router.push("/business/settings");
    return;
  }

  setActiveTab(tab);
  setSidebarOpen(false);
  setSearch("");
}
