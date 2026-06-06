# Supabase Setup & Migration Guide

## Quick Start

### 1. Environment Variables

Buat file `.env.local` di root project dengan credentials Supabase:

```env
VITE_SUPABASE_URL=https://db.pwcxuwvpzozwpbixvbpe.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_DB_PASSWORD=your_db_password
```

**⚠️ IMPORTANT**: 
- `.env.local` is gitignored - credentials tidak akan di-push ke GitHub
- Jangan share file ini ke public
- Setelah setup, rotate password Supabase

### 2. Database Setup

1. Login ke [Supabase Console](https://app.supabase.com)
2. Pilih project Zavera
3. Buka **SQL Editor**
4. Copy-paste isi file `supabase_setup.sql` ke SQL editor
5. Klik **Run** untuk membuat tables

### 3. Data Migration

Aplikasi akan otomatis menampilkan modal migrasi saat pertama kali dimuat:
- Modal akan meminta konfirmasi untuk migrasi data
- Tekan "✓ Lanjutkan" untuk memulai
- Semua data akan dipindahkan dari localStorage ke Supabase

**Backup**: Semua data tetap tersimpan di localStorage sebagai fallback offline.

### 4. Verification

Cek di Supabase SQL Editor:
```sql
SELECT data_key, COUNT(*) as rows FROM zavera_data GROUP BY data_key;
```

## Data Structure

Semua data disimpan dalam satu table `zavera_data` dengan struktur:

| Field | Type | Deskripsi |
|-------|------|-----------|
| id | BIGSERIAL | Primary key |
| user_id | TEXT | User identifier (default: 'default-user') |
| data_key | TEXT | Kunci data (branches, services, bookings, dll) |
| data | JSONB | Data dalam format JSON |
| created_at | TIMESTAMP | Waktu dibuat |
| updated_at | TIMESTAMP | Waktu terakhir update |

**Data Keys:**
- `branches` - Daftar cabang SPA
- `selectedBranch` - Cabang yang sedang dipilih
- `services` - Layanan SPA
- `therapists` - Daftar terapis
- `bookings` - Booking/reservasi
- `inventory` - Inventory barang
- `therapistStatuses` - Status terapis per tanggal
- `slotStatuses` - Status slot jam kerja
- `selectedSlots` - Slot yang dipilih
- `manualCompletedMinutes` - Menit yang diselesaikan manual
- `rekaps` - Data rekap harian
- `pembukuan` - Pembukuan/akuntansi
- `expenses` - Pengeluaran

## Offline Mode

App bekerja secara offline dengan fallback ke localStorage:
1. **Online**: Data otomatis sync ke Supabase
2. **Offline**: Data disimpan di localStorage
3. **Reconnect**: Data otomatis sinkron saat kembali online

## Troubleshooting

### Migration tidak jalan
```javascript
// Di browser console:
localStorage.removeItem('zavera_migration_done');
localStorage.removeItem('zavera_migration_skip');
// Reload page
```

### Cek status Supabase
```javascript
// Di browser console:
import { isSupabaseEnabled } from './utils/supabaseClient';
console.log('Supabase enabled:', isSupabaseEnabled());
```

### View migration logs
```javascript
// Di browser console:
localStorage.getItem('zavera_migration_done')
localStorage.getItem('zavera_migration_skip')
```

## Security

- Credentials disimpan di `.env.local` (gitignored)
- Jangan expose VITE_SUPABASE_ANON_KEY di public
- Gunakan Supabase Row Level Security untuk multi-user di production
- Rotate password database secara berkala

## Next Steps

- [ ] Setup OAuth (Google, GitHub) untuk multi-user
- [ ] Implement Supabase Row Level Security (RLS) policies
- [ ] Add real-time subscriptions untuk live updates
- [ ] Setup automated backups
