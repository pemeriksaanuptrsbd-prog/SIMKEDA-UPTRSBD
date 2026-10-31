    // ══════════════════════════════════════
    //  DASHBOARD
    // ══════════════════════════════════════
    function renderDashboard() {
      try { renderPemberitahuan(); } catch (e) { console.warn('pemberitahuan', e); }
      const now = new Date();
      const todayStr = now.toDateString();

      const antrianHariIni = state.antrian.filter(a => new Date(a.tglAntrian).toDateString() === todayStr && a.status !== 'dihapus');
      const selesai = antrianHariIni.filter(a => a.status === 'selesai').length;
      // Perlu Perhatian: dihitung KHUSUS pemeriksaan hari ini saja, bukan akumulasi seluruh riwayat,
      // supaya angkanya tidak menyesatkan (dulu ini menjumlahkan semua waktu).
      const perhatian = state.pemeriksaan.filter(p =>
        (p.statusKondisi === 'Perlu Perhatian' || p.statusKondisi === 'Rujuk')
        && p.tglPeriksa && new Date(p.tglPeriksa).toDateString() === todayStr
      ).length;

      // PM belum periksa > 14 hari
      const batas = new Date(now - 90 * 86400000);
      const belumPeriksa = state.penerima.filter(pm => {
        if (!isPMAktif(pm)) return false;
        const last = getLastPeriksa(pm.nomorInduk);
        return !last || new Date(last.tglPeriksa) < batas;
      }).length;

      document.getElementById('statTotal').textContent = state.penerima.length;
      document.getElementById('statAntrian').textContent = antrianHariIni.length;
      document.getElementById('statSelesai').textContent = selesai;
      document.getElementById('statPerhatian').textContent = perhatian;
      document.getElementById('statBelumPeriksa').textContent = belumPeriksa;
      document.getElementById('antrianCount').textContent = antrianHariIni.filter(a => a.status !== 'selesai' && a.status !== 'dihapus').length;
      // Stok obat warning
      const stokWarnEl = document.getElementById('statStokHampirHabis');
      if (stokWarnEl) {
        const jumlahWarn = (state.stokObat||[]).filter(o => o && o.nama && (Number(o.stok)||0) <= (Number(o.minimum)||10)).length;
        stokWarnEl.textContent = jumlahWarn;
        const card = document.getElementById('dashStokWarnCard');
        if (card) card.style.borderLeftColor = jumlahWarn > 0 ? 'var(--danger)' : 'var(--primary)';
      }

      // Antrian aktif di dashboard
      const dashAntrian = document.getElementById('dashAntrian');

      // ✅ Indikator real-time: PM yang Sedang Diperiksa
      const sedangDiperiksa = antrianHariIni.filter(a => a.status === 'proses');
      const indikasiEl = document.getElementById('dashSedangPeriksa');
      if (indikasiEl) {
        if (sedangDiperiksa.length > 0) {
          indikasiEl.innerHTML = sedangDiperiksa.map(a => {
            const pm = state.penerima.find(p => p.nomorInduk === a.nomorInduk);
            const nama = pm ? pm.namaPM : a.nomorInduk;
            const info = pm ? `${escHtml(pm.kamarBlok || '-')} · ${escHtml(pm.jenisDis || '-')}` : a.nomorInduk;
            return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
              background:#fff8e1;border-left:4px solid #f0a500;border-radius:8px;margin-bottom:8px;
              box-shadow:0 2px 6px rgba(240,165,0,.12);">
              <span style="animation:pulse 1.2s infinite;font-size:1.4rem">🩺</span>
              <div style="flex:1">
                <div style="font-weight:700;font-size:.92rem;color:#7a5200">Sedang Diperiksa · No. ${escHtml(String(a.urutan))}</div>
                <div style="font-weight:600;font-size:.95rem;color:#222;margin-top:2px">${escHtml(nama)}</div>
                <div style="font-size:.78rem;color:#6b7a8d;margin-top:2px">${escHtml(info)}</div>
              </div>
              <span class="badge badge-yellow" style="font-size:.72rem">🩺 PROSES</span>
            </div>`;
          }).join('');
          indikasiEl.style.display = 'block';
        } else {
          indikasiEl.style.display = 'none';
          indikasiEl.innerHTML = '';
        }
      }

      if (antrianHariIni.length === 0) {
        dashAntrian.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:1.5rem;font-size:.85rem">Belum ada antrian hari ini</div>';
      } else {
        dashAntrian.innerHTML = antrianHariIni.slice(0, 8).map(a => {
          const pm = state.penerima.find(p => p.nomorInduk === a.nomorInduk);
          const nama = pm ? pm.namaPM : a.nomorInduk;
          const cls = a.status === 'selesai' ? 'done' : a.status === 'proses' ? 'in-progress' : '';
          return `<div class="queue-card ${escHtml(cls)}" onclick="bukaAntrianSesuaiRole('${jsArg(a.nomorInduk)}')">
        <div class="queue-num">${escHtml(a.urutan)}</div>
        <div style="flex:1"><div style="font-weight:600;font-size:.88rem">${escHtml(nama)}</div>
        <div class="text-muted" style="font-size:.75rem">${escHtml(pm ? pm.jenisDis : '')}</div></div>
        <span class="badge ${a.status === 'selesai' ? 'badge-green' : a.status === 'proses' ? 'badge-yellow' : 'badge-gray'}">${a.status === 'selesai' ? '✓ Selesai' : a.status === 'proses' ? '🩺 Proses' : '⏳ Tunggu'}</span>
      </div>`;
        }).join('');
      }

      // PM belum periksa lama
      const dashWarn = document.getElementById('dashWarn');
      const warnList = state.penerima.filter(pm => {
        if (!isPMAktif(pm)) return false;
        const last = getLastPeriksa(pm.nomorInduk);
        return !last || new Date(last.tglPeriksa) < batas;
      }).slice(0, 8);
      if (warnList.length === 0) {
        dashWarn.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:1.5rem;font-size:.85rem">🎉 Semua PM sudah diperiksa dalam 3 bulan terakhir</div>';
      } else {
        dashWarn.innerHTML = warnList.map(pm => {
          const last = getLastPeriksa(pm.nomorInduk);
          const hari = last ? Math.floor((now - new Date(last.tglPeriksa)) / 86400000) : '—';
          return `<div class="queue-card" onclick="bukaPMBelumPeriksa('${jsArg(pm.nomorInduk)}')" title="${(ROLE_PAGES[state.role] || []).includes('antrian') ? 'Klik untuk daftarkan ke antrian' : 'Klik untuk melihat data PM'}">
        <div class="warn-dot"></div>
        <div style="flex:1"><div style="font-weight:600;font-size:.88rem">${escHtml(pm.namaPM)}</div>
        <div class="text-muted" style="font-size:.75rem">${escHtml(pm.kamarBlok || '-')} · ${escHtml(pm.jenisDis)}</div></div>
        <span class="badge badge-orange">${hari === '—' ? 'Belum pernah' : escHtml(hari + ' hari lalu')}</span>
      </div>`;
        }).join('');
      }
      // --- GRAFIK TRIWULAN MINI ---
      renderDashGrafik();

      // --- Reminder rujukan yang sudah lama menunggu hasil (>=7 hari) ---
      const dashRujBanner = document.getElementById('dashRujukanOverdueBanner');
      if (dashRujBanner) {
        const overdueRuj = (state.rujukan || []).filter(x => !x._deleted && (x.statusRujukan || 'Aktif') !== 'Selesai'
          && hitungHariBerjalanRujukan(x.tgl) >= 7);
        if (overdueRuj.length > 0) {
          dashRujBanner.style.display = 'block';
          dashRujBanner.textContent = '⚠️ Ada ' + overdueRuj.length + ' rujukan yang sudah ≥7 hari belum ada hasil. Klik untuk cek.';
        } else {
          dashRujBanner.style.display = 'none';
        }
      }
    }

    // ── Masukkan PM ke Antrian dengan prioritas darurat, dipanggil dari Insidental ──
    // status 'Perlu Dokter' / 'Darurat' → harus segera terlihat di Antrian & daftar siap periksa dokter.
    function masukkanAntrianDariInsidental(nomorInduk, statusInsidental) {
      const todayStr = new Date().toDateString();
      if (!state.antrian) state.antrian = [];
      const existing = state.antrian.find(a => a.nomorInduk === nomorInduk
        && new Date(a.tglAntrian).toDateString() === todayStr);
      const prioritas = statusInsidental === 'Darurat' ? 'darurat' : 'perlu_dokter';
      if (existing) {
        // Sudah ada entri hari ini (ID antrean per PM per hari selalu sama):
        // naikkan prioritasnya; bila sudah selesai/dihapus, masukkan lagi ke antrean.
        if (existing.status === 'selesai' || existing.status === 'dihapus') {
          existing.urutan = _urutanAntrianBerikut();
          existing.status = 'menunggu';
          existing.tglAntrian = new Date().toISOString();
        }
        existing.prioritas = prioritas;
        existing.sumber = 'insidental';
        existing.updatedAt = new Date().toISOString();
        saveState(); triggerSyncAfterSave(); renderAntrian(); renderDashboard();
        if (typeof updateAntrianPickerPetugas === 'function') updateAntrianPickerPetugas();
        return;
      }
      const maxUrutan = _urutanAntrianBerikut() - 1;
      const tglKey = isoLokal(new Date()).replace(/-/g, '');
      const safeNomor = String(nomorInduk).replace(/[^a-zA-Z0-9]/g, '');
      const entry = {
        id: `ant_${safeNomor}_${tglKey}`,
        nomorInduk, status: 'menunggu',
        urutan: maxUrutan + 1,
        prioritas,
        sumber: 'insidental',
        tglAntrian: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.antrian.push(entry);
      saveState(); triggerSyncAfterSave(); renderAntrian(); renderDashboard();
      if (typeof updateAntrianPickerPetugas === 'function') updateAntrianPickerPetugas();
    }

    // ── Buka halaman yang sesuai role saat PM diklik dari Antrian/Dashboard ──
    // petugas → Pengukuran Awal (tugasnya ukur vital), dokter/admin → Periksa Dokter.
    function bukaAntrianSesuaiRole(nomorInduk) {
      const punya = (id) => (ROLE_PAGES[state.role] || []).includes(id);
      if (state.role === 'petugas') {
        if (!punya('pengukuran')) { alert('Menu Pengukuran tidak tersedia untuk role ini.'); return; }
        showPage('pengukuran', document.getElementById('navPengukuran'));
        setTimeout(() => {
          const sel = document.getElementById('pilihPMPetugas');
          if (sel) { sel.value = nomorInduk; if (typeof onPilihPMPetugas === 'function') onPilihPMPetugas(); }
        }, 150);
        return;
      }
      if (punya('pemeriksaan')) {
        showPage('pemeriksaan', document.getElementById('navPemeriksaan'));
        setTimeout(() => {
          const sel = document.getElementById('pilihanPM');
          if (sel) { sel.value = nomorInduk; onPilihPM(); }
        }, 150);
        return;
      }
      alert('Tidak ada menu pemeriksaan/pengukuran yang bisa dibuka untuk role ini.');
    }

    // Klik PM di kartu "belum diperiksa" Dashboard, sesuai akses peran.
    // Dulu selalu membuka Antrian: Dokter/Kasi mendapat "Akses ditolak", tetapi PM tetap
    // diam-diam dimasukkan ke antrean.
    function bukaPMBelumPeriksa(nomorInduk) {
      const punya = (id) => (ROLE_PAGES[state.role] || []).includes(id);
      if (punya('antrian')) {
        showPage('antrian', document.getElementById('navAntrian'));
        setTimeout(() => tambahKeAntrianLangsung(nomorInduk), 100);
        return;
      }
      if (punya('pemeriksaan')) { bukaAntrianSesuaiRole(nomorInduk); return; }
      if (typeof lihatDetailPM === 'function') lihatDetailPM(nomorInduk);
    }

    function getLastPeriksa(nomorInduk) {
      const arr = state.pemeriksaan.filter(p => p.nomorInduk === nomorInduk);
      if (arr.length === 0) return null;
      return arr.reduce((a, b) => new Date(a.tglPeriksa) > new Date(b.tglPeriksa) ? a : b);
    }

    // PM yang statusnya Keluar/Cuti/Meninggal tidak dihitung di statistik "belum periksa",
    // karena memang bukan tanggung jawab pemeriksaan rutin lagi.
    function isPMAktif(pm) { return !!pm && (!pm.statusPM || pm.statusPM === 'Aktif'); }

    // Nomor urut berikutnya untuk antrean hari ini (entri yang dihapus tidak dihitung)
    function _urutanAntrianBerikut() {
      const todayStr = new Date().toDateString();
      return (state.antrian || []).filter(a => new Date(a.tglAntrian).toDateString() === todayStr && a.status !== 'dihapus')
        .reduce((max, a) => Math.max(max, Number(a.urutan) || 0), 0) + 1;
    }

    // ── Navigasi dari kartu Dashboard, disesuaikan dengan akses role ──
    function goDashCard(kind) {
      const punya = (id) => (ROLE_PAGES[state.role] || []).includes(id);
      if (kind === 'antrian') {
        // Sudah ada ringkasannya di dashboard ini juga — cukup scroll ke situ
        document.getElementById('dashAntrian')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (kind === 'belum') {
        document.getElementById('dashWarn')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (kind === 'total') {
        if (punya('pendaftaran')) { showPage('pendaftaran', document.getElementById('navPendaftaran')); return; }
        if (punya('kasi')) { showPage('kasi', document.getElementById('navKasi')); setTimeout(() => showQuickSection('kasi','kasi-sec-datapm','👥 Data PM terdaftar'), 200); return; }
        alert('Menu Data PM tidak tersedia untuk role ini.');
        return;
      }
      if (kind === 'selesai') {
        if (punya('rekap')) { showPage('rekap', document.getElementById('navRekap')); return; }
        alert('Menu Rekap tidak tersedia untuk role ini.');
        return;
      }
      if (kind === 'perhatian') {
        if (punya('kasi')) { showPage('kasi', document.getElementById('navKasi')); setTimeout(() => showQuickSection('kasi','kasi-sec-perhatian','⚠️ PM perlu perhatian / rujuk'), 200); return; }
        if (punya('rekap')) { showPage('rekap', document.getElementById('navRekap')); return; }
        alert('Menu terkait tidak tersedia untuk role ini.');
        return;
      }
      if (kind === 'rujukan_overdue') {
        if (punya('rujukan')) { showPage('rujukan', document.getElementById('navRujukan')); return; }
        if (punya('kasi')) { showPage('kasi', document.getElementById('navKasi')); setTimeout(() => showQuickSection('kasi','kasi-sec-rujukan','🏥 Data rujukan'), 200); return; }
        alert('Menu Rujukan tidak tersedia untuk role ini.');
      }
    }

    // ══════════════════════════════════════
    //  ANTRIAN
    // ══════════════════════════════════════
    function renderAntrian() {
      const todayStr = new Date().toDateString();
      // Prioritas darurat/perlu dokter naik ke atas dulu, baru urut nomor antrian
      const skorPrioritas = (a) => a.prioritas === 'darurat' ? 0 : a.prioritas === 'perlu_dokter' ? 1 : 2;
      const list = state.antrian.filter(a => new Date(a.tglAntrian).toDateString() === todayStr && a.status !== 'dihapus')
        .sort((a, b) => (a.status === 'selesai') - (b.status === 'selesai') || skorPrioritas(a) - skorPrioritas(b) || (Number(a.urutan) || 0) - (Number(b.urutan) || 0));

      const container = document.getElementById('antrianList');
      const empty = document.getElementById('antrianEmpty');

      document.getElementById('sumMenunggu').textContent = list.filter(a => a.status === 'menunggu').length;
      document.getElementById('sumProses').textContent = list.filter(a => a.status === 'proses').length;
      document.getElementById('sumSelesai').textContent = list.filter(a => a.status === 'selesai').length;

      if (list.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        document.getElementById('antrianCount').textContent = '0';
        return;
      }
      empty.style.display = 'none';
      document.getElementById('antrianCount').textContent = list.filter(a => a.status !== 'selesai' && a.status !== 'dihapus').length;

      container.innerHTML = list.map(a => {
        const pm = state.penerima.find(p => p.nomorInduk === a.nomorInduk);
        const nama = pm ? pm.namaPM : a.nomorInduk;
        const cls = a.status === 'selesai' ? 'done' : a.status === 'proses' ? 'in-progress' : '';
        const last = getLastPeriksa(a.nomorInduk);
        const lastStr = last ? new Date(last.tglPeriksa).toLocaleDateString('id-ID') : 'Belum pernah';
        const badgePrioritas = a.prioritas === 'darurat'
          ? '<span class="badge badge-red" style="margin-right:6px;">🚨 DARURAT</span>'
          : a.prioritas === 'perlu_dokter' ? '<span class="badge badge-orange" style="margin-right:6px;">⚡ Perlu Dokter</span>' : '';
        return `<div class="queue-card ${escHtml(cls)}" id="qc-${escHtml(a.nomorInduk)}" style="${a.prioritas === 'darurat' ? 'border-left:4px solid #e74c3c;' : ''}">
      <div class="queue-num">${escHtml(a.urutan)}</div>
      <div style="flex:1">
        <div style="font-weight:600">${badgePrioritas}${escHtml(nama)}</div>
        <div class="text-muted" style="font-size:.75rem">${pm ? escHtml(pm.jenisDis) + ' · ' + escHtml(pm.kamarBlok) : ''}  |  Periksa terakhir: ${escHtml(lastStr)}</div>
      </div>
      <div class="flex" style="gap:6px;flex-shrink:0">
        ${a.status === 'menunggu' ? `<button class="btn btn-accent btn-sm" onclick="setStatusAntrian('${jsArg(a.nomorInduk)}','proses')">🩺 Proses</button>` : ''}
        ${a.status === 'proses' ? `
          <button class="btn btn-primary btn-sm" onclick="bukaAntrianSesuaiRole('${jsArg(a.nomorInduk)}')">📝 Isi Form</button>
          <button class="btn btn-ghost btn-sm" onclick="setStatusAntrian('${jsArg(a.nomorInduk)}','selesai')">✅ Selesai</button>` : ''}
        ${a.status === 'selesai' ? `<span class="badge badge-green">✓ Selesai</span>` : ''}
        <button class="btn btn-sm" style="background:#e8f4fd;color:#2980b9;" title="Rekam Medis" onclick="tampilkanRekamMedis('${jsArg(a.nomorInduk)}')">🕒</button>
        <button class="btn btn-danger btn-sm" onclick="hapusAntrian('${jsArg(a.nomorInduk)}')" title="Hapus dari antrian">✕</button>
      </div>
    </div>`;
      }).join('');
    }

    function openTambahAntrian() {
      document.getElementById('searchAntrian').value = '';
      document.getElementById('searchAntrianResult').innerHTML = '<div class="text-muted" style="padding:1rem;text-align:center">Ketik nama PM di atas untuk mencari...</div>';
      document.getElementById('modalAntrian').classList.add('show');
    }

    function searchPMForAntrian(q) {
      const container = document.getElementById('searchAntrianResult');
      if (q.length < 1) {
        container.innerHTML = '<div class="text-muted" style="padding:1rem;text-align:center">Ketik nama PM di atas untuk mencari...</div>';
        return;
      }
      const results = state.penerima.filter(pm =>
        (pm.namaPM||'').toLowerCase().includes(q.toLowerCase()) ||
        (pm.nomorInduk||'').toLowerCase().includes(q.toLowerCase())
      );
      const todayStr = new Date().toDateString();
      if (results.length === 0) {
        container.innerHTML = '<div class="text-muted" style="padding:1rem;text-align:center">Tidak ditemukan</div>';
        return;
      }
      container.innerHTML = results.map(pm => {
        const sudahAntri = state.antrian.find(a => a.nomorInduk === pm.nomorInduk && new Date(a.tglAntrian).toDateString() === todayStr && a.status !== 'dihapus');
        const last = getLastPeriksa(pm.nomorInduk);
        return `<div class="queue-card" onclick="${sudahAntri ? '' : `tambahKeAntrianLangsung('${jsArg(pm.nomorInduk)}');tutupModal('modalAntrian')`}" style="${sudahAntri ? 'opacity:.6;cursor:not-allowed' : ''}">
      <div class="pm-avatar">${escHtml((pm.namaPM||'?').charAt(0))}</div>
      <div style="flex:1">
        <div style="font-weight:600">${escHtml(pm.namaPM)}</div>
        <div class="text-muted" style="font-size:.75rem">${escHtml(pm.nomorInduk)} · ${escHtml(pm.jenisDis)} · ${escHtml(pm.kamarBlok || '-')}</div>
        <div style="font-size:.73rem;color:var(--text-muted)">Periksa terakhir: ${last ? escHtml(new Date(last.tglPeriksa).toLocaleDateString('id-ID')) : 'Belum pernah'}</div>
      </div>
      ${sudahAntri ? `<span class="badge badge-blue">Sudah antri</span>` : `<span class="badge badge-green">+ Daftarkan</span>`}
    </div>`;
      }).join('');
    }

    function tambahKeAntrianLangsung(nomorInduk) {
      const todayStr = new Date().toDateString();
      const sudah = state.antrian.find(a => a.nomorInduk === nomorInduk && new Date(a.tglAntrian).toDateString() === todayStr);
      if (sudah && sudah.status !== 'dihapus') { showAlert('alertAntrian', 'info', 'PM ini sudah ada di antrian hari ini.'); return; }
      if (sudah) {
        // Pernah dihapus dari antrean hari ini → hidupkan lagi entri yang sama (ID-nya deterministik)
        sudah.status = 'menunggu';
        sudah.urutan = _urutanAntrianBerikut();
        sudah.tglAntrian = new Date().toISOString();
        sudah.updatedAt = new Date().toISOString();
        delete sudah.prioritas;
        saveState(); triggerSyncAfterSave(); renderAntrian(); renderDashboard(); updateAntrianPicker();
        if (typeof updateAntrianPickerPetugas === 'function') updateAntrianPickerPetugas();
        showAlert('alertAntrian', 'success', '✅ PM berhasil ditambahkan ke antrian!'); showToast('✅ PM berhasil ditambahkan ke antrian!');
        return;
      }
      const maxUrutan = _urutanAntrianBerikut() - 1;
      // ✅ ID deterministik: nomorInduk + tanggal → tidak bisa duplikat di server
      const tglKey = isoLokal(new Date()).replace(/-/g, '');
      const safeNomor = String(nomorInduk).replace(/[^a-zA-Z0-9]/g, '');
      state.antrian.push({
        id: `ant_${safeNomor}_${tglKey}`, // ← deterministik, anti-double-entry
        nomorInduk, status: 'menunggu',
        urutan: maxUrutan + 1,
        tglAntrian: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      saveState();
      triggerSyncAfterSave();
      renderAntrian();
      renderDashboard();
      updateAntrianPicker();
      if (typeof updateAntrianPickerPetugas === 'function') updateAntrianPickerPetugas();
      showAlert('alertAntrian', 'success', '✅ PM berhasil ditambahkan ke antrian!'); showToast('✅ PM berhasil ditambahkan ke antrian!');
    }

    // ── Set status antrian hari ini (untuk PM tsb) jadi "proses" begitu pengukuran disimpan ──
    function tandaiAntrianProsesSetelahUkur(nomorInduk) {
      const todayStr = new Date().toDateString();
      const a = (state.antrian || []).find(x => x.nomorInduk === nomorInduk
        && new Date(x.tglAntrian).toDateString() === todayStr
        && x.status === 'menunggu');
      if (!a) return;
      a.status = 'proses';
      a.updatedAt = new Date().toISOString();
      saveState();
      triggerSyncAfterSave();
      renderAntrian(); renderDashboard();
    }

    async function setStatusAntrian(nomorInduk, status) {
      const _hariIni = new Date().toDateString();
      const a = state.antrian.find(x => x.nomorInduk === nomorInduk && x.status !== 'dihapus' && new Date(x.tglAntrian).toDateString() === _hariIni);
      if (!a) return;
      a.status = status;
      a.updatedAt = new Date().toISOString();
      saveState();
      renderAntrian();
      renderDashboard();
      updateAntrianPicker();
      if (typeof updateAntrianPickerPetugas === 'function') updateAntrianPickerPetugas();

      // ✅ Push langsung ke server tanpa tunggu debounce (real-time untuk dashboard kasi)
      if (state.scriptUrl && navigator.onLine) {
        try {
          const _resp = await fetch(state.scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'editAntrian',
              deviceId: state._deviceId,
              data: a
            })
          });
          const _hasil = await _resp.json().catch(() => null);
          if (!_hasil || _hasil.ok !== true) _pendingPush = true; // server menolak → retry di siklus berikutnya
        } catch(e) {
          _pendingPush = true; // akan retry di siklus berikutnya
        }
      } else {
        _pendingPush = true;
      }
    }

    function hapusAntrian(nomorInduk) {
      if (!confirm('Hapus dari antrian?')) return;
      const todayStr = new Date().toDateString();
      const now = new Date().toISOString();
      // ── SOFT DELETE: tandai 'dihapus' + updatedAt terbaru ──
      // Sehingga saat sync, versi lokal (lebih baru) menang atas remote (Sheets)
      state.antrian = state.antrian.map(function(a) {
        if (a.nomorInduk === nomorInduk && new Date(a.tglAntrian).toDateString() === todayStr) {
          return { ...a, status: 'dihapus', updatedAt: now };
        }
        return a;
      });
      // Re-nomor hanya antrian yang masih aktif
      const aktif = state.antrian
        .filter(function(a) { return new Date(a.tglAntrian).toDateString() === todayStr && a.status !== 'dihapus'; })
        .sort(function(a, b) { return a.urutan - b.urutan; });
      // Nomor baru diberi cap waktu supaya ikut terkirim (dulu nomor di perangkat lain tetap yang lama)
      aktif.forEach(function(a, i) { if (Number(a.urutan) !== i + 1) { a.urutan = i + 1; a.updatedAt = now; } });
      saveState();
      triggerSyncAfterSave(); renderAntrian(); renderDashboard(); updateAntrianPicker();
    }

    function filterAntrian(q) {
      const cards = document.querySelectorAll('[id^="qc-"]');
      cards.forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
      });
    }

    function updateAntrianPicker() {
      const todayStr = new Date().toDateString();
      const list = state.antrian.filter(a => new Date(a.tglAntrian).toDateString() === todayStr && a.status !== 'selesai' && a.status !== 'dihapus');
      const container = document.getElementById('antrianPickerList');
      if (!container) return;
      if (list.length === 0) {
        container.innerHTML = '<span class="text-muted" style="font-size:.82rem">Belum ada antrian — <a href="#" onclick="showPage(\'antrian\',null)" style="color:var(--primary)">Daftarkan PM</a></span>';
        return;
      }
      container.innerHTML = list.map(a => {
        const pm = state.penerima.find(p => p.nomorInduk === a.nomorInduk);
        return `<button type="button" class="btn btn-ghost btn-sm" style="font-size:.8rem" onclick="document.getElementById('pilihanPM').value='${jsArg(a.nomorInduk)}';onPilihPM()">
      <div class="queue-num" style="width:22px;height:22px;font-size:.7rem">${escHtml(a.urutan)}</div> ${escHtml(pm ? pm.namaPM : a.nomorInduk)}
    </button>`;
      }).join('');
    }
