    // Tanggal LOKAL (YYYY-MM-DD). Jangan pakai toISOString() untuk "hari ini": itu UTC, sehingga
    // pukul 00:00–06:59 WIB tanggalnya mundur sehari (formulir & laporan salah tanggal).
    function isoLokal(d) {
      d = d ? new Date(d) : new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // ══════════════════════════════════════════════════════
    //  NAV DROPDOWN: menu > submenu > anak submenu
    // ══════════════════════════════════════════════════════
    function closeAllNavGroups(exceptGroup) {
      document.querySelectorAll('#mainNav .nav-group.open').forEach(function (g) {
        if (g !== exceptGroup) g.classList.remove('open');
      });
    }
    function closeAllNavSubmenus(exceptSub) {
      document.querySelectorAll('#mainNav .nav-submenu.open').forEach(function (s) {
        if (s !== exceptSub) s.classList.remove('open');
      });
    }
    // Di layar mobile, panel dropdown "dipin" sebagai floating panel (position:fixed)
    // relatif terhadap nav bar — bukan relatif terhadap tombol pemicu yang sempit,
    // supaya tidak kepotong / tergeser saat nav-nya bisa discroll horizontal.
    // PENTING: di mobile, nav adalah BOTTOM BAR (position:fixed;bottom:0) — jadi
    // panel harus mengambang DI ATAS nav, bukan di bawahnya (kalau tidak, panel
    // akan terdorong keluar viewport di bawah layar dan jadi tidak terlihat/tidak
    // bisa disentuh sama sekali — persis gejala "klik menu tidak muncul apa-apa").
    function positionMobileNavPanel(group) {
      const panel = group.querySelector(':scope > .nav-dropdown-panel');
      if (!panel) return;
      if (window.innerWidth <= 640 && group.classList.contains('open')) {
        const navEl = document.getElementById('mainNav');
        const rect = navEl.getBoundingClientRect();
        panel.style.position = 'fixed';
        // Nav mobile ada di bawah (bottom:0) → buka panel ke ATAS nav
        panel.style.bottom = Math.round(window.innerHeight - rect.top) + 'px';
        panel.style.top = 'auto';
        panel.style.left = '10px';
        panel.style.right = '10px';
      } else {
        panel.style.position = '';
        panel.style.top = '';
        panel.style.bottom = '';
        panel.style.left = '';
        panel.style.right = '';
      }
    }
    window.toggleNavGroup = function (btn) {
      const group = btn.closest('.nav-group');
      const isOpen = group.classList.contains('open');
      closeAllNavGroups(group);
      if (!isOpen) {
        group.classList.add('open');
        positionMobileNavPanel(group);
      } else {
        group.classList.remove('open');
        closeAllNavSubmenus(null);
        positionMobileNavPanel(group);
      }
    };
    window.addEventListener('resize', function () {
      document.querySelectorAll('#mainNav .nav-group').forEach(positionMobileNavPanel);
    });
    window.toggleNavSubmenu = function (btn) {
      const sub = btn.closest('.nav-submenu');
      const isOpen = sub.classList.contains('open');
      closeAllNavSubmenus(sub);
      sub.classList.toggle('open', !isOpen);
    };
    // Klik item paling dalam (nav-btn) menutup seluruh menu setelah navigasi
    document.addEventListener('click', function (e) {
      const leaf = e.target.closest('#mainNav .nav-dropdown-panel .nav-btn, #mainNav .nav-anak-panel .nav-btn');
      if (leaf) {
        const openGroups = document.querySelectorAll('#mainNav .nav-group.open');
        closeAllNavGroups(null);
        closeAllNavSubmenus(null);
        openGroups.forEach(positionMobileNavPanel);
      }
    });
    // Klik di luar nav menutup semua dropdown
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#mainNav') && !e.target.closest('.nav-dropdown-panel')) {
        const openGroups = document.querySelectorAll('#mainNav .nav-group.open');
        closeAllNavGroups(null);
        closeAllNavSubmenus(null);
        openGroups.forEach(positionMobileNavPanel);
      }
    });
    // Tandai grup sebagai "aktif" (has-active) kalau salah satu item di dalamnya adalah halaman aktif
    function syncNavGroupActiveState() {
      document.querySelectorAll('#mainNav .nav-group').forEach(function (grp) {
        const hasActive = !!grp.querySelector('.nav-btn.active');
        grp.classList.toggle('has-active', hasActive);
      });
    }
    const _navObserver = new MutationObserver(syncNavGroupActiveState);
    document.querySelectorAll('#mainNav .nav-btn').forEach(function (b) {
      _navObserver.observe(b, { attributes: true, attributeFilter: ['class'] });
    });
    syncNavGroupActiveState();
  
