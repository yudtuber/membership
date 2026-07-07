import { authApi, dataApi } from "./firebase-service.js";
import { trackView } from "./tracking.js";

const appScript = document.querySelector('script[src$="assets/js/app.js"]');
const scriptBase = appScript?.getAttribute("src")?.replace(/assets\/js\/app\.js.*$/, "") || "./";
const base = document.body.dataset.base || scriptBase;

function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}

function hydrateIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function currentFile() {
  return location.pathname.split("/").pop() || "index.html";
}

function renderTopbar() {
  const target = document.querySelector("[data-topbar]");
  if (!target) return;
  target.innerHTML = `
    <a class="brand" href="${base}index.html" data-track-click="brand">
      <span class="brand-mark">${icon("layers")}</span><span>MembershipPro</span>
    </a>
    <nav class="nav" aria-label="Navigasi utama">
      <a href="${base}salespage.html">Sales Page</a>
      <a href="${base}pricing.html">Pricing</a>
      <a href="${base}auth-pages/login.html">${icon("log-in")}Login</a>
      <a class="btn primary" href="${base}auth-pages/register.html" data-track-click="register_top">${icon("user-plus")}Daftar</a>
    </nav>
  `;
}

function renderFooter() {
  const target = document.querySelector("[data-footer]");
  if (!target) return;
  target.innerHTML = `
    <div class="footer-inner">
      <span>MembershipPro siap untuk GitHub Pages + Firebase.</span>
      <span>Auth, member area, affiliate, admin, forms, dan tracking.</span>
    </div>
  `;
}

const menus = {
  member: [
    ["dashboard.html", "layout-dashboard", "Dashboard"],
    ["product-gallery.html", "gallery-horizontal", "Product Gallery"],
    ["downloads.html", "download", "Downloads"],
    ["invoices.html", "receipt", "Invoices"],
    ["support.html", "life-buoy", "Support"]
  ],
  affiliate: [
    ["dashboard.html", "layout-dashboard", "Dashboard"],
    ["link-generator.html", "link", "Link Generator"],
    ["clicks.html", "mouse-pointer-click", "Clicks"],
    ["views.html", "eye", "Views"],
    ["leads.html", "users", "Leads"],
    ["sales.html", "badge-dollar-sign", "Sales"],
    ["commissions.html", "wallet", "Commissions"],
    ["payouts.html", "banknote", "Payouts"]
  ],
  admin: [
    ["dashboard.html", "layout-dashboard", "Dashboard"],
    ["members.html", "users", "Members"],
    ["products.html", "package", "Products"],
    ["orders.html", "shopping-cart", "Orders"],
    ["affiliates.html", "network", "Affiliates"],
    ["sales-statistics.html", "chart-no-axes-combined", "Sales Statistics"],
    ["click-statistics.html", "mouse-pointer-click", "Click Statistics"],
    ["view-statistics.html", "eye", "View Statistics"],
    ["newsletter.html", "mail", "Newsletter"],
    ["support-tickets.html", "messages-square", "Support Tickets"]
  ]
};

function renderSidebar() {
  const target = document.querySelector("[data-sidebar]");
  if (!target) return;
  const area = document.body.dataset.area || "member";
  const active = currentFile();
  target.innerHTML = `
    <a class="brand" href="${base}index.html">
      <span class="brand-mark">${icon("layers")}</span><span>MembershipPro</span>
    </a>
    <nav class="side-nav" aria-label="${area} navigation">
      ${(menus[area] || menus.member).map(([href, iconName, label]) => `
        <a class="${active === href ? "active" : ""}" href="${href}">${icon(iconName)}${label}</a>
      `).join("")}
      <a href="${base}index.html">${icon("home")}Public Site</a>
      <a href="#" data-logout>${icon("log-out")}Logout</a>
    </nav>
  `;
}

function requireAuth() {
  if (!document.body.dataset.protected) return;
  authApi.watch(async (user) => {
    if (!user) {
      location.href = `${base}auth-pages/login.html`;
      return;
    }
    const profile = await authApi.profile(user.uid);
    document.querySelectorAll("[data-user-name]").forEach((node) => {
      node.textContent = profile?.name || user.displayName || user.email;
    });
    if (document.body.dataset.role === "admin" && profile?.role !== "admin") {
      location.href = `${base}member-area/dashboard.html`;
      return;
    }
    await renderStats(profile);
    await renderTable(profile);
    hydrateIcons();
  });
}

function bindLogout() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-logout]");
    if (!button) return;
    event.preventDefault();
    await authApi.logout();
    location.href = `${base}auth-pages/login.html`;
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMetricCards(target, values) {
  target.innerHTML = values.map(([label, value]) => `
    <article class="card"><div class="card-body metric"><span class="muted">${label}</span><strong>${value}</strong></div></article>
  `).join("");
}

