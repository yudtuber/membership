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

    if (tableType === "affiliates") {
      const applications = await dataApi.latest("affiliateApplications", 50);
      table.innerHTML = tableHtml(["Nama", "Email", "Channel", "Tanggal", "Status", "Aksi"], applications.map((item) => [
        `${escapeHtml(item.name || "-")}<input type="hidden" data-field="name" value="${escapeHtml(item.name || "")}">`,
        `${escapeHtml(item.email || "-")}<input type="hidden" data-field="email" value="${escapeHtml(item.email || "")}">`,
        escapeHtml(item.channel || "-"),
        formatDate(item.createdAt),
        selectHtml("status", item.status, ["review", "approved", "rejected", "blocked"]),
        `${actionButton("update-row", "affiliateApplications", item.id, "Simpan")} ${actionButton("approve-affiliate", "affiliateApplications", item.id, "Approve")}`
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
        payload.status = payload.status || "answered";
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
      if (collectionName === "affiliateApplications" && payload.status === "approved" && payload.email) {
        const members = await dataApi.byField("members", "email", payload.email, 1);
        if (members[0]) {
          await dataApi.update("members", members[0].id, {
            role: "affiliate",
            status: "active",
            updatedAt: new Date().toISOString()
          });
        } else {
          await dataApi.createMember({
            name: payload.name || payload.email,
            email: payload.email,
            role: "affiliate",
            status: "active",
            plan: "starter"
          });
        }
      }
      showActionStatus("Data berhasil diperbarui.");
      await renderTable();
      await renderStats();
    } catch (error) {
      showActionStatus(error.message, "error");
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
  bindMemberAdmin();
  bindAdminActions();
  hydrateIcons();
  trackView();
});
