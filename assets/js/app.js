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
    ["support-tickets.html", "messages-square", "Support Tickets"],
    ["payouts.html", "banknote", "Payouts"]
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
    await renderProductGallery(profile);
    await renderAffiliateDashboard(profile);
    await renderAffiliatePayouts(profile);
    await renderAffiliatePageTable(profile);
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

function selectHtml(field, value, options) {
  return `
    <select data-field="${escapeHtml(field)}">
      ${options.map((option) => `<option value="${escapeHtml(option)}" ${String(value || "") === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
    </select>
  `;
}

function actionButton(action, collectionName, id, label) {
  return `<button class="btn" type="button" data-admin-action="${escapeHtml(action)}" data-collection="${escapeHtml(collectionName)}" data-id="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function affiliateCodeFromProfile(profile) {
  return profile?.affiliateCode || profile?.code || slugify(profile?.name || profile?.email || "affiliate");
}

function hasSavedAffiliateCode(profile) {
  return Boolean(profile?.affiliateCode || profile?.code);
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
  if (file === "payouts.html") return "payouts";
  return type;
}

async function renderAdminTable(table, type) {
  const tableType = currentAdminTableType(type);
  table.innerHTML = `<div class="notice">Memuat data Firestore...</div>`;

  try {
    if (tableType === "members") {
      const members = await dataApi.latest("members", 50);
      table.innerHTML = tableHtml(["Nama", "Email", "Plan", "Role", "Status", "Aksi"], members.map((member) => [
        escapeHtml(member.name || "-"),
        escapeHtml(member.email || "-"),
        selectHtml("plan", member.plan, ["starter", "premium", "pro", "enterprise"]),
        selectHtml("role", member.role, ["member", "affiliate", "admin"]),
        selectHtml("status", member.status, ["trial", "active", "blocked"]),
        actionButton("update-row", "members", member.id, "Simpan")
      ]));
      return;
    }

    if (tableType === "orders") {
      const orders = await dataApi.latest("orders", 50);
      table.innerHTML = tableHtml(["Order ID", "Nama", "Plan", "Nominal", "Payment", "Status", "Aksi"], orders.map((order) => [
        escapeHtml(order.id),
        `${escapeHtml(order.name || order.email || "-")}<input type="hidden" data-field="email" value="${escapeHtml(order.email || "")}">`,
        `${escapeHtml(order.plan || "-")}<input type="hidden" data-field="plan" value="${escapeHtml(order.plan || "")}">`,
        formatCurrency(order.amount),
        escapeHtml(order.gateway || "manual"),
        selectHtml("status", order.status, ["pending", "paid", "cancelled", "refunded"]),
        actionButton("update-row", "orders", order.id, "Update")
      ]));
      return;
    }

    if (tableType === "products") {
      const products = await dataApi.latest("products", 50);
      table.innerHTML = tableHtml(["Produk", "Plan", "Harga", "Akses", "Download", "Status", "Aksi"], products.map((product) => [
        escapeHtml(product.name || "-"),
        escapeHtml(product.plan || product.slug || "-"),
        formatCurrency(product.price),
        selectHtml("accessLevel", product.accessLevel, ["starter", "premium", "pro", "enterprise"]),
        product.downloadUrl ? `<a href="${escapeHtml(product.downloadUrl)}" target="_blank" rel="noopener">Link</a>` : "-",
        selectHtml("status", product.status, ["active", "draft", "archived"]),
        actionButton("update-row", "products", product.id, "Simpan")
      ]));
      return;
    }

    if (tableType === "tickets") {
      const tickets = await dataApi.latest("supportTickets", 50);
      table.innerHTML = tableHtml(["Ticket ID", "Email", "Subjek", "Pesan", "Balasan", "Status", "Aksi"], tickets.map((ticket) => [
        escapeHtml(ticket.id),
        escapeHtml(ticket.email || "-"),
        escapeHtml(ticket.subject || "-"),
        escapeHtml(ticket.message || "-"),
        `<textarea data-field="reply" placeholder="Tulis balasan">${escapeHtml(ticket.reply || "")}</textarea>`,
        selectHtml("status", ticket.status, ["open", "answered", "closed"]),
        actionButton("reply-ticket", "supportTickets", ticket.id, "Kirim Balasan")
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

    if (tableType === "payouts") {
      const payouts = await dataApi.latest("payouts", 50);
      table.innerHTML = tableHtml(["Tanggal", "Affiliate", "Rekening", "Nominal", "Status", "Aksi"], payouts.map((payout) => [
        formatDate(payout.createdAt),
        `${escapeHtml(payout.name || payout.email || "-")}<input type="hidden" data-field="email" value="${escapeHtml(payout.email || "")}"><input type="hidden" data-field="affiliateCode" value="${escapeHtml(payout.affiliateCode || "")}">`,
        escapeHtml([payout.bankName, payout.bankAccountNumber, payout.bankAccountName].filter(Boolean).join(" - ") || "-"),
        formatCurrency(payout.amount),
        selectHtml("status", payout.status, ["pending", "paid", "rejected"]),
        actionButton("update-row", "payouts", payout.id, "Update")
      ]));
      return;
    }

    if (tableType === "affiliates") {
      const [applications, members] = await Promise.all([
        dataApi.latest("affiliateApplications", 100),
        dataApi.latest("members", 100)
      ]);
      const affiliateMembers = members.filter((member) =>
        member.role === "affiliate" || member.affiliateCode || member.bankAccountNumber
      );
      const mergedByEmail = new Map();

      applications.forEach((item) => {
        const key = item.email || item.id;
        mergedByEmail.set(key, {
          ...item,
          sourceCollection: "affiliateApplications",
          sourceId: item.id
        });
      });

      affiliateMembers.forEach((member) => {
        const key = member.email || member.id;
        const existing = mergedByEmail.get(key) || {};
        mergedByEmail.set(key, {
          ...existing,
          ...member,
          bankName: member.bankName || existing.bankName || "",
          bankAccountNumber: member.bankAccountNumber || existing.bankAccountNumber || "",
          bankAccountName: member.bankAccountName || existing.bankAccountName || "",
          affiliateCode: member.affiliateCode || existing.affiliateCode || existing.code || "",
          sourceCollection: existing.sourceCollection || "members",
          sourceId: existing.sourceId || member.id
        });
      });

      const affiliateItems = Array.from(mergedByEmail.values());
      const rows = await Promise.all(affiliateItems.map(async (item) => {
        const affiliateCode = item.affiliateCode || item.code || slugify(item.name || item.email || item.sourceId || item.id);
        const [views, clicks, leads, sales, payouts] = await Promise.all([
          dataApi.byField("views", "affiliateCode", affiliateCode, 100),
          dataApi.byField("clicks", "affiliateCode", affiliateCode, 100),
          dataApi.byField("leads", "affiliateCode", affiliateCode, 100),
          dataApi.byField("sales", "affiliateCode", affiliateCode, 100),
          dataApi.byField("payouts", "affiliateCode", affiliateCode, 100)
        ]);
        const salesTotal = sales.reduce((total, sale) => total + Number(sale.amount || 0), 0);
        const paidTotal = payouts
          .filter((payout) => String(payout.status || "").toLowerCase() === "paid")
          .reduce((total, payout) => total + Number(payout.amount || 0), 0);
        const commissionDue = Math.max(0, Math.round(salesTotal * 0.3) - paidTotal);
        return [
          `${escapeHtml(item.name || "-")}<input type="hidden" data-field="name" value="${escapeHtml(item.name || "")}">`,
          `${escapeHtml(item.email || "-")}<input type="hidden" data-field="email" value="${escapeHtml(item.email || "")}">`,
          `<input data-field="affiliateCode" value="${escapeHtml(affiliateCode)}">`,
          `${escapeHtml(item.bankName || "-")}<br>${escapeHtml(item.bankAccountNumber || "-")}<br>${escapeHtml(item.bankAccountName || "-")}
            <input type="hidden" data-field="bankName" value="${escapeHtml(item.bankName || "")}">
            <input type="hidden" data-field="bankAccountNumber" value="${escapeHtml(item.bankAccountNumber || "")}">
            <input type="hidden" data-field="bankAccountName" value="${escapeHtml(item.bankAccountName || "")}">`,
          `${formatNumber(views.length)} / ${formatNumber(clicks.length)} / ${formatNumber(leads.length)} / ${formatNumber(sales.length)}`,
          `${formatCurrency(commissionDue)}<input data-field="payoutAmount" type="number" value="${commissionDue}">`,
          selectHtml("status", item.status, ["review", "approved", "active", "rejected", "blocked"]),
          `${actionButton("update-row", item.sourceCollection, item.sourceId, "Simpan")} ${actionButton("approve-affiliate", item.sourceCollection, item.sourceId, "Approve")} ${actionButton("create-payout", item.sourceCollection, item.sourceId, "Buat Payout")}`
        ];
      }));
      table.innerHTML = tableHtml(["Nama", "Email", "Kode", "Rekening", "Views/Clicks/Leads/Sales", "Komisi/Payout", "Status", "Aksi"], rows);
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

async function renderAffiliateDashboard(profile) {
  const profileTarget = document.querySelector("[data-affiliate-profile]");
  const statsTarget = document.querySelector("[data-affiliate-stats]");
  const tableTarget = document.querySelector("[data-affiliate-performance]");
  if (!profileTarget && !statsTarget && !tableTarget) return;

  const affiliateCode = affiliateCodeFromProfile(profile);
  if (profileTarget) {
    profileTarget.innerHTML = `
      <article class="card">
        <div class="card-body">
          <h2>Profil Affiliate</h2>
          <p><strong>${escapeHtml(profile?.name || "-")}</strong></p>
          <p>${escapeHtml(profile?.email || "-")}</p>
          <div class="notice">Kode affiliate: <strong>${escapeHtml(affiliateCode)}</strong></div>
          <div class="notice">Rekening: <strong>${escapeHtml([profile?.bankName, profile?.bankAccountNumber, profile?.bankAccountName].filter(Boolean).join(" - ") || "Belum diisi")}</strong></div>
          <a class="btn primary" href="link-generator.html">${icon("link")}Buat Link Campaign</a>
        </div>
      </article>
    `;
  }

  if (!hasSavedAffiliateCode(profile)) {
    if (statsTarget) {
      statsTarget.innerHTML = `<div class="notice">Simpan kode affiliate unik terlebih dahulu di Link Generator agar dashboard bisa membaca data real.</div>`;
    }
    if (tableTarget) {
      tableTarget.innerHTML = `<div class="notice">Belum ada kode affiliate tersimpan.</div>`;
    }
    hydrateIcons();
    return;
  }

  try {
    const [views, clicks, leads, sales, payouts] = await Promise.all([
      dataApi.byField("views", "affiliateCode", affiliateCode, 100),
      dataApi.byField("clicks", "affiliateCode", affiliateCode, 100),
      dataApi.byField("leads", "affiliateCode", affiliateCode, 100),
      dataApi.byField("sales", "affiliateCode", affiliateCode, 100),
      dataApi.byField("payouts", "email", profile?.email || "", 100)
    ]);
    const salesTotal = sales.reduce((total, sale) => total + Number(sale.amount || 0), 0);
    const paidTotal = payouts
      .filter((payout) => String(payout.status || "").toLowerCase() === "paid")
      .reduce((total, payout) => total + Number(payout.amount || 0), 0);
    const commissionDue = Math.max(0, Math.round(salesTotal * 0.3) - paidTotal);

    if (statsTarget) {
      renderMetricCards(statsTarget, [
        ["Views", formatNumber(views.length)],
        ["Clicks", formatNumber(clicks.length)],
        ["Leads", formatNumber(leads.length)],
        ["Sales", formatNumber(sales.length)],
        ["Komisi Estimasi", formatCurrency(commissionDue)]
      ]);
    }
    if (tableTarget) {
      tableTarget.innerHTML = tableHtml(["Tanggal", "Order ID", "Nominal", "Status"], sales.map((sale) => [
        formatDate(sale.createdAt),
        escapeHtml(sale.orderId || "-"),
        formatCurrency(sale.amount),
        statusBadge(sale.status || "pending")
      ]));
    }
  } catch (error) {
    if (statsTarget) statsTarget.innerHTML = `<div class="notice error">Gagal membaca data affiliate: ${escapeHtml(error.message)}</div>`;
  }
  hydrateIcons();
}

function currentAffiliateTableType() {
  const file = currentFile();
  if (file === "clicks.html") return "clicks";
  if (file === "views.html") return "views";
  if (file === "leads.html") return "leads";
  if (file === "sales.html") return "sales";
  if (file === "commissions.html") return "commissions";
  return "";
}

async function renderAffiliatePageTable(profile) {
  const target = document.querySelector("[data-affiliate-table]");
  if (!target) return;
  const type = target.dataset.affiliateTable || currentAffiliateTableType();
  const affiliateCode = affiliateCodeFromProfile(profile);
  target.innerHTML = `<div class="notice">Memuat data affiliate...</div>`;

  if (!hasSavedAffiliateCode(profile)) {
    target.innerHTML = `<div class="notice">Simpan kode affiliate unik terlebih dahulu di Link Generator agar data real bisa dibaca.</div>`;
    return;
  }

  try {
    if (type === "clicks" || type === "views") {
      const items = await dataApi.byField(type, "affiliateCode", affiliateCode, 100);
      target.innerHTML = tableHtml(["Tanggal", "Campaign", "Page", "Event"], items.map((item) => [
        formatDate(item.createdAt),
        escapeHtml(item.campaign || "-"),
        escapeHtml(item.page || "-"),
        escapeHtml(item.label || item.title || type)
      ]));
      return;
    }

    if (type === "leads") {
      const leads = await dataApi.byField("leads", "affiliateCode", affiliateCode, 100);
      target.innerHTML = tableHtml(["Tanggal", "Nama", "Email", "Campaign", "Minat"], leads.map((lead) => [
        formatDate(lead.createdAt),
        escapeHtml(lead.name || "-"),
        escapeHtml(lead.email || "-"),
        escapeHtml(lead.campaign || "-"),
        escapeHtml(lead.interest || "-")
      ]));
      return;
    }

    if (type === "sales") {
      const sales = await dataApi.byField("sales", "affiliateCode", affiliateCode, 100);
      target.innerHTML = tableHtml(["Tanggal", "Order ID", "Nominal", "Status"], sales.map((sale) => [
        formatDate(sale.createdAt),
        escapeHtml(sale.orderId || "-"),
        formatCurrency(sale.amount),
        statusBadge(sale.status || "pending")
      ]));
      return;
    }

    if (type === "commissions") {
      const [sales, payouts] = await Promise.all([
        dataApi.byField("sales", "affiliateCode", affiliateCode, 100),
        dataApi.byField("payouts", "email", profile?.email || "", 100)
      ]);
      const salesTotal = sales.reduce((total, sale) => total + Number(sale.amount || 0), 0);
      const paidTotal = payouts
        .filter((payout) => String(payout.status || "").toLowerCase() === "paid")
        .reduce((total, payout) => total + Number(payout.amount || 0), 0);
      const pendingTotal = payouts
        .filter((payout) => String(payout.status || "").toLowerCase() === "pending")
        .reduce((total, payout) => total + Number(payout.amount || 0), 0);
      const commissionTotal = Math.round(salesTotal * 0.3);
      target.innerHTML = tableHtml(["Keterangan", "Nominal", "Status"], [
        ["Total Sales", formatCurrency(salesTotal), statusBadge("active")],
        ["Estimasi Komisi 30%", formatCurrency(commissionTotal), statusBadge("active")],
        ["Payout Pending", formatCurrency(pendingTotal), statusBadge("pending")],
        ["Sudah Terbayar", formatCurrency(paidTotal), statusBadge("paid")],
        ["Sisa Komisi", formatCurrency(Math.max(0, commissionTotal - paidTotal)), statusBadge("pending")]
      ]);
    }
  } catch (error) {
    target.innerHTML = `<div class="notice error">Gagal memuat data affiliate: ${escapeHtml(error.message)}</div>`;
  }
}

function bindLinkGenerator() {
  const form = document.querySelector("[data-link-generator]");
  if (!form) return;
  let currentUser = null;
  authApi.watch((user) => {
    currentUser = user;
    if (!user) return;
    authApi.profile(user.uid).then((profile) => {
      const codeInput = form.querySelector('[name="code"]');
      if (codeInput && !codeInput.value) codeInput.value = affiliateCodeFromProfile(profile);
      ["bankName", "bankAccountNumber", "bankAccountName"].forEach((field) => {
        const input = form.querySelector(`[name="${field}"]`);
        if (input && !input.value) input.value = profile?.[field] || "";
      });
    });
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const url = new URL(data.get("target") || `${location.origin}${base}salespage.html`, location.href);
    url.searchParams.set("ref", data.get("code"));
    if (data.get("campaign")) url.searchParams.set("campaign", data.get("campaign"));
    document.querySelector("[data-generated-link]").value = url.toString();
    if (form.querySelector('[name="saveCode"]')?.checked && currentUser) {
      await dataApi.update("members", currentUser.uid, {
        affiliateCode: data.get("code"),
        bankName: data.get("bankName") || "",
        bankAccountNumber: data.get("bankAccountNumber") || "",
        bankAccountName: data.get("bankAccountName") || "",
        updatedAt: new Date().toISOString()
      });
    }
  });
}

function bindNewsletterAdmin() {
  const form = document.querySelector("[data-admin-newsletter]");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const recipientCount = await dataApi.count(data.targetCollection || "newsletter");
    await dataApi.track("newsletterBroadcasts", {
      ...data,
      recipientCount,
      status: "queued"
    });
    form.reset();
    const status = document.querySelector("[data-form-status]");
    status.className = "notice success";
    status.textContent = `Broadcast disimpan untuk ${formatNumber(recipientCount)} target. Untuk kirim email otomatis, sambungkan Cloud Function/email service.`;
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

function bindMemberAdmin() {
  const form = document.querySelector("[data-admin-member-form]");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const status = form.querySelector("[data-form-status]");
    try {
      await dataApi.createMember(data);
      form.reset();
      if (status) {
        status.className = "notice success";
        status.textContent = "Member manual berhasil ditambahkan ke Firestore. Untuk login, user tetap perlu register via halaman daftar.";
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

function collectRowPayload(row) {
  const payload = {};
  row.querySelectorAll("[data-field]").forEach((field) => {
    payload[field.dataset.field] = field.value;
  });
  return payload;
}

function showActionStatus(message, type = "success") {
  let status = document.querySelector("[data-admin-action-status]");
  if (!status) {
    status = document.createElement("div");
    status.dataset.adminActionStatus = "";
    const content = document.querySelector(".content");
    content?.prepend(status);
  }
  status.className = `notice ${type}`;
  status.textContent = message;
}

function bindAdminActions() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-admin-action]");
    if (!button) return;
    const row = button.closest("tr");
    const action = button.dataset.adminAction;
    const collectionName = button.dataset.collection;
    const id = button.dataset.id;
    const payload = collectRowPayload(row || document);

    try {
      if (action === "approve-affiliate") {
        payload.status = "approved";
      }
      if (action === "reply-ticket") {
        payload.status = "answered";
        payload.repliedAt = new Date().toISOString();
        await dataApi.track("supportReplies", {
          ticketId: id,
          reply: payload.reply,
          status: payload.status
        });
      }
      payload.updatedAt = new Date().toISOString();
      await dataApi.update(collectionName, id, payload);
      if (collectionName === "orders" && payload.status === "paid" && payload.email) {
        const members = await dataApi.byField("members", "email", payload.email, 1);
        if (members[0]) {
          await dataApi.update("members", members[0].id, {
            status: "active",
            plan: payload.plan || members[0].plan || "starter",
            updatedAt: new Date().toISOString()
          });
        }
      }
      if ((collectionName === "affiliateApplications" || collectionName === "members") && payload.status === "approved" && payload.email) {
        const members = await dataApi.byField("members", "email", payload.email, 1);
        if (members[0]) {
          await dataApi.update("members", members[0].id, {
            role: "affiliate",
            status: "active",
            affiliateCode: payload.affiliateCode || members[0].affiliateCode || "",
            bankName: payload.bankName || members[0].bankName || "",
            bankAccountNumber: payload.bankAccountNumber || members[0].bankAccountNumber || "",
            bankAccountName: payload.bankAccountName || members[0].bankAccountName || "",
            updatedAt: new Date().toISOString()
          });
        } else {
          await dataApi.createMember({
            name: payload.name || payload.email,
            email: payload.email,
            affiliateCode: payload.affiliateCode || "",
            bankName: payload.bankName || "",
            bankAccountNumber: payload.bankAccountNumber || "",
            bankAccountName: payload.bankAccountName || "",
            role: "affiliate",
            status: "active",
            plan: "starter"
          });
        }
      }
      if (action === "create-payout") {
        const amount = Number(payload.payoutAmount || 0);
        if (!amount) throw new Error("Nominal payout harus lebih dari 0.");
        await dataApi.createPayout({
          affiliateApplicationId: id,
          affiliateCode: payload.affiliateCode,
          email: payload.email,
          name: payload.name,
          bankName: payload.bankName || "",
          bankAccountNumber: payload.bankAccountNumber || "",
          bankAccountName: payload.bankAccountName || "",
          amount,
          status: "pending"
        });
      }
      showActionStatus("Data berhasil diperbarui.");
      await renderTable();
      await renderStats();
    } catch (error) {
      showActionStatus(error.message, "error");
    }
  });
}

async function renderProductGallery() {
  const target = document.querySelector("[data-product-gallery]");
  if (!target) return;
  target.innerHTML = `<div class="notice">Memuat produk...</div>`;
  try {
    const products = await dataApi.latest("products", 50);
    const activeProducts = products.filter((product) => product.status !== "archived");
    if (!activeProducts.length) {
      target.innerHTML = `<div class="notice">Belum ada produk aktif. Tambahkan produk dari Admin > Products.</div>`;
      return;
    }
    target.innerHTML = activeProducts.map((product) => {
      const checkout = `${base}direct-link-forms/checkout.html?plan=${encodeURIComponent(product.plan || product.slug || product.id)}&amount=${encodeURIComponent(product.price || 0)}`;
      return `
        <article class="card">
          <div class="card-body">
            <h3>${escapeHtml(product.name || "Produk")}</h3>
            <p>${escapeHtml(product.description || `Akses ${product.accessLevel || "starter"}`)}</p>
            <p><strong>${formatCurrency(product.price)}</strong></p>
            <div class="actions">
              ${product.downloadUrl ? `<a class="btn" href="${escapeHtml(product.downloadUrl)}" target="_blank" rel="noopener">${icon("download")}Download</a>` : ""}
              <a class="btn primary" href="${checkout}">${icon("shopping-cart")}Checkout</a>
            </div>
          </div>
        </article>
      `;
    }).join("");
    hydrateIcons();
  } catch (error) {
    target.innerHTML = `<div class="notice error">Gagal memuat produk: ${escapeHtml(error.message)}</div>`;
  }
}

async function renderAffiliatePayouts(profile) {
  const target = document.querySelector("[data-affiliate-payouts]");
  if (!target) return;
  const affiliateCode = affiliateCodeFromProfile(profile);
  target.innerHTML = `<div class="notice">Memuat payout...</div>`;
  if (!hasSavedAffiliateCode(profile)) {
    target.innerHTML = `<div class="notice">Simpan kode affiliate unik terlebih dahulu di Link Generator.</div>`;
    return;
  }
  try {
    const payouts = await dataApi.byField("payouts", "email", profile?.email || "", 50);
    target.innerHTML = tableHtml(["Tanggal", "Rekening", "Nominal", "Status"], payouts.map((payout) => [
      formatDate(payout.createdAt),
      escapeHtml([payout.bankName, payout.bankAccountNumber, payout.bankAccountName].filter(Boolean).join(" - ") || "-"),
      formatCurrency(payout.amount),
      statusBadge(payout.status || "pending")
    ]));
  } catch (error) {
    target.innerHTML = `<div class="notice error">Gagal memuat payout: ${escapeHtml(error.message)}</div>`;
  }
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
  bindMemberAdmin();
  bindAdminActions();
  hydrateIcons();
  trackView();
});
