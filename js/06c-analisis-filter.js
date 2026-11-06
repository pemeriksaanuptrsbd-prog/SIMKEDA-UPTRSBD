// ══════════════════════════════════════════════════════════════════
//  v26 — ANALISIS NAMA PM (nama sama dihitung 1) + FILTER NAMA/TANGGAL di SEMUA tabel
//  Dipakai oleh layar aplikasi DAN cetak PDF (satu logika, hasil identik).
// ══════════════════════════════════════════════════════════════════

// ── Nama dinormalkan: huruf besar, spasi ganda dibuang → "Faiqotul  Himma" = "FAIQOTUL HIMMA"
function _normNama(n) { return String(n == null ? '' : n).replace(/\s+/g, ' ').trim().toUpperCase(); }

// Kunci identitas PM untuk menghitung "PM berbeda": nama (dinormalkan); bila kosong → nomor induk.
function _kunciPM(r) {
  if (!r) return '';
  let n = _normNama(r.namaPM != null ? r.namaPM : r.nama);
  if (!n || n === '-') {
    if (r.nomorInduk && Array.isArray(state && state.penerima)) {
      const pm = state.penerima.find(p => p.nomorInduk === r.nomorInduk);
      if (pm) n = _normNama(pm.namaPM);
    }
  }
  return n && n !== '-' ? n : (r.nomorInduk ? 'NI:' + r.nomorInduk : '');
}
// Jumlah PM berbeda dalam sebuah daftar rekaman (nama yang sama dihitung 1).
function _hitungPMUnik(list) { return new Set((list || []).map(_kunciPM).filter(Boolean)).size; }

// Analisis dari daftar nama: total kemunculan, PM berbeda, dan siapa yang berulang.
function _analisisNama(names) {
  const m = new Map();
  (names || []).forEach(n => {
    const k = _normNama(n); if (!k || k === '-') return;
    const rapi = String(n).replace(/\s+/g, ' ').trim();
    const e = m.get(k) || { nama: rapi, n: 0 };
    if (e.nama === e.nama.toLowerCase() && rapi !== rapi.toLowerCase()) e.nama = rapi;   // utamakan ejaan yang bukan huruf kecil semua
    e.n++; m.set(k, e);
  });
  const arr = [...m.values()];
  const total = arr.reduce((s, e) => s + e.n, 0);
  const ganda = arr.filter(e => e.n > 1).sort((a, b) => b.n - a.n || a.nama.localeCompare(b.nama, 'id'));
  return { total, unik: arr.length, ganda, rata: arr.length ? total / arr.length : 0 };
}

// ── Satu "butir" data untuk analisis lengkap: { nama, tgl(ms), asrama, diag, ket(keluhan), status, obat, jumlah } ──
function _itemDariRec(r) {
  if (!r) return null;
  let asrama = r.kamarBlok;
  if (!asrama && r.nomorInduk && Array.isArray(state && state.penerima)) { const pm = state.penerima.find(p => p.nomorInduk === r.nomorInduk); if (pm) asrama = pm.kamarBlok; }
  const num = parseFloat(r.jumlah);
  return { nama: r.namaPM != null ? r.namaPM : r.nama, tgl: _tglRec(r), asrama: asrama || '', diag: r.diagnosis || r.dxUtama || '', ket: r.keluhan || '',
    status: r.statusKondisi || r.statusRujukan || r.statusDokter || '', obat: r.namaObat || '', jumlah: isNaN(num) ? NaN : num };
}
function _petaKolom(table) {
  const ths = table.querySelectorAll('thead th'); const arr = ths.length ? [...ths] : [...table.querySelectorAll('tr:first-child th')];
  const h = arr.map(th => th.textContent.replace(/\s+/g, ' ').trim().toLowerCase());
  const cari = (re) => h.findIndex(x => re.test(x));
  let tgl = cari(/^(tanggal|tgl)$/); if (tgl < 0) tgl = cari(/^tgl insidental$|^tgl periksa|^waktu$/);
  return { nama: _idxKolomNama(table), tgl, asrama: cari(/^(asrama|kamar)/), diag: cari(/diagnos/), ket: cari(/^keluhan/), status: cari(/^status( terakhir)?$/),
    obat: cari(/^nama obat$/), jumlah: cari(/^jumlah$/) };
}
function _itemDariBaris(tr, m) {
  const t = (i) => i >= 0 && tr.children[i] ? tr.children[i].textContent.replace(/\s+/g, ' ').trim() : '';
  const rs = m.tgl >= 0 ? _rentangTanggalTeks(t(m.tgl)) : [];
  const num = m.jumlah >= 0 ? parseFloat(t(m.jumlah).replace(',', '.')) : NaN;
  return { nama: t(m.nama), tgl: rs.length ? rs[0][0] : NaN, asrama: t(m.asrama), diag: t(m.diag), ket: t(m.ket), status: t(m.status), obat: t(m.obat), jumlah: num };
}

