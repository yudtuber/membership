export const firebaseConfig = {
  apiKey: "AIzaSyCdaVyfERO3QRqFSUpI3YMuUJT0erlFa20E",
  authDomain: "membership-78d72.firebaseapp.com",
  projectId: "membership-78d72",
  storageBucket: "membership-78d72.firebasestorage.app",
  messagingSenderId: "190965757363",
  appId: "1:190965757363",
  measurementId: "G-0Y2KSVNG11"
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
