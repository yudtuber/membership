import { dataApi } from "./firebase-service.js";

const params = new URLSearchParams(window.location.search);
const refCode = params.get("ref") || localStorage.getItem("affiliateRef") || "";
const campaign = params.get("utm_campaign") || params.get("campaign") || "";

if (refCode) {
  localStorage.setItem("affiliateRef", refCode);
}

export function trackingPayload(extra = {}) {
  return {
    affiliateCode: refCode,
    campaign,
    page: window.location.pathname,
    title: document.title,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    ...extra
  };
}

export async function trackView(extra = {}) {
  try {
    await dataApi.track("views", trackingPayload(extra));
  } catch (error) {
    console.warn("View tracking skipped:", error.message);
  }
}

export async function trackClick(label, extra = {}) {
  try {
    await dataApi.track("clicks", trackingPayload({ label, ...extra }));
  } catch (error) {
    console.warn("Click tracking skipped:", error.message);
  }
}

export async function trackSale(order) {
  try {
    await dataApi.track("sales", trackingPayload(order));
  } catch (error) {
    console.warn("Sale tracking skipped:", error.message);
  }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-track-click]");
  if (!target) return;
  trackClick(target.dataset.trackClick || target.textContent.trim());
});