// ── Penghitung sebaran kategori → [{k, n}] terurut ──
function _sebaran(items, fn) {
  const m = new Map();
  items.forEach(it => { const v = String(fn(it) || '').replace(/\s+/g, ' ').trim(); if (!v || v === '-') return; const k = v.toUpperCase(); const e = m.get(k) || { k: v, n: 0 }; e.n++; m.set(k, e); });
  return [...m.values()].sort((x, y) => y.n - x.n || x.k.localeCompare(y.k, 'id'));
}
function _persen(n, total) { return Math.round(n / total * 100) + '%'; }
function _gabung(arr, maks, total) {
  return arr.slice(0, maks).map(e => `${escHtml(e.k)} (${e.n}${total ? '; ' + _persen(e.n, total) : ''})`).join(', ');
}
function _tglPanjang(ms) { return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }

// Kotak analisis (HTML) berbentuk narasi resmi.
// mode 'kegiatan' = tiap baris satu kejadian (pemeriksaan, insidental, rujukan, pemakaian obat);
// mode 'daftar'   = tiap baris satu data (daftar PM, asesmen, dll). items (opsional) = butir data untuk analisis lanjutan.
// Analisis khusus rujukan: rujukan umumnya hanya 1 PM, sehingga narasinya ringkas dan tidak memuat rata-rata/pengulangan.
function _htmlAnalisisRujukan(a, pdf, items) {
  items = (items || []).filter(Boolean);
  const P = [];
  const fmt = it => `<b>${escHtml(String(it.nama || '-').replace(/\s+/g, ' ').trim())}</b>${it.asrama ? ' (' + escHtml(it.asrama) + ')' : ''}`;
  const tg = it => isNaN(it.tgl) ? '' : _tglPanjang(it.tgl);
  if (items.length <= 1 || a.unik <= 1 && items.length <= 1) {
    const it = items[0] || {};
    P.push(`Berdasarkan data yang tercatat${tg(it) ? ' pada tanggal ' + tg(it) : ''}, terdapat <b>1</b> rujukan Penerima Manfaat (PM) atas nama ${fmt(it)}.`);
    if (it.diag) P.push(`Rujukan dilakukan berdasarkan diagnosis <b>${escHtml(it.diag)}</b>.`);
    if (it.status) P.push(`Status rujukan saat ini adalah <b>${escHtml(it.status)}</b>.`);
  } else {
    P.push(`Berdasarkan data yang tercatat, terdapat <b>${a.total}</b> rujukan yang dilakukan oleh <b>${a.unik}</b> Penerima Manfaat (PM), yaitu ` +
      items.map(it => `${fmt(it)}${tg(it) ? ' pada ' + tg(it) : ''}${it.diag ? ' dengan diagnosis ' + escHtml(it.diag) : ''}`).join('; ') + '.');
  }
  P.push('Hasil analisis ini disusun berdasarkan data yang tercatat pada laporan ini dan dapat digunakan sebagai bahan pemantauan pasca rujukan serta evaluasi pelayanan kesehatan.');
  const st1 = pdf ? 'margin:10px 0 14px;font-size:9.5pt;line-height:1.6;text-align:justify;color:#111;' : '';
  const pst = (pdf ? 'margin:0 0 4px;' : 'margin:0 0 .35rem;') + 'text-indent:1.1cm;text-align:justify;';
  return `<div class="analisis-pm" style="${st1}"><div class="analisis-judul" style="font-weight:700;color:#000;margin-bottom:4px;">Analisis dan Penjelasan Data</div>` +
    P.map(t => `<p style="${pst}">${t}</p>`).join('') + '</div>';
}
function _htmlAnalisis(a, label, mode, pdf, items) {
  if (!a || !a.total) return '';
  items = (items || []).filter(Boolean);
  if (typeof _khususAnalisis === 'function') { const kh = _khususAnalisis(label, items, pdf); if (kh) return kh; }
  if (/rujukan/i.test(label || '')) return _htmlAnalisisRujukan(a, pdf, items);
  const kal = mode === 'kegiatan';
  const lbl = escHtml(label || 'data');
  const rata = String(Math.round(a.rata));
  const ulang = a.total - a.unik;
  const P = [];
  items = (items || []).filter(Boolean);
  const tg = items.map(i => i.tgl).filter(t => !isNaN(t));
  const periode = tg.length ? (() => { const a1 = Math.min(...tg), a2 = Math.max(...tg); return a1 === a2 ? ` pada tanggal ${_tglPanjang(a1)}` : ` pada periode ${_tglPanjang(a1)} sampai dengan ${_tglPanjang(a2)}`; })() : '';

  // 1. Gambaran umum
  P.push(kal
    ? `Berdasarkan data yang tercatat${periode}, terdapat <b>${a.total}</b> ${lbl} yang dilakukan oleh <b>${a.unik}</b> Penerima Manfaat (PM) berbeda. Penghitungan jumlah PM dilakukan berdasarkan nama, sehingga nama yang sama hanya dihitung sebagai satu PM.`
    : `Berdasarkan data yang tercatat${periode}, terdapat <b>${a.total}</b> baris data yang berasal dari <b>${a.unik}</b> Penerima Manfaat (PM) berbeda. Penghitungan jumlah PM dilakukan berdasarkan nama, sehingga nama yang sama hanya dihitung sebagai satu PM.`);

  // 2. Frekuensi per PM
  if (kal) {
    if (a.ganda.length) {
      const MAX = pdf ? 15 : 12, top = a.ganda[0];
      P.push(`Rata-rata setiap PM tercatat <b>${rata}</b> kali, dengan <b>${ulang}</b> catatan merupakan pengulangan dari PM yang sama. Sebanyak <b>${a.ganda.length}</b> PM (${_persen(a.ganda.length, a.unik)} dari seluruh PM) tercatat lebih dari satu kali, yaitu: ` +
        a.ganda.slice(0, MAX).map(e => `${escHtml(e.nama)} (${e.n} kali)`).join(', ') + (a.ganda.length > MAX ? `, dan ${a.ganda.length - MAX} PM lainnya` : '') +
        `. Frekuensi tertinggi tercatat pada <b>${escHtml(top.nama)}</b> sebanyak ${top.n} kali.`);
    } else {
      P.push(`Rata-rata setiap PM tercatat <b>${rata}</b> kali. Tidak terdapat PM yang tercatat lebih dari satu kali pada data ini.`);
    }
  } else {
    P.push(a.ganda.length
      ? `Terdapat <b>${a.ganda.length}</b> nama yang tercatat lebih dari satu kali, yaitu: ${a.ganda.slice(0, pdf ? 15 : 12).map(e => `${escHtml(e.nama)} (${e.n} baris)`).join(', ')}${a.ganda.length > (pdf ? 15 : 12) ? ', dan lainnya' : ''}. Data ganda tersebut dihitung sebagai satu PM.`
      : 'Tidak terdapat nama yang tercatat lebih dari satu kali pada data ini.');
  }

  // 3. Sebaran lanjutan dari kolom yang tersedia
  const n = items.length;
  if (n) {
    const as = _sebaran(items, i => i.asrama);
    if (as.length > 1) P.push(`Berdasarkan asrama, catatan terbanyak berasal dari <b>${escHtml(as[0].k)}</b> (${as[0].n} catatan; ${_persen(as[0].n, n)}), diikuti ${_gabung(as.slice(1), 3, n)}.`);
    else if (as.length === 1) P.push(`Seluruh catatan berasal dari <b>${escHtml(as[0].k)}</b>.`);
    const dg = _sebaran(items, i => i.diag);
    if (dg.length) P.push(`Diagnosis yang paling sering ditemukan adalah <b>${escHtml(dg[0].k)}</b> (${dg[0].n} catatan; ${_persen(dg[0].n, n)})${dg.length > 1 ? `, diikuti ${_gabung(dg.slice(1), 3, n)}` : ''}.`);
    else {
      const kl = _sebaran(items, i => i.ket);
      if (kl.length) P.push(`Keluhan yang paling sering dilaporkan adalah <b>${escHtml(kl[0].k)}</b> (${kl[0].n} catatan; ${_persen(kl[0].n, n)})${kl.length > 1 ? `, diikuti ${_gabung(kl.slice(1), 3, n)}` : ''}.`);
    }
    const st = _sebaran(items, i => i.status);
    if (st.length) P.push(`Berdasarkan status, rinciannya adalah ${_gabung(st, 5, n)}.`);
    const ob = _sebaran(items.filter(i => i.obat), i => i.obat);
    if (ob.length) {
      const unit = items.reduce((sum, i) => sum + (isNaN(i.jumlah) ? 0 : i.jumlah), 0);
      P.push(`Obat yang paling banyak digunakan adalah <b>${escHtml(ob[0].k)}</b> (${ob[0].n} kali pemakaian)${ob.length > 1 ? `, diikuti ${ob.slice(1, 4).map(e => `${escHtml(e.k)} (${e.n} kali)`).join(', ')}` : ''}. Total seluruh obat yang digunakan sebanyak <b>${(Math.round(unit * 10) / 10).toString().replace('.', ',')}</b> unit.`);
    }
  }

  // 4. Penutup
  P.push(kal && a.ganda.length
    ? 'Hasil analisis ini disusun berdasarkan data yang tercatat pada laporan ini dan dapat digunakan sebagai bahan monitoring serta evaluasi pelayanan kesehatan, khususnya untuk pemantauan lanjutan terhadap PM yang tercatat berulang.'
    : 'Hasil analisis ini disusun berdasarkan data yang tercatat pada laporan ini dan dapat digunakan sebagai bahan monitoring serta evaluasi pelayanan kesehatan.');

  const st1 = pdf
    ? 'margin:10px 0 14px;font-size:9.5pt;line-height:1.6;text-align:justify;color:#111;'
    : '';
  const pst = (pdf ? 'margin:0 0 4px;' : 'margin:0 0 .35rem;') + 'text-indent:1.1cm;text-align:justify;';
  return `<div class="analisis-pm" style="${st1}"><div class="analisis-judul" style="font-weight:700;color:#000;margin-bottom:4px;">Analisis dan Penjelasan Data</div>` +
    P.map(t => `<p style="${pst}">${t}</p>`).join('') + '</div>';
}

