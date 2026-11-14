    // ══════════════════════════════════════════════════════
    //  PEMBERITAHUAN DASHBOARD: stok obat, kedaluwarsa, kontrol ulang
    // ══════════════════════════════════════════════════════
    function hitungPemberitahuan(hariIni) {
      const hi = hariIni || new Date();
      const awalHari = new Date(hi.getFullYear(), hi.getMonth(), hi.getDate()).getTime();
      const hasil = { habis: [], menipis: [], kedaluwarsa: [], segeraKedaluwarsa: [], kontrolTerlewat: [], kontrolDekat: [] };
      (state.stokObat || []).forEach(function(o) {
        if (!o || !o.nama) return;
        const stok = Number(o.stok) || 0, min = Number(o.minimum) || 10;
        if (stok <= 0) hasil.habis.push(o.nama);
        else if (stok <= min) hasil.menipis.push(o.nama + ' (' + stok + ')');
        if (o.kadaluarsa) {
          const t = _tglLokalMs(o.kadaluarsa);
          if (!isNaN(t)) {
            const sisa = Math.round((t - awalHari) / 86400000);
            if (sisa < 0) hasil.kedaluwarsa.push(o.nama + ' (' + o.kadaluarsa + ')');
            else if (sisa <= 30) hasil.segeraKedaluwarsa.push(o.nama + ' (' + sisa + ' hari)');
          }
        }
      });
      // (Pengingat kontrol ulang dihapus: kolom Jadwal Kontrol Ulang sudah tidak ada di form pemeriksaan.)
      return hasil;
    }
    // "YYYY-MM-DD" → tengah malam waktu LOKAL. new Date('2026-10-17') dibaca sebagai jam 00:00 UTC
    // (07:00 WIB), sehingga obat yang kedaluwarsa KEMARIN dulu tampil "segera kedaluwarsa 0 hari".
    function _tglLokalMs(v) {
      const m = String(v == null ? '' : v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
      const d = new Date(v);
      return isNaN(d.getTime()) ? NaN : new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }
    function renderPemberitahuan() {
      const el = document.getElementById('dashPemberitahuan');
      if (!el) return;
      const h = hitungPemberitahuan();
      const baris = [];
      const daftar = function(arr, maks, f) { return arr.slice(0, maks).map(f || String).map(escHtml).join(', ') + (arr.length > maks ? ' …+' + (arr.length - maks) : ''); };
      if (h.habis.length) baris.push(['#c0392b', '🔴 Obat habis (' + h.habis.length + ')', daftar(h.habis, 6)]);
      if (h.menipis.length) baris.push(['#d68910', '⚠️ Obat hampir habis (' + h.menipis.length + ')', daftar(h.menipis, 6)]);
      if (h.kedaluwarsa.length) baris.push(['#c0392b', '⛔ Obat kedaluwarsa (' + h.kedaluwarsa.length + ')', daftar(h.kedaluwarsa, 6)]);
      if (h.segeraKedaluwarsa.length) baris.push(['#d68910', '⏳ Obat segera kedaluwarsa ≤30 hari (' + h.segeraKedaluwarsa.length + ')', daftar(h.segeraKedaluwarsa, 6)]);
      if (h.kontrolTerlewat.length) baris.push(['#c0392b', '📅 Kontrol ulang terlewat (' + h.kontrolTerlewat.length + ')', daftar(h.kontrolTerlewat, 6, function(k) { return k.nama + ' (' + k.hari + ' hari)'; })]);
      if (h.kontrolDekat.length) baris.push(['#1a6b4a', '📅 Kontrol ulang ≤7 hari (' + h.kontrolDekat.length + ')', daftar(h.kontrolDekat, 6, function(k) { return k.nama + (k.hari === 0 ? ' (hari ini)' : ' (' + k.hari + ' hari lagi)'); })]);
      if (!baris.length) { el.innerHTML = ''; return; }
      el.innerHTML = '<div style="background:#fff;border-radius:12px;border:1px solid #e3e8e5;padding:.9rem 1.1rem;box-shadow:0 1px 4px rgba(0,0,0,.05);">' +
        '<div style="font-weight:700;margin-bottom:.5rem;">🔔 Pemberitahuan</div>' +
        baris.map(function(b) { return '<div style="font-size:.86rem;padding:3px 0;"><span style="color:' + escHtml(b[0]) + ';font-weight:600;">' + escHtml(b[1]) + ':</span> ' + escHtml(b[2]) + '</div>'; }).join('') + '</div>';
    }

    // ══════════════════════════════════════════════════════
    //  JEJAK AUDIT (khusus admin; data dari server)
    // ══════════════════════════════════════════════════════
    let _auditData = [];
    async function muatAudit() {
      if (!state.scriptUrl) { showAlert('alertAudit', 'warning', '⚠️ URL Apps Script belum diatur.'); return; }
      showAlert('alertAudit', 'info', '⏳ Memuat…');
      try {
        const resp = await fetch(state.scriptUrl + '?action=loadAudit');
        const json = JSON.parse(await resp.text());
        if (!json.ok) throw new Error(json.error || 'ditolak');
        _auditData = json.data || [];
        showAlert('alertAudit', 'success', '✅ ' + _auditData.length + ' catatan dimuat.');
        renderAudit();
      } catch (e) { showAlert('alertAudit', 'error', '❌ Gagal memuat: ' + e.message); }
    }
    function renderAudit() {
      const tb = document.getElementById('auditBody');
      if (!tb) return;
      const role = (document.getElementById('filterAuditRole') || {}).value || '';
      const q = ((document.getElementById('filterAuditAksi') || {}).value || '').toLowerCase();
      const list = _auditData.filter(function(r) {
        return (!role || r.role === role) && (!q || String(r.action).toLowerCase().includes(q) || String(r.idData).toLowerCase().includes(q));
      });
      if (!list.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:1rem;">Tidak ada catatan</td></tr>'; return; }
      tb.innerHTML = list.map(function(r) {
        const d = new Date(r.waktu);
        const w = isNaN(d.getTime()) ? escHtml(r.waktu) : d.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
        return '<tr><td>' + escHtml(w) + '</td><td>' + escHtml(r.role) + '</td><td>' + escHtml(String(r.deviceId).slice(0, 14)) + '</td><td>' + escHtml(r.action) + '</td><td>' + escHtml(r.idData) + '</td></tr>';
      }).join('');
    }

    // ══════════════════════════════════════════════════════
    //  EKSPOR EXCEL SEMUA DATA + BACKUP SERVER
    // ══════════════════════════════════════════════════════
    function _pastikanXLSX() {
      return new Promise(function(res, rej) {
        if (window.XLSX) return res(window.XLSX);
        const sc = document.createElement('script');
        sc.src = 'vendor/xlsx.bundle.js';   // salinan lokal (jalan offline)
        let cobaCdn = false;
        sc.onload = function() { window.XLSX ? res(window.XLSX) : rej(new Error('library tidak termuat')); };
        sc.onerror = function() {
          if (!cobaCdn) { cobaCdn = true; sc.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js'; return; }   // cadangan
          rej(new Error('library Excel tidak bisa dimuat'));
        };
        document.head.appendChild(sc);
      });
    }
    // Susun satu baris jadi nilai sel yang aman untuk Excel (batas 32.767 karakter; gambar tidak ikut)
    function _selExcel(v) {
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') v = JSON.stringify(v);
      v = String(v);
      if (v.indexOf('data:image') === 0 || v.indexOf('data:application') === 0) return '[gambar/berkas tidak diekspor]';
      return v.length > 32000 ? v.slice(0, 32000) + '…' : v;
    }
    function susunLembarExcel(daftar) {
      const kolom = [];
      daftar.forEach(function(r) { Object.keys(r || {}).forEach(function(k) { if (kolom.indexOf(k) === -1) kolom.push(k); }); });
      return daftar.map(function(r) { const o = {}; kolom.forEach(function(k) { o[k] = _selExcel(r[k]); }); return o; });
    }
    async function eksporExcelSemua() {
      if (!confirm('File Excel akan berisi SEMUA data kesehatan penerima manfaat. Simpan di tempat aman dan jangan dibagikan sembarangan.\n\nLanjutkan?')) return;
      try {
        const X = await _pastikanXLSX();
        const wb = X.utils.book_new();
        const lembar = [['Penerima', 'penerima'], ['Pemeriksaan', 'pemeriksaan'], ['PengukuranAwal', 'pengukuranAwal'], ['Insidental', 'insidental'],
          ['Rujukan', 'rujukan'], ['AsesmenAwal', 'asesmenAwal'], ['StokObat', 'stokObat'], ['ObatKeluar', 'obatKeluar']];
        lembar.forEach(function(l) {
          const baris = susunLembarExcel((state[l[1]] || []).filter(function(r) { return r && !r._deleted; }));
          X.utils.book_append_sheet(wb, X.utils.json_to_sheet(baris.length ? baris : [{ info: 'Tidak ada data' }]), l[0]);
        });
        X.writeFile(wb, 'SIMKEDA-data-' + isoLokal(new Date()) + '.xlsx');
        showAlert('alertAdminData', 'success', '✅ File Excel dibuat (' + lembar.length + ' lembar). Foto dan tanda tangan tidak ikut diekspor.');
      } catch (e) { showAlert('alertAdminData', 'error', '❌ Gagal ekspor Excel: ' + e.message); }
    }
    async function backupServerSekarang() {
      if (!state.scriptUrl) { showAlert('alertAdminData', 'warning', '⚠️ URL Apps Script belum diatur.'); return; }
      if (!confirm('Buat salinan cadangan spreadsheet di Google Drive sekarang?')) return;
      showAlert('alertAdminData', 'info', '⏳ Membuat cadangan di Drive…');
      const r = await _postKeServer('backupSekarang', {});
      if (r.status === 'ok') showAlert('alertAdminData', 'success', '✅ Cadangan dibuat di folder yang sama dengan spreadsheet (nama berakhiran "Backup tanggal").');
      else showAlert('alertAdminData', 'error', '❌ Gagal membuat cadangan: ' + r.error);
    }

    // ── (usang) Server tidak lagi mengirim hash PIN; fungsi dibiarkan agar pemanggil lama tetap aman.
    // ── Tarik hash PIN dari server (globalProfile) agar semua perangkat
    //    memakai PIN yang sama, bukan default lokal per-browser. ──
    function syncPinsFromProfile(profile) {
      if (!profile || typeof profile !== 'object') return;
      if (profile.pinPetugas) state.pinPetugas = profile.pinPetugas;
      if (profile.pinDokter)  state.pinDokter  = profile.pinDokter;
      if (profile.pinKasi)    state.pinKasi    = profile.pinKasi;
      if (profile.pinAdmin)   state.pinAdmin   = profile.pinAdmin;
    }
