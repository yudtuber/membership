import { appSettings } from "./firebase-config.js";
import { dataApi } from "./firebase-service.js";
import { trackSale } from "./tracking.js";

export async function createCheckout(payload) {
  const order = {
    ...payload,
    gateway: payload.gateway || "manual",
    affiliateCode: localStorage.getItem("affiliateRef") || "",
    currency: appSettings.currency
  };

  const orderRef = await dataApi.createOrder(order);
  await trackSale({ orderId: orderRef.id, amount: order.amount, status: "pending" });

  if (order.gateway === "manual") {
    return {
      type: "manual",
      orderId: orderRef.id,
      message: `Transfer ke ${appSettings.manualTransfer.bank} ${appSettings.manualTransfer.accountNumber} a.n. ${appSettings.manualTransfer.accountName}.`
    };
  }

  return {
    type: "gateway",
    orderId: orderRef.id,
    message: "Checkout gateway membutuhkan endpoint backend/Cloud Function agar secret key tidak bocor di browser."
  };
}