// ── Pengaturan tiap tabel: [label kegiatan, mode] (kunci = id tbody tanpa "Body") ──
const _TBL_CFG = {
  riwayat: ['pemeriksaan', 'kegiatan'], kasiRiwayat: ['pemeriksaan', 'kegiatan'], riwayatAdmin: ['pemeriksaan', 'kegiatan'],
  insidental: ['kejadian insidental', 'kegiatan'], rekapInsidental: ['kejadian insidental', 'kegiatan'], kasiInsidental: ['kejadian insidental', 'kegiatan'],
  kasiInsidentalPeriksa: ['kejadian insidental yang lanjut periksa dokter', 'kegiatan'],
  rujukan: ['rujukan', 'kegiatan'], rekapRujukan: ['rujukan', 'kegiatan'], kasiRujukan: ['rujukan', 'kegiatan'],
  rekapObat: ['pemakaian obat', 'kegiatan'], daftarPengukuran: ['pengukuran', 'kegiatan'],
  logMutasi: ['mutasi stok', 'kegiatan'], kasiAsesmen: ['asesmen', 'daftar'], asesmenList: ['asesmen', 'daftar']
};
// Tabel yang dipaginasi → fungsi render ulangnya (filter diterapkan pada DATA, bukan hanya halaman yang tampak)
const _FN_TBL = {
  listPM: 'renderListPM', riwayat: 'renderRiwayat', kasiRiwayat: 'renderKasiRiwayat', kasiPM: 'renderKasiListPM',
  rekapInsidental: 'renderRekapInsidental', rekapRujukan: 'renderRekapRujukan', riwayatAdmin: 'renderRiwayatAdmin',
  insidental: 'renderInsidental', rujukan: 'renderRujukan', kasiInsidental: 'renderKasiInsidental',
  asesmenList: 'renderAsesmenList', kasiAsesmen: 'renderKasiAsesmen', kasiRujukan: 'renderKasiRujukanFull',
  rekapObat: 'renderRekapObat', logMutasi: 'renderLogMutasi'
};
const _tblFilter = {};   // kunci -> { q, dari, sampai }
const _tblData = {};     // kunci -> daftar rekaman SESUDAH disaring (semua halaman)

