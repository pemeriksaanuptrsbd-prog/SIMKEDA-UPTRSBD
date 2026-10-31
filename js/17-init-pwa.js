    // ══════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════
    // (loadState, migrasi IndexedDB, initDate, loadKonfigurasi, loadCustomJenisDis sudah
    //  dijalankan di 10-splash-init.js — dulu dijalankan DUA KALI dan saling balapan.)
    autoExtendYearSelects();
    // Jika sesi masih aktif, set role dari state — splash akan di-skip
    if (cekSesiAktif()) {
      setRole(state.role || 'petugas');
    } else {
      // Set role default (petugas) agar nav terbentuk, tapi splash tetap tampil di depan
      setRole('petugas');
    }
    initSplash();
    renderDashboard();
    renderListPM();
    // Inisialisasi filter riwayat ke bulan saat ini
    (function () {
      const _now = new Date();
      const _fbEl = document.getElementById('filterRiwayatBulan');
      if (_fbEl) _fbEl.value = String(_now.getMonth() + 1);
      const _ftEl = document.getElementById('filterRiwayatTahun');
      if (_ftEl && !_ftEl.value) _ftEl.value = String(_now.getFullYear());
    })();
    renderRiwayat();
    updateAntrianPicker();
    updateSelectInsidental();
    updateSelectRujukan();
    renderInsidental();
    renderRujukan();
    renderRekapInsidental();
    renderRekapRujukan();

    // ── Set bagian pertama sebagai tampilan default untuk 3 halaman padat (tab sungguhan) ──
    initQuickSections('rekap', 'rekap-sec-pemeriksaan', '📅 Pemeriksaan');
    initQuickSections('kasi', 'kasi-sec-ringkasan', '👔 Ringkasan laporan');
    initQuickSections('stok', 'stok-sec-stat', '💊 Statistik stok');


    // Init Stok Obat
    // ── Rebuild log pemakaian dari data lokal (fix: HP baru / sesudah sync) ──
    rebuildObatKeluarDariSync();
    renderStokObat();
    renderRekapObat();
    renderLogMutasi();
    updateSelectMutasiObat();
    updateStokStats();
    updateSelectObatPM();
    (function(){
      const rb = document.getElementById('rekapObatBulan');
      const rt = document.getElementById('rekapObatTahun');
      const now = new Date();
      if (rb) rb.value = String(now.getMonth() + 1);
      if (rt) rt.value = String(now.getFullYear());
      renderRekapObat();
    })();

    // ── Auto-sync dari Google Sheets saat halaman dibuka ──
    // Auto-sync dimulai dari splashMasuk() setelah login berhasil (bukan langsung saat buka)
    // setTimeout(() => autoSyncSaatBuka(), 1500); // dipindahkan ke splashMasuk

    // ── Data riwayat dari IndexedDB dimuat async: begitu siap, gambar ulang semua tampilan ──
    function _setelahDataLokalSiap() {
      try { _normalisasiIdState(); } catch (e) {}
      try { rebuildObatKeluarDariSync(); } catch (e) {}
      if (typeof _refreshSemuaTampilan === 'function') _refreshSemuaTampilan(true);
    }
    if (_idbSudahDimuat) _setelahDataLokalSiap();

    // ── Daily reset antrian saat tengah malam ──
    scheduleMidnightReset();

    // ── Cleanup stale modal-open saat halaman pertama kali dimuat ──
    // (fix: jika halaman di-refresh saat modal terbuka, body bisa ter-lock)
    (function cleanupStaleModalLock() {
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
    })();

    // ══════════════════════════════════════════════════════
    //  MOBILE / PWA ENHANCEMENTS
    // ══════════════════════════════════════════════════════

    // ── 1. Scroll lock when modal opens ──────────────────
    const _origShowModal = window.showModal;
    function lockBodyScroll(lock) {
      if (lock) {
        document.body.style.top = `-${window.scrollY}px`;
        document.body.classList.add('modal-open');
      } else {
        const scrollY = document.body.style.top;
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // (Dulu tutupModal dibungkus di sini dengan lockBodyScroll(false). Karena kunci scroll
    //  tidak pernah dipasang saat modal dibuka, bungkus itu selalu memanggil scrollTo(0, 0):
    //  setiap kali jendela detail ditutup, halaman melompat ke paling atas. tutupModal asli
    //  di 03-setelan-role-navigasi.js sudah membersihkan kunci scroll bila memang terpasang.)

    // ── 2. Bottom sheet swipe-to-dismiss ─────────────────
    (function() {
      let startY = 0, startScroll = 0;
      document.addEventListener('touchstart', function(e) {
        const modal = e.target.closest('.modal');
        if (modal) {
          startY = e.touches[0].clientY;
          startScroll = modal.scrollTop;
        }
      }, { passive: true });

      document.addEventListener('touchmove', function(e) {
        const overlay = e.target.closest('.modal-overlay');
        const modal = e.target.closest('.modal');
        if (overlay && !modal) e.preventDefault(); // block backdrop scroll
      }, { passive: false });
    })();

    // ── 3. Pull-to-refresh prevention (iOS rubber-band) ──
    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 1) return; // allow pinch zoom
      const el = e.target.closest('.table-wrap, .modal, #antrianList, #dashAntrian, #dashWarn, #listPM');
      if (!el) return;
      // Allow scroll inside scrollable containers
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((atTop && e.touches[0].clientY > 0) || (atBottom)) {
        // let it go — don't prevent
      }
    }, { passive: true });

    // ── 4. Tap-outside modal to close ────────────────────
    document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          const modalId = overlay.id;
          if (modalId) tutupModal(modalId);
        }
      });
    });

    // ── 5. iOS input zoom prevention (font-size enforcement) ─
    // Already handled by CSS font-size:16px on inputs.

    // ── 6. Detect mobile & set CSS class ─────────────────
    (function() {
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      const isAndroid = /Android/.test(ua);
      const isMobile = isIOS || isAndroid || window.innerWidth < 641;
      if (isIOS) document.documentElement.classList.add('ios');
      if (isAndroid) document.documentElement.classList.add('android');
      if (isMobile) document.documentElement.classList.add('is-mobile');
      // PWA standalone mode
      if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        document.documentElement.classList.add('pwa');
      }
    })();

    // ── 7. Adaptive nav: hide labels on very small screens ─
    (function() {
      function adaptNav() {
        const nav = document.querySelector('nav');
        if (!nav) return;
        const btns = nav.querySelectorAll('.nav-btn');
        const visibleBtns = [...btns].filter(b => b.style.display !== 'none');
        const tooMany = visibleBtns.length > 8 && window.innerWidth < 380;
        visibleBtns.forEach(btn => {
          const lbl = btn.querySelector('.nav-label');
          if (lbl && tooMany) lbl.style.fontSize = '.5rem';
          else if (lbl) lbl.style.fontSize = '';
        });
      }
      adaptNav();
      window.addEventListener('resize', adaptNav);
    })();

    // ── 8. Smooth active nav indicator ───────────────────
    const _origShowPage = window.showPage;
    window.showPage = function(page, btn) {
      if (_origShowPage) _origShowPage(page, btn);
      // Scroll active nav button into view on mobile
      if (btn && window.innerWidth <= 640) {
        setTimeout(() => btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 50);
      }
      // Scroll main content to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── 9. Haptic feedback shim (Android Chrome) ─────────
    function haptic(type) {
      if (!navigator.vibrate) return;
      if (type === 'light') navigator.vibrate(8);
      else if (type === 'medium') navigator.vibrate(20);
      else if (type === 'success') navigator.vibrate([10, 50, 10]);
    }
    // Attach haptic to primary action buttons
    document.querySelectorAll('.btn-primary, .btn-accent').forEach(function(btn) {
      btn.addEventListener('touchstart', function() { haptic('light'); }, { passive: true });
    });

    // ── 10. Dynamic viewport height fix (mobile address bar) ─
    function setVh() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', vh + 'px');
    }
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', function() { setTimeout(setVh, 300); });

    // ── 11. Network status indicator ─────────────────────
    function updateOnlineStatus() {
      const offline = !navigator.onLine;
      let bar = document.getElementById('offlineBar');
      if (offline) {
        if (!bar) {
          bar = document.createElement('div');
          bar.id = 'offlineBar';
          bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#c0392b;color:white;text-align:center;font-size:.78rem;font-weight:600;padding:6px;';
          bar.textContent = '⚠️ Tidak ada koneksi internet — data akan disimpan lokal';
          document.body.prepend(bar);
        }
      } else {
        if (bar) bar.remove();
      }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // ── 12. Form auto-scroll to first error on mobile ────
    document.addEventListener('invalid', function(e) {
      if (window.innerWidth <= 640) {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, true);

    // ── 13. Double-tap to zoom prevention on buttons ─────
    // Hanya ketukan ganda pada tombol YANG SAMA yang dicegah — dulu ketukan cepat pada
    // dua tombol berbeda (mis. ✏️ lalu 🗑️, atau + lalu Simpan) membuat ketukan kedua hilang.
    let lastTap = 0, lastTapEl = null;
    document.addEventListener('touchend', function(e) {
      const now = Date.now();
      const el = e.target.closest('.btn, .nav-btn');
      if (el && el === lastTapEl && now - lastTap < 300) {
        e.preventDefault();
      }
      lastTap = now; lastTapEl = el;
    }, { passive: false });


    // ── PWA Install Prompt ────────────────────────────────
    let _pwaPrompt = null;
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      _pwaPrompt = e;
      const btn = document.getElementById('btnInstallPWA');
      if (btn) btn.style.display = 'inline-flex';
    });
    window.installPWA = function() {
      if (!_pwaPrompt) return;
      _pwaPrompt.prompt();
      _pwaPrompt.userChoice.then(function(result) {
        if (result.outcome === 'accepted') {
          const btn = document.getElementById('btnInstallPWA');
          if (btn) btn.style.display = 'none';
        }
        _pwaPrompt = null;
      });
    };
    window.addEventListener('appinstalled', function() {
      const btn = document.getElementById('btnInstallPWA');
      if (btn) btn.style.display = 'none';
    });

    // ── Daftarkan Service Worker (wajib agar aplikasi bisa di-install/PWA) ──
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('service-worker.js')
          .then(function(reg) {
            Logger_PWA('Service worker terdaftar: ' + reg.scope);
          })
          .catch(function(err) {
            Logger_PWA('Gagal daftar service worker: ' + err.message);
          });
      });
    }
    function Logger_PWA(msg) { try { console.log('[SIMKEDA PWA] ' + msg); } catch(e) {} }
