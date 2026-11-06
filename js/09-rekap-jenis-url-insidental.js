    // ══════════════════════════════════════
    //  REKAP BULANAN
    // ══════════════════════════════════════
    function renderRekap() {
      renderRekapTindakLanjut();
      const bulan = parseInt(document.getElementById('filterBulan').value);
      const tahun = parseInt(document.getElementById('filterTahun').value);
      const filterAsrama = document.getElementById('filterAsrama').value;
      const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

      const filtered = state.pemeriksaan.filter(p => {
        const d = new Date(p.tglPeriksa);
        return (bulan === 0 || isNaN(bulan) || d.getMonth() + 1 === bulan) && d.getFullYear() === tahun;
      });

      const container = document.getElementById('rekapBody');
      // NIP print header
      const nipEl = document.getElementById('nipPrintPetugas');
      if (nipEl) nipEl.textContent = state.namaPetugas || '-';
      const nipTglEl = document.getElementById('nipPrintTgl');
      if (nipTglEl) nipTglEl.textContent = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      // Render foto minggu dari state
      renderFotoMinggu();
      // Load link foto tersimpan
      const fmLinks = (state.fotoMinggu || []).filter(f => f.isLink && (bulan === 0 || isNaN(bulan) || f.bulan === bulan) && (isNaN(tahun) || f.tahun === tahun));
      if (fmLinks.length >= 1 && document.getElementById('fotoMingguLink1')) document.getElementById('fotoMingguLink1').value = fmLinks[0] ? fmLinks[0].url : '';
      if (fmLinks.length >= 2 && document.getElementById('fotoMingguLink2')) document.getElementById('fotoMingguLink2').value = fmLinks[1] ? fmLinks[1].url : '';
      if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:3rem">Tidak ada data untuk ${escHtml(BULAN[bulan])} ${escHtml(tahun)}.</div>`;
        return;
      }

      const byPM = {};
      filtered.forEach(p => {
        // filter asrama
        if (filterAsrama) {
          const pm = state.penerima.find(x => x.nomorInduk === p.nomorInduk);
          if (!pm || pm.kamarBlok !== filterAsrama) return;
        }
        if (!byPM[p.nomorInduk]) {
          const _pmN = state.penerima.find(x => x.nomorInduk === p.nomorInduk);
          byPM[p.nomorInduk] = { namaPM: p.namaPM || (_pmN && _pmN.namaPM) || String(p.nomorInduk || '-'), records: [] };
        }
        byPM[p.nomorInduk].records.push(p);
      });

      if (Object.keys(byPM).length === 0) {
        container.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:3rem">Tidak ada data untuk filter yang dipilih.</div>`;
        return;
      }

      // Group by asrama
      const byAsrama = {};
      Object.entries(byPM).forEach(([id, pm]) => {
        const pmData = state.penerima.find(p => p.nomorInduk === id);
        const asrama = pmData ? (pmData.kamarBlok || 'Tidak Diketahui') : 'Tidak Diketahui';
        if (!byAsrama[asrama]) byAsrama[asrama] = [];
        byAsrama[asrama].push({ id, ...pm });
      });

      const totalPM = Object.keys(byPM).length;
      const totalPeriksa = filtered.length;

      let html = `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
      <div style="font-weight:600;color:var(--primary)">📊 ${escHtml(BULAN[bulan])} ${escHtml(tahun)}${filterAsrama ? escHtml(' — ' + filterAsrama) : ''} — ${escHtml(totalPeriksa)} pemeriksaan · ${escHtml(totalPM)} PM</div>
    </div>`;

      // Render per asrama group
      const _asramaBaku = ['ASTRI 1', 'ASTRI 2', 'ASTRA 1', 'ASTRA 2', 'ASTRA 3', 'ASTRA 4'];
      // Asrama di luar daftar baku tetap ditampilkan (dulu PM-nya hilang dari rekap)
      const asramaOrder = _asramaBaku.concat(Object.keys(byAsrama).filter(a => _asramaBaku.indexOf(a) === -1 && a !== 'Tidak Diketahui').sort(), ['Tidak Diketahui']);
      asramaOrder.forEach(asrama => {
        if (!byAsrama[asrama]) return;
        const pmList = byAsrama[asrama];

        html += `
      <div style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:.75rem;">
          <div style="background:var(--primary);color:white;border-radius:8px;padding:5px 14px;font-weight:700;font-size:.88rem;">🏠 ${escHtml(asrama)}</div>
          <div class="text-muted" style="font-size:.82rem">${escHtml(pmList.length)} PM diperiksa</div>
        </div>`;

        pmList.forEach(({ id, namaPM, records }) => {
          const minggu = [...new Set(records.map(r => r.mingguKe))].length;
          const pct = Math.min(100, Math.round((minggu / 4) * 100));
          const lastRec = records.slice().sort((a, b) => String(a.tglPeriksa || '').localeCompare(String(b.tglPeriksa || '')))[records.length - 1];
          const lastStatus = lastRec?.statusKondisi || '-';
          const bc = lastStatus === 'Baik' ? 'badge-green' : lastStatus === 'Cukup Baik' ? 'badge-yellow' : 'badge-red';
          const tglLast = lastRec?.tglPeriksa ? new Date(lastRec.tglPeriksa).toLocaleDateString('id-ID') : '-';

          html += `
        <div style="border:1.5px solid var(--border);border-radius:12px;margin-bottom:.75rem;overflow:hidden;">
          <div style="background:var(--primary-pale);padding:10px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div class="pm-avatar" style="width:30px;height:30px;font-size:.78rem">${escHtml(String(namaPM || '?').charAt(0))}</div>
            <div style="flex:1;">
              <div style="font-weight:600">${escHtml(namaPM)}</div>
              <div class="text-muted" style="font-size:.75rem">${escHtml(id)}</div>
            </div>
            <div class="flex" style="gap:6px;flex-wrap:wrap;">
              <span class="badge ${escHtml(bc)}">${escHtml(lastStatus)}</span>
              <span class="text-muted" style="font-size:.8rem">${escHtml(minggu)}/4 minggu · ${escHtml(tglLast)}</span>
              <button class="btn btn-info btn-sm no-print" onclick="cetakKartuBulananPM('${jsArg(id)}',${bulan},${tahun})" title="Cetak kartu bulanan PM ini">🖨️ Kartu</button>
              ${lastRec ? `<button class="btn btn-ghost btn-sm no-print" onclick="cetakKartuMingguanPM('${jsArg(lastRec.id)}')" title="Cetak laporan mingguan — minggu terakhir PM ini">🗓️ Mingguan</button>` : ''}
            </div>
          </div>
          <div style="padding:10px 16px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="progress-wrap" style="flex:1;"><div class="progress-bar" style="width:${escHtml(pct)}%"></div></div>
              <div style="font-size:.75rem;color:var(--text-muted);white-space:nowrap">${escHtml(pct)}% komplet</div>
            </div>
            <div style="margin-top:10px;overflow-x:auto;-webkit-overflow-scrolling:touch;">
              <table style="width:100%;font-size:.8rem;border-collapse:collapse;min-width:460px;">
                <thead><tr style="background:var(--bg);">
                  <th style="padding:5px 10px;text-align:left;color:var(--text-muted)">Tgl</th>
                  <th style="padding:5px 10px;text-align:left;color:var(--text-muted)">Minggu</th>
                  <th style="padding:5px 10px;text-align:left;color:var(--text-muted)">TD</th>
                  <th style="padding:5px 10px;text-align:center;color:var(--text-muted)">Suhu</th>
                  <th style="padding:5px 10px;text-align:center;color:var(--text-muted)">BB</th>
                  <th style="padding:5px 10px;text-align:left;color:var(--text-muted)">Keluhan</th>
                  <th style="padding:5px 10px;text-align:center;color:var(--text-muted)">Status</th>
                </tr></thead>
                <tbody>
                  ${records.sort((a, b) => String(a.tglPeriksa || '').localeCompare(String(b.tglPeriksa || '')) || (parseInt(a.mingguKe) || 0) - (parseInt(b.mingguKe) || 0)).map(r => `
                  <tr style="border-top:1px solid var(--border);">
                    <td style="padding:5px 10px;font-size:.78rem;white-space:nowrap">${r.tglPeriksa ? escHtml(new Date(r.tglPeriksa).toLocaleDateString('id-ID')) : '-'}${(typeof r.ttdDokter === 'string' && r.ttdDokter.startsWith('data:')) ? '<img src="' + safeUrl(r.ttdDokter) + '" style="height:28px;max-width:80px;object-fit:contain;vertical-align:middle;margin-left:4px;display:block;" title="TTD Dokter">' : (r.ttdDokter === '[TTD_TERSIMPAN]' ? (state.ttdDokterBase64 ? '<img src="' + safeUrl(state.ttdDokterBase64) + '" style="height:28px;max-width:80px;object-fit:contain;display:block;" title="TTD Dokter">' : '<span style="font-size:.7rem;color:green">✓TTD</span>') : '<span style="color:var(--text-muted);font-size:.7rem">-</span>')}</td>
                    <td style="padding:5px 10px;"><span class="week-chip">Mg-${escHtml(r.mingguKe)}</span></td>
                    <td style="padding:5px 10px;font-family:'JetBrains Mono';font-size:.77rem;">${escHtml(r.tekananDarah || '-')}</td>
                    <td style="padding:5px 10px;text-align:center;">${r.suhuTubuh ? escHtml(r.suhuTubuh + '°C') : '-'}</td>
                    <td style="padding:5px 10px;text-align:center;">${r.beratBadan ? escHtml(r.beratBadan + ' kg') : '-'}</td>
                    <td style="padding:5px 10px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(r.keluhan || '-')}</td>
                    <td style="padding:5px 10px;text-align:center;"><span class="badge ${r.statusKondisi === 'Baik' ? 'badge-green' : r.statusKondisi === 'Cukup Baik' ? 'badge-yellow' : 'badge-red'}">${escHtml(r.statusKondisi)}</span></td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>`;
        });

        html += `</div>`; // close asrama group
      });

      container.innerHTML = html;
    }

    // ══════════════════════════════════════
    //  JENIS DISABILITAS CUSTOM
    // ══════════════════════════════════════
    function onJenisDisChange() {
      const sel = document.getElementById('jenisDis');
      const box = document.getElementById('jenisDisTambahBox');
      if (sel.value === '__tambah__') {
        box.style.display = 'block';
        document.getElementById('jenisDisTambahInput').focus();
        sel.value = ''; // reset agar tidak tersimpan nilai __tambah__
      } else {
        box.style.display = 'none';
      }
    }

    function simpanJenisDis() {
      const input = document.getElementById('jenisDisTambahInput').value.trim();
      if (!input) return;
      const sel = document.getElementById('jenisDis');

      // cek apakah sudah ada
      for (let opt of sel.options) {
        if (opt.value.toLowerCase() === input.toLowerCase()) {
          sel.value = opt.value;
          batalJenisDis();
          return;
        }
      }

      // tambah sebelum opsi "+ Tambah Jenis Baru..."
      const tambahOpt = sel.querySelector('option[value="__tambah__"]');
      const newOpt = document.createElement('option');
      newOpt.value = input;
      newOpt.textContent = input;
      sel.insertBefore(newOpt, tambahOpt);
      sel.value = input;

      // simpan ke state agar persisten
      if (!state.customJenisDis) state.customJenisDis = [];
      if (!state.customJenisDis.includes(input)) {
        state.customJenisDis.push(input);
        saveState();
      }

      batalJenisDis();
    }

    function batalJenisDis() {
      document.getElementById('jenisDisTambahBox').style.display = 'none';
      document.getElementById('jenisDisTambahInput').value = '';
    }

    function loadCustomJenisDis() {
      if (!state.customJenisDis || state.customJenisDis.length === 0) return;
      const sel = document.getElementById('jenisDis');
      const tambahOpt = sel.querySelector('option[value="__tambah__"]');
      state.customJenisDis.forEach(val => {
        // cek sudah ada belum
        for (let opt of sel.options) {
          if (opt.value === val) return;
        }
        const newOpt = document.createElement('option');
        newOpt.value = val;
        newOpt.textContent = val;
        sel.insertBefore(newOpt, tambahOpt);
      });
    }
    // ── Notifikasi kegagalan sync ke user (throttled supaya tidak spam) ──
    let _syncGagalTerakhir = null;
    function _laporkanSyncGagal(pesanServer) {
      const sekarang = Date.now();
      if (_syncGagalTerakhir && (sekarang - _syncGagalTerakhir) < 15000) return;
      _syncGagalTerakhir = sekarang;
      const pesan = '⚠️ Data GAGAL tersimpan ke Google Sheets: ' + (pesanServer || 'server menolak permintaan') +
                    '. Data masih ada di perangkat ini, tapi belum masuk spreadsheet — cek koneksi/izin, lalu coba simpan ulang.';
      console.error('[SIMKEDA] Sync gagal:', pesanServer);
      try {
        if (typeof showToast === 'function') showToast(pesan, 8000);
        else if (typeof showAlert === 'function') showAlert('alertGlobal', 'error', pesan);
      } catch (e) { /* jangan sampai notifikasi mematahkan alur */ }
      // ── FIX: kalau server menolak spesifik karena sesi/PIN tidak sah,
      //    JANGAN biarkan device terus-menerus mencoba dengan proof yang
      //    sama (pasti gagal lagi & lagi). Paksa logout supaya lain kali
      //    user login ulang, yang otomatis memicu resync PIN terbaru dari
      //    server (lihat splashCekPIN). ──
      if (pesanServer && /sesi tidak sah|akses ditolak/i.test(pesanServer)) {
        console.warn('[SIMKEDA] Sesi tidak sah terdeteksi — memaksa logout supaya PIN tersinkron ulang saat login berikutnya.');
        setTimeout(function() {
          try {
            if (typeof showToast === 'function') showToast('🔒 Sesi berakhir — silakan login ulang untuk melanjutkan.', 6000);
            if (typeof _paksaLogoutSesiTidakSah === 'function') _paksaLogoutSesiTidakSah();
          } catch (e) { /* abaikan */ }
        }, 1500);
      }
    }

    async function kirimKeSheets(action, data) {
      if (!state.scriptUrl) return false;
      // Jaga urutan: kosongkan dulu antrean lama (kalau ada) sebelum kirim yang baru.
      if (_bacaAntrean().length) await kirimAntrean();
      if (_bacaAntrean().length) {
        _antrekan(action, data);
        _laporkanSyncGagal('masih ada perubahan lama yang menunggu terkirim — perubahan ini ikut diantrekan dan dikirim otomatis saat tersambung');
        return false;
      }
      const r = await _postKeServer(action, data);
      if (r.status === 'ok') return true;
      let pesan = r.error;
      if (r.status === 'jaringan' || r.status === 'sesi') {
        _antrekan(action, data);
        pesan += ' — perubahan disimpan di antrean dan dikirim otomatis saat tersambung';
      }
      _laporkanSyncGagal(pesan);
      return false;
    }

    // Sinkron massal ke Sheets (dipakai saat ada update besar)
    async function syncAllToSheets() {
      if (!state.scriptUrl) return false;
      const controller2 = new AbortController();
      const _tid2 = setTimeout(function() { controller2.abort(); }, 30000);
      try {
        const resp = await fetch(state.scriptUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'syncAll',
            deviceId: state._deviceId,
            data: buildSyncPayload()
          }),
          signal: controller2.signal
        });
        clearTimeout(_tid2);
        const rawText = await resp.text();
        let hasil = null;
        try { hasil = JSON.parse(rawText); } catch (parseErr) {
          console.error('[SIMKEDA] syncAllToSheets: respons bukan JSON valid. HTTP status=' + resp.status + ' raw=', rawText.slice(0, 500));
          _laporkanSyncGagal('respons server tidak dikenali (status ' + resp.status + ')');
          return false;
        }
        if (!hasil || hasil.ok !== true) {
          _laporkanSyncGagal(hasil && hasil.error ? hasil.error : 'ditolak tanpa keterangan');
          return false;
        }
        if (typeof _catatKirimPenuh === 'function') _catatKirimPenuh();
        return true;
      } catch (e) {
        clearTimeout(_tid2);
        _laporkanSyncGagal('tidak bisa terhubung ke server (' + (e && e.message ? e.message : 'jaringan') + ')');
        return false;
      }
    }

    function simpanKonfigurasi() {
      if (!HARDCODED_GAS_URL) state.scriptUrl = document.getElementById('scriptUrl').value.trim();
      state.defaultDokter = document.getElementById('defaultDokter')?.value.trim() || state.defaultDokter;
      state.namaPetugas = document.getElementById('namaPetugas')?.value.trim() || state.namaPetugas;
      state.namaKasi = document.getElementById('namaKasi')?.value.trim() || state.namaKasi;
      saveState();
      // Tampilkan/sembunyikan tombol sync di header
      const btnSync = document.getElementById('btnSyncHeader');
      if (btnSync) btnSync.style.display = state.scriptUrl ? '' : 'none';
      // Mulai auto-sync jika URL baru dikonfigurasi
      if (state.scriptUrl) { startAutoSync(); startFastAntrianPoll(); fullSync(true); }
      else { stopAutoSync(); stopFastAntrianPoll(); }
      showAlert('alertConfig', 'success', '✅ Konfigurasi disimpan!' + (state.scriptUrl ? ' Sinkronisasi otomatis aktif.' : '')); showToast('✅ Konfigurasi berhasil disimpan!');
    }

    async function simpanProfil() {
      state.defaultDokter = document.getElementById('defaultDokter').value.trim();
      state.namaPetugas = document.getElementById('namaPetugas').value.trim();
      state.namaKasi = document.getElementById('namaKasi').value.trim();
      const pinBaru = document.getElementById('pinKasi').value.trim();
      if (pinBaru) {
        const rK = await kirimGantiPin(pinBaru, 'kasi');
        if (!rK.ok) { showToast('❌ ' + (rK.error || 'Gagal mengganti PIN')); return; }
      }
      saveState();
      const dok = document.getElementById('namaDokter');
      if (dok && state.defaultDokter) dok.value = state.defaultDokter;
      document.getElementById('pinKasi').value = '';
      // Push profil global ke Sheets (admin only - halaman ini hanya bisa diakses admin)
      if (state.scriptUrl) {
        kirimKeSheets('saveGlobalProfile', {
          namaPetugas: state.namaPetugas || '',
          defaultDokter: state.defaultDokter || '',
          namaKasi: state.namaKasi || ''
        }).then(ok => { if (ok) showToast('☁️ Profil global tersinkron ke semua device'); });
      }
      showAlert('alertConfig', 'success', '✅ Profil pengguna berhasil disimpan!'); showToast('✅ Profil pengguna berhasil disimpan!');
    }

    function loadKonfigurasi() {
      document.getElementById('scriptUrl').value = state.scriptUrl || '';
      document.getElementById('scriptUrl').readOnly = !!HARDCODED_GAS_URL;
      document.getElementById('defaultDokter').value = state.defaultDokter || '';
      document.getElementById('namaPetugas').value = state.namaPetugas || '';
      document.getElementById('namaKasi').value = state.namaKasi || '';
      // PIN tidak ditampilkan (keamanan)
    }

    function exportJSON() {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'simkeda_backup_' + isoLokal(new Date()) + '.json';
      a.click();
    }

    function clearLocalData() {
      if (!confirm('Hapus semua data lokal?')) return;
      state.penerima = []; state.pemeriksaan = []; state.antrian = [];
      if (typeof _resetPenandaSinkron === 'function') _resetPenandaSinkron();
      saveState(); renderDashboard(); renderListPM(); renderRiwayat(); renderAntrian();
    }

    // ══════════════════════════════════════
    //  SETUP URL MODAL
    // ══════════════════════════════════════
    function cekTampilSetupUrl() {
      // Tampilkan hanya jika URL belum diisi DAN user belum pernah klik Lewati
      const skipped = localStorage.getItem('simkeda_setup_skipped');
      if (!state.scriptUrl && !skipped) {
        const modal = document.getElementById('modalSetupUrl');
        if (modal) {
          modal.style.display = 'flex';
          setTimeout(() => {
            const inp = document.getElementById('setupUrlInput');
            if (inp) inp.focus();
          }, 300);
        }
      }
    }

    function simpanSetupUrl() {
      const inp = document.getElementById('setupUrlInput');
      const msg = document.getElementById('setupUrlMsg');
      const url = (inp ? inp.value.trim() : '');

      if (!url) {
        if (msg) {
          msg.textContent = '⚠️ URL tidak boleh kosong. Klik Lewati jika ingin mengisi nanti.';
          msg.style.cssText = 'display:block;background:#fff8e1;color:#856404;margin-top:.75rem;padding:.6rem 1rem;border-radius:8px;font-size:.8rem;text-align:center;';
        }
        return;
      }
      if (!url.includes('script.google.com')) {
        if (msg) {
          msg.textContent = '⚠️ URL tidak valid. Pastikan dari Google Apps Script.';
          msg.style.cssText = 'display:block;background:#fdecea;color:#c0392b;margin-top:.75rem;padding:.6rem 1rem;border-radius:8px;font-size:.8rem;text-align:center;';
        }
        return;
      }

      // Simpan URL
      state.scriptUrl = url;
      saveState();

      // Update semua input URL di halaman lain
      const adminUrl = document.getElementById('scriptUrl');
      if (adminUrl) adminUrl.value = url;
      const setelanUrl = document.getElementById('setelanScriptUrl');
      if (setelanUrl) setelanUrl.value = url;

      // Aktifkan tombol sync
      const btnSync = document.getElementById('btnSyncHeader');
      if (btnSync) btnSync.style.display = '';
      const btnSyncSetelan = document.getElementById('btnSyncSetelan');
      if (btnSyncSetelan) btnSyncSetelan.style.display = '';

      // Tutup modal & tampilkan feedback
      if (msg) {
        msg.textContent = '✅ URL disimpan! Memulai sinkronisasi...';
        msg.style.cssText = 'display:block;background:#e8f5ef;color:#1a6b4a;margin-top:.75rem;padding:.6rem 1rem;border-radius:8px;font-size:.8rem;text-align:center;';
      }
      setTimeout(() => {
        tutupSetupUrl();
        showToast('✅ URL berhasil disimpan! Sinkronisasi aktif.', 'success');
        startAutoSync();
        startFastAntrianPoll();
      }, 800);
    }

    function lewatiSetupUrl() {
      // Tandai bahwa user sudah pernah lihat popup ini (jangan tampil lagi)
      localStorage.setItem('simkeda_setup_skipped', '1');
      tutupSetupUrl();
    }

    function tutupSetupUrl() {
      const modal = document.getElementById('modalSetupUrl');
      if (modal) modal.style.display = 'none';
    }

    // ══════════════════════════════════════

    var _toastTimer = null;
    function showToast(msg, type) {
      msg = String(msg == null ? '' : msg);
      // Pemanggil lama memakai showToast(pesan, 8000): angka = durasi, jenis ditebak dari isi pesan
      let _durasi = null;
      if (typeof type === 'number') { _durasi = type; type = /^\s*(❌|⚠️)/.test(msg) ? 'error' : 'info'; }
      type = type || 'success';
      const el = document.getElementById('toastPopup');
      const msgEl = document.getElementById('toastMsg');
      const subEl = document.getElementById('toastSub');
      const iconEl = document.getElementById('toastIcon');
      if (!el || !msgEl) return;

      // Detect update vs save from message content
      const isUpdate = msg.includes('diperbarui') || msg.includes('diupdate');
      const isSave   = msg.includes('disimpan') || msg.includes('ditambahkan');

      // Strip leading emoji from msg for clean title
      // (Dulu memakai kelas karakter [✅💾…] tanpa flag u: emoji 2-unit seperti 🔒/🔄/📊 terpotong
      //  separuh dan tampil sebagai kotak "�". Sekarang dicocokkan utuh.)
      const cleanMsg = msg.replace(/^\s*(?:✅|💾|ℹ️?|❌|⚠️?|🗑️?)\s*/u, '').trim();

      // Set icon
      const icons = { error: '❌', info: 'ℹ️', update: '✏️', success: '✅' };
      const resolvedType = type === 'error' ? 'error' : type === 'info' ? 'info' : isUpdate ? 'update' : 'success';
      if (iconEl) iconEl.textContent = icons[resolvedType] || '✅';

      // Set title & subtitle
      msgEl.textContent = cleanMsg;
      if (subEl) {
        if (resolvedType === 'update') subEl.textContent = 'Data berhasil diperbarui';
        else if (resolvedType === 'success' && isSave) subEl.textContent = 'Data berhasil disimpan';
        else if (resolvedType === 'error') subEl.textContent = 'Periksa kembali isian form';
        else subEl.textContent = '';
      }

      // CSS class
      const cls = { error: 'toast-error', info: 'toast-info', update: 'toast-update', success: '' }[resolvedType] || '';
      el.className = 'show' + (cls ? ' ' + cls : '');

      clearTimeout(_toastTimer);
      const duration = _durasi || (resolvedType === 'error' ? 5500 : 3500);
      _toastTimer = setTimeout(() => { el.classList.remove('show'); }, duration);
    }

    function showAlert(id, type, msg) {
      const el = document.getElementById(id);
      if (el) {
        el.className = `alert alert-${type} show`;
        el.textContent = msg;
        // Scroll ke elemen alert agar terlihat
        if (type === 'error' || type === 'warning') {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
        }
        setTimeout(() => el.classList.remove('show'), 6000);
      }
      // Selalu tampilkan popup toast untuk error & warning agar terbaca meski sudah scroll
      if (type === 'error' || type === 'warning') {
        showToast(msg, type === 'warning' ? 'info' : 'error');
      }
    }
    // setLoading(idTombol, idSpinner, aktif): nonaktifkan tombol + tampilkan spinner
    // selama proses simpan (mencegah klik dobel). setLoading(aktif) lama tetap didukung.
    function setLoading(a, b, c) {
      if (arguments.length >= 3 || (typeof a === 'string' && typeof b === 'string')) {
        const on = !!c;
        const btn = document.getElementById(a);
        const sp = document.getElementById(b);
        if (btn) btn.disabled = on;
        if (sp) sp.style.display = on ? 'inline-block' : 'none';
        return;
      }
      const el = document.getElementById("loading");
      if (!el) return;
      el.style.display = a ? "block" : "none";
    }

    // ══════════════════════════════════════
    //  DOKTER: Laporan Insidental & Rujukan
    // ══════════════════════════════════════
    // (Fitur Laporan Dokter untuk Insidental & Rujukan sudah tidak dipakai —
    //  fungsi dan pemanggilnya dihapus karena tabel targetnya tak lagi ada di UI)
    // ══════════════════════════════════════
    //  REKAP: Insidental & Rujukan per-bulan
    // ══════════════════════════════════════
    function renderRekapInsidental() {
      const tbody = document.getElementById('rekapInsidentalBody');
      if (!tbody) return;
      const bulan = parseInt((document.getElementById('rekapInsBulan') || { value: new Date().getMonth() + 1 }).value);
      const tahun = parseInt((document.getElementById('rekapInsTahun') || { value: new Date().getFullYear() }).value);
      let list = (state.insidental || []).filter(x => !x._deleted).filter(x => {
        const d = new Date(x.tgl);
        return (bulan === 0 || isNaN(bulan) || d.getMonth() + 1 === bulan) && d.getFullYear() === tahun;
      }).sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
      const _pgRekapIns = document.getElementById('rekapInsidentalPagination');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:1.5rem">Tidak ada keluhan insidental periode ini</td></tr>';
        if (_pgRekapIns) _pgRekapIns.innerHTML = '';
        return;
      }
      list = _fltTbl('rekapInsidental', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppRekapIns = 100;
      const _totalPagesRekapIns = Math.max(1, Math.ceil(list.length / _ppRekapIns));
      if (_pageState.rekapInsidental > _totalPagesRekapIns) _pageState.rekapInsidental = _totalPagesRekapIns;
      const _startRekapIns = (_pageState.rekapInsidental - 1) * _ppRekapIns;
      tbody.innerHTML = '';
      list.slice(_startRekapIns, _startRekapIns + _ppRekapIns).forEach((x, _idx) => {
        const idx = _startRekapIns + _idx;
        const sc = x.status === 'Ditangani' ? 'badge-green' : x.status === 'Darurat' ? 'badge-red' : 'badge-yellow';
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">' + (escHtml(idx+1)) + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(new Date(x.tgl).toLocaleDateString('id-ID')) + (fmtWaktu(x.waktu) ? (escHtml(' ' + fmtWaktu(x.waktu))) : '') + '</td>' +
          '<td><strong>' + (escHtml(x.namaPM || '-')) + '</strong></td>' +
          '<td class="text-muted">' + (escHtml(x.kamarBlok || '-')) + '</td>' +
          '<td style="font-size:.82rem;max-width:150px">' + (escHtml(x.keluhan || '-')) + '</td>' +
          '<td style="font-size:.8rem">' + (escHtml(x.tindakan || '-')) + '</td>' +
          '<td><span class="badge ' + escHtml(sc) + '">' + (escHtml(x.status || '-')) + '</span></td>' +
          '<td>' + (x.perluRujukan === 'ya' ? '<span class="badge badge-red">🏥 Ya</span>' : 'Tidak') + '</td>';
        tbody.appendChild(tr);
      });
      _renderPaginationControls('rekapInsidentalPagination', 'rekapInsidental', list.length, _ppRekapIns, 'renderRekapInsidental');
    }

    function lihatDetailPemeriksaan(id) {
      const p = state.pemeriksaan.find(x => String(x.id) === String(id));
      if (!p) return;
      const oldM = document.getElementById('modalDetailPemeriksaan');
      if (oldM) oldM.remove();
      const tglStr = p.tglPeriksa ? new Date(p.tglPeriksa).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '-';
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay show';
      overlay.id = 'modalDetailPemeriksaan';
      const obatStr = (p.obatDiberikan && p.obatDiberikan.length) ? p.obatDiberikan.map(o=>((o.nama||'')+(o.jumlah?' '+o.jumlah:'')+' '+(o.satuan||'')).trim()).join(', ') : '-';
      overlay.innerHTML = `<div class="modal" style="max-width:680px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <div style="font-weight:700;font-size:1.05rem;color:var(--primary)">🩺 Detail Pemeriksaan</div>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('modalDetailPemeriksaan').remove()">✕ Tutup</button>
        </div>
        <div style="background:var(--primary-pale);border-radius:10px;padding:1rem;margin-bottom:.75rem;">
          <div style="font-weight:700;font-size:1rem;">${escHtml(p.namaPM||'-')}</div>
          <div style="font-size:.82rem;color:var(--text-muted);">Tanggal: ${escHtml(tglStr)} &nbsp;·&nbsp; Dokter: ${escHtml(p.namaDokter||'-')} &nbsp;·&nbsp; Minggu ke-${escHtml(String(p.mingguKe||'-'))}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem;font-size:.87rem;">
          <div><span style="color:var(--text-muted)">Tekanan Darah</span><br><strong>${escHtml(p.tekananDarah||'-')}</strong></div>
          <div><span style="color:var(--text-muted)">Nadi</span><br><strong>${escHtml(String(p.nadi||'-'))}</strong></div>
          <div><span style="color:var(--text-muted)">Suhu</span><br><strong>${escHtml(String(p.suhuTubuh||'-'))}</strong></div>
          <div><span style="color:var(--text-muted)">SpO2</span><br><strong>${escHtml(String(p.spo2||'-'))}</strong></div>
          <div><span style="color:var(--text-muted)">Berat Badan</span><br><strong>${escHtml(String(p.beratBadan||'-'))}</strong></div>
          <div><span style="color:var(--text-muted)">Status Kondisi</span><br><span class="badge ${p.statusKondisi==='Baik'?'badge-green':p.statusKondisi==='Rujuk'?'badge-red':'badge-yellow'}">${escHtml(p.statusKondisi||'-')}</span></div>
        </div>
        ${p.keluhan?`<div style="margin-bottom:.75rem;"><div style="font-size:.78rem;color:var(--text-muted);margin-bottom:3px;">Anamnesa</div><div style="background:#f9f9f9;border-radius:8px;padding:.6rem .8rem;font-size:.87rem;">${escHtml(p.keluhan)}</div></div>`:''}
        ${p.hasilFisik?`<div style="margin-bottom:.75rem;"><div style="font-size:.78rem;color:var(--text-muted);margin-bottom:3px;">Hasil Pemeriksaan Fisik</div><div style="background:#f9f9f9;border-radius:8px;padding:.6rem .8rem;font-size:.87rem;">${escHtml(p.hasilFisik)}</div></div>`:''}
        ${p.diagnosis?`<div style="margin-bottom:.75rem;"><div style="font-size:.78rem;color:var(--text-muted);margin-bottom:3px;">Diagnosis</div><div style="background:#f0f7ff;border-radius:8px;padding:.6rem .8rem;font-size:.87rem;font-weight:600;">${escHtml(p.diagnosis)}</div></div>`:''}
        ${p.tindakan?`<div style="margin-bottom:.75rem;"><div style="font-size:.78rem;color:var(--text-muted);margin-bottom:3px;">Tindakan/Terapi</div><div style="background:#f9f9f9;border-radius:8px;padding:.6rem .8rem;font-size:.87rem;">${escHtml(p.tindakan)}</div></div>`:''}
        ${p.resep?`<div style="margin-bottom:.75rem;"><div style="font-size:.78rem;color:var(--text-muted);margin-bottom:3px;">Resep/Catatan Obat Tambahan</div><div style="background:#f9f9f9;border-radius:8px;padding:.6rem .8rem;font-size:.87rem;">${escHtml(p.resep)}</div></div>`:''}
        ${p.rencana?`<div style="margin-bottom:.75rem;"><div style="font-size:.78rem;color:var(--text-muted);margin-bottom:3px;">Edukasi & Pemantauan</div><div style="background:#f9f9f9;border-radius:8px;padding:.6rem .8rem;font-size:.87rem;">${escHtml(p.rencana)}</div></div>`:''}
        <div style="margin-bottom:.75rem;"><div style="font-size:.78rem;color:var(--text-muted);margin-bottom:3px;">Obat Diberikan</div><div style="background:#e8f5ef;border-radius:8px;padding:.6rem .8rem;font-size:.87rem;">${escHtml(obatStr)}</div></div>
        ${p.perluRujukan==='ya'?`<div style="background:#fdecea;border-radius:8px;padding:.6rem .8rem;font-size:.87rem;color:var(--danger);font-weight:600;">🏥 Perlu Rujukan ke: ${escHtml(p.tujuanRujukan||'Tidak ditentukan')}</div>`:''}
      </div>`;
      overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    }

    function lihatDetailInsidental(id) {
      const x = (state.insidental||[]).find(i => String(i.id) === String(id));
      if (!x) return;
      const oldM = document.getElementById('modalDetailInsidental');
      if (oldM) oldM.remove();
      const tglStr = x.tgl ? new Date(x.tgl).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '-';
      const obatStr = (x.obatDiberikan && x.obatDiberikan.length) ? x.obatDiberikan.map(o=>((o.nama||'')+(o.jumlah?' '+o.jumlah:'')+' '+(o.satuan||'')).trim()).join(', ') : '-';
      const sc = x.status==='Ditangani'?'badge-green':x.status==='Darurat'?'badge-red':'badge-yellow';
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay show';
      overlay.id = 'modalDetailInsidental';
      overlay.innerHTML = `<div class="modal" style="max-width:600px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <div style="font-weight:700;font-size:1.05rem;color:#e67e22">🚨 Detail Keluhan Insidental</div>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('modalDetailInsidental').remove()">✕ Tutup</button>
        </div>
        <div style="background:#fff8f0;border-radius:10px;padding:1rem;margin-bottom:.75rem;">
          <div style="font-weight:700;font-size:1rem;">${escHtml(x.namaPM||'-')}</div>
          <div style="font-size:.82rem;color:var(--text-muted);">${escHtml(x.kamarBlok||'-')} &nbsp;·&nbsp; ${escHtml(tglStr)} ${fmtWaktu(x.waktu)?'&nbsp;pukul&nbsp;'+escHtml(fmtWaktu(x.waktu)):''}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-bottom:.75rem;font-size:.87rem;">
          <div><span style="color:var(--text-muted)">Suhu</span><br><strong>${x.suhu?escHtml(x.suhu+'°C'):'-'}</strong></div>
          <div><span style="color:var(--text-muted)">Tekanan Darah</span><br><strong>${escHtml(x.td||'-')}</strong></div>
          <div><span style="color:var(--text-muted)">SpO2</span><br><strong>${x.spo2?escHtml(x.spo2+'%'):'-'}</strong></div>
          <div><span style="color:var(--text-muted)">Nadi</span><br><strong>${x.nadi?escHtml(x.nadi+'/mnt'):'-'}</strong></div>
          <div><span style="color:var(--text-muted)">Status</span><br><span class="badge ${escHtml(sc)}">${escHtml(x.status||'-')}</span></div>
          <div><span style="color:var(--text-muted)">Perlu Rujukan?</span><br>${x.perluRujukan==='ya'?'<span class="badge badge-red">🏥 Ya</span>':'<span class="badge badge-green">Tidak</span>'}</div>
        </div>
        <div style="margin-bottom:.65rem;"><div style="font-size:.78rem;color:var(--text-muted);margin-bottom:3px;">Keluhan</div><div style="background:#fff8f0;border-radius:8px;padding:.6rem .8rem;font-size:.87rem;">${escHtml(x.keluhan||'-')}</div></div>
        ${x.tindakan?`<div style="margin-bottom:.65rem;"><div style="font-size:.78rem;color:var(--text-muted);margin-bottom:3px;">Tindakan Awal</div><div style="background:#f9f9f9;border-radius:8px;padding:.6rem .8rem;font-size:.87rem;">${escHtml(x.tindakan)}</div></div>`:''}
        <div style="margin-bottom:.65rem;"><div style="font-size:.78rem;color:var(--text-muted);margin-bottom:3px;">Obat Diberikan</div><div style="background:#e8f5ef;border-radius:8px;padding:.6rem .8rem;font-size:.87rem;">${escHtml(obatStr)}</div></div>
        <div style="font-size:.8rem;color:var(--text-muted);">Petugas: <strong>${escHtml(x.petugas||'-')}</strong></div>
        ${x.catatanDokter?`<div style="margin-top:.65rem;"><div style="font-size:.78rem;color:var(--info);margin-bottom:3px;">Catatan Dokter</div><div style="background:var(--info-light);border-radius:8px;padding:.6rem .8rem;font-size:.87rem;">${escHtml(x.catatanDokter)}</div></div>`:''}
      </div>`;
      overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    }

    function lihatDetailRujukan(id) {
      const x = (state.rujukan || []).find(r => String(r.id) === String(id));
      if (!x) return;
      // Hapus modal lama jika ada
      const oldModal = document.getElementById('modalDetailRujukan');
      if (oldModal) oldModal.remove();
      // Buat foto links
      const fotoLinks = [x.foto1, x.foto2, x.foto3].filter(Boolean).map((f, i) =>
        `<a href="${safeUrl(f)}" target="_blank" class="btn btn-ghost btn-sm" style="color:#8e44ad;margin-top:4px;">📎 Foto ${escHtml(i + 1)}</a>`
      ).join(' ');
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay show';
      overlay.id = 'modalDetailRujukan';
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.cssText = 'max-width:640px;max-height:85vh;overflow-y:auto;';
      modal.innerHTML = `
    <div class="modal-title" style="color:#8e44ad;">🏥 Detail Rujukan</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;font-size:.85rem;margin-bottom:1rem;">
      <div><span style="color:var(--text-muted)">Nama PM:</span><br><strong>${escHtml(x.namaPM || '-')}</strong></div>
      <div><span style="color:var(--text-muted)">Asrama:</span><br>${escHtml(x.kamarBlok || '-')}</div>
      <div><span style="color:var(--text-muted)">Tanggal:</span><br>${x.tgl ? escHtml(new Date(x.tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })) : '-'}</div>
      <div><span style="color:var(--text-muted)">Jenis Rujukan:</span><br>${escHtml(x.jenis || '-')}</div>
      <div><span style="color:var(--text-muted)">Status:</span><br>${badgeStatusRujukan(x)}</div>
      <div style="grid-column:1/-1"><span style="color:var(--text-muted)">Tujuan RS/Fasilitas:</span><br><strong>${escHtml(x.tujuan || '-')}</strong></div>
      <div style="grid-column:1/-1"><span style="color:var(--text-muted)">Diagnosis:</span><br>${escHtml(x.diagnosis || '-')}</div>
      <div style="grid-column:1/-1"><span style="color:var(--text-muted)">Asal Rujukan:</span><br>${escHtml(x.asal || '-')}</div>
      ${x.alasan ? `<div style="grid-column:1/-1;background:#fff8e1;border-radius:8px;padding:.75rem;">
        <span style="color:var(--text-muted);font-size:.78rem;display:block;margin-bottom:4px;">Alasan Rujukan:</span>
        <div>${escHtml(x.alasan)}</div>
      </div>` : ''}
      <div style="grid-column:1/-1;background:#f8f9fa;border-radius:8px;padding:.75rem;">
        <span style="color:var(--text-muted);font-size:.78rem;display:block;margin-bottom:4px;">Hasil / Laporan Medis:</span>
        <div>${x.hasil ? escHtml(x.hasil) : '<em style="color:var(--text-muted)">Belum ada hasil</em>'}</div>
      </div>
      <div style="grid-column:1/-1;background:#f0faf5;border-radius:8px;padding:.75rem;">
        <span style="color:var(--text-muted);font-size:.78rem;display:block;margin-bottom:4px;">Tindak Lanjut:</span>
        <div>${escHtml(x.tindakLanjut || '-')}</div>
      </div>
      ${fotoLinks ? `<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Bukti Foto:</span><br>${fotoLinks}</div>` : ''}
      <div><span style="color:var(--text-muted)">Petugas:</span><br>${escHtml(x.petugas || '-')}</div>
    </div>
    <div style="display:flex;gap:.5rem;margin-top:.5rem;" id="_detailRujBtns"></div>
  `;
      // Tambah tombol close dan edit via DOM (hindari masalah quote)
      const btnsDiv = modal.querySelector('#_detailRujBtns');
      const btnClose = document.createElement('button');
      btnClose.className = 'btn btn-ghost'; btnClose.style.flex = '1'; btnClose.textContent = 'Tutup';
      btnClose.onclick = () => overlay.remove();
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-accent'; btnEdit.style.flex = '1'; btnEdit.textContent = '✏️ Edit Data';
      btnEdit.onclick = () => { overlay.remove(); editRujukan(x.id); };
      btnsDiv.appendChild(btnClose);
      // Tombol Edit hanya untuk peran yang punya menu Rujukan (Kasi dulu melihatnya → "Akses ditolak")
      if ((ROLE_PAGES[state.role] || []).includes('rujukan')) btnsDiv.appendChild(btnEdit);
      overlay.appendChild(modal);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    }

    function renderRekapRujukan() {
      const tbody = document.getElementById('rekapRujukanBody');
      if (!tbody) return;
      const bulan = parseInt((document.getElementById('rekapRujBulan') || { value: new Date().getMonth() + 1 }).value);
      const tahun = parseInt((document.getElementById('rekapRujTahun') || { value: new Date().getFullYear() }).value);
      let list = (state.rujukan || []).filter(x => !x._deleted).filter(x => {
        const d = new Date(x.tgl);
        return (bulan === 0 || isNaN(bulan) || d.getMonth() + 1 === bulan) && d.getFullYear() === tahun;
      }).sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
      const _pgRekapRuj = document.getElementById('rekapRujukanPagination');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:1.5rem">Tidak ada data rujukan periode ini</td></tr>';
        if (_pgRekapRuj) _pgRekapRuj.innerHTML = '';
        return;
      }
      list = _fltTbl('rekapRujukan', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppRekapRuj = 100;
      const _totalPagesRekapRuj = Math.max(1, Math.ceil(list.length / _ppRekapRuj));
      if (_pageState.rekapRujukan > _totalPagesRekapRuj) _pageState.rekapRujukan = _totalPagesRekapRuj;
      const _startRekapRuj = (_pageState.rekapRujukan - 1) * _ppRekapRuj;
      tbody.innerHTML = '';
      list.slice(_startRekapRuj, _startRekapRuj + _ppRekapRuj).forEach((x, _idx) => {
        const idx = _startRekapRuj + _idx;
        const fotoLinks = [x.foto1, x.foto2, x.foto3].filter(Boolean).map((f, i) => {
          const thumb = getDriveEmbedUrl(f);
          return '<img src="' + safeUrl(thumb) + '" style="height:36px;width:48px;object-fit:cover;border-radius:4px;cursor:pointer;border:1.5px solid #c39bd3;" '
            + 'onclick="lihatFoto(\'' + jsArg(f) + '\',\'Foto ' + (jsArg(i+1)) + '\')" '
            + 'onerror="_fotoTryProxy(this)">';
        }).join(' ');
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">' + (escHtml(idx+1)) + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(new Date(x.tgl).toLocaleDateString('id-ID')) + '</td>' +
          '<td><strong>' + (escHtml(x.namaPM || '-')) + '</strong></td>' +
          '<td style="font-size:.8rem">' + (escHtml(x.jenis || '-')) + '</td>' +
          '<td style="font-size:.8rem">' + (escHtml(x.tujuan || '-')) + '</td>' +
          '<td style="font-size:.8rem;max-width:100px">' + (escHtml(x.diagnosis || '-')) + '</td>' +
          '<td style="font-size:.8rem;max-width:100px">' + escHtml(String(x.hasil || '-').substring(0, 60)) + (x.hasil && String(x.hasil).length > 60 ? '...' : '') + '</td>' +
          '<td>' + (fotoLinks || '-') + '</td>';
        const bLihat = document.createElement('button');
        bLihat.className = 'btn btn-ghost btn-sm'; bLihat.textContent = '👁'; bLihat.title = 'Lihat Detail';
        bLihat.style.marginRight = '3px';
        bLihat.onclick = () => lihatDetailRujukan(x.id);
        const bPDFrujKasi = document.createElement('button');
        bPDFrujKasi.className = 'btn btn-info btn-sm no-print'; bPDFrujKasi.textContent = '🖨️ PDF';
        bPDFrujKasi.onclick = () => cetakPDFRujukan(x.id);
        const tdAksi = document.createElement('td'); tdAksi.style.whiteSpace = 'nowrap';
        tdAksi.appendChild(bLihat); tdAksi.appendChild(bPDFrujKasi); tr.appendChild(tdAksi);
        tbody.appendChild(tr);
      });
      _renderPaginationControls('rekapRujukanPagination', 'rekapRujukan', list.length, _ppRekapRuj, 'renderRekapRujukan');
    }
