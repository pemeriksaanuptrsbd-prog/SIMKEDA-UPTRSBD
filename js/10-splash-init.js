    // ══════════════════════════════════════════════════════
    //  SPLASH SCREEN — Logic Pemilihan Pengguna & PIN
    // ══════════════════════════════════════════════════════
    let _splashRole = null;
    let _splashPin  = '';
    let _splashAttempts = 0;
    let _splashLocked = false;

    const SPLASH_PIN_TITLE = {
      petugas: '📋 PIN Petugas Kesehatan',
      dokter:  '🩺 PIN Dokter',
      kasi:    '👔 PIN Kepala Seksi',
      admin:   '🔧 PIN Administrator',
    };
    const SPLASH_PIN_HINT = {
      petugas: 'Masukkan 4 digit PIN Petugas',
      dokter:  'Masukkan 4 digit PIN Dokter',
      kasi:    'Masukkan 4 digit PIN Kepala Seksi',
      admin:   'Masukkan 4 digit PIN Administrator',
    };

    function splashPilihRole(role) {
      if (_splashLocked) return;
      _splashRole = role;
      _splashPin  = '';
      _splashAttempts = 0;
      // Tampilkan numpad, sembunyikan grid
      document.getElementById('splashGrid').style.display = 'none';
      const wrap = document.getElementById('splashPinWrap');
      wrap.classList.add('show');
      document.getElementById('splashPinTitle').textContent = SPLASH_PIN_TITLE[role] || '🔐 Masukkan PIN';
      document.getElementById('splashPinSubtitle').textContent = SPLASH_PIN_HINT[role] || '';
      document.getElementById('splashPinError').classList.remove('show');
      const _st = document.getElementById('splashStep'); if (_st) _st.textContent = 'Langkah 2 dari 2 · Masukkan PIN 4 angka';
      splashUpdateDots();
    }

    function splashBack() {
      _splashRole = null;
      _splashPin  = '';
      _splashAttempts = 0;
      _splashLocked = false;
      document.getElementById('splashGrid').style.display = '';
      document.getElementById('splashPinWrap').classList.remove('show');
      document.getElementById('splashPinError').classList.remove('show');
      const _st = document.getElementById('splashStep'); if (_st) _st.textContent = 'Langkah 1 dari 2 · Pilih peran Anda';
      splashUpdateDots();
    }

    function splashNumpad(key) {
      if (_splashLocked) return;
      if (key === 'del') {
        _splashPin = _splashPin.slice(0, -1);
        splashUpdateDots();
        return;
      }
      if (_splashPin.length >= 4) return;
      _splashPin += key;
      splashUpdateDots();
      // Auto-check saat 4 digit terisi
      if (_splashPin.length === 4) {
        setTimeout(splashCekPIN, 200);
      }
    }

    function splashUpdateDots() {
      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('pd' + i);
        if (!dot) continue;
        dot.classList.remove('filled', 'error');
        if (i < _splashPin.length) dot.classList.add('filled');
      }
    }

    async function splashCekPIN() {
      const errEl0 = document.getElementById('splashPinError');
      if (errEl0) { errEl0.textContent = '⏳ Memeriksa PIN...'; errEl0.classList.add('show'); }
      const hasil = await verifikasiLogin(_splashRole, _splashPin);
      if (errEl0 && hasil.ok) { errEl0.classList.remove('show'); errEl0.textContent = ''; }
      if (hasil.ok) {
        // ✅ PIN benar (diperiksa server) — masuk ke aplikasi
        splashMasuk(_splashRole);
        kirimAntrean();
        if (hasil.wajibGantiPin) setTimeout(tampilWajibGantiPin, 600);
        else if (hasil.offline && typeof showToast === 'function') showToast('📴 Masuk offline — perubahan akan dikirim saat tersambung.', 5000);
      } else {
        // ❌ PIN salah
        _splashAttempts++;
        // Animasi error pada dots
        for (let i = 0; i < 4; i++) {
          const dot = document.getElementById('pd' + i);
          if (dot) { dot.classList.remove('filled'); dot.classList.add('error'); }
        }
        const errEl = document.getElementById('splashPinError');
        if (_splashAttempts >= 5) {
          _splashLocked = true;
          errEl.textContent = '🔒 Terlalu banyak percobaan. Tunggu 30 detik.';
          errEl.classList.add('show');
          setTimeout(() => {
            _splashLocked = false;
            _splashAttempts = 0;
            splashBack();
          }, 30000);
        } else {
          errEl.textContent = hasil.pesan || ('❌ PIN salah. Sisa percobaan: ' + (5 - _splashAttempts));
          errEl.classList.add('show');
        }
        setTimeout(() => {
          _splashPin = '';
          splashUpdateDots();
        }, 600);
      }
    }

    function splashMasuk(role) {
      // Set role di state
      setRole(role);
      // Navigasi ke dashboard
      showPage('dashboard', document.querySelector('.nav-btn'));
      // Sembunyikan splash dengan animasi
      const splash = document.getElementById('splashScreen');
      splash.classList.add('hiding');
      setTimeout(() => {
        splash.classList.add('hidden');
      }, 500);
      // Simpan ke localStorage (tahan 24 jam) + sessionStorage (tahan selama tab terbuka)
      state._splashDone = true;
      state._splashTime = new Date().toISOString();
      saveState();
      sessionStorage.setItem('simkeda_sesi_aktif', '1');
      sessionStorage.setItem('simkeda_sesi_role', state.role);
      // Mulai auto sync + fast poll antrian
      if (state.scriptUrl) { setTimeout(async () => { await _idbSiap; await fullSync(true); startAutoSync(); startFastAntrianPoll(); }, 800); }
      // Tampilkan popup setup URL jika belum dikonfigurasi
      setTimeout(cekTampilSetupUrl, 600);
    }

    // Keyboard support (untuk PC — ketik PIN dengan keyboard)
    document.addEventListener('keydown', function(e) {
      const splash = document.getElementById('splashScreen');
      if (!splash || splash.classList.contains('hidden')) return;
      if (!document.getElementById('splashPinWrap').classList.contains('show')) return;
      if (e.key >= '0' && e.key <= '9') splashNumpad(e.key);
      else if (e.key === 'Backspace') splashNumpad('del');
      else if (e.key === 'Enter' && _splashPin.length === 4) splashCekPIN();
      else if (e.key === 'Escape') splashBack();
    });

    // ── Cek apakah sesi masih aktif ──
    function cekSesiAktif() {
      // Hanya pakai sessionStorage: login tetap saat refresh, tapi muncul lagi saat buka tab/browser baru
      return sessionStorage.getItem('simkeda_sesi_aktif') === '1' && (!state.scriptUrl || !!_sesiToken || localStorage.getItem('simkeda_vf_' + (sessionStorage.getItem('simkeda_sesi_role') || '')) !== null);
    }

    // ── Keluar dari aplikasi (logout) ──
    // Menghapus sesi aktif & kembali ke layar PIN, tanpa menghapus data
    // yang sudah tersimpan di aplikasi (data tetap aman, cuma perlu PIN lagi).
    // ── Logout paksa (tanpa dialog konfirmasi) — dipanggil otomatis saat
    //    server menolak dengan "sesi tidak sah", supaya user tidak terus
    //    menerus gagal dengan PIN/proof lama tanpa sadar. ──
    function _paksaLogoutSesiTidakSah() {
      try { stopAutoSync(); } catch (e) {}
      try { stopFastAntrianPoll(); } catch (e) {}
      sessionStorage.removeItem('simkeda_sesi_aktif');
      sessionStorage.removeItem('simkeda_sesi_role');
      try { sessionStorage.removeItem('simkeda_wajib_ganti'); } catch (e) {}
      _simpanSesi('');
      location.reload();
    }

    function logoutSimkeda() {
      if (!confirm('Yakin ingin keluar dari aplikasi?\n\nAnda perlu memasukkan PIN lagi untuk masuk kembali.')) return;
      tutupModal('roleModal');
      // Akhiri sesi di server juga (best-effort)
      try {
        if (state.scriptUrl && _sesiToken && navigator.sendBeacon) {
          navigator.sendBeacon(state.scriptUrl, new Blob([JSON.stringify({ action: 'logout', token: state.appToken, sesi: _sesiToken, deviceId: state._deviceId || 'web' })], { type: 'text/plain' }));
        }
      } catch (e) {}
      _paksaLogoutSesiTidakSah();
    }

    // ── Init splash: tampilkan atau skip jika sesi masih aktif ──
    function initSplash() {
      const splash = document.getElementById('splashScreen');
      if (!splash) return;
      if (cekSesiAktif()) {
        // Restore role dari sessionStorage jika ada (lebih fresh dari localStorage)
        const sesRole = sessionStorage.getItem('simkeda_sesi_role');
        if (sesRole) setRole(sesRole);
        // Sesi masih aktif — langsung masuk tanpa PIN
        splash.classList.add('hidden');
        try { if (sessionStorage.getItem('simkeda_wajib_ganti') === '1') setTimeout(tampilWajibGantiPin, 300); } catch (e) {}
        if (state.scriptUrl) { setTimeout(async () => { await _idbSiap; await kirimAntrean(); await fullSync(true); startAutoSync(); startFastAntrianPoll(); }, 800); }
        // Tampilkan popup setup URL jika belum dikonfigurasi
        setTimeout(cekTampilSetupUrl, 800);
      }
      // Jika sesi expired atau belum pernah login → tampilkan splash (sudah tampil by default)
    }

    // ══════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════
    loadState();
    _idbMigrasiDariLocalStorageJikaPerlu();
    initDate();
    loadKonfigurasi();
    loadCustomJenisDis();

    // restore role UI
    // Clear edit mode flags saat pertama load (menghindari state stale dari sesi sebelumnya)
    state._editNI = null;
    state._editPeriksaId = null;
    setRole(state.role || 'petugas');
    loadKonfigurasi();

    // Init daftar petugas — pastikan namaPetugas ada di daftar
    if (!state.daftarPetugas) state.daftarPetugas = [];
    if (state.namaPetugas && !state.daftarPetugas.includes(state.namaPetugas)) {
      state.daftarPetugas.push(state.namaPetugas);
    }
    if (!state.petugasCetak && state.namaPetugas) state.petugasCetak = state.namaPetugas;
    updateSelectPetugasCetak();

    // set kasi filter defaults
    document.getElementById('kasiBulan').value = new Date().getMonth() + 1;
    document.getElementById('kasiTahun').value = new Date().getFullYear();
    // set master filter defaults
    const _mTh = document.getElementById('kasiMasterTahun');
    if (_mTh) _mTh.value = String(new Date().getFullYear());

    // auto-isi nama dokter jika sudah dikonfigurasi
    if (state.defaultDokter) {
      const dok = document.getElementById('namaDokter');
      if (dok) dok.value = state.defaultDokter;
    }

    // (Dulu: 5 PM contoh fiktif dibuat otomatis bila daftar kosong — data palsu itu
    //  ikut terkirim ke spreadsheet dari setiap perangkat baru. Sudah dihapus.)
    // Bersihkan sisa data contoh lama yang BELUM pernah diubah pengguna (hanya di perangkat ini).
    (function() {
      const CONTOH = { 'BDBP-2025-001': 'Budi Santoso', 'BDBP-2025-002': 'Siti Rahayu', 'BDBP-2025-003': 'Ahmad Yusuf', 'BDBP-2025-004': 'Dewi Lestari', 'BDBP-2025-005': 'Rudi Hartono' };
      const sebelum = state.penerima.length;
      state.penerima = state.penerima.filter(p => !(p && CONTOH[p.nomorInduk] === p.namaPM && !p.updatedAt &&
        !(state.pemeriksaan || []).some(x => x.nomorInduk === p.nomorInduk)));
      if (state.penerima.length !== sebelum) saveState();
    })();


    // ══════════════════════════════════════
    //  STATE VAR
    // ══════════════════════════════════════
