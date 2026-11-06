    // ══════════════════════════════════════
    //  HALAMAN SETELAN PER-ROLE
    // ══════════════════════════════════════
    function initSetelanPage() {
      const role = state.role;
      const isAdmin = role === 'admin';
      // Tampilkan/sembunyikan section sesuai role
      const showEl = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; };
      showEl('setelanPetugasFields', role === 'petugas' || role === 'admin');
      showEl('setelanDokterFields', role === 'dokter' || role === 'admin');
      showEl('setelanKasiFields', role === 'kasi' || role === 'admin');

      // Populate field dengan nilai saat ini (pre-fill)
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      setVal('setelanNamaPetugas', state.namaPetugas);
      setVal('setelanNamaDokter', state.defaultDokter);
      setVal('setelanNamaKasi', state.namaKasi);
      setVal('setelanScriptUrl', state.scriptUrl);
      // URL yang sudah tertanam di aplikasi tidak bisa diganti dari sini (akan kembali saat dibuka ulang)
      const _urlEl = document.getElementById('setelanScriptUrl');
      if (_urlEl) { _urlEl.readOnly = !!HARDCODED_GAS_URL; _urlEl.title = HARDCODED_GAS_URL ? 'URL sudah tertanam di aplikasi' : ''; }
      setVal('setelanPinBaru', '');
      setVal('setelanPinKonfirmasi', '');

      // Tampilkan nilai saat ini sebagai label informatif
      const setCurr = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ? '(saat ini: ' + val + ')' : '(belum diisi)'; };
      setCurr('setelanNamaPetugasCurr', state.namaPetugas);
      setCurr('setelanNamaDokterCurr', state.defaultDokter);
      setCurr('setelanNamaKasiCurr', state.namaKasi);

      // === PROFIL GLOBAL: hanya Admin yang bisa edit nama ===
      // Non-admin → field nama dibuat read-only + tambahkan indikator 🔒
      const profilFields = ['setelanNamaPetugas', 'setelanNamaDokter', 'setelanNamaKasi'];
      profilFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (isAdmin) {
          el.readOnly = false;
          el.style.background = '';
          el.style.cursor = '';
        } else {
          el.readOnly = true;
          el.style.background = '#f5f5f5';
          el.style.cursor = 'not-allowed';
          el.title = 'Profil dikelola oleh Admin. Hubungi Admin untuk mengubah.';
        }
      });
      // Indikator text di bawah setiap field
      const hintId = 'setelanProfilAdminHint';
      let hintEl = document.getElementById(hintId);
      if (!isAdmin) {
        if (!hintEl) {
          hintEl = document.createElement('div');
          hintEl.id = hintId;
          hintEl.style.cssText = 'margin-top:.4rem;padding:8px 12px;background:#fff8e1;border-left:3px solid #f59e0b;border-radius:6px;font-size:.8rem;color:#92400e;';
          hintEl.innerHTML = '🔒 <strong>Profil Pengguna</strong> (Nama Petugas / Dokter / Kepala Seksi) dikelola terpusat oleh <strong>Admin</strong>. Anda masih bisa mengubah PIN sendiri.';
          const kasiF = document.getElementById('setelanKasiFields');
          if (kasiF && kasiF.parentNode) kasiF.parentNode.insertBefore(hintEl, kasiF.nextSibling);
        }
        hintEl.style.display = '';
      } else {
        if (hintEl) hintEl.style.display = 'none';
      }

      // Status URL sinkronisasi
      const urlStatus = document.getElementById('setelanUrlStatus');
      if (urlStatus) urlStatus.textContent = state.scriptUrl ? '✅ Aktif' : '⚠️ Belum dikonfigurasi';
      if (urlStatus) urlStatus.style.color = state.scriptUrl ? 'var(--success)' : 'var(--warning,#e67e22)';

      // Tampilkan tombol sync hanya kalau scriptUrl ada
      const btnSync = document.getElementById('btnSyncSetelan');
      if (btnSync) btnSync.style.display = state.scriptUrl ? '' : 'none';

      // Render daftar petugas chips
      renderDaftarPetugasUI();
    }

    function renderDaftarPetugasUI() {
      const container = document.getElementById('daftarPetugasList');
      if (!container) return;
      const daftar = state.daftarPetugas || [];
      container.innerHTML = '';
      if (!daftar.length) {
        container.innerHTML = '<span style="font-size:.78rem;color:var(--text-muted);">Belum ada petugas — tambahkan di atas</span>';
      }
      daftar.forEach((nama, idx) => {
        const chip = document.createElement('div');
        chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:#1a6b4a;color:white;padding:4px 10px;border-radius:20px;font-size:.78rem;cursor:pointer;' +
          (state.namaPetugas === nama ? 'box-shadow:0 0 0 2px #f39c12;' : '');
        chip.innerHTML = '<span onclick="setActivePetugas(\'' + jsArg(nama) + '\')" title="Klik untuk jadikan aktif">👤 ' + escHtml(nama) + (state.namaPetugas === nama ? ' ✓' : '') + '</span>' +
          '<button onclick="hapusPetugas(' + idx + ')" style="background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;font-size:.85rem;padding:0 2px;margin-left:2px;" title="Hapus">✕</button>';
        container.appendChild(chip);
      });
      // Update dropdown pilih petugas cetak
      updateSelectPetugasCetak();
    }

    function tambahPetugasKeDaftar() {
      const inp = document.getElementById('inputTambahPetugas');
      if (!inp) return;
      const nama = inp.value.trim();
      if (!nama) { alert('Masukkan nama petugas!'); return; }
      if (!state.daftarPetugas) state.daftarPetugas = [];
      if (state.daftarPetugas.includes(nama)) { alert('Nama sudah ada di daftar.'); return; }
      state.daftarPetugas.push(nama);
      inp.value = '';
      saveState();
      renderDaftarPetugasUI();
      simpanGlobalProfilePetugas();
    }

    function hapusPetugas(idx) {
      if (!state.daftarPetugas || !state.daftarPetugas[idx]) return;
      const nama = state.daftarPetugas[idx];
      if (!confirm('Hapus petugas "' + nama + '" dari daftar?')) return;
      state.daftarPetugas.splice(idx, 1);
      if (state.namaPetugas === nama) state.namaPetugas = state.daftarPetugas[0] || '';
      saveState();
      renderDaftarPetugasUI();
      simpanGlobalProfilePetugas();
    }

    function setActivePetugas(nama) {
      state.namaPetugas = nama;
      state.petugasCetak = nama;
      saveState();
      renderDaftarPetugasUI();
      const el = document.getElementById('setelanNamaPetugas');
      if (el) el.value = nama;
      const curr = document.getElementById('setelanNamaPetugasCurr');
      if (curr) curr.textContent = '(saat ini: ' + nama + ')';
      showToast('✅ Petugas aktif: ' + nama);
    }

    function simpanGlobalProfilePetugas() {
      if (!state.scriptUrl) return;
      const profil = { namaPetugas: state.namaPetugas, daftarPetugas: state.daftarPetugas, namaKasi: state.namaKasi };
      kirimKeSheets('saveGlobalProfile', profil);
    }

    function updateSelectPetugasCetak() {
      const daftar = state.daftarPetugas || [];
      const selectors = ['pilihPetugasCetak', 'pilihPetugasCetakRekap'];
      selectors.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const curr = sel.value || state.petugasCetak || state.namaPetugas || '';
        sel.innerHTML = '<option value="">— Pilih Petugas —</option>';
        daftar.forEach(nama => {
          const opt = document.createElement('option');
          opt.value = nama; opt.textContent = nama;
          if (nama === curr) opt.selected = true;
          sel.appendChild(opt);
        });
        // Tambahkan petugas aktif kalau belum ada
        if (state.namaPetugas && !daftar.includes(state.namaPetugas)) {
          const opt = document.createElement('option');
          opt.value = state.namaPetugas; opt.textContent = state.namaPetugas;
          if (state.namaPetugas === curr) opt.selected = true;
          sel.appendChild(opt);
        }
        sel.style.display = (daftar.length > 0 || state.namaPetugas) ? '' : 'none';
        sel.onchange = function() { state.petugasCetak = this.value; saveState(); };
      });
    }

    async function simpanSetelanProfil() {
      const role = state.role;
      const isAdmin = role === 'admin';
      const pinBaru = (document.getElementById('setelanPinBaru') || {}).value || '';
      const pinKonfirm = (document.getElementById('setelanPinKonfirmasi') || {}).value || '';

      if (pinBaru && pinBaru !== pinKonfirm) {
        showAlert('alertSetelan', 'error', '❌ Konfirmasi PIN tidak cocok!'); return;
      }
      if (pinBaru && !/^\d{4}$/.test(pinBaru)) {
        showAlert('alertSetelan', 'error', '❌ PIN harus 4 digit angka!'); return;
      }

      // Deteksi perubahan profil (nama) - hanya admin yang boleh
      let profilBerubah = false;
      const vPetugas = (document.getElementById('setelanNamaPetugas') || {}).value || '';
      const vDokter = (document.getElementById('setelanNamaDokter') || {}).value || '';
      const vKasi = (document.getElementById('setelanNamaKasi') || {}).value || '';

      if (isAdmin) {
        if (vPetugas && vPetugas !== state.namaPetugas) { state.namaPetugas = vPetugas; profilBerubah = true; }
        if (vDokter && vDokter !== state.defaultDokter) { state.defaultDokter = vDokter; profilBerubah = true; }
        if (vKasi && vKasi !== state.namaKasi) { state.namaKasi = vKasi; profilBerubah = true; }
      }

      // PIN — setiap role bisa ganti PIN sendiri; diperiksa & disimpan di SERVER (SHA-256).
      if (pinBaru) {
        const rPin = await kirimGantiPin(pinBaru);
        if (!rPin.ok) { showAlert('alertSetelan', 'error', '❌ ' + (rPin.error || 'Gagal mengganti PIN')); return; }
      }

      saveState();
      // Sinkron ke field lain yang relevan
      const dokField = document.getElementById('namaDokter');
      if (dokField && state.defaultDokter) dokField.value = state.defaultDokter;
      document.getElementById('setelanPinBaru').value = '';
      document.getElementById('setelanPinKonfirmasi').value = '';

      // Push profil global ke Google Sheets — HANYA bila nama profil berubah (khusus admin).
      // PIN sudah disimpan di server lewat kirimGantiPin. Dulu mengganti PIN (role apa pun) juga
      // mengirim ttdDokterBase64 dari perangkat ini: di perangkat tanpa TTD nilainya kosong →
      // TTD dokter di server TERHAPUS untuk semua perangkat.
      if (profilBerubah && state.scriptUrl) {
        kirimKeSheets('saveGlobalProfile', {
          namaPetugas: state.namaPetugas || '',
          defaultDokter: state.defaultDokter || '',
          namaKasi: state.namaKasi || '',
          daftarPetugas: state.daftarPetugas || []
        }).then(ok => {
          if (ok) showToast('☁️ Tersinkron ke Sheets');
        });
      }

      showAlert('alertSetelan', 'success', '✅ Profil & PIN berhasil disimpan!'); showToast('✅ Profil & PIN berhasil disimpan!');
    }

    

    function simpanSetelanSync() {
      if (HARDCODED_GAS_URL) { showAlert('alertSetelan', 'info', 'ℹ️ URL sinkronisasi sudah tertanam di aplikasi ini dan tidak perlu diubah.'); return; }
      const url = (document.getElementById('setelanScriptUrl') || {}).value || '';
      state.scriptUrl = url.trim();
      saveState();
      // Sinkronkan ke admin page jika ada
      const adminUrl = document.getElementById('scriptUrl');
      if (adminUrl) adminUrl.value = state.scriptUrl;
      const btnSync = document.getElementById('btnSyncSetelan');
      if (btnSync) btnSync.style.display = state.scriptUrl ? '' : 'none';
      const btnSyncHeader = document.getElementById('btnSyncHeader');
      if (btnSyncHeader) btnSyncHeader.style.display = state.scriptUrl ? '' : 'none';
      showAlert('alertSetelan', 'success', state.scriptUrl ? '✅ URL sinkronisasi disimpan! Sinkronisasi otomatis aktif.' : '✅ URL dikosongkan. Mode offline.');
      showToast(state.scriptUrl ? '✅ URL sinkronisasi berhasil disimpan!' : '✅ URL sinkronisasi dikosongkan.');
    }

    async function sinkronDariSheetsSetelan() {
      showAlert('alertSetelan', 'info', '🔄 Mengambil data dari Google Sheets...');
      const ok = await muatDariSheets(true);
      if (ok) { showAlert('alertSetelan', 'success', '✅ Data berhasil disinkronkan dari Google Sheets!'); showToast('✅ Data berhasil disinkronkan dari Google Sheets!'); }
      else showAlert('alertSetelan', 'error', '❌ Gagal sinkronisasi. Periksa URL dan koneksi internet.');
    }

    function exportDataLokal() {
      try {
        const data = {
          penerima: state.penerima,
          pemeriksaan: state.pemeriksaan,
          pengukuranAwal: state.pengukuranAwal,
          insidental: (state.insidental || []).filter(x => x && !x._deleted),
          rujukan: (state.rujukan || []).filter(x => x && !x._deleted),
          asesmenAwal: state.asesmenAwal || [],
          exportTime: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'simkeda-backup-' + isoLokal(new Date()) + '.json';
        a.click();
        showAlert('alertSetelan', 'success', '✅ Data berhasil diekspor!'); showToast('✅ Data berhasil diekspor!');
      } catch (e) { showAlert('alertSetelan', 'error', '❌ Gagal ekspor data.'); }
    }

    function hapusDataSetelan() {
      if (!confirm('Hapus semua data lokal? Data di Google Sheets tetap aman.\nLanjutkan?')) return;
      state.penerima = []; state.pemeriksaan = []; state.pengukuranAwal = [];
      state.insidental = []; state.antrian = []; state.rujukan = [];
      if (typeof _resetPenandaSinkron === 'function') _resetPenandaSinkron();
      saveState(); renderDashboard();
      showAlert('alertSetelan', 'success', '✅ Data lokal berhasil dihapus. Lakukan sinkronisasi untuk memuat ulang dari Sheets.');
    }

    // ══════════════════════════════════════
    //  ROLE CONFIG
    // ══════════════════════════════════════
    const ROLE_LABEL = {
      petugas: 'Petugas Kesehatan',
      dokter: 'Dokter',
      kasi: 'Kepala Seksi',
      admin: 'Administrator'
    };
    const ROLE_ICON = { petugas: '📋', dokter: '🩺', kasi: '👔', admin: '🔧' };
    const ROLE_PAGES = {
      petugas: ['dashboard', 'antrian', 'pendaftaran', 'pengukuran', 'insidental', 'rujukan', 'rekap', 'stok', 'setelan'],
      dokter: ['dashboard', 'pemeriksaan', 'asesmen', 'rujukan', 'rekap', 'stok', 'setelan'],
      kasi: ['dashboard', 'rekap', 'kasi', 'stok', 'setelan'],
      admin: ['dashboard', 'antrian', 'pendaftaran', 'pengukuran', 'pemeriksaan', 'asesmen', 'insidental', 'rujukan', 'rekap', 'kasi', 'admin', 'stok', 'setelan']
    };


    // ══════════════════════════════════════
    //  NAVIGATION
    // ══════════════════════════════════════
    function showPage(id, btn) {
      // Akses kontrol
      if (!(ROLE_PAGES[state.role] || []).includes(id)) {
        alert('⛔ Akses ditolak untuk role "' + (ROLE_LABEL[state.role] || state.role) + '".');
        return;
      }
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      const el = document.getElementById('page-' + id);
      if (!el) return;
      el.classList.add('active');
      if (btn) { btn.classList.add('active'); }
      else {
        document.querySelectorAll('.nav-btn').forEach(b => {
          if ((b.getAttribute('onclick') || '').includes("'" + id + "'")) b.classList.add('active');
        });
      }
      if (id === 'dashboard') renderDashboard();
      if (id === 'antrian') renderAntrian();
      if (id === 'pendaftaran') { renderListPM(); updateSelectPM(); }
      if (id === 'pengukuran') { updateSelectPMPetugas(); renderDaftarPengukuran(); updateAntrianPickerPetugas(); initWeekChipEl('weekChipPetugas');
        // Set dropdown foto ke bulan/tahun sekarang
        const _now = new Date();
        const _fBl = document.getElementById('fotoFilterBulan'); if (_fBl) _fBl.value = _now.getMonth()+1;
        const _fTh = document.getElementById('fotoFilterTahun'); if (_fTh) _fTh.value = _now.getFullYear();
        renderFotoMingguInput();
        if (state.scriptUrl && navigator.onLine) setTimeout(() => pullFromSheets(true), 300); }
      if (id === 'pemeriksaan') { updateSelectPM(); renderRiwayat(); renderDaftarSiapPeriksa(); initWeekChipEl('weekChip'); initTTDCanvas(); if (state.scriptUrl && navigator.onLine) setTimeout(() => pullFromSheets(true), 300); }
      if (id === 'rekap') renderRekap();
      if (id === 'kasi') renderKasi();
      if (id === 'admin') { renderRiwayatAdmin(''); loadKonfigurasi(); }
      if (id === 'insidental') { updateSelectInsidental(); renderInsidental(); }
      if (id === 'rujukan') { updateSelectRujukan(); renderRujukan(); }

      if (id === 'setelan') { initSetelanPage(); }
      if (id === 'asesmen') { updateSelectAsesmen(); renderAsesmenList(); if (_mmtVals.every(v=>v==='')) mmtInit(null); else mmtRender(); }
      if (id === 'rekap') { renderRekap(); renderRekapInsidental(); renderRekapRujukan(); renderFotoMinggu(); }
      if (id === 'kasi') {
        renderKasiRujukanFull(); renderKasiInsidental(); renderKasiInsidentalPeriksa(); renderKasiFoto(); renderKasiPenyakit(); renderKasiAsesmen(); renderKasiListPM();
        // Terapkan master filter yang aktif (jika ada)
        if (typeof applyKasiMasterFilter === 'function') applyKasiMasterFilter();
        // Info kapan data terakhir sinkron dari Sheets, supaya Kasi tahu data ini "segar" atau tidak
        const infoEl = document.getElementById('kasiSyncInfo');
        if (infoEl) {
          if (state.lastSync) {
            const menit = Math.round((Date.now() - new Date(state.lastSync).getTime()) / 60000);
            const label = menit < 1 ? 'baru saja' : menit < 60 ? menit + ' menit lalu' : Math.round(menit / 60) + ' jam lalu';
            infoEl.textContent = '🔄 Data terakhir sinkron: ' + new Date(state.lastSync).toLocaleString('id-ID') + ' (' + label + ')';
          } else {
            infoEl.textContent = '⚠️ Belum pernah sinkron dari Sheets — data yang tampil hanya dari perangkat ini.';
          }
        }
        // Reminder rujukan yang sudah lama menunggu hasil, khusus dilihat Kasi juga
        const rujOverdueKasi = document.getElementById('kasiRujukanOverdueBanner');
        if (rujOverdueKasi) {
          const overdue = (state.rujukan || []).filter(x => !x._deleted && (x.statusRujukan || 'Aktif') !== 'Selesai'
            && hitungHariBerjalanRujukan(x.tgl) >= 7);
          if (overdue.length > 0) {
            rujOverdueKasi.style.display = 'block';
            rujOverdueKasi.textContent = '⚠️ ' + overdue.length + ' rujukan sudah ≥7 hari belum ada hasil.';
          } else {
            rujOverdueKasi.style.display = 'none';
          }
        }
      }
    }

    function setRole(r) {
      state.role = r;
      saveState();
      document.getElementById('roleLabel').textContent = ROLE_LABEL[r] || r;
      const s = (id, v) => { const e = document.getElementById(id); if (e) e.style.display = v ? '' : 'none'; };
      const isAdmin = r === 'admin', isKasi = r === 'kasi' || isAdmin,
        isDokter = r === 'dokter' || isAdmin, isPetugas = r === 'petugas' || isAdmin;
      s('navKasi', isKasi); s('navAdmin', isAdmin);
      s('navAntrian', isPetugas); s('navPendaftaran', isPetugas); s('navPengukuran', isPetugas);
      s('navInsidental', isPetugas); s('navRujukan', isPetugas || isDokter);
      s('navStok', true);
      s('navPemeriksaan', isDokter);
      s('navAsesmen', isDokter);
      const badge = document.querySelector('.role-badge');
      const c = ({ admin: ['rgba(192,57,43,.4)', 'rgba(192,57,43,.6)'], kasi: ['rgba(123,45,139,.35)', 'rgba(123,45,139,.5)'], dokter: ['rgba(21,101,192,.35)', 'rgba(21,101,192,.5)'], petugas: ['rgba(255,255,255,.15)', 'rgba(255,255,255,.25)'] })[r] || ['rgba(255,255,255,.15)', 'rgba(255,255,255,.25)'];
      badge.style.background = c[0]; badge.style.borderColor = c[1];
      // Tampilkan tombol sync jika scriptUrl sudah dikonfigurasi
      const btnSync = document.getElementById('btnSyncHeader');
      if (btnSync) btnSync.style.display = state.scriptUrl ? '' : 'none';
      updateNavGroups();
    }

    // Sembunyikan grup nav jika semua tombol di dalamnya tersembunyi untuk role aktif
    // (logic akses tetap di ROLE_PAGES / showPage; ini murni kosmetik pengelompokan)
    function updateNavGroups() {
      document.querySelectorAll('nav .nav-group').forEach(function (grp) {
        const visible = [...grp.querySelectorAll('.nav-btn')].some(function (b) {
          return b.style.display !== 'none';
        });
        grp.style.display = visible ? '' : 'none';
      });
    }

    // Hanya Administrator yang boleh berpindah mode langsung. Petugas/Dokter/Kasi harus keluar dulu
    // (lalu masuk lagi dengan PIN role yang diinginkan) — tidak ada daftar pilihan mode untuk mereka.
    function toggleRoleModal() {
      if (state.role !== 'admin') { logoutSimkeda(); return; }
      document.getElementById('roleModal').classList.toggle('show');
    }
    function tutupModal(id) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('show');
      // Bersihkan scroll-lock body saat semua modal sudah tertutup
      // (fix: class modal-open tidak hilang jika halaman di-refresh saat modal terbuka)
      const anyOpen = document.querySelector('.modal-overlay.show, .modal.show');
      if (!anyOpen) {
        const scrollY = document.body.style.top;
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        if (scrollY) window.scrollTo(0, parseInt(scrollY) * -1);
      }
    }

    // ── PIN KASI ──
    function mintaPIN(role) {
      _pendingRole = role;
      tutupModal('roleModal');
      const t = { petugas: '📋 PIN Petugas', dokter: '🩺 PIN Dokter', kasi: '👔 PIN Kepala Seksi', admin: '🔧 PIN Administrator' };
      document.getElementById('pinModalTitle').textContent = t[role] || '🔐 Masukkan PIN';
      document.getElementById('pinInput').value = '';
      document.getElementById('pinError').style.display = 'none';
      document.getElementById('modalPin').classList.add('show');
      setTimeout(() => document.getElementById('pinInput').focus(), 150);
    }
    function batalPIN() {
      document.getElementById('modalPin').classList.remove('show');
      document.getElementById('pinInput').value = '';
      document.getElementById('pinError').style.display = 'none';
      _pendingRole = null;
    }
    // ── Brute force protection untuk PIN ──
    let _pinAttempts = 0;
    let _pinLockedUntil = 0;

    async function cekPIN() {
      const errEl = document.getElementById('pinError');
      // Cek lockout
      if (Date.now() < _pinLockedUntil) {
        const sisa = Math.ceil((_pinLockedUntil - Date.now()) / 1000);
        errEl.textContent = `🔒 Terlalu banyak percobaan salah. Tunggu ${sisa} detik.`;
        errEl.style.display = 'block';
        document.getElementById('pinInput').value = '';
        return;
      }
      const input = document.getElementById('pinInput').value.trim();
      errEl.textContent = '⏳ Memeriksa PIN...'; errEl.style.display = 'block';
      const hasilLogin = await verifikasiLogin(_pendingRole, input);
      if (hasilLogin.ok) {
        _pinAttempts = 0; // reset counter saat sukses
        document.getElementById('modalPin').classList.remove('show');
        document.getElementById('pinInput').value = '';
        errEl.style.display = 'none';
        setRole(_pendingRole);
        // Ingat peran baru untuk muat ulang (dulu tetap peran lama → tidak cocok dengan sesi server)
        try { sessionStorage.setItem('simkeda_sesi_aktif', '1'); sessionStorage.setItem('simkeda_sesi_role', _pendingRole); } catch (e) {}
        _pendingRole = null;
        if (typeof showPage === 'function') showPage('dashboard');
        kirimAntrean();
        if (hasilLogin.wajibGantiPin) tampilWajibGantiPin();
      } else {
        _pinAttempts++;
        if (_pinAttempts >= 5) {
          _pinLockedUntil = Date.now() + 30000; // 30 detik lockout
          _pinAttempts = 0;
          errEl.textContent = '🔒 Terlalu banyak percobaan salah! Terkunci 30 detik.';
        } else {
          errEl.textContent = hasilLogin.pesan || `❌ PIN salah! (${_pinAttempts}/5 percobaan)`;
        }
        errEl.style.display = 'block';
        document.getElementById('pinInput').value = '';
        document.getElementById('pinInput').focus();
      }
    }

    function getWeekOfMonth(d) { return Math.ceil((d || new Date()).getDate() / 7); }

    function initADLTable() {
      const tbody = document.getElementById('adlTableBody');
      if (!tbody || tbody.children.length > 0) return;
      tbody.innerHTML = ADL_ITEMS.map((item, i) => `
        <tr${i % 2 === 1 ? ' style="background:#fafafa;"' : ''}>
          <td style="padding:8px 10px;border:1px solid var(--border);">${escHtml(item)}</td>
          <td style="padding:6px 10px;border:1px solid var(--border);text-align:center;"><input type="radio" name="asADL_${escHtml(i)}" value="Mandiri"></td>
          <td style="padding:6px 10px;border:1px solid var(--border);text-align:center;"><input type="radio" name="asADL_${escHtml(i)}" value="Butuh Bantuan"></td>
          <td style="padding:6px 10px;border:1px solid var(--border);text-align:center;"><input type="radio" name="asADL_${escHtml(i)}" value="Ketergantungan Total"></td>
        </tr>`).join('');
    }

    function initDate() {
      const now = new Date();
      document.getElementById('dateDisplay').textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      document.getElementById('antrianTanggal').textContent = now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      document.getElementById('tglPeriksa').value = isoLokal(now);
      document.getElementById('tglMasuk').value = isoLokal(now);
      const tglPengEl = document.getElementById('tglPengukuran');
      if (tglPengEl) tglPengEl.value = isoLokal(now);
      const asesmenTglEl = document.getElementById('asesmenTgl');
      if (asesmenTglEl) asesmenTglEl.value = isoLokal(now);
      if (state.defaultDokter) { const el = document.getElementById('asesmenNamaDokter'); if (el) el.value = state.defaultDokter; }
      initADLTable();
      document.getElementById('mingguke').value = getWeekOfMonth(now);
      document.getElementById('filterBulan').value = now.getMonth() + 1;
      document.getElementById('filterTahun').value = now.getFullYear();
      initWeekChip();
    }
    function initWeekChip() {
      const now = new Date();
      document.getElementById('weekChip').textContent = `Minggu ke-${getWeekOfMonth(now)} · ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    }
