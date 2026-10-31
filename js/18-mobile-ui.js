    // ══════════════════════════════════════
    //  KEMUDAHAN PAKAI (v13): menu bawah HP, aksi cepat dashboard, Asesmen bertahap
    //  Tidak mengubah logika data; hanya membungkus fungsi tampilan yang sudah ada.
    // ══════════════════════════════════════
    (function () {
      'use strict';

      // ── Util ──
      function visibleBtn(id) {
        const b = document.getElementById(id);
        return (b && b.style.display !== 'none') ? b : null;
      }
      function pageOf(btn) {
        const m = (btn.getAttribute('onclick') || '').match(/showPage\('([^']+)'/);
        return m ? m[1] : '';
      }
      function esc(s) { return (typeof escHtml === 'function') ? escHtml(s) : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
      function iconOf(btn) { const i = btn.querySelector('.nav-icon'); return i ? i.textContent : ''; }
      function labelOf(btn) {
        const l = btn.querySelector('.nav-label'); if (!l) return '';
        let t = ''; l.childNodes.forEach(n => { if (n.nodeType === 3) t += n.textContent; });
        return t.trim();
      }
      function activePageId() {
        const a = document.querySelector('.page.active');
        return a ? a.id.replace('page-', '') : '';
      }

      // ── Menu bawah HP ──
      // Tombol langsung: Beranda + 2 halaman utama sesuai peran (yang tampil untuk peran itu) + Menu
      const PRIORITAS = [['navAntrian', 'Antrian'], ['navPendaftaran', 'Data PM'], ['navPemeriksaan', 'Periksa'], ['navAsesmen', 'Asesmen'], ['navKasi', 'Laporan'], ['navRekap', 'Rekap']];

      function renderTabbar() {
        const bar = document.getElementById('mobileTabbar');
        if (!bar) return;
        const aktif = activePageId();
        const items = [{ page: 'dashboard', ico: '🏠', lbl: 'Beranda', btn: document.querySelector('#mainNav > .nav-btn') }];
        PRIORITAS.forEach(([id, lbl]) => {
          const b = visibleBtn(id);
          if (b && items.length < 3) items.push({ page: pageOf(b), ico: iconOf(b), lbl, btn: b });
        });
        let html = items.map(it =>
          '<button type="button" data-page="' + esc(it.page) + '" class="' + (aktif === it.page ? 'active' : '') + '">' +
          '<span class="t-ico">' + esc(it.ico) + '</span><span>' + esc(it.lbl) + '</span>' +
          (it.page === 'antrian' ? '<span class="t-badge" id="tabAntrianBadge" style="display:none"></span>' : '') +
          '</button>').join('');
        const adaDiMenu = !items.some(it => it.page === aktif) && aktif;
        html += '<button type="button" data-menu="1" class="' + (adaDiMenu ? 'active' : '') + '"><span class="t-ico">☰</span><span>Menu</span></button>';
        bar.innerHTML = html;
        bar.querySelectorAll('button[data-page]').forEach(function (el, i) {
          el.onclick = function () { showPage(items[i].page, items[i].btn); };
        });
        bar.querySelector('button[data-menu]').onclick = openMenuSheet;
        syncAntrianBadge();
      }

      function syncAntrianBadge() {
        const src = document.getElementById('antrianCount'), dst = document.getElementById('tabAntrianBadge');
        if (!dst) return;
        const n = src ? parseInt(src.textContent, 10) || 0 : 0;
        dst.textContent = n; dst.style.display = n > 0 ? '' : 'none';
      }

      function renderMenuSheet() {
        const sh = document.getElementById('menuSheet');
        if (!sh) return;
        const aktif = activePageId();
        let html = '';
        document.querySelectorAll('#mainNav > .nav-btn, #mainNav > .nav-group').forEach(function (el) {
          if (el.classList.contains('nav-btn')) {
            html += '<h4>Utama</h4><div class="ms-grid">' + itemHtml(el, aktif) + '</div>';
          } else {
            const judul = el.querySelector('.nav-group-trigger .nav-label');
            const btns = [...el.querySelectorAll('.nav-dropdown-panel .nav-btn')].filter(b => b.style.display !== 'none');
            if (!btns.length) return;
            html += '<h4>' + esc(judul ? judul.textContent : '') + '</h4><div class="ms-grid">' + btns.map(b => itemHtml(b, aktif)).join('') + '</div>';
          }
        });
        html += '<h4>Akun</h4><div class="ms-grid"><button type="button" class="ms-item" data-act="peran"><span class="ms-ico">👤</span><span>Ganti pengguna</span></button></div>';
        sh.innerHTML = html;
        const semua = [...document.querySelectorAll('#mainNav .nav-btn')].filter(b => b.style.display !== 'none');
        sh.querySelectorAll('button[data-src]').forEach(function (el) {
          el.onclick = function () {
            const b = semua[parseInt(el.getAttribute('data-src'), 10)];
            closeMenuSheet();
            if (b) showPage(pageOf(b), b);
          };
        });
        const pr = sh.querySelector('button[data-act="peran"]');
        if (pr) pr.onclick = function () { closeMenuSheet(); toggleRoleModal(); };
      }
      function itemHtml(btn, aktif) {
        const semua = [...document.querySelectorAll('#mainNav .nav-btn')].filter(b => b.style.display !== 'none');
        const idx = semua.indexOf(btn);
        return '<button type="button" class="ms-item ' + (pageOf(btn) === aktif ? 'active' : '') + '" data-src="' + idx + '">' +
          '<span class="ms-ico">' + esc(iconOf(btn)) + '</span><span>' + esc(labelOf(btn)) + '</span></button>';
      }
      window.openMenuSheet = function () { renderMenuSheet(); document.body.classList.add('menu-open'); };
      window.closeMenuSheet = function () { document.body.classList.remove('menu-open'); };

      // ── Aksi cepat di Dashboard (sesuai peran) ──
      function renderAksiCepat() {
        const box = document.getElementById('dashAksi');
        if (!box) return;
        const defs = [
          ['navAntrian', '🔢', 'Kelola Antrian', 'Panggil & catat PM hari ini'],
          ['navPendaftaran', '👥', 'Data PM', 'Cari / daftarkan PM'],
          ['navPengukuran', '📋', 'Pengukuran Awal', 'Tensi, BB, TB'],
          ['navPemeriksaan', '🩺', 'Periksa Dokter', 'Pemeriksaan PM'],
          ['navAsesmen', '📝', 'Asesmen Awal', 'PM baru masuk'],
          ['navKasi', '👔', 'Laporan Kasi', 'Ringkasan & monitoring'],
          ['navRekap', '📅', 'Rekap', 'Rekap kegiatan']
        ];
        const pilih = [];
        defs.forEach(d => { const b = visibleBtn(d[0]); if (b && pilih.length < 3) pilih.push({ b: b, d: d }); });
        box.innerHTML = pilih.map(p =>
          '<button type="button" class="dash-aksi-btn"><span class="ico">' + esc(p.d[1]) + '</span><span>' + esc(p.d[2]) + '<small>' + esc(p.d[3]) + '</small></span></button>').join('');
        box.querySelectorAll('button').forEach(function (el, i) { el.onclick = function () { showPage(pageOf(pilih[i].b), pilih[i].b); }; });
      }

      // ── Bungkus fungsi yang ada (tanpa mengubah isinya) ──
      function bungkus(nama, sesudah) {
        const asli = window[nama];
        if (typeof asli !== 'function') return;
        window[nama] = function () {
          const r = asli.apply(this, arguments);
          try { sesudah(); } catch (e) { console.warn('mobile-ui', nama, e); }
          return r;
        };
      }
      bungkus('showPage', function () { renderTabbar(); closeMenuSheet(); window.scrollTo(0, 0); });
      bungkus('setRole', function () { renderTabbar(); renderAksiCepat(); });
      bungkus('renderDashboard', function () { renderAksiCepat(); syncAntrianBadge(); });
      bungkus('renderAntrian', syncAntrianBadge);

      // Badge antrian ikut berubah kapan pun angkanya berubah
      const src = document.getElementById('antrianCount');
      if (src && window.MutationObserver) new MutationObserver(syncAntrianBadge).observe(src, { childList: true, characterData: true, subtree: true });

      // ── Asesmen Awal bertahap ──
      function initAsesmenBertahap() {
        const page = document.getElementById('page-asesmen');
        const steps = page ? [...page.querySelectorAll('.asm-step')] : [];
        if (steps.length < 2 || page.querySelector('.asm-stepbar')) return;
        const parent = steps[0].parentNode;
        parent.classList.add('asm-steps-on');
        let cur = 0;

        const bar = document.createElement('div');
        bar.className = 'asm-stepbar';
        bar.innerHTML = '<div class="asm-prog"><i></i></div><div class="asm-tabs"></div>' +
          '<div class="asm-ket"><span class="asm-info"></span><a class="asm-semua">Tampilkan semua bagian</a></div>';
        parent.insertBefore(bar, steps[0]);

        const pager = document.createElement('div');
        pager.className = 'asm-pager on';
        pager.innerHTML = '<button type="button" class="btn btn-ghost asm-prev">← Sebelumnya</button><button type="button" class="btn btn-primary asm-next">Berikutnya →</button>';
        steps[steps.length - 1].after(pager);

        const tabs = bar.querySelector('.asm-tabs');
        steps.forEach(function (s, i) {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = (i + 1) + '. ' + s.getAttribute('data-step-label');
          b.onclick = function () { pergi(i); };
          tabs.appendChild(b);
        });

        function pergi(i, tanpaGulir) {
          cur = Math.max(0, Math.min(steps.length - 1, i));
          steps.forEach((s, k) => s.classList.toggle('asm-cur', k === cur));
          [...tabs.children].forEach((b, k) => { b.classList.toggle('cur', k === cur); b.classList.toggle('done', k < cur); });
          bar.querySelector('.asm-prog > i').style.width = ((cur + 1) / steps.length * 100) + '%';
          bar.querySelector('.asm-info').textContent = 'Langkah ' + (cur + 1) + ' dari ' + steps.length;
          pager.querySelector('.asm-prev').style.visibility = cur === 0 ? 'hidden' : '';
          pager.querySelector('.asm-next').style.display = cur === steps.length - 1 ? 'none' : '';
          const aktif = tabs.children[cur]; if (aktif && aktif.scrollIntoView) aktif.scrollIntoView({ block: 'nearest', inline: 'center' });
          if (!tanpaGulir) bar.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
        pager.querySelector('.asm-prev').onclick = function () { pergi(cur - 1); };
        pager.querySelector('.asm-next').onclick = function () { pergi(cur + 1); };

        let semua = false;
        bar.querySelector('.asm-semua').onclick = function () {
          semua = !semua;
          parent.classList.toggle('asm-steps-on', !semua);
          pager.classList.toggle('on', !semua);
          tabs.style.display = semua ? 'none' : '';
          this.textContent = semua ? 'Kembali ke langkah bertahap' : 'Tampilkan semua bagian';
          bar.querySelector('.asm-info').textContent = semua ? 'Semua bagian ditampilkan' : 'Langkah ' + (cur + 1) + ' dari ' + steps.length;
        };

        // Form direset → kembali ke langkah 1
        const asliReset = window.resetFormAsesmen;
        if (typeof asliReset === 'function') window.resetFormAsesmen = function () { const r = asliReset.apply(this, arguments); pergi(0, true); return r; };
        pergi(0, true);
      }


      // ── Draf Asesmen otomatis (disimpan di perangkat ini, ditawarkan kembali saat halaman dibuka) ──
      function initDrafAsesmen() {
        const page = document.getElementById('page-asesmen');
        const card = page ? page.querySelector('.card') : null;
        if (!card) return;
        const KUNCI = 'simkeda_draf_asesmen', BATAS_HARI = 7;
        const lsGet = () => { try { return JSON.parse(localStorage.getItem(KUNCI) || 'null'); } catch (e) { return null; } };
        const lsSet = (v) => { try { v ? localStorage.setItem(KUNCI, JSON.stringify(v)) : localStorage.removeItem(KUNCI); } catch (e) { /* penyimpanan penuh/diblokir: abaikan */ } };
        const kontrol = () => [...card.querySelectorAll('input, select, textarea')].filter(el => !['file', 'password', 'button', 'submit'].includes(el.type) && el.id !== 'asMMT');
        const kunci = (el) => el.id ? '#' + el.id : (el.type === 'radio' ? 'r:' + el.name + '=' + el.value : 'c:' + (el.className || el.name) + '=' + el.value);

        function ambil() {
          const d = {};
          kontrol().forEach(el => {
            if (el.type === 'radio' || el.type === 'checkbox') { if (el.checked) d[kunci(el)] = 1; }
            else if (el.value !== '') d[kunci(el)] = el.value;
          });
          return d;
        }
        function simpan() {
          if (typeof state !== 'undefined' && state._editAsesmenNI) return;            // sedang mengubah data yang sudah tersimpan
          const d = ambil();
          const isi = Object.keys(d).filter(k => k !== '#asesmenTgl' && k !== '#asesmenNamaDokter').length;
          const adaMMT = (typeof _mmtVals !== 'undefined') && _mmtVals.some(v => v !== '');
          if (!isi && !adaMMT) { lsSet(null); tampilBanner(); return; }                  // kosong → tidak ada draf
          lsSet({ t: Date.now(), mmt: (typeof _mmtVals !== 'undefined') ? _mmtVals.slice() : null, d: d });
        }
        let tunda = null;
        const jadwal = () => { clearTimeout(tunda); tunda = setTimeout(simpan, 700); };
        card.addEventListener('input', jadwal);
        card.addEventListener('change', jadwal);
        card.addEventListener('click', function (e) { if (e.target.closest('[id^="mmt"], .mmt-num')) jadwal(); });

        function pulihkan(dr) {
          const d = dr.d || {};
          const pm = d['#asesmenPilihanPM'];
          const sel = document.getElementById('asesmenPilihanPM');
          if (pm && sel) {
            sel.value = pm;
            const tampil = document.getElementById('asesmenPilihanPMDisplay'); if (tampil && d['#asesmenPilihanPMDisplay']) tampil.value = d['#asesmenPilihanPMDisplay'];
            if (typeof onPilihPMAsesmen === 'function') onPilihPMAsesmen();             // isi info PM, lalu isian draf menimpa
          }
          kontrol().forEach(el => {
            const k = kunci(el);
            if (el.type === 'radio' || el.type === 'checkbox') el.checked = !!d[k];
            else if (k in d) el.value = d[k];
          });
          if (dr.mmt && typeof mmtInit === 'function') { mmtInit(JSON.stringify(dr.mmt)); if (typeof mmtSave === 'function') mmtSave(); }
          tampilBanner();
          if (typeof showToast === 'function') showToast('✅ Draf asesmen dipulihkan');
        }

        function tampilBanner() {
          let b = document.getElementById('asmDrafBanner');
          const dr = lsGet();
          const kedaluwarsa = dr && (Date.now() - dr.t) > BATAS_HARI * 864e5;
          if (kedaluwarsa) { lsSet(null); }
          if (!dr || kedaluwarsa || (!Object.keys(dr.d || {}).length && !(dr.mmt || []).some(v => v !== ''))) { if (b) b.remove(); return; }
          if (!b) {
            b = document.createElement('div'); b.id = 'asmDrafBanner'; b.className = 'asm-draf';
            const sasaran = document.getElementById('alertAsesmen'); sasaran.parentNode.insertBefore(b, sasaran);
          }
          const w = new Date(dr.t);
          const nm = dr.d['#asNama'] ? ' untuk <strong>' + esc(dr.d['#asNama']) + '</strong>' : '';
          b.innerHTML = '<div>📝 Ada draf asesmen' + nm + ' yang belum disimpan (' + esc(w.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' ' + w.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })) + ').</div>' +
            '<div class="asm-draf-aksi"><button type="button" class="btn btn-primary btn-sm" data-a="lanjut">Lanjutkan</button><button type="button" class="btn btn-ghost btn-sm" data-a="buang">Buang</button></div>';
          b.querySelector('[data-a="lanjut"]').onclick = function () { pulihkan(dr); };
          b.querySelector('[data-a="buang"]').onclick = function () { if (confirm('Buang draf asesmen ini?')) { lsSet(null); tampilBanner(); } };
        }

        // Draf dihapus setelah berhasil disimpan atau form di-reset
        const asliSimpan = window.simpanAsesmen;
        if (typeof asliSimpan === 'function') window.simpanAsesmen = function () {
          const r = asliSimpan.apply(this, arguments);
          Promise.resolve(r).then(function () {
            const al = document.getElementById('alertAsesmen');
            if (al && al.classList.contains('alert-success')) { clearTimeout(tunda); lsSet(null); tampilBanner(); }
          });
          return r;
        };
        const asliReset2 = window.resetFormAsesmen;
        if (typeof asliReset2 === 'function') window.resetFormAsesmen = function () { const r = asliReset2.apply(this, arguments); clearTimeout(tunda); lsSet(null); tampilBanner(); return r; };

        // Banner dicek tiap halaman Asesmen dibuka
        bungkus('showPage', function () { if (activePageId() === 'asesmen') tampilBanner(); });
        tampilBanner();
      }

      // ── Mulai ──
      renderTabbar();
      renderAksiCepat();
      initAsesmenBertahap();
      initDrafAsesmen();
    })();
