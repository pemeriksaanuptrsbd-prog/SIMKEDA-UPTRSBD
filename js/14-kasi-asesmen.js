    // ══════════════════════════════════════
    //  KASI: Insidental, Foto, Rujukan
    // ══════════════════════════════════════

    // Menghitung filter periode "sebelumnya" (untuk tren) berdasarkan filter bulan/tahun saat ini
    function _periodeSebelumnyaPenyakit(bulan, tahun) {
      // Kasus 1: bulan spesifik dipilih -> bandingkan dgn bulan sebelumnya (urus pergantian tahun)
      if (bulan > 0 && !isNaN(bulan) && !isNaN(tahun)) {
        let b = bulan - 1, t = tahun;
        if (b < 1) { b = 12; t = tahun - 1; }
        return { bulan: b, tahun: t, tersedia: true };
      }
      // Kasus 2: "Semua Bulan" tapi tahun spesifik -> bandingkan dgn tahun sebelumnya
      if ((bulan === 0 || isNaN(bulan)) && !isNaN(tahun)) {
        return { bulan: 0, tahun: tahun - 1, tersedia: true };
      }
      // Kasus 3: "Semua Tahun" -> tidak ada pembanding yang jelas
      return { tersedia: false };
    }

    function _filterPeriksaPeriode(bulan, tahun) {
      return (state.pemeriksaan || []).filter(p => {
        if (!p.tglPeriksa) return false;
        const d = new Date(p.tglPeriksa);
        return (bulan === 0 || isNaN(bulan) || d.getMonth() + 1 === bulan) && (isNaN(tahun) || d.getFullYear() === tahun);
      });
    }

    function renderKasiPenyakit() {
      const tbody = document.getElementById('kasiPenyakitBody');
      if (!tbody) return;
      const bulan = parseInt((document.getElementById('kasiPenyakitBulan') || { value: '0' }).value);
      const tahun = parseInt((document.getElementById('kasiPenyakitTahun') || { value: '' }).value);
      const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

      // Filter data pemeriksaan sesuai periode
      const list = _filterPeriksaPeriode(bulan, tahun);

      // Hitung frekuensi tiap diagnosis + PM unik + breakdown asrama
      const freq = {}; // diag -> { count, pmSet:Set, asrama:{} }
      list.forEach(p => {
        const diag = (p.diagnosis || '').trim();
        if (!diag || diag === '-') return;
        if (!freq[diag]) freq[diag] = { count: 0, pmSet: new Set(), asrama: {} };
        freq[diag].count++;
        freq[diag].pmSet.add(p.nomorInduk);
        const pmObj = state.penerima.find(x => x.nomorInduk === p.nomorInduk);
        const asramaKey = pmObj && pmObj.kamarBlok ? pmObj.kamarBlok.split(' ')[0] : 'Lainnya'; // ASTRA / ASTRI
        freq[diag].asrama[asramaKey] = (freq[diag].asrama[asramaKey] || 0) + 1;
      });

      // Hitung frekuensi periode sebelumnya (untuk tren)
      const pembanding = _periodeSebelumnyaPenyakit(bulan, tahun);
      const freqSebelumnya = {};
      if (pembanding.tersedia) {
        _filterPeriksaPeriode(pembanding.bulan, pembanding.tahun).forEach(p => {
          const diag = (p.diagnosis || '').trim();
          if (!diag || diag === '-') return;
          freqSebelumnya[diag] = (freqSebelumnya[diag] || 0) + 1;
        });
      }

      // Sort dan ambil top 5
      const sorted = Object.entries(freq).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
      const total = list.filter(p => (p.diagnosis || '').trim() && (p.diagnosis || '').trim() !== '-').length;

      // Update badge periode
      const periodeEl = document.getElementById('kasiPenyakitPeriode');
      if (periodeEl) {
        const periodeStr = (bulan === 0 || isNaN(bulan)) ? String(isNaN(tahun) ? 'Semua' : tahun) : ((BULAN[bulan] || '') + (isNaN(tahun) ? '' : ' ' + tahun));
        periodeEl.textContent = periodeStr;
      }

      const insightEl = document.getElementById('kasiPenyakitInsight');

      if (!sorted.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.5rem">Tidak ada data diagnosis periode ini</td></tr>';
        if (insightEl) insightEl.innerHTML = '';
        return;
      }

      // ── Insight otomatis: sorot diagnosis dgn kenaikan tren paling signifikan ──
      if (insightEl) {
        let insightHtml = '';
        if (pembanding.tersedia) {
          let sorotan = null; // { diag, count, prev, pct }
          sorted.forEach(([diag, d]) => {
            const prev = freqSebelumnya[diag] || 0;
            if (prev > 0) {
              const pct = Math.round((d.count - prev) / prev * 100);
              if (pct > 0 && (!sorotan || pct > sorotan.pct)) sorotan = { diag, count: d.count, prev, pct };
            } else if (d.count >= 3 && !sorotan) {
              sorotan = { diag, count: d.count, prev: 0, pct: null };
            }
          });
          if (sorotan) {
            insightHtml = sorotan.pct !== null
              ? `⚠️ <strong>${escHtml(sorotan.diag)}</strong> naik ${escHtml(sorotan.pct)}% dibanding periode sebelumnya (${escHtml(sorotan.count)} vs ${escHtml(sorotan.prev)} kasus) — pertimbangkan pemeriksaan lanjut / edukasi pencegahan.`
              : `⚠️ <strong>${escHtml(sorotan.diag)}</strong> tercatat ${escHtml(sorotan.count)} kasus baru periode ini (tidak muncul di periode sebelumnya).`;
          } else {
            insightHtml = `✅ Tidak ada diagnosis dengan kenaikan signifikan dibanding periode sebelumnya.`;
          }
        } else {
          insightHtml = `ℹ️ Pilih bulan atau tahun spesifik pada filter untuk melihat perbandingan tren dengan periode sebelumnya.`;
        }
        insightEl.innerHTML = `<div style="background:#fff8e1;border:1px solid #ffe0a3;border-radius:8px;padding:.6rem .9rem;font-size:.83rem;color:#7a5c00;">${insightHtml}</div>`;
      }

      const colors = ['#e74c3c', '#e67e22', '#f39c12', '#27ae60', '#2980b9'];
      tbody.innerHTML = '';
      sorted.forEach(([diag, d], i) => {
        const count = d.count;
        const pmUnik = d.pmSet.size;
        const pct = total > 0 ? Math.round(count / total * 100) : 0;
        const prev = freqSebelumnya[diag] || 0;
        let trenHtml;
        if (!pembanding.tersedia) {
          trenHtml = '<span style="color:var(--text-muted);font-size:.78rem;">–</span>';
        } else if (prev === 0 && count > 0) {
          trenHtml = '<span style="color:#c0392b;font-weight:700;font-size:.78rem;">🆕 baru</span>';
        } else {
          const pctChange = prev > 0 ? Math.round((count - prev) / prev * 100) : 0;
          const naik = count > prev;
          const sama = count === prev;
          trenHtml = sama
            ? '<span style="color:var(--text-muted);font-size:.78rem;">— tetap</span>'
            : `<span style="color:${naik ? '#c0392b' : '#1a7341'};font-weight:700;font-size:.78rem;">${naik ? '↑' : '↓'} ${escHtml(Math.abs(pctChange))}%</span>`;
        }
        const asramaHtml = Object.entries(d.asrama)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `<span style="display:inline-block;background:#eef3f8;color:#456;border-radius:8px;padding:1px 7px;margin:1px;font-size:.72rem;">${k === 'ASTRA' ? '🚹' : k === 'ASTRI' ? '🚺' : '🏠'} ${escHtml(k)}: ${escHtml(v)}</span>`)
          .join('');
        const kasusLabel = pmUnik < count
          ? escHtml(count) + ' kasus <span style="font-weight:400;opacity:.85;">(' + escHtml(pmUnik) + ' PM)</span>'
          : count + ' kasus';
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = 'Klik untuk lihat daftar PM';
        tr.onclick = () => lihatDetailPenyakit(diag, bulan, tahun);
        tr.innerHTML =
          '<td style="text-align:center;font-weight:700;color:' + escHtml(colors[i]) + ';">' + (escHtml(i + 1)) + '</td>' +
          '<td><strong>' + escHtml(diag) + '</strong></td>' +
          '<td style="text-align:center;">' +
          '<span style="display:inline-block;background:' + escHtml(colors[i]) + '22;color:' + escHtml(colors[i]) + ';font-weight:700;padding:3px 12px;border-radius:12px;font-size:.9rem;">' + kasusLabel + '</span>' +
          '</td>' +
          '<td style="text-align:center;">' + trenHtml + '</td>' +
          '<td style="text-align:center;">' + (asramaHtml || '<span style="color:var(--text-muted);font-size:.78rem;">-</span>') + '</td>' +
          '<td style="text-align:center;">' +
          '<div style="display:flex;align-items:center;gap:8px;justify-content:center;">' +
          '<div style="flex:1;max-width:70px;background:#eee;border-radius:6px;height:8px;overflow:hidden;">' +
          '<div style="width:' + escHtml(pct) + '%;background:' + escHtml(colors[i]) + ';height:100%;border-radius:6px;"></div>' +
          '</div>' +
          '<span style="font-size:.85rem;color:var(--text-muted);min-width:36px;">' + escHtml(pct) + '%</span>' +
          '</div>' +
          '</td>';
        tbody.appendChild(tr);
      });

      // ── Grafik visual: bar horizontal untuk 5 penyakit teratas ──
      const chartEl = document.getElementById('kasiPenyakitChart');
      if (chartEl) chartEl.innerHTML = _buildPenyakitChartHTML(sorted, colors);
    }

    // ── Bangun grafik bar horizontal untuk 5 Penyakit Terbanyak ──
    function _buildPenyakitChartHTML(sorted, colors) {
      if (!sorted || !sorted.length) return '';
      const maxCount = Math.max(...sorted.map(([, d]) => d.count), 1);
      const rowH = 34, gapY = 10, leftLabelW = 190, chartW = 480, svgH = sorted.length * (rowH + gapY);
      const svgW = leftLabelW + chartW + 60;
      let bars = '';
      sorted.forEach(([diag, d], i) => {
        const y = i * (rowH + gapY);
        const barMaxW = chartW;
        const bw = Math.max(Math.round(d.count / maxCount * barMaxW), 4);
        const shortDiag = diag.length > 26 ? diag.slice(0, 24) + '…' : diag;
        bars += `
          <text x="${escHtml(leftLabelW - 10)}" y="${escHtml(y + rowH/2 + 4)}" text-anchor="end" font-size="11" fill="#333" font-weight="600">${escHtml(shortDiag)}</text>
          <rect x="${escHtml(leftLabelW)}" y="${escHtml(y + 4)}" width="${escHtml(bw)}" height="${escHtml(rowH - 8)}" rx="5" fill="${escHtml(colors[i])}" opacity="0.88"/>
          <text x="${escHtml(leftLabelW + bw + 8)}" y="${escHtml(y + rowH/2 + 4)}" font-size="12" font-weight="700" fill="${escHtml(colors[i])}">${escHtml(d.count)}</text>`;
      });
      return `<div style="font-size:.82rem;color:#555;font-weight:600;margin-bottom:.5rem;">📊 Perbandingan Visual — Jumlah Kasus per Diagnosis</div>
        <svg viewBox="0 0 ${escHtml(svgW)} ${escHtml(svgH)}" width="100%" style="max-width:${escHtml(svgW)}px;display:block;overflow:visible;">
          ${bars}
        </svg>`;
    }
    function lihatDetailPenyakit(diag, bulan, tahun) {
      const list = _filterPeriksaPeriode(bulan, tahun).filter(p => (p.diagnosis || '').trim() === diag);
      const oldM = document.getElementById('modalDetailPenyakit');
      if (oldM) oldM.remove();
      const rows = list
        .sort((a, b) => new Date(b.tglPeriksa) - new Date(a.tglPeriksa))
        .map(p => {
          const pmObj = state.penerima.find(x => x.nomorInduk === p.nomorInduk);
          return `<tr>
            <td><strong>${escHtml(p.namaPM || '-')}</strong></td>
            <td>${escHtml(pmObj ? (pmObj.kamarBlok || '-') : '-')}</td>
            <td style="font-size:.82rem">${p.tglPeriksa ? escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')) : '-'}</td>
            <td style="font-size:.82rem">${escHtml(p.namaDokter || '-')}</td>
          </tr>`;
        }).join('');
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay show';
      overlay.id = 'modalDetailPenyakit';
      overlay.innerHTML = `<div class="modal" style="max-width:600px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <div style="font-weight:700;font-size:1.02rem;color:var(--primary)">🏥 Daftar PM — ${escHtml(diag)}</div>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('modalDetailPenyakit').remove()">✕ Tutup</button>
        </div>
        <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:.6rem;">${escHtml(list.length)} kasus tercatat pada periode yang dipilih.</div>
        <div class="table-wrap" style="max-height:400px;overflow-y:auto;">
          <table>
            <thead><tr><th>Nama PM</th><th>Asrama</th><th>Tgl Periksa</th><th>Dokter</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:1rem">Tidak ada data</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
      document.body.appendChild(overlay);
    }

    // ── Ekspor tabel 5 Penyakit Terbanyak ke Excel ──
    function exportKasiPenyakitExcel() {
      const bulan = parseInt((document.getElementById('kasiPenyakitBulan') || { value: '0' }).value);
      const tahun = parseInt((document.getElementById('kasiPenyakitTahun') || { value: '' }).value);
      const list = _filterPeriksaPeriode(bulan, tahun);
      const freq = {};
      list.forEach(p => {
        const diag = (p.diagnosis || '').trim();
        if (!diag || diag === '-') return;
        if (!freq[diag]) freq[diag] = { count: 0, pmSet: new Set() };
        freq[diag].count++;
        freq[diag].pmSet.add(p.nomorInduk);
      });
      const total = list.filter(p => (p.diagnosis || '').trim() && (p.diagnosis || '').trim() !== '-').length;
      const sorted = Object.entries(freq).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
      if (!sorted.length) { alert('Tidak ada data untuk diekspor pada periode ini.'); return; }
      const headers = ['No', 'Diagnosis / Penyakit', 'Jumlah Kasus', 'PM Unik', '% dari Total'];
      const rows = sorted.map(([diag, d], i) => [i + 1, diag, d.count, d.pmSet.size, (total > 0 ? Math.round(d.count / total * 100) : 0) + '%']);
      exportToExcel('5-penyakit-terbanyak.xlsx', '5 Penyakit Terbanyak', headers, rows, [5, 40, 14, 10, 12]);
    }

    function renderKasiInsidentalPeriksa() {
      const tbody = document.getElementById('kasiInsidentalPeriksaBody');
      if (!tbody) return;
      const bulan = parseInt((document.getElementById('kasiInsidentalPeriksa_bulan')||{value:'0'}).value||'0');
      const tahun = parseInt((document.getElementById('kasiInsidentalPeriksa_tahun')||{value:'0'}).value||'0');
      const BULAN_N = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      let insList = [...(state.insidental||[])].filter(x=>!x._deleted);
      if (bulan) insList = insList.filter(x => x.tgl && new Date(x.tgl).getMonth()+1 === bulan);
      if (tahun) insList = insList.filter(x => x.tgl && new Date(x.tgl).getFullYear() === tahun);
      // Only PM that also have a pemeriksaan on same date or after the insidental
      const rows = [];
      insList.forEach((x, idx) => {
        const periksa = (state.pemeriksaan||[]).filter(p =>
          p.nomorInduk === x.nomorInduk && new Date(p.tglPeriksa) >= new Date(x.tgl)
        ).sort((a,b) => new Date(a.tglPeriksa)-new Date(b.tglPeriksa));
        if (!periksa.length) return;
        const p = periksa[0];
        const pm = state.penerima.find(r => r.nomorInduk === x.nomorInduk);
        const bc = p.statusKondisi==='Baik'?'badge-green':p.statusKondisi==='Cukup Baik'?'badge-yellow':'badge-red';
        rows.push(`<tr>
          <td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">${rows.length+1}</td>
          <td style="font-weight:600">${escHtml(x.namaPM||'-')}</td>
          <td>${pm?escHtml(pm.kamarBlok):'-'}</td>
          <td style="white-space:nowrap">${escHtml(new Date(x.tgl).toLocaleDateString('id-ID'))}</td>
          <td style="font-size:.82rem;max-width:160px">${escHtml(x.keluhan||'-')}</td>
          <td style="white-space:nowrap">${p.tglPeriksa?escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')):'-'}</td>
          <td style="font-size:.82rem">${escHtml(p.diagnosis||'-')}</td>
          <td><span class="badge ${escHtml(bc)}">${escHtml(p.statusKondisi||'-')}</span></td>
        </tr>`);
      });
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:1.5rem">Tidak ada PM insidental yang lanjut ke pemeriksaan dokter pada periode ini</td></tr>';
        return;
      }
      tbody.innerHTML = rows.join('');
    }

    function renderKasiInsidental(q) {
      const tbody = document.getElementById('kasiInsidentalBody');
      if (!tbody) return;
      const bulan = parseInt((document.getElementById('kasiInsidentalBulan') || { value: new Date().getMonth() + 1 }).value);
      const tahun = parseInt((document.getElementById('kasiInsidentalTahun') || { value: new Date().getFullYear() }).value);
      let list = (state.insidental || []).filter(x => !x._deleted).filter(x => {
        if (!x.tgl) return false;
        const d = new Date(x.tgl);
        if (isNaN(d.getTime())) return false;
        const matchBulan = bulan === 0 || isNaN(bulan) || d.getMonth() + 1 === bulan;
        const matchTahun = isNaN(tahun) || d.getFullYear() === tahun;
        return matchBulan && matchTahun;
      }).sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
      if (q) list = list.filter(x => (x.namaPM || '').toLowerCase().includes(q.toLowerCase()));
      const _pgKasiInsidental = document.getElementById('kasiInsidentalPagination');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:1.5rem">Tidak ada keluhan insidental periode ini</td></tr>'; if (_pgKasiInsidental) _pgKasiInsidental.innerHTML=''; return; }
      list = _fltTbl('kasiInsidental', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppKasiInsidental = 100;
      const _totalPagesKasiInsidental = Math.max(1, Math.ceil(list.length / _ppKasiInsidental));
      if (_pageState.kasiInsidental > _totalPagesKasiInsidental) _pageState.kasiInsidental = _totalPagesKasiInsidental;
      const _startKasiInsidental = (_pageState.kasiInsidental - 1) * _ppKasiInsidental;
      tbody.innerHTML = '';
      list.slice(_startKasiInsidental, _startKasiInsidental + _ppKasiInsidental).forEach((x, _idx) => {
        const idx = _startKasiInsidental + _idx;
        // Cek apakah sudah ada pemeriksaan pada hari yang sama atau setelah insidental ini
        const sudahPeriksa = (state.pemeriksaan || []).some(p =>
          p.nomorInduk === x.nomorInduk && new Date(p.tglPeriksa) >= new Date(x.tgl)
        );
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">' + (escHtml(idx+1)) + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(new Date(x.tgl).toLocaleDateString('id-ID')) + (fmtWaktu(x.waktu) ? (escHtml(' ' + fmtWaktu(x.waktu))) : '') + '</td>' +
          '<td><strong>' + (escHtml(x.namaPM || '-')) + '</strong></td>' +
          '<td class="text-muted">' + (escHtml(x.kamarBlok || '-')) + '</td>' +
          '<td style="font-size:.8rem;max-width:150px">' + (escHtml(x.keluhan || '-')) + '</td>' +
          '<td style="font-size:.8rem">' + (escHtml(x.tindakan || '-')) + '</td>' +
          '<td style="font-size:.78rem;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + ((x.obatDiberikan&&x.obatDiberikan.length)?x.obatDiberikan.map(o=>(escHtml((o.nama||'')+(o.jumlah?' '+o.jumlah:''))+' '+(escHtml(o.satuan||''))).trim()).join(', '):'-') + '</td>' +
          '<td style="font-size:.8rem">' + (escHtml(x.petugas || '-')) + '</td>' +
          '<td>' + (x.perluRujukan === 'ya' ? '<span class="badge badge-red">🏥 Ya</span>' : 'Tidak') + '</td>' +
          '<td>' + (sudahPeriksa
            ? '<span style="font-size:.75rem;color:#1a6b4a;font-weight:600;">✅ Sudah Diperiksa</span>'
            : '<span style="font-size:.75rem;color:#e67e22;font-weight:600;">⏳ Belum Diperiksa</span>'
          ) + '</td>';
        const tdAksiIns = document.createElement('td');
        tdAksiIns.style.whiteSpace = 'nowrap';
        const bLihatIns = document.createElement('button');
        bLihatIns.className = 'btn btn-info btn-sm no-print'; bLihatIns.textContent = '👁';
        bLihatIns.title = 'Lihat Detail'; bLihatIns.onclick = () => lihatDetailInsidental(x.id);
        tdAksiIns.appendChild(bLihatIns);
        const bPDFins = document.createElement('button');
        bPDFins.className = 'btn btn-ghost btn-sm no-print'; bPDFins.textContent = '🖨️';
        bPDFins.onclick = () => cetakPDFInsidental(x.id);
        tdAksiIns.appendChild(bPDFins);
        tr.appendChild(tdAksiIns);
        tbody.appendChild(tr);
      });
      _renderPaginationControls('kasiInsidentalPagination', 'kasiInsidental', list.length, _ppKasiInsidental, 'renderKasiInsidental');
    }

    function lanjutInsidentalKePemeriksaan(ins) {
      // Petugas tidak punya menu Periksa Dokter → masukkan PM ke antrean dokter (prioritas "Perlu Dokter")
      if (!(ROLE_PAGES[state.role] || []).includes('pemeriksaan')) {
        masukkanAntrianDariInsidental(ins.nomorInduk, ins.status === 'Darurat' ? 'Darurat' : 'Perlu Dokter');
        showToast('✅ ' + (ins.namaPM || 'PM') + ' dimasukkan ke antrean dokter (prioritas Perlu Dokter)', 'success');
        return;
      }
      // Pindah ke halaman pemeriksaan dan prefill data dari insidental
      showPage('pemeriksaan', document.getElementById('navPemeriksaan'));
      setTimeout(() => {
        // Pilih PM
        const selPM = document.getElementById('pilihanPM');
        if (selPM) { selPM.value = ins.nomorInduk; if (typeof onPilihPM === 'function') onPilihPM(); }
        // Set tanggal hari ini
        const tglEl = document.getElementById('tglPeriksa');
        if (tglEl) tglEl.value = isoLokal(new Date());
        // Prefill keluhan dari insidental ke anamnesis/keluhan
        setTimeout(() => {
          const keluhanEl = document.getElementById('keluhan') || document.getElementById('anamnesisKeluhan') || document.getElementById('keluhanUtama');
          if (keluhanEl && ins.keluhan) keluhanEl.value = (keluhanEl.value ? keluhanEl.value + '\n' : '') + '[Insidental ' + ins.tgl + '] ' + ins.keluhan;
          showToast('✅ Data insidental ' + (ins.namaPM||'') + ' dimuat ke form pemeriksaan', 'success');
        }, 400);
      }, 300);
    }

    // ── Rekap flag lintas-PM minggu ini (triase cepat) ──
    function hitungRekapFlagMingguan() {
      const hasil = [];
      // PM yang sudah tidak aktif (keluar/meninggal) tidak ikut ditriase
      (state.penerima || []).filter(pm => !pm._deleted && isPMAktif(pm)).forEach(pm => {
        const riwayat = (state.pemeriksaan || [])
          .filter(x => !x._deleted && x.nomorInduk === pm.nomorInduk)
          .sort((a, b) => new Date(a.tglPeriksa) - new Date(b.tglPeriksa));
        if (riwayat.length === 0) return;
        const current = riwayat[riwayat.length - 1];
        const previous = riwayat.length > 1 ? riwayat[riwayat.length - 2] : null;
        const sebelumnya2 = riwayat.length > 2 ? riwayat[riwayat.length - 3] : null;
        const batas7Hari_c = new Date(current.tglPeriksa); batas7Hari_c.setDate(batas7Hari_c.getDate() - 7);
        const batasAwal = (previous && new Date(previous.tglPeriksa) > batas7Hari_c) ? new Date(previous.tglPeriksa) : batas7Hari_c;
        const batasAkhir = new Date(current.tglPeriksa);
        const rujukanAktif = (state.rujukan || []).filter(x => {
          if (x._deleted || x.nomorInduk !== pm.nomorInduk || !x.tgl) return false;
          const dMulai = new Date(x.tgl);
          const dimulaiDiPeriode = dMulai > batasAwal && dMulai <= batasAkhir;
          const dSelesai = x.tglSelesai ? new Date(x.tglSelesai) : null;
          const selesaiDiPeriode = x.statusRujukan === 'Selesai' && dSelesai && dSelesai > batasAwal && dSelesai <= batasAkhir;
          return dimulaiDiPeriode || selesaiDiPeriode;
        });
        const flags = hitungFlagMingguan(current, previous, sebelumnya2, rujukanAktif);
        if (flags.length > 0) hasil.push({ pm, current, flags });
      });
      hasil.sort((a, b) => b.flags.length - a.flags.length);
      return hasil;
    }

    function renderFlagMingguan() {
      const body = document.getElementById('flagMingguanBody');
      if (!body) return;
      const data = hitungRekapFlagMingguan();
      const countEl = document.getElementById('flagMingguanCount');
      if (countEl) countEl.textContent = String(data.length);
      if (data.length === 0) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">🎉 Tidak ada PM dengan flag peringatan saat ini</td></tr>';
        return;
      }
      body.innerHTML = data.map(d => {
        const asrama = d.pm.kamarBlok || '-';
        return `<tr>
          <td style="font-weight:600">${escHtml(d.pm.namaPM)}</td>
          <td>${escHtml(asrama)}</td>
          <td style="text-align:center"><span class="badge badge-red">${escHtml(d.flags.length)}</span></td>
          <td style="font-size:.8rem;color:#c0392b">${d.flags.map(f => '⚠️ ' + escHtml(f)).join('<br>')}</td>
          <td class="no-print"><button class="btn btn-ghost btn-sm" onclick="cetakKartuMingguanPM('${jsArg(d.current.id)}')" title="Cetak laporan mingguan PM ini">🗓️</button></td>
        </tr>`;
      }).join('');
    }

    // ── "Perlu Tindak Lanjut" di halaman Rekap — sama seperti di Lap. Kasi,
    //    memakai helper data yang sama (hitungRekapFlagMingguan, getLastPeriksa)
    //    tapi menulis ke elemen #rekap* miliknya sendiri agar tidak bentrok
    //    dengan elemen #kasi*/#flagMingguan* di halaman Kasi. ──
    function renderRekapTindakLanjut() {
      const perhatianBody = document.getElementById('rekapPerhatianBody');
      if (!perhatianBody) return; // halaman Rekap belum dirender / bukan role yg punya akses

      // 1) PM perlu perhatian / rujuk (dari pemeriksaan terakhir masing-masing PM)
      // Hanya pemeriksaan TERAKHIR tiap PM (dulu semua riwayat lama ikut tampil walau kini sudah Baik)
      const _terakhir = {};
      (state.pemeriksaan || []).forEach(p => {
        if (!p || p._deleted || !p.nomorInduk) return;
        const cur = _terakhir[p.nomorInduk];
        if (!cur || new Date(p.tglPeriksa) > new Date(cur.tglPeriksa)) _terakhir[p.nomorInduk] = p;
      });
      const listPerhatian = Object.values(_terakhir)
        .filter(p => p.statusKondisi === 'Perlu Perhatian' || p.statusKondisi === 'Rujuk')
        .filter(p => { const pmX = state.penerima.find(x => x.nomorInduk === p.nomorInduk); return !pmX || isPMAktif(pmX); })
        .sort((a, b) => new Date(b.tglPeriksa) - new Date(a.tglPeriksa));
      if (listPerhatian.length === 0) {
        perhatianBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">🎉 Tidak ada PM dengan status perlu perhatian</td></tr>';
      } else {
        perhatianBody.innerHTML = listPerhatian.map(p => {
          const pm = state.penerima.find(x => x.nomorInduk === p.nomorInduk);
          const bc = p.statusKondisi === 'Perlu Perhatian' ? 'badge-yellow' : 'badge-red';
          return `<tr>
            <td style="font-weight:600">${escHtml(p.namaPM)}</td>
            <td>${escHtml(pm ? (pm.kamarBlok || '-') : '-')}</td>
            <td><span class="badge ${escHtml(bc)}">${escHtml(p.statusKondisi)}</span></td>
            <td style="font-size:.82rem">${p.tglPeriksa ? escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')) : '-'}</td>
            <td style="font-size:.82rem">${escHtml(p.diagnosis || '-')}</td>
          </tr>`;
        }).join('');
      }

      // 2) Rekap flag minggu ini (triase cepat) — pakai helper yang sama dengan Kasi
      const flagBody = document.getElementById('rekapFlagMingguanBody');
      const flagCountEl = document.getElementById('rekapFlagMingguanCount');
      if (flagBody) {
        const dataFlag = hitungRekapFlagMingguan();
        if (flagCountEl) flagCountEl.textContent = String(dataFlag.length);
        if (dataFlag.length === 0) {
          flagBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem">🎉 Tidak ada PM dengan flag peringatan saat ini</td></tr>';
        } else {
          flagBody.innerHTML = dataFlag.map(d => `<tr>
            <td style="font-weight:600">${escHtml(d.pm.namaPM)}</td>
            <td>${escHtml(d.pm.kamarBlok || '-')}</td>
            <td style="text-align:center"><span class="badge badge-red">${escHtml(d.flags.length)}</span></td>
            <td style="font-size:.8rem;color:#c0392b">${d.flags.map(f => '⚠️ ' + escHtml(f)).join('<br>')}</td>
          </tr>`).join('');
        }
      }

      // 3) PM belum diperiksa > 3 bulan
      const belumBody = document.getElementById('rekapBelumBody');
      const belumCountEl = document.getElementById('rekapBelumCount');
      if (belumBody) {
        const now = new Date();
        const batas90 = new Date(now - 90 * 86400000);
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
        if (belumCountEl) belumCountEl.textContent = belumList.length + ' PM';
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
      }
    }

    function renderKasiPerhatian() {
      const perhatianBody = document.getElementById('kasiPerhatianBody');
      if (!perhatianBody) return;
      const filterBulan = parseInt((document.getElementById('kasiPerhatianBulan')||{}).value||'0');
      const filterTahun = parseInt((document.getElementById('kasiPerhatianTahun')||{}).value||'0');
      const filterMinggu = parseInt((document.getElementById('kasiPerhatianMinggu')||{}).value||'0');
      let list = (state.pemeriksaan||[])
        .filter(p => p.statusKondisi === 'Perlu Perhatian' || p.statusKondisi === 'Rujuk');
      if (filterBulan) list = list.filter(p => p.tglPeriksa && new Date(p.tglPeriksa).getMonth()+1 === filterBulan);
      if (filterTahun) list = list.filter(p => p.tglPeriksa && new Date(p.tglPeriksa).getFullYear() === filterTahun);
      if (filterMinggu) list = list.filter(p => p.tglPeriksa && getWeekOfMonth(new Date(p.tglPeriksa)) === filterMinggu);
      list.sort((a, b) => new Date(b.tglPeriksa) - new Date(a.tglPeriksa));
      if (list.length === 0) {
        perhatianBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem">🎉 Tidak ada PM dengan status perlu perhatian</td></tr>';
      } else {
        perhatianBody.innerHTML = list.map(p => {
          const pm = state.penerima.find(x => x.nomorInduk === p.nomorInduk);
          const bc = p.statusKondisi === 'Perlu Perhatian' ? 'badge-yellow' : 'badge-red';
          return `<tr>
        <td style="font-weight:600">${escHtml(p.namaPM)}</td>
        <td>${pm ? escHtml(pm.kamarBlok) : '-'}</td>
        <td>${pm ? escHtml(pm.jenisDis) : '-'}</td>
        <td><span class="badge ${escHtml(bc)}">${escHtml(p.statusKondisi)}</span></td>
        <td style="font-size:.82rem">${p.tglPeriksa ? escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')) : '-'}</td>
        <td style="font-size:.82rem">${escHtml(p.diagnosis || '-')}</td>
        <td class="no-print"><button class="btn btn-ghost btn-sm" onclick="cetakKartuMingguanPM('${jsArg(p.id)}')" title="Cetak laporan mingguan minggu ini">🗓️</button></td>
      </tr>`;
        }).join('');
      }
    }

    function renderKasiFoto() {
      const cont = document.getElementById('kasiFotoBody');
      if (!cont) return;
      const filterBulan = parseInt((document.getElementById('kasiFotoBulan') || {}).value || '0');
      const filterTahun = parseInt((document.getElementById('kasiFotoTahun') || {}).value || '0');
      let list = (state.fotoMinggu || []);
      if (filterBulan) list = list.filter(f => Number(f.bulan) === filterBulan);
      if (filterTahun) list = list.filter(f => Number(f.tahun) === filterTahun);
      if (!list.length) { cont.innerHTML = '<div style="color:var(--text-muted);padding:1rem;">Belum ada foto dokumentasi untuk periode ini</div>'; return; }
      cont.innerHTML = '';
      // Group by tanggal periksa
      const groups = {};
      list.slice().sort((a,b)=>String(a.tglPeriksa||'').localeCompare(String(b.tglPeriksa||''))).forEach(f => {
        const key = f.tglPeriksa || (f.bulan + '/' + f.tahun);
        if (!groups[key]) groups[key] = [];
        groups[key].push(f);
      });
      const BULAN_FULL = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      Object.entries(groups).forEach(([key, photos]) => {
        const tglLabel = photos[0].tglPeriksa
          ? new Date(photos[0].tglPeriksa).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
          : (BULAN_FULL[parseInt(key.split('/')[0])]||key) + ' ' + (key.split('/')[1]||'');
        const div = document.createElement('div');
        div.style.cssText = 'border:1.5px solid #a9dfbf;border-radius:10px;overflow:hidden;margin-bottom:.75rem;';
        div.innerHTML = '<div style="background:#e9f7ef;padding:8px 12px;font-weight:600;font-size:.83rem;color:#1a6b4a;">📅 ' + escHtml(tglLabel) + '</div>';
        const grid = document.createElement('div');
        grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:.5rem;padding:.6rem;';
        photos.forEach(f => {
          const embedUrl = getDriveEmbedUrl(f.url);
          const imgWrap = document.createElement('div');
          imgWrap.style.cssText = 'background:#fff;border:1.5px solid #a9dfbf;border-radius:8px;overflow:hidden;';
          const img = document.createElement('img');
          img.src = embedUrl; img.alt = f.label||'Foto';
          img.style.cssText = 'height:120px;width:150px;object-fit:cover;display:block;cursor:pointer;';
          img.onerror = function(){ _fotoTryProxy(img, f.url); };
          img.onclick = () => lihatFoto(f.url, f.label || ('Foto '+(f.slot||'')));
          imgWrap.appendChild(img);
          const lbl = document.createElement('div');
          lbl.style.cssText = 'font-size:.65rem;color:var(--text-muted);text-align:center;padding:2px 4px;background:#f8fffe;';
          lbl.textContent = f.label || ('Foto ' + (f.slot||''));
          imgWrap.appendChild(lbl);
          // Aksi: Lihat & Hapus
          const acts = document.createElement('div');
          acts.style.cssText = 'display:flex;gap:2px;padding:3px;background:#f0faf5;justify-content:center;';
          const bLihat = document.createElement('button');
          bLihat.textContent = '👁 Lihat'; bLihat.title = 'Lihat Foto Penuh';
          bLihat.style.cssText = 'border:none;background:#1565c0;color:white;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:.7rem;';
          bLihat.onclick = () => lihatFoto(f.url, f.label || ('Foto '+(f.slot||'')));
          const bHapus = document.createElement('button');
          bHapus.textContent = '🗑'; bHapus.title = 'Hapus Foto';
          bHapus.style.cssText = 'border:none;background:#c0392b;color:white;border-radius:5px;padding:3px 7px;cursor:pointer;font-size:.7rem;';
          bHapus.onclick = () => { hapusFotoMinggu(f.id); renderKasiFoto(); };
          acts.appendChild(bLihat); acts.appendChild(bHapus);
          imgWrap.appendChild(acts);
          grid.appendChild(imgWrap);
        });
        div.appendChild(grid);
        cont.appendChild(div);
      });
    }


    // ══════════════════════════════════════
    //  ASESMEN AWAL
    // ══════════════════════════════════════

    // ── MMT 2×2 QUADRANT WIDGET ─────────────
    const MMT_QUAD_LABELS = ['Ext. Atas Kanan', 'Ext. Atas Kiri', 'Ext. Bawah Kanan', 'Ext. Bawah Kiri'];
    let _mmtVals = ['', '', '', ''];   // index 0–3
    let _mmtActiveIdx = null;

    // Nilai MMT bisa tiba sebagai teks JSON ATAU sudah berupa array (server mengurai
    // teks "[...]" menjadi array) — dulu bentuk array membuat nilai MMT terhapus.
    function _parseMMT(v) {
      if (Array.isArray(v)) return v;
      if (!v) return null;
      try { const p = JSON.parse(v); return Array.isArray(p) ? p : null; } catch (e) { return null; }
    }
    function mmtInit(savedJson) {
      try {
        const parsed = _parseMMT(savedJson);
        if (Array.isArray(parsed) && parsed.length === 4) {
          _mmtVals = parsed.map(v => v === null || v === undefined ? '' : String(v));
        } else {
          _mmtVals = ['', '', '', ''];
        }
      } catch(e) {
        _mmtVals = ['', '', '', ''];
      }
      _mmtActiveIdx = null;
      // Only render if DOM elements exist (page may not be visible yet)
      if (document.getElementById('mmtQVal0')) mmtRender();
    }

    function mmtSave() {
      const el = document.getElementById('asMMT');
      if (el) el.value = JSON.stringify(_mmtVals);
    }

    function mmtRender() {
      // Guard: abort if MMT DOM elements don't exist
      if (!document.getElementById('mmtQVal0')) return;
      const colorFor = v => {
        if (v === '' || v === null) return { num: '#ccc', bg: 'white' };
        const n = parseInt(v);
        if (n >= 4) return { num: '#1a6b4a', bg: '#e8f5ef' };
        if (n >= 2) return { num: '#856404', bg: '#fff8e1' };
        return { num: '#c0392b', bg: '#fdecea' };
      };
      _mmtVals.forEach((v, i) => {
        const valEl = document.getElementById('mmtQVal' + i);
        const boxEl = document.getElementById('mmtQ' + i);
        if (!valEl || !boxEl) return;
        const c = colorFor(v);
        valEl.textContent = v !== '' ? v : '–';
        valEl.style.color = c.num;
        boxEl.style.background = _mmtActiveIdx === i ? '#f0f7ff' : (v !== '' ? c.bg + '88' : 'white');
        boxEl.style.outline = _mmtActiveIdx === i ? '2px solid var(--primary)' : 'none';
        boxEl.style.outlineOffset = '-2px';
      });
      // update picker highlight
      [0,1,2,3,4,5].forEach(n => {
        const btn = document.getElementById('mmtPBtn' + n);
        if (!btn) return;
        const active = _mmtActiveIdx !== null && _mmtVals[_mmtActiveIdx] === String(n);
        btn.style.background = active ? 'var(--primary)' : 'white';
        btn.style.color = active ? 'white' : '#333';
        btn.style.borderColor = active ? 'var(--primary)' : 'var(--border)';
      });
      mmtSave();
    }

    function mmtQuadClick(idx) {
      _mmtActiveIdx = (_mmtActiveIdx === idx) ? null : idx;
      const picker = document.getElementById('mmtPicker');
      const lbl = document.getElementById('mmtPickerLabel');
      if (picker) picker.style.display = _mmtActiveIdx !== null ? 'flex' : 'none';
      if (lbl && _mmtActiveIdx !== null) lbl.textContent = MMT_QUAD_LABELS[_mmtActiveIdx] + ':';
      mmtRender();
    }

    function mmtQuadSet(val) {
      if (_mmtActiveIdx === null) return;
      _mmtVals[_mmtActiveIdx] = String(val);
      mmtRender();
    }

    function mmtQuadClear() {
      if (_mmtActiveIdx === null) return;
      _mmtVals[_mmtActiveIdx] = '';
      mmtRender();
    }
    // ── END MMT WIDGET ──────────────────────

    function updateSelectAsesmen() {
      const sel = document.getElementById('asesmenPilihanPM');
      if (!sel) return;
      const cur = sel.value;
      const sorted = [...state.penerima].sort((a, b) => (a.namaPM||'').localeCompare((b.namaPM||''), 'id'));
      sel.innerHTML = '<option value="">-- Pilih PM --</option>' +
        sorted.map(p => `<option value="${escHtml(p.nomorInduk)}">${escHtml(p.namaPM)} (${escHtml(p.nomorInduk)})</option>`).join('');
      if (cur) sel.value = cur;
      pmAcUpdateDisplay('asesmenPilihanPM');
      initADLTable();
      // Init MMT widget if not yet rendered
      if (document.getElementById('mmtQVal0') && _mmtVals.every(v => v === '')) mmtInit(null);
    }

    let _asesmenPMTerisi = null;   // PM yang isiannya sedang ada di form asesmen
    function _kosongkanIsianAsesmen() {
      const lewati = { asesmenPilihanPM: 1, asesmenTgl: 1, asesmenNamaDokter: 1, asesmenSearch: 1 };
      document.querySelectorAll('#page-asesmen input, #page-asesmen textarea').forEach(el => {
        if (lewati[el.id] || /Display$/.test(el.id || '') || el.closest('#asesmenListBody')) return;
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = false;
        else if (el.type !== 'button' && el.type !== 'submit' && el.type !== 'date' && el.type !== 'file') el.value = '';
      });
      try { mmtInit(null); } catch (e) {}
    }
    function onPilihPMAsesmen() {
      const ni = document.getElementById('asesmenPilihanPM').value;
      const infoBox = document.getElementById('asesmenInfoPM');
      const infoContent = document.getElementById('asesmenInfoPMContent');
      const sudahAda = document.getElementById('asesmenSudahAda');
      if (!ni) { infoBox.style.display = 'none'; return; }
      const pm = state.penerima.find(p => p.nomorInduk === ni);
      if (!pm) { infoBox.style.display = 'none'; return; }
      const existing = state.asesmenAwal.find(a => a.nomorInduk === ni);
      // Ganti PM → kosongkan isian klinis milik PM sebelumnya. Dulu isian (NIK, anamnesa,
      // diagnosis, MMT, ADL, dst.) tertinggal dan ikut tersimpan sebagai asesmen PM yang baru dipilih.
      if (_asesmenPMTerisi !== ni) _kosongkanIsianAsesmen();
      _asesmenPMTerisi = ni;
      infoContent.innerHTML =`<strong>${escHtml(pm.namaPM)}</strong> | ${escHtml(pm.jenisDis || '-')} | Asrama: ${escHtml(pm.kamarBlok || '-')} | Masuk: ${pm.tglMasuk ? escHtml(new Date(pm.tglMasuk).toLocaleDateString('id-ID')) : '-'}`;
      sudahAda.style.display = existing ? '' : 'none';
      infoBox.style.display = '';
      // Pre-fill identitas from PM data
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
      set('asNama', pm.namaPM);
      set('asAlamat', pm.alamat || '');
      // Pre-fill TTL if tglLahir exists
      if (pm.tglLahir) {
        const d = new Date(pm.tglLahir);
        set('asTTL', d.toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' }));
      }
      // Pre-fill jenis kelamin
      if (pm.jenisKelamin) {
        document.querySelectorAll('input[name="asJK"]').forEach(r => { r.checked = r.value === pm.jenisKelamin; });
      }
      // Pre-fill dokter default
      if (state.defaultDokter) set('asesmenNamaDokter', state.defaultDokter);
      // If existing, populate all fields
      if (existing) populateAsesmenForm(existing);
    }

    function getRadioVal(name) {
      const el = document.querySelector(`input[name="${name}"]:checked`);
      return el ? el.value : '';
    }

    function getCheckboxVals(cls) {
      return [...document.querySelectorAll(`.${cls}:checked`)].map(c => c.value);
    }

    function populateAsesmenForm(a) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) isiNilaiForm(el, val || ''); };
      const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
      const setRadio = (name, val) => { document.querySelectorAll(`input[name="${name}"]`).forEach(r => r.checked = r.value === val); };
      // Tanggal & dokter asesmen lama ikut dimuat (dulu tanggal asesmen berubah jadi hari ini saat diedit)
      if (a.tglAsesmen) set('asesmenTgl', a.tglAsesmen);
      if (a.namaDokter) set('asesmenNamaDokter', a.namaDokter);
      set('asNama', a.nama); set('asNIK', a.nik); set('asTTL', a.ttl); set('asAlamat', a.alamat);
      setRadio('asJK', a.jenisKelamin);
      set('asAnamnesa', a.anamnesa);
      setRadio('asWaktuDis', a.waktuDis); set('asUsia', a.usiaOnset);
      // penyebab checkboxes
      document.querySelectorAll('.asPenyebab').forEach(c => { c.checked = (a.penyebab || []).includes(c.value); });
      setCheck('asPenyebabLainCheck', a.penyebabLainCheck); set('asPenyebabLain', a.penyebabLain);
      set('asDxUtama', a.dxUtama); set('asDxPenyerta', a.dxPenyerta);
      setRadio('asFisio', a.fisio); setRadio('asAlatSebelum', a.alatSebelum); set('asKetRehab', a.ketRehab);
      // muskuloskeletal
      set('asMMT', a.mmt); set('asMMTKet', a.mmtKet);
      mmtInit(a.mmt || null); // store values; render will happen when page opens if DOM not ready yet
      setRadio('asTonus', a.tonus); set('asTonusKet', a.tonusKet);
      setRadio('asRefleks', a.refleks); set('asRefleksKet', a.refleksKet);
      setRadio('asROM', a.rom); set('asROMKet', a.romKet);
      setRadio('asKoord', a.koord); set('asKoordKet', a.koordKet);
      // ADL
      ADL_ITEMS.forEach((_, i) => setRadio(`asADL_${i}`, (a.adl || [])[i]));
      // kondisi lain
      setRadio('asDecubitus', a.decubitus); set('asDecubitusLokasi', a.decubitusLokasi);
      setRadio('asInkont', a.inkont);
      setRadio('asNyeri', a.nyeri); set('asVAS', a.vas);
      setRadio('asBicara', a.bicara);
      setRadio('asKontraktur', a.kontraktur);
      setRadio('asAtrofi', a.atrofi);
      // alat bantu
      setCheck('asKrsiMiliki', a.krsiMiliki); setCheck('asKrsiRek', a.krsiRek); set('asKrsiKet', a.krsiKet);
      setCheck('asJalanMiliki', a.jalanMiliki); setCheck('asJalanRek', a.jalanRek); set('asJalanKet', a.jalanKet);
      setCheck('asProstetikMiliki', a.prostetikMiliki); setCheck('asProstetikRek', a.prostetikRek); set('asProstetikKet', a.prostetikKet);
      setCheck('asMatrasMiliki', a.matrasMiliki); setCheck('asMatrasRek', a.matrasRek); set('asMatrasKet', a.matrasKet);
      setCheck('asLingkMiliki', a.lingkMiliki); setCheck('asLingkRek', a.lingkRek); set('asLingkKet', a.lingkKet);
      // penilaian
      setRadio('asDerajat', a.derajat); setRadio('asPotensi', a.potensi);
      document.querySelectorAll('.asRekomendasi').forEach(c => { c.checked = (a.rekomendasi || []).includes(c.value); });
      setCheck('asRekLainCheck', a.rekLainCheck); set('asRekLain', a.rekLain);
    }

    function collectAsesmenData() {
      const ni = document.getElementById('asesmenPilihanPM').value;
      const pm = state.penerima.find(p => p.nomorInduk === ni);
      return {
        nomorInduk: ni,
        namaPM: pm ? pm.namaPM : '',
        tglAsesmen: document.getElementById('asesmenTgl').value,
        namaDokter: document.getElementById('asesmenNamaDokter').value,
        // identitas
        nama: document.getElementById('asNama').value,
        nik: document.getElementById('asNIK').value,
        jenisKelamin: getRadioVal('asJK'),
        ttl: document.getElementById('asTTL').value,
        alamat: document.getElementById('asAlamat').value,
        // riwayat disabilitas
        anamnesa: document.getElementById('asAnamnesa').value,
        waktuDis: getRadioVal('asWaktuDis'),
        usiaOnset: document.getElementById('asUsia').value,
        penyebab: getCheckboxVals('asPenyebab'),
        penyebabLainCheck: document.getElementById('asPenyebabLainCheck').checked,
        penyebabLain: document.getElementById('asPenyebabLain').value,
        dxUtama: document.getElementById('asDxUtama').value,
        dxPenyerta: document.getElementById('asDxPenyerta').value,
        fisio: getRadioVal('asFisio'),
        alatSebelum: getRadioVal('asAlatSebelum'),
        ketRehab: document.getElementById('asKetRehab').value,
        // muskuloskeletal
        mmt: document.getElementById('asMMT').value,
        mmtKet: document.getElementById('asMMTKet').value,
        tonus: getRadioVal('asTonus'), tonusKet: document.getElementById('asTonusKet').value,
        refleks: getRadioVal('asRefleks'), refleksKet: document.getElementById('asRefleksKet').value,
        rom: getRadioVal('asROM'), romKet: document.getElementById('asROMKet').value,
        koord: getRadioVal('asKoord'), koordKet: document.getElementById('asKoordKet').value,
        // ADL
        adl: ADL_ITEMS.map((_, i) => getRadioVal(`asADL_${i}`)),
        // kondisi lain
        decubitus: getRadioVal('asDecubitus'), decubitusLokasi: document.getElementById('asDecubitusLokasi').value,
        inkont: getRadioVal('asInkont'),
        nyeri: getRadioVal('asNyeri'), vas: document.getElementById('asVAS').value,
        bicara: getRadioVal('asBicara'),
        kontraktur: getRadioVal('asKontraktur'),
        atrofi: getRadioVal('asAtrofi'),
        // alat bantu
        krsiMiliki: document.getElementById('asKrsiMiliki').checked, krsiRek: document.getElementById('asKrsiRek').checked, krsiKet: document.getElementById('asKrsiKet').value,
        jalanMiliki: document.getElementById('asJalanMiliki').checked, jalanRek: document.getElementById('asJalanRek').checked, jalanKet: document.getElementById('asJalanKet').value,
        prostetikMiliki: document.getElementById('asProstetikMiliki').checked, prostetikRek: document.getElementById('asProstetikRek').checked, prostetikKet: document.getElementById('asProstetikKet').value,
        matrasMiliki: document.getElementById('asMatrasMiliki').checked, matrasRek: document.getElementById('asMatrasRek').checked, matrasKet: document.getElementById('asMatrasKet').value,
        lingkMiliki: document.getElementById('asLingkMiliki').checked, lingkRek: document.getElementById('asLingkRek').checked, lingkKet: document.getElementById('asLingkKet').value,
        // penilaian
        derajat: getRadioVal('asDerajat'),
        potensi: getRadioVal('asPotensi'),
        rekomendasi: getCheckboxVals('asRekomendasi'),
        rekLainCheck: document.getElementById('asRekLainCheck').checked,
        rekLain: document.getElementById('asRekLain').value,
        tglSimpan: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    function simpanAsesmen() {
      mmtSave(); // ensure hidden field is up-to-date before collecting
      const ni = document.getElementById('asesmenPilihanPM').value;
      if (!ni) { showAlert('alertAsesmen', 'error', '❌ Pilih Penerima Manfaat terlebih dahulu!'); showToast('Pilih Penerima Manfaat terlebih dahulu!', 'error'); return; }
      if (!document.getElementById('asesmenTgl').value) { showAlert('alertAsesmen', 'error', '❌ Tanggal asesmen harus diisi!'); showToast('Tanggal asesmen harus diisi!', 'error'); return; }
      if (!document.getElementById('asesmenNamaDokter').value.trim()) { showAlert('alertAsesmen', 'error', '❌ Nama Dokter wajib diisi!'); showToast('Nama Dokter wajib diisi!', 'error'); return; }
      const data = collectAsesmenData();
      if (data.nik && !/^\d{16}$/.test(String(data.nik).trim())) {
        showAlert('alertAsesmen', 'error', '❌ NIK harus 16 digit angka (atau kosongkan).'); return;
      }
      data.nik = String(data.nik || '').trim();
      const isEdit = !!(state._editAsesmenNI);
      const idx = state.asesmenAwal.findIndex(a => a.nomorInduk === ni);
      if (idx !== -1) {
        state.asesmenAwal[idx] = data;
        if (state.scriptUrl) kirimKeSheets('editAsesmenAwal', data);
      } else {
        state.asesmenAwal.push(data);
        if (state.scriptUrl) kirimKeSheets('addAsesmenAwal', data);
      }
      saveState();
      triggerSyncAfterSave();
      renderAsesmenList();
      renderKasiAsesmen();
      // Reset edit mode
      state._editAsesmenNI = null;
      const btn = document.getElementById('btnSimpanAsesmen');
      if (btn) btn.innerHTML = '<div class="spinner" class="spinAsesmenBtn" style="display:none"></div>💾 Simpan Asesmen Awal';
      if (isEdit) {
        showAlert('alertAsesmen', 'success', '✅ Asesmen Awal berhasil diperbarui!');
        showToast('✅ Asesmen Awal berhasil diperbarui!');
      } else {
        showAlert('alertAsesmen', 'success', '✅ Asesmen Awal berhasil disimpan!');
        showToast('✅ Asesmen Awal berhasil disimpan!');
      }
      const sudahEl = document.getElementById('asesmenSudahAda');
      if (sudahEl) sudahEl.style.display = '';
    }

    function resetFormAsesmen() {
      // Clear all inputs in the asesmen page
      document.querySelectorAll('#page-asesmen input[type="text"], #page-asesmen input[type="number"], #page-asesmen textarea').forEach(el => el.value = '');
      document.querySelectorAll('#page-asesmen input[type="radio"], #page-asesmen input[type="checkbox"]').forEach(el => el.checked = false);
      document.getElementById('asesmenPilihanPM').value = '';
      document.getElementById('asesmenTgl').value = '';
      document.getElementById('asesmenNamaDokter').value = '';
      document.getElementById('asesmenInfoPM').style.display = 'none';
      _asesmenPMTerisi = null;
      state._editAsesmenNI = null;
      try { mmtInit(null); } catch (e) {}
      showAlert('alertAsesmen', '', '');
    }

    function renderAsesmenList() {
      const tbody = document.getElementById('asesmenListBody');
      const countEl = document.getElementById('asesmenCount');
      if (!tbody) return;
      const q = ((document.getElementById('asesmenSearch') || {}).value || '').toLowerCase();
      let list = [...state.asesmenAwal];
      if (q) list = list.filter(a => (a.namaPM || '').toLowerCase().includes(q));
      if (countEl) countEl.textContent = list.length + ' data';
      const _pgAsesmenList = document.getElementById('asesmenListPagination');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:2rem">' + (q ? 'Tidak ada hasil pencarian' : 'Belum ada asesmen awal tersimpan') + '</td></tr>';
        if (_pgAsesmenList) _pgAsesmenList.innerHTML = '';
        return;
      }
      list = _fltTbl('asesmenList', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppAsesmenList = 100;
      const _totalPagesAsesmenList = Math.max(1, Math.ceil(list.length / _ppAsesmenList));
      if (_pageState.asesmenList > _totalPagesAsesmenList) _pageState.asesmenList = _totalPagesAsesmenList;
      const _startAsesmenList = (_pageState.asesmenList - 1) * _ppAsesmenList;
      tbody.innerHTML = '';
      list.slice(_startAsesmenList, _startAsesmenList + _ppAsesmenList).forEach((a, _idx) => {
        const idx = _startAsesmenList + _idx;
        const rekAll = [...(a.rekomendasi || []), ...(a.rekLainCheck && a.rekLain ? [a.rekLain] : [])];
        const derajatColor = a.derajat === 'Ringan' ? 'badge-green' : a.derajat === 'Sedang' ? 'badge-yellow' : a.derajat ? 'badge-red' : '';
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">' + (escHtml(idx+1)) + '</td>' +
          '<td style="font-weight:600">' + escHtml(a.namaPM || '-') + '</td>' +
          '<td style="font-size:.8rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escHtml(a.anamnesa || '') + '">' + escHtml(a.anamnesa || '-') + '</td>' +
          '<td style="font-size:.82rem">' + (a.usiaOnset ? escHtml(a.usiaOnset) + ' thn' : '-') + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(a.alatSebelum || '-') + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(a.dxUtama || '-') + '</td>' +
          '<td><span class="badge ' + escHtml(derajatColor) + '">' + escHtml(a.derajat || '-') + '</span></td>' +
          '<td style="font-size:.82rem">' + escHtml(a.potensi || '-') + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(a.namaDokter || '-') + '</td>' +
          '<td style="white-space:nowrap;"></td>';
        const tdAksi = tr.lastElementChild;
        const bLihatAs = document.createElement('button');
        bLihatAs.className = 'btn btn-ghost btn-sm'; bLihatAs.textContent = '👁 Lihat'; bLihatAs.style.marginRight = '3px';
        bLihatAs.onclick = () => lihatAsesmen(a.nomorInduk);
        const bEdit = document.createElement('button');
        bEdit.className = 'btn btn-accent btn-sm'; bEdit.textContent = '✏️ Edit'; bEdit.style.marginRight = '3px';
        bEdit.onclick = () => editAsesmen(a.nomorInduk);
        const bPrintAs = document.createElement('button');
        bPrintAs.className = 'btn btn-info btn-sm no-print'; bPrintAs.textContent = '🖨️ PDF'; bPrintAs.style.marginRight = '3px';
        bPrintAs.onclick = () => cetakPDFAsesmen(a.nomorInduk);
        const bHapus = document.createElement('button');
        bHapus.className = 'btn btn-ghost btn-sm'; bHapus.style.color = 'var(--danger)'; bHapus.textContent = '🗑️';
        bHapus.onclick = () => hapusAsesmen(a.nomorInduk);
        tdAksi.appendChild(bLihatAs); tdAksi.appendChild(bEdit); tdAksi.appendChild(bPrintAs); tdAksi.appendChild(bHapus);
        tbody.appendChild(tr);
      });
      _renderPaginationControls('asesmenListPagination', 'asesmenList', list.length, _ppAsesmenList, 'renderAsesmenList');
    }


    function lihatAsesmen(ni) {
      const a = state.asesmenAwal.find(x => x.nomorInduk === ni);
      if (!a) return;
      const rekAll = [...(a.rekomendasi||[]),...(a.rekLainCheck&&a.rekLain?[a.rekLain]:[])];
      const adlLabels = ADL_ITEMS;
      const adlRows = adlLabels.map((lbl,i) => {
        const val = (a.adl||[])[i]||'-';
        const c = (v) => val===v?'<strong style="color:#1a6b4a">✓ '+escHtml(v)+'</strong>':v;
        return '<tr><td style="padding:4px 8px;border:1px solid #ddd;">'+escHtml(lbl)+'</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center">'+c('Mandiri')+'</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center">'+c('Butuh Bantuan')+'</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center">'+c('Ketergantungan Total')+'</td></tr>';
      }).join('');
      const html = `<div style="font-family:Arial,sans-serif;font-size:10.5pt;padding:16px;max-height:75vh;overflow-y:auto;">
        <h3 style="color:#1a6b4a;margin-bottom:12px;">📝 Asesmen Awal — ${escHtml(a.namaPM || ni)}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:12px;">
          <tr style="background:#e8f5ef"><th colspan="4" style="padding:6px 8px;text-align:left;">Identitas Pasien</th></tr>
          <tr><td style="width:140px;padding:4px 8px;color:#555;border:1px solid #ddd">Nama</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:700">${escHtml(a.nama || a.namaPM || '-')}</td><td style="width:120px;padding:4px 8px;color:#555;border:1px solid #ddd">NIK</td><td style="padding:4px 8px;border:1px solid #ddd">${escHtml(a.nik || '-')}</td></tr>
          <tr><td style="padding:4px 8px;color:#555;border:1px solid #ddd">JK</td><td style="padding:4px 8px;border:1px solid #ddd">${escHtml(a.jenisKelamin || '-')}</td><td style="padding:4px 8px;color:#555;border:1px solid #ddd">TTL</td><td style="padding:4px 8px;border:1px solid #ddd">${escHtml(a.ttl || '-')}</td></tr>
          <tr><td style="padding:4px 8px;color:#555;border:1px solid #ddd">Alamat</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd">${escHtml(a.alamat || '-')}</td></tr>
          <tr style="background:#e8f5ef"><th colspan="4" style="padding:6px 8px;text-align:left;">Riwayat Disabilitas</th></tr>
          <tr><td style="padding:4px 8px;color:#555;border:1px solid #ddd;vertical-align:top">Anamnesa</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd">${escHtml(a.anamnesa || '-')}</td></tr>
          <tr><td style="padding:4px 8px;color:#555;border:1px solid #ddd">Waktu</td><td style="padding:4px 8px;border:1px solid #ddd">${escHtml(a.waktuDis || '-')}${a.usiaOnset ? ' (' + escHtml(a.usiaOnset) + ' thn)' : ''}</td><td style="padding:4px 8px;color:#555;border:1px solid #ddd">Fisioterapi</td><td style="padding:4px 8px;border:1px solid #ddd">${escHtml(a.fisio || '-')}</td></tr>
          <tr><td style="padding:4px 8px;color:#555;border:1px solid #ddd">Dx Utama</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:700">${escHtml(a.dxUtama || '-')}</td><td style="padding:4px 8px;color:#555;border:1px solid #ddd">Dx Penyerta</td><td style="padding:4px 8px;border:1px solid #ddd">${escHtml(a.dxPenyerta || '-')}</td></tr>
          <tr style="background:#e8f5ef"><th colspan="4" style="padding:6px 8px;text-align:left;">Muskuloskeletal</th></tr>
          <tr><td style="padding:4px 8px;color:#555;border:1px solid #ddd">MMT</td><td style="padding:4px 8px;border:1px solid #ddd" colspan="3">${escHtml((()=>{try{const p=_parseMMT(a.mmt);if(Array.isArray(p)&&p.length===4){const lbl=['ExtA-Ka','ExtA-Ki','ExtB-Ka','ExtB-Ki'];return p.map((v,i)=>lbl[i]+':'+(v||'–')).join(' | ');}return a.mmt||'-';}catch(e){return a.mmt||'-';}})())}</td></tr>
          <tr><td style="padding:4px 8px;color:#555;border:1px solid #ddd">Tonus</td><td style="padding:4px 8px;border:1px solid #ddd">${escHtml(a.tonus || '-')}</td><td style="padding:4px 8px;color:#555;border:1px solid #ddd">ROM</td><td style="padding:4px 8px;border:1px solid #ddd">${escHtml(a.rom || '-')}</td></tr>
        </table>
        <div style="margin-bottom:8px;font-weight:600;color:#1a6b4a;">Fungsi ADL:</div>
        <table style="width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:12px;">
          <thead><tr style="background:#e8f5ef"><th style="padding:5px 8px;border:1px solid #ddd;text-align:left">Aktivitas</th><th style="padding:5px 8px;border:1px solid #ddd">Mandiri</th><th style="padding:5px 8px;border:1px solid #ddd">Butuh Bantuan</th><th style="padding:5px 8px;border:1px solid #ddd">Ketergt. Total</th></tr></thead>
          <tbody>${adlRows}</tbody>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:8px;">
          <tr style="background:#e8f5ef"><th colspan="4" style="padding:6px 8px;text-align:left;">Penilaian & Rekomendasi</th></tr>
          <tr><td style="width:150px;padding:4px 8px;color:#555;border:1px solid #ddd">Derajat Disabilitas</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:700">${escHtml(a.derajat || '-')}</td><td style="width:130px;padding:4px 8px;color:#555;border:1px solid #ddd">Potensi Rehab</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:700">${escHtml(a.potensi || '-')}</td></tr>
          <tr><td style="padding:4px 8px;color:#555;border:1px solid #ddd;vertical-align:top">Rekomendasi</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd">${escHtml(rekAll.join(', ') || '-')}</td></tr>
        </table>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:12px;">
          <button class="btn btn-info btn-sm" onclick="cetakPDFAsesmen('${jsArg(ni)}')">🖨️ Cetak PDF</button>
          <button class="btn btn-ghost btn-sm" onclick="tutupModal('modalLihatAsesmen')">✕ Tutup</button>
        </div>
      </div>`;
      document.getElementById('modalLihatAsesmenContent').innerHTML = html;
      document.getElementById('modalLihatAsesmen').classList.add('show');
    }

    function editAsesmen(ni) {
      const a = state.asesmenAwal.find(x => x.nomorInduk === ni);
      if (!a) return;
      // Set PM selector
      const sel = document.getElementById('asesmenPilihanPM');
      if (sel) { sel.value = ni; onPilihPMAsesmen(); }
      // Populate form with existing data
      populateAsesmenForm(a);
      // Set edit mode flag
      state._editAsesmenNI = ni;
      // Update button label
      const btn = document.getElementById('btnSimpanAsesmen');
      if (btn) btn.innerHTML = '<div class="spinner" class="spinAsesmenBtn" style="display:none"></div>💾 Simpan Perubahan';
      // Scroll to top of form
      const page = document.getElementById('page-asesmen');
      if (page) page.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast('Form diisi ulang — silakan edit dan simpan.');
    }

    function hapusAsesmen(ni) {
      const a = state.asesmenAwal.find(x => x.nomorInduk === ni);
      if (!a) return;
      if (!confirm('Hapus asesmen awal ' + (a.namaPM || ni) + '?')) return;
      state.asesmenAwal = state.asesmenAwal.filter(x => x.nomorInduk !== ni);
      if (state.scriptUrl) kirimKeSheets('deleteAsesmenAwal', { nomorInduk: ni });
      saveState();
      renderAsesmenList();
      try { renderKasiAsesmen(); } catch (e) {}
      showToast('Asesmen awal berhasil dihapus.', 'info');
    }

    function renderKasiAsesmen() {
      const tbody = document.getElementById('kasiAsesmenBody');
      const countEl = document.getElementById('kasiAsesmenCount');
      if (!tbody) return;
      const q = ((document.getElementById('kasiAsesmenSearch') || {}).value || '').toLowerCase();
      let list = [...state.asesmenAwal].sort((a, b) => new Date(b.tglSimpan || 0) - new Date(a.tglSimpan || 0));
      if (q) list = list.filter(a => (a.namaPM || '').toLowerCase().includes(q));
      if (countEl) countEl.textContent = list.length + ' data';
      const _pgKasiAsesmen = document.getElementById('kasiAsesmenPagination');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:2rem">' + (q ? 'Tidak ada hasil pencarian' : 'Belum ada asesmen awal PM baru') + '</td></tr>';
        if (_pgKasiAsesmen) _pgKasiAsesmen.innerHTML = '';
        return;
      }
      list = _fltTbl('kasiAsesmen', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppKasiAsesmen = 100;
      const _totalPagesKasiAsesmen = Math.max(1, Math.ceil(list.length / _ppKasiAsesmen));
      if (_pageState.kasiAsesmen > _totalPagesKasiAsesmen) _pageState.kasiAsesmen = _totalPagesKasiAsesmen;
      const _startKasiAsesmen = (_pageState.kasiAsesmen - 1) * _ppKasiAsesmen;
      tbody.innerHTML = '';
      list.slice(_startKasiAsesmen, _startKasiAsesmen + _ppKasiAsesmen).forEach((a, _idx) => {
        const idx = _startKasiAsesmen + _idx;
        const rekAll = [...(a.rekomendasi || []), ...(a.rekLainCheck && a.rekLain ? [a.rekLain] : [])];
        const derajatColor = a.derajat === 'Ringan' ? 'badge-green' : a.derajat === 'Sedang' ? 'badge-yellow' : a.derajat ? 'badge-red' : '';
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">' + (escHtml(idx+1)) + '</td>' +
          '<td style="font-weight:600">' + (escHtml(a.namaPM || '-')) + '</td>' +
          '<td style="font-size:.8rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (escHtml(a.anamnesa || '')) + '">' + (escHtml(a.anamnesa || '-')) + '</td>' +
          '<td style="font-size:.82rem">' + (a.usiaOnset ? escHtml(a.usiaOnset + ' thn') : '-') + '</td>' +
          '<td style="font-size:.82rem">' + (escHtml(a.alatSebelum || '-')) + '</td>' +
          '<td style="font-size:.82rem">' + (escHtml(a.dxUtama || '-')) + '</td>' +
          '<td><span class="badge ' + escHtml(derajatColor) + '">' + (escHtml(a.derajat || '-')) + '</span></td>' +
          '<td style="font-size:.82rem">' + (escHtml(a.potensi || '-')) + '</td>' +
          '<td style="font-size:.78rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escHtml(rekAll.join(', ')) + '">' + (escHtml(rekAll.join(', ') || '-')) + '</td>' +
          '<td style="font-size:.82rem">' + (escHtml(a.namaDokter || '-')) + '</td>' +
          '<td style="white-space:nowrap;"></td>';
        const tdAksi = tr.lastElementChild;
        const bPrint = document.createElement('button');
        bPrint.className = 'btn btn-info btn-sm no-print'; bPrint.textContent = '🖨️ PDF';
        bPrint.onclick = () => cetakPDFAsesmen(a.nomorInduk);
        tdAksi.appendChild(bPrint);
        tbody.appendChild(tr);
      });
      _renderPaginationControls('kasiAsesmenPagination', 'kasiAsesmen', list.length, _ppKasiAsesmen, 'renderKasiAsesmen');
    }

    function cetakPDFAsesmen(ni) {
      const a = state.asesmenAwal.find(x => x.nomorInduk === ni);
      if (!a) return;
      const rekAll = [...(a.rekomendasi || []), ...(a.rekLainCheck && a.rekLain ? [a.rekLain] : [])];
      const adlLabels = ['Makan','Mandi','Berpakaian','Buang air kecil/besar','Mobilitas tempat tidur','Mobilitas kursi roda / alat bantu'];
      const adlRows = adlLabels.map((lbl, i) => {
        const val = (a.adl || [])[i] || '-';
        return '<tr><td style="padding:5px 8px;border:1px solid #ccc">' + escHtml(lbl) + '</td>' +
          '<td style="padding:5px 8px;border:1px solid #ccc;text-align:center">' + (val === 'Mandiri' ? '✓' : '') + '</td>' +
          '<td style="padding:5px 8px;border:1px solid #ccc;text-align:center">' + (val === 'Butuh Bantuan' ? '✓' : '') + '</td>' +
          '<td style="padding:5px 8px;border:1px solid #ccc;text-align:center">' + (val === 'Ketergantungan Total' ? '✓' : '') + '</td></tr>';
      }).join('');
      const penyebabList = [...(a.penyebab || []), ...(a.penyebabLainCheck && a.penyebabLain ? [a.penyebabLain] : [])].join(', ') || '-';
      const html = `
<div style="font-family:Arial,sans-serif;font-size:11pt;max-width:800px;margin:0 auto;">
  ${renderKopSuratHTML()}
  <div style="padding:16px 20px 0;">
  <div style="text-align:center;border-bottom:2px solid #1a6b4a;padding-bottom:8px;margin-bottom:14px;">
    <div style="font-size:12pt;font-weight:700;margin-top:4px;">FORMULIR ASESMEN MEDIS PENYANDANG DISABILITAS FISIK</div>
    <div style="font-size:9pt;color:#888;">FRM.SPFA.00 | Dicetak: ${escHtml(new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}))}</div>
  </div>

  <div style="margin-bottom:12px;">
    <div style="font-weight:700;font-size:10.5pt;background:#e8f5ef;padding:5px 8px;margin-bottom:6px;">IDENTITAS PASIEN</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="width:160px;padding:3px 6px;color:#555">Nama Lengkap</td><td style="padding:3px 6px">: <strong>${escHtml(a.nama || a.namaPM || '-')}</strong></td>
          <td style="width:100px;padding:3px 6px;color:#555">NIK</td><td style="padding:3px 6px">: ${escHtml(a.nik || '-')}</td></tr>
      <tr><td style="padding:3px 6px;color:#555">Jenis Kelamin</td><td style="padding:3px 6px">: ${escHtml(a.jenisKelamin || '-')}</td>
          <td style="padding:3px 6px;color:#555">TTL</td><td style="padding:3px 6px">: ${escHtml(a.ttl || '-')}</td></tr>
      <tr><td style="padding:3px 6px;color:#555">Alamat</td><td colspan="3" style="padding:3px 6px">: ${escHtml(a.alamat || '-')}</td></tr>
    </table>
  </div>

  <div style="margin-bottom:12px;">
    <div style="font-weight:700;font-size:10.5pt;background:#e8f5ef;padding:5px 8px;margin-bottom:6px;">RIWAYAT DISABILITAS</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="width:160px;padding:3px 6px;color:#555;vertical-align:top">Anamnesa</td><td style="padding:3px 6px">: ${escHtml(a.anamnesa || '-')}</td></tr>
      <tr><td style="padding:3px 6px;color:#555">Waktu Disabilitas</td><td style="padding:3px 6px">: ${escHtml(a.waktuDis || '-')}${a.usiaOnset ? ', usia onset: ' + escHtml(a.usiaOnset) + ' tahun' : ''}</td></tr>
      <tr><td style="padding:3px 6px;color:#555">Penyebab</td><td style="padding:3px 6px">: ${escHtml(penyebabList)}</td></tr>
      <tr><td style="padding:3px 6px;color:#555">Diagnosis Utama</td><td style="padding:3px 6px">: <strong>${escHtml(a.dxUtama || '-')}</strong></td></tr>
      <tr><td style="padding:3px 6px;color:#555">Diagnosis Penyerta</td><td style="padding:3px 6px">: ${escHtml(a.dxPenyerta || '-')}</td></tr>
      <tr><td style="padding:3px 6px;color:#555">Pernah Fisioterapi</td><td style="padding:3px 6px">: ${escHtml(a.fisio || '-')} &nbsp;&nbsp; Alat bantu sebelum UPT: ${escHtml(a.alatSebelum || '-')}</td></tr>
      <tr><td style="padding:3px 6px;color:#555">Ket. Lain</td><td style="padding:3px 6px">: ${escHtml(a.ketRehab || '-')}</td></tr>
    </table>
  </div>

  <div style="margin-bottom:12px;">
    <div style="font-weight:700;font-size:10.5pt;background:#e8f5ef;padding:5px 8px;margin-bottom:6px;">PEMERIKSAAN MUSKULOSKELETAL & NEUROMOTIK</div>
    <table style="width:100%;border-collapse:collapse;font-size:10pt;">
      <thead><tr style="background:#f0f0f0"><th style="padding:5px 8px;border:1px solid #ccc;text-align:left">Pemeriksaan</th><th style="padding:5px 8px;border:1px solid #ccc;text-align:left">Temuan Klinis</th><th style="padding:5px 8px;border:1px solid #ccc;text-align:left">Keterangan</th></tr></thead>
      <tbody>
        <tr><td style="padding:5px 8px;border:1px solid #ccc">Kekuatan otot (MMT 0–5)</td><td style="padding:5px 8px;border:1px solid #ccc">${(()=>{try{const p=_parseMMT(a.mmt);if(Array.isArray(p)&&p.length===4){const lbl=['Ext. Atas Kanan','Ext. Atas Kiri','Ext. Bawah Kanan','Ext. Bawah Kiri'];return p.map((v,i)=>escHtml(lbl[i])+': <b>'+escHtml(v||'–')+'</b>').join(' &nbsp;|&nbsp; ');}return escHtml(a.mmt||'-');}catch(e){return escHtml(a.mmt||'-');}})()}</td><td style="padding:5px 8px;border:1px solid #ccc">${escHtml(a.mmtKet || '-')}</td></tr>
        <tr><td style="padding:5px 8px;border:1px solid #ccc">Tonus otot</td><td style="padding:5px 8px;border:1px solid #ccc">${escHtml(a.tonus || '-')}</td><td style="padding:5px 8px;border:1px solid #ccc">${escHtml(a.tonusKet || '-')}</td></tr>
        <tr><td style="padding:5px 8px;border:1px solid #ccc">Refleks</td><td style="padding:5px 8px;border:1px solid #ccc">${escHtml(a.refleks || '-')}</td><td style="padding:5px 8px;border:1px solid #ccc">${escHtml(a.refleksKet || '-')}</td></tr>
        <tr><td style="padding:5px 8px;border:1px solid #ccc">ROM Sendi</td><td style="padding:5px 8px;border:1px solid #ccc">${escHtml(a.rom || '-')}</td><td style="padding:5px 8px;border:1px solid #ccc">${escHtml(a.romKet || '-')}</td></tr>
        <tr><td style="padding:5px 8px;border:1px solid #ccc">Koordinasi & Keseimbangan</td><td style="padding:5px 8px;border:1px solid #ccc">${escHtml(a.koord || '-')}</td><td style="padding:5px 8px;border:1px solid #ccc">${escHtml(a.koordKet || '-')}</td></tr>
      </tbody>
    </table>
  </div>

  <div style="margin-bottom:12px;">
    <div style="font-weight:700;font-size:10.5pt;background:#e8f5ef;padding:5px 8px;margin-bottom:6px;">FUNGSI ADL (Skala FIM)</div>
    <table style="width:100%;border-collapse:collapse;font-size:10pt;">
      <thead><tr style="background:#f0f0f0"><th style="padding:5px 8px;border:1px solid #ccc;text-align:left">Aktivitas</th><th style="padding:5px 8px;border:1px solid #ccc;text-align:center">Mandiri</th><th style="padding:5px 8px;border:1px solid #ccc;text-align:center">Butuh Bantuan</th><th style="padding:5px 8px;border:1px solid #ccc;text-align:center">Ketergantungan Total</th></tr></thead>
      <tbody>${adlRows}</tbody>
    </table>
  </div>

  <div style="margin-bottom:12px;">
    <div style="font-weight:700;font-size:10.5pt;background:#e8f5ef;padding:5px 8px;margin-bottom:6px;">KONDISI LAIN & ALAT BANTU</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="width:160px;padding:3px 6px;color:#555">Decubitus</td><td style="padding:3px 6px">: ${escHtml(a.decubitus || '-')}${a.decubitusLokasi ? ' — ' + escHtml(a.decubitusLokasi) : ''}</td>
          <td style="width:120px;padding:3px 6px;color:#555">Inkontinensia</td><td style="padding:3px 6px">: ${escHtml(a.inkont || '-')}</td></tr>
      <tr><td style="padding:3px 6px;color:#555">Nyeri Kronik</td><td style="padding:3px 6px">: ${escHtml(a.nyeri || '-')}${a.vas ? ' (VAS: ' + escHtml(a.vas) + ')' : ''}</td>
          <td style="padding:3px 6px;color:#555">Berbicara</td><td style="padding:3px 6px">: ${escHtml(a.bicara || '-')}</td></tr>
      <tr><td style="padding:3px 6px;color:#555">Kontraktur Sendi</td><td style="padding:3px 6px">: ${escHtml(a.kontraktur || '-')}</td>
          <td style="padding:3px 6px;color:#555">Atrofi Otot</td><td style="padding:3px 6px">: ${escHtml(a.atrofi || '-')}</td></tr>
    </table>
  </div>

  <div style="margin-bottom:16px;">
    <div style="font-weight:700;font-size:10.5pt;background:#e8f5ef;padding:5px 8px;margin-bottom:6px;">PENILAIAN DAN REKOMENDASI</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="width:180px;padding:3px 6px;color:#555">Derajat Disabilitas</td><td style="padding:3px 6px">: <strong>${escHtml(a.derajat || '-')}</strong></td></tr>
      <tr><td style="padding:3px 6px;color:#555">Potensi Rehabilitasi</td><td style="padding:3px 6px">: <strong>${escHtml(a.potensi || '-')}</strong></td></tr>
      <tr><td style="padding:3px 6px;color:#555;vertical-align:top">Rekomendasi Intervensi</td><td style="padding:3px 6px">: ${rekAll.length ? '• ' + rekAll.map(escHtml).join('<br>• ') : '-'}</td></tr>
    </table>
  </div>

  <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:10pt;">
    <div style="text-align:center;">
      <div>Mengetahui,</div>
      <div>Kepala Seksi Pelayanan Sosial</div>
      <div>UPT RSBD Pasuruan</div>
      <div style="margin-top:40px;"><strong>SUNARDI, S.Pd</strong></div>
      <div>NIP. 19780418 201101 1 006</div>
    </div>
    <div style="text-align:center;">
      <div>Pasuruan, ${a.tglAsesmen ? escHtml(new Date(a.tglAsesmen).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})) : '-'}</div>
      <div>Dokter yang Memeriksa,</div>
      ${state.ttdDokterBase64 && state.ttdDokterBase64.length > 10
        ? '<img src="' + safeUrl(state.ttdDokterBase64) + '" style="height:55px;max-width:130px;object-fit:contain;display:block;margin:4px auto 0;" onerror="this.remove()">'
        : '<div style="margin-top:40px;"></div>'}
      <div><strong>${escHtml(a.namaDokter || '____________________')}</strong></div>
      <div>NIP. ____________________</div>
    </div>
  </div>
  </div>
