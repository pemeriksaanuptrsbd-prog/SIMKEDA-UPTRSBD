// ══════════════════════════════════════════════════════════════════
//  PAKET LAPORAN BULANAN KEPALA SEKSI (5 paket) — v27
//  Format mengikuti dokumen Word/PDF resmi: Laporan Realisasi Kegiatan
//  (sampul) + laporan + Berita Acara. Seluruh angka/tabel diambil dari
//  data aplikasi untuk bulan & tahun yang dipilih. Analisis formal
//  (v26) ditambahkan pada tiap sub bagian yang memuat daftar nama PM.
// ══════════════════════════════════════════════════════════════════

const _PK_NIP_KASI = '197804182011011006';
const _PK_NIP_PLK = '200105102025042007';
const _PK_ROM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const _PK_TERBILANG = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh'];
const _PK_NAMA = {
  1: { kode: 'Dokumen Program & Jadwal', file: 'Paket 1 — Bahan Program & Jadwal Pemeriksaan' },
  2: { kode: 'Kebutuhan Obat & Riwayat Kesehatan', file: 'Paket 2 — Kebutuhan Obat & Riwayat Kesehatan' },
  3: { kode: 'Laporan Kesehatan & Perkembangan', file: 'Paket 3 — Laporan Kesehatan & Perkembangan PM' },
  4: { kode: 'Pendampingan & Koordinasi', file: 'Paket 4 — Pendampingan Pemeriksaan & Koordinasi' },
  5: { kode: 'Resume Kesehatan & Rujukan', file: 'Paket 5 — Resume Kesehatan PM & Dokumen Rujukan' }
};

