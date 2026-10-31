    // ══════════════════════════════════════
    //  GRAFIK PEMERIKSAAN TRIWULAN
    // ══════════════════════════════════════
    function _buildGrafikHTML(tahun, mode, compact) {
      // mode: 'triwulan' (default) or 'bulan'
      const isBulan = mode === 'bulan';
      const periods = isBulan ? [
        {label:'Jan',sub:'',months:[1]},{label:'Feb',sub:'',months:[2]},{label:'Mar',sub:'',months:[3]},
        {label:'Apr',sub:'',months:[4]},{label:'Mei',sub:'',months:[5]},{label:'Jun',sub:'',months:[6]},
        {label:'Jul',sub:'',months:[7]},{label:'Agu',sub:'',months:[8]},{label:'Sep',sub:'',months:[9]},
        {label:'Okt',sub:'',months:[10]},{label:'Nov',sub:'',months:[11]},{label:'Des',sub:'',months:[12]}
      ] : [
        { label: 'TW I',  sub: 'Jan–Mar', months: [1,2,3] },
        { label: 'TW II', sub: 'Apr–Jun', months: [4,5,6] },
        { label: 'TW III',sub: 'Jul–Sep', months: [7,8,9] },
        { label: 'TW IV', sub: 'Okt–Des', months: [10,11,12] }
      ];
      const nPeriods = periods.length;
      // 3 series: Pemeriksaan, Insidental, Rujukan
      const series = [
        { key: 'periksa',    label: 'Pemeriksaan', color: '#1a6b4a', data: [] },
        { key: 'insidental', label: 'Insidental',  color: '#e67e22', data: [] },
        { key: 'rujukan',    label: 'Rujukan',     color: '#8e44ad', data: [] }
      ];
      periods.forEach(q => {
        const inMonth = (tgl) => {
          const d = new Date(tgl);
          return d.getFullYear() === tahun && q.months.includes(d.getMonth()+1);
        };
        series[0].data.push(state.pemeriksaan.filter(p => inMonth(p.tglPeriksa)).length);
        series[1].data.push((state.insidental||[]).filter(x => !x._deleted && inMonth(x.tgl)).length);
        series[2].data.push((state.rujukan||[]).filter(x => !x._deleted && inMonth(x.tgl)).length);
      });

      const maxVal = Math.max(...series.flatMap(s=>s.data), 1);
      const nSeries = 3;
      const grpW  = isBulan ? (compact ? 28 : 42)  : (compact ? 72 : 110);
      const gap   = isBulan ? (compact ? 6  : 10)  : (compact ? 14 : 22);
      const bGap  = compact ? 2   : 3;
      const barW  = Math.max(4, Math.floor((grpW - bGap*(nSeries-1)) / nSeries));
      const svgH  = compact ? 140 : 210;
      const barMaxH = compact ? 80 : 140;
      const labelH  = compact ? 28 : 32;
      const svgW  = gap + (grpW + gap) * nPeriods;

      let svgContent = '';
      // grid lines
      [0.25,0.5,0.75,1].forEach(f => {
        const y = svgH - labelH - Math.round(f * barMaxH);
        svgContent += `<line x1="0" y1="${escHtml(y)}" x2="${escHtml(svgW)}" y2="${escHtml(y)}" stroke="#eee" stroke-width="1"/>`;
      });

      periods.forEach((q, qi) => {
        const grpX = gap + qi * (grpW + gap);
        series.forEach((s, si) => {
          const val = s.data[qi];
          const bh  = Math.max(Math.round(val / maxVal * barMaxH), val > 0 ? 3 : 0);
          const bx  = grpX + si * (barW + bGap);
          const by  = svgH - labelH - bh;
          if (bh > 0) {
            svgContent += `<rect x="${escHtml(bx)}" y="${escHtml(by)}" width="${escHtml(barW)}" height="${escHtml(bh)}" rx="3" fill="${escHtml(s.color)}" opacity="0.87"/>`;
          }
          // value label on top
          if (val > 0) {
            svgContent += `<text x="${escHtml(bx + barW/2)}" y="${escHtml(by - 3)}" text-anchor="middle" font-size="${compact?7.5:9}" font-weight="700" fill="${escHtml(s.color)}">${escHtml(val)}</text>`;
          }
        });
        // Quarter label
        const cx = grpX + grpW/2;
        svgContent += `<text x="${escHtml(cx)}" y="${escHtml(svgH - (compact?14:16))}" text-anchor="middle" font-size="${compact?8:10}" font-weight="700" fill="#444">${escHtml(q.label)}</text>`;
        svgContent += `<text x="${escHtml(cx)}" y="${escHtml(svgH - (compact?4:4))}" text-anchor="middle" font-size="${compact?6.5:8}" fill="#999">${escHtml(q.sub)}</text>`;
      });

      const legendItems = series.map(s =>
        `<span style="display:inline-flex;align-items:center;gap:4px;font-size:${compact?'.7rem':'.78rem'};">
          <span style="width:10px;height:10px;border-radius:2px;background:${escHtml(s.color)};display:inline-block;flex-shrink:0;"></span>
          ${escHtml(s.label)}:&nbsp;<strong>${escHtml(s.data.reduce((a,b)=>a+b,0))}</strong>
        </span>`
      ).join('');

      const totalPeriksa   = series[0].data.reduce((a,b)=>a+b,0);
      const totalInsidental = series[1].data.reduce((a,b)=>a+b,0);
      const totalRujukan   = series[2].data.reduce((a,b)=>a+b,0);

      return `<div style="text-align:center;">
        <div style="font-size:${compact?'.74rem':'.84rem'};color:#555;margin-bottom:.4rem;font-weight:600;">
          Rekap Kegiatan Kesehatan — Tahun ${escHtml(tahun)}
        </div>
        <svg viewBox="0 0 ${escHtml(svgW)} ${escHtml(svgH)}" width="100%" style="max-width:${escHtml(svgW)}px;display:block;margin:0 auto;overflow:visible;">
          ${svgContent}
        </svg>
        <div style="display:flex;justify-content:center;gap:.75rem 1.25rem;flex-wrap:wrap;margin-top:.5rem;padding:.4rem .5rem;background:#f9f9f9;border-radius:8px;">
          ${legendItems}
        </div>
        ${!compact ? `<div style="display:flex;justify-content:center;gap:1rem;flex-wrap:wrap;margin-top:.4rem;font-size:.75rem;color:#666;">
          <span>Total Pemeriksaan: <strong style="color:#1a6b4a">${escHtml(totalPeriksa)}</strong></span>
          <span>Total Insidental: <strong style="color:#e67e22">${escHtml(totalInsidental)}</strong></span>
          <span>Total Rujukan: <strong style="color:#8e44ad">${escHtml(totalRujukan)}</strong></span>
          <span>Total Keseluruhan: <strong>${escHtml(totalPeriksa+totalInsidental+totalRujukan)}</strong></span>
        </div>` : ''}
      </div>`;
    }

    function _hitungTotalKegiatanTahun(tahun) {
      const inYear = (tgl) => tgl && new Date(tgl).getFullYear() === tahun;
      const periksa = state.pemeriksaan.filter(p => inYear(p.tglPeriksa)).length;
      const insidental = (state.insidental || []).filter(x => !x._deleted && inYear(x.tgl)).length;
      const rujukan = (state.rujukan || []).filter(x => !x._deleted && inYear(x.tgl)).length;
      return { periksa, insidental, rujukan, total: periksa + insidental + rujukan };
    }

    function renderKasiGrafik() {
      const cont = document.getElementById('kasiGrafikContainer');
      if (!cont) return;
      const tahun = parseInt((document.getElementById('kasiGrafikTahun')||{value:new Date().getFullYear()}).value) || new Date().getFullYear();
      const mode = (document.getElementById('kasiGrafikMode')||{value:'triwulan'}).value || 'triwulan';
      cont.innerHTML = _buildGrafikHTML(tahun, mode, false);

      // ── Insight: bandingkan total kegiatan tahun ini vs tahun sebelumnya ──
      const insightEl = document.getElementById('kasiGrafikInsight');
      if (insightEl) {
        const skrg = _hitungTotalKegiatanTahun(tahun);
        const lalu = _hitungTotalKegiatanTahun(tahun - 1);
        let html;
        if (lalu.total > 0) {
          const pct = Math.round((skrg.total - lalu.total) / lalu.total * 100);
          const naik = skrg.total > lalu.total;
          const sama = skrg.total === lalu.total;
          const arrow = sama ? '➡️' : (naik ? '📈' : '📉');
          const warna = sama ? '#555' : (naik ? '#c0392b' : '#1a7341');
          const teksTren = sama ? 'sama dengan' : (naik ? 'naik ' + Math.abs(pct) + '% dari' : 'turun ' + Math.abs(pct) + '% dari');
          html = `<div style="background:#eef6ff;border:1px solid #bcdcff;border-radius:8px;padding:.6rem .9rem;font-size:.83rem;color:#1a4a75;">
            ${escHtml(arrow)} Total kegiatan tahun <strong>${escHtml(tahun)}</strong>: <strong style="color:${escHtml(warna)}">${escHtml(skrg.total)}</strong> kegiatan (Pemeriksaan+Insidental+Rujukan) —
            <strong style="color:${escHtml(warna)}">${escHtml(teksTren)}</strong> tahun ${escHtml(tahun - 1)} (${escHtml(lalu.total)} kegiatan).
          </div>`;
        } else {
          html = `<div style="background:#eef6ff;border:1px solid #bcdcff;border-radius:8px;padding:.6rem .9rem;font-size:.83rem;color:#1a4a75;">
            ℹ️ Belum ada data kegiatan di tahun ${escHtml(tahun - 1)} untuk dijadikan pembanding. Total kegiatan tahun <strong>${escHtml(tahun)}</strong>: <strong>${escHtml(skrg.total)}</strong>.
          </div>`;
        }
        insightEl.innerHTML = html;
      }
    }

    // ── Ekspor data grafik kegiatan (per periode x kategori) ke Excel ──
    function exportKasiGrafikExcel() {
      const tahun = parseInt((document.getElementById('kasiGrafikTahun')||{value:new Date().getFullYear()}).value) || new Date().getFullYear();
      const mode = (document.getElementById('kasiGrafikMode')||{value:'triwulan'}).value || 'triwulan';
      const isBulan = mode === 'bulan';
      const periods = isBulan ? [
        {label:'Januari',months:[1]},{label:'Februari',months:[2]},{label:'Maret',months:[3]},
        {label:'April',months:[4]},{label:'Mei',months:[5]},{label:'Juni',months:[6]},
        {label:'Juli',months:[7]},{label:'Agustus',months:[8]},{label:'September',months:[9]},
        {label:'Oktober',months:[10]},{label:'November',months:[11]},{label:'Desember',months:[12]}
      ] : [
        { label: 'Triwulan I (Jan–Mar)', months: [1,2,3] },
        { label: 'Triwulan II (Apr–Jun)', months: [4,5,6] },
        { label: 'Triwulan III (Jul–Sep)', months: [7,8,9] },
        { label: 'Triwulan IV (Okt–Des)', months: [10,11,12] }
      ];
      const headers = ['Periode', 'Pemeriksaan', 'Insidental', 'Rujukan', 'Total'];
      const rows = periods.map(q => {
        const inPeriod = (tgl) => { const d = new Date(tgl); return d.getFullYear() === tahun && q.months.includes(d.getMonth()+1); };
        const periksa = state.pemeriksaan.filter(p => inPeriod(p.tglPeriksa)).length;
        const insidental = (state.insidental||[]).filter(x=>!x._deleted && inPeriod(x.tgl)).length;
        const rujukan = (state.rujukan||[]).filter(x=>!x._deleted && inPeriod(x.tgl)).length;
        return [q.label, periksa, insidental, rujukan, periksa+insidental+rujukan];
      });
      exportToExcel('grafik-kegiatan-' + tahun + '.xlsx', 'Grafik Kegiatan ' + tahun, headers, rows, [22, 14, 14, 12, 10]);
    }

    function cetakGrafik() {
      const cont = document.getElementById('kasiGrafikContainer');
      if (!cont) return;
      const tahun = (document.getElementById('kasiGrafikTahun')||{value:''}).value || new Date().getFullYear();
      const mode = (document.getElementById('kasiGrafikMode')||{value:'triwulan'}).value || 'triwulan';
      const modeLabel = mode === 'bulan' ? 'Per Bulan' : 'Per Triwulan';
      const html = `<div style="font-family:Arial,sans-serif;padding:16px;">
        ${_pdfHeader('GRAFIK KEGIATAN KESEHATAN — ' + modeLabel + ' ' + tahun, 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan')}
        <div style="margin:16px 0;">${cont.innerHTML}</div>
        ${_pdfTTD(new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}))}
      </div>`;
      printKartuIsolated(html);
    }

    function renderKasiStatPeriode() {
      const periodeEl = document.getElementById('kasiStatPeriode');
      const bulanEl = document.getElementById('kasiStatBulan');
      const twEl = document.getElementById('kasiStatTriwulan');
      const tahunEl = document.getElementById('kasiStatTahun');
      if (!periodeEl) return;
      const periode = periodeEl.value;
      if (bulanEl) bulanEl.style.display = periode === 'bulan' ? '' : 'none';
      if (twEl) twEl.style.display = periode === 'triwulan' ? '' : 'none';
      const now = new Date();
      const totalPM = state.penerima.length;
      const tahun = parseInt(tahunEl?.value) || 0;
      const BULAN_NAMES = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const TW_MONTHS = [[],[1,2,3],[4,5,6],[7,8,9],[10,11,12]];
      let periodeStr = '';
      let periksaList = [...state.pemeriksaan];
      if (tahun) periksaList = periksaList.filter(p => new Date(p.tglPeriksa).getFullYear() === tahun);
      if (periode === 'bulan') {
        const bulan = parseInt(bulanEl?.value) || 0;
        if (bulan) periksaList = periksaList.filter(p => new Date(p.tglPeriksa).getMonth()+1 === bulan);
        periodeStr = (bulan ? BULAN_NAMES[bulan]+' ' : 'Semua Bulan ') + (tahun||'');
      } else if (periode === 'triwulan') {
        const tw = parseInt(twEl?.value) || 0;
        if (tw) periksaList = periksaList.filter(p => TW_MONTHS[tw].includes(new Date(p.tglPeriksa).getMonth()+1));
        periodeStr = (tw ? 'TW '+['','I','II','III','IV'][tw]+' ' : 'Semua TW ') + (tahun||'');
      } else {
        periodeStr = tahun ? 'Tahun '+tahun : 'Semua Tahun';
      }
      const pmDiperiksa = _hitungPMUnik(periksaList);
      // Cakupan dihitung terhadap PM AKTIF saja (PM keluar/meninggal tidak diperiksa rutin)
      const totalAktif = state.penerima.filter(isPMAktif).length;
      const cakupan = totalAktif > 0 ? Math.min(100, Math.round(pmDiperiksa/totalAktif*100)) : 0;
      const batas90 = new Date(now - 90*86400000);
      const belumPeriksa = state.penerima.filter(pm => {
        if (!isPMAktif(pm)) return false;
        const last = getLastPeriksa(pm.nomorInduk);
        return !last || new Date(last.tglPeriksa) < batas90;
      }).length;
      // Kasus perlu perhatian pada PERIODE yang dipilih (dulu: seluruh riwayat sepanjang masa)
      const perhatian = periksaList.filter(p=>p.statusKondisi==='Perlu Perhatian'||p.statusKondisi==='Rujuk').length;
      const antriHariIni = state.antrian.filter(a => a.status !== 'dihapus' && new Date(a.tglAntrian).toDateString() === now.toDateString()).length;
      document.getElementById('kasiStats').innerHTML = `
    <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-val">${escHtml(totalPM)}</div><div class="stat-label">Total PM Terdaftar</div></div>
    <div class="stat-card accent"><div class="stat-icon">📅</div><div class="stat-val">${escHtml(pmDiperiksa)}</div><div class="stat-label">PM Diperiksa — ${escHtml(periodeStr)}</div></div>
    <div class="stat-card info"><div class="stat-icon">🔢</div><div class="stat-val">${escHtml(antriHariIni)}</div><div class="stat-label">Antrian Hari Ini</div></div>
    <div class="stat-card danger"><div class="stat-icon">⚠️</div><div class="stat-val">${escHtml(belumPeriksa)}</div><div class="stat-label">Belum Periksa &gt;3 Bulan</div></div>
    <div class="stat-card" style="border-left-color:#c0392b"><div class="stat-icon">🔴</div><div class="stat-val" style="color:#c0392b">${escHtml(perhatian)}</div><div class="stat-label">Kasus Perlu Perhatian</div></div>
    <div class="stat-card" style="border-left-color:#7b2d8b"><div class="stat-icon">📊</div><div class="stat-val" style="color:#7b2d8b">${escHtml(cakupan)}%</div><div class="stat-label">Cakupan Pemeriksaan — ${escHtml(periodeStr)}</div></div>
    <div style="grid-column:1/-1;width:100%;">${_htmlAnalisis(_analisisNama(periksaList.map(p => p.namaPM)), 'pemeriksaan', 'kegiatan', false, periksaList.map(_itemDariRec))}</div>
  `;
    }

    function renderDashGrafik() {
      const cont = document.getElementById('dashGrafikContainer');
      if (!cont) return;
      const tahun = new Date().getFullYear();
      const lbl = document.getElementById('dashGrafikTahunLabel');
      if (lbl) lbl.textContent = tahun;
      const _inY = (tgl) => new Date(tgl).getFullYear() === tahun;
      const _ada = state.pemeriksaan.some(p => _inY(p.tglPeriksa)) ||
        (state.insidental || []).some(x => !x._deleted && _inY(x.tgl)) ||
        (state.rujukan || []).some(x => !x._deleted && _inY(x.tgl));
      if (!_ada) {
        cont.innerHTML = '<div class="empty-state"><div class="empty-ico">📈</div><div class="empty-ttl">Belum ada data tahun ' + tahun + '</div><div class="empty-sub">Grafik akan muncul otomatis setelah pemeriksaan, insidental, atau rujukan pertama dicatat.</div></div>';
        return;
      }
      cont.innerHTML = _buildGrafikHTML(tahun, 'triwulan', true);
    }

    // ══════════════════════════════════════
    //  LAPORAN KEPALA SEKSI — MASTER FILTER
    // ══════════════════════════════════════
    const BULAN_NAMA = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

    function _setVal(id, val) {
      const el = document.getElementById(id);
      if (!el) return;
      // Coba set value langsung; jika option tidak ada, cari yang terdekat
      const opts = [...el.options].map(o => o.value);
      if (opts.includes(String(val))) el.value = String(val);
      else if (opts.includes(val)) el.value = val;
    }

    function applyKasiMasterFilter() {
      const bulan = parseInt(document.getElementById('kasiMasterBulan')?.value || '0') || 0;
      const tahun = (document.getElementById('kasiMasterTahun')?.value || '');

      // Update label
      const lbl = document.getElementById('kasiMasterFilterLabel');
      if (lbl) {
        const bStr = bulan ? BULAN_NAMA[bulan] : 'Semua Bulan';
        const tStr = tahun || 'Semua Tahun';
        lbl.textContent = '📊 Tampil: ' + bStr + ' ' + tStr;
      }

      // ── Sinkronisasi semua dropdown per-section ──

      // Ringkasan stat periode
      _setVal('kasiStatPeriode', bulan ? 'bulan' : (tahun ? 'tahunan' : 'tahunan'));
      _setVal('kasiStatBulan', bulan || '0');
      _setVal('kasiStatTahun', tahun || '');
      // Paksa tampilkan/sembunyikan elemen bulan/triwulan
      const bulanEl = document.getElementById('kasiStatBulan');
      const twEl = document.getElementById('kasiStatTriwulan');
      const periodeEl = document.getElementById('kasiStatPeriode');
      if (periodeEl) periodeEl.value = bulan ? 'bulan' : 'tahunan';
      if (bulanEl) bulanEl.style.display = bulan ? '' : 'none';
      if (twEl) twEl.style.display = 'none';

      // Grafik (hanya tahun)
      _setVal('kasiGrafikTahun', tahun || new Date().getFullYear());

      // 5 Penyakit terbanyak
      _setVal('kasiPenyakitBulan', bulan || '0');
      _setVal('kasiPenyakitTahun', tahun || '');

      // Asrama (digunakan oleh renderKasi melalui kasiPenyakitBulan/Tahun, juga kasiBulan/Tahun untuk cetak)
      _setVal('kasiBulan', bulan || '0');
      _setVal('kasiTahun', tahun || '');

      // Riwayat pemeriksaan
      _setVal('kasiRiwayatBulan', bulan || '0');
      _setVal('kasiRiwayatTahun', tahun || '');

      // Insidental
      _setVal('kasiInsidentalBulan', bulan || '0');
      _setVal('kasiInsidentalTahun', tahun || (new Date().getFullYear()));

      // Foto dokumentasi (pakai string kosong utk semua)
      _setVal('kasiFotoBulan', bulan ? String(bulan) : '');
      _setVal('kasiFotoTahun', tahun || '');

      // Insidental → Pemeriksaan
      _setVal('kasiInsidentalPeriksa_bulan', bulan || '0');
      _setVal('kasiInsidentalPeriksa_tahun', tahun || '0');

      // Rujukan
      _setVal('kasiRujBulan', bulan ? String(bulan) : '');
      _setVal('kasiRujTahun', tahun || '');

      // ── Render ulang semua section ──
      renderKasiStatPeriode();
      renderKasiPenyakit();
      renderKasiRiwayat('');
      renderKasiInsidental('');
      renderKasiInsidentalPeriksa();
      renderKasiFoto();
      renderKasiRujukanFull();
      renderKasiGrafik();

      // Asrama (bagian dari renderKasi — panggil versi lengkap agar breakdown status,
      // diagnosis teratas, dan callout prioritas ikut ter-render, bukan duplikat versi sederhana)
      renderKasi();
    }

    function resetKasiMasterFilter() {
      _setVal('kasiMasterBulan', '0');
      _setVal('kasiMasterTahun', '');
      const lbl = document.getElementById('kasiMasterFilterLabel');
      if (lbl) lbl.textContent = '';
      // Reset semua dropdown ke default semua
      const ids = ['kasiStatBulan','kasiPenyakitBulan','kasiBulan','kasiRiwayatBulan','kasiInsidentalBulan','kasiFotoBulan','kasiInsidentalPeriksa_bulan','kasiRujBulan'];
      ids.forEach(id => _setVal(id, '0'));
      const idsTahun = ['kasiStatTahun','kasiPenyakitTahun','kasiTahun','kasiRiwayatTahun','kasiFotoTahun','kasiRujTahun'];
      idsTahun.forEach(id => _setVal(id, ''));
      _setVal('kasiInsidentalTahun', new Date().getFullYear());
      _setVal('kasiInsidentalPeriksa_tahun', '0');
      _setVal('kasiStatPeriode', 'tahunan');
      const bulanEl = document.getElementById('kasiStatBulan');
      const twEl = document.getElementById('kasiStatTriwulan');
      if (bulanEl) bulanEl.style.display = 'none';
      if (twEl) twEl.style.display = 'none';
      renderKasi();
    }

    // ══════════════════════════════════════
    //  LAPORAN KEPALA SEKSI
    // ══════════════════════════════════════
    function renderKasi() {
      try { if (typeof initPaketKasiPanel === "function") initPaketKasiPanel(); } catch (e) {}
      const now = new Date();
      const bulan = parseInt((document.getElementById('kasiBulan') || { value: '0' }).value);
      const tahun = parseInt((document.getElementById('kasiTahun') || { value: '' }).value);
      const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

      document.getElementById('kasiTanggal').textContent =
        now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      // --- STATS RINGKASAN (delegated to renderKasiStatPeriode) ---
      renderKasiStatPeriode();
      const batas90 = new Date(now - 90 * 86400000);
      const periksaBulanIni = state.pemeriksaan.filter(p => {
        const d = new Date(p.tglPeriksa);
        return (bulan === 0 || isNaN(bulan) || d.getMonth() + 1 === bulan) && (isNaN(tahun) || d.getFullYear() === tahun);
      });

      // --- STATISTIK PER ASRAMA ---
      const _asramaBaku = ['ASTRI 1', 'ASTRI 2', 'ASTRA 1', 'ASTRA 2', 'ASTRA 3', 'ASTRA 4'];
      // Asrama lain (di luar daftar baku) tetap ikut dihitung
      const asramaList = _asramaBaku.concat([...new Set(state.penerima.map(p => p.kamarBlok).filter(k => k && _asramaBaku.indexOf(k) === -1))].sort());
      const kartuAsrama = [];
      asramaList.forEach(asrama => {
        const pmAsrama = state.penerima.filter(p => p.kamarBlok === asrama && isPMAktif(p));
        if (pmAsrama.length === 0) return;
        // Hanya PM AKTIF di asrama ini (sama dengan penyebut) → cakupan tidak bisa lebih dari 100%
        const niAktif = new Set(pmAsrama.map(p => p.nomorInduk));
        const periksaAsrama = periksaBulanIni.filter(p => niAktif.has(p.nomorInduk));
        const pmPeriksa = _hitungPMUnik(periksaAsrama);
        const pct = Math.round(pmPeriksa / pmAsrama.length * 100);

        // Breakdown status kondisi dari pemeriksaan TERAKHIR tiap PM (periode terpilih) —
        // dulu tiap kunjungan dihitung, jadi 1 PM yang diperiksa 4x terhitung 4 PM.
        const statusCount = { 'Baik': 0, 'Cukup Baik': 0, 'Perlu Perhatian': 0, 'Rujuk': 0, 'Kritis': 0 };
        const terakhirPM = {};
        periksaAsrama.forEach(p => { const c = terakhirPM[p.nomorInduk]; if (!c || String(p.tglPeriksa) > String(c.tglPeriksa)) terakhirPM[p.nomorInduk] = p; });
        Object.values(terakhirPM).forEach(p => { if (statusCount[p.statusKondisi] !== undefined) statusCount[p.statusKondisi]++; });
        const perluPerhatianCount = statusCount['Perlu Perhatian'] + statusCount['Rujuk'] + statusCount['Kritis'];

        // Diagnosis teratas di asrama ini pada periode terpilih
        const diagFreq = {};
        periksaAsrama.forEach(p => { const dg = (p.diagnosis||'').trim(); if (dg && dg !== '-') diagFreq[dg] = (diagFreq[dg]||0)+1; });
        const topDiagArr = Object.entries(diagFreq).sort((a,b)=>b[1]-a[1]);
        const topDiag = topDiagArr.length ? topDiagArr[0] : null;

        kartuAsrama.push({ asrama, pmAsrama, pmPeriksa, pct, statusCount, perluPerhatianCount, topDiag });
      });

      // Urutkan: yang cakupannya paling rendah / paling banyak "perlu perhatian" ditaruh duluan (paling butuh aksi)
      kartuAsrama.sort((a, b) => (b.perluPerhatianCount - a.perluPerhatianCount) || (a.pct - b.pct));

      // Callout ringkasan di atas grid — soroti asrama paling butuh perhatian
      let calloutHtml = '';
      if (kartuAsrama.length) {
        const prioritas = kartuAsrama[0];
        if (prioritas.perluPerhatianCount > 0) {
          calloutHtml = `<div style="background:#fdecea;border:1px solid #f5b7b1;border-radius:8px;padding:.6rem .9rem;font-size:.83rem;color:#721c24;margin-bottom:1rem;">
            ⚠️ <strong>${escHtml(prioritas.asrama)}</strong> perlu perhatian ekstra: ${escHtml(prioritas.perluPerhatianCount)} PM berstatus Perlu Perhatian/Rujuk/Kritis pada periode ini${prioritas.pct < 70 ? `, dengan cakupan pemeriksaan baru ${prioritas.pct}%` : ''}.
          </div>`;
        } else if (prioritas.pct < 70) {
          calloutHtml = `<div style="background:#fff8e1;border:1px solid #ffe0a3;border-radius:8px;padding:.6rem .9rem;font-size:.83rem;color:#7a5c00;margin-bottom:1rem;">
            ℹ️ Cakupan pemeriksaan terendah ada di <strong>${escHtml(prioritas.asrama)}</strong> (${escHtml(prioritas.pct)}%) — pertimbangkan jadwal kunjungan tambahan.
          </div>`;
        } else {
          calloutHtml = `<div style="background:#eafaf1;border:1px solid #a9dfbf;border-radius:8px;padding:.6rem .9rem;font-size:.83rem;color:#1a7341;margin-bottom:1rem;">
            ✅ Semua asrama dalam kondisi baik — tidak ada yang menonjol perlu perhatian khusus periode ini.
          </div>`;
        }
      }

      let asramaHtml = calloutHtml + `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;">`;
      kartuAsrama.forEach(k => {
        const { asrama, pmAsrama, pmPeriksa, pct, statusCount, perluPerhatianCount, topDiag } = k;
        const isPutri = String(asrama).startsWith('ASTRI');
        const warna = isPutri ? '#c2185b' : '#1565c0';
        const warnaPale = isPutri ? '#fce4ec' : '#e3f0ff';
        const totalStatus = Object.values(statusCount).reduce((a,b)=>a+b,0);
        const statusColors = { 'Baik':'#27ae60', 'Cukup Baik':'#f39c12', 'Perlu Perhatian':'#e67e22', 'Rujuk':'#c0392b', 'Kritis':'#7b0000' };
        const stackedBar = totalStatus > 0
          ? '<div style="display:flex;height:8px;border-radius:6px;overflow:hidden;margin-top:6px;">' +
            Object.entries(statusCount).filter(([,v]) => v > 0).map(([s,v]) =>
              `<div style="width:${escHtml(Math.round(v/totalStatus*100))}%;background:${escHtml(statusColors[s])};" title="${escHtml(s)}: ${escHtml(v)}"></div>`
            ).join('') + '</div>'
          : '';
        const statusLegend = totalStatus > 0
          ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:5px;">' +
            Object.entries(statusCount).filter(([,v]) => v > 0).map(([s,v]) =>
              `<span style="font-size:.68rem;color:${escHtml(statusColors[s])};font-weight:600;">● ${escHtml(s)}: ${escHtml(v)}</span>`
            ).join('') + '</div>'
          : '<div style="font-size:.7rem;color:var(--text-muted);margin-top:5px;">Belum ada data status periode ini</div>';
        asramaHtml += `
      <div style="border:1.5px solid ${escHtml(warna)}33;border-radius:12px;padding:1rem;background:${escHtml(warnaPale)}40;position:relative;">
        ${perluPerhatianCount > 0 ? `<span style="position:absolute;top:-8px;right:10px;background:#c0392b;color:#fff;font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:10px;">⚠️ ${escHtml(perluPerhatianCount)}</span>` : ''}
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:.75rem;">
          <span style="font-size:1.2rem">${isPutri ? '🚺' : '🚹'}</span>
          <div>
            <div style="font-weight:700;color:${escHtml(warna)}">${escHtml(asrama)}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">${isPutri ? 'Asrama Putri' : 'Asrama Putra'}</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:1.4rem;font-weight:700;color:${escHtml(warna)}">${escHtml(pmPeriksa)}/${escHtml(pmAsrama.length)}</div>
            <div style="font-size:.7rem;color:var(--text-muted)">PM diperiksa</div>
          </div>
        </div>
        <div class="progress-wrap"><div class="progress-bar" style="width:${escHtml(pct)}%;background:${escHtml(warna)}"></div></div>
        <div style="font-size:.75rem;color:var(--text-muted);margin-top:4px">${escHtml(pct)}% cakupan ${escHtml((bulan > 0 ? BULAN[bulan] : 'semua bulan') + ' ' + (isNaN(tahun) ? 'semua tahun' : tahun))}</div>
        ${stackedBar}
        ${statusLegend}
        <div style="font-size:.75rem;color:#555;margin-top:8px;padding-top:8px;border-top:1px dashed ${escHtml(warna)}44;">
          🏥 Diagnosis teratas: ${topDiag ? `<strong>${escHtml(topDiag[0])}</strong> (${escHtml(topDiag[1])} kasus)` : '<span style="color:var(--text-muted)">Belum ada data</span>'}
        </div>
      </div>`;
      });
      asramaHtml += '</div>';
      document.getElementById('kasiAsrama').innerHTML = asramaHtml;

      // --- PM PERLU PERHATIAN ---
      (function() {
        const selTahun = document.getElementById('kasiPerhatianTahun');
        if (!selTahun) return;
        const years = [...new Set((state.pemeriksaan||[]).filter(p=>p.tglPeriksa).map(p=>new Date(p.tglPeriksa).getFullYear()))].sort((a,b)=>b-a);
        const cur = selTahun.value;
        selTahun.innerHTML = '<option value="0">Semua Tahun</option>' + years.map(y=>`<option value="${escHtml(y)}"${String(y)===cur?'selected':''}>${escHtml(y)}</option>`).join('');
        if (!cur || cur==='0') { const nowY = new Date().getFullYear(); if(years.includes(nowY)) selTahun.value=String(nowY); }
      })();
      renderKasiPerhatian();
      renderFlagMingguan();

      // --- PM BELUM PERIKSA > 3 BULAN (hanya PM aktif) ---
      const belumList = state.penerima.filter(pm => {
        if (!isPMAktif(pm)) return false;
        const last = getLastPeriksa(pm.nomorInduk);
        return !last || new Date(last.tglPeriksa) < batas90;
      }).sort((a, b) => {
        const la = getLastPeriksa(a.nomorInduk);
        const lb = getLastPeriksa(b.nomorInduk);
        if (!la) return -1; if (!lb) return 1;
        return new Date(la.tglPeriksa) - new Date(lb.tglPeriksa);
      });
      document.getElementById('kasiCount14').textContent = belumList.length + ' PM';
      const belumBody = document.getElementById('kasiBelumBody');
      if (belumList.length === 0) {
        belumBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">🎉 Semua PM sudah diperiksa dalam 3 bulan terakhir</td></tr>';
      } else {
        belumBody.innerHTML = belumList.map(pm => {
          const last = getLastPeriksa(pm.nomorInduk);
          const hari = last ? Math.floor((now - new Date(last.tglPeriksa)) / 86400000) : null;
          const tglStr = last ? new Date(last.tglPeriksa).toLocaleDateString('id-ID') : 'Belum pernah';
          return `<tr>
        <td style="font-weight:600">${escHtml(pm.namaPM)}</td>
        <td>${escHtml(pm.kamarBlok || '-')}</td>
        <td style="font-size:.82rem">${escHtml(pm.kondisiKronis || '-')}</td>
        <td style="font-size:.82rem">${escHtml(tglStr)}</td>
        <td><span class="badge ${hari === null ? 'badge-red' : hari > 21 ? 'badge-red' : 'badge-orange'}">${hari === null ? 'Belum pernah' : escHtml(hari + ' hari')}</span></td>
      </tr>`;
        }).join('');
      }

      // --- SEMUA RIWAYAT ---
      renderKasiRiwayat('');
      // --- INSIDENTAL ---
      renderKasiInsidental('');
      // --- INSIDENTAL → PEMERIKSAAN ---
      renderKasiInsidentalPeriksa();
      // --- 5 PENYAKIT TERBANYAK ---
      renderKasiPenyakit();
      // --- FOTO ---
      renderKasiFoto();
      // --- RUJUKAN ---
      renderKasiRujukanFull();
      // --- ASESMEN AWAL ---
      renderKasiAsesmen();
      // --- DATA PM ---
      renderKasiListPM();
      // --- GRAFIK TRIWULAN ---
      renderKasiGrafik();
      // --- NIP / TTD info ---
      const nipTgl = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      ['kasiNipTgl'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = nipTgl; });
      const petugasNama = state.namaPetugas || '-';
      ['kasiNipPetugas'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = petugasNama; });
    }

    function renderKasiRiwayat(filter) {
      const tbody = document.getElementById('kasiRiwayatBody');
      if (!tbody) return;
      const q = (document.getElementById('kasiRiwayatSearch') || {}).value || '';
      const bulan = parseInt((document.getElementById('kasiRiwayatBulan') || {}).value || '0');
      const tahun = parseInt((document.getElementById('kasiRiwayatTahun') || {}).value || '0');
      const minggu = parseInt((document.getElementById('filterKasiRiwayatMinggu') || {}).value || '0');
      let list = [...state.pemeriksaan].sort((a, b) => new Date(b.tglPeriksa) - new Date(a.tglPeriksa));
      if (q) list = list.filter(p => (p.namaPM || '').toLowerCase().includes(q.toLowerCase()));
      if (bulan) list = list.filter(p => p.tglPeriksa && new Date(p.tglPeriksa).getMonth() + 1 === bulan);
      if (tahun) list = list.filter(p => p.tglPeriksa && new Date(p.tglPeriksa).getFullYear() === tahun);
      if (minggu) list = list.filter(p => parseInt(p.mingguKe) === minggu);
      const _pgKasiRiwayat = document.getElementById('kasiRiwayatPagination');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;color:var(--text-muted);padding:2rem">Belum ada riwayat pemeriksaan untuk periode ini</td></tr>';
        if (_pgKasiRiwayat) _pgKasiRiwayat.innerHTML = '';
        return;
      }
      list = _fltTbl('kasiRiwayat', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppKasiRiwayat = 100;
      const _totalPagesKasiRiwayat = Math.max(1, Math.ceil(list.length / _ppKasiRiwayat));
      if (_pageState.kasiRiwayat > _totalPagesKasiRiwayat) _pageState.kasiRiwayat = _totalPagesKasiRiwayat;
      const _startKasiRiwayat = (_pageState.kasiRiwayat - 1) * _ppKasiRiwayat;
      tbody.innerHTML = '';
      list.slice(_startKasiRiwayat, _startKasiRiwayat + _ppKasiRiwayat).forEach((p, _idx) => {
        const idx = _startKasiRiwayat + _idx;
        const pm = state.penerima.find(x => x.nomorInduk === p.nomorInduk);
        const bc = p.statusKondisi === 'Baik' ? 'badge-green' : p.statusKondisi === 'Cukup Baik' ? 'badge-yellow' : 'badge-red';
        const tr = document.createElement('tr');
        const rujBadge = p.perluRujukan === 'ya' ? '<span class="badge badge-red" style="font-size:.7rem">🏥</span>' : '';
        tr.innerHTML =
          '<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">' + (escHtml(idx + 1)) + '</td>' +
          '<td style="font-size:.8rem">' + (p.tglPeriksa ? escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')) : '-') + '</td>' +
          '<td style="font-weight:600;font-size:.88rem">' + (escHtml(p.namaPM || '-')) + '</td>' +
          '<td style="font-size:.8rem">' + (pm ? escHtml(pm.kamarBlok) : '-') + '</td>' +
          '<td style="font-size:.8rem;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (escHtml(p.diagnosis || '')) + '">' + (escHtml(p.diagnosis || '-')) + '</td>' +
          '<td style="font-family:monospace;font-size:.8rem">' + (escHtml(p.tekananDarah || '-')) + '</td>' +
          '<td style="font-size:.8rem;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (escHtml(p.tindakan || '')) + '">' + (escHtml(p.tindakan || '-')) + '</td>' +
          '<td style="font-size:.8rem;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (escHtml(p.rencana || '')) + '">' + (escHtml(p.rencana || '-')) + '</td>' +
          '<td style="font-size:.78rem;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + ((p.obatDiberikan&&p.obatDiberikan.length)?p.obatDiberikan.map(o=>(escHtml((o.nama||'')+(o.jumlah?' '+o.jumlah:''))+' '+(escHtml(o.satuan||''))).trim()).join(', '):'-') + '</td>' +
          '<td><span class="badge ' + escHtml(bc) + '">' + (escHtml(p.statusKondisi || '-')) + '</span>' + rujBadge + '</td>' +
          '<td style="font-size:.78rem;color:var(--text-muted)">' + (escHtml(p.namaDokter || '-')) + '</td>' +
          '<td style="display:flex;gap:3px;"></td>';
        const aksi = tr.lastElementChild;
        const bLihat = document.createElement('button');
        bLihat.className = 'btn btn-info btn-sm no-print'; bLihat.textContent = '👁'; bLihat.title = 'Lihat Detail';
        bLihat.onclick = () => lihatDetailPemeriksaan(p.id);
        aksi.appendChild(bLihat);
        const bPDF = document.createElement('button');
        bPDF.className = 'btn btn-ghost btn-sm no-print'; bPDF.textContent = '🖨️'; bPDF.title = 'Cetak PDF';
        bPDF.onclick = () => cetakPDFRiwayat(p.id);
        aksi.appendChild(bPDF);
        tbody.appendChild(tr);
      });
      _renderPaginationControls('kasiRiwayatPagination', 'kasiRiwayat', list.length, _ppKasiRiwayat, 'renderKasiRiwayat');
    }

    function filterKasiRiwayat(q) { _pageState.kasiRiwayat = 1; renderKasiRiwayat(q.toLowerCase()); }

    function renderKasiListPM() {
      const tbody = document.getElementById('kasiPMBody');
      const countEl = document.getElementById('kasiPMCount');
      if (!tbody) return;
      const q = ((document.getElementById('kasiPMSearch') || {}).value || '').toLowerCase();
      const asrama = (document.getElementById('kasiPMAsrama') || {}).value || '';
      let list = [...state.penerima].sort((a, b) => (a.namaPM||'').localeCompare((b.namaPM||''), 'id'));
      if (q) list = list.filter(p => (p.namaPM||'').toLowerCase().includes(q) || (p.nomorInduk||'').toLowerCase().includes(q));
      if (asrama) list = list.filter(p => p.kamarBlok === asrama);
      if (countEl) countEl.textContent = list.length + ' orang';
      const _pgKasiPM = document.getElementById('kasiPMPagination');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;color:var(--text-muted);padding:2rem">Tidak ada data PM</td></tr>';
        if (_pgKasiPM) _pgKasiPM.innerHTML = '';
        return;
      }
      list = _fltTbl('kasiPM', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppKasiPM = 100;
      const _totalPagesKasiPM = Math.max(1, Math.ceil(list.length / _ppKasiPM));
      if (_pageState.kasiPM > _totalPagesKasiPM) _pageState.kasiPM = _totalPagesKasiPM;
      const _startKasiPM = (_pageState.kasiPM - 1) * _ppKasiPM;
      const _pageKasiPM = list.slice(_startKasiPM, _startKasiPM + _ppKasiPM);
      tbody.innerHTML = '';
      _pageKasiPM.forEach((pm, _i) => {
        const i = _startKasiPM + _i;
        const last = getLastPeriksa(pm.nomorInduk);
        const tglStr = last ? new Date(last.tglPeriksa).toLocaleDateString('id-ID') : '-';
        const hari = last ? Math.floor((new Date() - new Date(last.tglPeriksa)) / 86400000) : null;
        const status = !last ? 'Belum pernah' : hari > 90 ? 'Terlambat' : hari > 30 ? 'Perlu Jadwal' : 'Rutin';
        const sc = !last || hari > 90 ? 'badge-red' : hari > 30 ? 'badge-yellow' : 'badge-green';
        let usia = '-';
        if (pm.tglLahir) { const l = new Date(pm.tglLahir); const now = new Date(); let u = now.getFullYear()-l.getFullYear(); if (now.getMonth()<l.getMonth()||(now.getMonth()===l.getMonth()&&now.getDate()<l.getDate())) u--; usia = u+' th'; }
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td style="text-align:center">' + (escHtml(i+1)) + '</td>' +
          '<td style="font-size:.78rem;color:var(--text-muted)">' + escHtml(pm.nomorInduk) + '</td>' +
          '<td style="font-weight:600">' + escHtml(pm.namaPM) + '</td>' +
          '<td style="text-align:center">' + escHtml(usia) + '</td>' +
          '<td>' + escHtml(pm.jenisKelamin || '-') + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(pm.jenisDis || '-') + '</td>' +
          '<td style="text-align:center">' + escHtml(pm.kamarBlok || '-') + '</td>' +
          '<td style="text-align:center">' + escHtml(pm.golDarah || '-') + '</td>' +
          '<td style="font-size:.8rem;color:' + (pm.kondisiKronis && pm.kondisiKronis !== '-' ? 'var(--danger)' : 'inherit') + '">' + escHtml(pm.kondisiKronis || '-') + '</td>' +
          '<td style="font-size:.8rem;color:' + (pm.alergi ? 'var(--danger)' : 'inherit') + '">' + escHtml(pm.alergi || '-') + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(tglStr) + '</td>' +
          '<td><span class="badge ' + escHtml(sc) + '">' + escHtml(status) + '</span></td>' +
          '<td style="white-space:nowrap;display:flex;gap:4px;">' +
            '<button type="button" class="btn btn-sm" style="background:#e8f4fd;color:#2980b9;" title="Lihat Rekam Medis">🕒</button>' +
            '<button type="button" class="btn btn-sm" style="background:#f0faf5;color:#1a6b4a;" title="Cetak Kartu Mingguan (pilih tanggal)">🗓️</button>' +
          '</td>';
        tr.querySelectorAll('button')[0].onclick = () => tampilkanRekamMedis(pm.nomorInduk);
        tr.querySelectorAll('button')[1].onclick = () => promptCetakKartuMingguan(pm.nomorInduk, pm.namaPM);
        tbody.appendChild(tr);
      });
      _renderPaginationControls('kasiPMPagination', 'kasiPM', list.length, _ppKasiPM, 'renderKasiListPM');
    }

    // ── Prompt tanggal singkat untuk cetak kartu mingguan dari daftar Kasi (tanpa buka profil PM) ──
    function promptCetakKartuMingguan(nomorInduk, namaPM) {
      const old = document.getElementById('modalPromptTglKartu');
      if (old) old.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay show';
      overlay.id = 'modalPromptTglKartu';
      overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
      const todayISO = isoLokal(new Date());
      overlay.innerHTML = `<div class="modal" style="max-width:360px">
        <div class="modal-title">🗓️ Cetak Kartu Mingguan</div>
        <div style="font-size:.85rem;margin-bottom:.5rem;"><strong>${escHtml(namaPM)}</strong></div>
        <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.6rem;">Kalau tidak ada pemeriksaan di tanggal yang dipilih, kartu tetap dibuat dengan status <strong>Baik</strong> (default).</div>
        <input type="date" id="promptTglKartuInput" value="${escHtml(todayISO)}" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-size:.85rem;margin-bottom:.75rem;">
        <div style="display:flex;gap:.5rem;">
          <button class="btn btn-ghost" style="flex:1;" onclick="document.getElementById('modalPromptTglKartu').remove()">Batal</button>
          <button class="btn btn-primary" style="flex:1;" id="promptTglKartuGo">🖨️ Cetak</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      document.getElementById('promptTglKartuGo').onclick = () => {
        const tgl = document.getElementById('promptTglKartuInput').value;
        if (!tgl) { showToast('⚠️ Pilih tanggal dulu', 'warning'); return; }
        overlay.remove();
        cetakKartuMingguanTanggal(nomorInduk, tgl);
      };
    }
