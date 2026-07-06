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
    }
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

function renderStats() {
  const stats = document.querySelector("[data-stats]");
  if (!stats) return;
  const area = document.body.dataset.area || "member";
  const values = {
    member: [["Produk Aktif", "12"], ["Download", "248"], ["Invoice", "8"]],
    affiliate: [["Clicks", "1.284"], ["Leads", "316"], ["Komisi", "Rp4,8jt"]],
    admin: [["Members", "2.418"], ["Orders", "684"], ["Revenue", "Rp182jt"]]
  };
  stats.innerHTML = values[area].map(([label, value]) => `
    <article class="card"><div class="card-body metric"><span class="muted">${label}</span><strong>${value}</strong></div></article>
  `).join("");
}

function renderTable() {
  const table = document.querySelector("[data-demo-table]");
  if (!table) return;
  const type = table.dataset.demoTable;
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

document.addEventListener("DOMContentLoaded", () => {
  renderTopbar();
  renderFooter();
  renderSidebar();
  renderStats();
  renderTable();
  requireAuth();
  bindLogout();
  bindLinkGenerator();
  bindNewsletterAdmin();
  hydrateIcons();
  trackView();
});
