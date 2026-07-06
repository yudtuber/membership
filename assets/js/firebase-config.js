export const firebaseConfig = {
  apiKey: "ISI_API_KEY_FIREBASE",
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId: "ISI_APP_ID"
};

export const appSettings = {
  siteName: "MembershipPro",
  currency: "IDR",
  manualTransfer: {
    bank: "BCA",
    accountName: "PT Contoh Membership",
    accountNumber: "1234567890"
  },
  paymentGateways: {
    midtrans: {
      enabled: false,
      publicClientKey: "ISI_CLIENT_KEY_MIDTRANS"
    },
    tripay: {
      enabled: false,
      merchantCode: "ISI_MERCHANT_CODE_TRIPAY"
    },
    xendit: {
      enabled: false,
      publicKey: "ISI_PUBLIC_KEY_XENDIT"
    }
  }
};