// ── Penyaring data (dipanggil dari tiap fungsi render tabel berhalaman) ──
const _TGL_FIELD = ['tglPeriksa', 'tgl', 'tglAsesmen', 'tglSimpan', 'waktuInput', 'tglMasuk', 'tanggal', 'createdAt'];
function _tglRec(r) {
  for (const f of _TGL_FIELD) if (r && r[f]) { const t = _tglLokalMs(r[f]); if (!isNaN(t)) return t; }
  return NaN;
}
function _teksRec(r) {
  const out = [];
  (function jalan(v, d) {
    if (v == null || d > 3) return;
    if (typeof v === 'string') { if (v.length < 300) out.push(v); }
    else if (typeof v === 'number') out.push(String(v));
    else if (Array.isArray(v)) v.forEach(x => jalan(x, d + 1));
    else if (typeof v === 'object') Object.keys(v).forEach(k => jalan(v[k], d + 1));
  })(r, 0);
  return out.join(' ').toLowerCase();
}
function _fltTbl(key, list) {
  const f = _tblFilter[key];
  let out = list;
  if (f && (f.q || f.dari || f.sampai)) {
    const q = String(f.q || '').toLowerCase().trim();
    const d1 = f.dari ? _tglLokalMs(f.dari) : NaN, d2 = f.sampai ? _tglLokalMs(f.sampai) : NaN;
    out = list.filter(r => {
      if (q && !_teksRec(r).includes(q)) return false;
      if (!isNaN(d1) || !isNaN(d2)) {
        const t = _tglRec(r); if (isNaN(t)) return false;
        if (!isNaN(d1) && t < d1) return false;
        if (!isNaN(d2) && t > d2) return false;
      }
      return true;
    });
  }
  _tblData[key] = out;
  setTimeout(() => _perbaruiAnalisisTabel(key + 'Body'), 0);
  return out;
}