async function renderStats() {
  const stats = document.querySelector("[data-stats]");
  if (!stats) return;
  const area = document.body.dataset.area || "member";
  stats.innerHTML = `
    <article class="card"><div class="card-body metric"><span class="muted">Loading</span><strong>...</strong></div></article>
  `;

  if (area === "admin") {
    try {
      const [members, products, orders, leads, tickets, views, clicks, sales] = await Promise.all([
        dataApi.count("members"),
        dataApi.count("products"),
        dataApi.count("orders"),
        dataApi.count("leads"),
        dataApi.count("supportTickets"),
        dataApi.count("views"),
        dataApi.count("clicks"),
        dataApi.latest("sales", 100)
      ]);
      const revenue = sales.reduce((total, sale) => total + Number(sale.amount || 0), 0);
      renderMetricCards(stats, [
        ["Members", formatNumber(members)],
        ["Products", formatNumber(products)],
        ["Orders", formatNumber(orders)],
        ["Leads", formatNumber(leads)],
        ["Tickets", formatNumber(tickets)],
        ["Views", formatNumber(views)],
        ["Clicks", formatNumber(clicks)],
        ["Revenue", formatCurrency(revenue)]
      ]);
      return;
    } catch (error) {
      stats.innerHTML = `<div class="notice error">Gagal membaca statistik Firestore: ${escapeHtml(error.message)}</div>`;
      return;
    }
  }

  const values = {
    member: [["Produk Aktif", "12"], ["Download", "248"], ["Invoice", "8"]],
    affiliate: [["Clicks", "1.284"], ["Leads", "316"], ["Komisi", "Rp4,8jt"]]
  };
  renderMetricCards(stats, values[area] || values.member);
}

function statusBadge(value) {
  const text = escapeHtml(value || "-");
  const normalized = String(value || "").toLowerCase();
  const type = ["pending", "review", "open", "trial", "processing"].includes(normalized) ? "pending" : "active";
  return `<span class="badge ${type}">${text}</span>`;
}