// ── Konteks (bulan/tahun/tanggal TTD dari panel) ─────────────────
function _pkKonteks() {
  const now = new Date();
  const bln = parseInt((document.getElementById('pkBulan') || {}).value || '') || (now.getMonth() + 1);
  const thn = parseInt((document.getElementById('pkTahun') || {}).value || '') || now.getFullYear();
  const akhir = new Date(thn, bln, 0).getDate();
  let tgl = new Date(thn, bln - 1, Math.min(30, akhir));
  const v = (document.getElementById('pkTanggal') || {}).value;
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) tgl = new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10));
  const nb = _BULAN_NAMES[bln];
  return {
    bln, thn, nb, NB: nb.toUpperCase(), rom: _PK_ROM[bln], tgl,
    kasi: state.namaKasi || 'Sunardi, S.Pd',
    plk: state.petugasCetak || 'Difa Fitriastuti Putri, A.Md.Kes',
    dokter: state.defaultDokter || 'dr. Sakinah',
    ttd: tgl.getDate() + ' ' + nb + ' ' + tgl.getFullYear(),
    TTD: tgl.getDate() + ' ' + nb.toUpperCase() + ' ' + tgl.getFullYear()
  };
}
let _pkKumpul = null; // bila berisi array, kotak analisis tidak dibuat; paragrafnya dikumpulkan
function _pkAmbilParagraf(fn) { _pkKumpul = []; try { fn(); return _pkKumpul.slice(); } finally { _pkKumpul = null; } }
function _pkPer(c) { return (String(c.nb || '') + ' ' + String(c.thn || '')).trim(); }
function _pkNamaKey(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().toUpperCase(); }
function _pkLolosNama(r, c) { return !c.namaSet || c.namaSet.has(_pkNamaKey(r && (r.namaPM != null ? r.namaPM : r.nama))); }
function _pkDalamBulan(tglVal, c) {
  if (!tglVal) return false;
  const d = new Date(tglVal);
  if (c.dari != null) return !isNaN(d) && d.getTime() >= c.dari && d.getTime() <= c.sampai;
  return !isNaN(d) && d.getMonth() + 1 === c.bln && d.getFullYear() === c.thn;
}
function _pkKunciTgl(v) { const d = new Date(v); return isNaN(d) ? '' : d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function _pkPct(n, total) {
  if (!total) return '0%';
  return (Math.round(n / total * 100000) / 1000).toString().replace('.', ',') + '%';
}
function _pkTerbilang(n) { return n >= 0 && n <= 10 ? _PK_TERBILANG[n] : String(n); }

// ── Statistik bulan (semua diambil dari data aplikasi) ───────────
function _pkStatistik(c) {
  const aktif = (state.penerima || []).filter(isPMAktif);
  const putri = aktif.filter(p => String(p.kamarBlok || '').toUpperCase().startsWith('ASTRI')).length;
  const asrama = new Set(aktif.map(p => p.kamarBlok).filter(Boolean)).size;
  const pem = (state.pemeriksaan || []).filter(p => p && !p._deleted && _pkDalamBulan(p.tglPeriksa, c) && _pkLolosNama(p, c));
  const ins = (state.insidental || []).filter(x => x && !x._deleted && _pkDalamBulan(x.tgl, c) && _pkLolosNama(x, c));
  const ruj = (state.rujukan || []).filter(x => x && !x._deleted && _pkDalamBulan(x.tgl, c) && _pkLolosNama(x, c))
    .sort((a, b) => new Date(a.tgl) - new Date(b.tgl));
  // Kunjungan dokter = tanggal pemeriksaan yang berbeda
  const peta = {};
  pem.forEach(p => { const k = _pkKunciTgl(p.tglPeriksa); (peta[k] = peta[k] || { key: k, tgl: new Date(p.tglPeriksa), list: [] }).list.push(p); });
  const kunj = Object.values(peta).sort((a, b) => a.tgl - b.tgl).map((k, i) => ({
    no: i + 1, rom: _PK_ROM[i + 1] || String(i + 1), tgl: k.tgl, key: k.key, list: k.list, jmlPM: _hitungPMUnik(k.list), jmlKunj: k.list.length
  }));
  // Insidental yang lanjut diperiksa dokter
  let insDiperiksa = 0; const insSehat = [];
  ins.forEach(x => {
    const ada = (state.pemeriksaan || []).some(p => p && !p._deleted && p.nomorInduk === x.nomorInduk && new Date(p.tglPeriksa) >= new Date(x.tgl));
    if (ada) insDiperiksa++; else insSehat.push(x);
  });
  // Status kesehatan terakhir tiap PM pada bulan tsb
  const terakhir = {};
  pem.slice().sort((a, b) => new Date(a.tglPeriksa) - new Date(b.tglPeriksa)).forEach(p => { const k = _kunciPM(p); if (k) terakhir[k] = p; });
  let baik = 0, cukup = 0, tindak = 0;
  Object.values(terakhir).forEach(p => {
    if (p.statusKondisi === 'Baik') baik++; else if (p.statusKondisi === 'Cukup Baik') cukup++; else tindak++;
  });
  const pmPeriksa = baik + cukup + tindak;
  return {
    aktif: aktif.length, putri, putra: aktif.length - putri, asrama, pem, ins, ruj, kunj, terakhir,
    pmPeriksa, jmlKunj: pem.length, insPM: _hitungPMUnik(ins), insN: ins.length, insDiperiksa,
    insSehatPM: _hitungPMUnik(insSehat), baik, cukup, tindak, rujPM: _hitungPMUnik(ruj),
    tujuanRuj: [...new Set(ruj.map(r => r.tujuan).filter(Boolean))],
    totalPMText: aktif.length + ' PM Aktif (' + putri + ' Putri / ' + (aktif.length - putri) + ' Putra) — ' + asrama + ' Asrama'
  };
}

// ══════════ KOMPONEN TAMPILAN GAYA WORD ══════════
const _PK_FONT = "font-family:'Times New Roman',Times,serif;";
function _pkBanner(judul, sub, warna) {
  return `<div style="background:${warna || '#14304f'};color:#fff;text-align:center;padding:14px 12px;margin:0 0 10px;${_PK_FONT}">
    <div style="font-size:12.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.3px;">${escHtml(judul)}</div>
    ${sub ? `<div style="font-size:10pt;margin-top:3px;">${escHtml(sub)}</div>` : ''}
    <div style="font-size:9pt;font-style:italic;margin-top:3px;">Seksi Pelayanan Sosial</div></div>`;
}
function _pkSubBanner(judul, sub1, sub2) {
  return `<div style="background:#14304f;color:#fff;text-align:center;padding:14px 12px;margin:0 0 10px;${_PK_FONT}">
    <div style="font-size:12.5pt;font-weight:700;text-transform:uppercase;">${escHtml(judul)}</div>
    ${sub1 ? `<div style="font-size:10pt;margin-top:3px;">${escHtml(sub1)}</div>` : ''}
    ${sub2 ? `<div style="font-size:9pt;font-style:italic;margin-top:3px;">${escHtml(sub2)}</div>` : ''}</div>`;
}
function _pkH(teks) { return `<div style="${_PK_FONT}font-size:11pt;font-weight:700;margin:12px 0 5px;text-transform:uppercase;page-break-after:avoid;break-after:avoid;">${escHtml(teks)}</div>`; }
function _pkP(teks) { return `<p style="${_PK_FONT}font-size:10.5pt;line-height:1.5;text-align:justify;text-indent:1.1cm;margin:0 0 6px;">${escHtml(teks)}</p>`; }
function _pkPlain(teks, indent) { return `<div style="${_PK_FONT}font-size:10.5pt;line-height:1.5;margin:0 0 4px;padding-left:${indent || 0}px;">${escHtml(teks)}</div>`; }
function _pkList(items) {
  return items.map((t, i) => `<div style="${_PK_FONT}font-size:10.5pt;line-height:1.5;display:flex;gap:6px;margin:0 0 3px;padding-left:18px;page-break-inside:avoid;"><span style="min-width:18px;">${i + 1}.</span><span style="flex:1;text-align:justify;">${escHtml(t)}</span></div>`).join('');
}
function _pkIdent(baris, lebar) {
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;${_PK_FONT}font-size:10.5pt;margin:0 0 8px;border:1px solid #444;">
    <colgroup><col style="width:${lebar || 27}%"><col style="width:3%"><col></colgroup><tbody>` +
    baris.map(b => `<tr><td style="border:1px solid #444;padding:4px 7px;font-weight:700;background:#f3f3f3;vertical-align:top;">${escHtml(b[0])}</td><td style="border:1px solid #444;padding:4px 2px;text-align:center;vertical-align:top;">:</td><td style="border:1px solid #444;padding:4px 7px;vertical-align:top;">${escHtml(b[1])}</td></tr>`).join('') +
    '</tbody></table>';
}
// Tabel biasa bergaya Word. kolom = [{h, w, c(center)}], baris = array of array (teks) ; raw=true → HTML
function _pkTabel(kolom, baris, opsi) {
  opsi = opsi || {};
  const th = kolom.map(k => `<th style="border:1px solid #444;background:${opsi.hbg || '#d9e7f0'};color:#000;padding:4px 6px;font-size:10pt;font-weight:700;white-space:normal;text-align:${k.c ? 'center' : 'left'};">${escHtml(k.h)}</th>`).join('');
  const tb = baris.map(r => `<tr style="page-break-inside:avoid;">${r.map((v, i) => `<td style="border:1px solid #444;padding:4px 6px;font-size:10pt;vertical-align:top;color:#000;text-align:${kolom[i].c ? 'center' : 'left'};${(opsi.tebal && opsi.tebal(r)) ? 'font-weight:700;' : ''}">${escHtml(v)}</td>`).join('')}</tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;${_PK_FONT}margin:4px 0 8px;"><colgroup>${kolom.map(k => `<col${k.w ? ` style="width:${k.w}"` : ''}>`).join('')}</colgroup><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table>`;
}
// Gaya analisis di dalam paket: teks biasa (Times), paragraf menjorok, sub judul berhuruf/angka.
// mulai = 'A' (huruf awal) atau angka; extra = paragraf tambahan (HTML) di awal analisis.
function _pkGayaAnalisis(html, mulai, extra) {
  try {
    if (!html) return html || '';
    if (String(html).indexOf('analisis-pm') < 0 && !extra) return html;
    const d = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    let i = 0;
    const lab = k => (typeof mulai === 'number') ? (mulai + k) + '.' : String.fromCharCode(String(mulai || 'A').charCodeAt(0) + k) + '.';
    const boxes = d.querySelectorAll('.analisis-pm');
    boxes.forEach(box => {
      box.setAttribute('style', "margin:8px 0 10px;padding:0 0 0 14px;border:none;background:none;font-family:'Times New Roman',Times,serif;font-size:10.5pt;line-height:1.5;color:#000;text-align:justify;");
      const jd = box.querySelector('.analisis-judul');
      if (jd) { jd.setAttribute('style', 'font-weight:700;margin:0 0 3px;color:#000;margin-left:-14px;'); jd.textContent = lab(i) + ' Analisis dan Penjelasan Data'; i++; }
      box.querySelectorAll('p').forEach(p => p.setAttribute('style', 'margin:0 0 4px;text-indent:1.1cm;text-align:justify;'));
      if (extra && box === boxes[0]) box.insertAdjacentHTML('beforeend', extra);
    });
    return d.body.innerHTML;
  } catch (e) { return html; }
}
// Analisis khusus rujukan: disusun dari judul laporan + isi tiap rujukan (jumlah PM rujukan biasanya sedikit)
function _pkBuangAnalisis(html) {
  try {
    const d = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    d.querySelectorAll('.analisis-pm').forEach(e => e.remove());
    return d.body.innerHTML;
  } catch (e) { return html; }
}
function _pkAnalisisRujukan(S, c, mulai) {
  const list = S.ruj || [];
  if (!list.length) return '';
  const bt = _pkPer(c);
  const tgl = v => new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const rapi = t => String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  const potong = (t, n) => { t = rapi(t); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + ' …' : t; };
  const P = [];
  const tujuan = S.tujuanRuj.join(', ') || 'fasilitas kesehatan rujukan';
  const nama = [...new Set(list.map(x => rapi(x.namaPM)).filter(Boolean))];
  const pct = S.pmPeriksa ? Math.round(S.rujPM / S.pmPeriksa * 100) : 0;
  P.push(`Berdasarkan Laporan Rujukan Penerima Manfaat (PM) periode ${escHtml(bt)}, tercatat <b>${list.length}</b> kejadian rujukan yang melibatkan <b>${S.rujPM}</b> PM, yaitu ${nama.map(n => '<b>' + escHtml(n) + '</b>').join(', ')}, dengan fasilitas tujuan <b>${escHtml(tujuan)}</b>.${S.pmPeriksa ? ` Jumlah tersebut setara dengan ${pct}% dari ${S.pmPeriksa} PM yang diperiksa dokter pada periode yang sama, sehingga sebagian besar keluhan PM dapat ditangani di UPT tanpa rujukan.` : ''}`);
  list.slice(0, 5).forEach(x => {
    const pm = (state.penerima || []).find(p => p.nomorInduk === x.nomorInduk);
    const asr = pm && pm.kamarBlok ? ` (${escHtml(pm.kamarBlok)})` : '';
    const rincian = [];
    rincian.push(`PM atas nama <b>${escHtml(rapi(x.namaPM) || '-')}</b>${asr} dirujuk pada tanggal ${escHtml(tgl(x.tgl))}${x.jenis ? ' dengan jenis rujukan <b>' + escHtml(rapi(x.jenis)) + '</b>' : ''}${x.tujuan ? ' ke <b>' + escHtml(rapi(x.tujuan)) + '</b>' : ''}.`);
    if (x.diagnosis) rincian.push(`Diagnosis yang menjadi dasar rujukan adalah <b>${escHtml(potong(x.diagnosis, 160))}</b>.`);
    if (x.hasil) rincian.push(`Berdasarkan hasil pemeriksaan dan penanganan di fasilitas tujuan, ${escHtml(potong(x.hasil, 380))}`.replace(/\s*$/, /[.!?…]$/.test(rapi(x.hasil)) ? '' : '.'));
    if (x.statusRujukan) rincian.push(`Status rujukan saat ini: <b>${escHtml(rapi(x.statusRujukan))}</b>.`);
    P.push(rincian.join(' '));
  });
  if (list.length > 5) P.push(`Selain itu, terdapat ${list.length - 5} kejadian rujukan lainnya yang dapat dilihat pada tabel rujukan.`);
  P.push(`Rujukan tersebut dilaksanakan sebagai tindak lanjut atas kondisi PM yang memerlukan pemeriksaan dan penanganan medis lebih lanjut dan tidak dapat diselesaikan di UPT. Pengelola Layanan Kesehatan melakukan pendampingan selama proses rujukan serta memantau kondisi PM setelah kembali ke UPT, termasuk pelaksanaan anjuran kontrol dari tenaga medis, sebagai bahan evaluasi pelayanan kesehatan bulan berikutnya.`);
  if (_pkKumpul || (typeof _pkBoxPolos !== 'undefined' && _pkBoxPolos)) return _pkBox(P, mulai);
  const h = '<div class="analisis-pm"><div class="analisis-judul"></div>' + P.map(t => '<p>' + t + '</p>').join('') + '</div>';
  return _pkGayaAnalisis(h, mulai || 'A');
}
function _pkAnalisis(list, label, mulai, extra) {
  try {
    const arr = (list || []).filter(Boolean);
    let h = arr.length ? _htmlAnalisis(_analisisNama(arr.map(r => r.namaPM != null ? r.namaPM : r.nama)), label, 'kegiatan', true, arr.map(_itemDariRec)) : '';
    if (!h && extra) h = '<div class="analisis-pm"><div class="analisis-judul">Analisis dan Penjelasan Data</div></div>';
    return _pkGayaAnalisis(h, mulai || 'A', extra);
  } catch (e) { return ''; }
}
function _pkTTD2(c, opsi) {
  opsi = opsi || {};
  const ik = (state.ttdKasiBase64 && state.ttdKasiBase64.length > 10) ? state.ttdKasiBase64 : '';
  const ip = (state.ttdPetugasBase64 && state.ttdPetugasBase64.length > 10) ? state.ttdPetugasBase64 : '';
  const img = s => s ? `<img src="${safeUrl(s)}" style="height:64px;max-width:150px;object-fit:contain;display:block;margin:0 auto;" onerror="this.remove()">` : '<div style="height:64px;"></div>';
  return `<div style="${_PK_FONT}font-size:10.5pt;margin-top:10px;page-break-inside:avoid;break-inside:avoid;">
    <div style="text-align:right;padding-right:6%;">Pasuruan, ${escHtml(opsi.upper ? c.TTD : c.ttd)}</div>
    <div style="display:flex;justify-content:space-around;margin-top:2px;">
      <div style="text-align:center;min-width:40%;">Menyetujui,<br>Kepala Seksi Pelayanan Sosial${img(ik)}<div>${escHtml(String(c.kasi).toUpperCase())}</div><div>NIP. ${_PK_NIP_KASI}</div></div>
      <div style="text-align:center;min-width:40%;">Disusun oleh,<br>Pengelola Layanan Kesehatan${img(ip)}<div>${escHtml(c.plk)}</div><div>NIP. ${_PK_NIP_PLK}</div></div>
    </div></div>`;
}
function _pkBaru(html) { return `<div style="page-break-before:always;break-before:page;">${html}</div>`; }
function _pkHal(html, awal) {
  return `<div style="${awal ? '' : 'page-break-before:always;break-before:page;'}${_PK_FONT}color:#000;">${html}</div>`;
}
// Kop sampul "Laporan Realisasi Kegiatan" (sama dengan dokumen Word)
function _pkKopSampul() {
  const logo = (typeof LOGO_JATIM_B64 !== 'undefined') ? `<img src="${safeUrl(LOGO_JATIM_B64)}" style="position:absolute;left:30px;top:0;height:78px;width:auto;" alt="Logo Jawa Timur">` : '';
  return `<div data-kop-surat="1" style="${_PK_FONT}color:#000;margin:0 0 8px;">
    <div style="position:relative;min-height:84px;text-align:center;padding:0 96px;line-height:1.25;">${logo}
      <div style="font-style:italic;font-size:9pt;letter-spacing:.3px;">PEMERINTAH PROVINSI JAWA TIMUR</div>
      <div style="font-size:12pt;letter-spacing:5px;">DINAS SOSIAL</div>
      <div style="font-weight:700;font-size:13pt;">UPT REHABILITASI SOSIAL BINA DAKSA PASURUAN</div>
      <div style="font-size:10pt;">JL. RA. KARTINI NO. 292 TELP./FAX. (0343) 741135</div>
      <div style="font-size:10pt;">BANGIL - PASURUAN 6753</div></div>
    <div style="height:0;border-bottom:3px solid #000;margin:6px 0 0;"></div><div style="height:0;border-bottom:1px solid #000;margin:2px 0 0;"></div></div>`;
}
// Sampul: Laporan Realisasi Kegiatan Tugas Jabatan Pegawai
function _pkSampul(c, namaKegiatan, bulanTeks, baris) {
  const ip = (state.ttdPetugasBase64 && state.ttdPetugasBase64.length > 10) ? state.ttdPetugasBase64 : '';
  const f = (a, b) => `<tr><td style="border:none;padding:1px 0;width:23%;">${a}</td><td style="border:none;padding:1px 0;">: ${escHtml(b)}</td></tr>`;
  const rows = baris.map((b, i) => `<tr style="height:46px;"><td style="border:1px solid #000;text-align:center;">${i + 1}.</td><td style="border:1px solid #000;text-align:center;padding:2px;">${escHtml(b[0])}</td><td style="border:1px solid #000;padding:2px 5px;">${escHtml(b[1])}</td><td style="border:1px solid #000;text-align:center;">1</td><td style="border:1px solid #000;text-align:center;">${escHtml(b[2])}</td><td style="border:1px solid #000;text-align:center;">Terlampir</td></tr>`).join('');
  return `${_pkKopSampul()}
    <div style="${_PK_FONT}text-align:center;font-weight:700;font-size:11.5pt;margin:12px 0 10px;font-family:Arial,sans-serif;">LAPORAN REALISASI KEGIATAN TUGAS JABATAN PEGAWAI</div>
    <table style="${_PK_FONT}font-family:Arial,sans-serif;font-size:10pt;border-collapse:collapse;width:100%;margin-bottom:12px;"><tbody>
      ${f('Nama', 'DIFA FITRIASTUTI PUTRI')}${f('NIP', _PK_NIP_PLK)}${f('Pangkat / Gol', 'Pengatur II/c')}${f('Nama Jabatan', 'Pengelola Layanan Kesehatan')}
      ${f('Unit Kerja', 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan – Dinas Sosial')}${f('Nama Kegiatan', namaKegiatan)}${f('Bulan', bulanTeks)}
    </tbody></table>
    <table style="${_PK_FONT}border-collapse:collapse;width:100%;table-layout:fixed;font-size:10pt;margin:0 0 12px;">
      <colgroup><col style="width:7%"><col style="width:16%"><col><col style="width:7%"><col style="width:13%"><col style="width:16%"></colgroup>
      <thead><tr>${['NO', 'TANGGAL', 'DETAIL KEGIATAN', 'JML', 'SATUAN', 'KETERANGAN'].map(h => `<th style="border:1px solid #000;font-weight:700;padding:3px;background:#fff;color:#000;white-space:normal;text-align:center;">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows}<tr><td colspan="3" style="border:1px solid #000;text-align:center;font-weight:700;padding:3px;">TOTAL</td><td style="border:1px solid #000;text-align:center;font-weight:700;">${baris.length}</td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td></tr></tbody></table>
    <div style="${_PK_FONT}font-size:11pt;text-align:right;padding-right:7%;margin-top:14px;page-break-inside:avoid;"><div style="display:inline-block;text-align:center;">
      <div>Pasuruan, ${escHtml(bulanTeks === bulanTeks.toUpperCase() ? c.TTD : c.ttd)}</div><div>Hormat Saya,</div>
      ${ip ? `<img src="${safeUrl(ip)}" style="height:70px;max-width:170px;object-fit:contain;display:block;margin:4px auto;" onerror="this.remove()">` : '<div style="height:70px;"></div>'}
      <div style="font-weight:700;text-decoration:underline;">DIFA FITRIASTUTI PUTRI, A.Md.Kes</div><div>NIP. ${_PK_NIP_PLK}</div></div></div>`;
}
// Berita Acara
function _pkBAHead(subjudul, bulanTeks) {
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;${_PK_FONT}margin-bottom:10px;"><colgroup><col><col style="width:36%"></colgroup><tr>
    <td style="border:none;border-bottom:2px solid #000;padding:6px 4px;vertical-align:middle;"><div style="font-weight:700;font-size:10pt;">PEMERINTAH PROVINSI JAWA TIMUR</div><div style="font-weight:700;font-size:10pt;">DINAS SOSIAL</div><div style="font-weight:700;font-size:11pt;margin-top:2px;">UPT REHABILITASI SOSIAL BINA DAKSA PASURUAN</div><div style="font-style:italic;font-size:9.5pt;">Seksi Pelayanan Sosial</div></td>
    <td style="border:none;background:#2c6aa0;color:#fff;text-align:center;padding:8px;vertical-align:middle;"><div style="font-size:14pt;font-weight:700;">BERITA ACARA</div><div style="font-size:8.5pt;line-height:1.25;">${escHtml(subjudul)}</div><div style="font-size:8.5pt;">${escHtml(bulanTeks)}</div></td></tr></table>`;
}
function _pkBAIdent(noBA, baris) { return _pkH('A. Identitas Berita Acara') + _pkIdent([['No. Berita Acara', noBA]].concat(baris), 24); }

