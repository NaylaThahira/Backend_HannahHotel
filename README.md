# Backend Hannah Hotel

## Menyiapkan database

1. Pastikan layanan PostgreSQL aktif dan database yang tercantum pada file `.env` sudah dibuat.
2. Instal dependensi:

   ```powershell
   npm install
   ```

3. Buat seluruh tabel dari migration:

   ```powershell
   npm run db:migrate
   ```

4. Masukkan data awal (admin, kamar, pengaturan, dan galeri):

   ```powershell
   npm run db:seed
   ```

5. Jalankan API:

   ```powershell
   npm run dev
   ```

Periksa koneksi pada `http://localhost:5000/api/health`.

## Admin Painan dan Padang

Jalankan `npm run db:migrate` untuk menambahkan lokasi tanpa menghapus data lama. Seluruh kamar lama menjadi milik Painan. Email admin lama berubah menjadi `admin@hannahhotelpainan.com`; akun `admin@hannahhotelpadang.com` memakai password lama yang sama. Pada database baru, jalankan migration lalu seed; password awal keduanya `admin123`.

Jalankan dua terminal:

```powershell
# API Painan dan API publik: port 5000
npm run dev
```

```powershell
# API khusus Padang: port 5001
npm run dev:padang
```

Panel tersedia di `http://localhost:3000/adminPainan` dan `http://localhost:3000/adminPadang`. URL `/admin` mengarah ke `/adminPainan`. Keduanya memakai database dan penyimpanan gambar yang sama, dengan kamar dipisahkan berdasarkan lokasi akun. Server selalu menetapkan lokasi dan pencatat input; admin tidak dapat mengubah atau menghapus kamar lokasi lain. Sesi tiap lokasi memakai cookie terpisah.

Admin Padang saat ini memiliki Dashboard dan Manajemen Kamar. Admin Painan tetap memiliki seluruh menu yang sudah ada. Subtitle kamar Padang disimpan terpisah. Menu publik Kamar menawarkan `/rooms/padang` dan `/rooms/painan`; `/rooms` menampilkan kedua kelompok. Maksimal dua kamar pilihan per lokasi dapat tampil di beranda.

Dengan PostgreSQL, kedua API, dan frontend aktif, jalankan `npm run test:locations` untuk memeriksa akun, login, pemisahan kamar, CRUD, dan route admin. Data kamar sementara dibersihkan setelah pengujian.

## Perintah database

| Perintah | Fungsi |
| --- | --- |
| `npm run db:status` | Menampilkan status migration. |
| `npm run db:migrate` | Menjalankan migration yang belum diterapkan. |
| `npm run db:migrate:undo` | Membatalkan satu migration terakhir. |
| `npm run db:migrate:undo:all` | Membatalkan seluruh migration. |
| `npm run db:seed` | Menjalankan seluruh seed data. |
| `npm run db:seed:undo` | Membatalkan seed terakhir. |
| `npm run db:seed:undo:all` | Membatalkan seluruh seed data. |
| `npm run db:reset` | Menghapus seed dan tabel, kemudian membuat serta mengisi ulang database. |

`db:reset` menghapus semua data pada database pengembangan. Jangan jalankan perintah tersebut pada database produksi.
