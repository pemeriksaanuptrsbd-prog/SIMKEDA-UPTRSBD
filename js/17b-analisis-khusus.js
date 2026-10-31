// ══════════════════════════════════════════════════════════════════
//  ANALISIS KHUSUS PER JENIS LAPORAN (paket laporan Kepala Seksi, v27)
//  Setiap laporan memperoleh uraian yang disesuaikan dengan judul dan
//  isi laporannya (bukan pola umum). Semua angka dihitung dari data;
//  persentase dibulatkan ke bilangan bulat.
// ══════════════════════════════════════════════════════════════════
function _pkB(t) { return '<b>' + escHtml(t) + '</b>'; }
function _pkRp(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); }
function _pkTop(list, fn, n) { return _sebaran(list, fn).slice(0, n || 3); }
function _pkSebut(arr, satuan, total, maks) {
  return arr.slice(0, maks || 3).map(e => `${escHtml(e.k)} (${e.n} ${satuan}${total ? '; ' + _persen(e.n, total) : ''})`).join(', ');
}
function _pkNamaList(list, maks) {
  const a = _analisisNama((list || []).map(r => r.namaPM));
  return { a, teks: _pkRp(a.ganda.slice(0, maks || 6).map(e => `${escHtml(e.nama)} (${e.n} kali)`).join(', ')) };
}
function _pkAsrama(list) {
  return _sebaran(list.map(r => {
    let as = r.kamarBlok;
    if (!as && r.nomorInduk) { const pm = (state.penerima || []).find(p => p.nomorInduk === r.nomorInduk); if (pm) as = pm.kamarBlok; }
    return { asrama: as || '' };
  }), i => i.asrama);
}
let _pkBoxPolos = null; // null = gaya paket (Times); {pdf:bool} = gaya cetak/layar biasa
function _pkBox(P, mulai) {
  P = (P || []).filter(Boolean);
  if (!P.length) return '';
  if (_pkKumpul) { P.forEach(t => _pkKumpul.push(t)); return ''; }
  if (_pkBoxPolos) {
    const pdf = _pkBoxPolos.pdf;
    const st1 = pdf ? 'margin:10px 0 14px;font-size:9.5pt;line-height:1.6;text-align:justify;color:#111;' : '';
    const pst = (pdf ? 'margin:0 0 4px;' : 'margin:0 0 .35rem;') + 'text-indent:1.1cm;text-align:justify;';
    return `<div class="analisis-pm" style="${st1}"><div class="analisis-judul" style="font-weight:700;color:#000;margin-bottom:4px;">Analisis dan Penjelasan Data</div>` + P.map(t => `<p style="${pst}">${t}</p>`).join('') + '</div>';
  }
  return _pkGayaAnalisis('<div class="analisis-pm"><div class="analisis-judul"></div>' + P.map(t => '<p>' + t + '</p>').join('') + '</div>', mulai || 'A');
}
function _pkObatList(list) {
  const o = [];
  (list || []).forEach(p => (p.obatDiberikan || []).forEach(x => { if (x && x.nama) o.push({ obat: _pkRp(x.nama) }); }));
  return o;
}
function _pkStatusTeks(list) {
  const st = _pkTop(list, r => r.statusKondisi, 5);
  return st.length ? st.map(e => `${escHtml(e.k)} (${e.n}; ${_persen(e.n, list.length)})`).join(', ') : '';
}
function _pkAsramaTeks(list) {
  const as = _pkAsrama(list);
  if (!as.length) return '';
  if (as.length === 1) return `Seluruh catatan berasal dari ${_pkB(as[0].k)}.`;
  return `Berdasarkan asrama, catatan terbanyak berasal dari ${_pkB(as[0].k)} (${as[0].n}; ${_persen(as[0].n, list.length)}), diikuti ${_pkSebut(as.slice(1), 'catatan', list.length, 3)}.`;
}