// ══════════ PENGAMBILAN HTML DARI LAPORAN YANG SUDAH ADA ══════════
// Fungsi cetak lama dipakai apa adanya (tampilan identik), hanya hasil HTML-nya
// ditangkap sementara agar dapat disisipkan ke dalam paket.
let _pkFila = Promise.resolve();
// Penangkapan dijalankan satu per satu (fungsi cetak global diganti sementara)
function _pkTangkap(setelan, fn, timeoutMs) {
  const jalan = _pkFila.then(() => _pkTangkapAsli(setelan, fn, timeoutMs));
  _pkFila = jalan.catch(() => { });
  return jalan;
}
async function _pkTangkapAsli(setelan, fn, timeoutMs) {
  const simpan = {};
  Object.keys(setelan || {}).forEach(id => { const el = document.getElementById(id); if (el) { simpan[id] = el.value; el.value = setelan[id]; } });
  const a1 = window.cetakPDFIsolated, a2 = window.printKartuIsolated;
  let hasil = '', selesai;
  const sinyal = new Promise(r => { selesai = r; });
  window.cetakPDFIsolated = h => { hasil = h; selesai(); };
  window.printKartuIsolated = h => { hasil = h; selesai(); };
  try {
    const r = fn();
    if (r && typeof r.then === 'function') await r.catch(e => { console.warn('[PK] gagal menangkap laporan:', e && e.message); });
    await Promise.race([sinyal, new Promise(r2 => setTimeout(r2, timeoutMs || 25000))]);
  } finally {
    window.cetakPDFIsolated = a1; window.printKartuIsolated = a2;
    Object.keys(simpan).forEach(id => { const el = document.getElementById(id); if (el) el.value = simpan[id]; });
  }
  return hasil ? `<div style="max-width:100%;margin:0 0 8px;">${hasil}</div>` : '';
}
function _pkLapor(setelan, fn, kosong) {
  return _pkTangkap(setelan, fn).then(h => h || `<div style="${_PK_FONT}font-size:10pt;font-style:italic;color:#555;margin:4px 0 8px;">${escHtml(kosong)}</div>`);
}

async function _pkFoto(url, fileId) {
  try {
    if (!url) return '';
    if (String(url).startsWith('data:')) return url;
    const id = fileId || (String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/) || [])[1] || (String(url).match(/\/d\/([a-zA-Z0-9_-]+)/) || [])[1];
    if (id && state.scriptUrl) {
      try {
        const r = await fetch(state.scriptUrl + '?action=getPhotoBase64&fileId=' + encodeURIComponent(id), { cache: 'force-cache' });
        if (r.ok) { const j = await r.json(); if (j.ok && j.data) return j.data; }
      } catch (e) { }
    }
    return typeof getDriveEmbedUrl === 'function' ? getDriveEmbedUrl(url) : url;
  } catch (e) { return ''; }
}
async function _pkDokumentasi(fotoList, tinggi) {
  const srcs = (await Promise.all((fotoList || []).slice(0, 3).map(f => _pkFoto(f.url, f.driveFileId)))).filter(Boolean);
  if (!srcs.length) return `<div style="${_PK_FONT}font-size:10pt;font-style:italic;color:#666;padding-left:18px;margin:2px 0 8px;">Foto dokumentasi belum diunggah pada menu Dokumentasi Foto.</div>`;
  return `<div style="display:flex;gap:10px;flex-wrap:wrap;padding-left:18px;margin:4px 0 10px;">${srcs.map(s => `<img src="${safeUrl(s)}" style="height:${tinggi || 170}px;max-width:240px;object-fit:cover;border:1px solid #888;" onerror="this.style.display='none'">`).join('')}</div>`;
}

