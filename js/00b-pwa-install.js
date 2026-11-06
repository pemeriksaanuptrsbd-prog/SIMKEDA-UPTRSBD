        function toggleKasiQuickNavGrp(btn) {
          const body = btn.nextElementSibling;
          const chev = btn.querySelector('.kasi-qn-chev');
          const open = body.style.display !== 'none';
          body.style.display = open ? 'none' : 'block';
          if (chev) chev.style.transform = open ? '' : 'rotate(180deg)';
        }
        // ── "Ke bagian" dropdown mengambang (dipakai Lap. Kasi & Stok Obat) ──
        window.toggleQuickNav = function (btn) {
          const wrap = btn.closest('.quicknav-wrap');
          const isOpen = wrap.classList.contains('open');
          document.querySelectorAll('.quicknav-wrap.open').forEach(function (w) {
            if (w !== wrap) w.classList.remove('open');
          });
          wrap.classList.toggle('open', !isOpen);
        };
        // ── Tab sungguhan: sembunyikan semua bagian ber-prefix, tampilkan 1 saja ──
        window.showQuickSection = function (prefix, sectionId, label, itemEl) {
          document.querySelectorAll('[id^="' + prefix + '-sec-"]').forEach(function (el) {
            el.style.display = 'none';
          });
          const target = document.getElementById(sectionId);
          if (target) { target.style.display = ''; target.scrollIntoView({behavior:'instant',block:'start'}); }
          const wrap = document.getElementById(prefix + 'QuickNav');
          if (wrap) {
            const labelSpan = wrap.querySelector('.quicknav-trigger span:first-child');
            if (labelSpan) labelSpan.textContent = label;
            wrap.querySelectorAll('.kasi-qn-item').forEach(function (it) { it.classList.remove('kasi-qn-item-active'); });
            wrap.classList.remove('open');
          }
          if (itemEl) itemEl.classList.add('kasi-qn-item-active');
        };
        // ── Set bagian pertama sebagai default aktif saat halaman pertama kali dimuat ──
        window.initQuickSections = function (prefix, defaultSectionId, defaultLabel) {
          const wrap = document.getElementById(prefix + 'QuickNav');
          if (!wrap) return;
          document.querySelectorAll('[id^="' + prefix + '-sec-"]').forEach(function (el) {
            el.style.display = (el.id === defaultSectionId) ? '' : 'none';
          });
          const labelSpan = wrap.querySelector('.quicknav-trigger span:first-child');
          if (labelSpan) labelSpan.textContent = defaultLabel;
        };
        document.addEventListener('click', function (e) {
          // klik salah satu bagian -> tutup dropdown setelah scroll ke bagian tsb
          if (e.target.closest('.quicknav-panel .kasi-qn-item')) {
            document.querySelectorAll('.quicknav-wrap.open').forEach(function (w) { w.classList.remove('open'); });
            return;
          }
          // klik di luar quicknav -> tutup
          if (!e.target.closest('.quicknav-wrap')) {
            document.querySelectorAll('.quicknav-wrap.open').forEach(function (w) { w.classList.remove('open'); });
          }
        });
      
