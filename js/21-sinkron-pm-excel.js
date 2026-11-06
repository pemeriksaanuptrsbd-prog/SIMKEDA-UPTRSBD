// ══════════════════════════════════════════════════════════════
//  SIMKEDA v32 — SINKRON DATA PM DARI EXCEL (NOMINATIF + PENGHUNI)
//  Mencocokkan PM di Excel dengan PM di aplikasi lewat No. Reg / Nama.
//  - Yang cocok  : data diperbarui, RIWAYAT TIDAK DIUBAH/DIHAPUS.
//  - Nomor beda tetapi nama sama : Nomor Induk diganti (memakai fitur
//    "Ganti Nomor Induk" yang sudah ada) sehingga seluruh riwayat ikut pindah.
//  - Belum ada   : ditambahkan sebagai PM baru.
//  - Ada di aplikasi tapi tidak ada di Excel : TIDAK dihapus.
//  Data Excel (NIK dll.) hanya dibaca di peramban, tidak ikut tertanam di kode.
// ══════════════════════════════════════════════════════════════
(function (root) {
  'use strict';

  // ───────── Utilitas ─────────
  var BULAN = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12 };
  function s(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
  function p2(n) { return String(n).padStart(2, '0'); }

  function kunciNama(v) {
    var t = s(v).toUpperCase().split(',')[0];          // buang gelar setelah koma (mis. ",S.PD")
    return t.replace(/[^A-Z]/g, '');
  }
  function kunciReg(v) {
    return s(v).toUpperCase().replace(/\s+/g, '').replace(/\/1\//g, '/I/');   // "/1/" salah ketik untuk "/I/"
  }
  function intiReg(v) { var m = kunciReg(v).match(/^(\d{3,5})\/R\//); return m ? m[1] : ''; }
  function jarak(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length; if (!b.length) return a.length;
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }

  // Tanggal → { iso:'YYYY-MM-DD', pasti:true/false }. pasti=false bila hanya bulan/tahun.
  function tanggal(v) {
    if (v == null || v === '') return { iso: '', pasti: false };
    if (Object.prototype.toString.call(v) === '[object Date]') {
      if (isNaN(v.getTime())) return { iso: '', pasti: false };
      var d = new Date(v.getTime() + 12 * 3600 * 1000);   // hindari selisih zona waktu SheetJS
      return { iso: d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()), pasti: true };
    }
    var t = s(v), m;
    if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return { iso: m[1] + '-' + p2(m[2]) + '-' + p2(m[3]), pasti: true };
    if ((m = t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/))) {
      var dd = +m[1], bb = +m[2];
      if (bb >= 1 && bb <= 12 && dd >= 1 && dd <= 31) return { iso: m[3] + '-' + p2(bb) + '-' + p2(dd), pasti: true };
    }
    if ((m = t.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/)) && BULAN[m[2]]) return { iso: m[3] + '-' + p2(BULAN[m[2]]) + '-' + p2(m[1]), pasti: true };
    if ((m = t.toLowerCase().match(/^([a-z]+)\s+(\d{4})$/)) && BULAN[m[1]]) return { iso: m[2] + '-' + p2(BULAN[m[1]]) + '-01', pasti: false };
    return { iso: '', pasti: false };
  }

  // ───────── Baca NOMINATIF ─────────
  // rows = array of array (sheet_to_json header:1). Mengembalikan null bila bukan lembar nominatif.
  function bacaNominatif(rows) {
    var h = -1, i, j;
    for (i = 0; i < Math.min(rows.length, 20); i++) {
      var up = (rows[i] || []).map(function (c) { return s(c).toUpperCase(); });
      if (up.indexOf('REG') > -1 && up.indexOf('NAMA') > -1) { h = i; break; }
    }
    if (h < 0) return null;
    var head = rows[h].map(function (c) { return s(c).toUpperCase(); });
    var sub = (rows[h + 1] || []).map(function (c) { return s(c).toUpperCase(); });
    function kol(nama, mulai) { for (var k = mulai || 0; k < head.length; k++) if (head[k] === nama) return k; return -1; }
    function kolMulai(awal) { for (var k = 0; k < head.length; k++) if (head[k].indexOf(awal) === 0) return k; return -1; }
    var c = {
      reg: kol('REG'), nama: kol('NAMA'), tgl: kol('TANGGAL LAHIR'), jk: kol('L/P'), alamat: kol('ALAMAT'),
      nik: sub.indexOf('NIK'), masuk: kol('TGL MASUK'), bpjs: kolMulai('NO BPJS'), sebab: kolMulai('SEBAB CACAT')
    };
    if (c.reg < 0 || c.nama < 0) return null;
    var hasil = [];
    for (i = h + 1; i < rows.length; i++) {
      var r = rows[i] || [];
      var reg = s(r[c.reg]), nama = s(r[c.nama]);
      if (!reg || !nama || !/\d/.test(reg)) continue;
      var nik = c.nik > -1 ? s(r[c.nik]).replace(/\s/g, '') : '';
      var tm = tanggal(c.masuk > -1 ? r[c.masuk] : null);
      var jkRaw = c.jk > -1 ? s(r[c.jk]).toUpperCase() : '';
      hasil.push({
        reg: reg.replace(/\s+/g, ''),
        nama: nama,
        tglLahir: tanggal(c.tgl > -1 ? r[c.tgl] : null).iso,
        jenisKelamin: jkRaw === 'L' ? 'Laki-laki' : jkRaw === 'P' ? 'Perempuan' : '',
        alamat: c.alamat > -1 ? s(r[c.alamat]) : '',
        nik: nik,
        noBPJS: c.bpjs > -1 ? s(r[c.bpjs]).replace(/\s/g, '') : '',
        tglMasuk: tm.iso, tglMasukPasti: tm.pasti,
        sebabCacat: c.sebab > -1 ? s(r[c.sebab]) : ''
      });
    }
    return hasil;
  }

  // ───────── Baca PENGHUNI (asrama + kamar) ─────────
  function bacaPenghuni(rows) {
    var asrama = '', hasil = [], i, m;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i] || [], a = s(r[0]);
      if ((m = a.toUpperCase().match(/ASRAMA\s+(ASTRI|ASTRA)\s*(\d)/))) { asrama = m[1] + ' ' + m[2]; continue; }
      if (asrama && /^K-[A-Z0-9]+-\d+/i.test(a)) {
        [r[1], r[2]].forEach(function (n) { if (s(n)) hasil.push({ nama: s(n), asrama: asrama, kamar: a.toUpperCase() }); });
      }
    }
    return hasil.length ? hasil : null;
  }

  // Tempelkan asrama/kamar ke data nominatif lewat nama. → { dipakai, tidakCocok:[..] }
  function gabungPenghuni(nominatif, penghuni) {
    var tidak = [], pakai = 0;
    var kunci = nominatif.map(function (n) { return kunciNama(n.nama); });
    var dipakaiIdx = {};
    penghuni.forEach(function (ph) {
      var k = kunciNama(ph.nama), idx = kunci.indexOf(k);
      if (idx < 0) {
        var terbaik = -1, dBest = 99, seri = false;
        kunci.forEach(function (kn, j) {
          var d = jarak(k, kn);
          if (d < dBest) { dBest = d; terbaik = j; seri = false; } else if (d === dBest) seri = true;
        });
        if (dBest <= 2 && !seri && k.length >= 8) idx = terbaik;
      }
      if (idx < 0 || dipakaiIdx[idx]) { tidak.push(ph.nama); return; }
      dipakaiIdx[idx] = true;
      nominatif[idx].kamarBlok = ph.asrama; nominatif[idx].noKamar = ph.kamar; pakai++;
    });
    return { dipakai: pakai, tidakCocok: tidak };
  }

  // ───────── Pencocokan dengan PM di aplikasi ─────────
  var FIELD_LABEL = {
    nomorInduk: 'No. Induk', namaPM: 'Nama', tglLahir: 'Tgl lahir', jenisKelamin: 'Jenis kelamin', nik: 'NIK', noBPJS: 'No. BPJS',
    alamat: 'Alamat', kamarBlok: 'Asrama', noKamar: 'Kamar', tglMasuk: 'Tgl masuk', jenisDis: 'Jenis disabilitas'
  };

  // → { item:[{x, pm, cara, perubahan:{field:{lama,baru}}, catatan:[]}], tidakAda:[pm] }
  function susunRencana(excel, penerima) {
    var pakai = {}, item = [];
    var peta = penerima.map(function (p) { return { p: p, reg: kunciReg(p.nomorInduk), inti: intiReg(p.nomorInduk), nama: kunciNama(p.namaPM) }; });
    var nikApp = {};
    penerima.forEach(function (p) { if (p.nik) nikApp[String(p.nik).trim()] = p; });
    var nikExcel = {}, nikGanda = {};
    excel.forEach(function (x) { if (x.nik) { if (nikExcel[x.nik]) nikGanda[x.nik] = true; nikExcel[x.nik] = true; } });

    excel.forEach(function (x) {
      var kr = kunciReg(x.reg), kn = kunciNama(x.nama), cara = '', hit = null, k;
      function bebas(e) { return !pakai[e.p.nomorInduk]; }
      hit = peta.filter(function (e) { return e.reg === kr && bebas(e); })[0];
      if (hit) cara = 'reg';
      if (!hit) { k = peta.filter(function (e) { return e.nama === kn && bebas(e); }); if (k.length === 1) { hit = k[0]; cara = 'nama'; } }
      if (!hit) {
        var intiX = intiReg(x.reg);
        k = peta.filter(function (e) { return bebas(e) && intiX && e.inti === intiX && jarak(e.nama, kn) <= 4; });
        if (k.length === 1) { hit = k[0]; cara = 'mirip'; }
      }
      if (!hit && kn.length >= 8) {
        k = peta.filter(function (e) { return bebas(e) && jarak(e.nama, kn) <= 2; });
        if (k.length === 1) { hit = k[0]; cara = 'mirip'; }
      }
      var it = { x: x, pm: hit ? hit.p : null, cara: cara || 'baru', perubahan: {}, catatan: [], nikDiabaikan: false };
      if (hit) pakai[hit.p.nomorInduk] = true;

      var calon = {
        namaPM: x.nama, tglLahir: x.tglLahir, jenisKelamin: x.jenisKelamin, alamat: x.alamat, noBPJS: x.noBPJS,
        kamarBlok: x.kamarBlok || '', noKamar: x.noKamar || '', jenisDis: x.sebabCacat   // sebab/jenis cacat Excel = Jenis Disabilitas
      };
      if (it.cara !== 'reg' && it.cara !== 'baru') calon.nomorInduk = x.reg;
      // NIK: harus 16 digit & tidak boleh bentrok dengan PM lain
      if (x.nik) {
        if (!/^\d{16}$/.test(x.nik)) it.catatan.push('NIK di Excel tidak 16 digit → tidak dipakai');
        else if (nikGanda[x.nik]) it.catatan.push('NIK sama dengan PM lain di Excel → tidak dipakai')
        else if (nikApp[x.nik] && (!hit || nikApp[x.nik] !== hit.p)) it.catatan.push('NIK sudah dipakai PM lain di aplikasi → NIK tidak diubah');
        else calon.nik = x.nik;
      }
      // Tgl masuk: tanggal lengkap menimpa; bulan-tahun saja hanya mengisi yang kosong
      if (x.tglMasuk && (x.tglMasukPasti || !hit || !s(hit.p.tglMasuk))) calon.tglMasuk = x.tglMasuk;

      Object.keys(calon).forEach(function (f) {
        var baru = s(calon[f]); if (!baru) return;            // Excel kosong → jangan mengosongkan data aplikasi
        var lama = hit ? s(hit.p[f]) : '';
        if (f === 'nomorInduk' ? kunciReg(lama) !== kunciReg(baru) : lama !== baru) it.perubahan[f] = { lama: lama, baru: baru };
      });
      if (it.cara === 'baru') it.perubahan.nomorInduk = { lama: '', baru: x.reg };
      item.push(it);
    });
    var tidakAda = penerima.filter(function (p) { return !pakai[p.nomorInduk]; });
    return { item: item, tidakAda: tidakAda };
  }

  var API = { bacaNominatif: bacaNominatif, bacaPenghuni: bacaPenghuni, gabungPenghuni: gabungPenghuni, susunRencana: susunRencana, tanggal: tanggal, kunciNama: kunciNama, kunciReg: kunciReg, FIELD_LABEL: FIELD_LABEL };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  root.SinkronPM = API;

  // ═══════════════ ANTARMUKA (hanya di peramban) ═══════════════
  var _excel = null, _penghuniBaca = null, _rencana = null, _namaFileNom = '', _namaFilePh = '';

  function $(id) { return document.getElementById(id); }
  function pesan(jenis, html) { var a = $('sinkronAlert'); if (!a) return; a.className = 'alert alert-' + jenis + ' show'; a.innerHTML = html; }

  function bacaFile(file, cb) {
    loadSheetJS(function () {
      var fr = new FileReader();
      fr.onload = function (e) {
        try {
          var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
          var daftar = wb.SheetNames.map(function (n) { return XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }); });
          cb(null, daftar);
        } catch (err) { cb(err); }
      };
      fr.onerror = function () { cb(new Error('File tidak bisa dibaca')); };
      fr.readAsArrayBuffer(file);
    });
  }

  root.sinkronPilihNominatif = function (input) {
    var f = input.files && input.files[0]; if (!f) return;
    bacaFile(f, function (err, sheets) {
      if (err) { pesan('error', '❌ ' + escHtml(err.message)); return; }
      var d = null; for (var i = 0; i < sheets.length && !d; i++) d = bacaNominatif(sheets[i]);
      if (!d || !d.length) { pesan('error', '❌ Lembar NOMINATIF (kolom REG & NAMA) tidak ditemukan di file ini.'); return; }
      _excel = d; _namaFileNom = f.name; _rencana = null;
      $('sinkronInfoNom').textContent = '✅ ' + f.name + ' — ' + d.length + ' PM terbaca';
      pesan('info', 'File nominatif terbaca (' + d.length + ' PM). Unggah juga file Penghuni/Penempatan bila ingin asrama & kamar ikut diperbarui, lalu tekan <b>Periksa</b>.');
    });
  };
  root.sinkronPilihPenghuni = function (input) {
    var f = input.files && input.files[0]; if (!f) return;
    bacaFile(f, function (err, sheets) {
      if (err) { pesan('error', '❌ ' + escHtml(err.message)); return; }
      var d = null; for (var i = 0; i < sheets.length && !d; i++) d = bacaPenghuni(sheets[i]);
      if (!d) { pesan('error', '❌ Daftar penghuni per kamar tidak ditemukan di file ini.'); return; }
      _penghuniBaca = d; _namaFilePh = f.name; _rencana = null;
      $('sinkronInfoPh').textContent = '✅ ' + f.name + ' — ' + d.length + ' penghuni terbaca';
    });
  };

  var _lblCara = { reg: '<span class="badge badge-green">No. Reg sama</span>', nama: '<span class="badge badge-yellow">Nama sama · No. Induk diganti</span>', mirip: '<span class="badge badge-yellow">Mirip — cek dulu</span>', baru: '<span class="badge badge-green">PM baru</span>' };

  root.sinkronPeriksa = function () {
    if (!_excel) { pesan('warning', 'Pilih file NOMINATIF terlebih dahulu.'); return; }
    var data = JSON.parse(JSON.stringify(_excel)), catPh = '';
    if (_penghuniBaca) {
      var g = gabungPenghuni(data, _penghuniBaca);
      catPh = g.tidakCocok.length ? '<br>⚠️ Penghuni tidak ditemukan di nominatif: ' + g.tidakCocok.map(escHtml).join(', ') : '';
    }
    _rencana = susunRencana(data, state.penerima || []);
    var R = _rencana, nUbah = 0, nSama = 0, nBaru = 0, nGanti = 0, nMirip = 0, nRiw = 0;
    R.item.forEach(function (it, i) {
      var jml = Object.keys(it.perubahan).length;
      it.pakai = it.cara === 'mirip' ? false : jml > 0;
      it.riwayat = it.pm ? _hitungRiwayatNI(it.pm.nomorInduk) : null;
      if (it.cara === 'baru') nBaru++; else if (!jml) nSama++; else nUbah++;
      if (it.perubahan.nomorInduk && it.cara !== 'baru') nGanti++;
      if (it.cara === 'mirip') nMirip++;
    });
    var h = '<div class="table-wrap"><table><thead><tr><th><input type="checkbox" checked onchange="sinkronSemua(this.checked)" title="Pilih semua"></th><th>Excel</th><th>Cocok dengan</th><th>Perubahan</th></tr></thead><tbody>';
    R.item.forEach(function (it, i) {
      var jml = Object.keys(it.perubahan).length;
      if (!jml && !it.catatan.length) return;
      var ubah = Object.keys(it.perubahan).filter(function (f) { return !(it.cara === 'baru'); }).map(function (f) {
        var p = it.perubahan[f];
        return '<div style="font-size:.76rem"><b>' + escHtml(FIELD_LABEL[f] || f) + ':</b> ' + (p.lama ? '<s style="opacity:.6">' + escHtml(p.lama.slice(0, 40)) + '</s> → ' : '') + escHtml(p.baru.slice(0, 60)) + '</div>';
      }).join('');
      if (it.cara === 'baru') ubah = '<div style="font-size:.76rem">Ditambahkan sebagai PM baru' + (it.x.kamarBlok ? ' · ' + escHtml(it.x.kamarBlok + ' ' + (it.x.noKamar || '')) : '') + '</div>';
      var riw = it.riwayat ? (it.riwayat.pemeriksaan + it.riwayat.insidental + it.riwayat.rujukan + it.riwayat.pengukuranAwal + it.riwayat.asesmenAwal) : 0;
      var cp = it.pm ? '<div style="font-size:.78rem">' + escHtml(it.pm.nomorInduk) + ' · ' + escHtml(it.pm.namaPM) + '</div>' + (riw ? '<div style="font-size:.72rem;color:var(--text-muted)">🗂 ' + riw + ' catatan riwayat dipertahankan</div>' : '') : '—';
      var cat = it.catatan.map(function (c) { return '<div style="font-size:.72rem;color:#b45309">⚠️ ' + escHtml(c) + '</div>'; }).join('');
      h += '<tr><td><input type="checkbox" class="sinkron-cb" data-i="' + i + '"' + (it.pakai ? ' checked' : '') + (jml ? '' : ' disabled') + '></td>' +
        '<td><div style="font-weight:600;font-size:.82rem">' + escHtml(it.x.nama) + '</div><code style="font-size:.72rem">' + escHtml(it.x.reg) + '</code></td>' +
        '<td>' + _lblCara[it.cara] + cp + '</td><td>' + ubah + cat + '</td></tr>';
    });
    h += '</tbody></table></div>';
    var tdk = R.tidakAda.length ? '<div class="alert alert-info show" style="margin-top:.75rem">ℹ️ <b>' + R.tidakAda.length + ' PM di aplikasi tidak ada di Excel</b> — <u>tidak dihapus dan tidak diubah</u>: ' +
      R.tidakAda.slice(0, 15).map(function (p) { return escHtml(p.namaPM || p.nomorInduk); }).join(', ') + (R.tidakAda.length > 15 ? ' …' : '') + '</div>' : '';
    $('sinkronHasil').innerHTML =
      '<div style="margin:.75rem 0;font-size:.88rem"><b>' + R.item.length + '</b> PM di Excel · <b>' + nUbah + '</b> diperbarui · <b>' + nBaru + '</b> baru · <b>' + nSama + '</b> sudah sama' +
      (nGanti ? ' · <b>' + nGanti + '</b> ganti No. Induk (riwayat ikut pindah)' : '') + (nMirip ? ' · <b>' + nMirip + '</b> mirip (tidak dicentang, cek manual)' : '') + catPh + '</div>' + h + tdk +
      '<div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn btn-ghost" onclick="sinkronCadangan()">💾 Unduh cadangan data PM sekarang</button>' +
      '<button class="btn btn-primary" id="btnSinkronTerapkan" onclick="sinkronTerapkan()">✅ Terapkan perubahan yang dicentang</button></div><div id="sinkronProgres" class="text-muted" style="margin-top:.5rem;font-size:.82rem"></div>';
    pesan('success', 'Pemeriksaan selesai. Belum ada yang diubah — periksa daftar di bawah, lalu tekan <b>Terapkan</b>.');
  };

  root.sinkronSemua = function (on) {
    document.querySelectorAll('.sinkron-cb').forEach(function (cb) { if (!cb.disabled) cb.checked = on; });
  };

  root.sinkronCadangan = function () {
    var blob = new Blob([JSON.stringify(state.penerima || [], null, 1)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'cadangan_data_PM_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
  };

  root.sinkronTerapkan = async function () {
    if (!_rencana) return;
    var pilih = [];
    document.querySelectorAll('.sinkron-cb').forEach(function (cb) { if (cb.checked) pilih.push(_rencana.item[+cb.dataset.i]); });
    if (!pilih.length) { showToast('Tidak ada yang dicentang', 'error'); return; }
    if (!confirm('Terapkan perubahan untuk ' + pilih.length + ' PM?\n\nRiwayat pemeriksaan tidak dihapus. PM yang tidak ada di Excel tidak disentuh.')) return;
    var btn = $('btnSinkronTerapkan'); if (btn) btn.disabled = true;
    var ok = 0, baru = 0, gagal = [], prog = $('sinkronProgres');
    for (var n = 0; n < pilih.length; n++) {
      var it = pilih[n];
      if (prog) prog.textContent = 'Memproses ' + (n + 1) + ' / ' + pilih.length + ' — ' + it.x.nama;
      try {
        var now = new Date().toISOString(), nilai = {};
        Object.keys(it.perubahan).forEach(function (f) { nilai[f] = it.perubahan[f].baru; });
        if (it.cara === 'baru') {
          var pmBaru = Object.assign({ statusPM: 'Aktif', tglDaftar: now }, nilai, { nomorInduk: it.x.reg, updatedAt: now });
          if (state.penerima.some(function (p) { return String(p.nomorInduk).trim() === pmBaru.nomorInduk; })) { gagal.push(it.x.nama + ' (No. Induk sudah ada)'); continue; }
          state.penerima.push(pmBaru);
          if (state.scriptUrl) await kirimKeSheets('addPM', pmBaru);
          baru++; continue;
        }
        var pm = it.pm, niLama = String(pm.nomorInduk).trim();
        if (nilai.nomorInduk && kunciReg(nilai.nomorInduk) !== kunciReg(niLama)) {
          var bentrok = state.penerima.find(function (p) { return String(p.nomorInduk).trim() === nilai.nomorInduk; });
          if (bentrok) { gagal.push(it.x.nama + ' (No. Reg ' + nilai.nomorInduk + ' dipakai ' + (bentrok.namaPM || '-') + ')'); continue; }
          var h = await _kirimGantiNI(niLama, nilai.nomorInduk, pm.tglDaftar);   // seluruh riwayat dipindah ke nomor baru
          if (!h.ok) { gagal.push(it.x.nama + ' (' + h.error + ')'); continue; }
          _gantiNomorIndukLokal(niLama, nilai.nomorInduk);
          await _gantiNIdiAntreanFoto(niLama, nilai.nomorInduk);
          pm.nomorInduk = nilai.nomorInduk;
        }
        Object.keys(nilai).forEach(function (f) { if (f !== 'nomorInduk') pm[f] = nilai[f]; });
        pm.updatedAt = now;
        if (state.scriptUrl) await kirimKeSheets('editPM', pm);
        ok++;
      } catch (e) { gagal.push(it.x.nama + ' (' + (e && e.message || e) + ')'); }
    }
    saveState(); triggerSyncAfterSave(); renderListPM(); updateSelectPM(); renderDashboard();
    try { updateSelectPMPetugas(); updateSelectInsidental(); updateSelectRujukan(); updateSelectAsesmen(); renderDaftarSiapPeriksa(); } catch (e) {}
    if (prog) prog.textContent = '';
    _rencana = null;
    $('sinkronHasil').innerHTML = '';
    pesan(gagal.length ? 'warning' : 'success', '✅ Selesai: <b>' + ok + '</b> PM diperbarui, <b>' + baru + '</b> PM baru ditambahkan. Riwayat tidak ada yang dihapus.' +
      (gagal.length ? '<br>⚠️ Dilewati (' + gagal.length + '): ' + gagal.map(escHtml).join('; ') : ''));
    showToast('✅ Sinkron data PM selesai');
  };
})(typeof window !== 'undefined' ? window : globalThis);
