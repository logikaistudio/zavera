# Panduan Singkat: Fitur Jadwal (Schedule per Slot)

Lokasi UI:
- Menu: `📅 Jadwal` → [http://localhost:5174/scheduling](http://localhost:5174/scheduling)

Ringkasan fitur:
- Tabel jadwal menampilkan semua terapis per baris dan slot 30 menit dari 09:00–20:30 per kolom.
- Supervisor Mode: beri tanda centang "Supervisor" di atas pemilih tanggal untuk mengaktifkan kontrol supervisor.

Kontrol penting:
- Supervisor dapat mengubah status terapis per hari: `On Duty`, `In Service`, `Off Duty`.
- Dari daftar booking, supervisor dapat:
  - `▶️ Mulai Service` — menandai booking `in-service` dan memulai penghitung sisa waktu.
  - `⏹️ Selesai Service` — menyelesaikan booking (status `completed`).
  - `🖨️ Cetak` — mencetak nota jika booking sudah `completed`.
  - `Hapus` — menghapus booking.

Penjelasan visual:
- Legend di atas tabel menunjukkan warna untuk: On Duty (biru), Service (amber), Completed (hijau), Off Duty (merah).
- Setiap sel menampilkan sebuah dot berwarna + singkatan (On / Svc / Done / Off). Arahkan kursor untuk melihat tooltip status lengkap.

Data & Persistensi:
- Status terapis dan bookings disimpan di state aplikasi (context) dan disinkronkan ke `localStorage`.
- Perubahan bersifat lokal pada mesin ini (belum ada autentikasi/otorisasi server-side).

Catatan pengembangan singkat:
- File yang relevan:
  - `src/pages/Scheduling.jsx` — tampilan tabel, logic slot, supervisor UI
  - `src/context/AppContext.jsx` — state global: bookings, therapistStatuses, API start/finish service

Langkah berikut yang direkomendasikan:
- Tambahkan legend warna yang lebih jelas pada UI mobile.
- Batasi akses supervisor dengan autentikasi/role.
- Tambah export CSV/PDF untuk jadwal harian.

Jika ingin, saya bisa: menambah style responsif, menambahkan fitur export, atau menambahkan otorisasi supervisor. Pilih salah satu untuk saya lanjutkan.
