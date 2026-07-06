# Setup MembershipPro

1. Buat Firebase Project.
2. Aktifkan Authentication dengan Email/Password.
3. Buat Firestore Database mode production.
4. Aktifkan Firebase Storage.
5. Salin konfigurasi web app Firebase ke `assets/js/firebase-config.js`.
6. Upload `firebase/firestore.rules` dan `firebase/storage.rules` ke Firebase Console.
7. Push seluruh folder ini ke GitHub repository.
8. Aktifkan GitHub Pages dari branch utama.

## Payment

Midtrans, Tripay, dan Xendit membutuhkan secret key. Jangan pernah menaruh secret key di JavaScript frontend. Untuk production, buat backend kecil memakai Firebase Cloud Functions, Cloud Run, atau server lain untuk membuat invoice/payment token dan menerima webhook.

Manual transfer sudah bisa berjalan dari frontend karena hanya membuat order pending di Firestore.

## Koleksi Firestore

- `members`
- `orders`
- `leads`
- `newsletter`
- `supportTickets`
- `views`
- `clicks`
- `sales`
- `affiliateApplications`
- `newsletterBroadcasts`
