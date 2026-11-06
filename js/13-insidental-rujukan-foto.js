    // ══════════════════════════════════════
    //  INSIDENTAL
    // ══════════════════════════════════════
    async function simpanInsidental() {
      const formIns = document.getElementById('formInsidental');
      const editId = formIns ? formIns.dataset.editId : null;
      let ni = document.getElementById('insidentalPM').value;
      let tgl = document.getElementById('insidentalTgl').value;
      if (editId && (!ni || !tgl)) {
        const ex = (state.insidental || []).find(x => String(x.id) === String(editId));
        if (ex) { if (!ni) ni = ex.nomorInduk; if (!tgl) tgl = ex.tgl; }
      }
      const keluhan = document.getElementById('insidentalKeluhan').value.trim();
      if (!ni || !tgl || !keluhan) { showAlert('alertInsidental', 'error', '❌ PM, tanggal, dan keluhan wajib diisi!'); return; }
      const pm = state.penerima.find(p => p.nomorInduk === ni);
      const data = {
        id: editId || ('ins-' + Date.now()),
        nomorInduk: ni,
        namaPM: pm ? pm.namaPM : ni,
        kamarBlok: pm ? pm.kamarBlok : '',
        tgl: tgl,
        waktu: document.getElementById('insidentalWaktu').value,
        keluhan: keluhan,
        suhu: document.getElementById('insidentalSuhu').value,
        td: document.getElementById('insidentalTD').value,
        spo2: document.getElementById('insidentalSpo2').value,
        nadi: document.getElementById('insidentalNadi').value,
        tindakan: document.getElementById('insidentalTindakan').value,
        status: document.getElementById('insidentalStatus').value,
        perluRujukan: document.getElementById('insidentalRujukan').value,
        petugas: document.getElementById('insidentalPetugas').value || state.namaPetugas || '',
        obatDiberikan: ambilObatDariForm('insidental'),
        waktuInput: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      // Validasi nilai vital & tanggal (sama seperti pemeriksaan/pengukuran)
      if (!_cekVitalSebelumSimpan({ tgl: data.tgl, td: data.td, nadi: data.nadi, suhu: data.suhu, spo2: data.spo2 }, 'alertInsidental')) return;
      // Blokir simpan kalau obat yang diberikan bentrok dengan catatan alergi PM (kecuali dikonfirmasi eksplisit)
      if (!konfirmasiBentrokAlergiSebelumSimpan(ni, data.obatDiberikan)) {
        showAlert('alertInsidental', 'error', '❌ Simpan dibatalkan karena ada bentrok alergi yang belum dikonfirmasi.');
        return;
      }
      // Kurangi stok dan catat log (baru), atau koreksi selisih (edit)
      if (!editId) {
        catatPemakaianObat(data.obatDiberikan, pm ? pm.namaPM : ni, 'insidental', data.petugas, tgl, data.id);
      } else {
        const _oldIns = (state.insidental || []).find(i => String(i.id) === String(editId));
        terapkanKoreksiStokEdit(_oldIns ? _oldIns.obatDiberikan : [], data.obatDiberikan);
      }
      if (!state.insidental) state.insidental = [];
      if (editId) {
        const idx = state.insidental.findIndex(i => String(i.id) === String(editId));
        const _lamaIns = idx !== -1 ? state.insidental[idx] : null;
        if (_lamaIns && _lamaIns.waktuInput) data.waktuInput = _lamaIns.waktuInput;
        const _barisIns = { ...(_lamaIns || {}), ...data, id: editId };
        if (idx !== -1) state.insidental[idx] = _barisIns;
        else state.insidental.push(_barisIns);
        // Catatan pemakaian obat mengikuti daftar obat yang baru (dulu catatan lama tetap ada)
        _gantiLogObatSumber('insidental', _lamaIns, _barisIns);
        saveState();
        triggerSyncAfterSave(); renderInsidental();
        try { renderRekapInsidental(); renderKasiInsidental(); } catch (e) {}
        if (state.scriptUrl) await kirimKeSheets('editInsidental', _barisIns);
        delete formIns.dataset.editId;
        const btnS = document.getElementById('btnSimpanInsidental');
        if (btnS) { btnS.textContent = '💾 Simpan Keluhan Insidental'; btnS.style.background = ''; }
        const btnB = document.getElementById('btnBatalInsidental');
        if (btnB) btnB.style.display = 'none';
        // Kosongkan form setelah edit (dulu isian tertinggal → klik Simpan lagi membuat data ganda)
        ['insidentalPM', 'insidentalTgl', 'insidentalWaktu', 'insidentalKeluhan', 'insidentalSuhu',
          'insidentalTD', 'insidentalSpo2', 'insidentalNadi', 'insidentalTindakan'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
          });
        const dispInsEdit = document.getElementById('insidentalPMDisplay'); if (dispInsEdit) dispInsEdit.value = '';
        resetObatForm('insidental');
        showAlert('alertInsidental', 'success', '✅ Data keluhan insidental berhasil diperbarui!'); showToast('✅ Keluhan insidental berhasil diperbarui!');
      } else {
        state.insidental.push(data);
        saveState(); triggerSyncAfterSave(); renderInsidental();
        try { renderRekapInsidental(); renderKasiInsidental(); } catch (e) {}
        if (state.scriptUrl) kirimKeSheets('addInsidental', data);
        // Kasus Perlu Dokter / Darurat harus segera masuk Antrian dengan prioritas,
        // supaya kelihatan petugas lain & muncul di daftar siap periksa dokter.
        if (data.status === 'Perlu Dokter' || data.status === 'Darurat') {
          masukkanAntrianDariInsidental(ni, data.status);
        }
        // "Perlu Rujukan" bukan cuma flag — langsung buat draft di menu Rujukan
        if (data.perluRujukan === 'ya') {
          buatDraftRujukanOtomatis({
            nomorInduk: ni, tgl: tgl, tujuan: '', diagnosis: data.keluhan || '',
            asal: 'Insidental', petugas: data.petugas, idInsidental: data.id
          });
        }
        ['insidentalPM', 'insidentalTgl', 'insidentalWaktu', 'insidentalKeluhan', 'insidentalSuhu',
          'insidentalTD', 'insidentalSpo2', 'insidentalNadi', 'insidentalTindakan'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
          });
        const dispInsAfterSave = document.getElementById('insidentalPMDisplay'); if (dispInsAfterSave) dispInsAfterSave.value = '';
        resetObatForm('insidental');
        showAlert('alertInsidental', 'success', '✅ Keluhan insidental berhasil disimpan!'); showToast('✅ Keluhan insidental berhasil disimpan!');
      }
    }

    // ══════════════════════════════════════
    //  RUJUKAN
    // ══════════════════════════════════════
    async function simpanRujukan() {
      const formRuj = document.getElementById('formRujukan');
      // Simpan editId di variabel lokal SEBELUM apapun (tidak bergantung DOM saat async)
      const editId = formRuj ? (formRuj.dataset.editId || null) : null;
      let ni = document.getElementById('rujukanPM').value;
      let tgl = document.getElementById('rujukanTgl').value;
      if (editId && (!ni || !tgl)) {
        const ex = (state.rujukan || []).find(x => String(x.id) === String(editId));
        if (ex) { if (!ni) ni = ex.nomorInduk; if (!tgl) tgl = ex.tgl; }
      }
      const tujuan = document.getElementById('rujukanTujuan').value.trim();
      if (!ni || !tgl || !tujuan) { showAlert('alertRujukan', 'error', '❌ PM, tanggal, dan tujuan wajib diisi!'); return; }
      const pm = state.penerima.find(p => p.nomorInduk === ni);

      const btnSimpan = document.getElementById('btnSimpanRujukan');
      // Kunci tombol selama seluruh proses (upload + simpan)
      if (btnSimpan) { btnSimpan.disabled = true; btnSimpan.textContent = '⏳ Menyimpan...'; }

      try {
        // Foto yang sudah dipilih tapi belum diunggah → unggah dulu otomatis
        // (dulu foto itu hilang begitu saja bila petugas lupa menekan tombol Upload)
        if ((_rujukanFotoFile[1] || _rujukanFotoFile[2]) && state.scriptUrl) {
          await uploadFotoRujukanKeDrive();
        }
        // Hidden input rujukanFoto1/2 sudah berisi Drive URL — ambil langsung

        const data = {
          id: editId || ('ruj-' + Date.now()),
          nomorInduk: ni,
          namaPM: pm ? pm.namaPM : ni,
          kamarBlok: pm ? pm.kamarBlok : '',
          tgl: tgl ? tgl.substring(0, 10) : tgl,
          jenis: document.getElementById('rujukanJenis').value,
          tujuan: tujuan,
          diagnosis: document.getElementById('rujukanDiagnosis').value,
          alasan: document.getElementById('rujukanAlasan') ? document.getElementById('rujukanAlasan').value : '',
          asal: document.getElementById('rujukanAsal').value,
          statusRujukan: (document.getElementById('rujukanStatus') || {}).value || 'Aktif',
          hasil: document.getElementById('rujukanHasil').value,
          foto1: (document.getElementById('rujukanFoto1') || {}).value || '',
          foto2: (document.getElementById('rujukanFoto2') || {}).value || '',
          foto3: '',
          tindakLanjut: document.getElementById('rujukanTindakLanjut').value,
          petugas: document.getElementById('rujukanPetugas').value || state.namaPetugas || '',
          waktuInput: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        // Catat tanggal selesai otomatis saat status BARU pertama kali jadi "Selesai"
        // (dipakai Kartu Mingguan untuk deteksi rujukan yang selesai di periode minggu tsb)
        const _rujLama = editId ? (state.rujukan || []).find(r => String(r.id) === String(editId)) : null;
        if (data.statusRujukan === 'Selesai') {
          data.tglSelesai = (_rujLama && _rujLama.statusRujukan === 'Selesai' && _rujLama.tglSelesai)
            ? _rujLama.tglSelesai : isoLokal(new Date());
        } else {
          data.tglSelesai = '';
        }
        if (!state.rujukan) state.rujukan = [];
        if (editId) {
          // MODE EDIT: update record yang ada
          const idx = state.rujukan.findIndex(r => String(r.id) === String(editId));
          if (_rujLama && _rujLama.waktuInput) data.waktuInput = _rujLama.waktuInput;
          const _barisRuj = { ...(idx !== -1 ? state.rujukan[idx] : {}), ...data, id: editId };
          if (idx !== -1) state.rujukan[idx] = _barisRuj;
          else state.rujukan.push(_barisRuj);
          saveState();
          triggerSyncAfterSave(); renderRujukan();
          try { renderRekapRujukan(); renderKasiRujukanFull(); } catch (e) {}
          // Foto sudah Drive URL — aman langsung kirim ke Sheets (tidak ada base64)
          const _kirimRuj = Object.assign({}, _barisRuj);
          ['foto1', 'foto2', 'foto3'].forEach(k => { if (String(_kirimRuj[k] || '').startsWith('data:')) _kirimRuj[k] = ''; });
          if (state.scriptUrl) await kirimKeSheets('editRujukan', _kirimRuj);
          // Hapus editId SETELAH kirimKeSheets selesai
          if (formRuj) delete formRuj.dataset.editId;
          // Kosongkan form setelah edit (dulu isian tertinggal → klik Simpan lagi membuat rujukan ganda)
          ['rujukanPM', 'rujukanTgl', 'rujukanTujuan', 'rujukanDiagnosis', 'rujukanAlasan', 'rujukanHasil',
            'rujukanFoto1', 'rujukanFoto2', 'rujukanTindakLanjut', 'rujukanPetugas', 'rujukanPMDisplay'].forEach(id => {
              const el = document.getElementById(id); if (el) el.value = '';
            });
          { const elStatus = document.getElementById('rujukanStatus'); if (elStatus) elStatus.value = 'Aktif'; }
          ['rujukanFotoPreview1','rujukanFotoPreview2'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
          ['rujukanFotoStatus1','rujukanFotoStatus2'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
          const btnS = document.getElementById('btnSimpanRujukan');
          if (btnS) { btnS.textContent = '💾 Simpan Data Rujukan'; btnS.style.background = ''; }
          const btnB = document.getElementById('btnBatalRujukan');
          if (btnB) btnB.style.display = 'none';
          showAlert('alertRujukan', 'success', '✅ Data rujukan berhasil diperbarui!'); showToast('✅ Data rujukan berhasil diperbarui!');
        } else {
          state.rujukan.push(data);
          saveState(); renderRujukan();
          // Foto sudah Drive URL — await agar Sheets menerima data lengkap sebelum form direset
          if (state.scriptUrl) await kirimKeSheets('addRujukan', data);
          triggerSyncAfterSave();
          ['rujukanPM', 'rujukanTgl', 'rujukanTujuan', 'rujukanDiagnosis', 'rujukanAlasan', 'rujukanHasil',
            'rujukanFoto1', 'rujukanFoto2', 'rujukanTindakLanjut', 'rujukanPetugas'].forEach(id => {
              const el = document.getElementById(id); if (el) el.value = '';
            });
          { const elStatus = document.getElementById('rujukanStatus'); if (elStatus) elStatus.value = 'Aktif'; }
          ['rujukanFotoFile1','rujukanFotoFile2'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
          ['rujukanFotoPreview1','rujukanFotoPreview2'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
          ['rujukanFotoStatus1','rujukanFotoStatus2'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
          _rujukanFotoFile[1] = null; _rujukanFotoFile[2] = null;
          const btnUp2 = document.getElementById('btnUploadFotoRujukan');
          if (btnUp2) { btnUp2.style.display = 'none'; btnUp2.disabled = false; btnUp2.textContent = '☁️ Upload foto ke Drive'; }
          showAlert('alertRujukan', 'success', '✅ Data rujukan berhasil disimpan!'); showToast('✅ Data rujukan berhasil disimpan!');
        }
      } finally {
        // Selalu kembalikan tombol ke state yang benar
        const btnF = document.getElementById('btnSimpanRujukan');
        if (btnF) {
          btnF.disabled = false;
          const masihEditMode = formRuj && formRuj.dataset.editId;
          // Hanya reset teks jika sudah keluar dari mode edit
          if (!masihEditMode) {
            btnF.textContent = '💾 Simpan Data Rujukan';
            btnF.style.background = '';
          }
        }
      }
    }

    // ── Helper: hitung berapa hari rujukan sudah berjalan sejak tanggal rujuk ──
    function hitungHariBerjalanRujukan(tgl) {
      if (!tgl) return null;
      const mulai = new Date(tgl); mulai.setHours(0,0,0,0);
      const now = new Date(); now.setHours(0,0,0,0);
      const diff = Math.round((now - mulai) / 86400000);
      return diff >= 0 ? diff : 0;
    }

    // ── Helper: render badge status rujukan (Aktif + hari berjalan / Selesai) ──
    function badgeStatusRujukan(x) {
      const status = x.statusRujukan || 'Aktif';
      if (status === 'Selesai') {
        return '<span class="badge badge-green" style="white-space:nowrap;">✅ Selesai</span>';
      }
      const hari = hitungHariBerjalanRujukan(x.tgl);
      const lama = hari !== null && hari >= 7;
      return '<span class="badge ' + (lama ? 'badge-red' : 'badge-yellow') + '" style="white-space:nowrap;" title="Rujukan masih berjalan">'
        + '🔵 Aktif' + (hari !== null ? escHtml(' · ' + hari + ' hari') : '') + '</span>';
    }

    function renderRujukan(q) {
      const tbody = document.getElementById('rujukanBody');
      if (!tbody) return;
      q = q !== undefined ? q : ((document.getElementById('searchRujukan')||{}).value || '');
      const bulan = parseInt((document.getElementById('petugasRujBulan') || { value: '0' }).value || '0');
      const tahun = (document.getElementById('petugasRujTahun') || { value: '' }).value || '';
      const minggu = parseInt((document.getElementById('filterRujukanMinggu') || {}).value || '0');
      let list = [...(state.rujukan || [])].filter(x => !x._deleted).sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
      if (bulan > 0) list = list.filter(x => x.tgl && new Date(x.tgl).getMonth() + 1 === bulan);
      if (tahun) list = list.filter(x => x.tgl && new Date(x.tgl).getFullYear() === parseInt(tahun));
      if (q) list = list.filter(x => (x.namaPM || '').toLowerCase().includes(q.toLowerCase()));
      // Rujukan tidak punya kolom mingguKe → minggu dihitung dari tanggalnya (dulu tabel selalu kosong)
      if (minggu) list = list.filter(x => _mingguDariTgl(x) === minggu);

      // ── Banner pengingat rujukan yang sudah lama menunggu hasil (>=7 hari, belum Selesai) ──
      const banner = document.getElementById('rujukanOverdueBanner');
      if (banner) {
        const overdue = (state.rujukan || []).filter(x => !x._deleted && (x.statusRujukan || 'Aktif') !== 'Selesai'
          && hitungHariBerjalanRujukan(x.tgl) >= 7);
        if (overdue.length > 0) {
          banner.style.display = 'block';
          banner.textContent = '⚠️ Ada ' + overdue.length + ' rujukan yang sudah ≥7 hari belum ada hasil/tindak lanjut. Mohon dicek dan diperbarui statusnya.';
        } else {
          banner.style.display = 'none';
        }
      }

      const _pgRujukan = document.getElementById('rujukanPagination');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:1.5rem">Belum ada data rujukan</td></tr>'; if (_pgRujukan) _pgRujukan.innerHTML=''; return; }
      list = _fltTbl('rujukan', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppRujukan = 100;
      const _totalPagesRujukan = Math.max(1, Math.ceil(list.length / _ppRujukan));
      if (_pageState.rujukan > _totalPagesRujukan) _pageState.rujukan = _totalPagesRujukan;
      const _startRujukan = (_pageState.rujukan - 1) * _ppRujukan;
      tbody.innerHTML = '';
      list.slice(_startRujukan, _startRujukan + _ppRujukan).forEach((x, _idx) => {
        const idx = _startRujukan + _idx;
        const tr = document.createElement('tr');
        const fotoLinks = [x.foto1, x.foto2, x.foto3].filter(Boolean).map((f, i) => {
          const thumb = getDriveEmbedUrl(f);
          return '<img src="' + safeUrl(thumb) + '" style="height:40px;width:50px;object-fit:cover;border-radius:4px;cursor:pointer;border:1.5px solid #c39bd3;" '
            + 'onclick="lihatFoto(\'' + jsArg(f) + '\',\'Foto ' + (jsArg(i+1)) + '\')" '
            + 'onerror="_fotoTryProxy(this)">';
        }).join(' ');
        tr.innerHTML =
          '<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">' + (escHtml(idx + 1)) + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(new Date(x.tgl).toLocaleDateString('id-ID')) + '</td>' +
          '<td><strong>' + (escHtml(x.namaPM || '-')) + '</strong></td>' +
          '<td style="font-size:.8rem">' + (escHtml(x.jenis || '-')) + '</td>' +
          '<td style="font-size:.8rem">' + (escHtml(x.tujuan || '-')) + '</td>' +
          '<td style="font-size:.8rem;max-width:120px">' + (escHtml(x.diagnosis || '-')) + '</td>' +
          '<td style="font-size:.8rem;max-width:120px">' + escHtml(String(x.hasil || '-').substring(0, 60)) + (x.hasil && String(x.hasil).length > 60 ? '...' : '') + '</td>' +
          '<td style="text-align:center;">' + badgeStatusRujukan(x) + '</td>' +
          '<td>' + (fotoLinks || '-') + '</td>' +
          '<td></td>';
        const bEdit = document.createElement('button');
        bEdit.className = 'btn btn-accent btn-sm'; bEdit.textContent = '✏️'; bEdit.title = 'Edit';
        bEdit.onclick = () => editRujukan(x.id);
        const bHapus = document.createElement('button');
        bHapus.className = 'btn btn-ghost btn-sm'; bHapus.style.color = 'var(--danger)'; bHapus.textContent = '🗑️';
        bHapus.onclick = () => hapusRujukan(x.id);
        const bLihat = document.createElement('button');
        bLihat.className = 'btn btn-ghost btn-sm'; bLihat.textContent = '👁'; bLihat.title = 'Lihat Detail';
        bLihat.onclick = () => lihatDetailRujukan(x.id);
        tr.lastElementChild.appendChild(bLihat);
        tr.lastElementChild.appendChild(bEdit);
        tr.lastElementChild.appendChild(bHapus);
        tbody.appendChild(tr);
      });
      _renderPaginationControls('rujukanPagination', 'rujukan', list.length, _ppRujukan, 'renderRujukan');
    }

    function filterRujukan(q) { _pageState.rujukan = 1; renderRujukan(q); }

    async function hapusRujukan(id) {
      const _rj = (state.rujukan || []).find(x => String(x.id) === String(id)) || {};
      const _adaFotoRj = [_rj.foto1, _rj.foto2, _rj.foto3].some(Boolean);
      if (!confirm('Hapus data rujukan ini?' + (_adaFotoRj ? '\n\nFoto buktinya juga dipindah ke Sampah Google Drive (masih bisa dipulihkan dari Sampah ±30 hari).' : ''))) return;
      // ── Soft-delete: tandai _deleted agar tidak kembali saat auto-sync ──
      // Jika langsung di-filter saja, smartMerge akan mengembalikan dari Sheets
      const idx = (state.rujukan || []).findIndex(x => String(x.id) === String(id));
      if (idx !== -1) {
        state.rujukan[idx] = { ...state.rujukan[idx], _deleted: true, updatedAt: new Date().toISOString() };
      }
      saveState();
      // ── Refresh semua tampilan rujukan ──
      renderRujukan && renderRujukan();
      renderRekapRujukan && renderRekapRujukan();
      renderKasiRujukanFull && renderKasiRujukanFull();
      typeof renderDokterRujukan === 'function' && renderDokterRujukan();
      showToast('🗑️ Data rujukan berhasil dihapus', 'success');
      // ── Hapus dari Google Sheets agar tidak restore saat sync ──
      if (state.scriptUrl) {
        try { await kirimKeSheets('deleteRujukan', { id }); } catch(e) { console.warn('deleteRujukan GAS error:', e); }
      }
    }

    function updateSelectRujukan() {
      const sel = document.getElementById('rujukanPM');
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
      pmAcUpdateDisplay('rujukanPM');
    }

    // Tampil rujukan untuk dokter saat pilih PM
    function tampilRujukanPM(ni) {
      const box = document.getElementById('riwayatSebelumnyaBox');
      if (!box) return;
      const rujList = (state.rujukan || []).filter(x => !x._deleted && x.nomorInduk === ni).sort((a, b) => new Date(a.tgl) - new Date(b.tgl)).slice(-2);
      if (!rujList.length) return;
      const rujHtml = '<div style="background:#f9f0ff;border-radius:10px;padding:.75rem;margin-top:.75rem;">' +
        '<div style="font-size:.8rem;font-weight:700;color:#8e44ad;margin-bottom:.4rem">🏥 Riwayat Rujukan Terakhir:</div>' +
        rujList.map(x => '<div style="font-size:.8rem;padding:4px 0;border-bottom:1px solid #e0cff0;">' +
          '<strong>' + escHtml(new Date(x.tgl).toLocaleDateString('id-ID')) + '</strong> — ' + (escHtml(x.jenis || '-')) +
          ' ke <strong>' + (escHtml(x.tujuan || '-')) + '</strong>' +
          (x.hasil ? escHtml(' | Hasil: ' + String(x.hasil).substring(0, 60)) : '') +
          [x.foto1, x.foto2, x.foto3].filter(Boolean).map((f, i) =>
            ' <a href="' + safeUrl(f) + '" target="_blank" style="color:#8e44ad;font-size:.75rem;">📎' + (escHtml(i + 1)) + '</a>'
          ).join('') +
          '</div>').join('') + '</div>';
      box.innerHTML += rujHtml;
      box.style.display = '';
    }

    // ══════════════════════════════════════
    //  FOTO DOKUMENTASI MINGGU
    // ══════════════════════════════════════
    function handleFotoMinggu(input) {
      const files = Array.from(input.files).slice(0, 2);
      const preview = document.getElementById('fotoMingguPreview');
      if (!preview) return;
      if (!state.fotoMinggu) state.fotoMinggu = [];

      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
          const existing = state.fotoMinggu.filter(f => f.url && f.url.startsWith('data:'));
          if (existing.length >= 2) {
            alert('Maksimal 2 foto sudah tercapai. Hapus salah satu terlebih dahulu.');
            return;
          }
          const bulan = parseInt(document.getElementById('filterBulan').value);
          const tahun = parseInt(document.getElementById('filterTahun').value);
          const minggu = document.getElementById('filterMinggu') ? document.getElementById('filterMinggu').value : '';
          const entry = {
            id: 'foto-' + Date.now(),
            url: e.target.result,
            bulan, tahun, minggu,
            nama: file.name,
            waktu: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          state.fotoMinggu.push(entry);
          saveState();
          renderFotoMinggu();
        };
        reader.readAsDataURL(file);
      });
      input.value = '';
    }

    function saveFotoMingguLinks() {
      // Legacy: no-op
    }

    // Render upload area per-tanggal pemeriksaan di halaman petugas
    // ══════════════════════════════════════════════════════════
    //  FOTO MINGGUAN — POLA SIPELAPOR
    //  1. Pilih file → preview lokal (objectURL), simpan File object
    //  2. Klik "☁️ Upload ke Drive" → kompres canvas → fetch POST ke GAS
    //  3. GAS simpan ke Drive → balik driveUrl → state diperbarui
    // ══════════════════════════════════════════════════════════
    // Simpan File object per tgl+slot: key = tgl + '_' + slot
    const _fmFile = {};

    // Kompres File/Blob ke JPEG base64 via canvas (pola SIPELAPOR: 900px, 0.72)
    function _kompressFotoMinggu(file, maxPx, quality) {
      return new Promise(function(resolve, reject) {
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        img.onload = function() {
          URL.revokeObjectURL(objUrl);
          let w = img.width, h = img.height;
          if (w > maxPx || h > maxPx) {
            if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
            else       { w = Math.round(w * maxPx / h); h = maxPx; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality || 0.72));
        };
        img.onerror = function() { URL.revokeObjectURL(objUrl); reject(new Error('Gagal baca gambar')); };
        img.src = objUrl;
      });
    }

    // Upload satu slot foto ke GAS via fetch (bukan XHR — agar ikuti redirect 302 GAS)
    async function _uploadSatuFotoMinggu(tgl, slot, statusElId) {
      const key = tgl + '_' + slot;
      const file = _fmFile[key];
      if (!file) return false;

      const d = tgl ? new Date(tgl + 'T00:00:00') : new Date();
      const bulan = d.getMonth() + 1;
      const tahun = d.getFullYear();
      const tglLabel = d.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
      const id = 'foto-' + tgl + '-' + slot + '-' + Date.now();

      const statusEl = statusElId ? document.getElementById(statusElId) : null;
      if (statusEl) statusEl.textContent = '⏳ Mengompres...';

      let dataUrl;
      try {
        dataUrl = await _kompressFotoMinggu(file, 900, 0.72);
      } catch(e) {
        if (statusEl) statusEl.textContent = '❌ Gagal kompres: ' + e.message;
        return false;
      }

      if (statusEl) statusEl.textContent = '⏳ Mengupload ke Drive...';

      const payload = JSON.stringify({
        action: 'addFoto',
        deviceId: state._deviceId || 'web',
        data: {
          id, url: dataUrl, isLink: false, slot,
          label: tglLabel + ' — Foto ' + slot,
          tglPeriksa: tgl, nama: file.name,
          bulan, tahun,
          waktu: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      const controller = new AbortController();
      const tid = setTimeout(function() { controller.abort(); }, 90000);

      try {
        const resp = await fetch(state.scriptUrl, {
          method:  'POST',
          mode:    'cors',
          headers: { 'Content-Type': 'text/plain' },
          body:    payload,
          signal:  controller.signal
        });
        clearTimeout(tid);
        const text = await resp.text();
        let r;
        try { r = JSON.parse(text); } catch(e) { r = { ok: false, error: 'Response bukan JSON' }; }

        if (r.ok && r.driveUrl && r.driveUrl.length > 10) {
          // Hapus slot yang sama (jika ada upload ulang)
          if (!state.fotoMinggu) state.fotoMinggu = [];
          // Foto lama di slot yang sama dihapus juga di server (dulu tetap tersimpan → muncul ganda setelah sinkron)
          state.fotoMinggu.filter(f => String(f.slot) === String(slot) && f.tglPeriksa === tgl && f.id !== id && f.isLink)
            .forEach(f => { if (state.scriptUrl) kirimKeSheets('deleteFoto', { id: f.id, driveFileId: f.driveFileId || '', url: f.url || '' }); });
          state.fotoMinggu = state.fotoMinggu.filter(f => !(String(f.slot) === String(slot) && f.tglPeriksa === tgl));
          // Tambah entry baru dengan Drive URL langsung (tidak simpan base64)
          state.fotoMinggu.push({
            id, url: r.driveUrl, isLink: true, slot,
            label: tglLabel + ' — Foto ' + slot,
            tglPeriksa: tgl, nama: file.name,
            bulan, tahun, driveFileId: r.driveFileId || '',
            waktu: new Date().toISOString(), updatedAt: new Date().toISOString()
          });
          saveState();
          // Perbarui preview slot → pakai Drive embed URL
          const prevEl = document.getElementById('fmPrev_' + tgl + '_' + slot);
          if (prevEl) prevEl.innerHTML = '<img src="' + safeUrl(getDriveEmbedUrl(r.driveUrl)) + '" style="height:70px;width:90px;object-fit:cover;border-radius:6px;border:2px solid #27ae60;margin-top:2px;" onerror="_fotoTryProxy(this)">';
          // Perbarui galeri foto tersimpan
          const existDiv = document.getElementById('fmExisting_' + tgl);
          if (existDiv) _renderExistingFotoForDate(existDiv, tgl, bulan, tahun);
          renderFotoMinggu();
          // Bersihkan File object — sudah tidak dibutuhkan
          delete _fmFile[key];
          if (statusEl) statusEl.innerHTML = '✅ Tersimpan di Drive!';
          return true;
        } else {
          if (statusEl) statusEl.textContent = '❌ ' + (r.error || 'GAS error — deploy ulang');
          return false;
        }
      } catch(err) {
        clearTimeout(tid);
        // Sinyal hilang / terlalu lambat → simpan di perangkat, kirim otomatis nanti
        if (_galatJaringan(err) && await _antrekanFoto({ jenis: 'minggu', action: 'addFoto', data: JSON.parse(payload).data })) {
          delete _fmFile[key];
          if (statusEl) statusEl.textContent = '📥 Tersimpan di perangkat — terkirim otomatis saat online';
          return true;
        }
        const msg = err.name === 'AbortError' ? 'Timeout (foto terlalu besar)' : (err.message || 'Koneksi gagal');
        if (statusEl) statusEl.textContent = '❌ ' + msg;
        return false;
      }
    }

    // Tambah tanggal manual ke daftar upload foto mingguan (untuk foto yang terlewat)
    function tambahTanggalFotoMinggu() {
      const inp = document.getElementById('fotoMingguTglManual');
      const tgl = inp && inp.value;
      if (!tgl) { showToast('⚠️ Pilih tanggal terlebih dahulu', 'warning'); return; }
      const d = new Date(tgl + 'T00:00:00');
      const bulan = d.getMonth() + 1, tahun = d.getFullYear();
      // Sesuaikan filter bulan/tahun supaya tanggal yang ditambahkan langsung terlihat
      const selBulan = document.getElementById('fotoFilterBulan');
      const selTahun = document.getElementById('fotoFilterTahun');
      if (selBulan) selBulan.value = bulan;
      if (selTahun) selTahun.value = tahun;
      state.fotoMingguTglManual = state.fotoMingguTglManual || [];
      if (state.fotoMingguTglManual.indexOf(tgl) === -1) {
        state.fotoMingguTglManual.push(tgl);
        saveState();
      }
      inp.value = '';
      renderFotoMingguInput();
      showToast('✅ Tanggal ' + tgl + ' ditambahkan — silakan pilih & upload foto');
    }

    // Upload semua slot yang ada File baru untuk satu tanggal
    async function uploadFotoMingguKeDrive(tgl) {
      if (!state.scriptUrl) { showToast('⚠️ URL Apps Script belum diatur di Setelan', 'warning'); return; }

      const key1 = tgl + '_1', key2 = tgl + '_2';
      const ada1 = !!_fmFile[key1], ada2 = !!_fmFile[key2];
      if (!ada1 && !ada2) { showToast('⚠️ Pilih foto terlebih dahulu', 'warning'); return; }

      const btnUp = document.getElementById('fmBtnUpload_' + tgl);
      const progEl = document.getElementById('fmProgress_' + tgl);
      if (btnUp) { btnUp.disabled = true; btnUp.textContent = '⏳ Mengupload...'; }
      if (progEl) progEl.style.display = '';

      _fotoBaruDiAntrekan = 0;
      let berhasil = 0;
      if (ada1) { const ok = await _uploadSatuFotoMinggu(tgl, 1, 'fmStatus_' + tgl + '_1'); if (ok) berhasil++; }
      if (ada2) { const ok = await _uploadSatuFotoMinggu(tgl, 2, 'fmStatus_' + tgl + '_2'); if (ok) berhasil++; }

      if (btnUp) { btnUp.disabled = false; btnUp.textContent = '☁️ Upload ke Drive'; }
      if (progEl) progEl.style.display = 'none';

      // Sembunyikan tombol jika semua file sudah terupload
      const masihAda = _fmFile[key1] || _fmFile[key2];
      if (!masihAda && btnUp) btnUp.style.display = 'none';

      const total = (ada1 ? 1 : 0) + (ada2 ? 1 : 0);
      if (_fotoBaruDiAntrekan > 0) showToast('📥 ' + _fotoBaruDiAntrekan + ' foto disimpan di perangkat dan akan diunggah otomatis saat ada sinyal', 'warning');
      else if (berhasil === total) showToast('✅ ' + berhasil + ' foto berhasil diupload ke Drive!');
      else if (berhasil > 0)       showToast('⚠️ ' + berhasil + '/' + total + ' foto berhasil', 'warning');
      else                         showToast('❌ Upload gagal — cek koneksi atau deploy ulang GAS', 'warning');

      triggerSyncAfterSave();
    }

    function renderFotoMingguInput() {
      const area = document.getElementById('fotoMingguUploadArea');
      if (!area) return;
      const bulan = parseInt((document.getElementById('fotoFilterBulan') || {value: new Date().getMonth()+1}).value);
      const tahun = parseInt((document.getElementById('fotoFilterTahun') || {value: new Date().getFullYear()}).value);

      // Ambil semua tanggal pemeriksaan unik untuk bulan/tahun ini
      const tglSet = new Set();
      (state.pemeriksaan||[]).filter(p => {
        const d = new Date(p.tglPeriksa);
        return d.getMonth()+1 === bulan && d.getFullYear() === tahun;
      }).forEach(p => { if (p.tglPeriksa) tglSet.add(String(p.tglPeriksa).split('T')[0]); });

      // Tanggal yang ditambahkan manual (mis. foto yang terlewat, diupload belakangan)
      (state.fotoMingguTglManual || []).forEach(t => {
        if (!t) return;
        const d = new Date(t + 'T00:00:00');
        if (d.getMonth() + 1 === bulan && d.getFullYear() === tahun) tglSet.add(t);
      });

      // Selalu sertakan hari ini jika tidak ada data
      const todayISO = isoLokal(new Date());
      if (!tglSet.size) tglSet.add(todayISO);

      const tglArr = [...tglSet].sort();
      area.innerHTML = '';

      tglArr.forEach(tgl => {
        const tglLabel = tgl
          ? new Date(tgl + 'T00:00:00').toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'})
          : '-';

        const row = document.createElement('div');
        row.style.cssText = 'background:#f0faf5;border-radius:10px;padding:.75rem 1rem;border:1.5px solid #a9dfbf;';
        // Escape tgl untuk dipakai dalam onclick string
        const tglSafe = tgl.replace(/'/g, "\'");
        row.innerHTML = `
          <div style="font-weight:700;font-size:.85rem;color:#1a6b4a;margin-bottom:.5rem;">📅 ${escHtml(tglLabel)}</div>
          <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:flex-start;">
            <div>
              <label style="font-size:.75rem;color:#555;">Foto 1</label>
              <input type="file" accept="image/*"
                onchange="onFotoMingguPilih(this,'${jsArg(tglSafe)}',1)"
                style="display:block;padding:4px;border:1.5px dashed #a9dfbf;border-radius:6px;cursor:pointer;font-size:.75rem;width:180px;margin-top:2px;">
              <div id="fmPrev_${escHtml(tgl)}_1" style="margin-top:.3rem;min-height:0;"></div>
              <div id="fmStatus_${escHtml(tgl)}_1" style="font-size:.72rem;margin-top:2px;min-height:14px;"></div>
            </div>
            <div>
              <label style="font-size:.75rem;color:#555;">Foto 2</label>
              <input type="file" accept="image/*"
                onchange="onFotoMingguPilih(this,'${jsArg(tglSafe)}',2)"
                style="display:block;padding:4px;border:1.5px dashed #a9dfbf;border-radius:6px;cursor:pointer;font-size:.75rem;width:180px;margin-top:2px;">
              <div id="fmPrev_${escHtml(tgl)}_2" style="margin-top:.3rem;min-height:0;"></div>
              <div id="fmStatus_${escHtml(tgl)}_2" style="font-size:.72rem;margin-top:2px;min-height:14px;"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:.4rem;align-self:flex-end;">
              <button id="fmBtnUpload_${escHtml(tgl)}" type="button"
                onclick="uploadFotoMingguKeDrive('${jsArg(tglSafe)}')"
                style="background:#27ae60;color:white;border:none;border-radius:8px;padding:7px 14px;font-size:.8rem;font-weight:600;cursor:pointer;display:none;">
                ☁️ Upload ke Drive
              </button>
              <div id="fmProgress_${escHtml(tgl)}" style="font-size:.75rem;color:#27ae60;display:none;">⏳</div>
            </div>
            <div id="fmExisting_${escHtml(tgl)}" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:flex-end;"></div>
          </div>`;
        area.appendChild(row);

        // Tampilkan foto yang sudah ada untuk tanggal ini
        const existDiv = document.getElementById('fmExisting_' + tgl);
        if (existDiv) _renderExistingFotoForDate(existDiv, tgl, bulan, tahun);
      });

      renderFotoMinggu();
    }

    function _renderExistingFotoForDate(container, tgl, bulan, tahun) {
      const fotos = (state.fotoMinggu||[]).filter(f => f.tglPeriksa === tgl && Number(f.bulan) === bulan && Number(f.tahun) === tahun);
      container.innerHTML = '';
      fotos.forEach(f => {
        const embedUrl = getDriveEmbedUrl(f.url);
        const w = document.createElement('div');
        w.style.cssText = 'background:#fff;border:1.5px solid #a9dfbf;border-radius:8px;overflow:hidden;';
        // Thumbnail
        const img = document.createElement('img');
        img.src = embedUrl; img.alt = f.label||'Foto';
        img.style.cssText = 'height:70px;width:90px;object-fit:cover;display:block;cursor:pointer;';
        img.onerror = function(){ _fotoTryProxy(img, f.url); };
        img.onclick = () => lihatFoto(f.url, f.label || ('Foto ' + (f.slot||'')));
        w.appendChild(img);
        // Aksi baris
        const acts = document.createElement('div');
        acts.style.cssText = 'display:flex;gap:2px;padding:2px;justify-content:center;background:#f0faf5;';
        const bLihat = document.createElement('button');
        bLihat.textContent = '👁'; bLihat.title = 'Lihat';
        bLihat.style.cssText = 'border:none;background:#1565c0;color:white;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:.68rem;';
        bLihat.onclick = () => lihatFoto(f.url, f.label || ('Foto '+(f.slot||'')));
        const bHapus = document.createElement('button');
        bHapus.textContent = '🗑'; bHapus.title = 'Hapus';
        bHapus.style.cssText = 'border:none;background:#c0392b;color:white;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:.68rem;';
        bHapus.onclick = () => hapusFotoMinggu(f.id);
        acts.appendChild(bLihat); acts.appendChild(bHapus);
        w.appendChild(acts);
        container.appendChild(w);
      });
    }

    function hapusFotoMinggu(id) {
      if (!confirm('Hapus foto ini?\n\nBerkas fotonya juga dipindah ke Sampah Google Drive (masih bisa dipulihkan dari Sampah ±30 hari).')) return;
      const _fotoDihapus = (state.fotoMinggu||[]).find(x => String(x.id) === String(id)) || {};
      state.fotoMinggu = (state.fotoMinggu||[]).filter(x => String(x.id) !== String(id));
      saveState();
      // Kirim hapus ke server (Google Sheets) agar tidak muncul kembali saat sync.
      // Lewat kirimKeSheets supaya tetap diantrekan bila sedang offline.
      // Server ikut memindahkan berkas fotonya ke Sampah Drive
      if (state.scriptUrl) kirimKeSheets('deleteFoto', { id, driveFileId: _fotoDihapus.driveFileId || '', url: String(_fotoDihapus.url || '').startsWith('data:') ? '' : (_fotoDihapus.url || '') });
      triggerSyncAfterSave();
      renderFotoMingguInput();
    }

    // Pilih file → preview objectURL, simpan File object (pola SIPELAPOR)
    function onFotoMingguPilih(input, tgl, slot) {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) { alert('Ukuran foto maksimal 15 MB.'); input.value = ''; return; }

      // Simpan File object (bukan base64)
      _fmFile[tgl + '_' + slot] = file;

      // Preview lokal via objectURL — ringan, tidak pakai memori base64
      const prevEl = document.getElementById('fmPrev_' + tgl + '_' + slot);
      if (prevEl) {
        const objUrl = URL.createObjectURL(file);
        prevEl.innerHTML = '<img src="' + safeUrl(objUrl) + '" style="height:70px;width:90px;object-fit:cover;border-radius:6px;border:2px dashed #27ae60;margin-top:2px;" onload="URL.revokeObjectURL(this.src)">';
      }

      // Reset status
      const statusEl = document.getElementById('fmStatus_' + tgl + '_' + slot);
      if (statusEl) statusEl.textContent = '📂 Dipilih — belum diupload';

      // Tampilkan tombol upload
      const btnUp = document.getElementById('fmBtnUpload_' + tgl);
      if (btnUp) btnUp.style.display = '';
    }

    // Alias agar tidak error jika ada kode lama yang masih memanggil handleFotoMingguUpload
    function handleFotoMingguUpload(input, tgl, slot) { onFotoMingguPilih(input, tgl, slot); }
    // uploadFotoKeDrive lama tidak lagi dipakai, alias ke no-op agar tidak error
    function uploadFotoKeDrive() {}

    // ══════════════════════════════════════════════════════════
    //  RUJUKAN FOTO — POLA SIPELAPOR
    // ══════════════════════════════════════════════════════════
    const _rujukanFotoFile = { 1: null, 2: null };

    function onRujukanFotoPilih(input, slot) {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) { alert('Ukuran foto maksimal 15 MB.'); input.value = ''; return; }
      _rujukanFotoFile[slot] = file;
      const prevEl = document.getElementById('rujukanFotoPreview' + slot);
      if (prevEl) {
        const objUrl = URL.createObjectURL(file);
        prevEl.innerHTML = '<img src="' + safeUrl(objUrl) + '" style="height:70px;border-radius:6px;object-fit:cover;border:1.5px solid #c39bd3;" onload="URL.revokeObjectURL(this.src)">';
      }
      const statusEl = document.getElementById('rujukanFotoStatus' + slot);
      if (statusEl) statusEl.textContent = '📂 Dipilih — belum diupload ke Drive';
      const hiddenEl = document.getElementById('rujukanFoto' + slot);
      if (hiddenEl) hiddenEl.value = '';
      const btnUp = document.getElementById('btnUploadFotoRujukan');
      if (btnUp) btnUp.style.display = '';
    }

    function _kompresRujukanFoto(file, maxPx, quality) {
      return new Promise(function(resolve, reject) {
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        img.onload = function() {
          URL.revokeObjectURL(objUrl);
          let w = img.width, h = img.height;
          if (w > maxPx || h > maxPx) {
            if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
            else       { w = Math.round(w * maxPx / h); h = maxPx; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality || 0.72));
        };
        img.onerror = function() { URL.revokeObjectURL(objUrl); reject(new Error('Gagal baca gambar')); };
        img.src = objUrl;
      });
    }

    async function _uploadSatuFotoRujukan(slot, tgl, namaPM, nomorInduk) {
      const file = _rujukanFotoFile[slot];
      if (!file) return null;
      const statusEl = document.getElementById('rujukanFotoStatus' + slot);
      if (statusEl) statusEl.textContent = '⏳ Mengompres foto ' + slot + '...';
      let dataUrl;
      try { dataUrl = await _kompresRujukanFoto(file, 900, 0.72); }
      catch (e) { if (statusEl) statusEl.textContent = '❌ Gagal membaca foto: ' + e.message; return null; }
      if (statusEl) statusEl.textContent = '⏳ Mengupload foto ' + slot + ' ke Drive...';
      const controller = new AbortController();
      const tid = setTimeout(function() { controller.abort(); }, 90000);
      try {
        const resp = await fetch(state.scriptUrl, {
          method: 'POST', mode: 'cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'uploadFotoRujukan',
            data: { url: dataUrl, nomorInduk, namaPM, tgl, slot: 'ruj' + slot,
                    nama: (namaPM || nomorInduk || 'rujukan') + '_foto' + slot + '.jpg' } }),
          signal: controller.signal
        });
        clearTimeout(tid);
        let json;
        try { json = JSON.parse(await resp.text()); } catch(e) { json = { ok: false, error: 'Response bukan JSON' }; }
        if (json.ok && json.driveUrl && !String(json.driveUrl).startsWith('data:')) {
          const hiddenEl = document.getElementById('rujukanFoto' + slot);
          if (hiddenEl) hiddenEl.value = json.driveUrl;
          if (statusEl) statusEl.innerHTML = '✅ Tersimpan! <a href="' + safeUrl(json.driveUrl) + '" target="_blank" style="color:#8e44ad;font-size:.73rem;">Lihat</a>';
          _rujukanFotoFile[slot] = null;
          return json.driveUrl;
        } else {
          if (statusEl) statusEl.textContent = '❌ ' + (json.error || 'GAS error');
          return null;
        }
      } catch(err) {
        clearTimeout(tid);
        if (_galatJaringan(err) && await _antrekanFoto({ jenis: 'rujukan', action: 'uploadFotoRujukan', nomorInduk: nomorInduk, tgl: tgl, slotNo: slot,
              data: { url: dataUrl, nomorInduk, namaPM, tgl, slot: 'ruj' + slot, nama: (namaPM || nomorInduk || 'rujukan') + '_foto' + slot + '.jpg' } })) {
          _rujukanFotoFile[slot] = null;
          if (statusEl) statusEl.textContent = '📥 Tersimpan di perangkat — terkirim otomatis saat online';
          return 'antre';
        }
        const msg = err.name === 'AbortError' ? 'Timeout — foto terlalu besar' : (err.message || 'Koneksi gagal');
        if (statusEl) statusEl.textContent = '❌ ' + msg;
        return null;
      }
    }

    async function uploadFotoRujukanKeDrive() {
      if (!state.scriptUrl) { showToast('⚠️ URL Apps Script belum diatur di Setelan', 'warning'); return; }
      let tgl = document.getElementById('rujukanTgl').value;
      let ni  = document.getElementById('rujukanPM').value;
      const formRuj = document.getElementById('formRujukan');
      const editId = formRuj ? formRuj.dataset.editId : null;
      if (editId && (!ni || !tgl)) {
        const ex = (state.rujukan || []).find(x => String(x.id) === String(editId));
        if (ex) { if (!ni) ni = ex.nomorInduk; if (!tgl) tgl = ex.tgl; }
      }
      const pm = state.penerima.find(p => p.nomorInduk === ni);
      const namaPM = pm ? pm.namaPM : (ni || 'rujukan');
      const ada1 = !!_rujukanFotoFile[1], ada2 = !!_rujukanFotoFile[2];
      if (!ada1 && !ada2) { showToast('⚠️ Pilih foto terlebih dahulu', 'warning'); return; }
      const btnUp = document.getElementById('btnUploadFotoRujukan');
      if (btnUp) { btnUp.disabled = true; btnUp.textContent = '⏳ Mengupload...'; }
      _fotoBaruDiAntrekan = 0;
      let berhasil = 0;
      if (ada1) { const u = await _uploadSatuFotoRujukan(1, tgl, namaPM, ni); if (u) berhasil++; }
      if (ada2) { const u = await _uploadSatuFotoRujukan(2, tgl, namaPM, ni); if (u) berhasil++; }
      if (btnUp) { btnUp.disabled = false; btnUp.textContent = '☁️ Upload foto ke Drive'; }
      const masihAda = _rujukanFotoFile[1] || _rujukanFotoFile[2];
      if (!masihAda && btnUp) btnUp.style.display = 'none';
      const total = (ada1?1:0) + (ada2?1:0);
      if (_fotoBaruDiAntrekan > 0) showToast('📥 ' + _fotoBaruDiAntrekan + ' foto disimpan di perangkat dan akan diunggah otomatis saat ada sinyal. Simpan rujukan seperti biasa.', 'warning');
      else if (berhasil === total) showToast('✅ ' + berhasil + ' foto berhasil diupload ke Drive!');
      else showToast('⚠️ ' + berhasil + '/' + total + ' foto berhasil', 'warning');
    }

    function handleRujukanFotoUpload(input, slot) { onRujukanFotoPilih(input, slot); }

    // ── Helper: konversi Drive URL ke format thumbnail yang andal untuk embed ──
    function getDriveEmbedUrl(url) {
      if (!url) return url;
      url = String(url);
      if (url.startsWith('data:')) return url; // base64 tetap apa adanya
      // Konversi uc?export=view → thumbnail format (lebih stabil di browser)
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && url.includes('drive.google.com')) {
        return 'https://drive.google.com/thumbnail?id=' + idMatch[1] + '&sz=w1000';
      }
      return url;
    }

    // ── Fallback saat foto Drive gagal dimuat langsung (file privat / sharing ──
    // ── ditolak kebijakan akun) → ambil lewat proxy GAS getPhotoBase64.       ──
    // Dipanggil dari onerror di setiap <img> yang menampilkan foto Drive.
    const _fotoProxyCache = {};
    function _fotoTryProxy(imgEl, originalUrl) {
      if (!imgEl) return;
      if (imgEl.dataset.triedProxy === '1') { imgEl.style.opacity = '.35'; return; }
      imgEl.dataset.triedProxy = '1';
      const src = originalUrl || imgEl.src || '';
      const m1 = src.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const m2 = src.match(/\/d\/([a-zA-Z0-9_-]+)/);
      const fileId = (m1 && m1[1]) || (m2 && m2[1]);
      if (!fileId || !state.scriptUrl) { imgEl.style.opacity = '.35'; return; }
      if (_fotoProxyCache[fileId]) { imgEl.src = _fotoProxyCache[fileId]; return; }
      fetch(state.scriptUrl + '?action=getPhotoBase64&fileId=' + encodeURIComponent(fileId))
        .then(function(r) { return r.json(); })
        .then(function(j) {
          if (j && j.ok && j.data) {
            _fotoProxyCache[fileId] = j.data;
            imgEl.src = j.data;
          } else {
            imgEl.style.opacity = '.35';
          }
        })
        .catch(function() { imgEl.style.opacity = '.35'; });
    }

    // ── Lightbox viewer untuk foto ──
    function lihatFoto(url, label) {
      url = String(url == null ? '' : url);
      const embedUrl = getDriveEmbedUrl(url);
      let overlay = document.getElementById('fotoLightboxOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'fotoLightboxOverlay';
        overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
        overlay.innerHTML = '<img id="fotoLightboxImg" style="max-width:92vw;max-height:82vh;object-fit:contain;border-radius:10px;border:2px solid rgba(255,255,255,.2);">' +
          '<div id="fotoLightboxLabel" style="color:rgba(255,255,255,.8);font-size:.85rem;text-align:center;"></div>' +
          '<div style="display:flex;gap:12px;">' +
          '<a id="fotoLightboxOpen" href="#" target="_blank" style="background:#1a6b4a;color:white;padding:7px 18px;border-radius:8px;font-size:.82rem;text-decoration:none;">🔗 Buka di Tab Baru</a>' +
          '<button onclick="document.getElementById(\'fotoLightboxOverlay\').style.display=\'none\'" style="background:rgba(255,255,255,.15);color:white;border:1px solid rgba(255,255,255,.3);padding:7px 18px;border-radius:8px;cursor:pointer;font-size:.82rem;">✕ Tutup</button>' +
          '</div>';
        overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.style.display='none'; });
        document.body.appendChild(overlay);
      }
      const img = document.getElementById('fotoLightboxImg');
      const lbl = document.getElementById('fotoLightboxLabel');
      const aOpen = document.getElementById('fotoLightboxOpen');
      img.dataset.triedProxy = '0';
      img.onerror = function() { _fotoTryProxy(img, url); };
      img.src = embedUrl;
      img.alt = label || 'Foto';
      if (lbl) lbl.textContent = label || '';
      // Hanya alamat aman yang boleh dibuka (cegah tautan javascript:)
      if (aOpen) { aOpen.href = /^(https?:\/\/|blob:|data:image\/)/i.test(url) ? url : '#'; }
      overlay.style.display = 'flex';
    }

    function renderFotoMinggu() {
      const preview = document.getElementById('fotoMingguPreview');
      if (!preview) return;
      const semuaBulan = document.getElementById('rekapFotoSemuaBulan')?.checked;
      const bulan = semuaBulan ? 0 : parseInt(
        (document.getElementById('rekapFotoBulan') || document.getElementById('fotoFilterBulan') || {}).value || new Date().getMonth() + 1
      );
      const tahun = parseInt(
        (document.getElementById('rekapFotoTahun') || document.getElementById('fotoFilterTahun') || {}).value || new Date().getFullYear()
      );
      const list = semuaBulan
        ? (state.fotoMinggu || []).filter(f => Number(f.tahun) === tahun)
        : (state.fotoMinggu || []).filter(f => Number(f.bulan) === bulan && Number(f.tahun) === tahun);
      if (!list.length) {
        preview.innerHTML = '<div style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:1rem;">Belum ada foto dokumentasi untuk periode ini</div>';
        return;
      }
      preview.innerHTML = '';
      // Group by tglPeriksa
      const groups = {};
      list.sort((a,b) => String(a.tglPeriksa||'').localeCompare(String(b.tglPeriksa||''))).forEach(f => {
        const key = f.tglPeriksa || (f.bulan + '/' + f.tahun);
        if (!groups[key]) groups[key] = [];
        groups[key].push(f);
      });
      Object.entries(groups).forEach(([tglKey, fotos]) => {
        const tglLabel = fotos[0].tglPeriksa
          ? new Date(fotos[0].tglPeriksa).toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric'})
          : (fotos[0].label || tglKey);
        const groupDiv = document.createElement('div');
        groupDiv.style.cssText = 'border:1.5px solid #a9dfbf;border-radius:10px;overflow:hidden;padding:.5rem;margin-bottom:.5rem;';
        groupDiv.innerHTML = '<div style="font-weight:700;font-size:.8rem;color:#1a6b4a;margin-bottom:.4rem;padding:.2rem .4rem;background:#e8f5ef;border-radius:6px;">📅 ' + escHtml(tglLabel) + '</div>';
        const grid = document.createElement('div');
        grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:.5rem;';
        fotos.forEach(f => {
          const embedUrl = getDriveEmbedUrl(f.url);
          const w = document.createElement('div');
          w.style.cssText = 'position:relative;background:#fff;border:1.5px solid #a9dfbf;border-radius:8px;overflow:hidden;';
          // Foto thumbnail
          const img = document.createElement('img');
          img.src = embedUrl; img.alt = f.label||'Foto';
          img.style.cssText = 'height:110px;width:140px;object-fit:cover;display:block;cursor:pointer;';
          img.title = 'Klik untuk lihat penuh';
          img.onerror = function(){ _fotoTryProxy(img, f.url); };
          img.onclick = () => lihatFoto(f.url, f.label || ('Foto ' + (f.slot||'')));
          w.appendChild(img);
          // Label
          const lbl = document.createElement('div');
          lbl.style.cssText = 'font-size:.65rem;color:var(--text-muted);text-align:center;padding:2px 4px;background:#f8fffe;';
          lbl.textContent = 'Foto ' + (f.slot||'');
          w.appendChild(lbl);
          // Tombol aksi
          const acts = document.createElement('div');
          acts.style.cssText = 'display:flex;gap:2px;padding:3px;background:#f0faf5;justify-content:center;';
          // Lihat
          const bLihat = document.createElement('button');
          bLihat.textContent = '👁'; bLihat.title = 'Lihat Foto';
          bLihat.style.cssText = 'border:none;background:#1565c0;color:white;border-radius:5px;padding:3px 7px;cursor:pointer;font-size:.72rem;';
          bLihat.onclick = () => lihatFoto(f.url, f.label || ('Foto ' + (f.slot||'')));
          // Hapus
          const bHapus = document.createElement('button');
          bHapus.textContent = '🗑'; bHapus.title = 'Hapus Foto';
          bHapus.style.cssText = 'border:none;background:#c0392b;color:white;border-radius:5px;padding:3px 7px;cursor:pointer;font-size:.72rem;';
          bHapus.onclick = () => { hapusFotoMinggu(f.id); renderFotoMinggu(); };
          acts.appendChild(bLihat); acts.appendChild(bHapus);
          w.appendChild(acts);
          grid.appendChild(w);
        });
        groupDiv.appendChild(grid);
        preview.appendChild(groupDiv);
      });
    }