// ── Keluhan insidental ──
function _pkAnalisisInsidental(S, c, mulai) {
  const L = S.ins; if (!L.length) return '';
  const bt = _pkPer(c), P = [];
  const nm = _pkNamaList(L);
  P.push(`Berdasarkan Laporan Keluhan Insidental periode ${escHtml(bt)}, tercatat ${_pkB(L.length)} kejadian keluhan yang dialami oleh ${_pkB(S.insPM)} Penerima Manfaat (PM). Keluhan insidental adalah keluhan yang disampaikan PM di luar jadwal kunjungan dokter dan dicatat oleh Pengelola Layanan Kesehatan sebelum pemeriksaan mingguan.${nm.a.ganda.length ? ` Terdapat ${nm.a.ganda.length} PM yang mengalami keluhan lebih dari satu kali, yaitu ${nm.teks}.` : ' Setiap PM tercatat mengalami keluhan satu kali.'}`);
  const kl = _pkTop(L, r => r.keluhan, 3);
  if (kl.length) P.push(`Keluhan yang paling sering disampaikan adalah ${_pkSebut(kl, 'kejadian', L.length)}.${(() => { const tk = _pkTop(L, r => r.tindakan, 2); return tk.length ? ' Penanganan awal yang paling banyak diberikan petugas adalah ' + _pkSebut(tk, 'kejadian', L.length, 2) + '.' : ''; })()} ${_pkAsramaTeks(L)}`);
  const ber = L.filter(r => (r.obatDiberikan || []).length);
  const ob = _pkTop(_pkObatList(L), o => o.obat, 3);
  const ruj = L.filter(r => String(r.perluRujukan).toLowerCase() === 'ya').length;
  P.push(`Sebanyak ${ber.length} kejadian (${_persen(ber.length, L.length)}) memperoleh obat dari petugas${ob.length ? ', dengan obat yang paling sering diberikan yaitu ' + _pkSebut(ob, 'kali', 0) : ''}. ${ruj ? `Terdapat ${ruj} kejadian yang dinilai memerlukan rujukan.` : 'Tidak terdapat kejadian yang memerlukan rujukan.'}`);
  P.push(`Dari seluruh kejadian tersebut, ${S.insDiperiksa} kejadian (${_persen(S.insDiperiksa, L.length)}) dilanjutkan dengan pemeriksaan dokter pada kunjungan mingguan, sedangkan ${S.insSehatPM} PM tercatat sudah sehat sebelum hari pemeriksaan. Data ini menjadi dasar pemantauan kesehatan PM dan perencanaan kebutuhan pemeriksaan pada kunjungan dokter berikutnya.`);
  return _pkBox(P, mulai);
}
// ── Insidental yang lanjut diperiksa dokter ──
function _pkAnalisisInsLanjutDokter(S, c, mulai) {
  const pasang = [];
  S.ins.forEach(x => {
    const p = (state.pemeriksaan || []).filter(q => q && !q._deleted && q.nomorInduk === x.nomorInduk && new Date(q.tglPeriksa) >= new Date(x.tgl)).sort((a, b) => new Date(a.tglPeriksa) - new Date(b.tglPeriksa))[0];
    if (p) pasang.push({ x, p });
  });
  if (!pasang.length) return '';
  const bt = _pkPer(c), P = [];
  const pmN = _hitungPMUnik(pasang.map(z => z.x));
  const selisih = pasang.map(z => Math.max(0, Math.round((new Date(z.p.tglPeriksa) - new Date(z.x.tgl)) / 86400000)));
  const rata = Math.round(selisih.reduce((a, b) => a + b, 0) / selisih.length);
  P.push(`Berdasarkan laporan hasil pemeriksaan insidental yang diperiksa dokter periode ${escHtml(bt)}, terdapat ${_pkB(pasang.length)} kejadian keluhan insidental dari ${_pkB(pmN)} PM yang dilanjutkan dengan pemeriksaan dokter. Jumlah tersebut mencakup ${_persen(pasang.length, S.ins.length)} dari seluruh ${S.ins.length} kejadian insidental pada periode ini, dengan rata-rata jarak waktu antara pencatatan keluhan dan pemeriksaan dokter sekitar ${rata} hari.`);
  const ps = pasang.map(z => z.p);
  const dg = _pkTop(ps, r => r.diagnosis, 3);
  if (dg.length) P.push(`Diagnosis yang ditegakkan dokter terhadap PM tersebut paling banyak berupa ${_pkSebut(dg, 'PM', ps.length)}.`);
  const st = _pkStatusTeks(ps);
  P.push(`${st ? 'Kondisi PM setelah pemeriksaan dokter: ' + st + '. ' : ''}Hasil ini menunjukkan bahwa keluhan insidental yang dicatat petugas telah memperoleh penegakan diagnosis, terapi, dan edukasi dari dokter sesuai kondisi masing-masing PM, sehingga dapat menjadi bahan pemantauan lanjutan.`);
  return _pkBox(P, mulai);
}
// ── Hasil pemeriksaan dokter ──
function _pkAnalisisPemeriksaan(S, c, mulai) {
  const L = S.pem; if (!L.length) return '';
  const bt = _pkPer(c), P = [];
  const nm = _pkNamaList(L);
  P.push(`Berdasarkan Laporan Hasil Pemeriksaan Dokter periode ${escHtml(bt)}, dokter melaksanakan pemeriksaan sebanyak ${_pkB(L.length)} kunjungan terhadap ${_pkB(S.pmPeriksa)} PM pada ${_pkB(S.kunj.length)} hari kunjungan, atau setara dengan ${_persen(S.pmPeriksa, S.aktif)} dari ${S.aktif} PM aktif.${nm.a.ganda.length ? ` Sebanyak ${nm.a.ganda.length} PM diperiksa lebih dari satu kali, yaitu ${nm.teks}, sehingga memerlukan pemantauan berkelanjutan.` : ''}`);
  const dg = _pkTop(L, r => r.diagnosis, 3);
  if (dg.length) P.push(`Diagnosis yang paling banyak ditegakkan adalah ${_pkSebut(dg, 'kunjungan', L.length)}. ${_pkAsramaTeks(L)}`);
  const ob = _pkTop(_pkObatList(L), o => o.obat, 3);
  P.push(`Berdasarkan status kondisi hasil pemeriksaan, rinciannya adalah ${_pkStatusTeks(L) || '-'}.${ob.length ? ' Obat yang paling sering diresepkan dokter adalah ' + _pkSebut(ob, 'kali', 0) + '.' : ''}`);
  const ruj = L.filter(r => String(r.perluRujukan).toLowerCase() === 'ya' || r.statusKondisi === 'Rujuk').length;
  P.push(`${ruj ? `Terdapat ${ruj} kunjungan yang memerlukan rujukan ke fasilitas kesehatan lanjutan.` : 'Tidak terdapat kunjungan yang memerlukan rujukan.'} Hasil pemeriksaan telah dicatat pada rekam medis masing-masing PM dan dapat dijadikan bahan evaluasi pelayanan kesehatan serta perencanaan kebutuhan obat bulan berikutnya.`);
  return _pkBox(P, mulai);
}
function _pkObatDaftar(c) {
  return (state.obatKeluar || []).filter(o => _isPemakaian(o) && _pkDalamBulan(o.tgl || o.waktuInput, c) && _pkLolosNama(o, c));
}
// ── Pemakaian obat (rekapitulasi stok) ──
function _pkAnalisisObat(S, c, mulai) {
  const L = _pkObatDaftar(c);
  if (!L.length) return '';
  const bt = _pkPer(c), P = [];
  const jenis = new Set(L.map(o => _pkRp(o.namaObat).toUpperCase())).size;
  const pm = _hitungPMUnik(L);
  const sumber = _pkTop(L, o => o.sumber === 'insidental' ? 'Insidental' : 'Pemeriksaan dokter', 2);
  P.push(`Berdasarkan Rekapitulasi Pemakaian Obat periode ${escHtml(bt)}, tercatat ${_pkB(L.length)} kali pemberian obat berupa ${_pkB(jenis)} jenis obat kepada ${_pkB(pm)} PM.${sumber.length ? ' Pemberian tersebut bersumber dari ' + _pkSebut(sumber, 'pemberian', L.length, 2) + '.' : ''}`);
  const peta = new Map();
  L.forEach(o => { const k = _pkRp(o.namaObat).toUpperCase(); const e = peta.get(k) || { k: _pkRp(o.namaObat), n: 0, j: 0, sat: o.satuan || '' }; e.n++; e.j += Number(o.jumlah) || 0; peta.set(k, e); });
  const top = [...peta.values()].sort((a, b) => b.n - a.n || b.j - a.j).slice(0, 3);
  P.push(`Obat yang paling sering diberikan adalah ${top.map(e => `${escHtml(e.k)} (${e.n} kali pemberian; total ${e.j} ${escHtml(e.sat || 'unit')})`).join(', ')}. Pola pemakaian ini mencerminkan jenis keluhan PM yang dominan pada periode tersebut.`);
  const stok = (state.stokObat || []).filter(o => o && o.nama);
  const habis = stok.filter(o => (o.stok || 0) <= 0), tipis = stok.filter(o => (o.stok || 0) > 0 && (o.stok || 0) <= (o.minimum || 10));
  P.push(`Pada akhir periode, dari ${stok.length} jenis obat yang terdata, ${habis.length} jenis berstatus habis${habis.length ? ' (' + escHtml(habis.slice(0, 5).map(o => o.nama).join(', ')) + (habis.length > 5 ? ', dan lainnya' : '') + ')' : ''} dan ${tipis.length} jenis hampir habis${tipis.length ? ' (' + escHtml(tipis.slice(0, 5).map(o => o.nama).join(', ')) + (tipis.length > 5 ? ', dan lainnya' : '') + ')' : ''}. Informasi ini dapat digunakan sebagai bahan pengajuan pengadaan obat pada periode berikutnya.`);
  return _pkBox(P, mulai);
}
// ── Sisa stok akhir bulan ──
function _pkAnalisisStok(c, mulai) {
  const st = (state.stokObat || []).filter(o => o && o.nama);
  if (!st.length) return '';
  const aman = st.filter(o => (o.stok || 0) > (o.minimum || 10)).length;
  const habis = st.filter(o => (o.stok || 0) <= 0), tipis = st.filter(o => (o.stok || 0) > 0 && (o.stok || 0) <= (o.minimum || 10));
  const P = [`Berdasarkan Laporan Stok Obat ${escHtml(c.stokKet || ('akhir bulan ' + _pkPer(c)))}, tercatat ${_pkB(st.length)} jenis obat dengan rincian ${aman} jenis berstatus aman (${_persen(aman, st.length)}), ${tipis.length} jenis hampir habis (${_persen(tipis.length, st.length)}), dan ${habis.length} jenis habis (${_persen(habis.length, st.length)}).`];
  if (tipis.length || habis.length) P.push(`Obat yang perlu diprioritaskan untuk pengadaan adalah ${escHtml([...habis, ...tipis].slice(0, 8).map(o => o.nama).join(', '))}${habis.length + tipis.length > 8 ? ', dan lainnya' : ''}, agar pelayanan obat kepada PM pada bulan berikutnya tidak terhambat.`);
  else P.push('Seluruh jenis obat berada pada batas aman sehingga belum diperlukan pengadaan mendesak.');
  return _pkBox(P, mulai);
}
// ── Jadwal kunjungan dokter / realisasi program ──
function _pkAnalisisJadwal(S, c, mulai, program) {
  if (!S.kunj.length) return '';
  const bt = _pkPer(c), P = [];
  const tg = k => k.tgl.getDate() + ' ' + bt;
  const rata = Math.round(S.jmlKunj / S.kunj.length);
  const maks = S.kunj.slice().sort((a, b) => b.jmlPM - a.jmlPM)[0], min = S.kunj.slice().sort((a, b) => a.jmlPM - b.jmlPM)[0];
  P.push(program
    ? `Pelaksanaan Rencana Program Pemeriksaan Kesehatan PM bulan ${escHtml(bt)} terealisasi melalui ${_pkB(S.kunj.length)} kali kunjungan dokter Puskesmas ke UPT, yaitu pada tanggal ${escHtml(S.kunj.map(k => k.tgl.getDate()).join(', '))} ${escHtml(bt)}. Layanan diberikan kepada ${_pkB(S.pmPeriksa)} PM (${_persen(S.pmPeriksa, S.aktif)} dari ${S.aktif} PM aktif) yang mengeluhkan gangguan kesehatan, sesuai sasaran program bahwa pemeriksaan ditujukan bagi PM yang sakit dan bukan bagi seluruh PM.`
    : `Berdasarkan Jadwal Kunjungan Dokter periode ${escHtml(bt)}, dokter Puskesmas melaksanakan ${_pkB(S.kunj.length)} kali kunjungan ke UPT pada tanggal ${escHtml(S.kunj.map(k => k.tgl.getDate()).join(', '))} ${escHtml(bt)}, dengan total ${_pkB(S.jmlKunj)} kunjungan pemeriksaan PM.`);
  P.push(`Rata-rata jumlah PM yang diperiksa pada setiap hari kunjungan adalah ${rata} PM. Jumlah PM terbanyak tercatat pada tanggal ${escHtml(tg(maks))} (${maks.jmlPM} PM) dan paling sedikit pada tanggal ${escHtml(tg(min))} (${min.jmlPM} PM).`);
  P.push(`${program ? `Selain itu, tercatat ${S.insN} kejadian keluhan insidental dan ${S.ruj.length} kejadian rujukan yang ditangani melalui koordinasi dengan dokter. ` : ''}Jadwal kunjungan yang teratur memungkinkan keluhan PM ditangani secara berkala dan dapat dijadikan acuan penyusunan jadwal pada bulan berikutnya.`);
  return _pkBox(P, mulai);
}
// ── Pendampingan per minggu ──
function _pkAnalisisMinggu(k, S, c, tglK, mulai) {
  const L = k.list; if (!L.length) return '';
  const bt = _pkPer(c), P = [];
  const rata = Math.round(S.jmlKunj / S.kunj.length);
  P.push(`Pada kegiatan pendampingan Minggu ${escHtml(k.rom)} tanggal ${escHtml(tglK)}, dokter memeriksa ${_pkB(k.jmlPM)} PM dalam ${k.jmlKunj} kunjungan.${k.jmlPM > rata ? ' Jumlah ini lebih banyak' : k.jmlPM < rata ? ' Jumlah ini lebih sedikit' : ' Jumlah ini sama'} dibandingkan rata-rata ${rata} PM per kunjungan pada bulan ${escHtml(bt)}.`);
  const dg = _pkTop(L, r => r.diagnosis, 3);
  P.push(`${dg.length ? 'Diagnosis yang paling banyak ditemukan pada pemeriksaan ini adalah ' + _pkSebut(dg, 'PM', L.length) + '. ' : ''}Kondisi PM setelah pemeriksaan: ${_pkStatusTeks(L) || '-'}. ${_pkAsramaTeks(L)}`);
  return _pkBox(P.concat([_pkTeksInsLanjut(_pkInsLanjut(S, k), tglK).replace(/^<p[^>]*>|<\/p>$/g, '')]), mulai);
}
// ── Status kesehatan (resume) ──
function _pkAnalisisStatus(S, c, mulai) {
  if (!S.pmPeriksa) return '';
  const bt = _pkPer(c), P = [];
  const nama = st => Object.values(S.terakhir).filter(p => st === 'x' ? (p.statusKondisi !== 'Baik' && p.statusKondisi !== 'Cukup Baik') : p.statusKondisi === st).map(p => _pkRp(p.namaPM));
  P.push(`Berdasarkan Resume Kesehatan Penerima Manfaat periode ${escHtml(bt)}, status kesehatan terakhir ${_pkB(S.pmPeriksa)} PM yang dilayani adalah ${_pkB(S.baik)} PM berstatus Baik (${_persen(S.baik, S.pmPeriksa)}), ${_pkB(S.cukup)} PM Cukup Baik (${_persen(S.cukup, S.pmPeriksa)}), dan ${_pkB(S.tindak)} PM memerlukan tindak lanjut (${_persen(S.tindak, S.pmPeriksa)}).`);
  const cb = nama('Cukup Baik'), tl = nama('x');
  if (cb.length) P.push(`PM yang berstatus Cukup Baik dan perlu dipantau adalah ${escHtml(cb.slice(0, 8).join(', '))}${cb.length > 8 ? ', dan lainnya' : ''}.`);
  if (tl.length) P.push(`PM yang memerlukan tindak lanjut berupa layanan rujukan adalah ${escHtml(tl.slice(0, 8).join(', '))}${tl.length > 8 ? ', dan lainnya' : ''}.`);
  P.push(`Sebagian besar PM yang dilayani berada dalam kondisi baik, sehingga keluhan umumnya dapat ditangani di UPT pada hari kunjungan dokter. PM dengan status selain Baik tetap menjadi prioritas pemantauan pada kunjungan berikutnya.`);
  return _pkBox(P, mulai);
}
// ── Analisis perkembangan kesehatan (laporan 005, bagian VI) ──
function _pkAnalisisPerkembangan(S, c, mulai) {
  if (!S.pem.length && !S.ins.length) return '';
  const bt = _pkPer(c);
  const P = [`Perkembangan kesehatan PM bulan ${escHtml(bt)} menunjukkan bahwa ${_persen(S.pmPeriksa, S.aktif)} PM aktif (${S.pmPeriksa} dari ${S.aktif} PM) memperoleh pemeriksaan dokter, dengan ${_persen(S.baik, S.pmPeriksa || 1)} di antaranya berstatus kesehatan Baik pada pemeriksaan terakhir.`,
    `Keluhan insidental tercatat sebanyak ${S.insN} kejadian pada ${S.insPM} PM; ${_persen(S.insDiperiksa, S.insN || 1)} di antaranya dilanjutkan dengan pemeriksaan dokter dan ${S.insSehatPM} PM tercatat sudah sehat sebelum hari pemeriksaan. ${S.ruj.length ? `Sebanyak ${S.rujPM} PM memerlukan rujukan ke ${escHtml(S.tujuanRuj.join(', ') || 'fasilitas kesehatan lanjutan')}.` : 'Tidak terdapat PM yang memerlukan rujukan.'}`,
    'Dengan demikian, pelayanan kesehatan pada periode ini berjalan sesuai rencana dan seluruh keluhan yang muncul telah memperoleh penanganan.'];
  return _pkBox(P, mulai);
}

