import { authApi } from "./firebase-service.js";

function status(message, type = "success") {
  const target = document.querySelector("[data-form-status]");
  if (!target) return;
  target.className = `notice ${type}`;
  target.textContent = message;
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!form.matches("[data-auth-form]")) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const mode = form.dataset.authForm;

  try {
    if (mode === "register") {
      await authApi.register(data);
      location.href = "../member-area/dashboard.html";
    }
    if (mode === "login") {
      await authApi.login(data.email, data.password);
      location.href = "../member-area/dashboard.html";
    }
    if (mode === "forgot") {
      await authApi.reset(data.email);
      status("Link reset password sudah dikirim ke email.");
    }
  } catch (error) {
    status(error.message, "error");
  }
});
