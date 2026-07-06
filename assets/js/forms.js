import { dataApi } from "./firebase-service.js";
import { createCheckout } from "./payments.js";

function setStatus(form, message, type = "success") {
  const target = form.querySelector("[data-form-status]");
  if (!target) return;
  target.className = `notice ${type}`;
  target.textContent = message;
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!form.matches("[data-public-form]")) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const type = form.dataset.publicForm;

  try {
    if (type === "lead") await dataApi.createLead(data);
    if (type === "newsletter") await dataApi.subscribe(data);
    if (type === "support") await dataApi.createTicket(data);
    if (type === "affiliate-register") {
      await dataApi.track("affiliateApplications", { ...data, status: "review" });
    }
    if (type === "checkout") {
      const result = await createCheckout({
        ...data,
        amount: Number(data.amount || 0)
      });
      setStatus(form, `${result.message} Order ID: ${result.orderId}`);
      form.reset();
      return;
    }
    form.reset();
    setStatus(form, "Data berhasil dikirim.");
  } catch (error) {
    setStatus(form, error.message, "error");
  }
});
