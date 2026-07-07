import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const authApi = {
  watch(callback) {
    return onAuthStateChanged(auth, callback);
  },
  async register({ name, email, password, affiliateCode = "" }) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    await setDoc(doc(db, "members", credential.user.uid), {
      uid: credential.user.uid,
      name,
      email,
      role: "member",
      status: "trial",
      plan: "starter",
      affiliateCode,
      createdAt: serverTimestamp()
    });
    return credential.user;
  },
  login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  },
  reset(email) {
    return sendPasswordResetEmail(auth, email);
  },
  logout() {
    return signOut(auth);
  },
  async profile(uid) {
    const snap = await getDoc(doc(db, "members", uid));
    return snap.exists() ? snap.data() : null;
  }
};

export const dataApi = {
  createLead(payload) {
    return addDoc(collection(db, "leads"), {
      ...payload,
      createdAt: serverTimestamp()
    });
  },
  subscribe(payload) {
    return addDoc(collection(db, "newsletter"), {
      ...payload,
      createdAt: serverTimestamp()
    });
  },
  createTicket(payload) {
    return addDoc(collection(db, "supportTickets"), {
      ...payload,
      status: "open",
      createdAt: serverTimestamp()
    });
  },
  createOrder(payload) {
    return addDoc(collection(db, "orders"), {
      ...payload,
      status: "pending",
      createdAt: serverTimestamp()
    });
  },
  createProduct(payload) {
    return addDoc(collection(db, "products"), {
      ...payload,
      price: Number(payload.price || 0),
      status: payload.status || "active",
      createdAt: serverTimestamp()
    });
  },
  createMember(payload) {
    return addDoc(collection(db, "members"), {
      ...payload,
      role: payload.role || "member",
      status: payload.status || "active",
      plan: payload.plan || "starter",
      createdAt: serverTimestamp()
    });
  },
  createPayout(payload) {
    return addDoc(collection(db, "payouts"), {
      ...payload,
      amount: Number(payload.amount || 0),
      status: payload.status || "pending",
      createdAt: serverTimestamp()
    });
  },
  track(collectionName, payload) {
    return addDoc(collection(db, collectionName), {
      ...payload,
      createdAt: serverTimestamp()
    });
  },
  async latest(collectionName, size = 10) {
    const q = query(collection(db, collectionName), orderBy("createdAt", "desc"), limit(size));
    const snap = await getDocs(q);
    return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  },
  async count(collectionName) {
    const snap = await getCountFromServer(collection(db, collectionName));
    return snap.data().count;
  },
  async byField(collectionName, field, value, size = 20) {
    const q = query(collection(db, collectionName), where(field, "==", value), limit(size));
    const snap = await getDocs(q);
    return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  },
  update(collectionName, id, payload) {
    return updateDoc(doc(db, collectionName, id), payload);
  },
  fileUrl(path) {
    return getDownloadURL(ref(storage, path));
  }
};
