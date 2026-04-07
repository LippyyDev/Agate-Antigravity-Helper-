<p align="center">
  <img src="docs/assets/logo.png" alt="AGATE (Antigravity Helper)" width="128" height="128" />
</p>

# AGATE (Antigravity Helper)

<p>
  <strong>Aplikasi Manajemen Multi-Akun Profesional dan Lapisan Proxy Lokal untuk Google Gemini & Claude AI.</strong><br>
  <em><a href="README.md">Read in English</a></em>
</p>

<p>
  <img src="https://img.shields.io/badge/Electron-191970?style=flat-square&logo=Electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
</p>

---

## Abstrak

Ketika mengintegrasikan model AI canggih ke dalam proses deployment atau beban kerja berat, para *engineer* sering kali menghadapi berbagai kendala yang signifikan: batas kuota satu akun yang cepat habis, manajemen sesi gabungan yang membingungkan, kurangnya visibilitas terhadap pemakaian batas akses (rate limits), serta lingkungan pengujian yang sulit disatukan. 

**AGATE (Antigravity Helper)** dibangun secara khusus untuk mengatasi semua hambatan (bottlenecks) tersebut. Diluncurkan sebagai lingkungan desktop Electron yang aman dan terpadu, AGATE berfungsi sebagai antarmuka proxy yang kuat—menyatukan manajemen sesi serta memastikan ketersediaan tinggi (high-availability) operasi bagi integrasi AI Anda.

---

## Arsitektur Inti

- **Kebebasan Jumlah Identitas (Infinite Identity Pooling):** Siapkan dan susun akun Google Gemini maupun Claude Anda tanpa batasan kuota.
- **Penyeimbangan Beban Kerja Cerdas (Intelligent Workload Balancing):** Proxy lokal secara dinamis dapat mengevaluasi batas API dan ambang sisa kuota, lalu langsung berpindah secara otomatis (*failover*) ke akun cadangan tanpa pernah menghentikan alur kerja operasi Anda.
- **Telemetri & Diagnostik Langsung:** Tingkatkan pantauan tentang pemakaian metrik yang jelas, melihat status sesi yang sehat dari akun Anda langsung menggunakan satu *dashboard* antarmuka visual.
- **Server Skala Lokal Sesuai Standar OpenAPI:** Anda bisa langsung mem-boot akses pengujian di lingkungan *sandbox proxy* independen yang menerapkan standar spesifikasi native terminal REST layaknya OpenAI format dan Anthropic.
- **Keamanan Skala Enterprise:** Kunci token rahasia pengguna aman terjaga dan dilapisi secara kriptografi enkripsi berlapis `AES-256-GCM`, dan disinkronkan aman lewat kapabilitas infrastruktur sandi bawah sadar bawaan Sistem Operasi Windows maupun MacOS.

---

## Fitur Teknis Utama

### Manajemen Identitas Cloud (Cloud Identity Handling)
- Preservasi akses sesi yang dapat disingkat untuk identitas tanpa batas profil akses Gemini & Claude.
- Detil catatan riwayat, data metadata aktivitas terdahulu, status informasi pengguna.
- Sistem monitoring pemulihan token pintar: Status Active, Rate Limited, maupun Expired dilacak *Real-Time*.

### Dashboard Pusat Analisa Diagnostik
- Pengecekan riwayat jejak logibilitas kompatibilitas model fundamental (Ct: `gemini-pro`, `claude-3-5-sonnet`).
- Lacak persentase perkembangan kepadatan pemakaian akses server kuota visualisasi data-padat langsung dari Dashboard.
- Dukungan pengecekan asinkronus periodik secara terjadwal otomatis mapun metode pembaruan *manual status polling*.

### Sistem Routing Otomatis Pintar
- Aktivasikan fitur **Unlimited Pool Mode** (Akses Tanpa-Batas) otomatis untuk meringankan distribusi pemakaian *requests* jaringan API Anda dan alirkan sisa tenaganya ke akun tak termanfaatkan (hibernasi/cadangan). 
- *Autodirect Logika Pengoperasian* akan langsung memigrasikan permintaan (*redirect*) apabila sebuah token aktif menyusut persentase saldonya menyentuh bawah tingkat _5%_ sisa baseline.
- Mode pengaturan *Loop Kesehatan* (Health-check) fleksibel dapat dilakukan berjalan hening pada *background task*.

### Proxy Lokal untuk Server Pengembang (Development Proxy)
- Menjalankan koneksivitas bypass server _intercept proxy_ independen (Mencocokkan gaya infrastruktur OpenAI/Anthropic REST API).
- Memberi fasilitas kontrol pengaturan panjang jeda putus koneksi interupsi, letak spesifik *ports*, maupun substitusi penukaran model (sebagai contoh Anda ingin sistem merubah struktur *request* Anthropic Claude ke mode struktur format API perantara Gemini).

### Ekspor & Pengaturan Backup Ruang Simpan Momen
- Kemudahan pemindahan arsitektur seluruh rancangan data sistem dan file konfigurasi *setting profile machine rosters* lengkap.
- Kemampuan untuk me-*restore* (pembaruan) langsung ke pengaturan lampau lintas infrastruktur operasional secara instan.

### Fondasi Ketahanan Kriptografi Sandi (Cryptographic Foundation)
- Menyatu padu langsung sebagai penghubung dengan standar sistem _Credential Password_ hardware OS mutlak (*macOS Keychain, Windows Credential Manager*).
- Formulasi _AES-256-GCM payloads_ paling kaku diterapkan pada basis *database* sensitif.

---

