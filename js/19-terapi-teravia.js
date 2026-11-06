// ══════════════════════════════════════════════════════════════
//  19 — Laporan Layanan Terapi (data dari TERAVIA)
//  Menambah satu bagian "Layanan Terapi" di Lap. Kasi dan di Rekap.
//  Hanya membaca; data diambil server lewat aksi teraviaLaporan.
// ══════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var bulanPilih = {};   // per halaman: 'kasi' / 'rekap'
  var tersimpan = {};    // hasil terakhir per bulan

  function e(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function labelBulan(b) { return BLN[Number(b.slice(5)) - 1] + ' ' + b.slice(0, 4); }
  function bulanIni() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function geser(b, n) { var y = Number(b.slice(0, 4)), m = Number(b.slice(5)) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + ('0' + (m + 1)).slice(-2); }
  function bar(a, b, warna) { var p = b ? Math.min(100, a / b * 100) : 0; return '<div style="height:8px;background:#e7ecf5;border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:' + p + '%;background:' + (warna || '#1a3fae') + '"></i></div>'; }
  function baris(l, n) { return '<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid #eef1f7"><span>' + l + '</span><b>' + n + '</b></div>'; }
  function kartu(judul, isi, kecil) { return '<div style="background:#fff;border:1px solid #dfe5f1;border-radius:12px;padding:14px 16px;min-width:0"><div style="font-weight:700;margin-bottom:' + (kecil ? '2px' : '8px') + '">' + judul + '</div>' + isi + '</div>'; }
  function blok(judul, tag, b) {
    return kartu(judul + ' <span style="font-weight:500;font-size:11px;color:#5b6b8c">· ' + tag + '</span>',
      '<div style="display:flex;gap:26px;margin-bottom:8px"><div><div style="font-size:28px;font-weight:800;line-height:1">' + b.kunjungan + '</div><small>kunjungan</small></div><div><div style="font-size:28px;font-weight:800;line-height:1">' + b.orang + '</div><small>orang</small></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center"><div><b>' + b.asesmen + '</b><br><small>Asesmen</small></div><div><b>' + b.terapi + '</b><br><small>Terapi</small></div><div><b>' + b.reasesmen + '</b><br><small>Reasesmen</small></div><div><b>' + b.evaluasi + '</b><br><small>Evaluasi</small></div></div>');
  }

  function isiLaporan(d) {
    var k = d.kemajuan, h = d.hasil, kh = d.kehadiran, g = 'display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-bottom:12px';
    var o = '<div style="padding:8px 12px;margin-bottom:12px;background:#eef3ff;border-radius:10px;font-size:13px">Khusus <b>penerima manfaat</b>' + (d.asrama ? ' asrama <b>' + e(d.asrama) + '</b>' : ' semua asrama') + '. Pasien umum tidak termasuk.</div>';
    o += '<div style="' + g + '">' + blok('Penerima manfaat', d.asrama ? e(d.asrama) : 'semua asrama', d.pm) + kartu('Kunjungan per disiplin',
      '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:#5b6b8c"><th>Disiplin</th><th>Kunjungan</th><th>Tidak hadir</th><th>Kehadiran</th></tr></thead><tbody>' +
      d.perLayanan.map(function (r) { return '<tr><td>' + e(r.layanan) + '</td><td><b>' + r.pm + '</b></td><td>' + r.tidakHadir + '</td><td>' + r.kehadiran + '%</td></tr>'; }).join('') +
      '<tr style="border-top:1px solid #dfe5f1"><td><b>Jumlah</b></td><td><b>' + d.pm.kunjungan + '</b></td><td><b>' + kh.tidakHadir + '</b></td><td><b>' + kh.pm + '%</b></td></tr></tbody></table>') + '</div>';
    if (!d.asrama && d.perAsrama && d.perAsrama.length) {
      o += '<div style="margin-bottom:12px">' + kartu('Rincian per asrama',
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:#5b6b8c"><th>Asrama</th><th>Orang</th><th>Kunjungan</th><th>Fisio</th><th>Okupasi</th><th>Wicara</th><th>Asesmen</th><th>Terapi</th><th>Reasesmen</th><th>Evaluasi</th><th>Tidak hadir</th><th>Kehadiran</th></tr></thead><tbody>' +
        d.perAsrama.map(function (a) { return '<tr style="border-top:1px solid #eef1f7"><td><b>' + e(a.asrama) + '</b></td><td>' + a.orang + '</td><td><b>' + a.kunjungan + '</b></td><td>' + a.fisio + '</td><td>' + a.okupasi + '</td><td>' + a.wicara + '</td><td>' + a.asesmen + '</td><td>' + a.terapi + '</td><td>' + a.reasesmen + '</td><td>' + a.evaluasi + '</td><td>' + a.tidakHadir + '</td><td>' + a.kehadiran + '%</td></tr>'; }).join('') +
        '</tbody></table></div>') + '</div>';
    }
    o += '<div style="' + g + '">' + kartu('Kemajuan program',
        [['Menyelesaikan asesmen', k.pmAsesmen, k.programPM], ['Menyelesaikan reasesmen', k.pmReasesmen, k.programPM], ['Telah dievaluasi', k.pmEvaluasi, k.programPM]].map(function (x) { return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>' + x[0] + '</span><span>' + x[1] + ' dari ' + x[2] + '</span></div>' + bar(x[1], x[2]) + '</div>'; }).join('') +
        baris('Reasesmen tepat waktu', kh.reasTepat + ' dari ' + kh.reasJadwal)) +
      kartu('Hasil terapi <span style="font-weight:500;font-size:11px;color:#5b6b8c">· fisioterapi, ' + h.n + ' PM</span>',
        baris('Nyeri gerak (VAS), makin rendah makin baik', h.vasAwal == null ? '-' : h.vasAwal + ' → ' + h.vasAkhir) +
        baris('Kemandirian (Barthel)', h.barthelAwal == null ? '-' : h.barthelAwal + ' → ' + h.barthelAkhir) +
        baris('PM mencapai tujuan terapi', h.goalPM.tercapai + ' dari ' + h.goalPM.selesai)) +
      kartu('Sebaran jenis disabilitas', d.disabilitas.length ? d.disabilitas.map(function (x) { return '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>' + e(x.nama) + '</span><span>' + x.persen + '%</span></div>' + bar(x.persen, 100) + '</div>'; }).join('') : '<small>Belum ada data.</small>') + '</div>';
    if (d.daftarPM && d.daftarPM.length) {
      o += '<div style="margin-bottom:12px">' + kartu('Daftar penerima manfaat, diagnosa, dan terapi <span style="font-weight:500;font-size:11px;color:#5b6b8c">· ' + d.daftarPM.length + ' PM' + (d.asrama ? ' · ' + e(d.asrama) : '') + '</span>',
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:#5b6b8c"><th>No</th><th>Asrama</th><th>Nama</th><th>Diagnosa</th><th>Terapi</th></tr></thead><tbody>' +
        d.daftarPM.map(function (r, i) { return '<tr style="border-top:1px solid #eef1f7"><td>' + (i + 1) + '</td><td>' + e(r.asrama) + '</td><td><b>' + e(r.nama) + '</b><br><small>' + e(r.nomorInduk) + '</small></td><td>' + (e(r.diagnosa) || '-') + '</td><td>' + e(r.terapi) + '</td></tr>'; }).join('') + '</tbody></table></div>') + '</div>';
    }
    if (d.rincianPM && d.rincianPM.length) {
      var rb = '';
      d.rincianPM.forEach(function (p) {
        p.layanan.forEach(function (l, j) {
          var kmj = ['Asesmen ' + l.asesmenKe + '/' + l.asesmenDari]; if (l.vas) kmj.push('VAS ' + l.vas); if (l.barthel) kmj.push('Barthel ' + l.barthel); if (l.selesai) kmj.push('Selesai: ' + l.selesai);
          rb += '<tr style="border-top:' + (j ? '1px solid #eef1f7' : '2px solid #dfe5f1') + '"><td>' + (j ? '' : '<b>' + e(p.nama) + '</b><br><small>' + e(p.nomorInduk) + (p.asrama ? ' · ' + e(p.asrama) : '') + '</small>') + '</td><td>' + (j ? '' : (e(p.diagnosa) || '-')) + '</td><td>' + e(l.layanan) + '</td><td>' + l.asesmen + '</td><td>' + l.terapi + '</td><td>' + l.reasesmen + '</td><td>' + l.evaluasi + '</td><td>' + l.tidakHadir + '</td><td>' + e(l.tanggal.join(', ') || '-') + '</td><td>' + e(kmj.join('; ')) + '</td></tr>';
        });
      });
      o += '<div style="margin-bottom:12px">' + kartu('Rincian per penerima manfaat <span style="font-weight:500;font-size:11px;color:#5b6b8c">· ' + d.rincianPM.length + ' PM · tanggal menurut bulan ini</span>',
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:#5b6b8c"><th>Nama</th><th>Diagnosa</th><th>Layanan</th><th>As</th><th>Tr</th><th>Re</th><th>Ev</th><th>Tdk hadir</th><th>Tgl hadir</th><th>Kemajuan</th></tr></thead><tbody>' + rb + '</tbody></table></div><small style="color:#5b6b8c">As = asesmen, Tr = terapi, Re = reasesmen, Ev = evaluasi (kunjungan hadir).</small><div style="margin-top:10px"><b>Uraian ringkas tiap penerima manfaat</b>' + (window.LaporanTerapi && LaporanTerapi.uraianPM ? LaporanTerapi.uraianPM(d).map(function (t) { return '<p style="margin:6px 0;line-height:1.55">' + e(t) + '</p>'; }).join('') : '') + '</div>') + '</div>';
    }
    if (window.LaporanTerapi) o += kartu('Analisis laporan', LaporanTerapi.analisisTeks(d).map(function (t) { return '<p style="margin:0 0 8px;line-height:1.55">' + e(t) + '</p>'; }).join(''));
    o += '<div style="margin-top:12px">' + kartu('Target dan capaian', '<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">' + d.capaian.map(function (c) { return '<div><div style="display:flex;justify-content:space-between;font-size:13px"><span>' + e(c.nama) + '</span><span>' + (c.nilai == null ? '-' : c.nilai) + ' / ' + c.target + ' ' + e(c.satuan) + '</span></div>' + bar(c.persen, 100, c.persen >= 100 ? '#1a8a4a' : '#c47a00') + '<small>' + c.persen + '% dari target</small></div>'; }).join('') + '</div>') + '</div>';
    return o;
  }

  /** Daftar asrama untuk pilihan: urutan baku SIMKEDA lalu asrama lain yang ada di data PM. */
  var ASRAMA_BAKU = ['ASTRI 1', 'ASTRI 2', 'ASTRA 1', 'ASTRA 2', 'ASTRA 3', 'ASTRA 4'];
  function daftarAsrama() {
    var lain = [];
    try { (state.penerima || []).forEach(function (p) { var k = String(p.kamarBlok || '').trim(); if (k && ASRAMA_BAKU.indexOf(k) < 0 && lain.indexOf(k) < 0) lain.push(k); }); } catch (er) {}
    return ASRAMA_BAKU.concat(lain.sort());
  }
  var asramaPilih = {};   // per halaman

  function muat(hal) {
    var wadah = document.getElementById(hal + '-sec-terapi');
    if (!wadah) return;
    var b = bulanPilih[hal] || (bulanPilih[hal] = bulanIni());
    var isi = wadah.querySelector('.tv-isi');
    wadah.querySelector('.tv-bulan').textContent = labelBulan(b);
    if (typeof state === 'undefined' || !state.scriptUrl) { isi.innerHTML = '<div style="padding:14px">⚠️ URL Apps Script belum diatur.</div>'; return; }
    isi.innerHTML = '<div style="padding:14px">⏳ Mengambil data dari TERAVIA…</div>';
    fetch(state.scriptUrl + '?action=teraviaLaporan&bulan=' + encodeURIComponent(b) + '&asrama=' + encodeURIComponent(asramaPilih[hal] || ''))
      .then(function (r) { return r.text(); })
      .then(function (t) {
        var j = JSON.parse(t);
        if (!j.ok) throw new Error(j.error || 'ditolak');
        tersimpan[b + '|' + (asramaPilih[hal] || '')] = j.data;
        isi.innerHTML = isiLaporan(j.data);
      })
      .catch(function (er) { isi.innerHTML = '<div style="padding:14px;color:#a02020">❌ ' + e(er.message) + '</div>'; });
  }

  function cetak(hal) {
    var wadah = document.getElementById(hal + '-sec-terapi'), b = bulanPilih[hal] || bulanIni();
    var w = window.open('', '_blank');
    if (!w) { alert('Izinkan pop-up untuk mencetak.'); return; }
    w.document.write('<html><head><title>Laporan Layanan Terapi PM ' + e(labelBulan(b)) + '</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:18mm}h2{margin:0 0 10px}small{color:#555}@page{size:A4;margin:12mm}</style></head><body><h2>Laporan Layanan Terapi Penerima Manfaat' + (asramaPilih[hal] ? ' · ' + e(asramaPilih[hal]) : '') + ' · ' + e(labelBulan(b)) + '</h2>' + wadah.querySelector('.tv-isi').innerHTML + '</body></html>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 400);
  }

  // Laporan dinas resmi: kode SAMA dengan TERAVIA (19b-laporan-terapi-bersama.js), kop surat SIMKEDA.
  function dinas(hal, lanjut) {
    var b = bulanPilih[hal] || bulanIni(), d = tersimpan[b + '|' + (asramaPilih[hal] || '')];
    if (!d) { alert('Tunggu data bulan ini selesai dimuat, lalu coba lagi.'); return; }
    if (!window.LaporanTerapi) { alert('Modul laporan belum termuat. Muat ulang halaman.'); return; }
    var kop = typeof renderKopSuratHTML === 'function' ? renderKopSuratHTML() : '';
    lanjut(LaporanTerapi.dinasHtml(d, { kop: kop, instansi: 'UPT Rehabilitasi Sosial Disabilitas Ganda, Sensorik Rungu Wicara dan Fisik', kota: 'Pasuruan',
      mengetahui: { jabatan: 'Kepala Seksi Pelayanan Sosial', nama: 'Sunardi, S.Pd.', nip: '19780418 2011011006' },
      pembuat: { jabatan: 'Pengelola Layanan Kesehatan', nama: 'DIFA FITRIASTUTI PUTRI, A.Md.Kes', nip: '200105102025042007' } }), b);
  }
  function cetakHtml(judul, html) {
    var w = window.open('', '_blank');
    if (!w) { alert('Izinkan pop-up untuk mencetak.'); return; }
    w.document.write('<html><head><meta charset="utf-8"><title>' + e(judul) + '</title><style>@page{size:A4;margin:18mm 20mm}body{margin:0}</style></head><body>' + html + '</body></html>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 500);
  }

  function pasang(hal, sebelum, itemNav) {
    if (document.getElementById(hal + '-sec-terapi')) return;
    var halaman = document.getElementById('page-' + hal);
    if (!halaman) return;
    var w = document.createElement('div');
    w.id = hal + '-sec-terapi';
    w.style.cssText = 'scroll-margin-top:185px;display:none';
    w.innerHTML = '<div class="card" style="border-left:4px solid #1a3fae"><div class="card-header"><h2 style="margin:0">🩺 Layanan Terapi Penerima Manfaat (TERAVIA)</h2></div>' +
      '<div class="no-print" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0 12px"><button class="btn btn-outline btn-sm tv-mundur" type="button">‹</button><b class="tv-bulan" style="min-width:130px;text-align:center"></b><button class="btn btn-outline btn-sm tv-maju" type="button">›</button><select class="tv-asrama" style="padding:6px 10px;border-radius:8px;border:1px solid #c9d3e8"><option value="">Semua asrama</option></select><button class="btn btn-sm tv-cetak" type="button" style="margin-left:auto">🖨️ Cetak ringkasan</button><button class="btn btn-sm tv-pdf" type="button">📄 Laporan dinas (PDF)</button><button class="btn btn-sm tv-doc" type="button">📝 Laporan dinas (Word)</button></div>' +
      '<div class="tv-isi"></div></div>';
    var ref = document.getElementById(sebelum);
    if (ref && ref.parentNode) ref.parentNode.insertBefore(w, ref); else halaman.appendChild(w);
    w.querySelector('.tv-mundur').onclick = function () { bulanPilih[hal] = geser(bulanPilih[hal] || bulanIni(), -1); muat(hal); };
    w.querySelector('.tv-maju').onclick = function () { bulanPilih[hal] = geser(bulanPilih[hal] || bulanIni(), 1); muat(hal); };
    var sel = w.querySelector('.tv-asrama');
    sel.addEventListener('focus', function () { var v = sel.value; sel.innerHTML = '<option value="">Semua asrama</option>' + daftarAsrama().map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + e(x) + '</option>'; }).join(''); sel.value = v; });
    sel.innerHTML = '<option value="">Semua asrama</option>' + daftarAsrama().map(function (x) { return '<option>' + e(x) + '</option>'; }).join('');
    sel.onchange = function () { asramaPilih[hal] = sel.value; muat(hal); };
    w.querySelector('.tv-cetak').onclick = function () { cetak(hal); };
    w.querySelector('.tv-pdf').onclick = function () { dinas(hal, function (h, b) { cetakHtml('Laporan Layanan Terapi PM ' + labelBulan(b), h); }); };
    w.querySelector('.tv-doc').onclick = function () { dinas(hal, function (h, b) { LaporanTerapi.unduhWord(h, 'Laporan_Layanan_Terapi_PM_' + b + (asramaPilih[hal] ? '_' + asramaPilih[hal].replace(/\s+/g, '_') : '')); }); };
    var panel = document.querySelector('#' + hal + 'QuickNav .quicknav-panel');
    if (panel) {
      var it = document.createElement('div');
      it.className = 'kasi-qn-item';
      it.textContent = '🩺 Layanan Terapi PM';
      it.onclick = function () { window.showQuickSection(hal, hal + '-sec-terapi', '🩺 Layanan Terapi', it); muat(hal); };
      panel.appendChild(it);
    }
  }

  function mulai() {
    pasang('kasi', 'kasi-sec-ringkasan');
    pasang('rekap', 'rekap-sec-pemeriksaan');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
})();