// ── Tanggal yang ditemukan di teks sebuah baris → daftar rentang [awal, akhir] (ms) ──
const _BLN_ID = { jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agt: 8, agustus: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11, des: 12, desember: 12 };
function _rentangTanggalTeks(t) {
  const out = []; let s = String(t || '');
  s = s.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_, y, m, d) => { out.push([new Date(+y, +m - 1, +d).getTime()]); return ' '; });
  s = s.replace(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/g, (_, d, m, y) => { out.push([new Date(+y, +m - 1, +d).getTime()]); return ' '; });
  s = s.replace(/(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})/g, (x, d, b, y) => { const m = _BLN_ID[b.toLowerCase()]; if (!m) return x; out.push([new Date(+y, m - 1, +d).getTime()]); return ' '; });
  s.replace(/([A-Za-z]{3,9})\s+(\d{4})/g, (x, b, y) => { const m = _BLN_ID[b.toLowerCase()]; if (m) out.push([new Date(+y, m - 1, 1).getTime(), new Date(+y, m, 0).getTime()]); return x; });
  return out.map(r => [r[0], r.length > 1 ? r[1] : r[0]]);
}

// ── Kolom "Nama"/"Nama PM" pada sebuah tabel (−1 jika tidak ada) ──
function _idxKolomNama(table) {
  const ths = table.querySelectorAll('thead th'); const arr = ths.length ? [...ths] : [...table.querySelectorAll('tr:first-child th')];
  return arr.findIndex(th => /^nama(\s*pm)?$/i.test(th.textContent.replace(/\s+/g, ' ').trim()));
}
function _barisData(table) {
  return [...table.querySelectorAll('tbody tr')].filter(tr => tr.children.length > 2 && !tr.querySelector('td[colspan]'));
}