</div>`;
      printKartuIsolated(html);
    }



    //  PDF GENERATORS
    // ══════════════════════════════════════

    function cetakPDFRiwayat(id) {
      const p = state.pemeriksaan.find(x => String(x.id) === String(id));
      if (!p) return;
      const pm = state.penerima.find(x => x.nomorInduk === p.nomorInduk);
      const tglStr = p.tglPeriksa ? new Date(p.tglPeriksa).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '-';
      const statusColor = p.statusKondisi === 'Baik' ? '#155724' : p.statusKondisi === 'Cukup Baik' ? '#856404' : '#721c24';
      const statusBg = p.statusKondisi === 'Baik' ? '#d4edda' : p.statusKondisi === 'Cukup Baik' ? '#fff3cd' : '#fdecea';
      const ttdSrc = resolveTTDSrc && resolveTTDSrc(p.ttdDokter);

      const body = `
        ${_pdfHeader('LAPORAN HASIL PEMERIKSAAN KESEHATAN', 'Penerima Manfaat — UPT Rehabilitasi Sosial Bina Daksa Pasuruan')}
        <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:14px;page-break-inside:avoid;break-inside:avoid;">
          <tr style="page-break-inside:avoid;"><td style="width:160px;padding:4px 6px;color:#555;border:1px solid #ddd;">Nama PM</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:700;">${escHtml(p.namaPM||'-')}</td>
              <td style="width:130px;padding:4px 6px;color:#555;border:1px solid #ddd;">No. Induk</td><td style="padding:4px 8px;border:1px solid #ddd;font-family:monospace;">${escHtml(p.nomorInduk||'-')}</td></tr>
          <tr style="page-break-inside:avoid;"><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Asrama</td><td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(pm?pm.kamarBlok:'-')}</td>
              <td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Tanggal Periksa</td><td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(tglStr)}</td></tr>
          <tr style="page-break-inside:avoid;"><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Dokter</td><td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(p.namaDokter||'-')}</td>
              <td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Minggu Ke</td><td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(p.mingguKe||'-')}</td></tr>
        </table>
        <div style="font-weight:700;font-size:10.5pt;background:#e8f5ef;padding:6px 10px;margin-bottom:8px;page-break-after:avoid;">🩺 HASIL PEMERIKSAAN</div>
        <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:14px;">
          <tr style="page-break-inside:avoid;"><td style="width:160px;padding:4px 6px;color:#555;border:1px solid #ddd;">Tekanan Darah</td><td style="padding:4px 8px;border:1px solid #ddd;font-family:monospace;font-weight:600;">${escHtml(p.tekananDarah||'-')}</td>
              <td style="width:130px;padding:4px 6px;color:#555;border:1px solid #ddd;">Nadi</td><td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(p.nadi||'-')} /mnt</td></tr>
          <tr style="page-break-inside:avoid;"><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Suhu</td><td style="padding:4px 8px;border:1px solid #ddd;">${p.suhuTubuh?escHtml(p.suhuTubuh+'°C'):'-'}</td>
              <td style="padding:4px 6px;color:#555;border:1px solid #ddd;">SpO2</td><td style="padding:4px 8px;border:1px solid #ddd;">${p.spo2?escHtml(p.spo2+'%'):'-'}</td></tr>
          <tr style="page-break-inside:avoid;"><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Berat Badan</td><td style="padding:4px 8px;border:1px solid #ddd;">${p.beratBadan?escHtml(p.beratBadan+' kg'):'-'}</td>
              <td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Pernapasan</td><td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(p.pernapasan||'-')} /mnt</td></tr>
          <tr style="page-break-inside:avoid;"><td style="padding:4px 6px;color:#555;border:1px solid #ddd;vertical-align:top">Anamnesa</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(p.keluhan||'-')}</td></tr>
          <tr style="page-break-inside:avoid;"><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Diagnosis</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:700;">${escHtml(p.diagnosis||'-')}</td>
              <td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Status Kondisi</td>
              <td style="padding:4px 8px;border:1px solid #ddd;"><span style="background:${escHtml(statusBg)};color:${escHtml(statusColor)};padding:2px 10px;border-radius:8px;font-weight:700;font-size:10pt;">${escHtml(p.statusKondisi||'-')}</span></td></tr>
          <tr style="page-break-inside:avoid;"><td style="padding:4px 6px;color:#555;border:1px solid #ddd;vertical-align:top">Tindakan</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(p.tindakan||'-')}</td></tr>
          <tr style="page-break-inside:avoid;"><td style="padding:4px 6px;color:#555;border:1px solid #ddd;vertical-align:top">Edukasi dan Pemantauan</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(p.rencana||'-')}</td></tr>
          ${p.perluRujukan==='ya'?`<tr style="page-break-inside:avoid;"><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Rujukan</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;color:#c0392b;font-weight:700;">🏥 Dirujuk ke: ${escHtml(p.tujuanRujukan||p.tujuanRujukanDokter||'-')}</td></tr>`:''}
        </table>
        ${ttdSrc ? '<div style="margin-bottom:8px;page-break-inside:avoid;"><div style="font-size:9pt;color:#666;margin-bottom:4px;">TTD Dokter:</div><img src="' + safeUrl(ttdSrc) + '" style="height:55px;max-width:130px;object-fit:contain;" onerror="this.remove()"></div>' : ''}
      `;
      cetakPDFIsolated(_pdfWrap(body, tglStr));
    }

    function cetakPDFInsidental(id) {
      const x = (state.insidental||[]).find(i => String(i.id) === String(id));
      if (!x) return;
      const tglStr = x.tgl ? new Date(x.tgl).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '-';
      const body = `
        ${_pdfHeader('LAPORAN KELUHAN INSIDENTAL', 'UPT Rehabilitasi Sosial Bina Daksa Pasuruan')}
        <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:14px;">
          <tr><td style="width:150px;padding:4px 6px;color:#555;border:1px solid #ddd;">Nama PM</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:700;">${escHtml(x.namaPM||'-')}</td>
              <td style="width:130px;padding:4px 6px;color:#555;border:1px solid #ddd;">Asrama</td><td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(x.kamarBlok||'-')}</td></tr>
          <tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Tanggal</td><td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(tglStr)}</td>
              <td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Waktu</td><td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(fmtWaktu(x.waktu)||'-')}</td></tr>
          <tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Petugas</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(x.petugas||'-')}</td></tr>
          <tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;vertical-align:top">Keluhan</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(x.keluhan||'-')}</td></tr>
          <tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;vertical-align:top">Tindakan</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(x.tindakan||'-')}</td></tr>
          <tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Perlu Rujukan</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;${x.perluRujukan==='ya'?'color:#c0392b;font-weight:700;':''}">${x.perluRujukan==='ya'?'🏥 Ya':'Tidak'}</td></tr>
          ${x.catatanDokter?`<tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;vertical-align:top">Catatan Dokter</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(x.catatanDokter)}</td></tr>`:''}
        </table>
      `;
      cetakPDFIsolated(_pdfWrap(body, tglStr));
    }

    async function cetakPDFRujukan(id) {
      const x = (state.rujukan||[]).find(r => String(r.id) === String(id));
      if (!x) return;
      const tglStr = x.tgl ? new Date(x.tgl).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '-';

      // ── Resolve foto: base64 langsung atau via GAS proxy untuk Drive URL ──
      async function _resolveFotoRuj(url) {
        if (!url) return null;
        if (url.startsWith('data:')) return url;
        // Ekstrak fileId dari Drive URL
        const m1 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const m2 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        const fileId = (m1 && m1[1]) || (m2 && m2[1]);
        if (fileId && state.scriptUrl) {
          try {
            const resp = await new Promise(function(res5, rej5) {
              const xhr5 = new XMLHttpRequest();
              const t5 = setTimeout(function(){ xhr5.abort(); rej5(new Error('Timeout')); }, 30000);
              xhr5.open('GET', state.scriptUrl + '?action=getPhotoBase64&fileId=' + encodeURIComponent(fileId), true);
              xhr5.onload = function(){ clearTimeout(t5); res5({ ok: true, text: () => Promise.resolve(xhr5.responseText), json: () => Promise.resolve(JSON.parse(xhr5.responseText)) }); };
              xhr5.onerror = function(){ clearTimeout(t5); rej5(new Error('XHR error')); };
              xhr5.onabort = function(){ clearTimeout(t5); rej5(new Error('Timeout')); };
              xhr5.send();
            });
            if (resp.ok) { const j = await resp.json(); if (j.ok && j.data) return j.data; }
          } catch(e) {}
          return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w400';
        }
        return url;
      }

      const fotoUrls = [x.foto1, x.foto2, x.foto3].filter(Boolean);
      let fotoHtml = '';
      if (fotoUrls.length) {
        showToast('⏳ Menyiapkan foto bukti...', 'info');
        const srcs = await Promise.all(fotoUrls.map(u => _resolveFotoRuj(u)));
        const validSrcs = srcs.filter(Boolean);
        if (validSrcs.length) {
          fotoHtml = `<div style="margin-top:14px;"><div style="font-weight:700;font-size:10pt;background:#f3e8ff;padding:6px 10px;margin-bottom:8px;border-left:4px solid #8e44ad;">📸 BUKTI FOTO</div>
            <div style="display:flex;flex-wrap:wrap;gap:10px;">
              ${validSrcs.map(src => `<img src="${safeUrl(src)}" style="height:130px;max-width:180px;object-fit:cover;border-radius:6px;border:1.5px solid #c39bd3;" onerror="this.style.display='none'">`).join('')}
            </div></div>`;
        }
      }

      const body = `
        <div style="text-align:center;margin:0 0 12px;">
          <div style="font-size:12pt;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#1a2b1a;">Surat Laporan Data Rujukan</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:14px;">
          <tr><td style="width:150px;padding:4px 6px;color:#555;border:1px solid #ddd;">Nama PM</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:700;">${escHtml(x.namaPM||'-')}</td>
              <td style="width:130px;padding:4px 6px;color:#555;border:1px solid #ddd;">Tanggal</td><td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(tglStr)}</td></tr>
          <tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Jenis Rujukan</td><td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(x.jenis||'-')}</td>
              <td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Tujuan RS</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:700;">${escHtml(x.tujuan||'-')}</td></tr>
          <tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Diagnosis</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;font-weight:700;">${escHtml(x.diagnosis||'-')}</td></tr>
          <tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;vertical-align:top">Alasan Rujukan</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(x.alasan||'-')}</td></tr>
          <tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;vertical-align:top">Hasil / Laporan</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(x.hasil||'-')}</td></tr>
          ${x.tindakLanjut ? `<tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;vertical-align:top">Catatan Tindak Lanjut</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(x.tindakLanjut)}</td></tr>` : ''}
          <tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">BPJS / Jaminan</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(x.jaminan||'-')}</td></tr>
          <tr><td style="padding:4px 6px;color:#555;border:1px solid #ddd;">Dokter Perujuk</td><td colspan="3" style="padding:4px 8px;border:1px solid #ddd;">${escHtml(x.dokter||state.defaultDokter||'-')}</td></tr>
        </table>
        ${fotoHtml}
      `;
      printKartuIsolated(_pdfWrap(body, tglStr), true);
    }