// ── Satu analisis untuk seluruh Laporan 005 (ditempatkan pada bagian VI) ──
function _pkAnalisisLaporan005(S, c, mulai) {
  const ambil = fn => _pkAmbilParagraf(fn);
  const ins = ambil(() => _pkAnalisisInsidental(S, c, mulai));
  const lanjut = ambil(() => _pkAnalisisInsLanjutDokter(S, c, mulai));
  const pem = ambil(() => _pkAnalisisPemeriksaan(S, c, mulai));
  const ruj = ambil(() => _pkAnalisisRujukan(S, c, mulai));
  const per = ambil(() => _pkAnalisisPerkembangan(S, c, mulai));
  const P = [].concat(ins.slice(0, 2), lanjut.slice(0, 1), pem.slice(0, 3), ruj, per.slice(-1));
  return _pkBox(P, mulai);
}
// ── Satu analisis untuk seluruh Laporan 008 pendampingan (ditempatkan pada rekap status) ──
function _pkAnalisisLaporan008(S, c, mulai) {
  if (!S.kunj.length && !S.ruj.length) return '';
  const bt = _pkPer(c), P = [];
  const rata = S.kunj.length ? Math.round(S.jmlKunj / S.kunj.length) : 0;
  if (S.kunj.length) {
    const rinci = S.kunj.map(k => `Minggu ${escHtml(k.rom)} tanggal ${k.tgl.getDate()} ${escHtml(bt)} (${k.jmlPM} PM)`).join(', ');
    P.push(`Berdasarkan Laporan Pendampingan Pemeriksaan Kesehatan PM periode ${escHtml(bt)}, pendampingan dilaksanakan pada ${_pkB(S.kunj.length)} kali kunjungan dokter, yaitu ${rinci}${S.ruj.length ? `, ditambah ${S.ruj.length} kegiatan pendampingan rujukan` : ''}. Seluruhnya mencakup ${_pkB(S.jmlKunj)} kunjungan pemeriksaan terhadap ${_pkB(S.pmPeriksa)} PM, dengan rata-rata ${rata} PM pada setiap hari kunjungan.`);
    const dg = _pkTop(S.pem, r => r.diagnosis, 3);
    P.push(`${dg.length ? 'Diagnosis yang paling banyak ditemukan selama pendampingan adalah ' + _pkSebut(dg, 'PM', S.pem.length) + '. ' : ''}Kondisi PM setelah pemeriksaan: ${_pkStatusTeks(S.pem) || '-'}. ${_pkAsramaTeks(S.pem)}`);
    const pasang = S.ins.filter(x => (state.pemeriksaan || []).some(p => p && !p._deleted && p.nomorInduk === x.nomorInduk && new Date(p.tglPeriksa) >= new Date(x.tgl)));
    if (S.ins.length) P.push(`Dalam pendampingan tersebut, ${_pkB(S.insDiperiksa)} dari ${S.ins.length} kejadian keluhan insidental (${_persen(S.insDiperiksa, S.ins.length)}) dilanjutkan dengan pemeriksaan dokter pada kunjungan mingguan${pasang.length ? ', yaitu ' + escHtml([...new Set(pasang.map(x => _pkRp(x.namaPM)))].slice(0, 8).join(', ')) : ''}, sedangkan ${S.insSehatPM} PM tercatat sudah sehat sebelum hari pemeriksaan.`);
  }
  if (S.ruj.length) P.push(...(_pkAmbilParagraf(() => _pkAnalisisRujukan(S, c, mulai))));
  P.push(`Berdasarkan rekapitulasi status kesehatan di bawah, ${S.baik} PM berstatus Baik (${_persen(S.baik, S.pmPeriksa || 1)}), ${S.cukup} PM Cukup Baik (${_persen(S.cukup, S.pmPeriksa || 1)}), dan ${S.tindak} PM memerlukan tindak lanjut (${_persen(S.tindak, S.pmPeriksa || 1)}). Kegiatan pendampingan berjalan tertib dan seluruh hasil pemeriksaan telah dicatat sebagai bahan pemantauan kesehatan PM pada periode berikutnya.`);
  return _pkBox(P, mulai);
}