// ── Analisis di layar (di bawah bilah filter tiap tabel) ──
function _perbaruiAnalisisTabel(bodyId) {
  const tbody = document.getElementById(bodyId); if (!tbody) return;
  const bar = tbody.closest('.table-wrap, table') && document.querySelector('[data-tbl-for="' + bodyId + '"]');
  if (!bar) return;
  const box = bar.querySelector('.tbl-analisis'), cnt = bar.querySelector('.tbl-count');
  const key = bodyId.replace(/Body$/, '');
  const cfg = _TBL_CFG[key] || ['data', 'daftar'];
  const table = tbody.closest('table');
  let names = [], jumlahBaris = 0, items = [];
  const kosong = tbody.children.length === 1 && tbody.children[0].querySelector('td[colspan]');
  if (_FN_TBL[key]) {
    const data = kosong ? [] : (_tblData[key] || []);
    jumlahBaris = data.length;
    names = data.map(r => r && (r.namaPM != null ? r.namaPM : r.nama));
    items = data.map(_itemDariRec);
  } else {
    const idx = _idxKolomNama(table);
    const rows = _barisData(table).filter(tr => tr.style.display !== 'none');
    jumlahBaris = rows.length;
    if (idx >= 0) { const pk = _petaKolom(table); items = rows.map(tr => _itemDariBaris(tr, pk)); names = items.map(i => i.nama); }
  }
  if (cnt) cnt.textContent = jumlahBaris + ' baris';
  if (!box) return;
  const noAnalisis = table && table.hasAttribute('data-no-analisis');
  box.innerHTML = (!noAnalisis && names.length) ? _htmlAnalisis(_analisisNama(names), cfg[0], cfg[1], false, items) : '';
}

// ── Penyaring baris pada tabel biasa (tidak berhalaman) ──
function _saringBarisDOM(bodyId) {
  const tbody = document.getElementById(bodyId); if (!tbody) return;
  const f = _tblFilter[bodyId.replace(/Body$/, '')] || {};
  const q = String(f.q || '').toLowerCase().trim();
  const d1 = f.dari ? _tglLokalMs(f.dari) : NaN, d2 = f.sampai ? _tglLokalMs(f.sampai) : NaN;
  const pakaiTgl = !isNaN(d1) || !isNaN(d2);
  [...tbody.children].forEach(tr => {
    if (!tr.children || tr.children.length < 2 || tr.querySelector('td[colspan]')) return;
    let ok = true;
    if (q && !tr.textContent.toLowerCase().includes(q)) ok = false;
    if (ok && pakaiTgl) {
      const rs = _rentangTanggalTeks(tr.textContent);
      ok = rs.some(([a, b]) => (isNaN(d1) || b >= d1) && (isNaN(d2) || a <= d2));
    }
    tr.style.display = ok ? '' : 'none';
  });
  _perbaruiAnalisisTabel(bodyId);
}

function _terapkanFilterTabel(bodyId) {
  const key = bodyId.replace(/Body$/, '');
  const bar = document.querySelector('[data-tbl-for="' + bodyId + '"]'); if (!bar) return;
  const ins = bar.querySelectorAll('input');
  _tblFilter[key] = { q: ins[0].value, dari: ins[1].value, sampai: ins[2].value };
  if (_FN_TBL[key] && typeof window[_FN_TBL[key]] === 'function') {
    if (typeof _pageState === 'object' && key in _pageState) _pageState[key] = 1;
    window[_FN_TBL[key]]();
  } else _saringBarisDOM(bodyId);
}
function _resetFilterTabel(bodyId) {
  const bar = document.querySelector('[data-tbl-for="' + bodyId + '"]'); if (!bar) return;
  bar.querySelectorAll('input').forEach(i => { i.value = ''; });
  _terapkanFilterTabel(bodyId);
}