// ══════════ BERITA ACARA PER PAKET ══════════
function _pkBA(n, c, S) {
  const bt = _pkPer(c);
  const pend = [`Demikian Berita Acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.`];
  const kasiTxt = c.kasi + ' (Kepala Seksi Pelayanan Sosial)';
  const notulis = c.plk + ' (Pengelola Layanan Kesehatan)';
  let h = '';
  if (n === 1) {
    h += _pkBAHead('Penyusunan Kegiatan Pelayanan Sosial', bt);
    h += _pkBAIdent('001/BA-T1/YANSOS-RSBD/' + c.rom + '/' + c.thn, [['Perihal', 'Penyusunan Laporan Bulanan ' + bt], ['Bulan', bt], ['Kepala Seksi', kasiTxt], ['Notulis', notulis]]);
    h += _pkH('B. Uraian Kegiatan Pemeriksaan Kesehatan');
    const U = [
      ['Persiapan Pemeriksaan', 'Pengelola Layanan Kesehatan mempersiapkan ruang periksa, alat kesehatan (tensimeter, termometer, stetoskop, dll), rekam medis seluruh PM, obat-obatan yang diperlukan, dan daftar PM. PM dengan keluhan yang telah dicatat dalam H-7 diprioritaskan untuk bertemu dokter lebih awal.'],
      ['Pelaksanaan Pemeriksaan Kesehatan', `Dokter Puskesmas melakukan pemeriksaan fisik umum kepada PM yang mengeluhkan sakit (bukan seluruh ${S.aktif} PM) secara bergantian sesuai urutan asrama. Pemeriksaan meliputi: tekanan darah, suhu tubuh, pemeriksaan fisik, konsultasi keluhan, diagnosis, dan pemberian terapi/obat. PM dengan keluhan khusus mendapat pemeriksaan lebih mendalam.`],
      ['Penanganan Keluhan & Konsultasi', 'Keluhan PM yang telah dicatat oleh Pengelola dalam rentang H-7 s/d hari-H disampaikan kepada dokter untuk dikonsultasikan. Setiap keluhan mendapat respons medis berupa diagnosis, terapi, atau rujukan. Pengelola mendampingi setiap PM selama proses konsultasi berlangsung.'],
      ['Pencatatan & Dokumentasi', 'Hasil pemeriksaan setiap PM dicatat dalam form pemeriksaan individual dan direkap dalam rekam medis/buku kesehatan PM. Obat yang diberikan dicatat dalam buku pemberian obat. Berita Acara ini dibuat sebagai dokumen resmi pelaksanaan kunjungan dokter dan pemeriksaan kesehatan.'],
      ['Penanganan Pasca Pemeriksaan', 'PM yang memerlukan tindak lanjut (kontrol, perawatan berlanjut) dicatat dalam jadwal kontrol. PM yang memerlukan rujukan ke Puskesmas/RS dibuatkan surat rujukan dan resume kesehatannya. Obat sisa dan alat kesehatan disimpan kembali dengan aman.']
    ];
    h += U.map((u, i) => `<div style="${_PK_FONT}font-size:10.5pt;line-height:1.5;margin:0 0 4px;padding-left:14px;page-break-inside:avoid;">${i + 1}. ${escHtml(u[0])}<div style="text-align:justify;text-indent:1.1cm;padding-left:14px;">${escHtml(u[1])}</div></div>`).join('');
    h += _pkH('C. Tanda Tangan') + _pkTTD2(c);
  } else if (n === 2) {
    h += _pkBAHead('kebutuhan obat & riwayat kesehatan', bt);
    h += _pkBAIdent('002/BA-T2/YANSOS-RSBD/' + c.rom + '/' + c.thn, [['Perihal', 'Verifikasi Dokumen Kebutuhan Obat dan Riwayat Kesehatan PM'], ['Tanggal', c.ttd], ['Kepala Seksi', kasiTxt], ['Notulis', notulis]]);
    h += _pkH('B. Hasil verifikasi:');
    h += _pkList([
      `Daftar kebutuhan dan penggunaan obat bulan ${bt} telah tersusun lengkap untuk ${S.pmPeriksa} PM yang mengeluh dan diperiksa dokter Puskesmas.`,
      'Rekam medis seluruh PM yang berkunjung telah diisi lengkap meliputi identitas, riwayat kesehatan, keluhan, penanganan, dan obat yang diberikan.',
      `Log penggunaan obat harian telah tercatat untuk seluruh ${S.jmlKunj} kunjungan pemeriksaan dokter dan ${S.insN} kejadian keluhan insidental PM selama bulan ${bt}.`,
      'Stok obat tercatat tertib: obat masuk dari pengadaan kantor kondisional, obat keluar sesuai kebutuhan PM.',
      'Seluruh dokumen dinyatakan lengkap dan siap diarsipkan.']);
    h += _pkH('C. Rekapitulasi singkat:');
    h += _pkTabel([{ h: 'No', w: '8%', c: 1 }, { h: 'Indikator' }, { h: 'Hasil', w: '26%' }], [
      ['1', 'Jumlah PM yang mendapat pemeriksaan & obat', S.pmPeriksa + ' PM'],
      ['2', 'Total kunjungan PM bulan ' + bt, S.jmlKunj + ' kali'],
      ['3', 'Kunjungan dokter Puskesmas ke UPT', S.kunj.length + ' kali (Sesuai jadwal)']]);
    h += _pkP(pend[0]) + _pkH('D. Tanda Tangan') + _pkTTD2(c);
  } else if (n === 3) {
    h += _pkBAHead('Pemeriksaan Kesehatan dan Pelaporan Keluhan Insidental PM', bt);
    h += _pkBAIdent('003/BA-T3/YANSOS-RSBD/' + c.rom + '/' + c.thn, [['Perihal', 'Pelaporan Keluhan Insidental dan Pemeriksaan Kesehatan PM'], ['Tanggal', c.ttd], ['Kepala Seksi', kasiTxt], ['Notulis', notulis]]);
    h += _pkP(`Pada bulan ${bt}, bertempat di Poli Kesehatan UPT Rehabilitasi Sosial Bina Daksa Pasuruan, Dinas Sosial Provinsi Jawa Timur, telah dilaksanakan pemeriksaan kesehatan PM oleh dokter terhadap PM yang mengalami keluhan insidental periode ${bt}.`);
    h += _pkIdent([['Periode', bt], ['Waktu', '10.00 – 13.00 WIB'], ['Tempat', 'Poli Kesehatan UPT RSBD Pasuruan'], ['Dokter Pemeriksa', c.dokter], ['Koordinator Layanan', notulis], ['Periode Keluhan Insidental', bt], ['Jumlah PM Diperiksa', `${S.insPM} PM yang mengalami keluhan insidental (${S.insN} kejadian)`], ['Referensi Laporan', '005/LAP-KES/YANSOS-KES /' + c.rom + '/' + c.thn]], 34);
    h += _pkH('B. Kegiatan yang dilaksanakan:');
    h += _pkList([
      `Pengelola Layanan Kesehatan menyampaikan catatan keluhan insidental yang terkumpul selama ${bt} kepada dokter pemeriksa.`,
      `Dokter memeriksa kondisi kesehatan ${S.insDiperiksa} kejadian keluhan insidental yang belum sembuh secara berurutan; ${S.insSehatPM} PM lainnya tercatat sudah sehat sebelum hari pemeriksaan.`,
      'Dokter memberikan diagnosis, penanganan, dan resep obat sesuai kondisi masing-masing PM.',
      'Pengelola Layanan Kesehatan menyimpan dan mencatat seluruh hasil pemeriksaan pada Data Medis PM',
      `Penyusunan laporan perkembangan kesehatan PM bulan ${bt}.`]);
    h += _pkP(pend[0]) + _pkH('C. Tanda Tangan') + _pkTTD2(c);
  } else if (n === 4) {
    h += _pkBAHead('Penyusunan Resume Kesehatan dan Dokumen Rujukan PM', c.NB + ' ' + c.thn);
    h += _pkBAIdent('004/BA-T4/YANSOS-RSBD/' + c.rom + '/' + c.thn, [['Perihal', 'Penyusunan Resume Kesehatan dan Dokumen Rujukan PM'], ['Bulan', c.NB + ' ' + c.thn], ['Kepala Seksi', kasiTxt], ['Notulis', notulis]]);
    h += _pkP(`Pada bulan ${c.NB} ${c.thn}, bertempat di Ruang Kerja Seksi Pelayanan Sosial UPT Rehabilitasi Sosial Bina Daksa Pasuruan, Dinas Sosial Provinsi Jawa Timur, telah dilaksanakan penyusunan resume kesehatan dan dokumen rujukan layanan kesehatan Penerima Manfaat (PM) bulan ${c.NB} ${c.thn}.`);
    h += _pkH('B. Kegiatan yang dilaksanakan');
    h += _pkList([
      `Pengelola Layanan Kesehatan merekapitulasi seluruh data kondisi kesehatan ${S.pmPeriksa} PM sepanjang bulan ${c.NB} ${c.thn} dari catatan kunjungan, rekam medis, dan laporan keluhan insidental yang diperiksa.`,
      'Penyusunan resume kesehatan meliputi Diagnosa, Keluhan/anamnesa, Obat/terapi, Tindak Lanjut, dan Edukasi/pemantauan.',
      `Penyusunan laporan rujukan untuk ${S.rujPM} PM${S.tujuanRuj.length ? ' menuju ' + S.tujuanRuj.join(', ') : ''} berdasarkan keluhan kesehatan yang dialaminya.`,
      'Verifikasi dokumen rujukan sebagai bahan pemantauan pasca rujukan.',
      'Verifikasi seluruh dokumen oleh Kepala Seksi Pelayanan Sosial.']);
    h += _pkH('C. Hasil Kegiatan');
    const tdkRuj = Math.max(0, S.pmPeriksa - S.rujPM);
    h += _pkTabel([{ h: 'No', w: '8%', c: 1 }, { h: 'Indikator' }, { h: 'Hasil', w: '42%' }], [
      ['1', 'Total PM yang dibuatkan resume kesehatan', S.pmPeriksa + ' PM'],
      ['2', 'PM dengan status kesehatan Baik', S.baik + ' PM'],
      ['3', 'PM dengan status kesehatan perlu perhatian', S.cukup + ' PM'],
      ['4', 'PM yang memerlukan rujukan layanan kesehatan', S.rujPM + ' PM' + (S.tujuanRuj.length ? ' (Ke ' + S.tujuanRuj.join(', ') + ')' : '')],
      ['5', 'PM yang tidak memerlukan rujukan', `${tdkRuj} PM (${S.baik} Baik + ${S.cukup} Cukup Baik) – ditangani di UPT`]]);
    h += _pkH('D. Kesimpulan');
    h += _pkList([`Resume kesehatan seluruh ${S.pmPeriksa} PM bulan ${c.NB} ${c.thn} telah tersusun lengkap.`,
      S.rujPM ? `Laporan rujukan ${S.rujPM} PM${S.tujuanRuj.length ? ' ke ' + S.tujuanRuj.join(', ') : ''} telah diterbitkan.` : 'Tidak terdapat PM yang memerlukan rujukan pada bulan ini.',
      'Seluruh dokumen dinyatakan lengkap dan siap diarsipkan.']);
    h += _pkP(pend[0]) + _pkH('E. Tanda Tangan') + _pkTTD2(c, { upper: true });
  } else {
    h += _pkBAHead('Pendampingan Pemeriksaan Kesehatan Pm', c.NB + ' ' + c.thn);
    h += _pkBAIdent('005/BA-T5/YANSOS-RSBD/' + c.rom + '/' + c.thn, [['Perihal', 'Pendampingan Pemeriksaan Kesehatan Pm'], ['Tanggal', c.TTD], ['Kepala Seksi', kasiTxt], ['Notulis', notulis]]);
    h += _pkP(`Pada bulan ${c.NB} ${c.thn}, bertempat di Poli Kesehatan UPT RSBD Pasuruan, Dinas Sosial Provinsi Jawa Timur, telah dilaksanakan pendampingan pemeriksaan kesehatan PM saat kunjungan dokter mingguan.`);
    h += _pkIdent([['Bulan/Tanggal', c.NB + ' ' + c.thn], ['Waktu', '10.00 – 13.00 WIB'], ['Tempat', 'Poli Kesehatan UPT RSBD Pasuruan'], ['Dokter Pemeriksa', 'Dokter ' + String(c.dokter).replace(/^dr\.?\s*/i, '')], ['Petugas Pendamping', notulis]], 30);
    h += _pkH('B. Kegiatan yang dilaksanakan:');
    h += _pkList(['Persiapan catatan keluhan PM dan penyambutan dokter Puskesmas.', 'Pendampingan setiap PM yang mengeluh selama pemeriksaan berlangsung.', 'Pencatatan hasil pemeriksaan, penanganan, dan obat yang diberikan.', 'Penyampaian edukasi kesehatan kepada PM sesuai kondisi masing-masing.']);
    h += _pkH('C. Rincian PM diperiksa.') + _pkPlain('Sesuai dengan resume kesehatan', 18);
    h += _pkH('D. Tanda Tangan') + _pkTTD2(c, { upper: true });
  }
  return h;
}