// ══════════════════════════════════════════════════════════════════
//  PENGHUBUNG: cetak PDF / tampilan biasa memakai analisis khusus yang sama
//  Periode dibaca dari tanggal pada butir data; hanya dipakai bila jumlah
//  catatan hasil hitung sama persis dengan jumlah baris laporan (jika
//  tidak sama, kembali ke analisis umum agar tidak ada angka yang selisih).
// ══════════════════════════════════════════════════════════════════
let _khususSibuk = false;
function _khususKonteks(items, pakaiNama) {
  const tg = items.map(i => i.tgl);
  if (!tg.length || tg.some(t => typeof t !== 'number' || isNaN(t))) return null;
  const a = new Date(Math.min(...tg)), b = new Date(Math.max(...tg));
  const dari = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const sampai = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 23, 59, 59, 999).getTime();
  const sama = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  const c = { dari, sampai, bln: a.getMonth() + 1, tgl: b };
  if (sama) { c.nb = _BULAN_NAMES[a.getMonth() + 1]; c.thn = String(a.getFullYear()); }
  else { c.nb = _tglPanjang(dari) + ' sampai dengan ' + _tglPanjang(b.getTime()); c.thn = ''; }
  c.stokKet = 'per tanggal ' + _tglPanjang(Date.now());
  if (pakaiNama) c.namaSet = new Set(items.map(i => _pkNamaKey(i.nama)).filter(Boolean));
  return c;
}
function _khususAnalisis(label, items, pdf) {
  if (_khususSibuk) return '';
  label = String(label || '');
  let tipe = '';
  if (/yang lanjut periksa dokter/i.test(label)) tipe = 'inslanjut';
  else if (/insidental/i.test(label)) tipe = 'ins';
  else if (/rujukan/i.test(label)) tipe = 'ruj';
  else if (/pemakaian obat/i.test(label)) tipe = 'obat';
  else if (/^pemeriksaan$/i.test(label)) tipe = 'pem';
  if (!tipe || !items || !items.length) return '';
  _khususSibuk = true;
  try {
    const c = _khususKonteks(items, true); if (!c) return '';
    _pkBoxPolos = { pdf: !!pdf };
    const S = _pkStatistik(c);
    const n = items.length;
    if (tipe === 'ins') return S.ins.length === n ? _pkAnalisisInsidental(S, c) : '';
    if (tipe === 'inslanjut') return S.insDiperiksa === n ? _pkAnalisisInsLanjutDokter(S, c) : '';
    if (tipe === 'ruj') return S.ruj.length === n ? _pkAnalisisRujukan(S, c) : '';
    if (tipe === 'pem') return S.pem.length === n ? _pkAnalisisPemeriksaan(S, c) : '';
    if (tipe === 'obat') return _pkObatDaftar(c).length === n ? _pkAnalisisObat(S, c) : '';
    return '';
  } catch (e) { return ''; }
  finally { _pkBoxPolos = null; _khususSibuk = false; }
}
// Analisis stok untuk cetak "Stok Obat" (tanpa kolom nama PM)
function _htmlAnalisisStokCetak(pdf) {
  try {
    const c = { nb: _BULAN_NAMES[new Date().getMonth() + 1], thn: String(new Date().getFullYear()), stokKet: 'per tanggal ' + _tglPanjang(Date.now()) };
    _pkBoxPolos = { pdf: !!pdf };
    return _pkAnalisisStok(c);
  } catch (e) { return ''; } finally { _pkBoxPolos = null; }
}