// ── Memasang bilah filter di atas setiap tabel ber-tbody-id (kecuali data-no-filter) ──
function _pasangFilterTabel(root) {
  (root || document).querySelectorAll('table').forEach(table => {
    const tbody = table.querySelector('tbody[id]'); if (!tbody) return;
    if (table.hasAttribute('data-no-filter') || tbody.hasAttribute('data-no-filter')) return;
    const id = tbody.id;
    if (document.querySelector('[data-tbl-for="' + id + '"]')) return;
    const key = id.replace(/Body$/, '');
    const f = _tblFilter[key] || {};
    const bar = document.createElement('div');
    bar.className = 'tbl-bar-wrap no-print'; bar.setAttribute('data-tbl-for', id);
    bar.innerHTML = '<div class="tbl-bar">' +
      '<input type="search" placeholder="🔎 Cari nama / kata kunci…" aria-label="Cari nama atau kata kunci" value="' + escHtml(f.q || '') + '">' +
      '<label>Dari <input type="date" value="' + escHtml(f.dari || '') + '"></label>' +
      '<label>Sampai <input type="date" value="' + escHtml(f.sampai || '') + '"></label>' +
      '<button type="button" class="btn btn-sm tbl-reset">✕ Reset</button><span class="tbl-count"></span></div>' +
      '<div class="tbl-analisis"></div>';
    const wrap = table.closest('.table-wrap') || table;
    wrap.parentNode.insertBefore(bar, wrap);
    const ins = bar.querySelectorAll('input');
    let tm = null;
    const jalan = () => { clearTimeout(tm); tm = setTimeout(() => _terapkanFilterTabel(id), 200); };
    ins[0].addEventListener('input', jalan); ins[1].addEventListener('change', jalan); ins[2].addEventListener('change', jalan);
    bar.querySelector('.tbl-reset').addEventListener('click', () => _resetFilterTabel(id));
    if (!_FN_TBL[key]) {   // tabel biasa: terapkan ulang tiap kali isi tabel dirender ulang
      let sibuk = false;
      new MutationObserver(() => { if (sibuk) return; sibuk = true; setTimeout(() => { sibuk = false; _saringBarisDOM(id); }, 0); })
        .observe(tbody, { childList: true });
      _saringBarisDOM(id);
    } else _perbaruiAnalisisTabel(id);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => _pasangFilterTabel());
else _pasangFilterTabel();

// ── Analisis untuk cetak PDF: sisipkan kotak analisis di bawah tabel yang punya kolom "Nama PM" ──
const _KATA_LABEL = [
  [/PEMAKAIAN OBAT/i, 'pemakaian obat', 'kegiatan'], [/INSIDENTAL YANG LANJUT/i, 'kejadian insidental yang lanjut periksa dokter', 'kegiatan'],
  [/INSIDENTAL/i, 'kejadian insidental', 'kegiatan'], [/RUJUKAN/i, 'rujukan', 'kegiatan'],
  [/ASESMEN/i, 'asesmen', 'daftar'], [/PEMERIKSAAN|RIWAYAT/i, 'pemeriksaan', 'kegiatan']
];
function _sisipAnalisisPDF(html) {
  try {
    if (typeof DOMParser === 'undefined') return html;
    const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    const judul = ((doc.querySelector('[data-judul]') || { getAttribute: () => '' }).getAttribute('data-judul')) || '';
    let diubah = false;
    doc.querySelectorAll('table').forEach(t => {
      if (t.hasAttribute('data-no-analisis') || t.querySelector('table')) return;
      const idx = _idxKolomNama(t); if (idx < 0) return;
      const pk = _petaKolom(t);
      const items = _barisData(t).map(tr => _itemDariBaris(tr, pk));
      const names = items.map(i => i.nama);
      if (!names.length) return;
      let ctx = '', p = t.previousElementSibling, n = 0;
      while (p && n < 3) { ctx = (p.textContent || '').slice(0, 160) + ' ' + ctx; p = p.previousElementSibling; n++; }
      let label = 'data', mode = 'daftar';
      for (const [re, l, m] of _KATA_LABEL) { if (re.test(ctx) || re.test(judul)) { label = l; mode = m; break; } }
      t.insertAdjacentHTML('afterend', _htmlAnalisis(_analisisNama(names), label, mode, true, items));
      diubah = true;
    });
    return diubah ? doc.body.innerHTML : html;
  } catch (e) { return html; }
}