function tableHtml(headers, rows) {
  if (!rows.length) {
    return `<div class="notice">Belum ada data Firestore untuk halaman ini.</div>`;
  }
  return `
    <table>
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}

function currentAdminTableType(type) {
  const file = currentFile();
  if (file === "members.html") return "members";
  if (file === "orders.html" || type === "orders") return "orders";
  if (file === "affiliates.html") return "affiliates";
  if (file === "support-tickets.html" || type === "tickets") return "tickets";
  if (file === "click-statistics.html") return "clicks";
  if (file === "view-statistics.html") return "views";
  if (file === "sales-statistics.html") return "sales";
  if (file === "products.html") return "products";
  return type;
}

async function renderAdminTable(table, type) {
  const tableType = currentAdminTableType(type);
  table.innerHTML = `<div class="notice">Memuat data Firestore...</div>`;

  try {
    if (tableType === "members") {
      const members = await dataApi.latest("members", 50);
      table.innerHTML = tableHtml(["Nama", "Email", "Plan", "Role", "Status"], members.map((member) => [
        escapeHtml(member.name || "-"),
        escapeHtml(member.email || "-"),
        escapeHtml(member.plan || "-"),
        statusBadge(member.role || "-"),
        statusBadge(member.status || "-")
      ]));
      return;
    }

    if (tableType === "orders") {
      const orders = await dataApi.latest("orders", 50);
      table.innerHTML = tableHtml(["Order ID", "Nama", "Plan", "Nominal", "Payment", "Status"], orders.map((order) => [
        escapeHtml(order.id),
        escapeHtml(order.name || order.email || "-"),
        escapeHtml(order.plan || "-"),
        formatCurrency(order.amount),
        escapeHtml(order.gateway || "manual"),
        statusBadge(order.status || "pending")
      ]));
      return;
    }

    if (tableType === "products") {
      const products = await dataApi.latest("products", 50);
      table.innerHTML = tableHtml(["Produk", "Plan", "Harga", "Akses", "Download", "Status"], products.map((product) => [
        escapeHtml(product.name || "-"),
        escapeHtml(product.plan || product.slug || "-"),
        formatCurrency(product.price),
        escapeHtml(product.accessLevel || "-"),
        product.downloadUrl ? `<a href="${escapeHtml(product.downloadUrl)}" target="_blank" rel="noopener">Link</a>` : "-",
        statusBadge(product.status || "active")
      ]));
      return;
    }

    if (tableType === "tickets") {
      const tickets = await dataApi.latest("supportTickets", 50);
      table.innerHTML = tableHtml(["Ticket ID", "Email", "Subjek", "Tanggal", "Status"], tickets.map((ticket) => [
        escapeHtml(ticket.id),
        escapeHtml(ticket.email || "-"),
        escapeHtml(ticket.subject || "-"),
        formatDate(ticket.createdAt),
        statusBadge(ticket.status || "open")
      ]));
      return;
    }

    if (tableType === "clicks" || tableType === "views") {
      const items = await dataApi.latest(tableType, 50);
      table.innerHTML = tableHtml(["Tanggal", "Affiliate", "Campaign", "Page", "Event"], items.map((item) => [
        formatDate(item.createdAt),
        escapeHtml(item.affiliateCode || "-"),
        escapeHtml(item.campaign || "-"),
        escapeHtml(item.page || "-"),
        escapeHtml(item.label || item.title || tableType)
      ]));
      return;
    }

    if (tableType === "sales") {
      const sales = await dataApi.latest("sales", 50);
      table.innerHTML = tableHtml(["Tanggal", "Order ID", "Affiliate", "Nominal", "Status"], sales.map((sale) => [
        formatDate(sale.createdAt),
        escapeHtml(sale.orderId || "-"),
        escapeHtml(sale.affiliateCode || "-"),
        formatCurrency(sale.amount),
        statusBadge(sale.status || "pending")
      ]));
      return;
    }

    if (tableType === "affiliates") {
      const applications = await dataApi.latest("affiliateApplications", 50);
      table.innerHTML = tableHtml(["Nama", "Email", "Channel", "Tanggal", "Status"], applications.map((item) => [
        escapeHtml(item.name || "-"),
        escapeHtml(item.email || "-"),
        escapeHtml(item.channel || "-"),
        formatDate(item.createdAt),
        statusBadge(item.status || "review")
      ]));
      return;
    }
  } catch (error) {
    table.innerHTML = `<div class="notice error">Gagal membaca data Firestore: ${escapeHtml(error.message)}</div>`;
    return;
  }

  table.innerHTML = `<div class="notice">Data ${escapeHtml(tableType)} belum dibuat di Firestore.</div>`;
}

async function renderTable() {
  const table = document.querySelector("[data-demo-table]");
  if (!table) return;
  const type = table.dataset.demoTable;
  if (document.body.dataset.area === "admin") {
    await renderAdminTable(table, type);
    return;
  }
  const rows = {
    products: [["Kelas Growth Funnel", "Premium", "Aktif"], ["Template Landing Page", "Starter", "Aktif"], ["Swipe File Ads", "Pro", "Draft"]],
    orders: [["ORD-1007", "Raka Pratama", "Rp499.000", "Pending"], ["ORD-1006", "Nadia Putri", "Rp1.299.000", "Paid"], ["ORD-1005", "Arief Hidayat", "Rp499.000", "Paid"]],
    affiliates: [["AFF-21", "Sinta", "482 clicks", "Aktif"], ["AFF-18", "Bagus", "217 clicks", "Aktif"], ["AFF-12", "Dewi", "91 clicks", "Review"]],
    tickets: [["TCK-88", "Akses download", "Open"], ["TCK-87", "Invoice salah nama", "Solved"], ["TCK-86", "Reset password", "Open"]]
  }[type] || [["Lead", "Campaign A", "Baru"], ["Sale", "Campaign B", "Valid"], ["View", "Organic", "Terekam"]];
  table.innerHTML = `
    <table>
      <thead><tr><th>Data</th><th>Detail</th><th>Status</th></tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell, index) => `<td>${index === 2 ? `<span class="badge ${cell === "Pending" || cell === "Review" || cell === "Open" ? "pending" : "active"}">${cell}</span>` : cell}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}

function bindLinkGenerator() {
  const form = document.querySelector("[data-link-generator]");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const url = new URL(data.get("target") || `${location.origin}${base}salespage.html`, location.href);
    url.searchParams.set("ref", data.get("code"));
    if (data.get("campaign")) url.searchParams.set("campaign", data.get("campaign"));
    document.querySelector("[data-generated-link]").value = url.toString();
  });
}

function bindNewsletterAdmin() {
  const form = document.querySelector("[data-admin-newsletter]");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    await dataApi.track("newsletterBroadcasts", data);
    form.reset();
    document.querySelector("[data-form-status]").textContent = "Newsletter disimpan sebagai draft broadcast.";
  });
}

function bindProductAdmin() {
  const form = document.querySelector("[data-admin-product-form]");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const status = form.querySelector("[data-form-status]");
    try {
      await dataApi.createProduct(data);
      form.reset();
      if (status) {
        status.className = "notice success";
        status.textContent = "Produk berhasil ditambahkan ke Firestore.";
      }
      await renderTable();
      await renderStats();
    } catch (error) {
      if (status) {
        status.className = "notice error";
        status.textContent = error.message;
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderTopbar();
  renderFooter();
  renderSidebar();
  if (!document.body.dataset.protected) {
    renderStats();
    renderTable();
  }
  requireAuth();
  bindLogout();
  bindLinkGenerator();
  bindNewsletterAdmin();
  bindProductAdmin();
  hydrateIcons();
  trackView();
});