// ══════════ PAKET 1 ══════════
async function _pkPaket1(c, S) {
  const bt = _pkPer(c);
  let h = _pkHal(_pkSampul(c, 'Dok bahan penyusunan program & jadwal pemeriksaan kesehatan', bt, [['1 ' + bt, 'Bahan penyusunan program kesehatan', 'Kegiatan'], ['1 ' + bt, 'Bahan jadwal pemeriksaan kesehatan', 'Kegiatan']]), true);
  // Rencana program
  let r = _pkBanner('Rencana Program Pemeriksaan Kesehatan PM', 'PERIODE BULAN ' + c.NB + ' ' + c.thn + '\nUPT Rehabilitasi Sosial Bina Daksa Pasuruan');
  r = _pkSubBanner('RENCANA PROGRAM PEMERIKSAAN KESEHATAN PM', 'PERIODE BULAN ' + c.NB + ' ' + c.thn, 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan — Seksi Pelayanan Sosial');
  r += _pkH('A. Identitas Laporan Bulanan');
  r += _pkIdent([['No. Laporan', '001/REN-PROG/YANSOS-KES/' + c.rom + '/' + c.thn], ['Jenis Laporan', 'Bahan penyusunan program kesehatan'], ['Periode', bt], ['Jabatan Penyusun', 'Pengelola Layanan Kesehatan'], ['Nama (Kasi)', c.kasi + ' — NIP. ' + _PK_NIP_KASI], ['Nama (PLK)', c.plk], ['Dasar', 'Bahan penyusunan program kesehatan'], ['Total PM', S.totalPMText]]);
  r += _pkH('I. Latar Belakang');
  r += _pkP('Layanan pemeriksaan kesehatan bagi Penerima Manfaat (PM) penyandang disabilitas fisik di UPT Rehabilitasi Sosial Bina Daksa Pasuruan diselenggarakan melalui kerja sama dengan Puskesmas setempat. Dokter dari Puskesmas datang ke UPT untuk melakukan pemeriksaan pada hari Rabu atau Kamis, menyesuaikan jadwal dokter yang bertugas. Pemeriksaan dilakukan kepada PM yang secara aktif mengeluhkan gangguan kesehatan atau ketidaknyamanan fisik, bukan secara terjadwal untuk seluruh PM.');
  r += _pkH('II. Tujuan');
  r += _pkList(['Memberikan penanganan kesehatan yang tepat kepada PM yang mengeluhkan sakit.', 'Memfasilitasi kunjungan dokter Puskesmas ke UPT secara terkoordinasi.', 'Mencatat dan mendokumentasikan setiap keluhan serta tindak penanganan PM.', 'Menyediakan data kesehatan PM sebagai bahan laporan bulanan.']);
  r += _pkH('III. Mekanisme Layanan');
  r += _pkTabel([{ h: 'No', w: '7%', c: 1 }, { h: 'Tahapan', w: '28%' }, { h: 'Keterangan' }], [
    ['1', 'Koordinasi jadwal dokter', 'Pengelola Layanan Kesehatan berkoordinasi dengan Puskesmas untuk memastikan hari kunjungan dokter (Rabu atau Kamis) pada bulan berjalan.'],
    ['2', 'PM melaporkan keluhan', 'PM menyampaikan keluhan sakit kepada Pengelola Layanan Kesehatan sebelum atau pada hari kunjungan dokter.'],
    ['3', 'Pencatatan keluhan awal', 'Pengelola Layanan Kesehatan mencatat identitas PM dan keluhan yang disampaikan sebagai bahan pemeriksaan dokter.'],
    ['4', 'Pemeriksaan oleh dokter Puskesmas', 'Dokter dari Puskesmas memeriksa PM yang mengeluh dan memberikan penanganan atau resep sesuai kondisi.'],
    ['5', 'Pencatatan hasil & tindak lanjut', 'Hasil pemeriksaan dan penanganan dicatat. Bila diperlukan, PM dirujuk ke Puskesmas atau fasilitas kesehatan lanjutan.'],
    ['6', 'Rekap laporan mingguan', 'Seluruh kunjungan PM direkap setiap minggu sebagai bahan laporan bulanan kepada Kepala Seksi Pelayanan Sosial.']]);
  r += _pkH('IV. Waktu dan Tempat Layanan');
  r += _pkIdent([['Hari Kunjungan Dokter', 'Rabu atau Kamis (menyesuaikan jadwal dokter Puskesmas)'], ['Frekuensi', '4 (empat) kali per bulan – Minggu I–V'], ['Tempat', 'Poli Kesehatan UPT RSBD Pasuruan'], ['Dokter Pemeriksa', c.dokter + ' dari Puskesmas Raci'], ['Koordinator Layanan', c.plk + ' (Pengelola Layanan Kesehatan)'], ['Pelaporan', 'Rekap 2 mingguan → laporan bulanan']], 30);
  r += _pkH('V. Penutup');
  r += _pkP(`Rencana program ini menjadi acuan pelaksanaan layanan pemeriksaan kesehatan PM bulan ${bt} dan dasar penyusunan catatan kunjungan serta laporan bulanan kepada Kepala Seksi Pelayanan Sosial.`);
  r += _pkH('VI. Tanda Tangan') + _pkTTD2(c);
  h += _pkHal(r);
  // Jadwal kunjungan dokter
  let j = _pkSubBanner('JADWAL KUNJUNGAN DOKTER', 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan', 'Seksi Pelayanan Sosial — Tupoksi 7');
  j += _pkH('A. Identitas Laporan');
  j += _pkIdent([['No. Laporan', '002/JADWAL-DOK/YANSOS-KES/' + c.rom + '/' + c.thn], ['Jenis Laporan', 'Jadwal Kunjungan Dokter'], ['Periode', bt], ['Jabatan Penyusun', 'Pengelola Layanan Kesehatan'], ['Nama (Kasi)', c.kasi + ' — NIP. ' + _PK_NIP_KASI], ['Nama (PLK)', c.plk], ['Total PM', S.totalPMText], ['Cakupan Laporan', 'Pemeriksaan dilaksanakan kepada PM yang mengeluhkan sakit, pada hari kunjungan dokter Puskesmas ke UPT']]);
  j += _pkH('B. Jadwal Kunjungan Dokter Puskesmas ke UPT – ' + c.NB + ' ' + c.thn);
  const baris = S.kunj.map(k => [String(k.no), `${k.no} (Minggu ${k.rom})`, `${String(k.tgl.getDate()).padStart(2, '0')} ${c.NB} ${c.thn}`, '10.00 – 13.00 WIB', 'Poli Kesehatan UPT RSBD', 'Dokter Puskesmas ' + c.dokter.replace(/^dr\.?\s*/i, 'dr.')]);
  j += baris.length ? _pkTabel([{ h: 'No', w: '6%', c: 1 }, { h: 'Kunjungan ke-', w: '17%' }, { h: 'Hari & Tanggal', w: '19%' }, { h: 'Waktu', w: '15%' }, { h: 'Tempat', w: '20%' }, { h: 'Dokter Pemeriksa' }], baris)
    : _pkPlain('Belum ada data kunjungan dokter pada bulan ini.', 14);
  j += `<div style="${_PK_FONT}font-size:10pt;margin:4px 0 6px;">Catatan: Hari kunjungan dokter (Rabu/Kamis) ditetapkan berdasarkan konfirmasi jadwal dari Puskesmas Raci dan dapat berubah menyesuaikan ketersediaan dokter.</div>`;
  j += _pkH('D. Tanda Tangan Laporan') + _pkTTD2(c);
  h += _pkHal(j);
  h += _pkHal(_pkBA(1, c, S));
  return h;
}

// ══════════ PAKET 2 ══════════
async function _pkPaket2(c, S) {
  const bt = _pkPer(c);
  const set = { rekapObatBulan: String(c.bln), rekapObatTahun: String(c.thn), rekapObatSumber: '', rekapObatPM: '' };
  const [rekap, stok] = await Promise.all([_pkLapor(set, () => cetakRekapObat(), 'Belum ada data pemakaian obat pada bulan ini.'), _pkLapor({}, () => cetakStokObat(), 'Belum ada data stok obat.')]);
  let h = _pkHal(_pkSampul(c, 'Dok kebutuhan obat & riwayat kesehatan PM', bt, [[c.ttd, 'Kebutuhan obat & riwayat kesehatan PM', 'Dokumen'], [c.ttd, 'Riwayat kesehatan PM', 'Dokumen']]), true);
  let a = _pkSubBanner('DAFTAR KEBUTUHAN DAN PENGGUNAAN OBAT PM', 'PERIODE BULAN ' + c.NB + ' ' + c.thn, 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan — Seksi Pelayanan Sosial');
  a += _pkH('A. Identitas Laporan Bulanan');
  a += _pkIdent([['No. Laporan', '003/DAFT-OBAT/YANSOS-KES /' + c.rom + '/' + c.thn], ['Jenis Laporan', 'Daftar kebutuhan obat'], ['Periode', `${bt} (1 – ${new Date(c.thn, c.bln, 0).getDate()} ${bt})`], ['Jabatan Penyusun', 'Pengelola Layanan Kesehatan'], ['Nama (Kasi)', c.kasi + ' — NIP. ' + _PK_NIP_KASI], ['Nama (PLK)', c.plk], ['Sumber Obat', 'Pengadaan Kantor'], ['Total PM', S.totalPMText]], 25);
  a += _pkH('B. Rekapitulasi Stok') + _pkBuangAnalisis(rekap) + _pkAnalisisObat(S, c, 'A');
  a += _pkH('C. Catatan') + _pkList(['Seluruh obat bersumber dari Pengadaan kantor 3 bulan sekali/kondisional.', 'Obat hanya diberikan kepada PM yang mengeluh sakit dan telah mendapat pemeriksaan dokter.', 'Setiap pemberian obat dicatat dalam Log Penggunaan Obat dan Rekam Medis PM.']);
  a += _pkH('D. Tanda Tangan Laporan Bulanan') + _pkTTD2(c);
  h += _pkHal(a);
  let l = _pkSubBanner('LOG PENGGUNAAN OBAT PM', 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan', '').replace('#14304f', '#2c6aa0');
  l += _pkH('A. Identitas Laporan');
  l += _pkIdent([['No. Laporan', '004/LOG-OBAT/YANSOS-KES/' + c.rom + '/' + c.thn], ['Periode', bt], ['Jabatan Penyusun', 'Pengelola Layanan Kesehatan'], ['Nama (Kasi)', c.kasi + ' — NIP. ' + _PK_NIP_KASI], ['Nama (PLK)', c.plk], ['Total PM', S.totalPMText], ['Keterangan', 'Log dicatat setiap kunjungan PM pada hari kunjungan dokter Puskesmas ke UPT (Rabu/Kamis) / Insidental']], 25);
  l += _pkH('B. Log Harian Pemberian Obat') + _pkPlain('Sesuai dengan rekam medis dan Riwayat insidental (Rekapitulasi Obat).', 18);
  l += _pkH('C. Sisa Stok Obat Akhir Bulan ' + bt) + _pkBuangAnalisis(stok) + _pkAnalisisStok(c, 'A');
  l += _pkH('D. Tanda Tangan') + _pkTTD2(c);
  h += _pkHal(l);
  h += _pkHal(_pkBA(2, c, S));
  return h;
}

// ══════════ PAKET 3 ══════════
async function _pkPaket3(c, S) {
  const bt = _pkPer(c);
  const periode = { bulan: String(c.bln), tahun: String(c.thn) };
  const adaRuj = S.ruj.length > 0;
  const [tIns, tInsP, tRiw, tRuj] = await Promise.all([
    _pkLapor({ kasiInsidentalBulan: periode.bulan, kasiInsidentalTahun: periode.tahun }, () => cetakPDFKasiCard('insidental'), 'Tidak ada keluhan insidental pada bulan ini.'),
    _pkLapor({ kasiInsidentalPeriksa_bulan: periode.bulan, kasiInsidentalPeriksa_tahun: periode.tahun }, () => cetakPDFKasiCard('insidentalPeriksa'), 'Tidak ada PM insidental yang lanjut diperiksa dokter pada bulan ini.'),
    _pkLapor({ kasiRiwayatBulan: periode.bulan, kasiRiwayatTahun: periode.tahun, kasiRiwayatSearch: '' }, () => cetakPDFKasiCard('riwayat'), 'Tidak ada hasil pemeriksaan dokter pada bulan ini.'),
    adaRuj ? _pkLapor({ kasiRujBulan: periode.bulan, kasiRujTahun: periode.tahun }, () => cetakPDFRujukanKasi(), 'Tidak ada rujukan pada bulan ini.') : Promise.resolve(`<div style="${_PK_FONT}font-size:10pt;font-style:italic;color:#555;margin:4px 0 8px;">Tidak ada pemeriksaan rujukan pada bulan ini.</div>`)
  ]);
  let h = _pkHal(_pkSampul(c, 'Laporan kesehatan & perkembangan kesehatan PM', c.NB + ' ' + c.thn, [['15 ' + bt, 'Laporan kesehatan & perkembangan kesehatan PM', 'Dokumen'], [c.ttd, 'Laporan kesehatan & perkembangan kesehatan PM', 'Dokumen']]), true);
  let a = _pkSubBanner('LAPORAN KESEHATAN DAN PERKEMBANGAN KESEHATAN PM', 'PERIODE BULAN ' + c.NB + ' ' + c.thn, 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan — Seksi Pelayanan Sosial');
  a += _pkH('A. Identitas Laporan Bulanan');
  a += _pkIdent([['No. Laporan', '005/LAP-KES/YANSOS-KES /' + c.rom + '/' + c.thn], ['Jenis Laporan', 'Insidental Penerima Manfaat'], ['Periode', bt], ['Jabatan Penyusun', 'Pengelola Layanan Kesehatan'], ['Nama (Kasi)', c.kasi + ' — NIP. ' + _PK_NIP_KASI], ['Nama (PLK)', c.plk], ['Total PM', S.totalPMText]]);
  a += _pkH('I. Pendahuluan');
  a += _pkP('Laporan ini menyajikan data keluhan kesehatan insidental yang dialami Penerima Manfaat (PM) penyandang disabilitas fisik di UPT RSBD Pasuruan selama 1 (satu) minggu setiap sebelum pelaksanaan pemeriksaan dokter Puskesmas. Keluhan insidental dicatat oleh Pengelola Layanan Kesehatan.');
  a += _pkH('II. Rekapitulasi Keluhan Insidental') + _pkPlain('Periode pencatatan : ' + bt, 8) + _pkBuangAnalisis(tIns);
  a += _pkH('III. Hasil Pemeriksaan Insidental yang Diperiksa Dokter') + _pkP('Beberapa PM yang tercatat mengalami keluhan insidental di atas telah diperiksa oleh dokter dengan hasil sebagai berikut:') + _pkBuangAnalisis(tInsP);
  a += _pkH('IV. Hasil Pemeriksaan Dokter') + _pkBuangAnalisis(tRiw);
  a += _pkH('V. Hasil Pemeriksaan Rujukan') + _pkBuangAnalisis(tRuj);
  a += _pkH('VI. Analisis Perkembangan Kesehatan PM');
  const namaRuj = [...new Set(S.ruj.map(r => r.namaPM).filter(Boolean))];
  const pt = [`Dari ${S.aktif} PM yang menjalani rehabilitasi sosial bulan ${bt}, sebanyak ${S.pmPeriksa} PM diperiksa dokter dalam ${S.jmlKunj} kunjungan pada pemeriksaan mingguan. Keluhan insidental tercatat pada ${S.insPM} PM (${S.insN} kejadian), dengan ${S.insDiperiksa} kejadian di antaranya diperiksa dokter pada pemeriksaan mingguan dan ${S.insSehatPM} PM lainnya tercatat sudah sehat sebelum hari pemeriksaan.`,
    S.tindak ? `Sebagian besar keluhan bersifat ringan hingga sedang; ${S.tindak} PM memerlukan tindak lanjut berupa rujukan.` : 'Seluruh keluhan bersifat ringan hingga sedang'];
  if (namaRuj.length) pt.push(`PM atas nama ${namaRuj.join(', ')} dirujuk ke ${S.tujuanRuj.join(', ') || 'fasilitas kesehatan'} dari keluhan insidental`);
  a += _pkList(pt);
  a += _pkAnalisisLaporan005(S, c, 'A');
  a += _pkH('VII. Kesimpulan');
  a += _pkP(`Keluhan kesehatan insidental bulan ${bt} ${S.insSehatPM + S.insDiperiksa >= S.insN && !S.tindak ? 'seluruhnya telah tertangani pada hari pemeriksaan dokter' : 'telah ditangani pada hari pemeriksaan dokter dan, bila diperlukan, ditindaklanjuti melalui rujukan'}. Pengelola Layanan Kesehatan akan terus memantau perkembangan kondisi PM dan mencatat setiap keluhan baru yang muncul sebagai bahan laporan bulan berikutnya.`);
  a += _pkH('VIII. Tanda Tangan Laporan Bulanan') + _pkTTD2(c);
  h += _pkHal(a);
  h += _pkHal(_pkBA(3, c, S));
  return h;
}

// PM insidental yang pemeriksaan dokter lanjutannya jatuh pada kunjungan k
function _pkInsLanjut(S, k) {
  const hasil = [];
  S.ins.forEach(x => {
    const lanjut = (state.pemeriksaan || []).filter(p => p && !p._deleted && p.nomorInduk === x.nomorInduk && new Date(p.tglPeriksa) >= new Date(x.tgl)).sort((a, b) => new Date(a.tglPeriksa) - new Date(b.tglPeriksa))[0];
    if (lanjut && _pkKunciTgl(lanjut.tglPeriksa) === k.key) hasil.push(x);
  });
  return hasil;
}
function _pkTeksInsLanjut(list, tglTeks) {
  if (!list.length) return `<p style="margin:0 0 4px;text-indent:1.1cm;text-align:justify;">Pada kunjungan tanggal ${escHtml(tglTeks)}, tidak terdapat PM dengan keluhan insidental yang dilanjutkan pemeriksaannya oleh dokter.</p>`;
  const nama = [...new Set(list.map(x => String(x.namaPM || '').replace(/\s+/g, ' ').trim()).filter(Boolean))];
  const ket = [...new Set(list.map(x => String(x.keluhan || '').trim()).filter(Boolean))].slice(0, 4);
  return `<p style="margin:0 0 4px;text-indent:1.1cm;text-align:justify;">Dari seluruh PM yang diperiksa pada kunjungan tanggal ${escHtml(tglTeks)}, terdapat <b>${nama.length}</b> PM yang sebelumnya tercatat mengalami keluhan insidental (${list.length} kejadian) dan dilanjutkan pemeriksaannya oleh dokter, yaitu ${nama.map(escHtml).join(', ')}.${ket.length ? ' Keluhan insidental yang disampaikan antara lain ' + ket.map(escHtml).join('; ') + '.' : ''} Seluruh keluhan tersebut telah dicatat dan ditindaklanjuti sesuai hasil pemeriksaan dokter.</p>`;
}
// ══════════ PAKET 4 ══════════
function _pkNamaHari(d) { return d.toLocaleDateString('id-ID', { weekday: 'long' }); }
async function _pkPaket4(c, S) {
  const bt = c.NB + ' ' + c.thn;
  const nKeg = S.kunj.length + (S.ruj.length ? 1 : 0);
  let h = _pkHal(_pkSampul(c, 'Dok pendampingan pemeriksaan & bahan koordinasi instansi', bt, [[c.TTD, 'Pendampingan Pemeriksaan', 'Dokumen'], ['2 ' + c.NB + ' ' + c.thn, 'Bahan koordinasi instansi', 'Dokumen']]), true);
  let a = _pkSubBanner('LAPORAN PENDAMPINGAN PEMERIKSAAN KESEHATAN PM', 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan', 'Seksi Pelayanan Sosial');
  a += _pkH('A. Identitas Laporan Bulanan');
  a += _pkIdent([['No. Laporan', '008/LAP-PENDAMPINGAN/YANSOS-KES /' + c.rom + '/' + c.thn], ['Jenis Laporan', 'Laporan Pendampingan Pemeriksaan Kesehatan Pm'], ['Periode', `${bt} (1 – ${new Date(c.thn, c.bln, 0).getDate()} ${bt})`], ['Jabatan Penyusun', 'Pengelola Layanan Kesehatan'], ['Nama (Kasi)', c.kasi + ' — NIP. ' + _PK_NIP_KASI], ['Nama (PLK)', c.plk], ['Total PM', S.totalPMText]]);
  a += _pkH('I. Pendahuluan');
  a += _pkP(`Pendampingan pemeriksaan kesehatan PM dilaksanakan setiap seminggu sekali selama bulan ${bt}, mengikuti jadwal kunjungan dokter ke UPT RSBD Pasuruan.${S.ruj.length ? ' Selain pendampingan pemeriksaan rutin mingguan, PLK juga mendampingi ke fasilitas rujukan' + (S.tujuanRuj.length ? ' ' + S.tujuanRuj.join(', ') : '') + '.' : ''} Laporan ini merekap seluruh ${nKeg} kegiatan pendampingan.`);
  a += _pkH('II. Jadwal Kunjungan Dokter Bulan ' + bt);
  const rows = S.kunj.map(k => [String(k.no), `${k.no} (Minggu ${k.rom})`, `${_pkNamaHari(k.tgl)}, ${String(k.tgl.getDate()).padStart(2, '0')} ${bt}`, '10.00 – 13.00 WIB', k.jmlPM + ' PM', 'Tidak ada kondisi darurat']);
  if (S.ruj.length) {
    const r0 = S.ruj[0], d0 = new Date(r0.tgl);
    rows.push([String(rows.length + 1), r0.tujuan || 'Rujukan', `${_pkNamaHari(d0)}, ${String(d0.getDate()).padStart(2, '0')} ${bt}`, '10.00 – Selesai', S.rujPM + ' PM', (r0.jenis ? r0.jenis + ' ' : '') + (r0.diagnosis || '')]);
  }
  a += _pkTabel([{ h: 'No', w: '6%', c: 1 }, { h: 'Kunjungan ke-', w: '17%' }, { h: 'Hari & Tanggal', w: '21%' }, { h: 'Waktu', w: '15%' }, { h: 'Jml PM Keluhan', w: '14%' }, { h: 'Keterangan' }],
    rows.concat([['', 'TOTAL', '-', '-', `${nKeg} kegiatan (${S.jmlKunj} kunjungan PM${S.ruj.length ? ' + ' + S.ruj.length + ' rujukan' : ''})`, '-']]), { tebal: r => r[1] === 'TOTAL' });
  const tujuan = 'Memberikan pendampingan dan memfasilitasi akses pemeriksaan kesehatan bagi penerima manfaat guna memastikan kondisi kesehatan tetap terpantau secara rutin dan mendapat penanganan medis yang sesuai.';
  const uraian1 = 'Kegiatan pendampingan dan fasilitasi pemeriksaan kesehatan dilaksanakan oleh tim pengelola layanan kesehatan bersama petugas pendamping di UPT Rehabilitasi Sosial Bina Daksa. Penerima manfaat didampingi ke ruang pemeriksaan dan dibantu dalam proses administrasi serta komunikasi dengan tenaga medis. Pemeriksaan meliputi pemeriksaan umum, tekanan darah, berat badan, dan keluhan kesehatan lainnya.';
  const uraian2 = 'Pendampingan ini bertujuan untuk memastikan penerima manfaat merasa nyaman selama proses pemeriksaan dan dapat menyampaikan keluhan kesehatan dengan baik. Petugas juga mencatat hasil pemeriksaan untuk keperluan monitoring kesehatan jangka panjang.';
  const FM = (state.fotoMinggu || []).filter(f => f && f.url);
  const seksi = async (rom, judul, tglTeks, uraianKhusus, hasil, foto, analisis) => {
    let s = `<div style="${_PK_FONT}font-size:11pt;font-weight:700;margin:14px 0 4px;text-transform:uppercase;page-break-after:avoid;">${escHtml(rom)}. ${escHtml(judul)}</div>`;
    s += `<div style="${_PK_FONT}font-size:10.5pt;margin:0 0 3px;padding-left:14px;">A. Tanggal Kegiatan</div>` + _pkPlain(tglTeks, 30);
    s += `<div style="${_PK_FONT}font-size:10.5pt;margin:6px 0 3px;padding-left:14px;">B. Tujuan Kegiatan</div><div style="padding-left:14px;">${_pkP(uraianKhusus ? uraianKhusus.tujuan : tujuan)}</div>`;
    s += `<div style="${_PK_FONT}font-size:10.5pt;margin:6px 0 3px;padding-left:14px;">C. Uraian Kegiatan</div><div style="padding-left:14px;">${_pkP(uraianKhusus ? uraianKhusus.uraian : uraian1)}${uraianKhusus ? '' : _pkP(uraian2)}</div>`;
    s += `<div style="${_PK_FONT}font-size:10.5pt;margin:6px 0 3px;padding-left:14px;">D. Hasil Kegiatan:</div><div style="padding-left:14px;">${_pkList(hasil)}</div>`;
    s += `<div style="${_PK_FONT}font-size:10.5pt;margin:6px 0 3px;padding-left:14px;page-break-after:avoid;">E. Dokumentasi</div>` + await _pkDokumentasi(foto, 165);
    s += analisis || '';
    return s;
  };
  const hasilStd = n => [`Sebanyak ${n} penerima manfaat telah mengikuti pemeriksaan kesehatan.`, 'Proses pemeriksaan berjalan tertib dan lancar.', 'Tidak ditemukan hambatan berarti selama kegiatan.', 'Data hasil pemeriksaan telah dicatat dan didokumentasikan untuk keperluan tindak lanjut.'];
  let sec = '';
  let nomor = 3;
  for (const k of S.kunj) {
    const foto = FM.filter(f => _pkKunciTgl(f.tglPeriksa) === k.key);
    const tglK = `${String(k.tgl.getDate()).padStart(2, '0')} ${bt}`;
    const an = '';
    sec += await seksi(_PK_ROM[nomor] || String(nomor), 'Pendampingan dan Fasilitasi Pemeriksaan Kesehatan Penerima Manfaat Minggu ' + k.rom, `${String(k.tgl.getDate()).padStart(2, '0')} ${bt}`, null, hasilStd(k.jmlPM), foto, an);
    nomor++;
  }
  if (S.ruj.length) {
    const r0 = S.ruj[0], d0 = new Date(r0.tgl), tj = S.tujuanRuj.join(', ') || 'fasilitas kesehatan rujukan';
    const foto = [r0.foto1, r0.foto2, r0.foto3].filter(Boolean).map(u => ({ url: u }));
    sec += await seksi(_PK_ROM[nomor] || String(nomor), 'Pendampingan dan Fasilitasi Pemeriksaan Kesehatan Penerima Manfaat dalam Rujukan ke ' + tj, `${String(d0.getDate()).padStart(2, '0')} ${bt}`,
      { tujuan: `Memfasilitasi rujukan dan pendampingan penerima manfaat ke ${tj} sebagai tindak lanjut atas keluhan insidental serta hasil pemeriksaan mingguan dokter demi penanganan medis yang tepat.`,
        uraian: `Merujuk pada hasil monitoring berkala oleh tim pengelola layanan kesehatan dan petugas pendamping di UPT Rehabilitasi Sosial Bina Daksa, bersama ini kami memfasilitasi rujukan penerima manfaat ke fasilitas kesehatan lanjutan. Proses rujukan mencakup pendampingan fisik, pengurusan administrasi, serta penyampaian riwayat pemeriksaan awal kepada tenaga medis demi memastikan penanganan spesifik yang tepat dan berkesinambungan. Pendampingan ini bertujuan untuk memastikan penerima manfaat merasa nyaman selama proses pemeriksaan dan dapat menyampaikan keluhan kesehatan dengan baik. Petugas juga mencatat hasil pemeriksaan untuk keperluan monitoring kesehatan jangka panjang.` },
      [`Sebanyak ${S.rujPM} penerima manfaat yang di rujuk ke ${tj}.`, 'Proses pemeriksaan berjalan tertib dan lancar.', 'Tidak ditemukan hambatan berarti selama kegiatan.', 'Data hasil pemeriksaan telah dicatat dan didokumentasikan untuk keperluan tindak lanjut.'], foto,
      '');
    nomor++;
  }
  a += sec;
  a += _pkH((_PK_ROM[nomor] || String(nomor)) + '. Rekapitulasi Status Kesehatan');
  const tot2 = S.pmPeriksa;
  a += _pkTabel([{ h: 'No', w: '7%', c: 1 }, { h: 'Status Kesehatan' }, { h: 'Jumlah PM', w: '15%', c: 1 }, { h: 'Persentase', w: '15%', c: 1 }], [
    ['1', 'Baik – tidak ada keluhan atau keluhan ringan sudah teratasi', String(S.baik), _pkPct(S.baik, tot2)],
    ['2', 'Cukup Baik – ada keluhan, sudah ditangani, perlu pantau', String(S.cukup), _pkPct(S.cukup, tot2)],
    ['3', 'Perlu Tindak Lanjut – memerlukan layanan rujukan', String(S.tindak), _pkPct(S.tindak, tot2)],
    ['', 'TOTAL', String(tot2), tot2 ? '100%' : '0%']], { tebal: r => r[1] === 'TOTAL' });
  a += _pkAnalisisLaporan008(S, c, 'A');
  nomor++;
  a += _pkH((_PK_ROM[nomor] || String(nomor)) + '. Tanda Tangan Laporan Bulanan') + _pkTTD2(c, { upper: true });
  h += _pkHal(a);
  // Surat koordinasi
  const ip = (state.ttdKasiBase64 && state.ttdKasiBase64.length > 10) ? state.ttdKasiBase64 : '';
  const frek = S.kunj.length || 4;
  let s = _pkSubBanner('SURAT KOORDINASI', 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan', 'Seksi Pelayanan Sosial');
  s += `<div style="${_PK_FONT}text-align:center;font-weight:700;font-size:11.5pt;line-height:1.35;margin:6px 0 12px;">UPT REHABILITASI SOSIAL BINA DAKSA PASURUAN<br>DINAS SOSIAL PROVINSI JAWA TIMUR<div style="font-weight:400;font-style:italic;font-size:10pt;">Seksi Pelayanan Sosial</div></div>`;
  s += `<table style="${_PK_FONT}font-size:10.5pt;border-collapse:collapse;width:100%;"><tr><td style="width:12%;border:none;">Nomor</td><td style="border:none;">: 001/005/S-KOORDINASI/YANSOS-KES/${c.rom}/${c.thn}</td></tr><tr><td style="border:none;">Lampiran</td><td style="border:none;">: –</td></tr><tr><td style="border:none;">Perihal</td><td style="border:none;">: Permohonan Jadwal Kunjungan Dokter ke UPT RSBD Pasuruan Bulan ${escHtml(bt)}</td></tr></table>`;
  s += `<div style="${_PK_FONT}font-size:10.5pt;text-align:right;margin:8px 0;">Pasuruan, 1 ${escHtml(bt)}</div>`;
  s += `<div style="${_PK_FONT}font-size:10.5pt;line-height:1.5;">Kepada Yth.<br>Kepala Puskesmas Raci<br>di Pasuruan<br><br>Dengan hormat,</div>`;
  s += _pkP(`Sehubungan dengan pelaksanaan layanan pemeriksaan kesehatan Penerima Manfaat (PM) penyandang disabilitas fisik di UPT Rehabilitasi Sosial Bina Daksa Pasuruan bulan ${bt}, kami mengajukan permohonan jadwal kunjungan dokter ke UPT kami sebagai berikut:`);
  s += _pkIdent([['Frekuensi', `${frek} (${_pkTerbilang(frek)}) kali – setiap minggu sekali sepanjang bulan ${bt}`], ['Hari yang Diusulkan', 'Selasa atau Rabu (menyesuaikan ketersediaan dokter)'], ['Waktu', 'Pukul 10.00 – 13.00 WIB'], ['Tempat', 'Poli Kesehatan UPT RSBD Pasuruan'], ['Sasaran Layanan', `${S.aktif} PM penyandang disabilitas fisik yang mengalami keluhan kesehatan`], ['Koordinator', `${c.plk} (Pengelola Layanan Kesehatan) – NIP. ${_PK_NIP_PLK}`]], 24);
  s += _pkP('Kami memohon konfirmasi jadwal kunjungan dokter untuk minggu tersebut. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.');
  s += `<div style="${_PK_FONT}font-size:10.5pt;text-align:right;padding-right:6%;margin-top:10px;page-break-inside:avoid;"><div style="display:inline-block;text-align:center;">Hormat kami,<br>Kepala Seksi Pelayanan Sosial${ip ? `<img src="${safeUrl(ip)}" style="height:64px;max-width:150px;object-fit:contain;display:block;margin:2px auto;" onerror="this.remove()">` : '<div style="height:64px;"></div>'}<b>${escHtml(c.kasi)}</b><br>NIP. ${_PK_NIP_KASI}<br>Kepala Seksi Pelayanan Sosial</div></div>`;
  h += _pkHal(s);
  h += _pkHal(_pkBA(5, c, S));
  return h;
}

// ══════════ PAKET 5 ══════════
async function _pkPaket5(c, S) {
  const bt = c.NB + ' ' + c.thn;
  let h = _pkHal(_pkSampul(c, 'Resume kesehatan PM & dok rujukan layanan kesehatan', bt, [[c.TTD, 'Resume kesehatan PM', 'Dokumen'], [c.TTD, 'dok rujukan layanan kesehatan', 'Dokumen']]), true);
  // Resume medis: kartu bulanan tiap PM
  const BL = _BULAN_NAMES;
  const kunciPM = [...new Set(S.pem.map(p => p.nomorInduk))];
  let kartu = '';
  kunciPM.forEach((ni, i) => {
    const pm = (state.penerima || []).find(p => p.nomorInduk === ni);
    if (!pm) return;
    const recs = S.pem.filter(p => p.nomorInduk === ni).sort((x, y) => parseInt(x.mingguKe) - parseInt(y.mingguKe));
    kartu += `<div class="kartu-page-section" style="page-break-before:always;break-before:page;font-family:Arial,sans-serif;">${renderKartuBulananHTML(pm, recs, c.bln, c.thn, BL)}</div>`;
  });
  let a = _pkSubBanner('RESUME KESEHATAN PENERIMA MANFAAT', 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan', 'Seksi Pelayanan Sosial');
  a += _pkH('A. Identitas Laporan Bulanan');
  a += _pkIdent([['No. Laporan', '006/RESUME/YANSOS-KES /' + c.rom + '/' + c.thn], ['Jenis Laporan', 'Resume Kesehatan Penerima Manfaat'], ['Periode', bt], ['Jabatan Penyusun', 'Pengelola Layanan Kesehatan'], ['Nama (Kasi)', c.kasi + ' — NIP. ' + _PK_NIP_KASI], ['Nama (PLK)', c.plk], ['Total PM', S.totalPMText]], 25);
  a += _pkH('I. Resume Medis Pemeriksaan Mingguan');
  a += kartu ? '<div style="font-size:9.5pt;color:#555;margin:2px 0;">Kartu pemeriksaan kesehatan bulanan setiap PM terlampir pada halaman berikut.</div>' : _pkPlain('Belum ada data pemeriksaan pada bulan ini.', 18);
  let r = '';
  r += _pkH('II. Rekapitulasi Status Kesehatan');
  const tot2 = S.pmPeriksa;
  r += _pkTabel([{ h: 'No', w: '7%', c: 1 }, { h: 'Status Kesehatan' }, { h: 'Jumlah PM', w: '15%', c: 1 }, { h: 'Persentase', w: '15%', c: 1 }], [
    ['1', 'Baik – tidak ada keluhan atau keluhan ringan sudah teratasi', String(S.baik), _pkPct(S.baik, tot2)],
    ['2', 'Cukup Baik – ada keluhan, sudah ditangani, perlu pantau', String(S.cukup), _pkPct(S.cukup, tot2)],
    ['3', 'Perlu Tindak Lanjut – memerlukan layanan rujukan', String(S.tindak), _pkPct(S.tindak, tot2)],
    ['', 'TOTAL', String(tot2), tot2 ? '100%' : '0%']], { tebal: x => x[1] === 'TOTAL' });
  r += _pkAnalisisStatus(S, c, 'A');
  r += _pkH('III. Kesimpulan');
  r += _pkList([`Dari ${S.pmPeriksa} PM yang dilayani bulan ${bt}, sebanyak ${S.baik} PM (${_pkPct(S.baik, tot2)}) berstatus kesehatan Baik, ${S.cukup} PM (${_pkPct(S.cukup, tot2)}) Cukup Baik, dan ${S.tindak} PM (${_pkPct(S.tindak, tot2)}) memerlukan tindak lanjut berupa rujukan.`, 'Seluruh keluhan yang tidak memerlukan rujukan telah ditangani pada hari kunjungan dokter.']);
  r += _pkH('IV. Tanda Tangan Laporan Bulanan') + _pkTTD2(c, { upper: true });
  h += _pkHal(a);
  h += kartu;
  h += _pkHal(r);
  // Laporan rujukan
  let l = _pkSubBanner('LAPORAN RUJUKAN', 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan', 'Seksi Pelayanan Sosial');
  l += _pkH('A. Identitas Laporan Bulanan');
  l += _pkIdent([['No. Laporan', '007/RUJUKAN/YANSOS-KES /' + c.rom + '/' + c.thn], ['Jenis Laporan', 'Laporan Rujukan'], ['Periode', bt], ['Jabatan Penyusun', 'Pengelola Layanan Kesehatan'], ['Nama (Kasi)', c.kasi + ' — NIP. ' + _PK_NIP_KASI], ['Nama (PLK)', c.plk], ['Total PM', S.totalPMText]], 25);
  l += _pkH('B. Laporan Rujukan');
  if (!S.ruj.length) {
    l += _pkPlain('Tidak terdapat rujukan PM pada bulan ini.', 18);
  } else {
    let no = 1, ke = 0;
    for (const x of S.ruj) {
      const d = new Date(x.tgl);
      const tj = x.tujuan || 'fasilitas kesehatan';
      const surat = await _pkLapor({}, () => cetakPDFRujukan(x.id), 'Surat laporan data rujukan tidak dapat dimuat.');
      const foto = await _pkDokumentasi([x.foto1, x.foto2, x.foto3].filter(Boolean).map(u => ({ url: u })), 230);
      const hd = t => `<div style="${_PK_FONT}font-size:10.5pt;margin:6px 0 2px;padding-left:14px;page-break-after:avoid;">${t}</div>`;
      // Butir 1-3 (nama kegiatan, tanggal, uraian + surat) satu kesatuan; surat diperkecil agar muat dalam satu halaman
      const unit = hd(`${no}. Nama Kegiatan`) + _pkPlain(`Pendampingan rujukan PM yang memerlukan penanganan lanjut ke ${x.jenis ? x.jenis + ' ' : ''}${tj}`, 32)
        + hd(`${no + 1}. Tanggal Kegiatan`) + _pkPlain(`${String(d.getDate()).padStart(2, '0')} ${bt}`, 32)
        + hd(`${no + 2}. Uraian Kegiatan`) + `<div style="zoom:.55;page-break-inside:avoid;break-inside:avoid;">${surat}</div>`;
      l += `<div style="${ke ? 'page-break-before:always;break-before:page;' : ''}page-break-inside:avoid;break-inside:avoid;">${unit}</div>`;
      l += hd(`${no + 3}. Dokumentasi`) + foto;
      ke++;
    }
    l += _pkAnalisisRujukan(S, c, 5);
  }
  l += _pkH('C. Tanda Tangan') + _pkTTD2(c, { upper: true });
  h += _pkHal(l);
  h += _pkHal(_pkBA(4, c, S));
  return h;
}

// ══════════ PEMICU DARI TOMBOL ══════════
let _pkSibuk = false;
async function cetakPaketKasi(n) {
  if (_pkSibuk) { showToast('Paket laporan sedang disusun, mohon tunggu…', 'info'); return; }
  _pkSibuk = true;
  try {
    const c = _pkKonteks();
    const S = _pkStatistik(c);
    if (!S.pem.length && !S.ins.length && !S.ruj.length) {
      if (!confirm('Tidak ada data pemeriksaan, insidental, maupun rujukan pada ' + _pkPer(c) + '. Tetap cetak paket (isi kosong)?')) return;
    }
    showToast('⏳ Menyusun ' + (n === 'semua' ? 'kelima paket' : _PK_NAMA[n].file) + '…', 'info');
    const fn = { 1: _pkPaket1, 2: _pkPaket2, 3: _pkPaket3, 4: _pkPaket4, 5: _pkPaket5 };
    let html = '';
    if (n === 'semua') {
      for (let i = 1; i <= 5; i++) html += (i > 1 ? '<div style="page-break-before:always;break-before:page;"></div>' : '') + await fn[i](c, S);
    } else {
      html = await fn[n](c, S);
    }
    printKartuIsolated(html, 'sections');
  } catch (e) {
    console.error(e);
    showToast('⚠️ Gagal menyusun paket laporan: ' + (e && e.message ? e.message : e), 'warning');
  } finally { _pkSibuk = false; }
}
// Dipakai pengujian: menghasilkan HTML paket tanpa mencetak
async function _pkBangun(n) {
  const c = _pkKonteks(), S = _pkStatistik(c);
  const fn = { 1: _pkPaket1, 2: _pkPaket2, 3: _pkPaket3, 4: _pkPaket4, 5: _pkPaket5 };
  return await fn[n](c, S);
}
function initPaketKasiPanel() {
  const sb = document.getElementById('pkBulan'), st = document.getElementById('pkTahun'), tg = document.getElementById('pkTanggal');
  if (!sb || !st || !tg) return;
  const now = new Date();
  const setTgl = () => {
    const b = +sb.value, y = +st.value, akhir = new Date(y, b, 0).getDate(), d = Math.min(30, akhir);
    tg.value = y + '-' + String(b).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  };
  if (!sb.options.length) { sb.innerHTML = _BULAN_NAMES.slice(1).map((b, i) => `<option value="${i + 1}">${b}</option>`).join(''); sb.value = String(now.getMonth() + 1); }
  if (!st.options.length) {
    let o = '';
    for (let y = 2024; y <= now.getFullYear() + 5; y++) o += `<option value="${y}">${y}</option>`;
    st.innerHTML = o; st.value = String(now.getFullYear());
  }
  if (!sb.dataset.siap) { sb.dataset.siap = '1'; sb.addEventListener('change', setTgl); st.addEventListener('change', setTgl); }
  if (!tg.value) setTgl();
}
