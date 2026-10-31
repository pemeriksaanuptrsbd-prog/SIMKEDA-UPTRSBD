    // ══════════════════════════════════════
    //  ADMIN FUNCTIONS
    // ══════════════════════════════════════
    async function simpanPinAdmin() {
      const pA = document.getElementById('pinAdminBaru').value.trim();
      const pD = document.getElementById('pinDokterBaru').value.trim();
      const pP = document.getElementById('pinPetugasBaru').value.trim();
      const pK = document.getElementById('pinKasiBaru2').value.trim();
      // Semua PIN diperiksa & disimpan di server. PIN role lain yang diatur admin
      // wajib diganti sendiri oleh pemiliknya saat login berikutnya.
      const gagalPin = [];
      for (const [r, v] of [['admin', pA], ['dokter', pD], ['petugas', pP], ['kasi', pK]]) {
        if (!v) continue;
        const rr = await kirimGantiPin(v, r);
        if (!rr.ok) gagalPin.push(r + ': ' + (rr.error || 'gagal'));
      }
      if (gagalPin.length) {
        const al0 = document.getElementById('alertPinAdmin');
        if (al0) { al0.className = 'alert alert-error show'; al0.textContent = '❌ ' + gagalPin.join(' | '); }
        return;
      }
      const al = document.getElementById('alertPinAdmin');
      if (al) { al.className = 'alert alert-success show'; al.textContent = '✅ PIN berhasil disimpan!'; } showToast('✅ PIN berhasil disimpan!');
      ['pinAdminBaru', 'pinDokterBaru', 'pinPetugasBaru', 'pinKasiBaru2'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    }

    function renderRiwayatAdmin(q) {
      const tbody = document.getElementById('riwayatAdminBody');
      if (!tbody) return;
      q = q !== undefined ? q : ((document.getElementById('searchRiwayatAdmin')||{}).value || '');
      const minggu = parseInt((document.getElementById('filterAdminRiwayatMinggu') || {}).value || '0');
      let list = [...state.pemeriksaan].filter(p => p && !p._deleted).sort((a, b) => new Date(b.tglPeriksa) - new Date(a.tglPeriksa));
      if (q) list = list.filter(p => (p.namaPM || '').toLowerCase().includes(q.toLowerCase()));
      if (minggu) list = list.filter(p => parseInt(p.mingguKe) === minggu);
      const _pgRiwayatAdmin = document.getElementById('riwayatAdminPagination');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:1.5rem">Tidak ada data</td></tr>'; if (_pgRiwayatAdmin) _pgRiwayatAdmin.innerHTML=''; return; }
      list = _fltTbl('riwayatAdmin', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppRiwayatAdmin = 100;
      const _totalPagesRiwayatAdmin = Math.max(1, Math.ceil(list.length / _ppRiwayatAdmin));
      if (_pageState.riwayatAdmin > _totalPagesRiwayatAdmin) _pageState.riwayatAdmin = _totalPagesRiwayatAdmin;
      const _startRiwayatAdmin = (_pageState.riwayatAdmin - 1) * _ppRiwayatAdmin;
      tbody.innerHTML = '';
      list.slice(_startRiwayatAdmin, _startRiwayatAdmin + _ppRiwayatAdmin).forEach((p, _idx) => {
        const idx = _startRiwayatAdmin + _idx;
        const tr = document.createElement('tr');
        const bc = p.statusKondisi === 'Baik' ? 'badge-green' : p.statusKondisi === 'Rujuk' ? 'badge-red' : 'badge-yellow';
        tr.innerHTML = '<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">' + (escHtml(idx + 1)) + '</td>' +
          '<td style="font-size:.82rem">' + (p.tglPeriksa ? escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')) : '-') + '</td>' +
          '<td><strong>' + (escHtml(p.namaPM || '-')) + '</strong></td>' +
          '<td style="font-size:.8rem;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (escHtml(p.diagnosis || '')) + '">' + (escHtml(p.diagnosis || '-')) + '</td>' +
          '<td>' + (escHtml(p.tekananDarah || '-')) + '</td>' +
          '<td>' + (p.suhuTubuh ? escHtml(p.suhuTubuh + '°C') : '-') + '</td>' +
          '<td style="font-size:.8rem;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (escHtml(p.tindakan || '')) + '">' + (escHtml(p.tindakan || '-')) + '</td>' +
          '<td><span class="badge ' + escHtml(bc) + '">' + (escHtml(p.statusKondisi || '-')) + '</span></td>' +
          '<td></td>';
        const btn = document.createElement('button');
        btn.className = 'btn btn-danger btn-sm'; btn.style.cssText = 'font-size:.75rem;padding:4px 10px';
        btn.textContent = '🗑️ Hapus';
        btn.onclick = () => hapusRiwayatAdmin(p.id);
        const bEdit2 = document.createElement('button');
        bEdit2.className = 'btn btn-accent btn-sm'; bEdit2.style.cssText = 'font-size:.75rem;padding:4px 10px;margin-right:4px';
        bEdit2.textContent = '✏️ Edit'; bEdit2.onclick = () => editRiwayat(p.id);
        tr.lastElementChild.appendChild(bEdit2);
        tr.lastElementChild.appendChild(btn);
        tbody.appendChild(tr);
      });
      _renderPaginationControls('riwayatAdminPagination', 'riwayatAdmin', list.length, _ppRiwayatAdmin, 'renderRiwayatAdmin');
    }

    function filterRiwayatAdmin(q) { _pageState.riwayatAdmin = 1; renderRiwayatAdmin(q); }

    async function hapusRiwayatAdmin(id) {
      // Sama dengan hapus dari halaman pemeriksaan: hapus juga di server (dulu hanya lokal → data muncul lagi saat sinkron)
      const sebelum = state.pemeriksaan.length;
      await hapusRiwayat(id);
      if (state.pemeriksaan.length < sebelum) {
        renderRiwayatAdmin();
        const al = document.getElementById('alertAdminData');
        if (al) { al.className = 'alert alert-success show'; al.textContent = '✅ Data berhasil dihapus.'; }
      }
    }

    function eksporSemuaData() {
      // Dulu rujukan & asesmen awal tidak ikut dicadangkan
      const data = { penerima: state.penerima, pemeriksaan: state.pemeriksaan, pengukuranAwal: state.pengukuranAwal, insidental: (state.insidental || []).filter(x => x && !x._deleted),
        rujukan: (state.rujukan || []).filter(x => x && !x._deleted), asesmenAwal: state.asesmenAwal || [], exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'SIMKEDA-backup-' + isoLokal(new Date()) + '.json'; a.click();
    }

    function prosesImporJSON(input) {
      const file = input.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          let pm = 0, periksa = 0;
          // Rekaman impor diberi cap waktu sekarang: dulu cap waktunya yang lama membuat tarikan
          // berikutnya menganggapnya "sudah dihapus di server" sehingga hasil impor lenyap lagi.
          const _cap = new Date().toISOString();
          const _baru = r => Object.assign({}, r, { updatedAt: _cap });
          const _sama = (a, b) => String(a) === String(b);
          if (Array.isArray(data.penerima)) data.penerima.forEach(p => { if (p && p.nomorInduk && !state.penerima.find(x => _sama(x.nomorInduk, p.nomorInduk))) { state.penerima.push(_baru(p)); pm++; } });
          if (Array.isArray(data.pemeriksaan)) data.pemeriksaan.forEach(p => { if (p && p.id && !state.pemeriksaan.find(x => _sama(x.id, p.id))) { state.pemeriksaan.push(_baru(p)); periksa++; } });
          if (Array.isArray(data.pengukuranAwal)) { if (!state.pengukuranAwal) state.pengukuranAwal = []; data.pengukuranAwal.forEach(p => { if (p && p.id && !state.pengukuranAwal.find(x => _sama(x.id, p.id))) state.pengukuranAwal.push(_baru(p)); }); }
          if (Array.isArray(data.insidental)) { if (!state.insidental) state.insidental = []; data.insidental.forEach(p => { if (p && p.id && !p._deleted && !state.insidental.find(x => _sama(x.id, p.id))) state.insidental.push(_baru(p)); }); }
          if (Array.isArray(data.rujukan)) { if (!state.rujukan) state.rujukan = []; data.rujukan.forEach(p => { if (p && p.id && !p._deleted && !state.rujukan.find(x => _sama(x.id, p.id))) state.rujukan.push(_baru(p)); }); }
          if (Array.isArray(data.asesmenAwal)) { if (!state.asesmenAwal) state.asesmenAwal = []; data.asesmenAwal.forEach(p => { if (p && p.nomorInduk && !state.asesmenAwal.find(x => _sama(x.nomorInduk, p.nomorInduk))) state.asesmenAwal.push(_baru(p)); }); }
          _normalisasiIdState();
          saveState(); triggerSyncAfterSave(); renderDashboard();
          try { _refreshSemuaTampilan(false); } catch (e2) {}
          const al = document.getElementById('alertAdminData');
          if (al) { al.className = 'alert alert-success show'; al.textContent = '✅ Impor: ' + pm + ' PM, ' + periksa + ' pemeriksaan ditambahkan.'; showToast('✅ Impor berhasil: ' + pm + ' PM, ' + periksa + ' pemeriksaan!'); }
        } catch (err) {
          const al = document.getElementById('alertAdminData');
          if (al) { al.className = 'alert alert-warning show'; al.textContent = '❌ File tidak valid: ' + err.message; }
        }
      };
      reader.readAsText(file); input.value = '';
    }

    function hapusSemuaDataLokal() {
      if (!confirm('HAPUS SEMUA DATA LOKAL? Data Google Sheets tetap aman. Lanjutkan?')) return;
      state.penerima = []; state.pemeriksaan = []; state.pengukuranAwal = []; state.insidental = []; state.antrian = [];
      _resetPenandaSinkron();
      saveState(); renderDashboard();
      const al = document.getElementById('alertAdminData');
      if (al) { al.className = 'alert alert-success show'; al.textContent = '✅ Data lokal berhasil dihapus.'; showToast('✅ Data lokal berhasil dihapus.', 'info'); }
    }

    // ══════════════════════════════════════
    //  SMART MERGE SYNC ENGINE
    //  Menggabungkan data dua perangkat (Petugas + Dokter)
    //  tanpa saling menimpa berdasarkan timestamp & ID unik
    // ══════════════════════════════════════

    // Pastikan setiap record punya updatedAt sebelum dikirim ke server.
    // Jika tidak ada, isi dari field timestamp lain yang relevan, atau
    // dari epoch lama (agar tidak menimpa data yang sudah punya updatedAt
    // di server). Ini melindungi data legacy/sample dari merge yang salah.
    function ensureUpdatedAt(arr, fallbackFields) {
      if (!Array.isArray(arr)) return arr;
      return arr.map(function(row) {
        if (!row || typeof row !== 'object') return row;
        if (row.updatedAt) return row;
        const out = Object.assign({}, row);
        // Coba ambil dari field timestamp yang ada
        const fields = fallbackFields || ['waktuInput','tglPeriksa','tglAntrian','tglDaftar','tglSimpan','waktu','tgl','tglPengukuran'];
        for (var i = 0; i < fields.length; i++) {
          if (out[fields[i]]) {
            const t = new Date(out[fields[i]]);
            if (!isNaN(t.getTime())) { out.updatedAt = t.toISOString(); return out; }
          }
        }
        // Tidak ada timestamp sama sekali → pakai epoch lama
        // agar data legacy tidak menimpa data segar di server
        out.updatedAt = '1970-01-01T00:00:00.000Z';
        return out;
      });
    }

    // Bangun payload data yang sudah ter-stempel updatedAt — dipakai bersama
    // oleh pushToSheets, fullSync, dan beforeunload beacon.
    // ── Kirim bertahap (delta) ──
    // Dulu SETIAP sinkron mengirim SELURUH riwayat (semua pemeriksaan + TTD tiap pemeriksaan).
    // Setelah beberapa bulan isinya puluhan MB: sinkron lambat, gagal di batas Apps Script, dan
    // sendBeacon (batas 64 KB) saat menutup halaman tidak pernah terkirim. Server menggabungkan
    // baris kiriman dengan baris yang sudah ada (baris yang tidak dikirim TIDAK dihapus), jadi
    // cukup kirim rekaman yang berubah sejak kirim terakhir yang berhasil (dimundurkan 3 hari
    // sebagai pengaman jam HP). Data kecil, kirim pertama, atau 7 hari sekali tetap dikirim lengkap.
    const _LASTFULLPUSH_KEY = 'simkeda_lastfullpush';
    const _KUNCI_RIWAYAT_BESAR = ['pemeriksaan', 'insidental', 'rujukan', 'pengukuranAwal', 'obatKeluar'];
    let _payloadTerakhirPenuh = true;
    function _batasKirimDelta() {
      try {
        const total = _KUNCI_RIWAYAT_BESAR.reduce((n, k) => n + ((state[k] || []).length), 0);
        if (total <= 1500) return 0;
        const ok = state.lastPushOk ? new Date(state.lastPushOk).getTime() : 0;
        const full = parseInt(localStorage.getItem(_LASTFULLPUSH_KEY) || '0', 10);
        if (!ok || isNaN(ok) || !full || (Date.now() - full) > 7 * 86400000) return 0;
        return ok - 3 * 86400000;
      } catch (e) { return 0; }
    }
    function _catatKirimPenuh() { if (_payloadTerakhirPenuh) { try { localStorage.setItem(_LASTFULLPUSH_KEY, String(Date.now())); } catch (e) {} } }

    function buildSyncPayload() {
      const batas = _batasKirimDelta();
      _payloadTerakhirPenuh = !batas;
      // Penanda hapus (_deleted) tidak dikirim: penghapusan sampai ke server lewat aksi delete*
      // (dulu penanda ini ikut tertulis sebagai baris "_deleted" di spreadsheet).
      const siap = (arr) => (arr || []).filter(r => r && !r._deleted && (!batas || (r.updatedAt && !(new Date(r.updatedAt).getTime() < batas))));
      return {
        penerima:       ensureUpdatedAt(state.penerima        || []),
        pemeriksaan:    ensureUpdatedAt(siap(state.pemeriksaan)),
        pengukuranAwal: ensureUpdatedAt(siap(state.pengukuranAwal)),
        antrian:        ensureUpdatedAt((state.antrian || []).filter(a => new Date(a.tglAntrian).toDateString() === new Date().toDateString())),
        insidental:     ensureUpdatedAt(siap(state.insidental)),
        rujukan:        ensureUpdatedAt(siap(state.rujukan).map(function(r) {
          // Strip base64 foto sebelum ke Sheets — batas sel Sheets 50.000 karakter,
          // base64 foto 100KB saja sudah 136.000 karakter → upsertRow error diam-diam
          var s = Object.assign({}, r);
          if (s.foto1 && String(s.foto1).startsWith('data:')) s.foto1 = '';
          if (s.foto2 && String(s.foto2).startsWith('data:')) s.foto2 = '';
          if (s.foto3 && String(s.foto3).startsWith('data:')) s.foto3 = '';
          return s;
        })),
        asesmenAwal:    ensureUpdatedAt(state.asesmenAwal     || []),
        fotoMinggu:     ensureUpdatedAt((state.fotoMinggu     || []).filter(f => f.isLink)),
        stokObat:       ensureUpdatedAt(state.stokObat        || []),
        // Catatan "ok-sync-…" dibuat ulang di tiap perangkat dari pemeriksaan/insidental —
        // tidak dikirim, supaya server tidak berisi catatan ganda (pemakaian terhitung dua kali).
        obatKeluar:     ensureUpdatedAt(siap(state.obatKeluar).filter(o => !String(o.id || '').startsWith('ok-sync-'))),
      };
    }

    // Merge array by unique id — ambil record terbaru berdasarkan updatedAt / id
    // kunci: nama field ID unik (default 'id'; asesmenAwal memakai 'nomorInduk').
    // Dulu rekaman tanpa field 'id' (asesmen awal) DIBUANG semua saat sinkron.
    function smartMerge(local, remote, kunci) {
      kunci = kunci || 'id';
      if (!remote || !remote.length) return local || [];
      if (!local || !local.length) return remote;
      const _k = x => (x && x[kunci] !== undefined && x[kunci] !== null && x[kunci] !== '') ? String(x[kunci]) : '';

      // ── Deteksi hapus dari Sheets ──────────────────────────────────
      // Jika record ada di lokal tapi TIDAK ada di remote, ada 2 kemungkinan:
      // a) Record baru dibuat lokal, belum di-push → PERTAHANKAN
      // b) Record dihapus langsung dari Sheets → IKUTI REMOTE (hapus dari lokal)
      // Cara membedakan: bandingkan updatedAt record dengan lastSync.
      // Jika updatedAt < lastSync → record sudah ada saat sync terakhir → kasus (b)
      const lastSync = _batasHapusServer();
      const remoteIds = new Set(remote.map(_k).filter(Boolean));

      const map = {};
      local.forEach(item => {
        if (!_k(item)) return;
        const idStr = _k(item);
        // Cek apakah record ini tidak ada di remote
        if (!remoteIds.has(idStr)) {
          // Kalau ini tombstone _deleted → tetap simpan agar tidak restore dari remote
          if (item._deleted) { map[idStr] = item; return; }
          // Kalau updatedAt lebih lama dari lastSync → dihapus dari Sheets → skip
          const tLocal = new Date(item.updatedAt || 0).getTime();
          if (!_modeDelta && lastSync > 0 && tLocal < lastSync) return; // Dihapus dari Sheets (dilewati pada sinkron bertahap)
        }
        map[idStr] = item;
      });

      // Remote menimpa hanya jika lebih baru atau id belum ada
      remote.forEach(item => {
        if (!_k(item)) return;
        const idStr = _k(item);
        const existing = map[idStr];
        if (!existing) {
          // Record baru dari perangkat lain — tapi jangan restore jika lokal punya tombstone
          map[idStr] = item;
        } else {
          // Tombstone lokal lebih baru → jangan timpa dengan data lama dari remote
          if (existing._deleted) return;
          const tLocal  = new Date(existing.updatedAt || existing.tglPeriksa || existing.tglAntrian || 0).getTime();
          const tRemote = new Date(item.updatedAt    || item.tglPeriksa     || item.tglAntrian     || 0).getTime();
          if (tRemote > tLocal) map[idStr] = Object.assign({}, existing, item);
        }
      });
      return Object.values(map);
    }

    // Merge khusus rujukan — menjaga foto URL lokal (Drive URL) agar tidak tertimpa
    // data Sheets yang kosong fotonya (karena upload belum masuk saat sync terakhir)
    function smartMergeRujukan(local, remote) {
      const merged = smartMerge(local, remote);
      const localMap = {};
      (local || []).forEach(x => { if (x.id) localMap[String(x.id)] = x; });
      return merged.map(item => {
        if (!item.id) return item;
        const lok = localMap[String(item.id)];
        if (!lok) return item;
        const result = { ...item };
        // Foto lokal (Drive URL) TIDAK boleh tertimpa remote yang kosong/tidak ada,
        // termasuk saat race condition: push belum selesai tulis ke Sheets tapi pull sudah datang
        const isDriveUrl = u => u && !String(u).startsWith('data:') && String(u).length > 10;
        const isMissing  = u => !u || String(u) === '' || String(u).startsWith('data:');
        if (isDriveUrl(lok.foto1) && isMissing(result.foto1)) result.foto1 = lok.foto1;
        if (isDriveUrl(lok.foto2) && isMissing(result.foto2)) result.foto2 = lok.foto2;
        return result;
      });
    }

    // Merge khusus pengukuranAwal — gunakan nomorInduk+tglPengukuran sebagai fallback key bila id hilang
    // Helper: normalisasi tanggal ke YYYY-MM-DD (inline agar bisa dipakai sebelum normTgl dideklarasi)
    function _normTglMerge(val) {
      if (!val) return '';
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val).substring(0, 10);
        // Gunakan waktu lokal agar tidak geser timezone (midnight UTC = hari sebelumnya di WIB)
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      } catch(e) { return String(val).substring(0, 10); }
    }

    function smartMergePengukuran(local, remote) {
      if (!remote || !remote.length) return local || [];
      if (!local || !local.length) {
        return remote.map(x => x.tglPengukuran ? Object.assign({}, x, { tglPengukuran: _normTglMerge(x.tglPengukuran) }) : x);
      }
      const normItem = x => x.tglPengukuran ? Object.assign({}, x, { tglPengukuran: _normTglMerge(x.tglPengukuran) }) : x;
      const keyOf = item => item.id ? String(item.id) : (item.nomorInduk + '_' + item.tglPengukuran);

      const lastSync = _batasHapusServer();
      const remoteKeys = new Set(remote.map(x => { const n = normItem(x); return keyOf(n); }).filter(Boolean));

      const map = {};
      local.forEach(item => {
        item = normItem(item);
        const k = keyOf(item);
        if (!k) return;
        // Deteksi hapus dari Sheets
        if (!remoteKeys.has(k) && !item._deleted) {
          const tLocal = new Date(item.updatedAt || item.waktuInput || item.tglPengukuran || 0).getTime();
          if (!_modeDelta && lastSync > 0 && tLocal < lastSync) return; // Dihapus dari Sheets (dilewati pada sinkron bertahap)
        }
        map[k] = item;
      });
      remote.forEach(item => {
        item = normItem(item);
        const k = keyOf(item);
        if (!k) return;
        const existing = map[k];
        if (!existing) {
          map[k] = item;
        } else {
          if (existing._deleted) return;
          const tLocal  = new Date(existing.updatedAt || existing.waktuInput || existing.tglPengukuran || 0).getTime();
          const tRemote = new Date(item.updatedAt || item.waktuInput || item.tglPengukuran || 0).getTime();
          if (tRemote >= tLocal) map[k] = Object.assign({}, existing, item);
          else map[k] = Object.assign({}, item, existing);
        }
      });
      return Object.values(map);
    }

    // Merge khusus pemeriksaan — gunakan nomorInduk+tglPeriksa sebagai fallback key bila id hilang
    function smartMergePemeriksaan(local, remote) {
      if (!remote || !remote.length) return local || [];
      if (!local || !local.length) {
        return remote.map(x => x.tglPeriksa ? Object.assign({}, x, { tglPeriksa: _normTglMerge(x.tglPeriksa) }) : x);
      }
      const normItem = x => x.tglPeriksa ? Object.assign({}, x, { tglPeriksa: _normTglMerge(x.tglPeriksa) }) : x;
      const keyOf = item => item.id ? String(item.id) : (item.nomorInduk + '_' + item.tglPeriksa);

      const lastSync = _batasHapusServer();
      const remoteKeys = new Set(remote.map(x => { const n = normItem(x); return keyOf(n); }).filter(Boolean));

      const map = {};
      local.forEach(item => {
        item = normItem(item);
        const k = keyOf(item);
        if (!k) return;
        // Deteksi hapus dari Sheets
        if (!remoteKeys.has(k) && !item._deleted) {
          const tLocal = new Date(item.updatedAt || item.tglPeriksa || 0).getTime();
          if (!_modeDelta && lastSync > 0 && tLocal < lastSync) return; // Dihapus dari Sheets (dilewati pada sinkron bertahap)
        }
        map[k] = item;
      });
      remote.forEach(item => {
        item = normItem(item);
        const k = keyOf(item);
        if (!k) return;
        const existing = map[k];
        if (!existing) {
          map[k] = item;
        } else {
          if (existing._deleted) return; // Tombstone lokal menang
          const tLocal  = new Date(existing.updatedAt || existing.tglPeriksa || 0).getTime();
          const tRemote = new Date(item.updatedAt || item.tglPeriksa || 0).getTime();
          if (tRemote >= tLocal) map[k] = Object.assign({}, existing, item);
          else map[k] = Object.assign({}, item, existing);
        }
      });
      return Object.values(map);
    }

    // Merge penerima (data PM) — by nomorInduk
    function smartMergePM(local, remote) {
      if (!remote || !remote.length) return local || [];
      if (!local || !local.length) return remote;

      const lastSync = _batasHapusServer();
      const remoteIds = new Set(remote.filter(x => x.nomorInduk).map(x => String(x.nomorInduk)));

      const map = {};
      local.forEach(pm => {
        if (!pm.nomorInduk) return;
        // Deteksi hapus dari Sheets
        if (!remoteIds.has(String(pm.nomorInduk))) {
          const tLocal = new Date(pm.updatedAt || 0).getTime();
          if (lastSync > 0 && tLocal < lastSync) return; // Dihapus dari Sheets
        }
        map[String(pm.nomorInduk)] = pm;
      });
      remote.forEach(pm => {
        if (!pm.nomorInduk) return;
        const kunci = String(pm.nomorInduk);
        const existing = map[kunci];
        if (!existing) {
          map[kunci] = pm;
        } else {
          const tL = new Date(existing.updatedAt || 0).getTime();
          const tR = new Date(pm.updatedAt || 0).getTime();
          if (tR > tL) map[kunci] = pm;
        }
      });
      return Object.values(map);
    }

    // Merge antrian hari ini saja
    function smartMergeAntrian(local, remote) {
      const todayStr = new Date().toDateString();
      const localToday  = (local  || []).filter(function(a) { return new Date(a.tglAntrian).toDateString() === todayStr; });
      const remoteToday = (remote || []).filter(function(a) { return new Date(a.tglAntrian).toDateString() === todayStr; });
      // Gunakan smartMerge biasa — versi lokal 'dihapus' dengan updatedAt lebih baru
      // akan menang atas versi remote yang masih aktif
      const merged = smartMerge(localToday, remoteToday);
      // Simpan tombstone 'dihapus' di state (agar merge berikutnya tetap menang)
      // tapi filter dari tampilan dilakukan di renderAntrian
      return merged;
    }

    // ── Sinkron bertahap (delta) ──
    // Bila server menilai data sudah besar, ia hanya mengirim baris yang berubah.
    // Karena baris lama tidak ikut terkirim, "tidak ada di server" TIDAK boleh
    // dianggap "sudah dihapus" (penghapusan ditangani lewat daftar terhapus).
    // Tiap 24 jam perangkat tetap mengambil data LENGKAP sebagai pengaman.
    var _modeDelta = false;
    const _LASTFULL_KEY = 'simkeda_lastfull';
    function _urlLoadAll() {
      let url = state.scriptUrl + '?action=loadAll';
      try {
        const lf = parseInt(localStorage.getItem(_LASTFULL_KEY) || '0', 10);
        const ls = state.lastSync ? new Date(state.lastSync).getTime() : 0;
        const adaData = ((state.pemeriksaan || []).length + (state.penerima || []).length) > 0;
        if (adaData && ls > 0 && lf > 0 && (Date.now() - lf) < 24 * 3600 * 1000) {
          url += '&sejak=' + encodeURIComponent(new Date(ls - 7 * 86400000).toISOString());
        }
      } catch (e) {}
      return url;
    }
    // Setelah data lokal dikosongkan, tarikan berikutnya WAJIB lengkap. Dulu penanda sinkron
    // lama tetap ada → bila data besar, server hanya mengirim perubahan 7 hari terakhir dan
    // riwayat lama tidak kembali ke perangkat sampai 24 jam kemudian.
    function _resetPenandaSinkron() {
      state.lastSync = null;
      try { localStorage.removeItem(_LASTFULL_KEY); localStorage.removeItem(_LASTFULLPUSH_KEY); } catch (e) {}
    }
    function _catatHasilLoadAll(d) {
      _modeDelta = !!(d && d.delta);
      if (!_modeDelta) { try { localStorage.setItem(_LASTFULL_KEY, String(Date.now())); } catch (e) {} }
    }

    // Waktu MULAI kirim (syncAll) terakhir yang berhasil. Rekaman lokal yang
    // diubah SEBELUM waktu ini pasti sudah ikut terkirim ke server, jadi bila
    // tidak ada lagi di server berarti memang dihapus di sana. Rekaman sesudahnya
    // (belum pernah terkirim) TIDAK boleh dianggap terhapus.
    function _batasHapusServer() {
      const t = state.lastPushOk ? new Date(state.lastPushOk).getTime() : 0;
      return isNaN(t) ? 0 : t;
    }
    function _adaSelisihStokTertunda() {
      try { return _bacaAntrean().some(it => it && (it.action === 'ubahStok' || it.action === 'saveStokObat')); } catch (e) { return false; }
    }
    // Terapkan hasil loadAll dari server ke state lokal (dipakai muatDariSheets & fullSync)
    function _terapkanLoadAll(d) {
      _catatHasilLoadAll(d);

        // ── SMART MERGE: gabungkan lokal + remote, tidak ada yang tertimpa sembarangan ──
        state.penerima      = smartMergePM(state.penerima, d.penerima);
        state.pemeriksaan   = smartMergePemeriksaan(state.pemeriksaan, d.pemeriksaan);
        // Tanggal insidental dinormalkan ke YYYY-MM-DD (sel tanggal di Sheets bisa terbaca sebagai ISO lengkap)
        state.insidental    = smartMerge(state.insidental, (d.insidental || []).map(x => x && x.tgl ? Object.assign({}, x, { tgl: _normTglMerge(x.tgl) }) : x));
        // Normalisasi tgl + bersihkan nilai foto yang tidak valid dari Sheets (0, '0', '-')
        const _bersihFoto = v => (v && String(v) !== '0' && String(v) !== '-' && String(v).length > 10) ? v : '';
        const rujukanNorm = (d.rujukan || []).map(x => ({
          ...x,
          tgl:   _normTglMerge(x.tgl),
          foto1: _bersihFoto(x.foto1),
          foto2: _bersihFoto(x.foto2),
          foto3: _bersihFoto(x.foto3)
        }));
        state.rujukan       = smartMergeRujukan(state.rujukan, rujukanNorm);
        state.pengukuranAwal = smartMergePengukuran(state.pengukuranAwal, d.pengukuranAwal);
        state.antrian       = smartMergeAntrian(state.antrian, d.antrian);

        // ── STOK OBAT: selalu merge, prioritaskan remote jika lokal kosong ──
        {
          const lokal = state.stokObat || [];
          const remote = d.stokObat || [];
          if (lokal.length === 0) {
            state.stokObat = remote;
          } else if (remote.length > 0) {
            const map = {};
            lokal.forEach(o => { if (o && o.nama) map[String(o.nama).trim().toLowerCase()] = o; });
            remote.forEach(o => {
              if (!o || !o.nama) return;
              const key = String(o.nama).trim().toLowerCase();
              if (!map[key]) {
                map[key] = o;
              } else {
                const tL = new Date(map[key].updatedAt || 0).getTime();
                const tR = new Date(o.updatedAt || 0).getTime();
                if (tR >= tL) map[key] = { ...map[key], ...o };
                // Jumlah stok: server yang benar (perubahan dikirim sebagai selisih),
                // kecuali masih ada perubahan stok dari perangkat ini yang belum terkirim.
                else if (!_adaSelisihStokTertunda()) map[key] = { ...map[key], stok: o.stok };
              }
            });
            state.stokObat = Object.values(map);
          }
        }

        // ── OBAT KELUAR: merge dari Sheets — semua device bisa lihat data pemakaian ──
        if (d.obatKeluar && d.obatKeluar.length) {
          // Normalisasi tgl dari ISO ke YYYY-MM-DD sebelum merge
          const normalized = d.obatKeluar.map(o => ({
            ...o,
            tgl: o.tgl ? normTgl(o.tgl) : ''
          }));
          state.obatKeluar = smartMerge(state.obatKeluar || [], normalized);
        }
        if (d.asesmenAwal && d.asesmenAwal.length) {
          state.asesmenAwal = smartMerge(state.asesmenAwal || [], d.asesmenAwal, 'nomorInduk');
        }
        if (d.fotoMinggu && d.fotoMinggu.length) {
          // Foto yang sudah di Drive (alamat http) dianggap tautan walau barisnya di server masih
          // isLink=false (server lama menyimpannya begitu). Tautan lokal yang belum ada di server
          // TIDAK dibuang lagi (dulu: smartMerge([], …) → foto yang baru diunggah lenyap dari
          // perangkat pengunggah dan tidak pernah terkirim ke perangkat lain).
          const _tautan = f => f && f.url && !String(f.url).startsWith('data:') && (f.isLink === true || f.isLink === 'true' || /^https?:\/\//i.test(String(f.url)));
          const lokalBase64 = (state.fotoMinggu || []).filter(f => f && !_tautan(f));
          const lokalLink = (state.fotoMinggu || []).filter(_tautan);
          const remoteLink = d.fotoMinggu.filter(_tautan).map(f => Object.assign({}, f, { isLink: true }));
          state.fotoMinggu = [...lokalBase64, ...smartMerge(lokalLink, remoteLink)];
        }

        // ── Data yang sudah dihapus di perangkat lain: jangan muncul lagi ──
        if (Array.isArray(d.terhapus) && d.terhapus.length && _terapkanTerhapus(d.terhapus)) { try { saveState(); } catch (e) {} }

        // ── PROFIL GLOBAL (dari Admin): sinkron otomatis ke semua device ──
        if (d.globalProfile && typeof d.globalProfile === 'object') {
          syncPinsFromProfile(d.globalProfile);
          if (d.globalProfile.namaPetugas) state.namaPetugas = d.globalProfile.namaPetugas;
          if (d.globalProfile.defaultDokter) state.defaultDokter = d.globalProfile.defaultDokter;
          if (d.globalProfile.namaKasi) state.namaKasi = d.globalProfile.namaKasi;
          if (d.globalProfile.daftarPetugas && Array.isArray(d.globalProfile.daftarPetugas)) {
            state.daftarPetugas = d.globalProfile.daftarPetugas;
            // Tambahkan namaPetugas ke daftar jika belum ada
            if (state.namaPetugas && !state.daftarPetugas.includes(state.namaPetugas)) {
              state.daftarPetugas.push(state.namaPetugas);
            }
          }
          // Sync TTD Dokter default ke semua device
          if (d.globalProfile.ttdDokterBase64 && d.globalProfile.ttdDokterBase64.length > 100) {
            state.ttdDokterBase64 = d.globalProfile.ttdDokterBase64;
            // Refresh canvas jika halaman pemeriksaan sedang terbuka
            const canvas = document.getElementById('ttdCanvas');
            if (canvas && canvas._init) {
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              const img = new Image();
              img.onload = () => { ctx.drawImage(img, 0, 0); };
              img.src = state.ttdDokterBase64;
              const ph = document.getElementById('ttdPlaceholder');
              if (ph) ph.style.display = 'none';
              const st = document.getElementById('ttdStatus');
              if (st) st.textContent = '✅ TTD default dimuat dari server';
            }
          }
          // Sync TTD Kasi dan Petugas ke semua device
          if (d.globalProfile.ttdKasiBase64 && d.globalProfile.ttdKasiBase64.length > 100) {
            state.ttdKasiBase64 = d.globalProfile.ttdKasiBase64;
            _refreshTTDPreview && _refreshTTDPreview('ttdKasiPreview', 'ttdKasiEmpty', state.ttdKasiBase64);
          }
          if (d.globalProfile.ttdPetugasBase64 && d.globalProfile.ttdPetugasBase64.length > 100) {
            state.ttdPetugasBase64 = d.globalProfile.ttdPetugasBase64;
            _refreshTTDPreview && _refreshTTDPreview('ttdPetugasPreview', 'ttdPetugasEmpty', state.ttdPetugasBase64);
          }
        }

      _normalisasiIdState();
      // ── Rebuild log pemakaian obat dari data sync (fix HP lain) ──
      try { rebuildObatKeluarDariSync(); } catch (e) { console.warn('[SIMKEDA] rebuild obat keluar:', e); }
    }

    function _refreshSemuaTampilan(denganKasi) {
      const coba = function(f) { try { if (typeof f === 'function') f(); } catch (e) { console.warn('[SIMKEDA] render gagal:', e); } };
      [renderDashboard, renderListPM, function() { renderRiwayat(); }, renderAntrian, updateSelectPM, updateSelectPMPetugas,
       updateSelectInsidental, updateSelectRujukan, function() { renderInsidental(); }, function() { renderRujukan(); },
       renderRekapInsidental, renderRekapRujukan, updateAntrianPicker, updateAntrianPickerPetugas, renderDaftarPengukuran,
       renderDaftarSiapPeriksa, function() { renderStokObat(); }, updateSelectMutasiObat, updateStokStats, renderRekapObat,
       renderLogMutasi, function() { if (typeof updateSelectAsesmen === 'function') updateSelectAsesmen(); },
       function() { if (typeof renderAsesmenList === 'function') renderAsesmenList(); },
       function() { if (typeof renderRiwayatAdmin === 'function') renderRiwayatAdmin(); }].forEach(coba);
      if (denganKasi) coba(function() { if (typeof renderKasi === 'function' && document.getElementById('page-kasi') && document.getElementById('page-kasi').classList.contains('active')) renderKasi(); });
    }

    // Ambil loadAll dari server → { ok, json, error }
    function _ambilLoadAll() {
      return new Promise(function(res) {
        const xhr = new XMLHttpRequest();
        const t = setTimeout(function(){ xhr.abort(); }, 30000);
        xhr.open('GET', _urlLoadAll(), true);
        xhr.onload = function() {
          clearTimeout(t);
          let json = null;
          try { json = JSON.parse(xhr.responseText); } catch (e) { return res({ ok: false, error: 'Respons bukan JSON' }); }
          if (!json || !json.ok || !json.data) {
            const msg = (json && json.error) || 'Respons tidak valid dari Sheets';
            if (/sesi tidak sah/i.test(msg) && typeof _laporkanSyncGagal === 'function') _laporkanSyncGagal(msg);
            return res({ ok: false, error: msg });
          }
          res({ ok: true, json: json });
        };
        xhr.onerror = function(){ clearTimeout(t); res({ ok: false, error: 'Tidak bisa terhubung ke server' }); };
        xhr.onabort = function(){ clearTimeout(t); res({ ok: false, error: 'Waktu habis (timeout)' }); };
        xhr.send();
      });
    }

    let _pullJalan = false;
    async function muatDariSheets(silent = false) {
      if (!state.scriptUrl) {
        if (!silent) showAlert('alertAdminData', 'warning', '⚠️ URL Apps Script belum diatur. Silakan atur di halaman Setelan.');
        return false;
      }
      if (_pullJalan || _syncInProgress) return false;   // jangan menarik bersamaan dengan fullSync
      _pullJalan = true;
      const indikator = document.getElementById('syncIndikator');
      if (indikator) { indikator.style.display = ''; indikator.textContent = '🔄 Sinkronisasi...'; }
      try {
        // Perubahan tertunda (mis. hapus pemeriksaan saat sinyal putus) dikirim dulu —
        // kalau tidak, data yang baru dihapus bisa muncul lagi dari hasil tarikan.
        try { if (_bacaAntrean().length) await kirimAntrean(); } catch (e) {}
        const r = await _ambilLoadAll();
        if (!r.ok) throw new Error(r.error);
        _terapkanLoadAll(r.json.data);
        state.lastSync = new Date().toISOString();
        state._syncVersion = (state._syncVersion || 0) + 1;
        saveState();
        _refreshSemuaTampilan(!silent);

        if (indikator) {
          indikator.textContent = '✅ Tersinkron ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          setTimeout(() => { indikator.style.display = 'none'; }, 4000);
        }
        if (!silent) {
          showAlert('alertAdminData', 'success', '✅ Sinkronisasi berhasil! Data diperbarui dari Google Sheets.');
          showToast('✅ Sinkronisasi berhasil!', 'success');
        }
        return true;
      } catch (err) {
        if (indikator) { indikator.textContent = '❌ Gagal sync'; setTimeout(() => { indikator.style.display = 'none'; }, 3000); }
        if (!silent) showAlert('alertAdminData', 'error', '❌ Gagal sinkronisasi: ' + err.message);
        console.warn('Sync error:', err);
        return false;
      } finally {
        _pullJalan = false;
      }
    }

    // ══════════════════════════════════════════════════════
    //  AUTO-SYNC ENGINE — Multi-perangkat (Petugas + Dokter)
    //  Sync otomatis setiap 30 detik + trigger saat simpan data
    // ══════════════════════════════════════════════════════

    let _autoSyncTimer = null;
    let _autoSyncPaused = false;
    let _syncInProgress = false;
    let _pendingPush = false;
    let _lastActivityTime = Date.now();
    let _currentSyncInterval = 30000;
    (function() {
      ['mousedown','keydown','touchstart','scroll','click'].forEach(function(ev) {
        document.addEventListener(ev, function() { _lastActivityTime = Date.now(); }, { passive: true });
      });
    })();
    function getIdleSeconds() { return (Date.now() - _lastActivityTime) / 1000; }
    function getAdaptiveInterval() {
      const idle = getIdleSeconds();
      if (idle < 300)  return 30000;
      if (idle < 900)  return 120000;
      return 300000;
    }

    // Indikator sync di UI
    function updateSyncBadge(status, msg) {
      const badge = document.getElementById('syncLiveBadge');
      if (!badge) return;
      const styles = {
        syncing:  { bg: '#e3f2fd', color: '#1565c0', text: '🔄 Sinkronisasi...' },
        ok:       { bg: '#e8f5e9', color: '#2e7d32', text: msg || '✅ Tersinkron' },
        pending:  { bg: '#fff8e1', color: '#e65100', text: '⏳ Menunggu kirim...' },
        error:    { bg: '#fdecea', color: '#b71c1c', text: msg || '❌ Gagal sync' },
        offline:  { bg: '#f5f5f5', color: '#757575', text: '📵 Offline — data lokal' },
        idle:     { bg: 'transparent', color: '#9e9e9e', text: '' },
      };
      const s = styles[status] || styles.idle;
      badge.style.background = s.bg;
      badge.style.color = s.color;
      badge.textContent = s.text;
      badge.style.display = s.text ? 'inline-flex' : 'none';
    }

    // Push data lokal ke Google Sheets (kirim semua koleksi)
    async function pushToSheets(silent = true) {
      if (!state.scriptUrl || _syncInProgress) return false;
      if (!navigator.onLine) { updateSyncBadge('offline'); return false; }
      _syncInProgress = true;
      updateSyncBadge('syncing');
      const _mulaiPush = new Date().toISOString();
      const _versiAwalPush = _versiSimpan;
      try {
        const _resp = await fetch(state.scriptUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'syncAll',
            deviceId: state._deviceId,
            data: buildSyncPayload()
          })
        });
        const _rawText = await _resp.text();
        let _hasil = null;
        try { _hasil = JSON.parse(_rawText); } catch (parseErr) {
          console.error('[SIMKEDA] pushToSheets: respons bukan JSON valid. HTTP status=' + _resp.status + ' raw=', _rawText.slice(0, 500));
        }
        if (!_hasil || _hasil.ok !== true) {
          // Server menjawab tapi menolak (mis. otorisasi/rate-limit), atau
          // responsnya tidak bisa dibaca sama sekali — JANGAN dianggap
          // sukses seperti sebelumnya dengan mode:'no-cors'.
          console.warn('[SIMKEDA] pushToSheets ditolak/gagal:', _hasil && _hasil.error);
          _pendingPush = true;
          updateSyncBadge('error', '❌ Gagal: ' + (_hasil && _hasil.error ? _hasil.error : 'respons tidak dikenali (status ' + _resp.status + ')'));
          return false;
        }
        _pendingPush = _versiSimpan !== _versiAwalPush;
        state.lastPush = new Date().toISOString();
        state.lastPushOk = _mulaiPush;
        _catatKirimPenuh();
        saveState();
        const tgl = new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
        updateSyncBadge('ok', '✅ Tersinkron ' + tgl);
        return true;
      } catch (e) {
        console.warn('Push error:', e);
        _pendingPush = true;
        updateSyncBadge('error', '❌ Gagal kirim — akan retry');
        return false;
      } finally {
        _syncInProgress = false;
      }
    }

    // Pull + merge data dari Sheets ke lokal
    async function pullFromSheets(silent = true) {
      if (!state.scriptUrl || _syncInProgress) return false;
      if (!navigator.onLine) { updateSyncBadge('offline'); return false; }
      // Perubahan yang belum terkirim harus dikirim dulu — kalau tidak, hasil tarikan
      // bisa tampak "menimpa" input terbaru di layar.
      if (_pendingPush) return await fullSync(silent);
      return await muatDariSheets(silent);
    }

    // Kirim seluruh data lokal (syncAll) → true bila server menerima
    async function _kirimSyncAll() {
      const mulai = new Date().toISOString();
      try {
        const resp = await fetch(state.scriptUrl, {
          method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'syncAll', deviceId: state._deviceId, data: buildSyncPayload() })
        });
        const raw = await resp.text();
        let hasil = null;
        try { hasil = JSON.parse(raw); } catch (pe) {
          console.error('[SIMKEDA] syncAll: respons bukan JSON valid. HTTP status=' + resp.status + ' raw=', raw.slice(0, 500));
        }
        if (!hasil || hasil.ok !== true) {
          const msg = hasil && hasil.error ? hasil.error : 'respons tidak dikenali (status ' + resp.status + ')';
          console.warn('[SIMKEDA] syncAll ditolak/gagal:', msg);
          return { ok: false, error: msg };
        }
        state.lastPush = new Date().toISOString();
        state.lastPushOk = mulai;
        _catatKirimPenuh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: 'tidak bisa terhubung (' + (e && e.message ? e.message : 'jaringan') + ')' };
      }
    }

    // Full cycle: push dulu, lalu pull & merge. → true bila keduanya berhasil
    let _versiSimpan = 0;
    async function fullSync(silent = true) {
      if (_syncInProgress || _pullJalan) return false;
      if (!state.scriptUrl) return false;
      if (!navigator.onLine) { updateSyncBadge('offline'); return false; }
      _syncInProgress = true;
      const versiAwal = _versiSimpan;
      updateSyncBadge('syncing');
      let pushOk = false, pullOk = false;
      try {
        // 1. Kirim antrean perubahan tertunda dulu (urutan tetap terjaga), lalu kirim semua data
        try { if (_bacaAntrean().length) await kirimAntrean(); } catch (e) {}
        const rp = await _kirimSyncAll();
        pushOk = rp.ok;
        if (!pushOk) _laporkanSyncGagal(rp.error);
        // 2. Beri waktu server menyelesaikan tulisan sebelum menarik data
        await new Promise(r => setTimeout(r, pushOk ? 1500 : 0));
        // 3. Tarik & gabungkan
        const r = await _ambilLoadAll();
        if (r.ok) {
          _terapkanLoadAll(r.json.data);
          state.lastSync = new Date().toISOString();
          state._syncVersion = (state._syncVersion || 0) + 1;
          pullOk = true;
        } else {
          console.warn('[SIMKEDA] Pull gagal:', r.error);
        }
        saveState();
        _refreshSemuaTampilan(true);
        const tgl = new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
        if (pushOk && pullOk) {
          updateSyncBadge('ok', '✅ Tersinkron ' + tgl);
          if (!silent) showToast('✅ Sync selesai — ' + tgl, 'success');
        } else {
          updateSyncBadge('error', pushOk ? '❌ Gagal mengambil data — akan dicoba lagi' : '❌ Gagal kirim — akan dicoba lagi');
          if (!silent) showToast('⚠️ Sinkronisasi belum berhasil — akan dicoba lagi otomatis.', 'info');
        }
      } catch (err) {
        updateSyncBadge('error', '❌ Gagal — ' + String(err && err.message || err).slice(0,30));
        console.warn('fullSync error:', err);
      } finally {
        // Masih perlu kirim bila kirim gagal ATAU ada simpanan baru selama proses ini
        _pendingPush = !pushOk || _versiSimpan !== versiAwal;
        _syncInProgress = false;
      }
      return pushOk && pullOk;
    }

    function startAutoSync() {
      if (_autoSyncTimer) clearTimeout(_autoSyncTimer);
      if (!state.scriptUrl) return;
      function scheduleNext() {
        const interval = getAdaptiveInterval();
        _autoSyncTimer = setTimeout(async function() {
          if (!_autoSyncPaused && !document.hidden && navigator.onLine) {
            if (_pendingPush) { await fullSync(true); }
            else { await pullFromSheets(true); }
          }
          scheduleNext();
        }, interval);
      }
      scheduleNext();
      console.log('[SIMKEDA] Auto-sync adaptif aktif');
    }
    function stopAutoSync() {
      if (_autoSyncTimer) { clearTimeout(_autoSyncTimer); _autoSyncTimer = null; }
    }

    // ── Fast Poll Antrian (khusus untuk real-time dashboard kasi) ──
    // Ini terpisah dari fullSync berat. Hanya pull data antrian → 10 detik.
    let _fastAntrianTimer = null;
    let _fastPollFallback = false; // flag: jika action=loadAntrian belum ada di GAS, pakai fallback ringan
    async function fastPollAntrian() {
      if (!state.scriptUrl || !navigator.onLine || _syncInProgress || document.hidden) return;
      try {
        // Coba endpoint khusus loadAntrian dulu (lebih ringan)
        const url = state.scriptUrl + (_fastPollFallback ? '?action=loadAll' : '?action=loadAntrian');
        const res = await fetch(url);
        const json = await res.json();
        if (!json || !json.ok) return;   // sesi habis / batas laju / server sibuk — coba lagi nanti
        // Server lama tanpa action loadAntrian menjawab ok tanpa data → pakai loadAll
        if (!_fastPollFallback && !Array.isArray(json.data)) { _fastPollFallback = true; return; }
        let antrianBaru = null;
        if (Array.isArray(json.data)) {
          antrianBaru = json.data; // dari action=loadAntrian
        } else if (json.data && Array.isArray(json.data.antrian)) {
          antrianBaru = json.data.antrian; // dari action=loadAll
        }
        if (antrianBaru && !_syncInProgress && !_pullJalan) {
          state.antrian = smartMergeAntrian(state.antrian, antrianBaru);
          _normalisasiIdState();
          saveState();
          if (typeof renderAntrian === 'function') renderAntrian();
          if (typeof renderDashboard === 'function') renderDashboard();
          if (typeof updateAntrianPicker === 'function') updateAntrianPicker();
          if (typeof updateAntrianPickerPetugas === 'function') updateAntrianPickerPetugas();
          if (typeof renderDaftarSiapPeriksa === 'function') renderDaftarSiapPeriksa();
        }
      } catch(e) { /* silent fail — nanti fullSync akan catch */ }
    }

    function startFastAntrianPoll() {
      if (_fastAntrianTimer) clearTimeout(_fastAntrianTimer);
      if (!state.scriptUrl) return;
      function scheduleFast() {
        const interval = getIdleSeconds() < 300 ? 10000 : 60000;
        _fastAntrianTimer = setTimeout(function() { fastPollAntrian(); scheduleFast(); }, interval);
      }
      scheduleFast();
      console.log('[SIMKEDA] Fast-poll antrian adaptif aktif');
    }
    function stopFastAntrianPoll() {
      if (_fastAntrianTimer) { clearTimeout(_fastAntrianTimer); _fastAntrianTimer = null; }
    }

    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && state.scriptUrl && navigator.onLine) {
        const sejakSync = state.lastSync ? (Date.now() - new Date(state.lastSync).getTime()) / 1000 : 999;
        if (sejakSync > 60) fullSync(true);
      }
    });

    // Sync saat online kembali setelah offline
    window.addEventListener('online', function() {
      if (state.scriptUrl) {
        updateSyncBadge('syncing');
        setTimeout(() => fullSync(true), 1000);
      }
    });

    // Sync sebelum halaman ditutup (best-effort)
    window.addEventListener('beforeunload', function() {
      if (state.scriptUrl && navigator.onLine && _pendingPush) {
        // Gunakan sendBeacon untuk fire-and-forget
        try {
          // sendBeacon tidak lewat pembungkus fetch → token & sesi harus diisi sendiri
          const payload = JSON.stringify({
            action: 'syncAll', deviceId: state._deviceId,
            token: state.appToken, sesi: _sesiToken || '',
            data: buildSyncPayload()
          });
          navigator.sendBeacon(state.scriptUrl, new Blob([payload], {type:'text/plain'}));
        } catch(e) { /* ignore */ }
      }
    });

    // Trigger sync setiap kali data disimpan (debounced 3 detik)
    let _debounceSyncTimer = null;
    function triggerSyncAfterSave() {
      _pendingPush = true;
      _versiSimpan++;
      updateSyncBadge('pending');
      if (_debounceSyncTimer) clearTimeout(_debounceSyncTimer);
      _debounceSyncTimer = setTimeout(function() {
        if (state.scriptUrl && navigator.onLine) fullSync(true);
      }, 3000); // tunggu 3 detik setelah simpan terakhir sebelum sync
    }

    // Auto-sync saat halaman dibuka (dipanggil dari INIT)
    async function autoSyncSaatBuka() {
      if (!state.scriptUrl) return;
      // Beri device ID unik jika belum ada
      if (!state._deviceId) {
        state._deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
        saveState();
      }
      // Tampilkan banner loading
      const banner = document.getElementById('bannerSync');
      const bannerText = document.getElementById('bannerSyncText');
      if (banner) { banner.style.display = 'flex'; banner.style.background = '#e3f2fd'; banner.style.borderColor = '#90caf9'; banner.style.color = '#1565c0'; }
      if (bannerText) bannerText.textContent = '🔄 Memuat data terbaru dari Google Sheets...';

      const ok = await fullSync(true);

      if (banner) {
        if (ok) {
          banner.style.background = '#e8f5e9'; banner.style.borderColor = '#a5d6a7'; banner.style.color = '#2e7d32';
          const tgl = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          if (bannerText) bannerText.textContent = '✅ Data berhasil disinkronkan dari Google Sheets — ' + tgl;
          setTimeout(() => { banner.style.display = 'none'; }, 5000);
        } else {
          banner.style.background = '#fff8e1'; banner.style.borderColor = '#ffe082'; banner.style.color = '#f57f17';
          if (bannerText) bannerText.textContent = '⚠️ Gagal sync otomatis — data lokal yang ditampilkan. Klik 🔄 Sync untuk coba lagi.';
          setTimeout(() => { banner.style.display = 'none'; }, 6000);
        }
      }
      // Mulai loop auto-sync + fast poll antrian
      startAutoSync();
      startFastAntrianPoll();
    }

    // ══════════════════════════════════════
    //  HELPER: isiDariRiwayat
    // ══════════════════════════════════════
    function isiDariRiwayat(id) {
      const p = state.pemeriksaan.find(x => String(x.id) === String(id));
      if (!p) return;
      const fields = { pilihanPM: p.nomorInduk, namaDokter: p.namaDokter, tekananDarah: p.tekananDarah, nadi: p.nadi, pernapasan: p.pernapasan, keluhan: p.keluhan, diagnosis: p.diagnosis, statusKondisi: p.statusKondisi, tindakan: p.tindakan, resep: p.resep, rencana: p.rencana };
      Object.entries(fields).forEach(([id, val]) => { const el = document.getElementById(id); if (el && val) el.value = val; });
      onPilihPM();
      showPage('pemeriksaan');
    }



    // ── Helper: bandingkan obat pemeriksaan minggu terakhir vs minggu sebelumnya ──
    // Label otomatis: Baru / Dilanjutkan / Dihentikan / Dosis diubah
    function hitungLabelStatusObat(ni) {
      const list = (state.pemeriksaan || [])
        .filter(x => !x._deleted && x.nomorInduk === ni)
        .sort((a, b) => new Date(a.tglPeriksa) - new Date(b.tglPeriksa));
      if (list.length === 0) return [];
      const skrg = list[list.length - 1];
      const lalu = list.length > 1 ? list[list.length - 2] : null;
      const obatSkrg = Array.isArray(skrg.obatDiberikan) ? skrg.obatDiberikan : [];
      const obatLalu = lalu && Array.isArray(lalu.obatDiberikan) ? lalu.obatDiberikan : [];
      const keyOf = o => (o.nama || '').trim().toLowerCase();
      const mapLalu = {};
      obatLalu.forEach(o => { mapLalu[keyOf(o)] = o; });
      const mapSkrg = {};
      obatSkrg.forEach(o => { mapSkrg[keyOf(o)] = o; });
      const hasil = [];
      obatSkrg.forEach(o => {
        const k = keyOf(o);
        const prev = mapLalu[k];
        let label;
        if (!prev) label = 'Baru';
        else if (String(prev.jumlah || '') !== String(o.jumlah || '') || String(prev.satuan || '') !== String(o.satuan || '')) label = 'Dosis diubah';
        else label = 'Dilanjutkan';
        hasil.push({ nama: o.nama || '-', jumlah: o.jumlah || '', satuan: o.satuan || '', label });
      });
      obatLalu.forEach(o => {
        const k = keyOf(o);
        if (!mapSkrg[k]) hasil.push({ nama: o.nama || '-', jumlah: o.jumlah || '', satuan: o.satuan || '', label: 'Dihentikan' });
      });
      return hasil;
    }

    // ── Helper: badge warna untuk label status obat ──
    function badgeLabelObat(label) {
      const cls = label === 'Baru' ? 'badge-yellow'
        : label === 'Dosis diubah' ? 'badge-yellow'
        : label === 'Dihentikan' ? 'badge-red'
        : 'badge-green';
      return '<span class="badge ' + escHtml(cls) + '" style="white-space:nowrap;">' + escHtml(label) + '</span>';
    }

    // ══════════════════════════════════════
    //  MODAL DETAIL/EDIT PM
    // ══════════════════════════════════════
    function lihatDetailPM(ni) {
      const pm = state.penerima.find(p => p.nomorInduk === ni);
      if (!pm) return;
      const last = getLastPeriksa(ni);
      const insiList = (state.insidental || []).filter(x => !x._deleted && x.nomorInduk === ni).sort((a, b) => new Date(a.tgl) - new Date(b.tgl)).slice(-3);
      const rujList = (state.rujukan || []).filter(x => !x._deleted && x.nomorInduk === ni).sort((a, b) => new Date(a.tgl) - new Date(b.tgl)).slice(-3);
      const labelObatList = hitungLabelStatusObat(ni);

      // Remove existing
      const old = document.getElementById('modalDetailPM');
      if (old) old.remove();

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay show';
      overlay.id = 'modalDetailPM';
      overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

      let insiHtml = '';
      if (insiList.length) {
        insiHtml = '<div style="margin-top:.75rem;padding:.75rem;background:#fff8f0;border-radius:8px;">' +
          '<div style="font-size:.8rem;font-weight:700;color:#e67e22;margin-bottom:.4rem">🚨 Insidental Terakhir:</div>' +
          insiList.map(x => '<div style="font-size:.8rem;padding:4px 0;border-bottom:1px solid #f0d9c0;">' +
            escHtml(new Date(x.tgl).toLocaleDateString('id-ID')) + ' — ' + escHtml(x.keluhan) +
            '<span class="badge badge-yellow" style="margin-left:6px">' + (escHtml(x.status || '-')) + '</span></div>'
          ).join('') + '</div>';
      }
      let rujHtml = '';
      if (rujList.length) {
        rujHtml = '<div style="margin-top:.75rem;padding:.75rem;background:#f9f0ff;border-radius:8px;">' +
          '<div style="font-size:.8rem;font-weight:700;color:#8e44ad;margin-bottom:.4rem">🏥 Rujukan Terakhir:</div>' +
          rujList.map(x => '<div style="font-size:.8rem;padding:4px 0;border-bottom:1px solid #e0cff0;">' +
            escHtml(new Date(x.tgl).toLocaleDateString('id-ID')) + ' — ' + (escHtml(x.jenis || '-')) + ' ke ' + (escHtml(x.tujuan || '-')) + '</div>'
          ).join('') + '</div>';
      }
      let obatLabelHtml = '';
      if (labelObatList.length) {
        obatLabelHtml = '<div style="margin-top:.75rem;padding:.75rem;background:#f4f7fb;border-radius:8px;">' +
          '<div style="font-size:.8rem;font-weight:700;color:#1a6b4a;margin-bottom:.4rem">💊 Status Obat (vs. periksa sebelumnya):</div>' +
          labelObatList.map(o => '<div style="font-size:.8rem;padding:4px 0;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
            '<span>' + escHtml(o.nama) + (o.jumlah ? ' — ' + escHtml(o.jumlah) + ' ' + escHtml(o.satuan) : '') + '</span>' + badgeLabelObat(o.label) + '</div>'
          ).join('') + '</div>';
      }

      overlay.innerHTML =
        '<div class="modal" style="max-width:600px;max-height:85vh;overflow-y:auto;">' +
        '<div class="modal-title">👤 ' + escHtml(pm.namaPM) + ' — ' + escHtml(pm.nomorInduk) + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;font-size:.85rem;">' +
        '<div><span style="color:var(--text-muted)">Jenis Kelamin:</span> ' + (escHtml(pm.jenisKelamin || '-')) + '</div>' +
        '<div><span style="color:var(--text-muted)">Tgl Lahir:</span> ' + (pm.tglLahir ? escHtml(new Date(pm.tglLahir).toLocaleDateString('id-ID')) : '-') + '</div>' +
        '<div><span style="color:var(--text-muted)">Disabilitas:</span> ' + (escHtml(pm.jenisDis || '-')) + '</div>' +
        '<div><span style="color:var(--text-muted)">Asrama:</span> ' + (escHtml(pm.kamarBlok || '-')) + '</div>' +
        '<div><span style="color:var(--text-muted)">Gol. Darah:</span> ' + (escHtml(pm.golDarah || '-')) + '</div>' +
        '<div><span style="color:var(--text-muted)">No. BPJS:</span> <strong>' + (escHtml(pm.noBPJS || '-')) + '</strong></div>' +
        '<div><span style="color:var(--text-muted)">Tgl Masuk:</span> ' + (pm.tglMasuk ? escHtml(new Date(pm.tglMasuk).toLocaleDateString('id-ID')) : '-') + '</div>' +
        '<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Kondisi Kronis:</span> <strong style="color:var(--danger)">' + (escHtml(pm.kondisiKronis || '-')) + '</strong></div>' +
        '<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Alergi:</span> <strong style="color:var(--danger)">' + (escHtml(pm.alergi || '-')) + '</strong></div>' +
        '<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Alamat:</span> ' + (escHtml(pm.alamat || '-')) + '</div>' +
        '<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Riwayat Penyakit:</span> ' + (escHtml(pm.riwayatPenyakit || '-')) + '</div>' +
        '<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Periksa Terakhir:</span> <strong>' + (last ? escHtml(new Date(last.tglPeriksa).toLocaleDateString('id-ID')) : 'Belum pernah') + '</strong></div>' +
        '</div>' +
        insiHtml + rujHtml + obatLabelHtml +
        '<div style="margin-top:.75rem;padding:.75rem;background:#f0faf5;border-radius:8px;border:1.5px solid #a9dfbf;">' +
        '<div style="font-size:.8rem;font-weight:700;color:#1a6b4a;margin-bottom:.4rem">🗓️ Cetak Kartu Mingguan (tanggal apa saja)</div>' +
        '<div style="font-size:.72rem;color:#555;margin-bottom:.5rem;">Kalau tidak ada pemeriksaan di tanggal yang dipilih, kartu tetap dibuat dengan status <strong>Baik</strong> (default).</div>' +
        '<div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">' +
        '<input type="date" id="tglKartuMingguanManual" value="' + escHtml(isoLokal(new Date())) + '" style="padding:6px 10px;border-radius:8px;border:1.5px solid var(--border);font-size:.82rem;">' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="const _tgl=document.getElementById(\'tglKartuMingguanManual\').value; const _m=document.getElementById(\'modalDetailPM\'); if(_m) _m.remove(); cetakKartuMingguanTanggal(\'' + jsArg(ni) + '\', _tgl)">🖨️ Cetak Kartu</button>' +
        '</div></div>' +
        '<div style="display:flex;gap:.5rem;margin-top:1rem;" id="detailPMBtns"></div>' +
        '</div>';

      const btnBox = overlay.querySelector('#detailPMBtns');
      const btnClose = document.createElement('button');
      btnClose.className = 'btn btn-ghost'; btnClose.style.flex = '1'; btnClose.textContent = 'Tutup';
      btnClose.onclick = () => overlay.remove();
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-accent'; btnEdit.style.flex = '1'; btnEdit.textContent = '✏️ Edit';
      btnEdit.onclick = () => { overlay.remove(); editPM(ni); };
      const btnRekamMedis = document.createElement('button');
      btnRekamMedis.className = 'btn btn-primary'; btnRekamMedis.style.flex = '1'; btnRekamMedis.textContent = '🕒 Rekam Medis';
      btnRekamMedis.onclick = () => { overlay.remove(); tampilkanRekamMedis(ni); };
      btnBox.appendChild(btnClose); btnBox.appendChild(btnRekamMedis); btnBox.appendChild(btnEdit);

      document.body.appendChild(overlay);
    }

    // ══════════════════════════════════════
    //  REKAM MEDIS TERPADU — timeline lintas-modul untuk satu PM
    // ══════════════════════════════════════
    function tampilkanRekamMedis(ni) {
      const pm = state.penerima.find(p => p.nomorInduk === ni);
      if (!pm) return;

      const dataRM = {
        asesmen: (state.asesmenAwal || []).filter(x => !x._deleted && x.nomorInduk === ni).sort((a,b) => new Date(a.tglAsesmen||0) - new Date(b.tglAsesmen||0)),
        pengukuran: (state.pengukuranAwal || []).filter(x => !x._deleted && x.nomorInduk === ni).sort((a,b) => new Date(a.tglPengukuran||0) - new Date(b.tglPengukuran||0)),
        periksa: (state.pemeriksaan || []).filter(x => !x._deleted && x.nomorInduk === ni).sort((a,b) => new Date(a.tglPeriksa||0) - new Date(b.tglPeriksa||0)),
        insidental: (state.insidental || []).filter(x => !x._deleted && x.nomorInduk === ni).sort((a,b) => new Date(a.tgl||0) - new Date(b.tgl||0)),
        rujukan: (state.rujukan || []).filter(x => !x._deleted && x.nomorInduk === ni).sort((a,b) => new Date(a.tgl||0) - new Date(b.tgl||0))
      };

      const cardHtml = renderRekamMedisHTML(pm, dataRM);

      const old = document.getElementById('modalRekamMedis');
      if (old) old.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay show';
      overlay.id = 'modalRekamMedis';
      overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

      overlay.innerHTML = `<div class="modal" style="max-width:940px;max-height:90vh;overflow-y:auto;">
        <div id="rekamMedisCardBody">${cardHtml}</div>
        <div style="display:flex;gap:.5rem;margin-top:1rem;" id="rekamMedisBtns"></div>
      </div>`;
      const btnBox2 = overlay.querySelector('#rekamMedisBtns');
      const btnCetak = document.createElement('button');
      btnCetak.className = 'btn btn-info no-print'; btnCetak.style.flex = '1'; btnCetak.textContent = '🖨️ Cetak';
      btnCetak.onclick = () => printKartuIsolated(document.getElementById('rekamMedisCardBody').innerHTML);
      const btnTutup = document.createElement('button');
      btnTutup.className = 'btn btn-ghost no-print'; btnTutup.style.flex = '1'; btnTutup.textContent = 'Tutup';
      btnTutup.onclick = () => overlay.remove();
      btnBox2.appendChild(btnCetak);
      btnBox2.appendChild(btnTutup);
      document.body.appendChild(overlay);
    }

    // ── RENDER HTML REKAM MEDIS (per-menu, seperti kartu bulanan, bisa dicetak+TTD) ──
    function renderRekamMedisHTML(pm, data) {
      const namaPM = pm.namaPM || '-';
      const nomorInduk = pm.nomorInduk || '-';
      const asrama = pm.kamarBlok || '-';
      const disabilitas = pm.jenisDis || '-';
      const golDarah = pm.golDarah || '-';
      const kronis = pm.kondisiKronis || '-';
      const alergi = pm.alergi || '-';
      const alamat = pm.alamat || '-';
      const tglLahirFmt = pm.tglLahir ? new Date(pm.tglLahir).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-';
      const umurPM = pm.tglLahir ? hitungUsia(pm.tglLahir) : '-';

      const waktuCetak = new Date();
      const noCetak = 'RM/' + (nomorInduk || '-') + '/' + isoLokal(waktuCetak).replace(/-/g,'');
      const petugasCetakNama = state.petugasCetak || state.namaPetugas || '-';

      const fmtTgl = t => t ? new Date(t).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-';
      const obatChip = arr => (arr && arr.length)
        ? arr.map(o => `<span style="background:#e8f8f0;color:#16a085;padding:1px 7px;border-radius:7px;font-size:9.5px;font-weight:600;white-space:nowrap;display:inline-block;margin:1px 2px 1px 0;">💊 ${escHtml(o.nama || '-')}${o.jumlah ? ' · ' + escHtml(String(o.jumlah)) + ' ' + escHtml(o.satuan || '') : ''}</span>`).join('')
        : '<span style="color:#aaa">—</span>';

      const statusColor = (s) => s === 'Baik' ? '#155724' : s === 'Cukup Baik' ? '#856404' : s === 'Perlu Perhatian' ? '#721c24' : '#7b0000';
      const statusBg = (s) => s === 'Baik' ? '#d4edda' : s === 'Cukup Baik' ? '#fff3cd' : s === 'Perlu Perhatian' ? '#fdecea' : '#f5c6cb';

      const sectionAsesmen = data.asesmen.length ? `
        <div style="border-top:1.5px solid #ddd;padding:10px 16px;">
          <div style="font-size:10.5px;font-weight:700;color:#8e44ad;margin-bottom:6px;">📝 Asesmen Awal</div>
          <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
            <thead><tr style="background:#f4ecf9;">
              <th style="padding:5px 10px;text-align:left;color:#8e44ad;white-space:nowrap">Tanggal</th>
              <th style="padding:5px 10px;text-align:left;color:#8e44ad">Diagnosis Utama</th>
              <th style="padding:5px 10px;text-align:left;color:#8e44ad">Dokter</th>
            </tr></thead>
            <tbody>${data.asesmen.map(x => `<tr style="border-top:1px solid #eee;">
              <td style="padding:5px 10px;white-space:nowrap">${escHtml(fmtTgl(x.tglAsesmen))}</td>
              <td style="padding:5px 10px">${escHtml(x.dxUtama || '-')}</td>
              <td style="padding:5px 10px">${escHtml(x.namaDokter || '-')}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>` : '';

      const sectionPengukuran = data.pengukuran.length ? `
        <div style="border-top:1.5px solid #ddd;padding:10px 16px;">
          <div style="font-size:10.5px;font-weight:700;color:#2980b9;margin-bottom:6px;">📏 Pengukuran Awal</div>
          <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
            <thead><tr style="background:#eaf3fb;">
              <th style="padding:5px 10px;text-align:left;color:#2980b9;white-space:nowrap">Tanggal</th>
              <th style="padding:5px 10px;text-align:center;color:#2980b9">Suhu</th>
              <th style="padding:5px 10px;text-align:center;color:#2980b9">BB</th>
              <th style="padding:5px 10px;text-align:center;color:#2980b9">TB</th>
              <th style="padding:5px 10px;text-align:center;color:#2980b9">SpO2</th>
              <th style="padding:5px 10px;text-align:left;color:#2980b9">Keluhan</th>
            </tr></thead>
            <tbody>${data.pengukuran.map(x => `<tr style="border-top:1px solid #eee;">
              <td style="padding:5px 10px;white-space:nowrap">${escHtml(fmtTgl(x.tglPengukuran))}</td>
              <td style="padding:5px 10px;text-align:center">${x.suhu ? escHtml(x.suhu + '°C') : '—'}</td>
              <td style="padding:5px 10px;text-align:center">${x.beratBadan ? escHtml(x.beratBadan + 'kg') : '—'}</td>
              <td style="padding:5px 10px;text-align:center">${x.tinggiBadan ? escHtml(x.tinggiBadan + 'cm') : '—'}</td>
              <td style="padding:5px 10px;text-align:center">${x.spo2 ? escHtml(x.spo2 + '%') : '—'}</td>
              <td style="padding:5px 10px">${escHtml(x.keluhan || '-')}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>` : '';

      const sectionPeriksa = data.periksa.length ? `
        <div style="border-top:1.5px solid #ddd;padding:10px 16px;">
          <div style="font-size:10.5px;font-weight:700;color:#1a6b4a;margin-bottom:6px;">🩺 Periksa Dokter</div>
          <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
            <thead><tr style="background:#e8f5ef;">
              <th style="padding:5px 10px;text-align:left;color:#1a6b4a;white-space:nowrap">Tanggal</th>
              <th style="padding:5px 10px;text-align:left;color:#1a6b4a">Dokter</th>
              <th style="padding:5px 10px;text-align:left;color:#1a6b4a">Diagnosis</th>
              <th style="padding:5px 10px;text-align:center;color:#1a6b4a">Status</th>
              <th style="padding:5px 10px;text-align:left;color:#1a6b4a">Obat</th>
            </tr></thead>
            <tbody>${data.periksa.map(x => `<tr style="border-top:1px solid #eee;">
              <td style="padding:5px 10px;white-space:nowrap">${escHtml(fmtTgl(x.tglPeriksa))}</td>
              <td style="padding:5px 10px">${escHtml(x.namaDokter || '-')}</td>
              <td style="padding:5px 10px">${escHtml(x.diagnosis || x.keluhan || '-')}${x.perluRujukan === 'ya' ? ' <span style="color:#c0392b;font-weight:700">· dirujuk</span>' : ''}</td>
              <td style="padding:5px 10px;text-align:center">${x.statusKondisi ? `<span style="background:${escHtml(statusBg(x.statusKondisi))};color:${escHtml(statusColor(x.statusKondisi))};padding:1px 8px;border-radius:8px;font-size:9.5px;font-weight:700;white-space:nowrap">${escHtml(x.statusKondisi)}</span>` : '—'}</td>
              <td style="padding:5px 10px">${obatChip(x.obatDiberikan)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>` : '';

      const sectionInsidental = data.insidental.length ? `
        <div style="border-top:1.5px solid #ddd;padding:10px 16px;">
          <div style="font-size:10.5px;font-weight:700;color:#e67e22;margin-bottom:6px;">🚨 Insidental</div>
          <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
            <thead><tr style="background:#fff3e6;">
              <th style="padding:5px 10px;text-align:left;color:#e67e22;white-space:nowrap">Tanggal</th>
              <th style="padding:5px 10px;text-align:left;color:#e67e22">Keluhan</th>
              <th style="padding:5px 10px;text-align:left;color:#e67e22">Tindakan</th>
              <th style="padding:5px 10px;text-align:center;color:#e67e22">Status</th>
              <th style="padding:5px 10px;text-align:left;color:#e67e22">Obat</th>
            </tr></thead>
            <tbody>${data.insidental.map(x => `<tr style="border-top:1px solid #eee;">
              <td style="padding:5px 10px;white-space:nowrap">${escHtml(fmtTgl(x.tgl))}</td>
              <td style="padding:5px 10px">${escHtml(x.keluhan || '-')}</td>
              <td style="padding:5px 10px">${escHtml(x.tindakan || '-')}</td>
              <td style="padding:5px 10px;text-align:center">${escHtml(x.status || '-')}${x.perluRujukan === 'ya' ? ' <span style="color:#c0392b;font-weight:700">· dirujuk</span>' : ''}</td>
              <td style="padding:5px 10px">${obatChip(x.obatDiberikan)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>` : '';

      const sectionRujukan = data.rujukan.length ? `
        <div style="border-top:1.5px solid #ddd;padding:10px 16px;">
          <div style="font-size:10.5px;font-weight:700;color:#c0392b;margin-bottom:6px;">🏥 Rujukan</div>
          <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
            <thead><tr style="background:#fdecea;">
              <th style="padding:5px 10px;text-align:left;color:#c0392b;white-space:nowrap">Tanggal</th>
              <th style="padding:5px 10px;text-align:left;color:#c0392b">Jenis / Tujuan</th>
              <th style="padding:5px 10px;text-align:center;color:#c0392b">Status</th>
              <th style="padding:5px 10px;text-align:left;color:#c0392b">Hasil</th>
            </tr></thead>
            <tbody>${data.rujukan.map(x => `<tr style="border-top:1px solid #eee;">
              <td style="padding:5px 10px;white-space:nowrap">${escHtml(fmtTgl(x.tgl))}</td>
              <td style="padding:5px 10px">${escHtml(x.jenis || '-')} → ${escHtml(x.tujuan || '-')}</td>
              <td style="padding:5px 10px;text-align:center">${escHtml(x.statusRujukan || 'Aktif')}</td>
              <td style="padding:5px 10px">${escHtml(x.hasil || '-')}${x.tglSelesai ? escHtml(' (' + fmtTgl(x.tglSelesai) + ')') : ''}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>` : '';

      const totalCatatan = data.asesmen.length + data.pengukuran.length + data.periksa.length + data.insidental.length + data.rujukan.length;
      const lastStatus = data.periksa.length ? data.periksa[data.periksa.length - 1].statusKondisi : '';
      const lastPeriksaDokter = data.periksa.length ? data.periksa[data.periksa.length - 1] : null;
      const namaDokterTerakhir = (lastPeriksaDokter && lastPeriksaDokter.namaDokter) ? lastPeriksaDokter.namaDokter : (state.defaultDokter || '-');

      return `
  <div style="font-family:Arial,sans-serif;font-size:11.5px;color:#222;max-width:900px;margin:0 auto;border:1.5px solid #ccc;border-radius:8px;overflow:hidden;">

    ${renderKopSuratHTML()}

    <div style="background:#1a6b4a;color:white;padding:7px 18px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:12.5px;font-weight:700;letter-spacing:.3px">REKAM MEDIS PENERIMA MANFAAT</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:700;background:rgba(255,255,255,.15);padding:3px 10px;border-radius:6px">${escHtml(totalCatatan)} Catatan</div>
        <div style="font-size:7.5px;opacity:.65;margin-top:1px;font-family:monospace;">No. Cetak: ${escHtml(noCetak)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1.5px solid #ddd;">
      <div style="padding:10px 16px;border-right:1px solid #ddd;">
        <div style="display:grid;grid-template-columns:90px 1fr;row-gap:4px;font-size:11px;">
          <span style="color:#666">Nama PM</span><span style="font-weight:700;font-size:13px">${escHtml(namaPM)}</span>
          <span style="color:#666">No. Induk</span><span style="font-family:monospace;font-weight:600">${escHtml(nomorInduk)}</span>
          <span style="color:#666">Asrama</span><span style="font-weight:600">${escHtml(asrama)}</span>
          <span style="color:#666">Disabilitas</span><span>${escHtml(disabilitas)}</span>
          <span style="color:#666">Tgl Lahir</span><span style="font-weight:600">${escHtml(tglLahirFmt)}${umurPM !== '-' ? escHtml(' · ' + umurPM) : ''}</span>
          <span style="color:#666">Alamat</span><span>${escHtml(alamat)}</span>
        </div>
      </div>
      <div style="padding:10px 16px;">
        <div style="display:grid;grid-template-columns:100px 1fr;row-gap:4px;font-size:11px;">
          <span style="color:#666">Gol. Darah</span><span style="font-weight:600">${escHtml(golDarah)}</span>
          <span style="color:#666">Kondisi Kronis</span><span style="color:${kronis !== '-' ? '#c0392b' : '#555'};font-weight:${kronis !== '-' ? '600' : '400'}">${escHtml(kronis)}</span>
          <span style="color:#666">Alergi</span><span style="color:${alergi !== '-' ? '#c0392b' : '#555'};font-weight:${alergi !== '-' ? '600' : '400'}">${escHtml(alergi)}</span>
          <span style="color:#666">Status Terakhir</span><span>${lastStatus ? `<span style="background:${escHtml(statusBg(lastStatus))};color:${escHtml(statusColor(lastStatus))};padding:2px 9px;border-radius:10px;font-size:10.5px;font-weight:700">${escHtml(lastStatus)}</span>` : '-'}</span>
        </div>
      </div>
    </div>

    ${sectionAsesmen}
    ${sectionPengukuran}
    ${sectionPeriksa}
    ${sectionInsidental}
    ${sectionRujukan}
    ${totalCatatan === 0 ? '<div style="padding:2rem;text-align:center;color:#999;">Belum ada riwayat tercatat untuk PM ini.</div>' : ''}

    <!-- FOOTER TTD (sama seperti kartu mingguan) -->
    <div style="border-top:1.5px solid #ddd;background:#fafafa;padding:14px 20px;">
      <div style="font-size:10px;color:#666;margin-bottom:10px;text-align:right;">
        Pasuruan, ${escHtml(waktuCetak.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }))}
        <div style="font-size:8.5px;color:#999;margin-top:2px;">No. Cetak: ${escHtml(noCetak)} · Dicetak ${escHtml(waktuCetak.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }))} ${escHtml(waktuCetak.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))} oleh ${escHtml(petugasCetakNama)}</div>
      </div>
      <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:stretch;">

        <!-- Kasi Pelayanan Sosial -->
        <div style="text-align:center;flex:1;min-width:140px;display:flex;flex-direction:column;">
          <div style="font-size:10px;color:#444;line-height:1.5;">Mengetahui,</div>
          <div style="font-size:10px;font-weight:700;color:#1a6b4a;margin-bottom:6px;">Kepala Seksi Pelayanan Sosial</div>
          <div style="flex:1;min-height:60px;display:flex;align-items:center;justify-content:center;">
            ${state.ttdKasiBase64 && state.ttdKasiBase64.length > 10
              ? '<img src="' + safeUrl(state.ttdKasiBase64) + '" style="height:55px;max-width:130px;object-fit:contain;display:block;margin:0 auto;" onerror="this.remove()">'
              : ''}
          </div>
          <div style="border-top:1px solid #999;padding-top:5px;">
            <div style="font-size:10px;color:#555;font-weight:600">${state.namaKasi ? escHtml(state.namaKasi) : '(................................)'}</div>
            <div style="font-size:9px;color:#888;margin-top:2px;">NIP. 197804182011011006</div>
          </div>
        </div>

        <!-- Petugas Kesehatan -->
        <div style="text-align:center;flex:1;min-width:140px;display:flex;flex-direction:column;">
          <div style="font-size:10px;color:#444;line-height:1.5;">Petugas,</div>
          <div style="font-size:10px;font-weight:700;color:#1a6b4a;margin-bottom:6px;">Pengelola Layanan Kesehatan</div>
          <div style="flex:1;min-height:60px;display:flex;align-items:center;justify-content:center;">
            ${state.ttdPetugasBase64 && state.ttdPetugasBase64.length > 10
              ? '<img src="' + safeUrl(state.ttdPetugasBase64) + '" style="height:55px;max-width:130px;object-fit:contain;display:block;margin:0 auto;" onerror="this.remove()">'
              : ''}
          </div>
          <div style="border-top:1px solid #999;padding-top:5px;">
            <div style="font-size:10px;color:#555;font-weight:600">${(state.petugasCetak||state.namaPetugas) ? escHtml(state.petugasCetak||state.namaPetugas) : '(................................)'}</div>
            <div style="font-size:9px;color:#888;margin-top:2px;">NIP. 200105102025042007</div>
          </div>
        </div>

        <!-- Dokter Pemeriksa -->
        <div style="text-align:center;flex:1;min-width:140px;display:flex;flex-direction:column;">
          <div style="font-size:10px;color:#444;line-height:1.5;">Pemeriksa,</div>
          <div style="font-size:10px;font-weight:700;color:#1a6b4a;margin-bottom:6px;">Dokter Pemeriksa</div>
          <div style="flex:1;min-height:60px;display:flex;align-items:center;justify-content:center;">
            ${(() => {
              let ttdSrc = lastPeriksaDokter ? resolveTTDSrc(lastPeriksaDokter.ttdDokter) : '';
              if (!ttdSrc && state.ttdDokterBase64 && state.ttdDokterBase64.length > 10) ttdSrc = state.ttdDokterBase64;
              return ttdSrc
                ? '<img src="' + safeUrl(ttdSrc) + '" style="height:55px;max-width:130px;object-fit:contain;display:block;margin:0 auto;" title="TTD Dokter" onerror="this.remove()">'
                : '';
            })()}
          </div>
          <div style="border-top:1px solid #999;padding-top:5px;">
            <div style="font-size:10px;color:#555;font-weight:600">${namaDokterTerakhir !== '-' ? escHtml(namaDokterTerakhir) : '(................................)'}</div>
          </div>
        </div>

      </div>
    </div>

  </div>`;
    }


    function editPM(ni) {
      const pm = state.penerima.find(p => String(p.nomorInduk) === String(ni));
      if (!pm) return;

      const formEl = document.getElementById('formPendaftaran');

      // Simpan nomor induk yang sedang diedit
      state._editNI = String(ni);
      if (formEl) formEl.dataset.editNi = String(ni);
      _g_editNI = String(ni); // backup global

      // Pindah ke halaman pendaftaran
      showPage('pendaftaran');

      setTimeout(() => {

        const set = (id, val) => {
          const el = document.getElementById(id);
          if (el) isiNilaiForm(el, val || '');
        };

        // Isi form dengan data lama
        set('nomorInduk', pm.nomorInduk);
        set('namaPM', pm.namaPM);
        set('tglLahir', pm.tglLahir);
        set('jenisKelamin', pm.jenisKelamin);
        set('jenisDis', pm.jenisDis);
        set('kamarBlok', pm.kamarBlok);
        set('tglMasuk', pm.tglMasuk);
        set('noBPJS', pm.noBPJS);
        set('golDarah', pm.golDarah);
        set('alergi', pm.alergi);
        set('kondisiKronis', pm.kondisiKronis);
        set('riwayatPenyakit', pm.riwayatPenyakit);
        set('alamatPM', pm.alamat);
        set('statusPM', pm.statusPM || 'Aktif');

        // Tombol berubah menjadi update
        const btn = document.getElementById('btnSimpanPM');
        if (btn) btn.textContent = "✏️ Perbarui Data PM";

        // Nomor Induk BOLEH dikoreksi: seluruh riwayat ikut pindah ke nomor baru (lihat simpanDataPM)
        const nomorField = document.getElementById('nomorInduk');
        if (nomorField) nomorField.readOnly = false;

        // Pindah ke tab manual
        switchTab('manual');

        // Scroll ke form
        if (formEl) formEl.scrollIntoView({ behavior: "smooth" });

        // Notifikasi
        showAlert(
          'alertPendaftaran',
          'info',
          '✏️ Mode Edit: Silakan ubah data lalu klik Perbarui Data PM. Jika Nomor Induk salah ketik, perbaiki langsung di kolomnya — seluruh riwayat PM ini ikut pindah ke nomor yang benar.'
        );

      }, 100);
    }

    function onPilihPMInsidental() {
      const ni = document.getElementById('insidentalPM').value;
      const petugas = document.getElementById('insidentalPetugas');

      if (ni && !petugas.value) {
        petugas.value = state.namaPetugas || '';
      }
    }

    // Helper: format waktu insidental - tangani ISO timestamp dari Sheets (1899-12-30T...)
    function fmtWaktu(w) {
      if (!w) return '';
      w = String(w);
      // Jika format HH:MM atau HH:MM:SS sudah benar
      if (/^\d{1,2}:\d{2}/.test(w)) return w.substring(0, 5);
      // Jika ISO timestamp (dari Google Sheets time serial) - gunakan waktu lokal (bukan UTC)
      if (w.includes('T')) {
        const d = new Date(w);
        if (!isNaN(d.getTime())) {
          const h = String(d.getHours()).padStart(2, '0');
          const m2 = String(d.getMinutes()).padStart(2, '0');
          return h + ':' + m2;
        }
      }
      return w;
    }
    // Minggu ke-berapa dalam bulan untuk rekaman bertanggal (x.mingguKe bila ada, kalau tidak dari x.tgl)
    function _mingguDariTgl(x) {
      if (!x) return 0;
      if (x.mingguKe !== undefined && x.mingguKe !== '' && !isNaN(parseInt(x.mingguKe))) return parseInt(x.mingguKe);
      const m = String(x.tgl || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return 0;
      return getWeekOfMonth(new Date(+m[1], +m[2] - 1, +m[3]));
    }
    function renderInsidental(q) {
      const tbody = document.getElementById('insidentalBody');
      if (!tbody) return;
      q = q !== undefined ? q : ((document.getElementById('searchInsidental')||{}).value || '');
      const bulan = parseInt((document.getElementById('petugasInsBulan') || { value: '0' }).value || '0');
      const tahun = (document.getElementById('petugasInsTahun') || { value: '' }).value || '';
      const minggu = parseInt((document.getElementById('filterInsidentalMinggu') || {}).value || '0');
      let list = [...(state.insidental || [])].filter(x => !x._deleted).filter(x => { const d = new Date(x.tgl); return x.tgl && !isNaN(d.getTime()) && d.getFullYear() >= 2000; }).sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
      if (bulan > 0) list = list.filter(x => x.tgl && new Date(x.tgl).getMonth() + 1 === bulan);
      if (tahun) list = list.filter(x => x.tgl && new Date(x.tgl).getFullYear() === parseInt(tahun));
      if (q) list = list.filter(x => (x.namaPM || '').toLowerCase().includes(q.toLowerCase()));
      // Insidental tidak punya kolom mingguKe → minggu dihitung dari tanggalnya
      // (dulu memilih "Minggu ke-…" selalu mengosongkan tabel)
      if (minggu) list = list.filter(x => _mingguDariTgl(x) === minggu);
      const _pgInsidental = document.getElementById('insidentalPagination');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:1.5rem">Belum ada keluhan insidental</td></tr>'; if (_pgInsidental) _pgInsidental.innerHTML=''; return; }
      list = _fltTbl('insidental', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppInsidental = 100;
      const _totalPagesInsidental = Math.max(1, Math.ceil(list.length / _ppInsidental));
      if (_pageState.insidental > _totalPagesInsidental) _pageState.insidental = _totalPagesInsidental;
      const _startInsidental = (_pageState.insidental - 1) * _ppInsidental;
      tbody.innerHTML = '';
      list.slice(_startInsidental, _startInsidental + _ppInsidental).forEach((x, _idx) => {
        const idx = _startInsidental + _idx;
        const tr = document.createElement('tr');
        const sc = x.status === 'Ditangani' ? 'badge-green' : x.status === 'Darurat' ? 'badge-red' : 'badge-yellow';
        tr.innerHTML =
          '<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">' + (escHtml(idx + 1)) + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(new Date(x.tgl).toLocaleDateString('id-ID')) + (fmtWaktu(x.waktu) ? (escHtml(' ' + fmtWaktu(x.waktu))) : '') + '</td>' +
          '<td><strong>' + (escHtml(x.namaPM || '-')) + '</strong></td>' +
          '<td class="text-muted">' + (escHtml(x.kamarBlok || '-')) + '</td>' +
          '<td style="font-size:.82rem;max-width:160px">' + (escHtml(x.keluhan || '-')) + '</td>' +
          '<td>' + (x.suhu ? escHtml(x.suhu + '°C') : '-') + '</td>' +
          '<td style="font-size:.8rem">' + (escHtml(x.td || '-')) + '</td>' +
          '<td><span class="badge ' + escHtml(sc) + '">' + (escHtml(x.status || '-')) + '</span></td>' +
          '<td>' + (x.perluRujukan === 'ya' ? '<span class="badge badge-red">🏥 Ya</span>' : '<span class="badge badge-green">Tidak</span>') + '</td>' +
          '<td></td>';
        const btnLihatIns = document.createElement('button');
        btnLihatIns.className = 'btn btn-info btn-sm'; btnLihatIns.textContent = '👁'; btnLihatIns.title = 'Lihat Detail';
        btnLihatIns.onclick = () => lihatDetailInsidental(x.id);
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-accent btn-sm'; btnEdit.textContent = '✏️'; btnEdit.title = 'Edit';
        btnEdit.onclick = () => editInsidental(x.id);
        const btnHapus = document.createElement('button');
        btnHapus.className = 'btn btn-ghost btn-sm'; btnHapus.style.color = 'var(--danger)'; btnHapus.textContent = '🗑️';
        btnHapus.onclick = () => hapusInsidental(x.id);
        const sudahPeriksa2 = (state.pemeriksaan||[]).some(p =>
          p.nomorInduk === x.nomorInduk && new Date(p.tglPeriksa) >= new Date(x.tgl)
        );
        tr.lastElementChild.appendChild(btnLihatIns);
        tr.lastElementChild.appendChild(btnEdit);
        tr.lastElementChild.appendChild(btnHapus);
        if (!sudahPeriksa2) {
          const btnLanjut = document.createElement('button');
          btnLanjut.className = 'btn btn-sm';
          btnLanjut.style.cssText = 'background:#e8f5ef;color:#1a6b4a;border:1.5px solid #a9dfbf;font-size:.75rem;';
          btnLanjut.title = 'Lanjutkan ke form Pemeriksaan Mingguan';
          btnLanjut.textContent = '➕ Lanjut Periksa';
          btnLanjut.onclick = () => lanjutInsidentalKePemeriksaan(x);
          tr.lastElementChild.appendChild(btnLanjut);
        }
        tbody.appendChild(tr);
      });
      _renderPaginationControls('insidentalPagination', 'insidental', list.length, _ppInsidental, 'renderInsidental');
    }

    function filterInsidental(q) { _pageState.insidental = 1; renderInsidental(q); }

    async function hapusInsidental(id) {
      const idx = (state.insidental || []).findIndex(x => String(x.id) === String(id));
      const lama = idx !== -1 ? state.insidental[idx] : null;
      const adaObat = !!(lama && Array.isArray(lama.obatDiberikan) && lama.obatDiberikan.length);
      if (!confirm('Hapus data insidental ini?' + (adaObat ? '\n\nObat yang tercatat diberikan pada keluhan ini akan DIKEMBALIKAN ke stok.' : ''))) return;
      // ── Soft-delete: tandai _deleted agar tidak kembali saat auto-sync ──
      if (idx !== -1) {
        state.insidental[idx] = { ...state.insidental[idx], _deleted: true, updatedAt: new Date().toISOString() };
      }
      // Sama seperti hapus pemeriksaan: stok dikembalikan & catatan pemakaian obatnya dihapus
      // (dulu stok tidak kembali dan pemakaian tetap terhitung di rekap obat).
      if (adaObat) { terapkanKoreksiStokEdit(lama.obatDiberikan, []); _hapusLogObatSumber('insidental', lama, true); }
      if (lama) _hapusDrafRujukanOtomatis('idInsidental', lama.id);
      saveState();
      // ── Refresh semua tampilan insidental ──
      renderInsidental && renderInsidental();
      renderRekapInsidental && renderRekapInsidental();
      renderKasiInsidental && renderKasiInsidental();
      typeof renderDokterInsidental === 'function' && renderDokterInsidental();
      renderKasiInsidentalPeriksa && renderKasiInsidentalPeriksa();
      showToast('🗑️ Data insidental berhasil dihapus', 'success');
      // ── Hapus dari Google Sheets ──
      if (state.scriptUrl) {
        try { await kirimKeSheets('deleteInsidental', { id }); } catch(e) { console.warn('deleteInsidental GAS error:', e); }
      }
    }

    function editInsidental(id) {
      const x = (state.insidental || []).find(i => String(i.id) === String(id));
      if (!x) return;
      const formIns = document.getElementById('formInsidental');
      if (formIns) formIns.dataset.editId = id;
      showPage('insidental');
      setTimeout(() => {
        const set = (elId, val) => { const el = document.getElementById(elId); if (el) isiNilaiForm(el, val || ''); };
        const selPMIns = document.getElementById('insidentalPM');
        if (selPMIns) {
          let opt = selPMIns.querySelector('option[value="' + x.nomorInduk + '"]');
          if (!opt) {
            opt = document.createElement('option');
            const pmData = state.penerima.find(p => p.nomorInduk === x.nomorInduk);
            opt.value = x.nomorInduk; opt.textContent = pmData ? pmData.namaPM + ' · ' + x.nomorInduk : x.namaPM || x.nomorInduk;
            selPMIns.appendChild(opt);
          }
          selPMIns.value = x.nomorInduk;
          // Perbarui display autocomplete
          const dispIns = document.getElementById('insidentalPMDisplay');
          if (dispIns) {
            const pmData = state.penerima.find(p => p.nomorInduk === x.nomorInduk);
            dispIns.value = pmData ? pmData.namaPM : (x.namaPM || x.nomorInduk);
          }
        }
        set('insidentalTgl', x.tgl);
        set('insidentalWaktu', fmtWaktu(x.waktu));
        // ── Muat ulang obat yang diberikan ──
        // Dulu daftar obat tidak dimuat ke form edit → saat disimpan, obat dianggap kosong:
        // catatan obat terhapus dan stoknya dikembalikan, padahal obat sudah diberikan.
        resetObatForm('insidental');
        (Array.isArray(x.obatDiberikan) ? x.obatDiberikan : []).forEach(function(ob) {
          tambahBarisObat('insidental');
          const cont = document.getElementById('obatInsidentalList');
          const row = cont && cont.lastElementChild; if (!row) return;
          const n = row.querySelector('.obat-nama'), j = row.querySelector('.obat-jml-val'), s = row.querySelector('.obat-sat-val');
          if (n) n.value = ob.nama || ''; if (j) j.value = ob.jumlah || ''; if (s) s.value = ob.satuan || '';
        });
        set('insidentalKeluhan', x.keluhan);
        set('insidentalSuhu', x.suhu);
        set('insidentalTD', x.td);
        set('insidentalSpo2', x.spo2);
        set('insidentalNadi', x.nadi);
        set('insidentalTindakan', x.tindakan);
        set('insidentalStatus', x.status);
        set('insidentalRujukan', x.perluRujukan);
        set('insidentalPetugas', x.petugas);
        const formCheck = document.getElementById('formInsidental');
        if (formCheck) formCheck.dataset.editId = id;
        const btnSimpan = document.getElementById('btnSimpanInsidental');
        if (btnSimpan) { btnSimpan.textContent = '✏️ Perbarui Keluhan'; btnSimpan.style.background = 'var(--accent)'; }
        const btnBatal = document.getElementById('btnBatalInsidental');
        if (btnBatal) btnBatal.style.display = '';
        showAlert('alertInsidental', 'info', '✏️ Mode Edit — ubah data lalu klik Perbarui. Nama PM tidak perlu dipilih ulang.');
      }, 100);
    }
    function batalEditInsidental() {
      const formIns = document.getElementById('formInsidental');
      if (formIns) { delete formIns.dataset.editId; formIns.reset(); }
      resetObatForm('insidental');
      const dispIns = document.getElementById('insidentalPMDisplay'); if (dispIns) dispIns.value = '';
      const btnSimpan = document.getElementById('btnSimpanInsidental');
      if (btnSimpan) { btnSimpan.textContent = '💾 Simpan Keluhan Insidental'; btnSimpan.style.background = ''; }
      const btnBatal = document.getElementById('btnBatalInsidental');
      if (btnBatal) btnBatal.style.display = 'none';
      showAlert('alertInsidental', 'info', 'Edit dibatalkan.');
    }
    function editRujukan(id) {
      const x = (state.rujukan || []).find(r => String(r.id) === String(id));
      if (!x) return;
      const formRuj = document.getElementById('formRujukan');
      if (formRuj) formRuj.dataset.editId = id;
      showPage('rujukan');
      setTimeout(() => {
        const set = (elId, val) => { const el = document.getElementById(elId); if (el) isiNilaiForm(el, val || ''); };
        const selPM = document.getElementById('rujukanPM');
        if (selPM) {
          let opt = selPM.querySelector('option[value="' + x.nomorInduk + '"]');
          if (!opt) {
            opt = document.createElement('option');
            const pmData = state.penerima.find(p => p.nomorInduk === x.nomorInduk);
            opt.value = x.nomorInduk; opt.textContent = pmData ? pmData.namaPM + ' · ' + x.nomorInduk : x.namaPM || x.nomorInduk;
            selPM.appendChild(opt);
          }
          selPM.value = x.nomorInduk;
          // Perbarui display autocomplete
          const dispRuj = document.getElementById('rujukanPMDisplay');
          if (dispRuj) {
            const pmData = state.penerima.find(p => p.nomorInduk === x.nomorInduk);
            dispRuj.value = pmData ? pmData.namaPM : (x.namaPM || x.nomorInduk);
          }
        }
        set('rujukanTgl', x.tgl);
        set('rujukanJenis', x.jenis);
        set('rujukanTujuan', x.tujuan);
        set('rujukanStatus', x.statusRujukan || 'Aktif');
        set('rujukanDiagnosis', x.diagnosis);
        set('rujukanAlasan', x.alasan || '');
        set('rujukanAsal', x.asal);
        set('rujukanHasil', x.hasil);
        set('rujukanFoto1', x.foto1);
        set('rujukanFoto2', x.foto2 || '');
        // Pratinjau foto 1 (dulu hanya foto 2 yang ditampilkan saat edit)
        const prev1Edit = document.getElementById('rujukanFotoPreview1');
        if (prev1Edit) prev1Edit.innerHTML = x.foto1
          ? '<img src="' + safeUrl(getDriveEmbedUrl(x.foto1)) + '" style="height:70px;border-radius:6px;object-fit:cover;border:1.5px solid #c39bd3;" onerror="_fotoTryProxy(this)">'
          : '';
        // Tampilkan preview foto2 jika sudah ada
        const prev2Edit = document.getElementById('rujukanFotoPreview2');
        if (prev2Edit && x.foto2) {
          const embedUrl2 = getDriveEmbedUrl ? getDriveEmbedUrl(x.foto2) : x.foto2;
          prev2Edit.innerHTML = '<img src="' + safeUrl(embedUrl2) + '" style="height:70px;border-radius:6px;object-fit:cover;border:1.5px solid #c39bd3;" onerror="_fotoTryProxy(this)">';
        } else if (prev2Edit) {
          prev2Edit.innerHTML = '';
        }
        // foto3 removed (consolidated)
        set('rujukanTindakLanjut', x.tindakLanjut);
        set('rujukanPetugas', x.petugas);
        const formCheck = document.getElementById('formRujukan');
        if (formCheck) formCheck.dataset.editId = id;
        const btnSimpan = document.getElementById('btnSimpanRujukan');
        if (btnSimpan) { btnSimpan.textContent = '✏️ Perbarui Rujukan'; btnSimpan.style.background = 'var(--accent)'; }
        const btnBatal = document.getElementById('btnBatalRujukan');
        if (btnBatal) btnBatal.style.display = '';
        showAlert('alertRujukan', 'info', '✏️ Mode Edit — ubah data lalu klik Perbarui. Nama PM tidak perlu dipilih ulang.');
      }, 100);
    }
    function batalEditRujukan() {
      const formRuj = document.getElementById('formRujukan');
      if (formRuj) { delete formRuj.dataset.editId; formRuj.reset(); }
      const dispRuj = document.getElementById('rujukanPMDisplay'); if (dispRuj) dispRuj.value = '';
      const btnSimpan = document.getElementById('btnSimpanRujukan');
      if (btnSimpan) { btnSimpan.textContent = '💾 Simpan Data Rujukan'; btnSimpan.style.background = ''; }
      const btnBatal = document.getElementById('btnBatalRujukan');
      if (btnBatal) btnBatal.style.display = 'none';
      ['rujukanFotoPreview1','rujukanFotoPreview2'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
      ['rujukanFotoStatus1','rujukanFotoStatus2'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
      if (typeof _rujukanFotoFile !== 'undefined') { _rujukanFotoFile[1] = null; _rujukanFotoFile[2] = null; }
      const btnUp = document.getElementById('btnUploadFotoRujukan');
      if (btnUp) { btnUp.style.display = 'none'; btnUp.disabled = false; btnUp.textContent = '☁️ Upload foto ke Drive'; }
      showAlert('alertRujukan', 'info', 'Edit dibatalkan.');
    }
    function tampilInsidentalMingguLalu(ni) {
      const box = document.getElementById('riwayatSebelumnyaBox');
      if (!box) return;
      // 1 minggu terakhir
      const batas = isoLokal(new Date(Date.now() - 7 * 86400000));
      const list = (state.insidental || []).filter(x => !x._deleted && x.nomorInduk === ni && x.tgl >= batas)
        .sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
      if (!list.length) return; // biarkan renderRiwayatSebelumnya yang isi
      // Tambah insidental info ke box
      const existing = box.innerHTML;
      const insHtml = '<div style="background:#fff8f0;border-radius:10px;padding:.75rem;margin-top:.75rem;">' +
        '<div style="font-size:.8rem;font-weight:700;color:#e67e22;margin-bottom:.4rem">🚨 Keluhan Insidental 7 Hari Terakhir:</div>' +
        list.map(x => '<div style="font-size:.8rem;padding:4px 0;border-bottom:1px solid #f0d9c0;">' +
          '<strong>' + escHtml(new Date(x.tgl).toLocaleDateString('id-ID')) + '</strong>' +
          (fmtWaktu(x.waktu) ? (escHtml(' ' + fmtWaktu(x.waktu))) : '') + ' — ' + escHtml(x.keluhan) +
          (x.suhu ? escHtml(' | 🌡️' + x.suhu + '°C') : '') + (x.td ? escHtml(' | TD:' + x.td) : '') +
          ' <span class="badge ' + (x.status === 'Ditangani' ? 'badge-green' : 'badge-yellow') + '">' + (escHtml(x.status || '-')) + '</span>' +
          '</div>').join('') + '</div>';
      box.innerHTML = existing + insHtml;
      box.style.display = '';
    }

    function updateSelectInsidental() {
      const sel = document.getElementById('insidentalPM');
      if (!sel) return;
      const curr = sel.value;
      sel.innerHTML = '<option value="">-- Pilih PM --</option>';
      const sorted = [...state.penerima].sort((a, b) => (a.namaPM||'').localeCompare((b.namaPM||''), 'id'));
      sorted.forEach(pm => {
        const opt = document.createElement('option');
        opt.value = pm.nomorInduk; opt.textContent = (pm.namaPM||'-') + ' · ' + pm.nomorInduk;
        sel.appendChild(opt);
      });
      if (curr) sel.value = curr;
      pmAcUpdateDisplay('insidentalPM');
    }
