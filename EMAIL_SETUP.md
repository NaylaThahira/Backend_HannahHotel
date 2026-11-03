# Email formulir kontak

Tujuan pesan: `hannahotelsyariah@gmail.com`.
Email pengunjung menjadi `Reply-To`; pengirim SMTP adalah akun hotel.

Tambahkan konfigurasi berikut ke `.env` backend (file ini diabaikan Git):

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=hannahotelsyariah@gmail.com
SMTP_PASS=
```

Isi `SMTP_PASS` dengan App Password akun Gmail, bukan password login biasa.
Buat melalui pengaturan akun Google setelah mengaktifkan Verifikasi 2 Langkah:
https://support.google.com/accounts/answer/185833
Jangan membagikan password melalui chat atau memasukkannya ke frontend.
Restart backend setelah konfigurasi disimpan.

Uji formulir dengan alamat email Anda. Pesan berhasil hanya ditampilkan setelah SMTP menerima pesan; periksa inbox/spam hotel untuk memastikan penerimaan akhir. Pengiriman gagal mempertahankan isian pengunjung.

Formulir harus memiliki minimal satu field Email. Jika ada beberapa, email pertama dipakai sebagai alamat balasan. Maksimal 5 percobaan per alamat IP dalam 10 menit, per proses server.