## Intalasi & Deployment Kompilasi

### Penggunaan Rilis Mandiri Langsung (Distribusi Cepat)
Moda peluncuran berkas jadi atau program aplikasi jadi dapat langsung di unduh bagi pengguna publik umum di navigasi kolom *Releases* GitHub.

| Target Platform       | Kebutuhan Unduhan Aplikasi |
|-----------------------|------------------------------|
| **Windows** (x86_64/ARM64) | Standalone Executable (.exe) |
| **macOS**             | Application Image (.dmg)     |
| **Linux**             | Package (.deb / .rpm)        |

### Mengkompilasi Langsung Dari Source Code
Jika Anda berkeinginan men-*debug* modifikasi mandiri atau membongkar inti _source_. Perhatikan AGATE membutuhkan komponen `Node.js v18+` minimal.

```bash
# Mulai clone menuju lokasi direktori repositori
cd AntigravityManager

# Persiapkan semua library modul NPM terkait dependensi framework
npm install

# Akses proses masuk ke lingkungan pengembang percobaan
npm start

# Mulailah membangun bungkusan modul Installer Distribusi sistem (Windows / dll)
npm run make
```

---

## Referensi Perintah Cepat

```bash
npm start           # Booting sistem development pengawas langsung (watch-mode)
npm run lint        # Analitik koding otomatis untuk verifikasi pedoman (ESLint)
npm run format:write# Menerapkan kesesuaian format styling rapi koding asli (Prettier)
npm run test:unit   # Proses jalan testing vitest fungsional terarah target
npm run test:e2e    # Test browser playwright browser antarmuka navigasi
npm run type-check  # Modul pembuktian tipe spesifikasi valid typescript schemas.
npm run make        # Penargetan ekstrasi hasil file package binary ekseptional (.exe dsb.)
```

---

## Dukungan Troubleshooting Basis (Operasional)

### Aplikasi Macet & Gagal Masuk Saat di Boot
Seringkali indikasi _module-mismatch failure_ adalah murni disebabkan kesalahan struktur package di OS lingkungan terkompilasi Anda. Silahkan hapus folder `node_modules` seluruhnya. Coba ketik `npm install` kembali. Selalu cek jika pada Windows ada bayangan tugas (Proses *zombies Electron*) yang berjalan asinkronus menyumbat memori.

### Kerusakan Otentikasi Simpanan Sistem (Auth Failures)
Seringkali permasalahan ini bersumber karena kegagalan _Cryptographic Bindings_ antar integrasi. Periksa koneksi *host internet*, lakukan opsi penghapusan *cache memory purge* lewat *Dashboard* UI. Tanda _Error HTTP 401s_ gigih memberikan implikasi jelas bahwa provider awan murni memblokir interaksi token pengguna terkait.

### Pemblokiran Limit Akses pada Keamanan (macOS X Gatekeeper)
*Gatekeeper OS* berpotensi selalu memkarantina perangkat lunak tak tertandai/tak divalidasi manual ke perizinan App Store. Berikut _bypass_ modifikasinya mandiri:
1. Yakinkan format biner sudah disalin dan tertanam penuh tepat pada  lokasi `/Applications`.
2. Kosongkan isolasi zona karantina status verifikasi  (`xattr -dr com.apple.quarantine "/Applications/AGATE (Antigravity Helper).app"`).
3. Tandai dan daftarkan kembali berkas sertifikat eksekutif (`codesign --force --deep --sign - "/Applications/AGATE (Antigravity Helper).app"`).

---

## Standard Pedoman Kontribusi 
Kami sangat terbuka jika ada komprehensif kolaborasi rancangan teknik. Tolong selalu baca secara teliti `CONTRIBUTING.md` jika Anda telah merencanakan pemenuhan ekstensif *pull requests* terencana matang untuk memenuhi syarat keseragaman CSS. Harap utamakan etika berkoordinasi kode berlandaskan ketetapan referensi norma di `CODE_OF_CONDUCT.md`.

---

## Atribusi Pembuatan (Attribution & Credits)

- **Fondasi Orisinal Program:** Proyek *[Antigravity Manager](https://github.com/Draculabo/AntigravityManager)* yang dirancang oleh *Developer Engineer* utama **[Draculabo](https://github.com/Draculabo)**.
- **Pengembangan Lanjut AGATE:** Peningkatan struktur fungsi antarmuka dinamis (*Enhancements & Refinements*), pemeliharaan, serta modifikasi terancang masif yang ekstensif ditangani penuh oleh spesialis **[LippyyDev](https://github.com/LippyyDev)**.

---

## Regulasi Lisensi Rekayasa Perangkat Lunak 

**Tingkat Lisensi Terverifikasi (License):** CC BY-NC-SA 4.0

**Pernyataan Penting Limitasi Tanggung Jawab Secara Hukum (Disclaimer):**  
Platform ini hanya diciptakan khusus murni sebagai demonstrator wawasan edukasional teknikal mengenai implementasi logika pelik proxy manajemen routing operasi dan mitigasi pertukaran otentikasi rumit. Membungkus ke dalam kemasan aplikasi untuk diubah, diekstradisi komersial penuh dan dimanfaatkan demi pendongkrak kepentingan *brokering* produk pihak komersial entitas **SECARA TEGAS TIDAK DIPERKENANKAN / DILARANG KERAS**! Para penggagas ide (Authors) asal serta Developer Kontributor lepas semua beban tanggung jawab liabilitas dalam format apapun jikalau produk dipakai diluar koridor perjanjian term dan syarat operasi standar, maupun akibat kebobolan dari salah urus dari klien end-user.
