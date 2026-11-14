/**
 * laporan-bersama.js : kode laporan layanan terapi yang DIPAKAI SAMA oleh TERAVIA dan SIMKEDA.
 * Berkas ini disalin apa adanya ke kedua aplikasi; jangan diubah di satu tempat saja.
 * Masukan d = hasil hitungLaporanTerapi() (bentuk data sama di kedua aplikasi).
 */
(function (g) {
  'use strict';
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var UNSUR = ['Persyaratan', 'Prosedur', 'Waktu pelayanan', 'Biaya atau tarif', 'Produk layanan', 'Kompetensi pelaksana', 'Perilaku pelaksana', 'Penanganan pengaduan', 'Sarana dan prasarana'];
  function e(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function labelBulan(b) { return BLN[Number(String(b).slice(5)) - 1] + ' ' + String(b).slice(0, 4); }
  function lc(n) { return /^(PM|IKM)/.test(n) ? n : n.charAt(0).toLowerCase() + n.slice(1); }
  function koma(n) { return String(n).replace('.', ','); }
  function tglPanjang(d) { return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); }
  var ANGKA = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh'];
  function kali(n) { return (ANGKA[n] || n) + ' kali'; }
  function daftarHari(h) { h = h || []; return h.length < 2 ? (h[0] || '') : h.slice(0, -1).join(', ') + ', dan ' + h[h.length - 1]; }
  /** Aturan layanan untuk kalimat laporan. Bila aplikasi tidak mengirim aturan (mis. SIMKEDA versi lama), dipakai aturan bawaan. */
  function aturan(o) {
    var a = (o && o.aturan) || {};
    return { hariPm: a.hariPm && a.hariPm.length ? a.hariPm : ['Senin', 'Selasa', 'Kamis', 'Jumat'], hariUmum: a.hariUmum && a.hariUmum.length ? a.hariUmum : ['Rabu'],
      pmA: a.pmA || 4, pmR: a.pmR || 4, pmE: a.pmE || 1, maksUmum: a.maksUmum || 4, desilMin: a.desilMin || 1, desilMax: a.desilMax || 5 };
  }

  /** Teks analisis otomatis dari angka laporan (daftar paragraf). */
  function analisisTeks(d) {
    if (d.hanyaPM) return analisisPM(d);
    if (d.hanyaUmum) return analisisUmum(d);
    var L = [], tot = d.totalKunjungan, hari = d.harian.length, h = d.hasil, kh = d.kehadiran, k = d.kemajuan;
    if (!tot) return ['Pada ' + labelBulan(d.bulan) + ' belum ada kunjungan hadir yang tercatat.'];
    L.push('Pada ' + labelBulan(d.bulan) + ' tercatat ' + tot + ' kunjungan hadir, terdiri dari ' + d.pm.kunjungan + ' kunjungan penerima manfaat (' + d.pm.orang + ' orang) dan ' + d.umum.kunjungan + ' kunjungan pasien umum (' + d.umum.orang + ' orang). Kedua kategori dihitung terpisah.');
    var urut = d.perLayanan.slice().sort(function (a, b) { return b.total - a.total; });
    L.push('Layanan terbanyak adalah ' + urut[0].layanan.toLowerCase() + ' dengan ' + urut[0].total + ' kunjungan, disusul ' + urut[1].layanan.toLowerCase() + ' (' + urut[1].total + ') dan ' + urut[2].layanan.toLowerCase() + ' (' + urut[2].total + '). Rerata ' + koma(Math.round(tot / Math.max(1, hari) * 10) / 10) + ' kunjungan per hari layanan (' + hari + ' hari layanan).');
    L.push('Kehadiran sesuai jadwal mencapai ' + koma(kh.pm) + '% untuk penerima manfaat dan ' + koma(kh.umum) + '% untuk pasien umum, dengan ' + kh.tidakHadir + ' kunjungan tidak hadir. Kuota hari layanan pasien umum terpakai ' + kh.kuotaPakai + ' dari ' + kh.kuotaTotal + ', dan ' + k.waitingList + ' orang masih menunggu di waiting list.');
    if (h.vasAwal != null) L.push('Pada ' + h.n + ' pasien fisioterapi yang sudah memiliki asesmen dan catatan terapi, nyeri gerak rata-rata ' + (h.vasAkhir < h.vasAwal ? 'turun' : h.vasAkhir > h.vasAwal ? 'naik' : 'tetap') + ' dari ' + koma(h.vasAwal) + ' menjadi ' + koma(h.vasAkhir) + (h.barthelAwal != null ? ', sedangkan skor kemandirian (Barthel) berubah dari ' + koma(h.barthelAwal) + ' menjadi ' + koma(h.barthelAkhir) : '') + '.');
    var belum = d.capaian.filter(function (c) { return c.nilai != null && c.persen < 100; }).map(function (c) { return lc(c.nama) + ' (' + koma(c.nilai) + ' dari target ' + c.target + ')'; });
    var sudah = d.capaian.filter(function (c) { return c.nilai != null && c.persen >= 100; }).map(function (c) { return lc(c.nama); });
    if (sudah.length) L.push('Target yang sudah tercapai: ' + sudah.join(', ') + '.');
    if (belum.length) L.push('Target yang belum tercapai: ' + belum.join(', ') + '.');
    L.push(d.ikm ? 'Nilai IKM ' + koma(d.ikm.nilai) + ' (mutu ' + d.ikm.mutu + ') dari ' + d.ikm.responden + ' responden.' : 'Data IKM bulan ini belum dimasukkan.');
    return L;
  }

  /** Analisis laporan khusus penerima manfaat (SIMKEDA): tanpa pasien umum. */
  /** Analisis laporan khusus pasien umum (v1.12). */
  function analisisUmum(d) {
    var L = [], u = d.umum, h = d.hasil, kh = d.kehadiran, k = d.kemajuan;
    if (!u.kunjungan) return ['Pada ' + labelBulan(d.bulan) + ' belum ada kunjungan pasien umum yang tercatat.'];
    L.push('Pada ' + labelBulan(d.bulan) + ' tercatat ' + u.kunjungan + ' kunjungan pasien umum dari ' + u.orang + ' orang, terdiri dari ' + u.asesmen + ' asesmen, ' + u.terapi + ' terapi, ' + u.reasesmen + ' reasesmen, dan ' + u.evaluasi + ' evaluasi.');
    var urut = d.perLayanan.slice().sort(function (a, b) { return b.umum - a.umum; });
    if (urut[0].umum) L.push('Layanan terbanyak adalah ' + urut[0].layanan.toLowerCase() + ' dengan ' + urut[0].umum + ' kunjungan.');
    L.push('Kehadiran sesuai jadwal mencapai ' + koma(kh.umum) + '% dengan ' + kh.tidakHadir + ' kunjungan tidak hadir. Kuota hari layanan umum terpakai ' + kh.kuotaPakai + ' dari ' + kh.kuotaTotal + ' kursi.');
    if (k.umumTotal) L.push(k.umumMaks + ' dari ' + k.umumTotal + ' pasien-layanan telah menyelesaikan kunjungan maksimal. Waiting list berisi ' + k.waitingList + ' orang.');
    if (h.vasAwal != null) L.push('Pada ' + h.n + ' pasien fisioterapi umum, nyeri gerak rata-rata ' + (h.vasAkhir < h.vasAwal ? 'turun' : h.vasAkhir > h.vasAwal ? 'naik' : 'tetap') + ' dari ' + koma(h.vasAwal) + ' menjadi ' + koma(h.vasAkhir) + '.');
    var belum = d.capaian.filter(function (c) { return c.nilai != null && c.persen < 100; }).map(function (c) { return lc(c.nama) + ' (' + koma(c.persen) + '% dari target)'; });
    if (belum.length) L.push('Indikator yang belum mencapai target: ' + belum.join(', ') + '.');
    return L;
  }

  function analisisPM(d) {
    var L = [], pm = d.pm, h = d.hasil, kh = d.kehadiran, k = d.kemajuan, cak = d.asrama ? ' di asrama ' + d.asrama : '';
    if (!pm.kunjungan) return ['Pada ' + labelBulan(d.bulan) + ' belum ada kunjungan terapi penerima manfaat' + cak + ' yang tercatat.'];
    L.push('Pada ' + labelBulan(d.bulan) + ' tercatat ' + pm.kunjungan + ' kunjungan terapi penerima manfaat' + cak + ' dari ' + pm.orang + ' orang, terdiri dari ' + pm.asesmen + ' asesmen, ' + pm.terapi + ' terapi, ' + pm.reasesmen + ' reasesmen, dan ' + pm.evaluasi + ' evaluasi.');
    var urut = d.perLayanan.slice().sort(function (a, b) { return b.pm - a.pm; });
    L.push('Layanan terbanyak adalah ' + urut[0].layanan.toLowerCase() + ' dengan ' + urut[0].pm + ' kunjungan, disusul ' + urut[1].layanan.toLowerCase() + ' (' + urut[1].pm + ') dan ' + urut[2].layanan.toLowerCase() + ' (' + urut[2].pm + ').');
    if (!d.asrama && d.perAsrama && d.perAsrama.length) {
      var ua = d.perAsrama.slice().sort(function (a, b) { return b.kunjungan - a.kunjungan; });
      L.push('Menurut asrama, kunjungan terbanyak berasal dari ' + ua[0].asrama + ' (' + ua[0].kunjungan + ' kunjungan, ' + ua[0].orang + ' orang)' + (ua.length > 1 ? ', sedangkan paling sedikit dari ' + ua[ua.length - 1].asrama + ' (' + ua[ua.length - 1].kunjungan + ' kunjungan)' : '') + '.');
      var rendah = d.perAsrama.filter(function (a) { return a.kunjungan + a.tidakHadir > 0 && a.kehadiran < 90; }).map(function (a) { return a.asrama + ' (' + koma(a.kehadiran) + '%)'; });
      if (rendah.length) L.push('Kehadiran di bawah 90% terjadi pada ' + rendah.join(', ') + '.');
    }
    L.push('Kehadiran sesuai jadwal mencapai ' + koma(kh.pm) + '%, dengan ' + kh.tidakHadir + ' kunjungan tidak hadir. Reasesmen terlaksana ' + kh.reasTepat + ' dari ' + kh.reasJadwal + ' yang dijadwalkan.');
    L.push('Dari ' + k.programPM + ' program terapi penerima manfaat, ' + k.pmAsesmen + ' telah menyelesaikan asesmen, ' + k.pmReasesmen + ' menyelesaikan reasesmen, dan ' + k.pmEvaluasi + ' telah dievaluasi.');
    if (h.vasAwal != null) L.push('Pada ' + h.n + ' penerima manfaat fisioterapi yang sudah memiliki asesmen dan catatan terapi, nyeri gerak rata-rata ' + (h.vasAkhir < h.vasAwal ? 'turun' : h.vasAkhir > h.vasAwal ? 'naik' : 'tetap') + ' dari ' + koma(h.vasAwal) + ' menjadi ' + koma(h.vasAkhir) + (h.barthelAwal != null ? ', sedangkan skor kemandirian (Barthel) berubah dari ' + koma(h.barthelAwal) + ' menjadi ' + koma(h.barthelAkhir) : '') + '.');
    if (h.goalPM.selesai) L.push('Layanan yang diakhiri bulan ini: ' + h.goalPM.tercapai + ' dari ' + h.goalPM.selesai + ' penerima manfaat mencapai tujuan terapi.');
    return L;
  }

  var FONT = "font-family:'Times New Roman',Times,serif;color:#000;";
  var TD = 'border:1px solid #000;padding:3px 6px;', TH = TD + 'font-weight:700;text-align:center;background:#f2f2f2;';
  function tabel(kepala, baris, lebar, rata) {
    return '<table style="' + FONT + 'border-collapse:collapse;width:100%;font-size:11pt;margin:4px 0 10px;page-break-inside:avoid;"><thead><tr>' +
      kepala.map(function (h, i) { return '<th style="' + TH + (lebar && lebar[i] ? 'width:' + lebar[i] + ';' : '') + '">' + e(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      baris.map(function (r) { var tebal = r._tebal; return '<tr>' + r.cells.map(function (c, i) { return '<td style="' + TD + (rata && rata[i] ? 'text-align:' + rata[i] + ';' : '') + (tebal ? 'font-weight:700;' : '') + '">' + e(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }
  function b(cells, tebal) { return { cells: cells, _tebal: !!tebal }; }
  function jdl(t) { return '<div style="' + FONT + 'font-weight:700;font-size:12pt;margin:14px 0 4px;page-break-after:avoid;">' + e(t) + '</div>'; }
  function para(t) { return '<p style="' + FONT + 'font-size:12pt;text-align:justify;line-height:1.5;margin:0 0 6px;text-indent:28px;">' + e(t) + '</p>'; }
  function ket(t) { return '<div style="' + FONT + 'font-size:10pt;font-style:italic;margin:-6px 0 10px;">' + e(t) + '</div>'; }

  /**
   * Dokumen laporan dinas (resmi). o = {kop: html kop surat, instansi, kota, tanggal: 'yyyy-mm-dd' atau Date,
   *   mengetahui:{jabatan,nama,nip}, pembuat:{jabatan,nama,nip}, kepala:{jabatan,nama,nip} (opsional)}
   */
  function dinasHtml(d, o) {
    o = o || {};
    if (d.hanyaPM) return dinasPMHtml(d, o);
    if (d.hanyaUmum) return dinasUmumHtml(d, o);
    var pm = d.pm, um = d.umum, k = d.kemajuan, h = d.hasil, kh = d.kehadiran, bln = labelBulan(d.bulan), tgl = o.tanggal instanceof Date ? o.tanggal : (o.tanggal ? new Date(o.tanggal + 'T12:00:00') : new Date());
    var inst = o.instansi || 'UPT Rehabilitasi Sosial Disabilitas Ganda, Sensorik Rungu Wicara dan Fisik';
    var x = '<div style="' + FONT + 'font-size:12pt;">' + (o.kop || '');
    var GF = grafikDaftar(d), ng = 0, gb = function (id) { var g = GF.filter(function (q) { return q.id === id; })[0]; return g ? gambarBlok(g, ++ng) : ''; };
    x += '<div style="' + FONT + 'text-align:center;font-weight:700;font-size:13pt;margin:14px 0 2px;">LAPORAN PELAKSANAAN LAYANAN TERAPI</div><div style="' + FONT + 'text-align:center;font-weight:700;font-size:12pt;margin-bottom:12px;">BULAN ' + e(bln.toUpperCase()) + '</div>';

    x += jdl('A. PENDAHULUAN');
    x += para('Laporan ini disusun sebagai pertanggungjawaban pelaksanaan layanan terapi (fisioterapi, terapi okupasi, dan terapi wicara) bagi penerima manfaat dan pasien umum di ' + inst + ' selama bulan ' + bln + '.');
    var at = aturan(o);
    x += para('Penerima manfaat dilayani pada hari ' + daftarHari(at.hariPm) + ' dengan program ' + kali(at.pmA) + ' asesmen, ' + kali(at.pmR) + ' reasesmen, dan ' + kali(at.pmE) + ' evaluasi. Pasien umum dilayani pada hari ' + daftarHari(at.hariUmum) + ' dengan sistem inden, persyaratan desil ' + at.desilMin + ' sampai ' + at.desilMax + ', dan paling banyak ' + kali(at.maksUmum) + ' kunjungan. Kunjungan penerima manfaat dan pasien umum dihitung terpisah.');
    x += para('Sumber data adalah catatan layanan pada aplikasi TERAVIA (pendaftaran, jadwal, kehadiran, asesmen, dan catatan terapi) serta data penerima manfaat pada SIMKEDA.');

    x += jdl('B. PELAKSANAAN LAYANAN');
    x += tabel(['Kategori', 'Kunjungan', 'Orang', 'Asesmen', 'Terapi', 'Reasesmen', 'Evaluasi'], [
      b(['Penerima manfaat', pm.kunjungan, pm.orang, pm.asesmen, pm.terapi, pm.reasesmen, pm.evaluasi]),
      b(['Pasien umum', um.kunjungan, um.orang, um.asesmen, um.terapi, um.reasesmen, um.evaluasi]),
      b(['Jumlah', d.totalKunjungan, pm.orang + um.orang, pm.asesmen + um.asesmen, pm.terapi + um.terapi, pm.reasesmen + um.reasesmen, pm.evaluasi + um.evaluasi], true)
    ], ['27%'], ['', 'center', 'center', 'center', 'center', 'center', 'center']);
    x += ket('Tabel 1. Rekapitulasi kunjungan hadir per kategori.');
    x += tabel(['Disiplin', 'Penerima manfaat', 'Pasien umum', 'Total', 'Pasien', 'Tidak hadir', 'Kehadiran (%)'], d.perLayanan.map(function (r) { return b([r.layanan, r.pm, r.umum, r.total, r.pasien, r.tidakHadir, koma(r.kehadiran)]); }).concat([b(['Jumlah', pm.kunjungan, um.kunjungan, d.totalKunjungan, '', kh.tidakHadir, ''], true)]), ['24%'], ['', 'center', 'center', 'center', 'center', 'center', 'center']);
    x += ket('Tabel 2. Kunjungan hadir per disiplin.'); x += gb('disiplin');
    x += tabel(['Pekan', 'Penerima manfaat', 'Pasien umum', 'Jumlah'], d.minggu.map(function (w) { return b([w.label, w.pm, w.umum, w.pm + w.umum]); }), ['34%'], ['', 'center', 'center', 'center']);
    x += ket('Tabel 3. Kunjungan hadir per pekan.'); x += gb('pekan');

    x += jdl('C. KEMAJUAN PROGRAM');
    x += tabel(['Indikator', 'Capaian', 'Dari'], [
      b(['Penerima manfaat menyelesaikan asesmen', k.pmAsesmen, k.programPM]), b(['Penerima manfaat menyelesaikan reasesmen', k.pmReasesmen, k.programPM]),
      b(['Penerima manfaat telah dievaluasi', k.pmEvaluasi, k.programPM]), b(['Pasien umum menyelesaikan kunjungan maksimal', k.umumMaks, k.umumTotal]), b(['Waiting list pasien umum (orang)', k.waitingList, '-'])
    ], ['62%'], ['', 'center', 'center']);
    x += ket('Tabel 4. Kemajuan program layanan.');

    x += jdl('D. HASIL TERAPI');
    x += tabel(['Indikator', 'Awal', 'Terakhir'], [
      b(['Nyeri gerak (VAS), rerata, ' + h.n + ' pasien fisioterapi', h.vasAwal == null ? '-' : koma(h.vasAwal), h.vasAkhir == null ? '-' : koma(h.vasAkhir)]),
      b(['Kemandirian (Indeks Barthel), rerata', h.barthelAwal == null ? '-' : koma(h.barthelAwal), h.barthelAkhir == null ? '-' : koma(h.barthelAkhir)])
    ], ['62%'], ['', 'center', 'center']);
    x += para('Layanan yang diakhiri pada bulan ini: penerima manfaat mencapai tujuan terapi ' + h.goalPM.tercapai + ' dari ' + h.goalPM.selesai + ' orang; pasien umum selesai sesuai rencana ' + h.goalUmum.tercapai + ' dari ' + h.goalUmum.selesai + ' orang.'); x += gb('hasil');

    x += jdl('E. KEHADIRAN DAN ANTREAN');
    x += tabel(['Indikator', 'Nilai'], [
      b(['Kehadiran penerima manfaat', koma(kh.pm) + '%']), b(['Kehadiran pasien umum', koma(kh.umum) + '%']), b(['Kunjungan tidak hadir', kh.tidakHadir]),
      b(['Rata-rata tunggu inden pasien umum', kh.tungguHari == null ? '-' : koma(kh.tungguHari) + ' hari']), b(['Reasesmen terlaksana dari yang dijadwalkan', kh.reasTepat + ' dari ' + kh.reasJadwal]), b(['Kuota hari layanan umum terpakai', kh.kuotaPakai + ' dari ' + kh.kuotaTotal])
    ], ['62%'], ['', 'center']);

    x += jdl('F. INDEKS KEPUASAN MASYARAKAT (IKM)');
    if (d.ikm) {
      x += para('Survei kepuasan diikuti ' + d.ikm.responden + ' responden dengan nilai IKM ' + koma(d.ikm.nilai) + ' (mutu ' + d.ikm.mutu + ').');
      x += tabel(['No.', 'Unsur pelayanan', 'Nilai (skala 1 sampai 4)'], d.ikm.unsur.map(function (u, i) { return b([i + 1, UNSUR[i], koma(u)]); }), ['9%', '', '28%'], ['center', '', 'center']);
    } else x += para('Data IKM bulan ini belum dimasukkan.');

    x += jdl('G. CAPAIAN TARGET');
    x += tabel(['Indikator', 'Target', 'Realisasi', 'Persen', 'Keterangan'], d.capaian.map(function (c) { return b([c.nama, c.target + ' ' + c.satuan, c.nilai == null ? '-' : koma(c.nilai) + ' ' + c.satuan, c.nilai == null ? '-' : koma(c.persen) + '%', c.nilai == null ? 'Belum ada data' : c.persen >= 100 ? 'Tercapai' : 'Belum tercapai']); }), ['34%', '15%', '17%', '12%', '22%'], ['', 'center', 'center', 'center', 'center']);

    x += jdl('H. ANALISIS');
    analisisTeks(d).forEach(function (t) { x += para(t); });

    var belum = d.capaian.filter(function (c) { return c.nilai != null && c.persen < 100; });
    x += jdl('I. KESIMPULAN DAN TINDAK LANJUT');
    x += para('Layanan terapi pada bulan ' + bln + ' telah dilaksanakan sebanyak ' + d.totalKunjungan + ' kunjungan hadir. ' + (belum.length ? 'Terdapat ' + belum.length + ' indikator yang belum mencapai target, yaitu ' + belum.map(function (c) { return lc(c.nama); }).join(', ') + '.' : 'Seluruh indikator yang tersedia datanya telah mencapai target.'));
    var tl = [];
    if (belum.length) tl.push('Meningkatkan pencapaian indikator yang belum memenuhi target pada bulan berikutnya.');
    if (k.waitingList > 0) tl.push('Menindaklanjuti ' + k.waitingList + ' orang pada waiting list sesuai kursi yang tersedia.');
    if (kh.tidakHadir > 0) tl.push('Memperkuat pengingat jadwal untuk menekan kunjungan tidak hadir.');
    if (!d.ikm) tl.push('Melengkapi data survei kepuasan (IKM) bulan ini.');
    if (!tl.length) tl.push('Mempertahankan mutu dan kelancaran pelayanan.');
    x += '<ol style="' + FONT + 'font-size:12pt;line-height:1.5;margin:0 0 6px;padding-left:44px;text-align:justify;">' + tl.map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ol>';

    // penutup dan tanda tangan selalu satu halaman (tanda tangan tidak terpisah sendirian)
    x += '<div style="page-break-inside:avoid;break-inside:avoid;">' + jdl('J. PENUTUP') + para('Demikian laporan ini disusun untuk dipergunakan sebagaimana mestinya.') + ttdDinasIsi(o, tgl) + '</div></div>';
    return x;
  }

  function ttdDinas(o, tgl) {
    return '<div style="page-break-inside:avoid;break-inside:avoid;">' + ttdDinasIsi(o, tgl) + '</div>';   // semua tanda tangan tetap satu halaman
  }
  function ttdDinasIsi(o, tgl) {
    var m = o.mengetahui || {}, p = o.pembuat || {}, k = o.kepala || {};
    var blok = function (atas, jab, nama, nip, lebar, gbr) { return '<td style="width:' + lebar + ';text-align:center;vertical-align:top;border:none;">' + atas + '<div>' + e(jab || '') + '</div><div style="height:78px;text-align:center;">' + (/^data:image\/png;base64,/.test(gbr || '') ? '<img class="ttd-img" src="' + gbr + '" style="height:70px;">' : '') + '</div><div style="font-weight:700;text-decoration:underline;">' + e(nama || '..............................') + '</div>' + (nip ? '<div>NIP. ' + e(nip) + '</div>' : '') + '</td>'; };
    var h = '<table style="' + FONT + 'width:100%;border-collapse:collapse;font-size:12pt;margin-top:18px;page-break-inside:avoid;"><tr>' +
      blok('<div>Mengetahui,</div>', m.jabatan || 'Kepala Seksi Pelayanan Sosial', m.nama, m.nip, '50%', m.ttd) +
      blok('<div>' + e(o.kota || 'Pasuruan') + ', ' + tglPanjang(tgl) + '</div>', p.jabatan || 'Pelaksana Layanan Terapi', p.nama, p.nip, '50%', p.ttd) + '</tr></table>';
    // Kepala UPT (bila diisi di Admin → Aturan): tanda tangan di tengah, di bawah dua penandatangan lain
    if (k.nama || k.jabatan) h += '<table style="' + FONT + 'width:100%;border-collapse:collapse;font-size:12pt;margin-top:10px;page-break-inside:avoid;"><tr><td style="width:25%;border:none;"></td>' + blok('<div>Menyetujui,</div>', k.jabatan || 'Kepala UPT', k.nama, k.nip, '50%', k.ttd) + '<td style="width:25%;border:none;"></td></tr></table>';
    return h;
  }

  /** Laporan dinas khusus pasien umum (v1.12): tanpa penerima manfaat. */
  function dinasUmumHtml(d, o) {
    var u = d.umum, k = d.kemajuan, h = d.hasil, kh = d.kehadiran, bln = labelBulan(d.bulan), tgl = o.tanggal instanceof Date ? o.tanggal : (o.tanggal ? new Date(o.tanggal + 'T12:00:00') : new Date());
    var inst = o.instansi || 'UPT Rehabilitasi Sosial Disabilitas Ganda, Sensorik Rungu Wicara dan Fisik';
    var at = aturan(o), C = ['center', 'center', 'center', 'center', 'center', 'center', 'center'];
    var x = '<div style="' + FONT + 'font-size:12pt;">' + (o.kop || '');
    var GF = grafikDaftar(d), ng = 0, gb = function (id) { var g = GF.filter(function (q) { return q.id === id; })[0]; return g ? gambarBlok(g, ++ng) : ''; };
    x += '<div style="' + FONT + 'text-align:center;font-weight:700;font-size:13pt;margin:14px 0 2px;">LAPORAN LAYANAN TERAPI PASIEN UMUM</div><div style="' + FONT + 'text-align:center;font-weight:700;font-size:12pt;margin-bottom:12px;">BULAN ' + e(bln.toUpperCase()) + '</div>';
    x += jdl('A. PENDAHULUAN');
    x += para('Laporan ini menyajikan pelaksanaan layanan terapi (fisioterapi, terapi okupasi, dan terapi wicara) bagi pasien umum di ' + inst + ' selama bulan ' + bln + '. Penerima manfaat tidak termasuk dalam laporan ini.');
    x += para('Pasien umum dilayani pada hari ' + daftarHari(at.hariUmum) + ', dengan syarat desil ' + at.desilMin + ' sampai ' + at.desilMax + ' dan paling banyak ' + kali(at.maksUmum) + ' kunjungan per layanan. Data berasal dari aplikasi TERAVIA.');
    x += jdl('B. PELAKSANAAN LAYANAN');
    x += tabel(['Kunjungan', 'Orang', 'Asesmen', 'Terapi', 'Reasesmen', 'Evaluasi', 'Tidak hadir'], [b([u.kunjungan, u.orang, u.asesmen, u.terapi, u.reasesmen, u.evaluasi, kh.tidakHadir])], null, C);
    x += ket('Tabel 1. Rekapitulasi kunjungan hadir pasien umum.');
    x += tabel(['Disiplin', 'Kunjungan', 'Tidak hadir', 'Kehadiran (%)'], d.perLayanan.map(function (r) { return b([r.layanan, r.umum, r.tidakHadir, koma(r.kehadiran)]); }).concat([b(['Jumlah', u.kunjungan, kh.tidakHadir, koma(kh.umum)], true)]), ['40%'], ['', 'center', 'center', 'center']);
    x += ket('Tabel 2. Kunjungan hadir per disiplin.'); x += gb('disiplin');
    x += tabel(['Pekan', 'Kunjungan'], d.minggu.map(function (w) { return b([w.label, w.umum]); }), ['50%'], ['', 'center']);
    x += ket('Tabel 3. Kunjungan hadir per pekan.'); x += gb('pekan');
    x += jdl('C. KUOTA DAN WAITING LIST');
    x += tabel(['Indikator', 'Nilai'], [b(['Kuota hari layanan umum terpakai', kh.kuotaPakai + ' dari ' + kh.kuotaTotal]), b(['Pasien-layanan yang menyelesaikan kunjungan maksimal', k.umumMaks + ' dari ' + k.umumTotal]), b(['Waiting list', k.waitingList + ' orang']), b(['Rata-rata tunggu inden', kh.tungguHari == null ? '-' : koma(kh.tungguHari) + ' hari'])], ['62%'], ['', 'center']);
    x += jdl('D. HASIL TERAPI');
    x += tabel(['Indikator', 'Awal', 'Terakhir'], [
      b(['Nyeri gerak (VAS), rerata, ' + h.n + ' pasien fisioterapi', h.vasAwal == null ? '-' : koma(h.vasAwal), h.vasAkhir == null ? '-' : koma(h.vasAkhir)]),
      b(['Kemandirian (Indeks Barthel), rerata', h.barthelAwal == null ? '-' : koma(h.barthelAwal), h.barthelAkhir == null ? '-' : koma(h.barthelAkhir)])
    ], ['62%'], ['', 'center', 'center']);
    x += para('Layanan yang diakhiri pada bulan ini: ' + h.goalUmum.tercapai + ' dari ' + h.goalUmum.selesai + ' pasien umum mencapai tujuan terapi.'); x += gb('hasil');
    var HURUF = ['E', 'F', 'G', 'H'], hi = 0;
    if (d.desil && d.desil.length) {
      x += jdl(HURUF[hi++] + '. SEBARAN DESIL DTSEN');
      x += tabel(['Desil', 'Orang'], d.desil.map(function (r) { return b(['Desil ' + r.desil, r.jumlah]); }), ['60%'], ['', 'center']); x += gb('desil');
    }
    x += jdl(HURUF[hi++] + '. CAPAIAN TARGET');
    x += tabel(['Indikator', 'Target', 'Realisasi', 'Persen', 'Keterangan'], d.capaian.map(function (c) { return b([c.nama, c.target + ' ' + c.satuan, c.nilai == null ? '-' : koma(c.nilai) + ' ' + c.satuan, c.nilai == null ? '-' : koma(c.persen) + '%', c.nilai == null ? 'Belum ada data' : c.persen >= 100 ? 'Tercapai' : 'Belum tercapai']); }), ['34%', '15%', '17%', '12%', '22%'], ['', 'center', 'center', 'center', 'center']);
    x += jdl(HURUF[hi++] + '. ANALISIS');
    analisisUmum(d).forEach(function (t) { x += para(t); });
    x += '<div style="page-break-inside:avoid;break-inside:avoid;">' + jdl(HURUF[hi++] + '. PENUTUP') + para('Demikian laporan ini disusun untuk dipergunakan sebagaimana mestinya.') + ttdDinasIsi(o, tgl) + '</div>';
    return x + '</div>';
  }

  /** Laporan dinas khusus penerima manfaat (dipakai SIMKEDA): tanpa pasien umum, dengan rincian per asrama. */
  function dinasPMHtml(d, o) {
    var pm = d.pm, k = d.kemajuan, h = d.hasil, kh = d.kehadiran, bln = labelBulan(d.bulan), tgl = o.tanggal instanceof Date ? o.tanggal : (o.tanggal ? new Date(o.tanggal + 'T12:00:00') : new Date());
    var inst = o.instansi || 'UPT Rehabilitasi Sosial Disabilitas Ganda, Sensorik Rungu Wicara dan Fisik', cak = d.asrama ? 'ASRAMA ' + d.asrama.toUpperCase() : '';
    var x = '<div style="' + FONT + 'font-size:12pt;">' + (o.kop || '');
    var GF = grafikDaftar(d), ng = 0, gb = function (id) { var g = GF.filter(function (q) { return q.id === id; })[0]; return g ? gambarBlok(g, ++ng) : ''; };
    x += '<div style="' + FONT + 'text-align:center;font-weight:700;font-size:13pt;margin:14px 0 2px;">LAPORAN LAYANAN TERAPI PENERIMA MANFAAT</div>' + (cak ? '<div style="' + FONT + 'text-align:center;font-weight:700;font-size:12pt;">' + e(cak) + '</div>' : '') + '<div style="' + FONT + 'text-align:center;font-weight:700;font-size:12pt;margin-bottom:12px;">BULAN ' + e(bln.toUpperCase()) + '</div>';
    x += jdl('A. PENDAHULUAN');
    x += para('Laporan ini menyajikan pelaksanaan layanan terapi (fisioterapi, terapi okupasi, dan terapi wicara) bagi penerima manfaat' + (d.asrama ? ' asrama ' + d.asrama : '') + ' di ' + inst + ' selama bulan ' + bln + '. Pasien umum tidak termasuk dalam laporan ini.');
    var at = aturan(o);
    x += para('Penerima manfaat mengikuti program ' + kali(at.pmA) + ' asesmen, ' + kali(at.pmR) + ' reasesmen, dan ' + kali(at.pmE) + ' evaluasi. Data berasal dari aplikasi TERAVIA, sedangkan data asrama berasal dari SIMKEDA.');
    x += jdl('B. PELAKSANAAN LAYANAN');
    x += tabel(['Kunjungan', 'Orang', 'Asesmen', 'Terapi', 'Reasesmen', 'Evaluasi', 'Tidak hadir'], [b([pm.kunjungan, pm.orang, pm.asesmen, pm.terapi, pm.reasesmen, pm.evaluasi, kh.tidakHadir])], null, ['center', 'center', 'center', 'center', 'center', 'center', 'center']);
    x += ket('Tabel 1. Rekapitulasi kunjungan hadir penerima manfaat.');
    x += tabel(['Disiplin', 'Kunjungan', 'Tidak hadir', 'Kehadiran (%)'], d.perLayanan.map(function (r) { return b([r.layanan, r.pm, r.tidakHadir, koma(r.kehadiran)]); }).concat([b(['Jumlah', pm.kunjungan, kh.tidakHadir, koma(kh.pm)], true)]), ['40%'], ['', 'center', 'center', 'center']);
    x += ket('Tabel 2. Kunjungan hadir per disiplin.'); x += gb('disiplin');
    var no = 3;
    if (!d.asrama && d.perAsrama && d.perAsrama.length) {
      var j = { orang: 0, kunjungan: 0, fisio: 0, okupasi: 0, wicara: 0, tidakHadir: 0 };
      d.perAsrama.forEach(function (a) { Object.keys(j).forEach(function (kk) { j[kk] += a[kk]; }); });
      x += tabel(['Asrama', 'Orang', 'Kunjungan', 'Fisioterapi', 'Okupasi', 'Wicara', 'Tidak hadir', 'Kehadiran (%)'], d.perAsrama.map(function (a) { return b([a.asrama, a.orang, a.kunjungan, a.fisio, a.okupasi, a.wicara, a.tidakHadir, koma(a.kehadiran)]); }).concat([b(['Jumlah', j.orang, j.kunjungan, j.fisio, j.okupasi, j.wicara, j.tidakHadir, ''], true)]), ['22%'], ['', 'center', 'center', 'center', 'center', 'center', 'center', 'center']);
      x += ket('Tabel ' + (no++) + '. Kunjungan hadir per asrama.'); x += gb('asrama');
    }
    x += tabel(['Pekan', 'Kunjungan'], d.minggu.map(function (w) { return b([w.label, w.pm]); }), ['50%'], ['', 'center']);
    x += ket('Tabel ' + (no++) + '. Kunjungan hadir per pekan.'); x += gb('pekan');
    x += jdl('C. KEMAJUAN PROGRAM');
    x += tabel(['Indikator', 'Capaian', 'Dari'], [b(['Menyelesaikan asesmen', k.pmAsesmen, k.programPM]), b(['Menyelesaikan reasesmen', k.pmReasesmen, k.programPM]), b(['Telah dievaluasi', k.pmEvaluasi, k.programPM]), b(['Reasesmen terlaksana dari yang dijadwalkan', kh.reasTepat, kh.reasJadwal])], ['62%'], ['', 'center', 'center']);
    x += jdl('D. HASIL TERAPI');
    x += tabel(['Indikator', 'Awal', 'Terakhir'], [
      b(['Nyeri gerak (VAS), rerata, ' + h.n + ' PM fisioterapi', h.vasAwal == null ? '-' : koma(h.vasAwal), h.vasAkhir == null ? '-' : koma(h.vasAkhir)]),
      b(['Kemandirian (Indeks Barthel), rerata', h.barthelAwal == null ? '-' : koma(h.barthelAwal), h.barthelAkhir == null ? '-' : koma(h.barthelAkhir)])
    ], ['62%'], ['', 'center', 'center']);
    x += para('Layanan yang diakhiri pada bulan ini: ' + h.goalPM.tercapai + ' dari ' + h.goalPM.selesai + ' penerima manfaat mencapai tujuan terapi.'); x += gb('hasil');
    var HURUF = ['E', 'F', 'G', 'H', 'I'], hi = 0;
    if (d.disabilitas && d.disabilitas.length) {
      x += jdl(HURUF[hi++] + '. SEBARAN JENIS DISABILITAS');
      x += tabel(['Jenis disabilitas', 'Orang', 'Persen'], d.disabilitas.map(function (r) { return b([r.nama, r.jumlah, koma(r.persen) + '%']); }), ['60%'], ['', 'center', 'center']);
    }
    // v1.11: daftar PM beserta diagnosa dan terapinya (hanya bila datanya dikirim, mis. dari SIMKEDA)
    if (d.daftarPM && d.daftarPM.length) {
      x += jdl(HURUF[hi++] + '. DAFTAR PENERIMA MANFAAT' + (cak ? ' ' + cak : ''));
      x += tabel(['No', 'Asrama', 'Nama', 'Diagnosa', 'Terapi'], d.daftarPM.map(function (r, i) { return b([i + 1, r.asrama, r.nama, r.diagnosa || '-', r.terapi]); }), ['6%', '14%', '24%', '34%', '22%'], ['center', '', '', '', '']);
      x += ket('Tabel ' + (no++) + '. Penerima manfaat yang mendapat layanan terapi pada bulan ini, beserta diagnosa dan terapinya.');
    }

    // v1.13: rincian per penerima manfaat (satu baris per PM per layanan)
    if (d.rincianPM && d.rincianPM.length) {
      x += jdl(HURUF[hi++] + '. RINCIAN LAYANAN PER PENERIMA MANFAAT' + (cak ? ' ' + cak : ''));
      var rb = [];
      d.rincianPM.forEach(function (p, i) {
        p.layanan.forEach(function (l, j) {
          var kmj = ['Asesmen ' + l.asesmenKe + '/' + l.asesmenDari]; if (l.vas) kmj.push('VAS ' + l.vas); if (l.barthel) kmj.push('Barthel ' + l.barthel); if (l.selesai) kmj.push('Selesai: ' + l.selesai);
          rb.push(b([j ? '' : i + 1, j ? '' : p.nama + (p.asrama && !d.asrama ? ', ' + p.asrama : ''), j ? '' : (p.diagnosa || '-'), l.layanan, l.asesmen, l.terapi, l.reasesmen, l.evaluasi, l.tidakHadir, l.tanggal.join(', ') || '-', kmj.join('; ')]));
        });
      });
      x += tabel(['No', 'Nama', 'Diagnosa', 'Layanan', 'As', 'Tr', 'Re', 'Ev', 'Tdk hadir', 'Tgl hadir', 'Kemajuan'], rb, ['5%', '15%', '12%', '12%', '5%', '5%', '5%', '5%', '8%', '11%', '17%'], ['center', '', '', '', 'center', 'center', 'center', 'center', 'center', '', '']);
      x += ket('Tabel ' + (no++) + '. Rincian layanan tiap penerima manfaat pada bulan ini. As = asesmen, Tr = terapi, Re = reasesmen, Ev = evaluasi (jumlah kunjungan hadir); tanggal hadir menurut tanggal pada bulan ini; VAS dan Barthel dari awal sampai terakhir.');
      x += jdl('Hasil terapi tiap PM'); x += hasilPMHtml(d);
    }
    x += jdl(HURUF[hi++] + '. ANALISIS');
    analisisPM(d).forEach(function (t) { x += para(t); });
    x += '<div style="page-break-inside:avoid;break-inside:avoid;">' + jdl(HURUF[hi++] + '. PENUTUP') + para('Demikian laporan ini disusun untuk dipergunakan sebagaimana mestinya.') + ttdDinasIsi(o, tgl) + '</div>';
    return x + '</div>';
  }

  /** v1.14: hasil terapi tiap PM dalam bentuk terstruktur: [{nama, asrama, diagnosa, layanan:[{nama, baris:[[label, isi], ...]}]}] */
  function hasilPM(d) {
    var bln = labelBulan(d.bulan);
    var angka = function (t) { var m = String(t || '').split('→'); return m.length === 2 && !isNaN(parseFloat(m[0])) && !isNaN(parseFloat(m[1])) ? [parseFloat(m[0]), parseFloat(m[1])] : null; };
    var arah = function (t, naikBaik) {
      var a = angka(t); if (!a) return '';
      return a[1] === a[0] ? 'tetap ' + koma(a[0]) : koma(a[0]) + ' → ' + koma(a[1]) + ((a[1] > a[0]) === naikBaik ? ' (membaik)' : ' (perlu dipantau)');
    };
    return (d.rincianPM || []).map(function (p) {
      return { nama: p.nama, asrama: p.asrama || '', diagnosa: p.diagnosa || '', layanan: p.layanan.map(function (l) {
        var B = [], bag = [];
        [['asesmen', l.asesmen], ['terapi', l.terapi], ['reasesmen', l.reasesmen], ['evaluasi', l.evaluasi]].forEach(function (x) { if (x[1]) bag.push(x[1] + ' ' + x[0]); });
        B.push(['Kehadiran', l.hadir ? 'Hadir ' + l.hadir + ' kali (' + bag.join(', ') + ')' + (l.tanggal.length ? ', tanggal ' + l.tanggal.join(', ') : '') + (l.tidakHadir ? '; tidak hadir ' + l.tidakHadir + ' kali' : '') : (l.tidakHadir ? 'Tidak hadir ' + l.tidakHadir + ' kali' : 'Belum ada kunjungan hadir')]);
        B.push(['Asesmen', l.asesmenKe + ' dari ' + l.asesmenDari + ' kali']);
        var v = arah(l.vas, false), br = arah(l.barthel, true);
        if (v) B.push(['Nyeri gerak (VAS)', v]);
        if (br) B.push(['Kemandirian (Barthel)', br]);
        var r = l.rencana;
        if (r) {
          var ss = r.sesi || null, kond = [r.impairment, r.fungsional, r.disabilitas].filter(Boolean);
          var tp = (ss && ss.tujuan) || r.tujuanPendek, pg = (ss && ss.program) || r.program, ed = (ss && ss.edukasi) || r.edukasi;
          if (kond.length) B.push(['Masalah pada asesmen', kond.join('; ')]);
          if (tp) B.push(['Tujuan jangka pendek', tp]);
          if (r.tujuanPanjang) B.push(['Tujuan jangka panjang', r.tujuanPanjang]);
          if (pg) B.push(['Program', pg + (ss && ss.exercise ? ' (exercise: ' + ss.exercise + ')' : '')]);
          if (ed) B.push(['Edukasi', ed]);
          if (ss) {
            var tg = ss.tanggal ? ' (' + String(ss.tanggal).slice(8, 10) + '/' + String(ss.tanggal).slice(5, 7) + ')' : '';
            if (ss.kemajuan) B.push(['Kemajuan sesi terakhir' + tg, ss.kemajuan]);
            if (ss.respons) B.push(['Respons pasien', ss.respons]);
            if (ss.bantuan) B.push(['Tingkat bantuan', ss.bantuan]);
            if (ss.akurasi) B.push(['Ketepatan respons', ss.akurasi]);
            if (ss.programAsrama) B.push(['Program latihan di asrama', ss.programAsrama]);
            if (ss.rencanaBerikut) B.push(['Rencana sesi berikutnya', ss.rencanaBerikut]);
          }
          if (r.rujuk) B.push(['Rujukan', r.rujuk]);
        }
        if (l.selesai) B.push(['Hasil akhir layanan', l.selesai]);
        return { nama: l.layanan, baris: B };
      }) };
    });
  }
  /** Uraian kalimat "Hasil terapi tiap PM": [{judul, paragraf:[{layanan, teks}]}] (dipakai dokumen dan Excel). */
  function uraianRapi(d) {
    var akhir = function (t) { t = String(t == null ? '' : t).trim(); return /[.!?]$/.test(t) ? t : t + '.'; };
    return hasilPM(d).map(function (p, i) {
      return { judul: (i + 1) + '. ' + p.nama + (p.asrama ? ', asrama ' + p.asrama : '') + (p.diagnosa ? ', diagnosa ' + p.diagnosa : '') + '.',
        paragraf: p.layanan.map(function (l) { return { layanan: l.nama, teks: l.baris.map(function (r) { return r[0] + ': ' + akhir(r[1]); }).join(' ') }; }) };
    });
  }
  function hasilPMHtml(d) {
    var gaya = FONT + 'font-size:12pt;line-height:1.5;text-align:justify;';
    return uraianRapi(d).map(function (p) {
      return '<div style="' + gaya + 'font-weight:700;margin:8px 0 2px;page-break-after:avoid;">' + e(p.judul) + '</div>' +
        p.paragraf.map(function (g) { return '<div style="' + gaya + 'margin:0 0 4px;padding-left:20px;"><b>' + e(g.layanan) + '.</b> ' + e(g.teks) + '</div>'; }).join('');
    }).join('');
  }

  /** v1.13: uraian per penerima manfaat dalam kalimat (satu paragraf per PM). */
  function uraianPM(d) {
    var bln = labelBulan(d.bulan);
    var angka = function (t) { var m = String(t || '').split('→'); return m.length === 2 && !isNaN(parseFloat(m[0])) && !isNaN(parseFloat(m[1])) ? [parseFloat(m[0]), parseFloat(m[1])] : null; };
    var arah = function (t, naikBaik, kata) {
      var a = angka(t); if (!a) return '';
      var tren = a[1] === a[0] ? 'tetap di ' + koma(a[0]) : (a[1] > a[0] ? 'naik' : 'turun') + ' dari ' + koma(a[0]) + ' menjadi ' + koma(a[1]) + ((a[1] > a[0]) === naikBaik ? ' (membaik)' : ' (perlu dipantau)');
      return kata + ' ' + tren;
    };
    return (d.rincianPM || []).map(function (p, i) {
      var t = (i + 1) + '. ' + p.nama + (p.asrama ? ', asrama ' + p.asrama : '') + (p.diagnosa ? ', dengan diagnosa ' + p.diagnosa : '') + '.';
      var ls = p.layanan.map(function (l) {
        var bag = []; [['asesmen', l.asesmen], ['terapi', l.terapi], ['reasesmen', l.reasesmen], ['evaluasi', l.evaluasi]].forEach(function (x) { if (x[1]) bag.push(x[1] + ' ' + x[0]); });
        var s = l.layanan + ': pada bulan ' + bln + (l.hadir ? ' hadir ' + l.hadir + ' kali (' + bag.join(', ') + ') pada tanggal ' + l.tanggal.join(', ') : '');
        if (l.tidakHadir) s += (l.hadir ? ' dan ' : ' ') + 'tidak hadir ' + l.tidakHadir + ' kali';
        s += '; asesmen terlaksana ' + l.asesmenKe + ' dari ' + l.asesmenDari + ' kali';
        var k = [arah(l.vas, false, 'nyeri gerak (VAS)'), arah(l.barthel, true, 'skor kemandirian (Barthel)')].filter(Boolean);
        if (k.length) s += '; ' + k.join(' dan ');
        if (l.selesai) s += '; layanan diakhiri dengan hasil ' + l.selesai.toLowerCase();
        var r = l.rencana;
        if (r) {
          var ss = r.sesi || null, rc = [], kond = [r.impairment, r.fungsional, r.disabilitas].filter(Boolean);
          if (kond.length) rc.push('masalah yang ditemukan pada asesmen: ' + kond.join('; '));
          var tp = (ss && ss.tujuan) || r.tujuanPendek, pg = (ss && ss.program) || r.program, ed = (ss && ss.edukasi) || r.edukasi;
          if (tp) rc.push('tujuan jangka pendek: ' + tp);
          if (r.tujuanPanjang) rc.push('tujuan jangka panjang: ' + r.tujuanPanjang);
          if (pg) rc.push('program: ' + pg + (ss && ss.exercise ? ', exercise ' + ss.exercise : '') + (ed ? ', dengan edukasi ' + ed : ''));
          else if (ed) rc.push('edukasi: ' + ed);
          if (ss) {
            if (ss.kemajuan) rc.push('kemajuan: ' + ss.kemajuan);
            if (ss.respons) rc.push('respons pasien: ' + ss.respons);
            if (ss.bantuan) rc.push('tingkat bantuan: ' + ss.bantuan);
            if (ss.akurasi) rc.push('ketepatan respons ' + ss.akurasi);
            if (ss.programAsrama) rc.push('program latihan di asrama: ' + ss.programAsrama);
            if (ss.rencanaBerikut) rc.push('rencana sesi berikutnya: ' + ss.rencanaBerikut);
          }
          if (r.rujuk) rc.push('rujukan: ' + r.rujuk);
          if (rc.length) s += '. ' + (ss ? 'Berdasarkan asesmen dan sesi terakhir (' + String(ss.jenisSesi || 'terapi').toLowerCase() + ' tanggal ' + String(ss.tanggal).slice(8, 10) + '/' + String(ss.tanggal).slice(5, 7) + ')' : 'Menurut asesmen') + ', ' + rc.join('; ');
        }
        return s;
      });
      return [t].concat(ls.map(function (x) { return x + '.'; }));
    }).reduce(function (a, b) { return a.concat(b); }, []);
  }

  /** Unduh sebagai berkas Word (.docx) ASLI (v1.13; sebelumnya HTML bernama .doc sehingga dianggap rusak). */
  function unduhWord(html, namaBerkas) {
    return Berkas.docxDariHtml(html).then(function (u) { Berkas.unduh(u, namaBerkas + '.docx', Berkas.MIME_DOCX); });
  }

  // ---------- Grafik (v1.13): SVG sederhana, dipakai di layar, PDF/cetak dan Word ----------
  var W_PM = '#1a3fae', W_UM = '#d98a00';
  function gfAngka(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }
  /** opt = {judul, kat:[], seri:[{nama,nilai:[],warna}], maks} -> potongan SVG di dalam <g> (x0,y0,w,h) */
  function gfIsi(opt, x0, y0, w, h) {
    var kat = opt.kat, ns = opt.seri.length, kiri = 34, atas = 30, bawah = 38, pw = w - kiri - 10, ph = h - atas - bawah, maks = opt.maks || 0;
    opt.seri.forEach(function (s) { s.nilai.forEach(function (v) { if (v > maks) maks = v; }); });
    var langkah = maks <= 5 ? 1 : maks <= 10 ? 2 : maks <= 25 ? 5 : maks <= 50 ? 10 : maks <= 100 ? 20 : Math.pow(10, Math.floor(Math.log(maks) / Math.LN10)); maks = Math.ceil(maks / langkah) * langkah || langkah;
    var o = '<g transform="translate(' + x0 + ',' + y0 + ')"><text class="gf-t" x="' + (w / 2) + '" y="16" text-anchor="middle" font-size="12" font-weight="700" fill="#222" font-family="Arial,sans-serif">' + e(opt.judul) + '</text>';
    for (var t = 0; t <= maks; t += langkah) { var yy = atas + ph - ph * t / maks; o += '<line class="gf-g" x1="' + kiri + '" x2="' + (kiri + pw) + '" y1="' + yy + '" y2="' + yy + '" stroke="#d5d9e2" stroke-width="1"/><text class="gf-t" x="' + (kiri - 5) + '" y="' + (yy + 3.5) + '" text-anchor="end" font-size="10" fill="#444" font-family="Arial,sans-serif">' + t + '</text>'; }
    var gw = pw / kat.length, bw = Math.min(46, gw * 0.7 / ns);
    kat.forEach(function (k, i) {
      var cx = kiri + gw * i + gw / 2, mulai = cx - bw * ns / 2;
      opt.seri.forEach(function (s, si) {
        var v = s.nilai[i] || 0, bh = ph * v / maks, bx = mulai + bw * si, by = atas + ph - bh;
        o += '<rect class="gf-s' + si + '" x="' + bx + '" y="' + by + '" width="' + (bw - 2) + '" height="' + Math.max(bh, 0) + '" fill="' + s.warna + '"/>' + (v ? '<text class="gf-t" x="' + (bx + (bw - 2) / 2) + '" y="' + (by - 3) + '" text-anchor="middle" font-size="10" fill="#222" font-family="Arial,sans-serif">' + gfAngka(v) + '</text>' : '');
      });
      var lbl = String(k); if (lbl.length > 14) lbl = lbl.slice(0, 13) + '…';
      o += '<text class="gf-t" x="' + cx + '" y="' + (atas + ph + 14) + '" text-anchor="middle" font-size="10" fill="#333" font-family="Arial,sans-serif">' + e(lbl) + '</text>';
    });
    o += '<line class="gf-g2" x1="' + kiri + '" x2="' + (kiri + pw) + '" y1="' + (atas + ph) + '" y2="' + (atas + ph) + '" stroke="#555" stroke-width="1"/>';
    if (ns > 1) { var lx = kiri; opt.seri.forEach(function (s, si) { o += '<rect class="gf-s' + si + '" x="' + lx + '" y="' + (h - 12) + '" width="10" height="10" fill="' + s.warna + '"/><text class="gf-t" x="' + (lx + 14) + '" y="' + (h - 3) + '" font-size="10" fill="#333" font-family="Arial,sans-serif">' + e(s.nama) + '</text>'; lx += 24 + s.nama.length * 6; }); }
    return o + '</g>';
  }
  function gfSvg(panel, lebar, tinggi) {
    var per = lebar / panel.length;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + lebar + ' ' + tinggi + '" width="' + lebar + '" height="' + tinggi + '" role="img"><rect class="gf-bg" width="' + lebar + '" height="' + tinggi + '" fill="#ffffff"/>' + panel.map(function (p, i) { return gfIsi(p, per * i, 0, per, tinggi); }).join('') + '</svg>';
  }
  /** Daftar grafik yang relevan untuk satu laporan: [{id, judul, panel:[opt], lebar, tinggi}]. Hanya yang ada datanya. */
  function grafikDaftar(d) {
    var r = [], pmSaja = d.hanyaPM, umSaja = d.hanyaUmum, dua = !pmSaja && !umSaja;
    var disiplin = (d.perLayanan || []).map(function (x) { return x.layanan; });
    if (disiplin.length) {
      var seri = []; if (!umSaja) seri.push({ nama: 'Penerima manfaat', nilai: d.perLayanan.map(function (x) { return x.pm; }), warna: W_PM }); if (!pmSaja) seri.push({ nama: 'Pasien umum', nilai: d.perLayanan.map(function (x) { return x.umum; }), warna: W_UM });
      r.push({ id: 'disiplin', judul: 'Kunjungan hadir per disiplin', panel: [{ judul: 'Kunjungan hadir per disiplin', kat: disiplin, seri: seri }], lebar: 560, tinggi: 250 });
    }
    if ((d.minggu || []).length > 1) {
      var sm = []; if (!umSaja) sm.push({ nama: 'Penerima manfaat', nilai: d.minggu.map(function (x) { return x.pm; }), warna: W_PM }); if (!pmSaja) sm.push({ nama: 'Pasien umum', nilai: d.minggu.map(function (x) { return x.umum; }), warna: W_UM });
      r.push({ id: 'pekan', judul: 'Kunjungan hadir per pekan', panel: [{ judul: 'Kunjungan hadir per pekan', kat: d.minggu.map(function (x) { return x.label; }), seri: sm }], lebar: 560, tinggi: 250 });
    }
    if (!umSaja && !d.asrama && (d.perAsrama || []).length > 1) r.push({ id: 'asrama', judul: 'Kunjungan hadir per asrama', panel: [{ judul: 'Kunjungan hadir per asrama', kat: d.perAsrama.map(function (x) { return x.asrama; }), seri: [{ nama: 'Kunjungan', nilai: d.perAsrama.map(function (x) { return x.kunjungan; }), warna: W_PM }] }], lebar: 560, tinggi: 250 });
    if (!pmSaja && (d.desil || []).length) r.push({ id: 'desil', judul: 'Sebaran pasien umum menurut desil DTSEN', panel: [{ judul: 'Sebaran desil DTSEN (orang)', kat: d.desil.map(function (x) { return 'Desil ' + x.desil; }), seri: [{ nama: 'Orang', nilai: d.desil.map(function (x) { return x.jumlah; }), warna: W_UM }] }], lebar: 560, tinggi: 250 });
    var h = d.hasil || {}, pn = [];
    if (h.vasAwal != null && h.vasAkhir != null) pn.push({ judul: 'Nyeri gerak (VAS, 0-10)', kat: ['Awal', 'Terakhir'], seri: [{ nama: 'Rerata', nilai: [h.vasAwal, h.vasAkhir], warna: W_PM }], maks: 10 });
    if (h.barthelAwal != null && h.barthelAkhir != null) pn.push({ judul: 'Kemandirian (Barthel, 0-100)', kat: ['Awal', 'Terakhir'], seri: [{ nama: 'Rerata', nilai: [h.barthelAwal, h.barthelAkhir], warna: W_PM }], maks: 100 });
    if (pn.length) r.push({ id: 'hasil', judul: 'Perubahan hasil terapi (rerata awal dan terakhir)', panel: pn, lebar: 560, tinggi: 240 });
    r.forEach(function (g) { g.svg = gfSvg(g.panel, g.lebar, g.tinggi); });
    return r;
  }
  function gambarBlok(g, no) { return '<div style="text-align:center;margin:8px 0 2px;page-break-inside:avoid;break-inside:avoid;">' + g.svg + '</div><div style="' + FONT + 'text-align:center;font-size:10pt;font-style:italic;margin:0 0 10px;">Gambar ' + no + '. ' + e(g.judul) + '.</div>'; }

  g.LaporanTerapi = { uraianPM: uraianPM, hasilPM: hasilPM, uraianRapi: uraianRapi, UNSUR: UNSUR, labelBulan: labelBulan, analisisTeks: analisisTeks, dinasHtml: dinasHtml, unduhWord: unduhWord, grafikDaftar: grafikDaftar, gambarBlok: gambarBlok, gfSvg: gfSvg };
})(window);
