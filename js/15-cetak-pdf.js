    // ══════════════════════════════════════
    //  CETAK PDF PER CARD — LAP. KASI
    // ══════════════════════════════════════

    // ── Helper: fetch gambar apapun → base64 data URL ──
    async function fetchImgBase64(url) {
      if (!url) return null;
      url = String(url);
      if (url.startsWith('data:')) return url;           // sudah base64, langsung pakai
      const embedUrl = getDriveEmbedUrl(url);            // konversi Drive URL ke thumbnail
      try {
        const resp = await fetch(embedUrl, { mode: 'cors', credentials: 'omit', cache: 'force-cache' });
        if (!resp.ok) return null;
        const blob = await resp.blob();
        return await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload  = () => res(r.result);
          r.onerror = () => res(null);
          r.readAsDataURL(blob);
        });
      } catch(e) {
        // Fallback: coba embed URL langsung (untuk base64 lokal yang belum diupload)
        return embedUrl;
      }
    }

    // ── Cetak PDF Foto — async: pre-fetch semua gambar ke base64 dulu ──
    // ══════════════════════════════════════
    //  PDF LAPORAN RUJUKAN + FOTO (async)
    //  Dipanggil dari cetakPDFKasiCard('rujukan')
    //  Foto diambil via GAS proxy agar tidak ada masalah CORS
    // ══════════════════════════════════════
    async function cetakPDFRujukanKasi() {
      const BULAN_R = _BULAN_NAMES;
      const bl7 = parseInt((document.getElementById('kasiRujBulan')||{value:'0'}).value||'0');
      const th7 = parseInt((document.getElementById('kasiRujTahun')||{value:'0'}).value||'0');
      const periodeStr7 = (bl7>0 ? BULAN_R[bl7]+' ' : 'Semua Bulan ') + (th7||'');
      const tglStr = new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});

      let list7 = [...(state.rujukan||[])].filter(x=>!x._deleted).sort((a,b)=>new Date(b.tgl)-new Date(a.tgl));
      if (bl7) list7 = list7.filter(x=>x.tgl&&new Date(x.tgl).getMonth()+1===bl7);
      if (th7) list7 = list7.filter(x=>x.tgl&&new Date(x.tgl).getFullYear()===th7);

      if (!list7.length) {
        showToast('Tidak ada data rujukan untuk periode ini', 'info');
        return;
      }

      // ── Helper: ambil base64 via GAS proxy ─────────────────────
      async function _fetchB64Ruj(fileId) {
        if (!fileId || !state.scriptUrl) return null;
        try {
          const url = state.scriptUrl + '?action=getPhotoBase64&fileId=' + encodeURIComponent(fileId);
          const resp = await fetch(url, { cache: 'force-cache' });
          if (!resp.ok) return null;
          const json = await resp.json();
          return (json.ok && json.data) ? json.data : null;
        } catch(e) { return null; }
      }

      // ── Helper: ekstrak fileId dari Drive URL ───────────────────
      function _extractFileId(url) {
        if (!url) return null;
        const m1 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (m1) return m1[1];
        const m2 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (m2) return m2[1];
        return null;
      }

      // ── Helper: resolve foto URL → src yang bisa di-embed ───────
      async function _resolveFotoSrc(url) {
        if (!url) return null;
        if (url.startsWith('data:')) return url;           // sudah base64
        const fileId = _extractFileId(url);
        if (fileId) {
          const b64 = await _fetchB64Ruj(fileId);
          if (b64) return b64;
          // Fallback thumbnail Drive (butuh login Google)
          return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w400';
        }
        return url;
      }

      const adaFoto = list7.some(x => x.foto1 || x.foto2 || x.foto3);
      if (adaFoto) {
        showToast('⏳ Mengambil foto rujukan dari Drive...', 'info');
      }

      // ── Resolve semua foto secara paralel ───────────────────────
      const withPhotos = await Promise.all(list7.map(async (x) => {
        const urls = [x.foto1, x.foto2, x.foto3].filter(Boolean);
        const srcs = await Promise.all(urls.map(u => _resolveFotoSrc(u)));
        return { ...x, _srcs: srcs.filter(Boolean) };
      }));

      // ── Bangun baris tabel ───────────────────────────────────────
      const rows7 = withPhotos.length ? withPhotos.map((x, i) => {
        let buktiCell;
        if (x._srcs.length) {
          buktiCell = x._srcs.map(src =>
            `<img src="${safeUrl(src)}" style="height:85px;max-width:100px;object-fit:cover;border-radius:5px;border:1.5px solid #c39bd3;display:block;margin:2px auto;" onerror="this.style.display='none'">`
          ).join('');
        } else if (x.foto1) {
          buktiCell = '<span style="font-size:8pt;color:#8e44ad;font-weight:600;">Ada<br><span style="color:#aaa;font-weight:400;">(gagal muat)</span></span>';
        } else {
          buktiCell = '<span style="color:#aaa;">-</span>';
        }
        return `<tr style="${i%2?'background:#fafafa':''}">
          <td style="padding:5px 7px;border:1px solid #ddd;text-align:center;font-weight:700;color:#888;">${escHtml(i+1)}</td>
          <td style="padding:5px 7px;border:1px solid #ddd;vertical-align:top;">${escHtml(new Date(x.tgl).toLocaleDateString('id-ID'))}</td>
          <td style="padding:5px 7px;border:1px solid #ddd;font-weight:600;vertical-align:top;">${escHtml(x.namaPM||'-')}</td>
          <td style="padding:5px 7px;border:1px solid #ddd;vertical-align:top;">${escHtml(x.jenis||'-')}</td>
          <td style="padding:5px 7px;border:1px solid #ddd;vertical-align:top;">${escHtml(x.tujuan||'-')}</td>
          <td style="padding:5px 7px;border:1px solid #ddd;vertical-align:top;">${escHtml(x.diagnosis||'-')}</td>
          <td style="padding:5px 7px;border:1px solid #ddd;font-size:8.5pt;vertical-align:top;">${escHtml(x.hasil||'-')}</td>
          <td style="padding:5px 7px;border:1px solid #ddd;text-align:center;vertical-align:top;">${buktiCell}</td>
        </tr>`;
      }).join('') : '<tr><td colspan="8" style="text-align:center;padding:12px;color:#888;">Tidak ada data rujukan</td></tr>';

      const bodyHtml = `
        ${_pdfHeader('LAPORAN DATA RUJUKAN', 'Periode: ' + periodeStr7)}
        <table style="width:100%;border-collapse:collapse;font-size:8.5pt;table-layout:fixed;">
          <colgroup>
            <col style="width:36px"><col style="width:72px"><col style="width:110px">
            <col style="width:65px"><col style="width:90px"><col style="width:110px">
            <col><col style="width:90px">
          </colgroup>
          <thead><tr style="background:#f3e8ff;">
            <th style="padding:5px 7px;border:1px solid #ddd;text-align:center;">No</th>
            <th style="padding:5px 7px;border:1px solid #ddd;">Tanggal</th>
            <th style="padding:5px 7px;border:1px solid #ddd;">Nama PM</th>
            <th style="padding:5px 7px;border:1px solid #ddd;">Jenis</th>
            <th style="padding:5px 7px;border:1px solid #ddd;">Tujuan RS</th>
            <th style="padding:5px 7px;border:1px solid #ddd;">Diagnosis</th>
            <th style="padding:5px 7px;border:1px solid #ddd;">Hasil</th>
            <th style="padding:5px 7px;border:1px solid #ddd;text-align:center;">Bukti Foto</th>
          </tr></thead>
          <tbody>${rows7}</tbody>
        </table>`;

      cetakPDFIsolated(_pdfWrap(bodyHtml, tglStr));
    }

    async function cetakPDFFotoKasi() {
      const BULAN_F = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const blFoto = parseInt((document.getElementById('kasiFotoBulan')||{value:'0'}).value||'0');
      const thFoto = parseInt((document.getElementById('kasiFotoTahun')||{value:'0'}).value||'0');
      const periodeStrFoto = (blFoto>0 ? BULAN_F[blFoto]+' ' : 'Semua Bulan ') + (thFoto||'');

      let listFoto = [...(state.fotoMinggu||[])];
      if (blFoto) listFoto = listFoto.filter(f => Number(f.bulan) === blFoto);
      if (thFoto) listFoto = listFoto.filter(f => Number(f.tahun) === thFoto);

      if (!listFoto.length) {
        showToast('Belum ada foto dokumentasi untuk periode ini', 'info');
        return;
      }

      showToast('⏳ Mengambil foto dari Drive (' + listFoto.length + ' foto)...', 'info');
      // Jendela cetak dibuka SEKARANG (masih dalam klik pengguna). Dulu dibuka setelah semua foto
      // selesai diunduh → browser (terutama di HP) menganggapnya pop-up dan memblokirnya.
      const pw = window.open('', '_blank', 'width=960,height=780');
      if (!pw) { showToast('⚠️ Pop-up diblokir. Izinkan pop-up untuk halaman ini.', 'warning'); return; }
      try { pw.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Memuat foto…</title></head><body style="font-family:Arial,sans-serif;padding:24px;color:#1a6b4a;">⏳ Mengambil ' + escHtml(listFoto.length) + ' foto dari Drive… jendela ini akan terisi otomatis.</body></html>'); } catch (e) {}

      // ── Helper: ambil base64 via GAS proxy ──────────────────────
      // GAS berjalan di server Google sehingga bisa akses Drive
      // langsung — tidak ada masalah CORS sama sekali.
      async function fetchBase64ViaGAS(fileId) {
        if (!fileId || !state.scriptUrl) return null;
        try {
          const url = state.scriptUrl + '?action=getPhotoBase64&fileId=' + encodeURIComponent(fileId);
          const resp = await fetch(url, { cache: 'force-cache' });
          if (!resp.ok) return null;
          const json = await resp.json();
          return (json.ok && json.data) ? json.data : null;
        } catch(e) { return null; }
      }

      // ── Ambil base64 untuk setiap foto ─────────────────────────
      const withSrc = await Promise.all(listFoto.map(async (f, idx) => {
        if (!f.url) return { ...f, src: null };

        // Sudah base64 (belum diupload ke Drive)
        if (f.url.startsWith('data:')) return { ...f, src: f.url };

        // Ekstrak fileId dari URL Drive atau dari field driveFileId
        const fileId = f.driveFileId ||
          (f.url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || [])[1] ||
          (f.url.match(/\/d\/([a-zA-Z0-9_-]+)/) || [])[1];

        // Coba GAS proxy — cara paling andal
        if (fileId) {
          const b64 = await fetchBase64ViaGAS(fileId);
          if (b64) return { ...f, src: b64 };
        }

        // Fallback terakhir: pakai thumbnail URL langsung (mungkin tampil jika user login Google)
        return { ...f, src: getDriveEmbedUrl(f.url), isDriveUrl: true };
      }));

      // ── Hitung statistik hasil fetch ────────────────────────────
      const berhasil = withSrc.filter(f => f.src && !f.isDriveUrl).length;
      const fallback = withSrc.filter(f => f.isDriveUrl).length;
      const gagal    = withSrc.filter(f => !f.src).length;
      if (fallback > 0 && !state.scriptUrl) {
        showToast('⚠️ URL Script belum dikonfigurasi — foto mungkin tidak tampil di PDF', 'warning');
      }

      // ── Group by tanggal periksa ────────────────────────────────
      const groups = {};
      withSrc.sort((a,b) => (a.tglPeriksa||'').localeCompare(b.tglPeriksa||'')).forEach(f => {
        let k = f.tglPeriksa
          ? new Date(f.tglPeriksa).toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric'})
          : (BULAN_F[f.bulan]||String(f.bulan||'')) + ' ' + (f.tahun||'');
        if (!groups[k]) groups[k] = [];
        groups[k].push(f);
      });

      // ── Bangun HTML foto ─────────────────────────────────────────
      let fotoBody = '';
      Object.entries(groups).forEach(([label, fotos]) => {
        fotoBody += '<div style="margin-bottom:22px;page-break-inside:avoid;">' +
          '<div style="font-weight:700;color:#1a6b4a;font-size:10.5pt;margin-bottom:8px;border-bottom:1.5px solid #a9dfbf;padding-bottom:4px;">&#128197; ' + escHtml(label) + '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:12px;">';
        fotos.forEach(f => {
          if (f.src) {
            fotoBody += '<div style="text-align:center;break-inside:avoid;">' +
              '<img src="' + safeUrl(f.src) + '" ' +
              'style="height:150px;width:190px;object-fit:cover;border-radius:6px;border:1.5px solid #a9dfbf;display:block;" ' +
              'onerror="this.outerHTML=\'<div style=&quot;height:150px;width:190px;border:1.5px dashed #f39c12;border-radius:6px;display:flex;align-items:center;justify-content:center;background:#fff9ed;font-size:8pt;color:#e67e22;padding:8px;text-align:center;&quot;>⚠️ Foto gagal dimuat<br>Cek koneksi Drive</div>\'">' +
              '<div style="font-size:8pt;color:#555;margin-top:4px;">' + (escHtml(f.label||('Foto '+(f.slot||'')))) + '</div>' +
              '</div>';
          } else {
            fotoBody += '<div style="text-align:center;break-inside:avoid;">' +
              '<div style="height:150px;width:190px;border:1.5px dashed #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;background:#f9f9f9;font-size:8pt;color:#aaa;">Foto tidak tersedia</div>' +
              '<div style="font-size:8pt;color:#555;margin-top:4px;">' + (escHtml(f.label||('Foto '+(f.slot||'')))) + '</div>' +
              '</div>';
          }
        });
        fotoBody += '</div></div>';
      });

      const tanggalCetak = new Date().toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric'});

      // ── Isi window print (sudah dibuka di awal) ───────────────────
      if (pw.closed) return;
      try { pw.document.open(); } catch (e) {}

      const infoFetch = berhasil + ' foto berhasil dimuat' +
        (fallback ? ', ' + fallback + ' via URL langsung' : '') +
        (gagal ? ', ' + gagal + ' gagal' : '');

      pw.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Dokumentasi Foto Pemeriksaan — ${escHtml(periodeStrFoto)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10.5pt; margin: 0; padding: 12px; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  img { max-width: 100%; display: block; }
  @media print { .no-print { display: none !important; } img { break-inside: avoid; } }
</style>
</head>
<body>
  <div class="no-print" style="background:#1a6b4a;color:white;padding:10px 16px;border-radius:8px;margin-bottom:14px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10;">
    <span style="flex:1;font-size:.85rem;">✅ ${escHtml(infoFetch)} — Klik Cetak PDF setelah semua foto tampil</span>
    <button onclick="window.print()" style="background:white;color:#1a6b4a;border:none;border-radius:6px;padding:7px 18px;font-weight:700;cursor:pointer;font-size:.9rem;">🖨️ Cetak PDF</button>
    <button onclick="window.close()" style="background:rgba(255,255,255,.2);color:white;border:1.5px solid rgba(255,255,255,.4);border-radius:6px;padding:7px 14px;font-weight:600;cursor:pointer;font-size:.9rem;">✕ Tutup</button>
  </div>
  ${renderKopSuratHTML()}
  <div style="text-align:center;margin-bottom:14px;">
    <div style="font-size:12.5pt;font-weight:800;letter-spacing:.5px;">DOKUMENTASI FOTO PEMERIKSAAN MINGGUAN</div>
    <div style="font-size:9pt;color:#555;margin-top:3px;">Periode: <strong>${escHtml(periodeStrFoto)}</strong></div>
    <div style="font-size:8.5pt;color:#888;margin-top:2px;">Dicetak: ${escHtml(tanggalCetak)}</div>
  </div>
  <p style="font-size:9.5pt;line-height:1.7;margin-bottom:14px;text-align:justify;">
    Dokumentasi foto kegiatan pemeriksaan kesehatan Penerima Manfaat (PM) UPT Rehabilitasi Sosial Bina Daksa Pasuruan periode <strong>${escHtml(periodeStrFoto)}</strong>.
  </p>
  ${fotoBody}
</body>
</html>`);
      pw.document.close();
    }

    // ── Cetak PDF Foto dari halaman Rekap ──
    async function cetakPDFFotoRekap() {
      const BULAN_F = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const semuaBulan = document.getElementById('rekapFotoSemuaBulan')?.checked;
      const blFoto = semuaBulan ? 0 : parseInt((document.getElementById('rekapFotoBulan')||{value:'0'}).value||'0');
      const thFoto = parseInt((document.getElementById('rekapFotoTahun')||{value:'0'}).value||'0');
      const periodeStrFoto = (blFoto>0 ? BULAN_F[blFoto]+' ' : 'Semua Bulan ') + (thFoto||'');
      // Sinkron filter ke kasiFotoBulan/Tahun lalu panggil fungsi utama
      const selB = document.getElementById('kasiFotoBulan');
      const selT = document.getElementById('kasiFotoTahun');
      if (selB) selB.value = blFoto ? String(blFoto) : '';
      if (selT) selT.value = thFoto ? String(thFoto) : '';
      cetakPDFFotoKasi();
    }

    function cetakPDFKasiCard(cardId) {
      const now = new Date();
      const tglStr = now.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
      const BULAN = _BULAN_NAMES;

      let judul = '', bodyHtml = '';

      // ── SHARED HEADER ────────────────────
      const hdr = _pdfHeader;

      switch (cardId) {

        // ── 1. RINGKASAN ──────────────────
        case 'ringkasan': {
          const totalPM = state.penerima.length;
          // Baca periode dari filter kasiStat
          const statPeriode = (document.getElementById('kasiStatPeriode')||{value:'bulan'}).value||'bulan';
          const statBulan = parseInt((document.getElementById('kasiStatBulan')||{value:'0'}).value||'0');
          const statTW = parseInt((document.getElementById('kasiStatTriwulan')||{value:'0'}).value||'0');
          const statTahun = parseInt((document.getElementById('kasiStatTahun')||{value:'0'}).value||'0');
          const TW_MONTHS = [[],[1,2,3],[4,5,6],[7,8,9],[10,11,12]];
          let periksaRing = [...state.pemeriksaan];
          if (statTahun) periksaRing = periksaRing.filter(p => new Date(p.tglPeriksa).getFullYear() === statTahun);
          if (statPeriode === 'bulan' && statBulan) periksaRing = periksaRing.filter(p => new Date(p.tglPeriksa).getMonth()+1 === statBulan);
          if (statPeriode === 'triwulan' && statTW) periksaRing = periksaRing.filter(p => TW_MONTHS[statTW].includes(new Date(p.tglPeriksa).getMonth()+1));
          // Insidental & rujukan juga per periode
          let insRing = [...(state.insidental||[])].filter(x=>!x._deleted);
          let rujRing = [...(state.rujukan||[])].filter(x=>!x._deleted);
          if (statTahun) { insRing = insRing.filter(x=>new Date(x.tgl).getFullYear()===statTahun); rujRing = rujRing.filter(x=>new Date(x.tgl).getFullYear()===statTahun); }
          if (statPeriode==='bulan'&&statBulan) { insRing=insRing.filter(x=>new Date(x.tgl).getMonth()+1===statBulan); rujRing=rujRing.filter(x=>new Date(x.tgl).getMonth()+1===statBulan); }
          if (statPeriode==='triwulan'&&statTW) { insRing=insRing.filter(x=>TW_MONTHS[statTW].includes(new Date(x.tgl).getMonth()+1)); rujRing=rujRing.filter(x=>TW_MONTHS[statTW].includes(new Date(x.tgl).getMonth()+1)); }
          // Label periode
          let periodeLabel = '';
          if (statPeriode==='bulan') periodeLabel = (statBulan?BULAN[statBulan]+' ':'')+( statTahun||'');
          else if (statPeriode==='triwulan') periodeLabel = (statTW?'TW '+['','I','II','III','IV'][statTW]+' ':'')+( statTahun||'');
          else periodeLabel = statTahun ? 'Tahun '+statTahun : 'Semua Data';
          const pmDiperiksa = _hitungPMUnik(periksaRing);
          const batas90 = new Date(now - 90*86400000);
          const belumPeriksa = state.penerima.filter(pm => {
            if (!isPMAktif(pm)) return false;
            const last = state.pemeriksaan.filter(p=>p.nomorInduk===pm.nomorInduk).sort((a,b)=>new Date(b.tglPeriksa)-new Date(a.tglPeriksa))[0];
            return !last || new Date(last.tglPeriksa) < batas90;
          }).length;
          const perhatian = periksaRing.filter(p => p.statusKondisi==='Perlu Perhatian'||p.statusKondisi==='Rujuk').length;
          // Cakupan terhadap PM AKTIF (sama dengan layar Laporan Kasi; dulu PM keluar/meninggal ikut
          // dihitung sehingga angka di PDF berbeda dengan di layar)
          const totalAktifRing = state.penerima.filter(isPMAktif).length;
          const cakupan = totalAktifRing > 0 ? Math.min(100, Math.round(pmDiperiksa/totalAktifRing*100)) : 0;
          bodyHtml = `
            ${_pdfHeader('LAPORAN RINGKASAN KESEHATAN PM', 'Periode: ' + periodeLabel + ' — UPT RSBD Pasuruan')}
            <p style="font-size:10pt;line-height:1.7;margin-bottom:12px;text-align:justify;">
              Dengan hormat, bersama laporan ini kami sampaikan rekapitulasi kondisi kesehatan Penerima Manfaat (PM)
              UPT Rehabilitasi Sosial Bina Daksa Pasuruan periode <strong>${escHtml(periodeLabel || 'seluruh periode')}</strong>.
              Laporan ini disusun berdasarkan data pemeriksaan, keluhan insidental, dan kegiatan rujukan yang telah
              dilaksanakan pada periode tersebut sebagai bahan evaluasi dan pengambilan keputusan lebih lanjut.
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:10.5pt;margin-bottom:16px;">
              <tr style="background:#e8f5ef;">
                <td style="padding:10px 14px;border:1px solid #ddd;text-align:center;"><div style="font-size:9pt;color:#555">Total PM</div><div style="font-size:20pt;font-weight:700;color:#1a6b4a">${escHtml(totalPM)}</div></td>
                <td style="padding:10px 14px;border:1px solid #ddd;text-align:center;"><div style="font-size:9pt;color:#555">Diperiksa</div><div style="font-size:20pt;font-weight:700;color:#1a6b4a">${escHtml(pmDiperiksa)}</div></td>
                <td style="padding:10px 14px;border:1px solid #ddd;text-align:center;"><div style="font-size:9pt;color:#555">Cakupan</div><div style="font-size:20pt;font-weight:700;color:#7b2d8b">${escHtml(cakupan)}%</div></td>
                <td style="padding:10px 14px;border:1px solid #ddd;text-align:center;"><div style="font-size:9pt;color:#555">Insidental</div><div style="font-size:20pt;font-weight:700;color:#e67e22">${escHtml(insRing.length)}</div></td>
                <td style="padding:10px 14px;border:1px solid #ddd;text-align:center;"><div style="font-size:9pt;color:#555">Rujukan</div><div style="font-size:20pt;font-weight:700;color:#8e44ad">${escHtml(rujRing.length)}</div></td>
                <td style="padding:10px 14px;border:1px solid #ddd;text-align:center;"><div style="font-size:9pt;color:#555">Belum Periksa &gt;3 Bln</div><div style="font-size:20pt;font-weight:700;color:#c0392b">${escHtml(belumPeriksa)}</div></td>
                <td style="padding:10px 14px;border:1px solid #ddd;text-align:center;"><div style="font-size:9pt;color:#555">Perlu Perhatian</div><div style="font-size:20pt;font-weight:700;color:#c0392b">${escHtml(perhatian)}</div></td>
              </tr>
            </table>
            ${_htmlAnalisis(_analisisNama(periksaRing.map(p => p.namaPM)), 'pemeriksaan', 'kegiatan', true, periksaRing.map(_itemDariRec))}`;
          break;
        }

        // ── 2. 5 PENYAKIT TERBANYAK ──────
        case 'penyakit': {
          const bulan2 = parseInt((document.getElementById('kasiPenyakitBulan')||{}).value||'0');
          const thn2 = parseInt((document.getElementById('kasiPenyakitTahun')||{}).value||'0');
          const periodeStr2 = (bulan2>0 ? BULAN[bulan2]+' ' : 'Semua Bulan ') + (thn2||'');
          let list2 = [...state.pemeriksaan];
          if (bulan2) list2 = list2.filter(p => p.tglPeriksa && new Date(p.tglPeriksa).getMonth()+1===bulan2);
          if (thn2) list2 = list2.filter(p => p.tglPeriksa && new Date(p.tglPeriksa).getFullYear()===thn2);
          const diagMap = {}; list2.forEach(p => { if(p.diagnosis){const k=p.diagnosis.trim(); diagMap[k]=(diagMap[k]||0)+1;} });
          const diagList = Object.entries(diagMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
          const total2 = list2.length;
          const rows2 = diagList.length ? diagList.map(([dx,cnt],i)=>`<tr style="${i%2?'background:#fafafa':''}"><td style="padding:7px 10px;border:1px solid #ddd;text-align:center;">${escHtml(i+1)}</td><td style="padding:7px 10px;border:1px solid #ddd;">${escHtml(dx)}</td><td style="padding:7px 10px;border:1px solid #ddd;text-align:center;font-weight:700;">${escHtml(cnt)}</td><td style="padding:7px 10px;border:1px solid #ddd;text-align:center;">${total2>0?escHtml(Math.round(cnt/total2*100)):0}%</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;padding:12px;">Tidak ada data</td></tr>';
          bodyHtml = `
            ${_pdfHeader('5 PENYAKIT/DIAGNOSA TERBANYAK', 'Periode: ' + periodeStr2)}
            <table style="width:100%;border-collapse:collapse;font-size:10pt;table-layout:fixed;">
              <colgroup>
                <col style="width:38px"><col><col style="width:110px"><col style="width:90px">
              </colgroup>
              <thead><tr style="background:#fdecea;">
                <th style="padding:7px 10px;border:1px solid #ddd;text-align:center;">No</th>
                <th style="padding:7px 10px;border:1px solid #ddd;text-align:left;">Diagnosis / Penyakit</th>
                <th style="padding:7px 10px;border:1px solid #ddd;text-align:center;">Jumlah Kasus</th>
                <th style="padding:7px 10px;border:1px solid #ddd;text-align:center;">% dari Total</th>
              </tr></thead>
              <tbody>${rows2}</tbody>
            </table>`;
          break;
        }

        // ── 3. STATISTIK ASRAMA ──────────
        case 'asrama': {
          const bl3 = parseInt((document.getElementById('kasiBulan')||{}).value||'0');
          const th3 = parseInt((document.getElementById('kasiTahun')||{}).value||'0');
          const periodeStr3 = (bl3>0 ? BULAN[bl3]+' ' : 'Semua Bulan ') + (th3||'');
          const _baku3 = ['ASTRI 1','ASTRI 2','ASTRA 1','ASTRA 2','ASTRA 3','ASTRA 4'];
          // Sama dengan layar: asrama di luar daftar baku ikut, hanya PM AKTIF (cakupan tidak bisa >100%)
          const asramaList3 = _baku3.concat([...new Set(state.penerima.map(p => p.kamarBlok).filter(k => k && _baku3.indexOf(k) === -1))].sort());
          let periksaList3 = [...state.pemeriksaan];
          if (bl3) periksaList3 = periksaList3.filter(p=>p.tglPeriksa&&new Date(p.tglPeriksa).getMonth()+1===bl3);
          if (th3) periksaList3 = periksaList3.filter(p=>p.tglPeriksa&&new Date(p.tglPeriksa).getFullYear()===th3);
          const asramaRows3 = asramaList3.map(asrm=>{
            const pmA=state.penerima.filter(p=>p.kamarBlok===asrm&&isPMAktif(p));
            if(!pmA.length) return '';
            const niA=new Set(pmA.map(p=>p.nomorInduk));
            const periksaA=_hitungPMUnik(periksaList3.filter(p=>niA.has(p.nomorInduk)));
            const pct=Math.round(periksaA/pmA.length*100);
            return `<tr><td style="padding:7px 10px;border:1px solid #ddd;font-weight:600;">${escHtml(asrm)}</td><td style="padding:7px 10px;border:1px solid #ddd;text-align:center;">${escHtml(pmA.length)}</td><td style="padding:7px 10px;border:1px solid #ddd;text-align:center;">${escHtml(periksaA)}</td><td style="padding:7px 10px;border:1px solid #ddd;text-align:center;font-weight:700;color:#1a6b4a;">${escHtml(pct)}%</td></tr>`;
          }).join('');
          bodyHtml = `
            ${_pdfHeader('STATISTIK PEMERIKSAAN PER ASRAMA', 'Periode: ' + periodeStr3)}
            <table style="width:100%;border-collapse:collapse;font-size:10.5pt;table-layout:fixed;">
              <colgroup>
                <col><col style="width:100px"><col style="width:110px"><col style="width:100px">
              </colgroup>
              <thead><tr style="background:#e8f5ef;">
                <th style="padding:7px 10px;border:1px solid #ddd;text-align:left;">Asrama</th>
                <th style="padding:7px 10px;border:1px solid #ddd;text-align:center;">Total PM</th>
                <th style="padding:7px 10px;border:1px solid #ddd;text-align:center;">PM Diperiksa</th>
                <th style="padding:7px 10px;border:1px solid #ddd;text-align:center;">Cakupan</th>
              </tr></thead>
              <tbody>${asramaRows3||'<tr><td colspan="4" style="text-align:center;padding:12px;">Tidak ada data</td></tr>'}</tbody>
            </table>`;
          break;
        }

        // ── 4. PM PERLU PERHATIAN ────────
        case 'perhatian': {
          const perhatianList4 = state.pemeriksaan.filter(p=>p.statusKondisi==='Perlu Perhatian'||p.statusKondisi==='Rujuk').sort((a,b)=>new Date(b.tglPeriksa)-new Date(a.tglPeriksa));
          const rows4 = perhatianList4.length ? perhatianList4.slice(0,30).map((p,i)=>{
            const pm4=state.penerima.find(x=>x.nomorInduk===p.nomorInduk);
            const badgeBg=p.statusKondisi==='Perlu Perhatian'?'#fff3cd':'#fdecea';
            const badgeC=p.statusKondisi==='Perlu Perhatian'?'#856404':'#c0392b';
            return `<tr style="${i%2?'background:#fafafa':''}"><td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-weight:700;color:#888;">${escHtml(i+1)}</td><td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">${escHtml(p.namaPM||'-')}</td><td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${pm4?escHtml(pm4.kamarBlok):'-'}</td><td style="padding:6px 8px;border:1px solid #ddd;font-size:9pt;">${pm4?escHtml(pm4.jenisDis):'-'}</td><td style="padding:6px 8px;border:1px solid #ddd;text-align:center;"><span class="badge-pdf" style="background:${escHtml(badgeBg)};color:${escHtml(badgeC)};">${escHtml(p.statusKondisi)}</span></td><td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-size:9pt;">${p.tglPeriksa?escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')):'-'}</td><td style="padding:6px 8px;border:1px solid #ddd;font-size:9pt;">${escHtml(p.diagnosis||'-')}</td></tr>`;
          }).join('') : '<tr><td colspan="7" style="text-align:center;padding:12px;color:#888;">Tidak ada PM perlu perhatian</td></tr>';
          bodyHtml = `
            ${_pdfHeader('DAFTAR PM STATUS PERLU PERHATIAN / RUJUK', 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan')}
            <table style="width:100%;border-collapse:collapse;font-size:9.5pt;table-layout:fixed;">
              <colgroup>
                <col style="width:32px"><col style="width:140px"><col style="width:62px">
                <col style="width:110px"><col style="width:90px"><col style="width:82px"><col>
              </colgroup>
              <thead><tr style="background:#fdecea;">
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:center;">No</th>
                <th style="padding:6px 8px;border:1px solid #ddd;">Nama PM</th>
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:center;">Asrama</th>
                <th style="padding:6px 8px;border:1px solid #ddd;">Jenis Disabilitas</th>
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:center;">Status</th>
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:center;">Tanggal</th>
                <th style="padding:6px 8px;border:1px solid #ddd;">Diagnosis</th>
              </tr></thead>
              <tbody>${rows4}</tbody>
            </table>`;
          break;
        }

        // ── 5. RIWAYAT PEMERIKSAAN ───────
        case 'riwayat': {
          const bl5 = parseInt((document.getElementById('kasiRiwayatBulan')||{}).value||'0');
          const th5 = parseInt((document.getElementById('kasiRiwayatTahun')||{}).value||'0');
          const q5 = ((document.getElementById('kasiRiwayatSearch')||{}).value||'').toLowerCase();
          const periodeStr5 = (bl5>0 ? BULAN[bl5]+' ' : 'Semua Bulan ') + (th5||'');
          let list5 = [...state.pemeriksaan].sort((a,b)=>new Date(b.tglPeriksa)-new Date(a.tglPeriksa));
          if (q5) list5 = list5.filter(p=>(p.namaPM||'').toLowerCase().includes(q5));
          if (bl5) list5 = list5.filter(p=>p.tglPeriksa&&new Date(p.tglPeriksa).getMonth()+1===bl5);
          if (th5) list5 = list5.filter(p=>p.tglPeriksa&&new Date(p.tglPeriksa).getFullYear()===th5);
          const rows5 = list5.length ? list5.slice(0,100).map((p,i)=>{
            const pm5=state.penerima.find(x=>x.nomorInduk===p.nomorInduk);
            const sc=p.statusKondisi==='Baik'?'#155724':p.statusKondisi==='Cukup Baik'?'#856404':'#721c24';
            const sb=p.statusKondisi==='Baik'?'#d4edda':p.statusKondisi==='Cukup Baik'?'#fff3cd':'#fdecea';
            const obat5=(p.obatDiberikan&&p.obatDiberikan.length)?p.obatDiberikan.map(o=>((o.nama||'')+(o.jumlah?' '+o.jumlah:'')+' '+(escHtml(o.satuan||''))).trim()).join(', '):'-';
            return `<tr style="page-break-inside:avoid;break-inside:avoid;${i%2?'background:#fafafa':''}"><td style="padding:5px 6px;border:1px solid #ddd;text-align:center;font-weight:700;color:#888;">${escHtml(i+1)}</td><td style="padding:5px 6px;border:1px solid #ddd;">${p.tglPeriksa?escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')):'-'}</td><td style="padding:5px 6px;border:1px solid #ddd;font-weight:600;">${escHtml(p.namaPM||'-')}</td><td style="padding:5px 6px;border:1px solid #ddd;text-align:center;">${pm5?escHtml(pm5.kamarBlok):'-'}</td><td style="padding:5px 6px;border:1px solid #ddd;">${escHtml(p.diagnosis||'-')}</td><td style="padding:5px 6px;border:1px solid #ddd;text-align:center;">${escHtml(p.tekananDarah||'-')}</td><td style="padding:5px 6px;border:1px solid #ddd;">${escHtml(p.tindakan||'-')}</td><td style="padding:5px 6px;border:1px solid #ddd;">${escHtml(p.rencana||'-')}</td><td style="padding:5px 6px;border:1px solid #ddd;font-size:8pt;">${escHtml(obat5)}</td><td style="padding:5px 6px;border:1px solid #ddd;text-align:center;"><span class="badge-pdf" style="background:${escHtml(sb)};color:${escHtml(sc)};">${escHtml(p.statusKondisi||'-')}</span></td><td style="padding:5px 6px;border:1px solid #ddd;">${escHtml(p.namaDokter||'-')}</td></tr>`;
          }).join('') : '<tr><td colspan="11" style="text-align:center;padding:12px;color:#888;">Tidak ada data riwayat</td></tr>';
          bodyHtml = `
            ${_pdfHeader('RIWAYAT PEMERIKSAAN KESEHATAN', 'Periode: ' + periodeStr5)}
            <table style="width:100%;border-collapse:collapse;font-size:8.5pt;table-layout:fixed;">
              <colgroup>
                <col style="width:5%"><col style="width:9%"><col style="width:12%"><col style="width:8%">
                <col style="width:13%"><col style="width:7%"><col style="width:10%">
                <col style="width:10%"><col style="width:8%"><col style="width:9%"><col style="width:9%">
              </colgroup>
              <thead><tr style="background:#e8f5ef;">
                <th style="padding:5px 6px;border:1px solid #ddd;text-align:center;">No</th>
                <th style="padding:5px 6px;border:1px solid #ddd;">Tanggal</th>
                <th style="padding:5px 6px;border:1px solid #ddd;">Nama PM</th>
                <th style="padding:5px 6px;border:1px solid #ddd;">Asrama</th>
                <th style="padding:5px 6px;border:1px solid #ddd;">Diagnosa</th>
                <th style="padding:5px 6px;border:1px solid #ddd;">TD</th>
                <th style="padding:5px 6px;border:1px solid #ddd;">Terapi</th>
                <th style="padding:5px 6px;border:1px solid #ddd;">Edukasi</th>
                <th style="padding:5px 6px;border:1px solid #ddd;">Obat</th>
                <th style="padding:5px 6px;border:1px solid #ddd;">Status</th>
                <th style="padding:5px 6px;border:1px solid #ddd;">Dokter</th>
              </tr></thead>
              <tbody>${rows5}</tbody>
            </table>`;
          break;
        }

        // ── 6. INSIDENTAL ────────────────
        case 'insidental': {
          const bl6=parseInt((document.getElementById('kasiInsidentalBulan')||{}).value||'0');
          const th6=parseInt((document.getElementById('kasiInsidentalTahun')||{}).value||'0');
          const periodeStr6=(bl6>0?BULAN[bl6]+' ':'Semua Bulan ')+(th6||'');
          let list6=[...(state.insidental||[])].filter(x=>!x._deleted).sort((a,b)=>new Date(b.tgl)-new Date(a.tgl));
          if(bl6) list6=list6.filter(x=>x.tgl&&new Date(x.tgl).getMonth()+1===bl6);
          if(th6) list6=list6.filter(x=>x.tgl&&new Date(x.tgl).getFullYear()===th6);
          const rows6=list6.length?list6.map((x,i)=>{
            const obat6=(x.obatDiberikan&&x.obatDiberikan.length)?x.obatDiberikan.map(o=>((o.nama||'')+(o.jumlah?' '+o.jumlah:'')+' '+(o.satuan||'')).trim()).join(', '):'-';
            return `<tr style="${i%2?'background:#fafafa':''}"><td style="padding:5px 7px;border:1px solid #ddd;text-align:center;font-weight:700;color:#888;">${escHtml(i+1)}</td><td style="padding:5px 7px;border:1px solid #ddd;">${escHtml(new Date(x.tgl).toLocaleDateString('id-ID'))}</td><td style="padding:5px 7px;border:1px solid #ddd;font-weight:600;">${escHtml(x.namaPM||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;text-align:center;">${escHtml(x.kamarBlok||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;">${escHtml(x.keluhan||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;">${escHtml(x.tindakan||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;font-size:8.5pt;">${escHtml(obat6)}</td><td style="padding:5px 7px;border:1px solid #ddd;">${escHtml(x.petugas||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;text-align:center;">${x.perluRujukan==='ya'?'<span style="color:#c0392b;font-weight:700;">Ya</span>':'Tidak'}</td></tr>`;
          }).join(''):'<tr><td colspan="9" style="text-align:center;padding:12px;color:#888;">Tidak ada keluhan insidental</td></tr>';
          bodyHtml=`
            ${_pdfHeader('LAPORAN KELUHAN INSIDENTAL','Periode: '+periodeStr6)}
            <table style="width:100%;border-collapse:collapse;font-size:8.5pt;table-layout:fixed;">
              <colgroup>
                <col style="width:36px"><col style="width:72px"><col style="width:110px">
                <col style="width:58px"><col><col style="width:80px">
                <col style="width:85px"><col style="width:70px"><col style="width:48px">
              </colgroup>
              <thead><tr style="background:#fef3e8;">
                <th style="padding:5px 7px;border:1px solid #ddd;text-align:center;">No</th>
                <th style="padding:5px 7px;border:1px solid #ddd;">Tanggal</th>
                <th style="padding:5px 7px;border:1px solid #ddd;">Nama PM</th>
                <th style="padding:5px 7px;border:1px solid #ddd;text-align:center;">Asrama</th>
                <th style="padding:5px 7px;border:1px solid #ddd;">Keluhan</th>
                <th style="padding:5px 7px;border:1px solid #ddd;">Tindakan</th>
                <th style="padding:5px 7px;border:1px solid #ddd;">Obat</th>
                <th style="padding:5px 7px;border:1px solid #ddd;">Petugas</th>
                <th style="padding:5px 7px;border:1px solid #ddd;text-align:center;">Rujukan</th>
              </tr></thead>
              <tbody>${rows6}</tbody>
            </table>`;
          break;
        }

        // ── 7. RUJUKAN ───────────────────
        case 'rujukan': {
          // Panggil fungsi async khusus rujukan (perlu fetch foto dari Drive)
          cetakPDFRujukanKasi();
          return;
        }

        // ── 8. ASESMEN AWAL ──────────────
        case 'asesmen': {
          const list8=[...(state.asesmenAwal||[])].sort((a,b)=>new Date(b.tglSimpan||0)-new Date(a.tglSimpan||0));
          const rows8=list8.length?list8.map((a,i)=>{
            const rek=[...(a.rekomendasi||[]),...(a.rekLainCheck&&a.rekLain?[a.rekLain]:[])];
            const dc=a.derajat==='Ringan'?'#155724':a.derajat==='Sedang'?'#856404':'#721c24';
            const db=a.derajat==='Ringan'?'#d4edda':a.derajat==='Sedang'?'#fff3cd':a.derajat?'#fdecea':'#f5f5f5';
            return `<tr style="${i%2?'background:#fafafa':''}"><td style="padding:5px 7px;border:1px solid #ddd;text-align:center;font-weight:700;color:#888;">${escHtml(i+1)}</td><td style="padding:5px 7px;border:1px solid #ddd;font-weight:600;">${escHtml(a.namaPM||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;font-size:8.5pt;">${escHtml(a.anamnesa||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;text-align:center;">${a.usiaOnset?escHtml(a.usiaOnset)+' thn':'-'}</td><td style="padding:5px 7px;border:1px solid #ddd;">${escHtml(a.alatSebelum||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;">${escHtml(a.dxUtama||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;text-align:center;"><span class="badge-pdf" style="background:${escHtml(db)};color:${escHtml(dc)};">${escHtml(a.derajat||'-')}</span></td><td style="padding:5px 7px;border:1px solid #ddd;">${escHtml(a.potensi||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;font-size:8.5pt;">${escHtml(rek.join(', ')||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;">${escHtml(a.namaDokter||'-')}</td></tr>`;
          }).join(''):'<tr><td colspan="10" style="text-align:center;padding:12px;color:#888;">Belum ada asesmen awal</td></tr>';
          bodyHtml=`
            ${_pdfHeader('DAFTAR ASESMEN AWAL PM BARU','UPT Rehabilitasi Sosial Bina Daksa Pasuruan')}
            <table style="width:100%;border-collapse:collapse;font-size:8.5pt;table-layout:fixed;">
              <colgroup>
                <col style="width:36px"><col style="width:110px"><col><col style="width:55px">
                <col style="width:72px"><col style="width:90px"><col style="width:62px">
                <col style="width:70px"><col style="width:85px"><col style="width:80px">
              </colgroup>
              <thead><tr style="background:#e3f0ff;">
                <th style="padding:5px 7px;border:1px solid #ddd;text-align:center;">No</th><th style="padding:5px 7px;border:1px solid #ddd;">Nama PM</th><th style="padding:5px 7px;border:1px solid #ddd;">Anamnesa</th><th style="padding:5px 7px;border:1px solid #ddd;text-align:center;">Usia Terjadi</th><th style="padding:5px 7px;border:1px solid #ddd;">Alat Bantu</th><th style="padding:5px 7px;border:1px solid #ddd;">Dx Utama</th><th style="padding:5px 7px;border:1px solid #ddd;text-align:center;">Derajat</th><th style="padding:5px 7px;border:1px solid #ddd;">Potensi Rehab</th><th style="padding:5px 7px;border:1px solid #ddd;">Rekomendasi</th><th style="padding:5px 7px;border:1px solid #ddd;">Dokter</th>
              </tr></thead>
              <tbody>${rows8}</tbody>
            </table>`;
          break;
        }

        // ── 9. PM BELUM PERIKSA ──────────
        case 'belum': {
          const batas9=new Date(now-90*86400000);
          const list9=state.penerima.filter(pm=>{
            const last=state.pemeriksaan.filter(p=>p.nomorInduk===pm.nomorInduk).sort((a,b)=>new Date(b.tglPeriksa)-new Date(a.tglPeriksa))[0];
            return !last||new Date(last.tglPeriksa)<batas9;
          }).sort((a,b)=>{
            const la=state.pemeriksaan.filter(p=>p.nomorInduk===a.nomorInduk).sort((x,y)=>new Date(y.tglPeriksa)-new Date(x.tglPeriksa))[0];
            const lb=state.pemeriksaan.filter(p=>p.nomorInduk===b.nomorInduk).sort((x,y)=>new Date(y.tglPeriksa)-new Date(x.tglPeriksa))[0];
            if(!la) return -1; if(!lb) return 1;
            return new Date(la.tglPeriksa)-new Date(lb.tglPeriksa);
          });
          const rows9=list9.length?list9.map((pm,i)=>{
            const last9=state.pemeriksaan.filter(p=>p.nomorInduk===pm.nomorInduk).sort((a,b)=>new Date(b.tglPeriksa)-new Date(a.tglPeriksa))[0];
            const hari9=last9?Math.floor((now-new Date(last9.tglPeriksa))/86400000):null;
            const tglStr9=last9?new Date(last9.tglPeriksa).toLocaleDateString('id-ID'):'Belum pernah';
            const badgeC=hari9===null||hari9>90?'#c0392b':'#856404';
            return `<tr style="${i%2?'background:#fafafa':''}"><td style="padding:7px 10px;border:1px solid #ddd;text-align:center;font-weight:700;color:#888;">${escHtml(i+1)}</td><td style="padding:7px 10px;border:1px solid #ddd;font-weight:600;">${escHtml(pm.namaPM)}</td><td style="padding:7px 10px;border:1px solid #ddd;">${escHtml(pm.kamarBlok||'-')}</td><td style="padding:7px 10px;border:1px solid #ddd;">${escHtml(pm.kondisiKronis||'-')}</td><td style="padding:7px 10px;border:1px solid #ddd;">${escHtml(tglStr9)}</td><td style="padding:7px 10px;border:1px solid #ddd;font-weight:700;color:${escHtml(badgeC)};">${hari9===null?'Belum pernah':escHtml(hari9+' hari')}</td></tr>`;
          }).join(''):'<tr><td colspan="6" style="text-align:center;padding:12px;color:#888;">Semua PM sudah diperiksa dalam 3 bulan terakhir</td></tr>';
          bodyHtml=`
            ${_pdfHeader('DAFTAR PM BELUM DIPERIKSA > 3 BULAN','UPT Rehabilitasi Sosial Bina Daksa Pasuruan')}
            <table style="width:100%;border-collapse:collapse;font-size:9.5pt;table-layout:fixed;">
              <colgroup>
                <col style="width:32px"><col style="width:145px"><col style="width:68px">
                <col style="width:120px"><col style="width:90px"><col>
              </colgroup>
              <thead><tr style="background:#fdecea;">
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:center;">No</th><th style="padding:6px 8px;border:1px solid #ddd;">Nama PM</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:center;">Asrama</th><th style="padding:6px 8px;border:1px solid #ddd;">Kondisi Kronis</th><th style="padding:6px 8px;border:1px solid #ddd;">Periksa Terakhir</th><th style="padding:6px 8px;border:1px solid #ddd;">Lama Belum Periksa</th>
              </tr></thead>
              <tbody>${rows9}</tbody>
            </table>`;
          break;
        }

        case 'dataPM': break;

        case 'foto': {
          // Panggil fungsi async khusus foto, lalu return agar switch tidak dilanjutkan
          cetakPDFFotoKasi();
          return;
        }
        case 'insidentalPeriksa': {
          const blIP = parseInt((document.getElementById('kasiInsidentalPeriksa_bulan')||{value:'0'}).value||'0');
          const thIP = parseInt((document.getElementById('kasiInsidentalPeriksa_tahun')||{value:'0'}).value||'0');
          const periodeStrIP = (blIP>0?BULAN[blIP]+' ':'Semua Bulan ')+(thIP||'');
          let insListIP = [...(state.insidental||[])].filter(x=>!x._deleted);
          if (blIP) insListIP = insListIP.filter(x=>x.tgl&&new Date(x.tgl).getMonth()+1===blIP);
          if (thIP) insListIP = insListIP.filter(x=>x.tgl&&new Date(x.tgl).getFullYear()===thIP);
          const rowsIP = [];
          insListIP.forEach(x => {
            const periksa = (state.pemeriksaan||[]).filter(p=>p.nomorInduk===x.nomorInduk&&new Date(p.tglPeriksa)>=new Date(x.tgl)).sort((a,b)=>new Date(a.tglPeriksa)-new Date(b.tglPeriksa));
            if (!periksa.length) return;
            const p = periksa[0];
            const pm = state.penerima.find(r=>r.nomorInduk===x.nomorInduk);
            const sc=p.statusKondisi==='Baik'?'#155724':p.statusKondisi==='Cukup Baik'?'#856404':'#721c24';
            const sb=p.statusKondisi==='Baik'?'#d4edda':p.statusKondisi==='Cukup Baik'?'#fff3cd':'#fdecea';
            rowsIP.push(`<tr><td style="padding:5px 7px;border:1px solid #ddd;text-align:center;font-weight:700;color:#888;">${escHtml(rowsIP.length+1)}</td><td style="padding:5px 7px;border:1px solid #ddd;font-weight:600;">${escHtml(x.namaPM||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;text-align:center;">${pm?escHtml(pm.kamarBlok):'-'}</td><td style="padding:5px 7px;border:1px solid #ddd;">${escHtml(new Date(x.tgl).toLocaleDateString('id-ID'))}</td><td style="padding:5px 7px;border:1px solid #ddd;font-size:9pt;">${escHtml(x.keluhan||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;">${p.tglPeriksa?escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')):'-'}</td><td style="padding:5px 7px;border:1px solid #ddd;font-size:9pt;">${escHtml(p.diagnosis||'-')}</td><td style="padding:5px 7px;border:1px solid #ddd;text-align:center;"><span class="badge-pdf" style="background:${escHtml(sb)};color:${escHtml(sc)};">${escHtml(p.statusKondisi||'-')}</span></td></tr>`);
          });
          bodyHtml = `
            ${_pdfHeader('PM INSIDENTAL YANG LANJUT PEMERIKSAAN DOKTER','Periode: '+periodeStrIP)}
            <table style="width:100%;border-collapse:collapse;font-size:8.5pt;table-layout:fixed;">
              <colgroup>
                <col style="width:36px"><col style="width:110px"><col style="width:58px">
                <col style="width:72px"><col><col style="width:72px">
                <col style="width:90px"><col style="width:78px">
              </colgroup>
              <thead><tr style="background:#e8f5ef;">
                <th style="padding:5px 7px;border:1px solid #ddd;text-align:center;">No</th>
                <th style="padding:5px 7px;border:1px solid #ddd;">Nama PM</th>
                <th style="padding:5px 7px;border:1px solid #ddd;text-align:center;">Asrama</th>
                <th style="padding:5px 7px;border:1px solid #ddd;">Tgl Insidental</th>
                <th style="padding:5px 7px;border:1px solid #ddd;">Keluhan</th>
                <th style="padding:5px 7px;border:1px solid #ddd;">Tgl Periksa</th>
                <th style="padding:5px 7px;border:1px solid #ddd;">Diagnosa</th>
                <th style="padding:5px 7px;border:1px solid #ddd;text-align:center;">Status</th>
              </tr></thead>
              <tbody>${rowsIP.length?rowsIP.join(''):'<tr><td colspan="8" style="text-align:center;padding:12px;color:#888;">Tidak ada data</td></tr>'}</tbody>
            </table>`;
          break;
        }
        default: return;
      }
      // ── 10. DATA PM ──────────────────────────────
      if (cardId === 'dataPM') {
        const q10 = ((document.getElementById('kasiPMSearch')||{}).value||'').toLowerCase();
        const as10 = (document.getElementById('kasiPMAsrama')||{}).value||'';
        let list10 = [...state.penerima].sort((a,b)=>(a.namaPM||'').localeCompare((b.namaPM||''),'id'));
        if (q10) list10 = list10.filter(p=>(p.namaPM||'').toLowerCase().includes(q10)||(p.nomorInduk||'').toLowerCase().includes(q10));
        if (as10) list10 = list10.filter(p=>p.kamarBlok===as10);
        const rows10 = list10.length ? list10.map((pm,i)=>{
          const last10=state.pemeriksaan.filter(p=>p.nomorInduk===pm.nomorInduk).sort((a,b)=>new Date(b.tglPeriksa)-new Date(a.tglPeriksa))[0];
          const tgl10=last10?new Date(last10.tglPeriksa).toLocaleDateString('id-ID'):'-';
          let usia10='-';if(pm.tglLahir){const l=new Date(pm.tglLahir);const n=new Date();let u=n.getFullYear()-l.getFullYear();if(n.getMonth()<l.getMonth()||(n.getMonth()===l.getMonth()&&n.getDate()<l.getDate()))u--;usia10=u+' th';}
          return `<tr style="${i%2?'background:#fafafa':''}"><td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${escHtml(i+1)}</td><td style="padding:5px 8px;border:1px solid #ddd;font-size:8.5pt;font-family:monospace">${escHtml(pm.nomorInduk)}</td><td style="padding:5px 8px;border:1px solid #ddd;font-weight:700">${escHtml(pm.namaPM)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${escHtml(usia10)}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${escHtml(pm.jenisKelamin||'-')}</td><td style="padding:5px 8px;border:1px solid #ddd">${escHtml(pm.jenisDis||'-')}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${escHtml(pm.kamarBlok||'-')}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${escHtml(pm.golDarah||'-')}</td><td style="padding:5px 8px;border:1px solid #ddd;font-size:8.5pt;color:${pm.kondisiKronis&&pm.kondisiKronis!=='-'?'#c0392b':'inherit'}">${escHtml(pm.kondisiKronis||'-')}</td><td style="padding:5px 8px;border:1px solid #ddd;font-size:8.5pt;color:${pm.alergi?'#c0392b':'inherit'}">${escHtml(pm.alergi||'-')}</td><td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${escHtml(tgl10)}</td></tr>`;
        }).join('') : '<tr><td colspan="11" style="text-align:center;padding:12px;color:#888;">Tidak ada data PM</td></tr>';
        bodyHtml=`
          ${_pdfHeader('DAFTAR PENERIMA MANFAAT TERDAFTAR','UPT Rehabilitasi Sosial Bina Daksa Pasuruan'+(as10?' — Asrama '+as10:''))}
          <table style="width:100%;border-collapse:collapse;font-size:8.5pt;table-layout:fixed;">
            <colgroup>
              <col style="width:36px"><col style="width:68px"><col style="width:110px"><col style="width:42px">
              <col style="width:32px"><col style="width:90px"><col style="width:56px"><col style="width:44px">
              <col style="width:90px"><col style="width:70px"><col style="width:75px">
            </colgroup>
            <thead><tr style="background:#e8f5ef;">
              <th style="padding:5px 6px;border:1px solid #ddd;text-align:center">No</th>
              <th style="padding:5px 6px;border:1px solid #ddd">No. Induk</th>
              <th style="padding:5px 6px;border:1px solid #ddd">Nama PM</th>
              <th style="padding:5px 6px;border:1px solid #ddd;text-align:center">Usia</th>
              <th style="padding:5px 6px;border:1px solid #ddd;text-align:center">JK</th>
              <th style="padding:5px 6px;border:1px solid #ddd">Disabilitas</th>
              <th style="padding:5px 6px;border:1px solid #ddd;text-align:center">Asrama</th>
              <th style="padding:5px 6px;border:1px solid #ddd;text-align:center">Gol. Darah</th>
              <th style="padding:5px 6px;border:1px solid #ddd">Kondisi Kronis</th>
              <th style="padding:5px 6px;border:1px solid #ddd">Alergi</th>
              <th style="padding:5px 6px;border:1px solid #ddd">Periksa Terakhir</th>
            </tr></thead>
            <tbody>${rows10}</tbody>
          </table>`;
        cetakPDFIsolated(_pdfWrap(bodyHtml, tglStr));
        return;
      }

      cetakPDFIsolated(_pdfWrap(bodyHtml, tglStr));
    }

    // ══════════════════════════════════════
    //  PDF SHARED HELPERS
    // ══════════════════════════════════════

    const _BULAN_NAMES = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

    // Kop resmi (sama dengan Word) + judul laporan. Dipanggil di awal isi setiap laporan.
    function _pdfHeader(judul, subjudul) {
      const tglCetak = new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'});
      return `${renderKopSuratHTML()}
      <div style="text-align:center;margin:0 0 12px;">
        <div data-judul="${escHtml(judul)}" style="font-size:12.5pt;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#000;">${escHtml(judul)}</div>
        ${subjudul ? `<div style="font-size:9.5pt;color:#444;margin-top:3px;">${escHtml(subjudul)}</div>` : ''}
        <div style="font-size:8.5pt;color:#666;margin-top:4px;font-style:italic;">Dicetak pada: ${escHtml(tglCetak)} — SIMKEDA UPT RSBD Pasuruan</div>
      </div>`;
    }

    function _pdfTTD(tglStr) {
      const tgl = tglStr || new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
      const lastTTDDokter = (state.ttdDokterBase64 && state.ttdDokterBase64.length > 10) ? state.ttdDokterBase64 : null;
      const lastTTDKasi = (state.ttdKasiBase64 && state.ttdKasiBase64.length > 10) ? state.ttdKasiBase64 : null;
      const lastTTDPetugas = (state.ttdPetugasBase64 && state.ttdPetugasBase64.length > 10) ? state.ttdPetugasBase64 : null;
      const namaPetugasCetak = state.petugasCetak || state.namaPetugas || '(................................)';
      return `<div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:24px;padding-top:12px;border-top:1.5px solid #ccc;page-break-inside:avoid;break-inside:avoid;">
        <div style="text-align:center;flex:1;min-width:140px;">
          <div style="font-size:10pt;">Mengetahui,</div>
          <div style="font-size:10pt;font-weight:700;color:#1a6b4a;">Kepala Seksi Pelayanan Sosial</div>
          <div style="font-size:9pt;color:#555;">UPT RSBD Pasuruan</div>
          ${lastTTDKasi ? '<img src="' + safeUrl(lastTTDKasi) + '" style="height:48px;max-width:130px;object-fit:contain;display:block;margin:0 auto;" onerror="this.remove()">' : '<div style="height:48px;"></div>'}
          <div style="border-top:1px solid #999;padding-top:5px;">
            <div style="font-size:10pt;font-weight:700;">${escHtml(state.namaKasi) || '(................................)'}</div>
            <div style="font-size:9pt;color:#777;">NIP. 197804182011011006</div>
          </div>
        </div>
        <div style="text-align:center;flex:1;min-width:140px;">
          <div style="font-size:10pt;">Pasuruan, ${escHtml(tgl)}</div>
          <div style="font-size:10pt;font-weight:700;color:#1a6b4a;">Pengelola Layanan Kesehatan</div>
          <div style="font-size:9pt;color:#555;">(Petugas)</div>
          ${lastTTDPetugas ? '<img src="' + safeUrl(lastTTDPetugas) + '" style="height:48px;max-width:130px;object-fit:contain;display:block;margin:0 auto;" onerror="this.remove()">' : '<div style="height:48px;"></div>'}
          <div style="border-top:1px solid #999;padding-top:5px;">
            <div style="font-size:10pt;font-weight:700;">${escHtml(namaPetugasCetak)}</div>
            <div style="font-size:9pt;color:#777;">NIP. 200105102025042007</div>
          </div>
        </div>
        <div style="text-align:center;flex:1;min-width:140px;">
          <div style="font-size:10pt;">Pemeriksa,</div>
          <div style="font-size:10pt;font-weight:700;color:#1a6b4a;">Dokter Pemeriksa</div>
          <div style="font-size:9pt;color:#555;">&nbsp;</div>
          ${lastTTDDokter ? '<img src="' + safeUrl(lastTTDDokter) + '" style="height:48px;max-width:130px;object-fit:contain;display:block;margin:0 auto;" onerror="this.remove()">' : '<div style="height:48px;"></div>'}
          <div style="border-top:1px solid #999;padding-top:5px;">
            <div style="font-size:10pt;font-weight:700;">${escHtml(state.defaultDokter || '(................................)')}</div>
            <div style="font-size:9pt;color:#777;">Dokter</div>
          </div>
        </div>
      </div>`;
    }

    function _pdfWrap(bodyHtml, tglStr) {
      return `<div style="font-family:Arial,sans-serif;font-size:10.5pt;color:#222;max-width:800px;margin:0 auto;">
        <style>
          table{border-collapse:collapse;width:100%;table-layout:fixed;}
          th,td{border:1px solid #ccc;padding:5px 7px;word-wrap:break-word;overflow-wrap:break-word;overflow:hidden;vertical-align:middle;}
          th{background:#e8f5ef;color:#1a6b4a;font-size:8.5pt;text-align:left;vertical-align:middle;}
          .badge-pdf{display:inline-block;padding:2px 6px;border-radius:6px;font-size:8pt;font-weight:700;white-space:normal;word-break:break-word;max-width:100%;box-sizing:border-box;line-height:1.4;text-align:center;}
          .ttd-block{page-break-inside:avoid;break-inside:avoid;}
          thead{display:table-header-group;}
          tbody tr{page-break-inside:avoid;break-inside:avoid;}
          @media print{
            @page{margin:1.5cm 1cm;}
            thead{display:table-header-group;}
            tbody tr{page-break-inside:avoid;break-inside:avoid;}
            table{page-break-inside:auto;}
          }
        </style>
        <div style="padding:6px 8px;">
          ${String(bodyHtml).indexOf('data-kop-surat') === -1 ? renderKopSuratHTML() : ''}
          ${_sisipAnalisisPDF(bodyHtml)}
          <div class="ttd-block">${_pdfTTD(tglStr)}</div>
        </div>
      </div>`;
    }

    function cetakLaporanKasiSemua() {
      const BULAN = _BULAN_NAMES;
      const now = new Date();
      const tglStr = now.toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'});

      // Baca periode dari filter aktif kasi
      const statBulan = parseInt((document.getElementById('kasiStatBulan')||{value:'0'}).value||'0');
      const statTahun = parseInt((document.getElementById('kasiStatTahun')||{value:'0'}).value||now.getFullYear());
      const periodeLabel = (statBulan ? BULAN[statBulan]+' ' : '') + (statTahun || '');

      // Kumpulkan semua data
      let periksaList = [...state.pemeriksaan];
      let insList = [...(state.insidental||[])].filter(x=>!x._deleted);
      let rujList = [...(state.rujukan||[])].filter(x=>!x._deleted);
      if (statTahun) {
        periksaList = periksaList.filter(p=>new Date(p.tglPeriksa).getFullYear()===statTahun);
        insList = insList.filter(x=>new Date(x.tgl).getFullYear()===statTahun);
        rujList = rujList.filter(x=>new Date(x.tgl).getFullYear()===statTahun);
      }
      if (statBulan) {
        periksaList = periksaList.filter(p=>new Date(p.tglPeriksa).getMonth()+1===statBulan);
        insList = insList.filter(x=>new Date(x.tgl).getMonth()+1===statBulan);
        rujList = rujList.filter(x=>new Date(x.tgl).getMonth()+1===statBulan);
      }
      periksaList.sort((a,b)=>new Date(a.tglPeriksa)-new Date(b.tglPeriksa));
      insList.sort((a,b)=>new Date(a.tgl)-new Date(b.tgl));
      rujList.sort((a,b)=>new Date(a.tgl)-new Date(b.tgl));

      const totalPM = state.penerima.length;
      const pmDiperiksa = _hitungPMUnik(periksaList);
      const cakupan = totalPM>0?Math.round(pmDiperiksa/totalPM*100):0;
      const perhatian = periksaList.filter(p=>p.statusKondisi==='Perlu Perhatian'||p.statusKondisi==='Rujuk').length;
      const batas90 = new Date(now-90*86400000);
      const belumPeriksa = state.penerima.filter(pm=>{
        if (!isPMAktif(pm)) return false;
        const last = state.pemeriksaan.filter(p=>p.nomorInduk===pm.nomorInduk).sort((a,b)=>new Date(b.tglPeriksa)-new Date(a.tglPeriksa))[0];
        return !last||new Date(last.tglPeriksa)<batas90;
      }).length;

      // Helper tabel pemeriksaan
      const rowsPeriksa = periksaList.map((p,i)=>{
        const bc = p.statusKondisi==='Baik'?'#155724':p.statusKondisi==='Cukup Baik'?'#856404':'#721c24';
        const pm = state.penerima.find(x=>x.nomorInduk===p.nomorInduk);
        return `<tr style="${i%2?'background:#fafafa':''}">
          <td style="text-align:center;">${escHtml(i+1)}</td>
          <td>${p.tglPeriksa?escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')):'-'}</td>
          <td><strong>${escHtml(p.namaPM||'-')}</strong></td>
          <td>${pm?escHtml(pm.kamarBlok):'-'}</td>
          <td>${escHtml(p.diagnosis||'-')}</td>
          <td style="font-family:monospace">${escHtml(p.tekananDarah||'-')}</td>
          <td>${escHtml(p.tindakan||'-')}</td>
          <td style="color:${escHtml(bc)};font-weight:700">${escHtml(p.statusKondisi||'-')}</td>
          <td>${escHtml(p.namaDokter||'-')}</td>
        </tr>`;
      }).join('');

      const rowsIns = insList.map((x,i)=>`<tr style="${i%2?'background:#fafafa':''}">
        <td style="text-align:center;">${escHtml(i+1)}</td>
        <td>${x.tgl?escHtml(new Date(x.tgl).toLocaleDateString('id-ID')):'-'}</td>
        <td><strong>${escHtml(x.namaPM||'-')}</strong></td>
        <td>${escHtml(x.kamarBlok||'-')}</td>
        <td>${escHtml(x.keluhan||'-')}</td>
        <td>${escHtml(x.status||'-')}</td>
        <td>${x.perluRujukan==='ya'?'Ya':'Tidak'}</td>
        <td>${escHtml(x.petugas||'-')}</td>
      </tr>`).join('');

      const rowsRuj = rujList.map((x,i)=>`<tr style="${i%2?'background:#fafafa':''}">
        <td style="text-align:center;">${escHtml(i+1)}</td>
        <td>${x.tgl?escHtml(new Date(x.tgl).toLocaleDateString('id-ID')):'-'}</td>
        <td><strong>${escHtml(x.namaPM||'-')}</strong></td>
        <td>${escHtml(x.jenis||'-')}</td>
        <td>${escHtml(x.tujuan||'-')}</td>
        <td>${escHtml(x.diagnosis||'-')}</td>
        <td style="word-wrap:break-word;max-width:140px;">${escHtml(x.hasil||'-')}</td>
        <td>${escHtml(x.petugas||'-')}</td>
      </tr>`).join('');

      // PM Insidental yang lanjut periksa dokter
      const insPeriksa = [];
      insList.forEach(x => {
        const periksa = (state.pemeriksaan||[]).filter(p =>
          p.nomorInduk === x.nomorInduk && new Date(p.tglPeriksa) >= new Date(x.tgl)
        ).sort((a,b)=>new Date(a.tglPeriksa)-new Date(b.tglPeriksa));
        if (!periksa.length) return;
        const p = periksa[0];
        const pm = state.penerima.find(r=>r.nomorInduk===x.nomorInduk);
        insPeriksa.push({x, p, pm});
      });
      const rowsInsPeriksa = insPeriksa.map(({x,p,pm},i)=>`<tr style="${i%2?'background:#fafafa':''}">
        <td style="text-align:center;">${escHtml(i+1)}</td>
        <td><strong>${escHtml(x.namaPM||'-')}</strong></td>
        <td>${pm?escHtml(pm.kamarBlok):'-'}</td>
        <td>${x.tgl?escHtml(new Date(x.tgl).toLocaleDateString('id-ID')):'-'}</td>
        <td style="max-width:150px">${escHtml(x.keluhan||'-')}</td>
        <td>${p.tglPeriksa?escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')):'-'}</td>
        <td>${escHtml(p.diagnosis||'-')}</td>
        <td style="font-weight:600;color:${p.statusKondisi==='Baik'?'#155724':p.statusKondisi==='Cukup Baik'?'#856404':'#721c24'}">${escHtml(p.statusKondisi||'-')}</td>
      </tr>`).join('');

      // Foto dokumentasi
      const fotoAll = (state.fotoMinggu||[]).filter(f => {
        if (statTahun && f.tahun !== statTahun) return false;
        if (statBulan && f.bulan !== statBulan) return false;
        return true;
      }).sort((a,b)=>(a.tglPeriksa||'').localeCompare(b.tglPeriksa||''));
      const fotoGroups = {};
      fotoAll.forEach(f => {
        const k = f.tglPeriksa
          ? new Date(f.tglPeriksa).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
          : (f.label||'Foto');
        if (!fotoGroups[k]) fotoGroups[k]=[];
        fotoGroups[k].push(f);
      });
      let fotoHtml = '';
      Object.entries(fotoGroups).forEach(([tgl,fotos])=>{
        fotoHtml += `<div style="margin-bottom:10px;"><div style="font-weight:600;font-size:9.5pt;color:#1a6b4a;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">📅 ${escHtml(tgl)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${fotos.map(f=>`<div style="text-align:center;"><img src="${safeUrl(f.url)}" style="height:110px;width:140px;object-fit:cover;border-radius:6px;border:1px solid #ccc;" onerror="this.style.display='none'"><div style="font-size:7.5pt;color:#777;">Foto ${escHtml(f.slot||'')}</div></div>`).join('')}
          </div></div>`;
      });

      // Diagnosa terbanyak
      const diagMap={};
      periksaList.forEach(p=>{if(p.diagnosis){const k=p.diagnosis.trim();diagMap[k]=(diagMap[k]||0)+1;}});
      const diagList=Object.entries(diagMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
      const rowsDiag=diagList.map(([dx,cnt],i)=>`<tr style="${i%2?'background:#fafafa':''}">
        <td style="text-align:center;">${escHtml(i+1)}</td><td>${escHtml(dx)}</td>
        <td style="text-align:center;font-weight:700">${escHtml(cnt)}</td>
        <td style="text-align:center">${periksaList.length>0?escHtml(Math.round(cnt/periksaList.length*100)):0}%</td>
      </tr>`).join('');

      const body = `
        ${_pdfHeader('LAPORAN KESEHATAN PENERIMA MANFAAT', 'Periode: '+periodeLabel+' — UPT Rehabilitasi Sosial Bina Daksa Pasuruan')}

        <p style="font-size:10pt;line-height:1.8;text-align:justify;margin-bottom:14px;">
          Dengan hormat, bersama laporan ini kami sampaikan rekapitulasi pelayanan kesehatan Penerima Manfaat (PM)
          UPT Rehabilitasi Sosial Bina Daksa Pasuruan periode <strong>${escHtml(periodeLabel||'seluruh periode')}</strong>.
          Laporan ini mencakup kegiatan pemeriksaan mingguan, keluhan insidental, kegiatan rujukan, serta kondisi
          kesehatan PM secara keseluruhan sebagai bahan monitoring dan evaluasi.
        </p>

        <!-- RINGKASAN STATISTIK -->
        <div style="font-size:11pt;font-weight:700;color:#1a6b4a;margin:14px 0 8px;border-left:4px solid #1a6b4a;padding-left:8px;">I. RINGKASAN STATISTIK</div>
        <table style="margin-bottom:14px;">
          <thead><tr>
            <th>Total PM</th><th>PM Diperiksa</th><th>Cakupan (%)</th>
            <th>Insidental</th><th>Rujukan</th><th>Belum Periksa &gt;3bln</th><th>Perlu Perhatian</th>
          </tr></thead>
          <tbody><tr style="text-align:center;font-size:13pt;font-weight:700;">
            <td style="color:#1a6b4a">${escHtml(totalPM)}</td>
            <td style="color:#1a6b4a">${escHtml(pmDiperiksa)}</td>
            <td style="color:#7b2d8b">${escHtml(cakupan)}%</td>
            <td style="color:#e67e22">${escHtml(insList.length)}</td>
            <td style="color:#8e44ad">${escHtml(rujList.length)}</td>
            <td style="color:#c0392b">${escHtml(belumPeriksa)}</td>
            <td style="color:#c0392b">${escHtml(perhatian)}</td>
          </tr></tbody>
        </table>
        ${_htmlAnalisis(_analisisNama(periksaList.map(p => p.namaPM)), 'pemeriksaan', 'kegiatan', true, periksaList.map(_itemDariRec))}

        <!-- 5 DIAGNOSA TERBANYAK -->
        <div style="font-size:11pt;font-weight:700;color:#1a6b4a;margin:14px 0 8px;border-left:4px solid #1a6b4a;padding-left:8px;">II. 5 DIAGNOSA/PENYAKIT TERBANYAK</div>
        <table style="margin-bottom:14px;">
          <thead><tr><th>No</th><th>Diagnosis / Penyakit</th><th>Jumlah Kasus</th><th>Persentase</th></tr></thead>
          <tbody>${rowsDiag||'<tr><td colspan="4" style="text-align:center">Tidak ada data</td></tr>'}</tbody>
        </table>

        <!-- RIWAYAT PEMERIKSAAN -->
        <div style="font-size:11pt;font-weight:700;color:#1a6b4a;margin:14px 0 8px;border-left:4px solid #1a6b4a;padding-left:8px;page-break-before:auto;">III. RIWAYAT PEMERIKSAAN MINGGUAN</div>
        <table style="margin-bottom:14px;font-size:9pt;">
          <thead><tr><th>No</th><th>Tanggal</th><th>Nama PM</th><th>Asrama</th><th>Diagnosa</th><th>TD</th><th>Tindakan</th><th>Status</th><th>Dokter</th></tr></thead>
          <tbody>${rowsPeriksa||'<tr><td colspan="9" style="text-align:center">Tidak ada data</td></tr>'}</tbody>
        </table>

        <!-- INSIDENTAL -->
        <div style="font-size:11pt;font-weight:700;color:#e67e22;margin:14px 0 8px;border-left:4px solid #e67e22;padding-left:8px;page-break-before:auto;">IV. LAPORAN KELUHAN INSIDENTAL</div>
        <table style="margin-bottom:14px;font-size:9pt;">
          <thead><tr style="background:#fdecea!important;"><th>No</th><th>Tanggal</th><th>Nama PM</th><th>Asrama</th><th>Keluhan</th><th>Status</th><th>Rujukan</th><th>Petugas</th></tr></thead>
          <tbody>${rowsIns||'<tr><td colspan="8" style="text-align:center">Tidak ada data</td></tr>'}</tbody>
        </table>

        <!-- RUJUKAN -->
        <div style="font-size:11pt;font-weight:700;color:#8e44ad;margin:14px 0 8px;border-left:4px solid #8e44ad;padding-left:8px;page-break-before:auto;">V. LAPORAN KEGIATAN RUJUKAN</div>
        <table style="margin-bottom:14px;font-size:9pt;">
          <thead><tr style="background:#f4e6f7!important;"><th>No</th><th>Tanggal</th><th>Nama PM</th><th>Jenis</th><th>Tujuan</th><th>Diagnosa</th><th>Hasil</th><th>Petugas</th></tr></thead>
          <tbody>${rowsRuj||'<tr><td colspan="8" style="text-align:center">Tidak ada data</td></tr>'}</tbody>
        </table>

        <!-- INSIDENTAL LANJUT PERIKSA -->
        <div style="font-size:11pt;font-weight:700;color:#27ae60;margin:14px 0 8px;border-left:4px solid #27ae60;padding-left:8px;page-break-before:auto;">VI. PM INSIDENTAL YANG MENGIKUTI PEMERIKSAAN DOKTER</div>
        <p style="font-size:9pt;color:#555;margin-bottom:6px;">Daftar PM yang awalnya datang dengan keluhan insidental kemudian ditindaklanjuti dengan pemeriksaan oleh dokter.</p>
        <table style="margin-bottom:14px;font-size:9pt;">
          <thead><tr style="background:#e8f5ef!important;"><th>No</th><th>Nama PM</th><th>Asrama</th><th>Tgl Insidental</th><th>Keluhan</th><th>Tgl Periksa Dokter</th><th>Diagnosa Dokter</th><th>Status</th></tr></thead>
          <tbody>${rowsInsPeriksa||'<tr><td colspan="8" style="text-align:center">Tidak ada data</td></tr>'}</tbody>
        </table>

        <!-- DOKUMENTASI FOTO -->
        ${fotoHtml ? `<div style="font-size:11pt;font-weight:700;color:#1a6b4a;margin:14px 0 8px;border-left:4px solid #1a6b4a;padding-left:8px;page-break-before:auto;">VII. DOKUMENTASI FOTO PEMERIKSAAN</div>
        <div style="margin-bottom:14px;">${fotoHtml}</div>` : ''}

        <p style="font-size:9.5pt;margin-top:10px;color:#555;font-style:italic;">
          Demikian laporan ini kami sampaikan sebagai bahan pertimbangan dan evaluasi lebih lanjut.
          Atas perhatian dan arahan Bapak/Ibu, kami ucapkan terima kasih.
        </p>`;

      const html = `<div style="font-family:Arial,sans-serif;font-size:10.5pt;color:#222;max-width:800px;margin:0 auto;padding:18px 22px;">
        <style>
          table{border-collapse:collapse;width:100%;table-layout:fixed;}
          th,td{border:1px solid #ccc;padding:5px 7px;font-size:9pt;word-wrap:break-word;overflow-wrap:break-word;overflow:hidden;vertical-align:middle;}
          th{background:#e8f5ef;color:#1a6b4a;font-weight:700;vertical-align:middle;}
          .badge-pdf{display:inline-block;padding:2px 6px;border-radius:6px;font-size:8pt;font-weight:700;white-space:normal;word-break:break-word;max-width:100%;box-sizing:border-box;text-align:center;}
          .ttd-block{page-break-inside:avoid;break-inside:avoid;}
          @media print{
            @page{margin:1.5cm 1cm;}
            .ttd-block{page-break-inside:avoid;break-inside:avoid;}
            h2,h3{page-break-after:avoid;}
            table{page-break-inside:auto;}
            tr{page-break-inside:avoid;}
          }
        </style>
        ${_sisipAnalisisPDF(body)}
        <div class="ttd-block">${_pdfTTD(tglStr)}</div>
      </div>`;

      printKartuIsolated(html);
    }

    function cetakPDFIsolated(html) {
      printKartuIsolated(html);
    }

    function renderKasiRujukanFull() {
      const tbody = document.getElementById('kasiRujukanBody');
      if (!tbody) return;
      const filterBulan = parseInt((document.getElementById('kasiRujBulan') || {}).value || '0');
      const filterTahun = parseInt((document.getElementById('kasiRujTahun') || {}).value || '0');
      let list = [...(state.rujukan || [])].filter(x => !x._deleted).sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
      if (filterBulan) list = list.filter(x => x.tgl && new Date(x.tgl).getMonth() + 1 === filterBulan);
      if (filterTahun) list = list.filter(x => x.tgl && new Date(x.tgl).getFullYear() === filterTahun);
      const _pgKasiRuj = document.getElementById('kasiRujukanPagination');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:1.5rem">Belum ada data rujukan</td></tr>'; if (_pgKasiRuj) _pgKasiRuj.innerHTML=''; return; }
      list = _fltTbl('kasiRujukan', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppKasiRuj = 100;
      const _totalPagesKasiRuj = Math.max(1, Math.ceil(list.length / _ppKasiRuj));
      if (_pageState.kasiRujukan > _totalPagesKasiRuj) _pageState.kasiRujukan = _totalPagesKasiRuj;
      const _startKasiRuj = (_pageState.kasiRujukan - 1) * _ppKasiRuj;
      tbody.innerHTML = '';
      list.slice(_startKasiRuj, _startKasiRuj + _ppKasiRuj).forEach((x, _idx) => {
        const idx = _startKasiRuj + _idx;
        const tr = document.createElement('tr');
        const fotoLinks = [x.foto1, x.foto2, x.foto3].filter(Boolean).map((f, i) =>
          String(f).startsWith('data:') ? '<img src="' + safeUrl(f) + '" style="height:36px;width:48px;object-fit:cover;border-radius:4px;">'
          : '<a href="' + safeUrl(f) + '" target="_blank" style="font-size:.75rem;color:#8e44ad;">📎' + (escHtml(i + 1)) + '</a>'
        ).join(' ');
        tr.innerHTML =
          '<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">' + (escHtml(idx+1)) + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(new Date(x.tgl).toLocaleDateString('id-ID')) + '</td>' +
          '<td><strong>' + (escHtml(x.namaPM || '-')) + '</strong></td>' +
          '<td style="font-size:.8rem">' + (escHtml(x.jenis || '-')) + '</td>' +
          '<td style="font-size:.8rem">' + (escHtml(x.tujuan || '-')) + '</td>' +
          '<td style="font-size:.8rem;max-width:100px">' + (escHtml(x.diagnosis || '-')) + '</td>' +
          '<td style="font-size:.8rem;max-width:100px">' + escHtml(String(x.hasil || '-').substring(0, 50)) + (x.hasil && String(x.hasil).length > 50 ? '...' : '') + '</td>' +
          '<td style="text-align:center;">' + badgeStatusRujukan(x) + '</td>' +
          '<td>' + (fotoLinks || '-') + '</td>';
        const bLihat = document.createElement('button');
        bLihat.className = 'btn btn-ghost btn-sm'; bLihat.textContent = '👁'; bLihat.title = 'Lihat Detail';
        bLihat.onclick = () => lihatDetailRujukan(x.id);
        const tdAksi = document.createElement('td'); tdAksi.style.whiteSpace = 'nowrap';
        tdAksi.appendChild(bLihat); tr.appendChild(tdAksi);
        tbody.appendChild(tr);
      });
      _renderPaginationControls('kasiRujukanPagination', 'kasiRujukan', list.length, _ppKasiRuj, 'renderKasiRujukanFull');
    }
