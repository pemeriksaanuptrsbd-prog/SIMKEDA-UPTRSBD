    // ══════════════════════════════════════
    //  PEMERIKSAAN
    // ══════════════════════════════════════
    function updateSelectPM() {
      const sel = document.getElementById('pilihanPM');
      if (!sel) return;
      const curr = sel.value;
      sel.innerHTML = '<option value="">-- Pilih PM --</option>';
      const sorted = [...state.penerima].sort((a, b) => (a.namaPM||'').localeCompare((b.namaPM||''), 'id'));
      sorted.forEach(pm => {
        const opt = document.createElement('option');
        opt.value = pm.nomorInduk;
        opt.textContent = (pm.namaPM||'-') + ' · ' + pm.nomorInduk;
        sel.appendChild(opt);
      });
      if (curr) sel.value = curr;
      pmAcUpdateDisplay('pilihanPM');
    }

    function onPilihPM() {
      const id = document.getElementById('pilihanPM').value;
      const info = document.getElementById('infoPM');
      if (!id) { if (info) info.style.display = 'none'; return; }
      const pm = state.penerima.find(p => p.nomorInduk === id);
      if (!pm) { if (info) info.style.display = 'none'; return; }
      const last = getLastPeriksa(id);
      const asramaLabel = pm.kamarBlok ? (pm.kamarBlok.startsWith('ASTRI') ? '🚺 ' : '🚹 ') + pm.kamarBlok : '-';
      document.getElementById('infoPMContent').innerHTML =
        '<div>' +
        '<strong>' + escHtml(pm.namaPM) + '</strong> · ' + escHtml(pm.jenisDis) + ' · ' + escHtml(asramaLabel) + ' · Alamat: ' + escHtml(pm.alamat || '-') +
        (pm.kondisiKronis && pm.kondisiKronis !== '-' ? ' · <span style="color:var(--danger)">⚠️ Kronis: ' + escHtml(pm.kondisiKronis) + '</span>' : '') +
        (pm.alergi ? ' · <span style="color:var(--danger)">🚫 Alergi: ' + escHtml(pm.alergi) + '</span>' : '') +
        ' &nbsp;|&nbsp; Periksa terakhir: <strong>' + (last ? escHtml(new Date(last.tglPeriksa).toLocaleDateString('id-ID')) : 'Belum pernah') + '</strong>' +
        '</div>' +
        '<div style="margin-top:8px;">' +
        '<button type="button" onclick="tampilkanRekamMedis(\'' + jsArg(id) + '\')" ' +
        'style="background:#2980b9;color:#fff;border:none;padding:7px 16px;border-radius:8px;font-weight:700;font-size:.85rem;cursor:pointer;box-shadow:0 2px 5px rgba(41,128,185,.35);">' +
        '🕒 Lihat Rekam Medis</button>' +
        '</div>';
      if (info) info.style.display = 'block';
      // auto-fill dokter
      const dokField = document.getElementById('namaDokter');
      if (dokField && !dokField.value && state.defaultDokter) dokField.value = state.defaultDokter;
      // riwayat sebelumnya
      renderRiwayatSebelumnya(id);
      // pengukuran awal dari petugas
      tampilHasilPengukuranAwal(id);
    }

    function renderRiwayatSebelumnya(ni) {
      const box = document.getElementById('riwayatSebelumnyaBox');
      if (!box) return;
      const list = state.pemeriksaan
        .filter(p => p.nomorInduk === ni && !p._deleted)
        .sort((a, b) => new Date(b.tglPeriksa) - new Date(a.tglPeriksa))
        .slice(0, 3);
      if (!list.length) { box.style.display = 'none'; return; }
      box.style.display = '';
      box.innerHTML = '<div style="background:var(--primary-pale);border-radius:10px;padding:1rem;"><div style="font-size:.82rem;font-weight:600;color:var(--primary);margin-bottom:.6rem;">📋 Riwayat Pemeriksaan Terakhir:</div>' +
        list.map(p => '<div style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;">' +
          '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">' +
          '<span style="color:var(--text-muted);min-width:90px">' + escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')) + '</span>' +
          '<span>Mg-' + escHtml(p.mingguKe) + '</span>' +
          (p.tekananDarah ? '<span>TD: ' + escHtml(p.tekananDarah) + '</span>' : '') +
          (p.suhuTubuh ? '<span>' + escHtml(String(p.suhuTubuh)) + '°C</span>' : '') +
          '<span class="badge ' + (p.statusKondisi === 'Baik' ? 'badge-green' : p.statusKondisi === 'Rujuk' ? 'badge-red' : 'badge-yellow') + '">' + escHtml(p.statusKondisi) + '</span>' +
          '</div>' +
          (p.anamnesa ? '<div style="margin-top:3px;color:var(--text-muted);font-size:.78rem;"><span style="font-weight:600;color:var(--primary-dark)">Anamnesa:</span> ' + escHtml(p.anamnesa) + '</div>' : '') +
          (p.diagnosis ? '<div style="margin-top:2px;color:var(--text-muted);font-size:.78rem;"><span style="font-weight:600;color:var(--primary-dark)">Diagnosis:</span> ' + escHtml(p.diagnosis) + '</div>' : '') +
          '</div>'
        ).join('') + '</div>';
    }

    // Cek vital otomatis
    function cekTD() {
      const td = document.getElementById('tekananDarah').value;
      const parts = td.split('/');
      if (parts.length === 2) {
        const s = parseInt(parts[0]), d = parseInt(parts[1]);
        let warn = [];
        if (s >= 140 || d >= 90) warn.push('⚠️ Tekanan darah tinggi (Hipertensi)');
        if (s < 90 || d < 60) warn.push('⚠️ Tekanan darah rendah (Hipotensi)');
        updateVitalAlert(warn);
      }
    }
    function cekSuhu() {
      const s = parseFloat((document.getElementById('suhuAwal') || {}).value || '0');
      let warn = [];
      if (s >= 38) warn.push('🌡️ Suhu tinggi — kemungkinan demam');
      if (s < 36) warn.push('🌡️ Suhu rendah — kemungkinan hipotermia');
      updateVitalAlert(warn);
    }
    function cekSpo2() {
      const v = parseFloat((document.getElementById('spo2Awal') || {}).value || '0');
      let warn = [];
      if (v < 95) warn.push('💨 SpO2 rendah — perlu pemantauan pernapasan');
      updateVitalAlert(warn);
    }
    function updateVitalAlert(warns) {
      const el = document.getElementById('vitalAlert');
      if (warns.length > 0) {
        el.className = 'alert alert-warning show';
        el.textContent = warns.join(' | ');
      } else {
        el.classList.remove('show');
      }
    }

    // ── Buat draft Rujukan otomatis dari Pemeriksaan/Insidental saat "Perlu Rujukan" dicentang ──
    function buatDraftRujukanOtomatis(opts) {
      if (!state.rujukan) state.rujukan = [];
      const pm = state.penerima.find(p => p.nomorInduk === opts.nomorInduk);
      const entry = {
        id: 'ruj-auto-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        nomorInduk: opts.nomorInduk,
        namaPM: pm ? pm.namaPM : opts.nomorInduk,
        kamarBlok: pm ? pm.kamarBlok : '',
        tgl: opts.tgl,
        jenis: '',
        tujuan: opts.tujuan || '',
        diagnosis: opts.diagnosis || '',
        alasan: '',
        asal: opts.asal,
        statusRujukan: 'Aktif',
        hasil: '',
        foto1: '', foto2: '', foto3: '',
        tindakLanjut: '',
        petugas: opts.petugas || '',
        idPemeriksaan: opts.idPemeriksaan || '',
        idInsidental: opts.idInsidental || '',
        dibuatOtomatis: true,
        waktuInput: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.rujukan.push(entry);
      saveState(); triggerSyncAfterSave();
      if (typeof renderRujukan === 'function') renderRujukan();
      showToast('🏥 Draft Rujukan otomatis dibuat untuk ' + entry.namaPM + ' — lengkapi di menu Rujukan.', 'success');
    }

    // Draf rujukan otomatis yang BELUM pernah diisi ikut dihapus bila pemeriksaan/insidental asalnya
    // dihapus (dulu tertinggal sebagai rujukan "Aktif" yatim dan memicu pengingat ≥7 hari).
    // Draf yang sudah dilengkapi (tujuan/hasil/foto/status) tidak disentuh.
    function _hapusDrafRujukanOtomatis(kolom, idAsal) {
      if (!idAsal || !Array.isArray(state.rujukan)) return;
      const kosong = v => !v || !String(v).trim();
      state.rujukan.forEach((r, i) => {
        if (!r || r._deleted || !r.dibuatOtomatis || String(r[kolom] || '') !== String(idAsal)) return;
        if (!(kosong(r.jenis) && kosong(r.hasil) && kosong(r.foto1) && kosong(r.foto2) && kosong(r.tindakLanjut) && kosong(r.alasan)
            && (r.statusRujukan || 'Aktif') === 'Aktif')) return;
        state.rujukan[i] = { ...r, _deleted: true, updatedAt: new Date().toISOString() };
        if (state.scriptUrl) kirimKeSheets('deleteRujukan', { id: r.id });
      });
      try { renderRujukan(); renderRekapRujukan(); } catch (e) {}
    }

    // ── Koreksi stok saat EDIT pemeriksaan/insidental — supaya stok tidak dobel dikurangi
    // atau tidak dikembalikan saat daftar obat pada form diubah ──
    function terapkanKoreksiStokEdit(obatLama, obatBaru) {
      if (!state.stokObat) state.stokObat = [];
      const diffMap = {};
      (obatLama || []).forEach(o => {
        const key = (o.nama || '').trim().toLowerCase();
        if (!key) return;
        if (!diffMap[key]) diffMap[key] = { jumlah: 0, nama: o.nama };
        diffMap[key].jumlah -= (parseFloat(o.jumlah) || 0); // kembalikan stok lama
      });
      (obatBaru || []).forEach(o => {
        const key = (o.nama || '').trim().toLowerCase();
        if (!key) return;
        if (!diffMap[key]) diffMap[key] = { jumlah: 0, nama: o.nama };
        diffMap[key].jumlah += (parseFloat(o.jumlah) || 0); // kurangi stok baru
      });
      let ada = false;
      const selisihStok = [];
      Object.values(diffMap).forEach(d => {
        if (!d.jumlah) return;
        const idx = state.stokObat.findIndex(s => String(s.nama || '').trim().toLowerCase() === String(d.nama).trim().toLowerCase());
        if (idx !== -1) {
          ada = true;
          state.stokObat[idx].stok = Math.max(0, (Number(state.stokObat[idx].stok) || 0) - d.jumlah);
          state.stokObat[idx].updatedAt = new Date().toISOString();
          selisihStok.push({ nama: state.stokObat[idx].nama, selisih: -d.jumlah });
        }
      });
      if (!ada) return;
      saveState();
      updateStokStats(); renderStokObat(); renderRekapObat(); renderLogMutasi();
      _kirimSelisihStok(selisihStok);
    }

    // ── Cek bentrok alergi PM vs daftar obat yang mau diberikan ──
    // Mengembalikan array nama obat yang bentrok dengan catatan alergi PM (pencocokan substring, case-insensitive).
    function cekBentrokAlergi(nomorInduk, obatList) {
      const pm = state.penerima.find(p => p.nomorInduk === nomorInduk);
      if (!pm || !pm.alergi || !obatList || !obatList.length) return [];
      const tokenAlergi = pm.alergi.split(/[,;/]| dan | atau /i).map(s => s.trim().toLowerCase()).filter(Boolean);
      if (!tokenAlergi.length) return [];
      const bentrok = [];
      obatList.forEach(o => {
        const namaObat = (o.nama || '').toLowerCase();
        if (!namaObat) return;
        const cocok = tokenAlergi.find(t => t.length >= 3 && (namaObat.includes(t) || t.includes(namaObat)));
        if (cocok) bentrok.push({ obat: o.nama, alergi: cocok });
      });
      return bentrok;
    }

    // Dipanggil sebelum simpan pemeriksaan/insidental. Return true = boleh lanjut, false = batal simpan.
    function konfirmasiBentrokAlergiSebelumSimpan(nomorInduk, obatList) {
      const bentrok = cekBentrokAlergi(nomorInduk, obatList);
      if (!bentrok.length) return true;
      const daftar = bentrok.map(b => '• ' + b.obat + ' (bentrok dengan catatan alergi: "' + b.alergi + '")').join('\n');
      return confirm('⚠️ PERINGATAN ALERGI!\n\nPM ini punya catatan alergi yang tampaknya bentrok dengan obat berikut:\n\n' + daftar
        + '\n\nAPAKAH ANDA YAKIN tetap ingin memberikan obat ini? Klik OK hanya jika sudah dipastikan aman (misalnya nama mirip tapi zat aktif berbeda), atau Batal untuk mengoreksi dulu.');
    }

    // Pengukuran awal (petugas) yang dipakai untuk pemeriksaan pada tanggal tgl:
    // tanggal sama (input terakhir), atau yang terbaru dalam 7 hari SEBELUM tgl. Selain itu: null.
    function pilihPengukuranUntukPeriksa(ni, tgl) {
      if (!ni || !tgl) return null;
      const t = String(tgl).slice(0, 10);
      const semua = (state.pengukuranAwal || []).filter(x => x && !x._deleted && x.nomorInduk === ni && x.tglPengukuran);
      const tglIni = semua.filter(x => String(x.tglPengukuran).slice(0, 10) === t)
        .sort((a, b) => new Date(b.waktuInput || 0) - new Date(a.waktuInput || 0));
      if (tglIni.length) return tglIni[0];
      const d0 = new Date(t + 'T00:00:00'); if (isNaN(d0.getTime())) return null;
      const batas = isoLokal(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - 7));
      return semua.filter(x => { const u = String(x.tglPengukuran).slice(0, 10); return u < t && u >= batas; })
        .sort((a, b) => String(b.tglPengukuran).localeCompare(String(a.tglPengukuran)) || (new Date(b.waktuInput || 0) - new Date(a.waktuInput || 0)))[0] || null;
    }

    async function simpanPemeriksaan() {
      // Ambil editId lebih awal untuk fallback pmId saat edit
      const _formPeriksa = document.getElementById('formPemeriksaan');
      const _editIdPeriksa = (_formPeriksa && _formPeriksa.dataset.editId) ? _formPeriksa.dataset.editId : (state._editPeriksaId || _g_editPeriksaId || null);
      let pmId = document.getElementById('pilihanPM').value;
      if (!pmId && _editIdPeriksa) {
        const _ex = state.pemeriksaan.find(x => String(x.id) === String(_editIdPeriksa));
        if (_ex) pmId = _ex.nomorInduk;
      }
      if (!pmId) { showAlert('alertPemeriksaan', 'error', '❌ Pilih Penerima Manfaat!'); showToast('Pilih Penerima Manfaat terlebih dahulu!', 'error'); return; }
      const pm = state.penerima.find(p => p.nomorInduk === pmId);
      const tgl = document.getElementById('tglPeriksa').value;
      const _dokterVal = document.getElementById('namaDokter').value.trim();
      if (!_dokterVal) { showAlert('alertPemeriksaan', 'error', '❌ Nama Dokter wajib diisi!'); showToast('Nama Dokter wajib diisi!', 'error'); return; }
      const _nowVA = new Date(); const _todayVA = _nowVA.getFullYear() + '-' + String(_nowVA.getMonth() + 1).padStart(2, '0') + '-' + String(_nowVA.getDate()).padStart(2, '0'); const today = tgl || _todayVA;

      // Ambil data pengukuran awal dari petugas: tanggal yang sama, atau paling lama 7 hari sebelumnya.
      // (Dulu bila tidak ada, diambil pengukuran TERBARU kapan pun — suhu/BB berbulan-bulan lalu
      //  ikut tercatat sebagai vital pemeriksaan hari ini.)
      const pengAwal = pilihPengukuranUntukPeriksa(pmId, tgl || today);

      const data = {
        id: Date.now().toString(),
        nomorInduk: pmId,
        namaPM: pm ? pm.namaPM : '-',
        tglPeriksa: tgl,
        mingguKe: document.getElementById('mingguke').value,
        namaDokter: document.getElementById('namaDokter').value,
        tekananDarah: document.getElementById('tekananDarah').value,
        nadi: document.getElementById('nadi').value,
        pernapasan: document.getElementById('pernapasan').value,
        keluhan: document.getElementById('keluhan').value,
        diagnosis: document.getElementById('diagnosis').value,
        statusKondisi: document.getElementById('statusKondisi').value,
        tindakan: document.getElementById('tindakan').value,
        resep: (document.getElementById('resep') || {}).value || '',
        rencana: document.getElementById('rencana').value,
        obatDiberikan: ambilObatDariForm('pemeriksaan'),
        // Vital dari pengukuran awal petugas (diambil otomatis)
        suhuTubuh: pengAwal ? pengAwal.suhu : '',
        beratBadan: pengAwal ? pengAwal.beratBadan : '',
        tinggiBadan: pengAwal ? pengAwal.tinggiBadan : '',
        spo2: pengAwal ? pengAwal.spo2 : '',
        // TTD dokter
        ttdDokter: (() => {
          const c = document.getElementById('ttdCanvas');
          if (!c) return state.ttdDokterBase64 || '';
          // Cek apakah canvas ada gambarnya (bukan kosong)
          const ctx = c.getContext('2d');
          const d = ctx.getImageData(0, 0, c.width, c.height).data;
          const hasDrawing = d.some((v, i) => i % 4 !== 3 && v !== 255) || d.some((v, i) => i % 4 === 3 && v !== 0 && v !== 255);
          if (!hasDrawing) return state.ttdDokterBase64 || ''; // pakai TTD default jika canvas kosong
          // Auto-simpan sebagai default dan sync ke semua device
          const ttdData = c.toDataURL();
          if (ttdData !== state.ttdDokterBase64) {
            state.ttdDokterBase64 = ttdData;
            saveState();
            // Sync TTD default ke Google Sheets → tersebar ke semua perangkat
            if (state.scriptUrl) {
              setTimeout(() => {
                kirimKeSheets('saveGlobalProfile', {
                  namaPetugas: state.namaPetugas || '',
                  defaultDokter: state.defaultDokter || '',
                  namaKasi: state.namaKasi || '',
                  ttdDokterBase64: state.ttdDokterBase64
                }).then(ok => { if (ok) showToast('☁️ TTD Dokter tersinkron ke semua perangkat!', 'success'); });
              }, 800);
            }
          }
          return ttdData;
        })(),
        perluRujukan: (document.getElementById('perluRujukanDokter') || {}).value || 'tidak',
        tujuanRujukan: (document.getElementById('tujuanRujukanDokter') || {}).value || '',
        waktuInput: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Validasi nilai medis & tanggal (mustahil → blokir; janggal → minta konfirmasi)
      if (!_cekVitalSebelumSimpan({ tgl: data.tglPeriksa, td: data.tekananDarah, nadi: data.nadi, napas: data.pernapasan,
          suhu: data.suhuTubuh, bb: data.beratBadan, tb: data.tinggiBadan, spo2: data.spo2 }, 'alertPemeriksaan')) return;

      // Blokir simpan kalau obat yang diberikan bentrok dengan catatan alergi PM (kecuali dikonfirmasi eksplisit)
      if (!konfirmasiBentrokAlergiSebelumSimpan(pmId, data.obatDiberikan)) {
        showAlert('alertPemeriksaan', 'error', '❌ Simpan dibatalkan karena ada bentrok alergi yang belum dikonfirmasi.');
        return;
      }

      setLoading('btnSimpanPeriksa', 'spinPeriksa', true);
      let ok = false;
      const form = document.getElementById('formPemeriksaan');
      const editId = (form && form.dataset.editId) ? form.dataset.editId : (state._editPeriksaId || _g_editPeriksaId || null);
      // Tandai pengukuran awal sudah diperiksa dokter (hanya pemeriksaan baru)
      if (pengAwal && !editId) { pengAwal.statusDokter = 'sudah'; pengAwal.updatedAt = new Date().toISOString(); }
      if (editId) {
        // MODE EDIT
        const idx = state.pemeriksaan.findIndex(x => String(x.id).trim() === String(editId).trim());
        if (idx !== -1) {
          const _old = state.pemeriksaan[idx];
          terapkanKoreksiStokEdit(_old.obatDiberikan, data.obatDiberikan);
          // Nilai vital lama dipertahankan; hanya diganti bila ada pengukuran PADA TANGGAL yang sama
          // (dulu mengedit pemeriksaan lama menimpa vitalnya dengan pengukuran terbaru minggu ini).
          const _tepat = pengAwal && pengAwal.tglPengukuran === data.tglPeriksa;
          const _v = (k) => (_tepat && data[k]) || _old[k] || '';
          state.pemeriksaan[idx] = { ..._old, ...data, id: editId, waktuInput: _old.waktuInput || data.waktuInput,
            suhuTubuh: _v('suhuTubuh'), beratBadan: _v('beratBadan'), tinggiBadan: _v('tinggiBadan'), spo2: _v('spo2') };
          // Catatan pemakaian obat mengikuti daftar obat yang baru
          _gantiLogObatSumber('pemeriksaan', _old, state.pemeriksaan[idx]);
          // "Perlu Rujukan" baru dicentang saat edit → buat draf rujukan (dulu hanya saat simpan baru)
          const _rb = state.pemeriksaan[idx];
          if (_rb.perluRujukan === 'ya' && _old.perluRujukan !== 'ya' &&
              !(state.rujukan || []).some(r => r && !r._deleted && String(r.idPemeriksaan || '') === String(editId))) {
            buatDraftRujukanOtomatis({ nomorInduk: _rb.nomorInduk, tgl: _rb.tglPeriksa, tujuan: _rb.tujuanRujukan, diagnosis: _rb.diagnosis || '',
              asal: 'Pemeriksaan', petugas: _rb.namaDokter, idPemeriksaan: editId });
          }
        }
        else { setLoading('btnSimpanPeriksa', 'spinPeriksa', false); showAlert('alertPemeriksaan', 'error', '❌ Gagal memperbarui: data pemeriksaan tidak ditemukan. Coba ulangi dari tombol Edit di tabel.'); return; }
        if (form) delete form.dataset.editId;
        state._editPeriksaId = null; // clear backup
        _g_editPeriksaId = null; // clear global
        const btn = document.getElementById('btnSimpanPeriksa');
        if (btn) { btn.textContent = '💾 Simpan Pemeriksaan'; btn.style.background = ''; }
        const _bp = document.getElementById('btnBatalPemeriksaan'); if (_bp) _bp.style.display = 'none';
        // Kirim rekaman HASIL GABUNGAN (bukan isian form mentah) supaya nilai vital lama
        // yang tidak diisi ulang tidak terhapus di server
        if (state.scriptUrl) ok = await kirimKeSheets('editPemeriksaan', state.pemeriksaan[idx] || { ...data, id: editId });
      } else {
        // MODE TAMBAH BARU
        state.pemeriksaan.unshift(data);
        setStatusAntrian(pmId, 'selesai');
        // Catat pemakaian obat dan kurangi stok
        catatPemakaianObat(data.obatDiberikan, data.namaPM, 'pemeriksaan', data.namaDokter, data.tglPeriksa, data.id);
        if (state.scriptUrl) ok = await kirimKeSheets('addPemeriksaan', data);
        // "Perlu Rujukan" bukan cuma flag lagi — langsung buat draft di menu Rujukan
        if (data.perluRujukan === 'ya') {
          buatDraftRujukanOtomatis({
            nomorInduk: data.nomorInduk, tgl: data.tglPeriksa,
            tujuan: data.tujuanRujukan, diagnosis: data.diagnosis || '',
            asal: 'Pemeriksaan', petugas: data.namaDokter, idPemeriksaan: data.id
          });
        }
      }
      saveState();
      triggerSyncAfterSave();
      renderRiwayat(); renderDashboard(); updateAntrianPicker(); updateAntrianPickerPetugas(); renderDaftarSiapPeriksa();
      if (editId) {
        // Mode edit: set filter bulan ke bulan record yang diedit, lalu tampilkan
        const _editedRec = state.pemeriksaan.find(x => String(x.id) === String(editId));
        const _editInfo = _editedRec ? ' — ' + (_editedRec.namaPM || '') + ' (' + (_editedRec.tglPeriksa || '') + ')' : '';
        if (_editedRec && _editedRec.tglPeriksa) {
          const _ed = new Date(_editedRec.tglPeriksa);
          const _selBulan = document.getElementById('filterRiwayatBulan');
          const _selTahun = document.getElementById('filterRiwayatTahun');
          if (_selBulan) _selBulan.value = String(_ed.getMonth() + 1);
          if (_selTahun) _selTahun.value = String(_ed.getFullYear());
        }
        setLoading('btnSimpanPeriksa', 'spinPeriksa', false);
        showAlert('alertPemeriksaan', 'success', '✅ Data pemeriksaan berhasil diperbarui!' + _editInfo); showToast('✅ Pemeriksaan berhasil diperbarui!');
        // Kosongkan form: dulu isian tetap tertinggal sehingga klik Simpan lagi membuat pemeriksaan GANDA
        // (dan stok obat terpotong dua kali).
        try { resetFormPemeriksaan(); } catch (e) {}
        setTimeout(() => {
          renderRiwayat();
          const t = document.getElementById('riwayatBody'); if (t) t.closest('table')?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } else {
        setLoading('btnSimpanPeriksa', 'spinPeriksa', false);
        showAlert('alertPemeriksaan', ok ? 'success' : 'info', ok ? '✅ Pemeriksaan berhasil disimpan ke Google Sheets!' : '💾 Pemeriksaan berhasil disimpan lokal.');
        showToast('✅ Pemeriksaan berhasil disimpan!');
        setTimeout(() => { resetFormPemeriksaan(); }, 400);
      }
    }


    function renderRiwayat(filter) {
      const tbody = document.getElementById('riwayatBody');
      if (!tbody) return;
      const q = filter !== undefined ? filter : (document.getElementById('filterRiwayatSearch') || {}).value || '';
      const bulan = parseInt((document.getElementById('filterRiwayatBulan') || {}).value || '0');
      const tahun = parseInt((document.getElementById('filterRiwayatTahun') || {}).value || '0');
      const minggu = parseInt((document.getElementById('filterRiwayatMinggu') || {}).value || '0');
      let list = [...state.pemeriksaan].sort((a, b) => new Date(b.tglPeriksa) - new Date(a.tglPeriksa));
      if (q) list = list.filter(p => (p.namaPM || '').toLowerCase().includes(q.toLowerCase()));
      if (bulan) list = list.filter(p => p.tglPeriksa && new Date(p.tglPeriksa).getMonth() + 1 === bulan);
      if (tahun) list = list.filter(p => p.tglPeriksa && new Date(p.tglPeriksa).getFullYear() === tahun);
      if (minggu) list = list.filter(p => parseInt(p.mingguKe) === minggu);
      const _pgRiwayat = document.getElementById('riwayatPagination');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:var(--text-muted);padding:2rem">Belum ada riwayat.</td></tr>';
        if (_pgRiwayat) _pgRiwayat.innerHTML = '';
        return;
      }
      const canEdit = state.role === 'admin' || state.role === 'dokter';
      list = _fltTbl('riwayat', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppRiwayat = 100;
      const _totalPagesRiwayat = Math.max(1, Math.ceil(list.length / _ppRiwayat));
      if (_pageState.riwayat > _totalPagesRiwayat) _pageState.riwayat = _totalPagesRiwayat;
      const _startRiwayat = (_pageState.riwayat - 1) * _ppRiwayat;
      tbody.innerHTML = '';
      list.slice(_startRiwayat, _startRiwayat + _ppRiwayat).forEach((p, _idx) => {
        const idx = _startRiwayat + _idx;
        const bc = p.statusKondisi === 'Baik' ? 'badge-green' : p.statusKondisi === 'Rujuk' ? 'badge-red' : 'badge-yellow';
        const rujBadge = p.perluRujukan === 'ya'
          ? '<span class="badge badge-red" style="font-size:.7rem;">🏥 Ya</span>'
          : '<span style="font-size:.75rem;color:var(--text-muted)">-</span>';
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">' + (escHtml(idx + 1)) + '</td>' +
          '<td style="font-size:.82rem">' + (p.tglPeriksa ? escHtml(new Date(p.tglPeriksa).toLocaleDateString('id-ID')) : '-') + '</td>' +
          '<td style="font-weight:500">' + escHtml(p.namaPM || '-') + '</td>' +
          '<td style="font-size:.8rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escHtml(p.diagnosis || '') + '">' + escHtml(p.diagnosis || '-') + '</td>' +
          '<td><code style="font-size:.8rem">' + escHtml(p.tekananDarah || '-') + '</code></td>' +
          '<td style="font-size:.8rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escHtml(p.tindakan || '') + '">' + escHtml(p.tindakan || '-') + '</td>' +
          '<td style="font-size:.8rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escHtml(p.rencana || '') + '">' + escHtml(p.rencana || '-') + '</td>' +
          '<td style="font-size:.78rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + ((p.obatDiberikan&&p.obatDiberikan.length)?p.obatDiberikan.map(o=>escHtml((o.nama||'')+(o.jumlah?' '+o.jumlah:'')+' '+(escHtml(o.satuan||'')))).join(', '):'-') + '</td>' +
          '<td><span class="badge ' + escHtml(bc) + '">' + escHtml(p.statusKondisi || '-') + '</span></td>' +
          '<td>' + rujBadge + '</td>' +
          '<td class="text-muted" style="font-size:.8rem">' + escHtml(p.namaDokter || '-') + '</td>' +
          '<td style="display:flex;gap:4px;flex-wrap:nowrap;"></td>';
        const aksiCell = tr.lastElementChild;
        // Lihat Detail
        const btnLihat = document.createElement('button');
        btnLihat.className = 'btn btn-info btn-sm'; btnLihat.textContent = '👁'; btnLihat.title = 'Lihat Detail';
        btnLihat.onclick = () => lihatDetailPemeriksaan(p.id);
        aksiCell.appendChild(btnLihat);
        // Cetak
        const btnCetak = document.createElement('button');
        btnCetak.className = 'btn btn-ghost btn-sm'; btnCetak.textContent = '🖨️'; btnCetak.title = 'Cetak Kartu Bulanan';
        btnCetak.onclick = () => lihatKartu(p.id);
        aksiCell.appendChild(btnCetak);
        // Cetak Mingguan
        const btnCetakMinggu = document.createElement('button');
        btnCetakMinggu.className = 'btn btn-ghost btn-sm'; btnCetakMinggu.textContent = '🗓️'; btnCetakMinggu.title = 'Cetak Laporan Kesehatan Mingguan';
        btnCetakMinggu.onclick = () => cetakKartuMingguanPM(p.id);
        aksiCell.appendChild(btnCetakMinggu);
        if (canEdit) {
          // Edit
          const btnEdit = document.createElement('button');
          btnEdit.className = 'btn btn-accent btn-sm'; btnEdit.textContent = '✏️'; btnEdit.title = 'Edit';
          btnEdit.onclick = () => editRiwayat(p.id);
          aksiCell.appendChild(btnEdit);
          // Hapus
          const btnHapus = document.createElement('button');
          btnHapus.className = 'btn btn-ghost btn-sm'; btnHapus.style.color = 'var(--danger)'; btnHapus.textContent = '🗑️';
          btnHapus.onclick = () => hapusRiwayat(p.id);
          aksiCell.appendChild(btnHapus);
        }
        tbody.appendChild(tr);
      });
      _renderPaginationControls('riwayatPagination', 'riwayat', list.length, _ppRiwayat, 'renderRiwayat');
    }

    async function hapusRiwayat(id) {
      if (state.role !== 'admin' && state.role !== 'dokter') { alert('⛔ Tidak memiliki akses.'); return; }
      const p = state.pemeriksaan.find(x => String(x.id) === String(id));
      const adaObat = p && Array.isArray(p.obatDiberikan) && p.obatDiberikan.length > 0;
      if (!p || !confirm('Hapus riwayat: ' + (p.namaPM || '') + ' — ' + p.tglPeriksa + '? Tidak bisa dibatalkan!' +
          (adaObat ? '\n\nObat yang tercatat diberikan pada pemeriksaan ini akan DIKEMBALIKAN ke stok.' : ''))) return;
      state.pemeriksaan = state.pemeriksaan.filter(x => String(x.id) !== String(id));
      if (adaObat) { terapkanKoreksiStokEdit(p.obatDiberikan, []); _hapusLogObatSumber('pemeriksaan', p, true); }
      _hapusDrafRujukanOtomatis('idPemeriksaan', p.id);
      saveState(); renderRiwayat(); renderDashboard();
      if (typeof renderRiwayatAdmin === 'function') renderRiwayatAdmin();
      if (state.scriptUrl) await kirimKeSheets('deletePemeriksaan', { id: p.id });
    }
    function editRiwayat(id) {
      const p = state.pemeriksaan.find(x => String(x.id) === String(id));
      if (!p) return;
      const form = document.getElementById('formPemeriksaan');
      if (form) form.dataset.editId = String(id);
      state._editPeriksaId = String(id); // backup di state
      _g_editPeriksaId = String(id); // backup global var
      showPage('pemeriksaan');
      setTimeout(() => {
        const set = (elId, val) => { const el = document.getElementById(elId); if (el && val !== undefined) isiNilaiForm(el, val || ''); };
        const selPMPeriksa = document.getElementById('pilihanPM');
        if (selPMPeriksa) {
          let opt = selPMPeriksa.querySelector('option[value="' + p.nomorInduk + '"]');
          if (!opt) {
            opt = document.createElement('option');
            const pmData = state.penerima.find(q => q.nomorInduk === p.nomorInduk);
            opt.value = p.nomorInduk; opt.textContent = pmData ? pmData.namaPM + ' · ' + p.nomorInduk : p.namaPM || p.nomorInduk;
            selPMPeriksa.appendChild(opt);
          }
          selPMPeriksa.value = p.nomorInduk;
        }
        set('tglPeriksa', p.tglPeriksa);
        set('mingguke', p.mingguKe);
        set('namaDokter', p.namaDokter);
        set('tekananDarah', p.tekananDarah);
        set('nadi', p.nadi);
        set('pernapasan', p.pernapasan);
        set('suhuTubuh', p.suhuTubuh);
        set('beratBadan', p.beratBadan);
        set('spo2', p.spo2);
        set('keluhan', p.keluhan);
        set('diagnosis', p.diagnosis);
        set('statusKondisi', p.statusKondisi);
        set('tindakan', p.tindakan);
        set('resep', p.resep);
        set('rencana', p.rencana);
        set('perluRujukanDokter', p.perluRujukan || 'tidak');
        set('tujuanRujukanDokter', p.tujuanRujukan || '');
        // ── Restore obat diberikan ──
        resetObatForm('pemeriksaan');
        if (p.obatDiberikan && p.obatDiberikan.length > 0) {
          p.obatDiberikan.forEach(function(ob) {
            tambahBarisObat('pemeriksaan');
            const cont = document.getElementById('obatPemeriksaanList');
            if (!cont) return;
            const row = cont.lastElementChild; if (!row) return;
            const namaEl   = row.querySelector('.obat-nama');
            const jmlEl    = row.querySelector('.obat-jml-val');
            const satEl    = row.querySelector('.obat-sat-val');
            const aturanEl = row.querySelector('.obat-aturan-val');
            if (namaEl)   namaEl.value   = ob.nama || '';
            if (jmlEl)    jmlEl.value    = ob.jumlah || '';
            if (satEl)    satEl.value    = ob.satuan || '';
            if (aturanEl) aturanEl.value = ob.aturanPakai || '';
          });
        }
        onPilihPM();
        const btn = document.getElementById('btnSimpanPeriksa');
        if (btn) { btn.textContent = '✏️ Perbarui Data Pemeriksaan'; btn.style.background = 'var(--accent)'; }
        const btnBatal = document.getElementById('btnBatalPemeriksaan');
        if (btnBatal) btnBatal.style.display = '';
        const formCheck = document.getElementById('formPemeriksaan');
        if (formCheck) { formCheck.dataset.editId = String(id); formCheck.scrollIntoView({ behavior: 'smooth' }); }
        state._editPeriksaId = String(id); // konfirmasi backup
        showAlert('alertPemeriksaan', 'info', '✏️ Mode Edit — ubah data lalu klik Perbarui. Nama PM tidak perlu dipilih ulang.');
      }, 100);
    }
    function batalEditPemeriksaan() {
      // Clear semua edit mode flags
      const form = document.getElementById('formPemeriksaan');
      if (form) delete form.dataset.editId;
      state._editPeriksaId = null;
      _g_editPeriksaId = null;
      // Reset UI
      const btn = document.getElementById('btnSimpanPeriksa');
      if (btn) { btn.textContent = '💾 Simpan Pemeriksaan'; btn.style.background = ''; }
      const btnBatal = document.getElementById('btnBatalPemeriksaan');
      if (btnBatal) btnBatal.style.display = 'none';
      // Reset form fields via resetFormPemeriksaan (sudah clear flags di atas)
      resetFormPemeriksaan();
      showAlert('alertPemeriksaan', 'info', 'Edit dibatalkan.');
    }


    function filterRiwayat(q) { renderRiwayat(q.toLowerCase()); }

    function resetFormPemeriksaan() {
      const now = new Date();
      // Clear edit mode (PENTING: harus di-clear sebelum reset form)
      const _formP = document.getElementById('formPemeriksaan');
      if (_formP) delete _formP.dataset.editId;
      state._editPeriksaId = null;
      _g_editPeriksaId = null;
      // Reset tombol & UI edit mode
      const _btnS = document.getElementById('btnSimpanPeriksa');
      if (_btnS) { _btnS.textContent = '💾 Simpan Pemeriksaan'; _btnS.style.background = ''; }
      const _btnB = document.getElementById('btnBatalPemeriksaan');
      if (_btnB) _btnB.style.display = 'none';
      // Reset form fields
      document.getElementById('pilihanPM').value = '';
      document.getElementById('infoPM').style.display = 'none';
      document.getElementById('tglPeriksa').value = isoLokal(now);
      document.getElementById('mingguke').value = getWeekOfMonth(now);
      ['tekananDarah', 'suhuTubuh', 'nadi', 'beratBadan', 'spo2', 'pernapasan', 'keluhan', 'diagnosis', 'tindakan', 'resep', 'rencana'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      document.getElementById('statusKondisi').value = 'Baik';
      document.getElementById('vitalAlert').classList.remove('show');
      const hasilBox = document.getElementById('hasilPengukuranBox');
      if (hasilBox) hasilBox.style.display = 'none';
      resetObatForm('pemeriksaan');
    }

    // ── CETAK KARTU (dari tombol di form pemeriksaan) ──
    // Helper: resolve ttdDokter value ke img src yang valid
    function resolveTTDSrc(ttdVal) {
      if (!ttdVal || typeof ttdVal !== 'string') return '';
      if (ttdVal.startsWith('data:')) return ttdVal;
      if (ttdVal === '[TTD_TERSIMPAN]') return state.ttdDokterBase64 || '';
      return '';
    }

    function cetakKartu() {
      const pmId = document.getElementById('pilihanPM').value;
      if (!pmId) { alert('Pilih PM terlebih dahulu.'); return; }
      const tglVal = document.getElementById('tglPeriksa').value;
      const now = tglVal ? new Date(tglVal) : new Date();
      cetakKartuBulananPM(pmId, now.getMonth() + 1, now.getFullYear());
    }

    // ── CETAK KARTU (1 kunjungan tunggal dari riwayat) ──
    function lihatKartu(id) {
      const p = state.pemeriksaan.find(x => String(x.id) === String(id));
      if (!p) return;
      // Ambil semua record bulan yang sama → tampilkan kartu bulanan
      const tgl = new Date(p.tglPeriksa);
      cetakKartuBulananPM(p.nomorInduk, tgl.getMonth() + 1, tgl.getFullYear());
    }

    // ── CETAK KARTU BULANAN PER PM ──
    function cetakKartuBulananPM(nomorInduk, bulan, tahun) {
      const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const pm = state.penerima.find(p => p.nomorInduk === nomorInduk);
      const records = state.pemeriksaan
        .filter(p => {
          const d = new Date(p.tglPeriksa);
          return p.nomorInduk === nomorInduk && d.getMonth() + 1 === bulan && d.getFullYear() === tahun;
        })
        .sort((a, b) => parseInt(a.mingguKe) - parseInt(b.mingguKe));

      document.getElementById('kartuCetak').innerHTML = renderKartuBulananHTML(pm, records, bulan, tahun, BULAN);
      document.getElementById('modalKartu').classList.add('show');
    }

    // ── Cetak kartu mingguan untuk TANGGAL TERTENTU, walau tidak ada pemeriksaan ──
    // Kalau memang ada record pemeriksaan di tanggal itu → dipakai apa adanya.
    // Kalau TIDAK ada → dibuatkan kartu "kosong" dengan status default Baik,
    // supaya tetap ada kartu mingguan untuk minggu tersebut.
    function cetakKartuMingguanTanggal(nomorInduk, tglStr) {
      const riwayat = (state.pemeriksaan || [])
        .filter(x => !x._deleted && x.nomorInduk === nomorInduk)
        .sort((a, b) => new Date(a.tglPeriksa) - new Date(b.tglPeriksa));

      // Cek dulu apakah sudah ada pemeriksaan PERSIS di tanggal ini
      const existing = riwayat.find(x => x.tglPeriksa && x.tglPeriksa.split('T')[0] === tglStr);
      if (existing) { cetakKartuMingguanPM(existing.id); return; }

      const pm = state.penerima.find(p => p.nomorInduk === nomorInduk);
      // Cari pemeriksaan sebelumnya yang paling dekat sebelum tanggal ini, untuk jadi "Minggu Lalu"
      const sebelumList = riwayat.filter(x => x.tglPeriksa && x.tglPeriksa.split('T')[0] < tglStr);
      const previous = sebelumList.length ? sebelumList[sebelumList.length - 1] : null;
      const sebelumnya2 = sebelumList.length > 1 ? sebelumList[sebelumList.length - 2] : null;

      // Kartu "kosong" — status default Baik, tidak ada keluhan/tindakan tercatat
      const current = {
        id: null,
        nomorInduk: nomorInduk,
        tglPeriksa: tglStr,
        mingguKe: getWeekOfMonth(new Date(tglStr)),
        statusKondisi: 'Baik',
        tekananDarah: '', beratBadan: '', nadi: '', spo2: '',
        diagnosis: 'Tidak ada pemeriksaan tercatat minggu ini — kondisi PM dianggap baik (tidak ada keluhan dilaporkan).',
        tindakan: '-', rencana: '-', namaDokter: state.defaultDokter || '', ttdDokter: '', obatDiberikan: []
      };

      // Batas "minggu ini": maksimal 7 hari ke belakang — walau pemeriksaan
      // sebelumnya sudah lama (mis. bulan lalu), jangan ikut tarik insidental/
      // rujukan yang sudah lewat dari 7 hari terakhir.
      const batas7Hari_a = new Date(tglStr); batas7Hari_a.setDate(batas7Hari_a.getDate() - 7);
      const batasAwal = (previous && new Date(previous.tglPeriksa) > batas7Hari_a) ? new Date(previous.tglPeriksa) : batas7Hari_a;
      const batasAkhir = new Date(tglStr);
      const insidentalMingguIni = (state.insidental || [])
        .filter(x => !x._deleted && x.nomorInduk === nomorInduk && x.tgl && new Date(x.tgl) > batasAwal && new Date(x.tgl) <= batasAkhir)
        .sort((a, b) => new Date(a.tgl) - new Date(b.tgl));
      const rujukanAktif = (state.rujukan || [])
        .filter(x => {
          if (x._deleted || x.nomorInduk !== nomorInduk || !x.tgl) return false;
          const dMulai = new Date(x.tgl);
          return dMulai > batasAwal && dMulai <= batasAkhir;
        })
        .sort((a, b) => new Date(b.tgl) - new Date(a.tgl));

      const labelObatList = hitungLabelStatusObatPair(current, previous);
      const flags = hitungFlagMingguan(current, previous, sebelumnya2, rujukanAktif);

      document.getElementById('kartuCetak').innerHTML =
        renderKartuMingguanHTML(pm, current, previous, insidentalMingguIni, rujukanAktif, labelObatList, flags);
      document.getElementById('modalKartu').classList.add('show');
    }

    function cetakKartuMingguanPM(pemeriksaanId) {
      const current = (state.pemeriksaan || []).find(x => String(x.id) === String(pemeriksaanId));
      if (!current) return;
      const pm = state.penerima.find(p => p.nomorInduk === current.nomorInduk);
      const riwayat = (state.pemeriksaan || [])
        .filter(x => !x._deleted && x.nomorInduk === current.nomorInduk)
        .sort((a, b) => new Date(a.tglPeriksa) - new Date(b.tglPeriksa));
      const idxSkrg = riwayat.findIndex(x => String(x.id) === String(pemeriksaanId));
      const previous = idxSkrg > 0 ? riwayat[idxSkrg - 1] : null;
      const sebelumnya2 = idxSkrg > 1 ? riwayat[idxSkrg - 2] : null;

      // ── Batas periode "minggu ini": maksimal 7 hari ke belakang, walau
      // pemeriksaan sebelumnya sudah lama (jangan ikut tarik data lama) ──
      const batas7Hari_b = new Date(current.tglPeriksa); batas7Hari_b.setDate(batas7Hari_b.getDate() - 7);
      const batasAwal = (previous && new Date(previous.tglPeriksa) > batas7Hari_b) ? new Date(previous.tglPeriksa) : batas7Hari_b;
      const batasAkhir = new Date(current.tglPeriksa);

      const insidentalMingguIni = (state.insidental || [])
        .filter(x => !x._deleted && x.nomorInduk === current.nomorInduk && x.tgl && new Date(x.tgl) > batasAwal && new Date(x.tgl) <= batasAkhir)
        .sort((a, b) => new Date(a.tgl) - new Date(b.tgl));

      const rujukanAktif = (state.rujukan || [])
        .filter(x => {
          if (x._deleted || x.nomorInduk !== current.nomorInduk || !x.tgl) return false;
          const dMulai = new Date(x.tgl);
          const dimulaiDiPeriode = dMulai > batasAwal && dMulai <= batasAkhir;
          const dSelesai = x.tglSelesai ? new Date(x.tglSelesai) : null;
          const selesaiDiPeriode = x.statusRujukan === 'Selesai' && dSelesai && dSelesai > batasAwal && dSelesai <= batasAkhir;
          return dimulaiDiPeriode || selesaiDiPeriode;
        })
        .sort((a, b) => new Date(b.tgl) - new Date(a.tgl));

      const labelObatList = hitungLabelStatusObatPair(current, previous);
      const flags = hitungFlagMingguan(current, previous, sebelumnya2, rujukanAktif);

      document.getElementById('kartuCetak').innerHTML =
        renderKartuMingguanHTML(pm, current, previous, insidentalMingguIni, rujukanAktif, labelObatList, flags);
      document.getElementById('modalKartu').classList.add('show');
    }

    // ── Helper: label status obat antara 2 record pemeriksaan tertentu (dipakai kartu mingguan) ──
    function hitungLabelStatusObatPair(skrg, lalu) {
      const obatSkrg = skrg && Array.isArray(skrg.obatDiberikan) ? skrg.obatDiberikan : [];
      const obatLalu = lalu && Array.isArray(lalu.obatDiberikan) ? lalu.obatDiberikan : [];
      const keyOf = o => (o.nama || '').trim().toLowerCase();
      const mapLalu = {}; obatLalu.forEach(o => { mapLalu[keyOf(o)] = o; });
      const mapSkrg = {}; obatSkrg.forEach(o => { mapSkrg[keyOf(o)] = o; });
      const hasil = [];
      obatSkrg.forEach(o => {
        const k = keyOf(o); const prev = mapLalu[k];
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

    // ── Helper: ambil angka sistolik dari string "130/85" ──
    function _sistolik(rec) {
      if (!rec || !rec.tekananDarah) return null;
      const n = parseInt(String(rec.tekananDarah).split('/')[0], 10);
      return isNaN(n) ? null : n;
    }
    function _diastolik(rec) {
      if (!rec || !rec.tekananDarah) return null;
      const n = parseInt(String(rec.tekananDarah).split('/')[1], 10);
      return isNaN(n) ? null : n;
    }

    // ── Helper: hitung flag peringatan otomatis untuk kartu mingguan ──
    function hitungFlagMingguan(current, previous, sebelumnya2, rujukanAktif) {
      const flags = [];
      if (current.statusKondisi === 'Perlu Perhatian' || current.statusKondisi === 'Kritis' || current.statusKondisi === 'Rujuk') {
        flags.push('Status kondisi PM: ' + current.statusKondisi + ' — perlu tindak lanjut.');
      }
      const sisSkrg = _sistolik(current), diaSkrg = _diastolik(current);
      if (sisSkrg !== null && (sisSkrg >= 140 || (diaSkrg !== null && diaSkrg >= 90))) {
        flags.push('Tekanan darah tinggi (' + current.tekananDarah + ') — indikasi hipertensi.');
      }
      const sisLalu = _sistolik(previous), sisLalu2 = _sistolik(sebelumnya2);
      if (sisSkrg !== null && sisLalu !== null && sisLalu2 !== null && sisSkrg > sisLalu && sisLalu > sisLalu2) {
        flags.push('Tekanan darah naik 2 kali pemeriksaan berturut-turut.');
      }
      const bbSkrg = parseFloat(current.beratBadan), bbLalu = previous ? parseFloat(previous.beratBadan) : NaN;
      if (!isNaN(bbSkrg) && !isNaN(bbLalu) && (bbLalu - bbSkrg) >= 2) {
        flags.push('Berat badan turun ' + (bbLalu - bbSkrg).toFixed(1) + ' kg dari pemeriksaan sebelumnya.');
      }
      rujukanAktif.forEach(r => {
        if (r.statusRujukan === 'Selesai') return; // sudah selesai, tidak perlu di-flag "belum ada hasil"
        const hari = hitungHariBerjalanRujukan(r.tgl);
        if (hari !== null && hari >= 7) flags.push('Rujukan ke ' + (r.tujuan || '-') + ' masih berjalan ' + hari + ' hari, belum ada hasil.');
      });
      return flags;
    }

    // ── Helper: info tren untuk satu indikator (dipakai kartu mingguan) ──
    function _trendInfo(curr, prev, tipe) {
      if (curr === null || curr === undefined || curr === '' || prev === null || prev === undefined || prev === '') {
        return { arrow: '–', color: '#6b7a8d' };
      }
      const c = parseFloat(curr), p = parseFloat(prev);
      if (isNaN(c) || isNaN(p) || c === p) return { arrow: '–', color: '#1a7341' };
      const naik = c > p;
      let color;
      if (tipe === 'bb') color = naik ? '#1a7341' : '#e67e22';
      else color = naik ? '#c0392b' : '#1a7341';
      return { arrow: naik ? '↑' : '↓', color };
    }

    // ── RENDER HTML KARTU MINGGUAN PER PM ──

    // ── Kop surat resmi (Pemprov Jatim / Dinas Sosial / UPT RSBD Pasuruan) ──
    // Dipakai di semua kartu/laporan cetak. Dibuat ringkas (kompak) supaya
    // kartu tetap muat 1 halaman penuh sampai baris tanda tangan.
    const LOGO_JATIM_B64 = 'data:image/png;base64,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';
    // Kop SAMA PERSIS dengan kop surat Word resmi (logo Jatim di kiri, 6 baris Arial 12 pt rata tengah,
    // garis tebal hitam di bawah). Satu-satunya sumber kop untuk SEMUA cetak PDF.
    // Penanda data-kop-surat dipakai _pdfWrap agar kop tidak pernah tercetak dua kali.
    function renderKopSuratHTML() {
      return `
      <div data-kop-surat="1" style="font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;margin:0 0 10px;page-break-inside:avoid;break-inside:avoid;">
        <div style="position:relative;min-height:88px;padding:2px 6px 0 92px;text-align:center;line-height:1.3;font-size:12pt;">
          <img src="${safeUrl(LOGO_JATIM_B64)}" style="position:absolute;left:6px;top:2px;height:80px;width:auto;" alt="Logo Jawa Timur">
          <div>PEMERINTAH PROVINSI JAWA TIMUR</div>
          <div>DINAS SOSIAL</div>
          <div style="font-weight:700;">UPT REHABILITASI SOSIAL BINA DAKSA PASURUAN</div>
          <div>Jalan RA. Kartini No. 292 Pasuruan, Jawa Timur 67153</div>
          <div><span style="color:#545454;">Telepon</span> (0343) 4741135, Laman http://dinsos.jatimprov.go.id,</div>
          <div><i>Pos-el</i> <span style="color:#0563c1;text-decoration:underline;">uptrsbdpasuruan@gmail.com</span></div>
        </div>
        <div style="height:0;border-bottom:3px solid #000;box-shadow:0 2px 2px rgba(0,0,0,.35);margin:6px 0 0;"></div>
      </div>`;
    }

    function renderKartuMingguanHTML(pm, current, previous, insidentalList, rujukanAktif, labelObatList, flags) {
      const namaPM = pm ? pm.namaPM : (current.namaPM || '-');
      const nomorInduk = pm ? pm.nomorInduk : (current.nomorInduk || '-');
      const asrama = pm ? (pm.kamarBlok || '-') : '-';
      const disabilitas = pm ? (pm.jenisDis || '-') : '-';
      const golDarah = pm ? (pm.golDarah || '-') : '-';
      const kronis = pm ? (pm.kondisiKronis || '') : '';
      const alergi = pm ? (pm.alergi || '') : '';
      const alamat = pm ? (pm.alamat || '-') : '-';
      const tglLahirFmt = pm && pm.tglLahir ? new Date(pm.tglLahir).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-';
      const umurPM = pm && pm.tglLahir ? hitungUsia(pm.tglLahir) : '-';
      const waktuCetak = new Date();
      const noCetak = 'LKM/' + (current.mingguKe || '-') + '/' + (nomorInduk || '-') + '/' + isoLokal(waktuCetak).replace(/-/g,'');
      const petugasCetakNama = state.petugasCetak || state.namaPetugas || '-';

      const statusColor = (s) => s === 'Baik' ? '#155724' : s === 'Cukup Baik' ? '#856404' : s === 'Perlu Perhatian' ? '#721c24' : '#7b0000';
      const statusBg = (s) => s === 'Baik' ? '#d4edda' : s === 'Cukup Baik' ? '#fff3cd' : s === 'Perlu Perhatian' ? '#fdecea' : '#f5c6cb';

      const sisSkrg = _sistolik(current), sisLalu = _sistolik(previous);
      const trTD = _trendInfo(sisSkrg, sisLalu, 'td');
      const trBB = _trendInfo(current.beratBadan, previous ? previous.beratBadan : null, 'bb');
      const trNadi = _trendInfo(current.nadi, previous ? previous.nadi : null, 'nadi');
      const trSpo2 = _trendInfo(current.spo2, previous ? previous.spo2 : null, 'spo2');

      const labelMingguLalu = previous && previous.tglPeriksa
        ? new Date(previous.tglPeriksa).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})
        : 'Belum ada data';

      const rowVital = (label, nilaiSkrg, nilaiLalu, tr) => `
        <tr style="border-top:1px solid #e0e0e0;">
          <td style="padding:6px 10px;font-weight:600;">${escHtml(label)}</td>
          <td style="padding:6px 10px;text-align:center;font-family:monospace">${escHtml(nilaiSkrg || '—')}</td>
          <td style="padding:6px 10px;text-align:center;font-family:monospace;color:#999">${escHtml(nilaiLalu || '—')}</td>
          <td style="padding:6px 10px;text-align:center;color:${escHtml(tr.color)};font-weight:700">${escHtml(tr.arrow)}</td>
        </tr>`;

      const tabelVital =
        rowVital('Tekanan Darah', current.tekananDarah, previous ? previous.tekananDarah : '', trTD) +
        rowVital('Berat Badan', current.beratBadan ? current.beratBadan + ' kg' : '', previous && previous.beratBadan ? previous.beratBadan + ' kg' : '', trBB) +
        rowVital('Nadi', current.nadi ? current.nadi + ' bpm' : '', previous && previous.nadi ? previous.nadi + ' bpm' : '', trNadi) +
        rowVital('SpO2', current.spo2 ? current.spo2 + '%' : '', previous && previous.spo2 ? previous.spo2 + '%' : '', trSpo2);

      const alergiHtml = alergi ? `<div style="padding:6px 18px;background:#fdecea;border-bottom:1.5px solid #ddd;font-size:10.5px;color:#c0392b;font-weight:700;">⚠️ Alergi: ${escHtml(alergi)}</div>` : '';

      const insidentalHtml = insidentalList.length ? `
        <div style="padding:10px 18px;border-top:1.5px solid #ddd;background:#fff8f0;">
          <div style="font-weight:700;color:#e67e22;font-size:11px;margin-bottom:5px;">🩹 Kejadian Insidental Minggu Ini</div>
          ${insidentalList.map(x => `<div style="font-size:10.5px;padding:3px 0;border-bottom:1px dashed #f0d9c0;">
            ${escHtml(new Date(x.tgl).toLocaleDateString('id-ID'))} — ${escHtml(x.keluhan || '-')}
            ${x.perluRujukan === 'ya' ? '<span style="color:#c0392b;font-weight:700;"> · dirujuk</span>' : ''}
            ${x.statusDokter === 'sudah' ? '<span style="color:#1a6b4a;font-weight:700;"> · ditindaklanjuti dokter</span>' : ''}
          </div>`).join('')}
        </div>` : '';

      const rujukanHtml = `
        <div style="padding:10px 18px;border-top:1.5px solid #ddd;font-size:10.5px;color:#555;">
          <strong>🔁 Tindak Lanjut Rujukan (periode minggu ini):</strong>
          ${rujukanAktif.length === 0 ? ' <em>Tidak ada rujukan yang dimulai/selesai pada periode ini</em>' :
            rujukanAktif.map(r => {
              if (r.statusRujukan === 'Selesai') {
                return `<div style="margin-top:3px;">Dirujuk ${escHtml(new Date(r.tgl).toLocaleDateString('id-ID'))} ke ${escHtml(r.tujuan || '-')} — <strong>✅ Selesai${r.tglSelesai ? escHtml(' (' + new Date(r.tglSelesai).toLocaleDateString('id-ID') + ')') : ''}</strong>${r.hasil ? escHtml(' · Hasil: ' + r.hasil) : ''}</div>`;
              }
              const hari = hitungHariBerjalanRujukan(r.tgl);
              return `<div style="margin-top:3px;">Dirujuk ${escHtml(new Date(r.tgl).toLocaleDateString('id-ID'))} ke ${escHtml(r.tujuan || '-')} — <strong>Menunggu hasil (${escHtml(hari)} hari)</strong></div>`;
            }).join('')}
        </div>`;

      const flagHtml = flags.length ? `
        <div style="padding:10px 18px;border-top:1.5px solid #ddd;background:#fdecea;color:#c0392b;font-size:10.5px;font-weight:700;">
          ${flags.map(f => `⚠️ ${f}`).join('<br>')}
        </div>` : '';

      return `
  <div style="font-family:Arial,sans-serif;font-size:11.5px;color:#222;max-width:640px;margin:0 auto;border:1.5px solid #ccc;border-radius:8px;overflow:hidden;">

    ${renderKopSuratHTML()}

    <div style="background:#1a6b4a;color:white;padding:7px 18px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:12.5px;font-weight:700;letter-spacing:.3px">LAPORAN KESEHATAN MINGGUAN</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:700;background:rgba(255,255,255,.15);padding:3px 10px;border-radius:6px">Minggu ${escHtml(current.mingguKe || '-')}</div>
        <div style="font-size:8px;opacity:.75;margin-top:2px">${current.tglPeriksa ? escHtml(new Date(current.tglPeriksa).toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'})) : '-'}</div>
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
          <span style="color:#666">Kondisi Kronis</span><span style="color:${kronis?'#c0392b':'#555'};font-weight:${kronis?'600':'400'}">${escHtml(kronis || '-')}</span>
          <span style="color:#666">Alergi</span><span style="color:${alergi?'#c0392b':'#555'};font-weight:${alergi?'600':'400'}">${escHtml(alergi || '-')}</span>
          <span style="color:#666">Status Terakhir</span><span>${current.statusKondisi ? `<span style="background:${escHtml(statusBg(current.statusKondisi))};color:${escHtml(statusColor(current.statusKondisi))};padding:5px 16px;border-radius:14px;font-size:14px;font-weight:800;display:inline-block;">${escHtml(current.statusKondisi)}</span>` : '-'}</span>
        </div>
      </div>
    </div>

    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
        <thead>
          <tr style="background:#e8f5ef;">
            <th style="padding:6px 10px;text-align:left;color:#1a6b4a">Indikator</th>
            <th style="padding:6px 10px;text-align:center;color:#1a6b4a">Minggu Ini · ${current.tglPeriksa ? escHtml(new Date(current.tglPeriksa).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})) : ''}</th>
            <th style="padding:6px 10px;text-align:center;color:#1a6b4a">${escHtml(labelMingguLalu)}</th>
            <th style="padding:6px 10px;text-align:center;color:#1a6b4a">Tren</th>
          </tr>
        </thead>
        <tbody>${tabelVital}</tbody>
      </table>
    </div>

    <div style="padding:10px 18px;border-top:1.5px solid #ddd;font-size:11px;display:grid;grid-template-columns:80px 1fr;row-gap:5px;">
      <span style="color:#666">Diagnosis</span><span>${escHtml(current.diagnosis || '-')}</span>
      <span style="color:#666">Tindakan</span><span>${escHtml(current.tindakan || '-')}</span>
      <span style="color:#666">Rencana</span><span>${escHtml(current.rencana || '-')}</span>
      <span style="color:#666">Dokter</span><span>${escHtml(current.namaDokter || '-')}${(() => { const _s = resolveTTDSrc(current.ttdDokter) || (state.ttdDokterBase64 && state.ttdDokterBase64.length > 10 ? state.ttdDokterBase64 : ''); return _s ? '<img src="' + safeUrl(_s) + '" style="height:34px;max-width:80px;object-fit:contain;vertical-align:middle;margin-left:8px;" title="TTD Dokter" onerror="this.remove()">' : ''; })()}</span>
      <span style="color:#666">Status</span>
      <span><span style="background:${escHtml(statusBg(current.statusKondisi))};color:${escHtml(statusColor(current.statusKondisi))};padding:5px 16px;border-radius:14px;font-size:14px;font-weight:800;display:inline-block;">${escHtml(current.statusKondisi || '-')}</span></span>
    </div>

    ${insidentalHtml}
    ${rujukanHtml}
    ${flagHtml}

    <div style="padding:10px 18px;border-top:1.5px solid #ddd;">
      <div style="font-weight:700;color:#1a6b4a;font-size:11px;margin-bottom:5px;">📝 Catatan / Tindak Lanjut Petugas</div>
      <div class="catatan-petugas-editable" contenteditable="true" data-placeholder="Ketik catatan atau tindak lanjut di sini sebelum dicetak..." style="min-height:38px;border:1px dashed #bbb;border-radius:6px;padding:8px 10px;font-size:10.5px;color:#333;background:#fffef8;outline:none;"></div>
    </div>

    <!-- FOOTER TTD -->
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
              let ttdSrc = resolveTTDSrc(current.ttdDokter);
              if (!ttdSrc && state.ttdDokterBase64 && state.ttdDokterBase64.length > 10) ttdSrc = state.ttdDokterBase64;
              return ttdSrc
                ? '<img src="' + safeUrl(ttdSrc) + '" style="height:55px;max-width:130px;object-fit:contain;display:block;margin:0 auto;" title="TTD Dokter" onerror="this.remove()">'
                : '';
            })()}
          </div>
          <div style="border-top:1px solid #999;padding-top:5px;">
            <div style="font-size:10px;color:#555;font-weight:600">${current.namaDokter ? escHtml(current.namaDokter) : '(................................)'}</div>
          </div>
        </div>

      </div>
    </div>

  </div>`;
    }

    function printKartuIsolated(htmlContent, fitOnePage) {
      // Use a real iframe with complete HTML document to bypass global @page CSS
      const existing = document.getElementById('_printIframe');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = '_printIframe';
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>SIMKEDA PDF</title>
<style>
  @page { size: A4 portrait; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: white; font-family: Arial, sans-serif; font-size: 10.5pt; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
  table { border-collapse: collapse; }
  img { max-width: 100%; }
  .ttd-block, [style*="page-break-inside:avoid"], [style*="break-inside:avoid"] {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  [style*="page-break-before:always"], [style*="break-before:page"] {
    page-break-before: always !important;
    break-before: page !important;
  }
  .catatan-petugas-editable[data-placeholder]:empty:before { content: ''; }
  @media print {
    html, body { margin: 0; padding: 0; }
    .no-print { display: none !important; }
    .ttd-block, [style*="page-break-inside:avoid"], [style*="break-inside:avoid"] {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    [style*="page-break-before:always"], [style*="break-before:page"] {
      page-break-before: always !important;
      break-before: page !important;
    }
  }
</style>
</head>
<body><div id="_fitWrap" style="transform-origin:top center;">${htmlContent}</div></body>
</html>`);
      doc.close();

      const imgs = doc.querySelectorAll('img');
      const doPrint = () => {
        // ── Auto-shrink supaya konten dijamin muat 1 halaman ──
        // Dipakai untuk kartu Mingguan & Bulanan (fitOnePage=true), TIDAK untuk
        // Rekam Medis / laporan Kasi yang memang boleh lebih dari 1 halaman.
        // Lebar iframe layar (210mm) lebih lebar daripada area cetak (210mm - 2x14mm = 182mm); ukur pada lebar cetak sebenarnya
        if (fitOnePage) { const w0 = doc.getElementById('_fitWrap'); if (w0) w0.style.width = '182mm'; }
        const MM_TO_PX = 96 / 25.4; // asumsi 96dpi, sesuai standar CSS px
        const pageAvailablePx = (297 - 24) * MM_TO_PX; // tinggi A4 dikurangi margin atas+bawah 12mm+12mm
        if (fitOnePage === 'sections') {
          // Cetak Semua Kartu Bulanan: tiap kartu (per PM) di-shrink sendiri agar tetap 1 halaman/orang
          doc.querySelectorAll('.kartu-page-section').forEach(sec => {
            const actualHeight = sec.scrollHeight;
            if (actualHeight > pageAvailablePx * 0.93) {
              const scale = Math.max(0.5, (pageAvailablePx * 0.93 / actualHeight));
              sec.style.zoom = String(scale);
            }
          });
        } else if (fitOnePage) {
          const wrap = doc.getElementById('_fitWrap');
          if (wrap) {
            const actualHeight = wrap.scrollHeight;
            if (actualHeight > pageAvailablePx * 0.93) {
              const scale = Math.max(0.5, (pageAvailablePx * 0.93 / actualHeight)); // buffer 1.5%, jangan sampai < 55%
              wrap.style.zoom = String(scale);
            }
          }
        }
        // Iframe bisa sudah dihapus (mis. tombol cetak ditekan dua kali berturut-turut) → hentikan tanpa galat
        if (!iframe.isConnected || !iframe.contentWindow) return;
        iframe.style.visibility = 'visible';
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => { iframe.remove(); }, 1000);
      };

      if (imgs.length === 0) {
        setTimeout(doPrint, 300);
      } else {
        let loaded = 0;
        let printed = false;
        const safePrint = () => { if (!printed) { printed = true; setTimeout(doPrint, 200); } };
        const check = () => { loaded++; if (loaded >= imgs.length) safePrint(); };
        imgs.forEach(img => {
          if (img.complete && img.naturalWidth > 0) check();
          else { img.onload = check; img.onerror = check; }
        });
        setTimeout(safePrint, 1500); // fallback
      }
    }


    // ── CETAK SEMUA KARTU BULANAN ──
    function printCardIsolated(cardId) {
      const card = document.getElementById(cardId);
      if (!card) return;
      const tglCetak = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const htmlContent = '<div style="padding:1rem;font-family:Arial,sans-serif">' +
        '<div style="text-align:center;border-bottom:2px solid #1a6b4a;padding-bottom:8px;margin-bottom:12px">' +
        '<div style="font-weight:700;font-size:14px;color:#1a6b4a">LAPORAN KESEHATAN PENERIMA MANFAAT</div>' +
        '<div style="font-size:11px;color:#555">Dicetak: ' + escHtml(tglCetak) + '</div></div>' +
        card.innerHTML + '</div>';
      printKartuIsolated(htmlContent);
    }

    function cetakSemuaKartuBulanan() {
      const bulan = parseInt(document.getElementById('filterBulan').value);
      const tahun = parseInt(document.getElementById('filterTahun').value);
      const filterAsrama = document.getElementById('filterAsrama').value;
      const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

      // Kumpulkan semua PM yang diperiksa bulan ini
      const pmDiperiksa = [...new Set(
        state.pemeriksaan
          .filter(p => {
            const d = new Date(p.tglPeriksa);
            return d.getMonth() + 1 === bulan && d.getFullYear() === tahun;
          })
          .map(p => p.nomorInduk)
      )];

      // Filter asrama jika dipilih
      const pmFiltered = pmDiperiksa.filter(id => {
        if (!filterAsrama) return true;
        const pm = state.penerima.find(p => p.nomorInduk === id);
        return pm && pm.kamarBlok === filterAsrama;
      });

      if (pmFiltered.length === 0) {
        alert('Tidak ada data pemeriksaan untuk filter yang dipilih.');
        return;
      }

      let html = '';
      pmFiltered.forEach((nomorInduk, i) => {
        const pm = state.penerima.find(p => p.nomorInduk === nomorInduk);
        const records = state.pemeriksaan
          .filter(p => {
            const d = new Date(p.tglPeriksa);
            return p.nomorInduk === nomorInduk && d.getMonth() + 1 === bulan && d.getFullYear() === tahun;
          })
          .sort((a, b) => parseInt(a.mingguKe) - parseInt(b.mingguKe));

        html += `<div class="kartu-page-section" style="${i > 0 ? 'page-break-before:always;break-before:page;' : ''}">${renderKartuBulananHTML(pm, records, bulan, tahun, BULAN)}</div>`;
      });

      document.getElementById('cetakSemuaContent').innerHTML = html;
      document.getElementById('modalCetakSemua').classList.add('show');
    }

    // ── RENDER HTML KARTU BULANAN ──
    function renderKartuBulananHTML(pm, records, bulan, tahun, BULAN) {
      const namaPM = pm ? pm.namaPM : (records[0]?.namaPM || '-');
      const nomorInduk = pm ? pm.nomorInduk : (records[0]?.nomorInduk || '-');
      const asrama = pm ? (pm.kamarBlok || '-') : '-';
      const disabilitas = pm ? pm.jenisDis : '-';
      const kronis = pm ? (pm.kondisiKronis || '-') : '-';
      const alergi = pm ? (pm.alergi || '-') : '-';
      const golDarah = pm ? (pm.golDarah || '-') : '-';
      const waktuCetak = new Date();
      const noCetak = 'LKB/' + BULAN[bulan] + tahun + '/' + (nomorInduk || '-');
      const petugasCetakNama = state.petugasCetak || state.namaPetugas || '-';

      // Susun per minggu (1–4)
      // Beberapa pemeriksaan di minggu yang sama semuanya ditampilkan (dulu hanya yang terakhir;
      // "Total Kunjungan" tidak cocok dengan isi tabel).
      const mingguMap = { 1: null, 2: null, 3: null, 4: null, 5: null };
      const mingguDaftar = { 1: [], 2: [], 3: [], 4: [], 5: [] };
      records.forEach(r => { const k = parseInt(r.mingguKe); mingguMap[k] = r; if (mingguDaftar[k]) mingguDaftar[k].push(r); });

      const statusColor = (s) => s === 'Baik' ? '#155724' : s === 'Cukup Baik' ? '#856404' : s === 'Perlu Perhatian' ? '#721c24' : '#7b0000';
      const statusBg = (s) => s === 'Baik' ? '#d4edda' : s === 'Cukup Baik' ? '#fff3cd' : s === 'Perlu Perhatian' ? '#fdecea' : '#f5c6cb';

      const lastStatus = records.length ? records[records.length - 1].statusKondisi : '-';
      const namaDokter = (records.length && records[records.length - 1].namaDokter) ? records[records.length - 1].namaDokter : (state.defaultDokter || '-');
      const jmlMinggu = Object.values(mingguMap).filter(v => v !== null).length;

      // Tabel minggu
      let tabelMinggu = '';
      [1, 2, 3, 4, 5].forEach(mg => {
       (mingguDaftar[mg].length ? mingguDaftar[mg].slice().sort((x, y) => String(x.tglPeriksa || '').localeCompare(String(y.tglPeriksa || ''))) : [null]).forEach(r => {
        tabelMinggu += `
      <tr style="border-top:1px solid #e0e0e0;${!r ? 'background:#fafafa;color:#aaa' : ''}">
        <td style="padding:7px 10px;font-weight:600;white-space:nowrap;text-align:center;background:${r ? '#e8f5ef' : '#f5f5f5'};border-right:1px solid #e0e0e0">
          Minggu ${escHtml(mg)}
        </td>
        <td style="padding:7px 10px;font-family:monospace">
          ${r ? (r.tglPeriksa ? escHtml(new Date(r.tglPeriksa).toLocaleDateString('id-ID')) : '-') : '—'}
          ${(() => { const _s = resolveTTDSrc(r ? r.ttdDokter : '') || (r && !r.ttdDokter && state.ttdDokterBase64 ? '' : ''); return (r && _s) ? '<br><img src="' + safeUrl(_s) + '" style="height:44px;max-width:90px;object-fit:contain;margin-top:4px;display:block;" title="TTD Dokter" onerror="this.remove()">' : ''; })()}
        </td>
        <td style="padding:7px 10px;font-family:monospace;font-weight:600">${r ? (escHtml(r.tekananDarah || '—')) : '—'}</td>
        <td style="padding:7px 10px;text-align:center">${r ? (r.beratBadan ? escHtml(r.beratBadan + ' kg') : '—') : '—'}</td>
        <td style="padding:7px 10px;text-align:center">${r ? (escHtml(r.nadi || '—')) : '—'}</td>
        <td style="padding:7px 10px;text-align:center">${r ? (r.spo2 ? escHtml(r.spo2 + '%') : '—') : '—'}</td>
        <td style="padding:7px 10px;max-width:120px;word-wrap:break-word">${r ? (escHtml(r.diagnosis || '—')) : '—'}</td>
        <td style="padding:7px 10px;max-width:140px;word-wrap:break-word;color:${r && r.tindakan ? '#155724' : 'inherit'}">${r ? (escHtml(r.tindakan || '—')) : '—'}</td>
        <td style="padding:7px 10px;max-width:140px;word-wrap:break-word;color:${r && r.rencana ? '#1a3a6b' : 'inherit'}">${r ? (escHtml(r.rencana || '—')) : '—'}</td>
        <td style="padding:7px 10px;text-align:center">
          ${r ? `<span style="background:${escHtml(statusBg(r.statusKondisi))};color:${escHtml(statusColor(r.statusKondisi))};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap">${escHtml(r.statusKondisi)}</span>` : '—'}
        </td>
      </tr>`;
       });
      });

      return `
  <div style="font-family:Arial,sans-serif;font-size:11.5px;color:#222;max-width:900px;margin:0 auto;border:1.5px solid #ccc;border-radius:8px;overflow:hidden;">

    ${renderKopSuratHTML()}

    <!-- HEADER -->
    <div style="background:#1a6b4a;color:white;padding:7px 18px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:12.5px;font-weight:700;letter-spacing:.3px">KARTU PEMERIKSAAN KESEHATAN BULANAN</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:700;background:rgba(255,255,255,.15);padding:3px 10px;border-radius:6px">${escHtml(BULAN[bulan])} ${escHtml(tahun)}</div>
        <div style="font-size:8px;opacity:.75;margin-top:2px">Dicetak: ${escHtml(waktuCetak.toLocaleDateString('id-ID'))}</div>
        <div style="font-size:7.5px;opacity:.65;margin-top:1px;font-family:monospace;">No. Cetak: ${escHtml(noCetak)}</div>
      </div>
    </div>

    <!-- INFO PM -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1.5px solid #ddd;">
      <div style="padding:10px 16px;border-right:1px solid #ddd;">
        <div style="display:grid;grid-template-columns:90px 1fr;row-gap:4px;font-size:11px;">
          <span style="color:#666">Nama PM</span><span style="font-weight:700;font-size:13px">${escHtml(namaPM)}</span>
          <span style="color:#666">No. Induk</span><span style="font-family:monospace;font-weight:600">${escHtml(nomorInduk)}</span>
          <span style="color:#666">Asrama</span><span style="font-weight:600">${escHtml(asrama)}</span>
          <span style="color:#666">Disabilitas</span><span>${escHtml(disabilitas)}</span>
        </div>
      </div>
      <div style="padding:10px 16px;">
        <div style="display:grid;grid-template-columns:100px 1fr;row-gap:4px;font-size:11px;">
          <span style="color:#666">Gol. Darah</span><span style="font-weight:600">${escHtml(golDarah)}</span>
          <span style="color:#666">Kondisi Kronis</span><span style="color:${kronis !== '-' ? '#c0392b' : '#555'};font-weight:${kronis !== '-' ? '600' : '400'}">${escHtml(kronis)}</span>
          <span style="color:#666">Alergi</span><span style="color:${alergi !== '-' ? '#c0392b' : '#555'};font-weight:${alergi !== '-' ? '600' : '400'}">${escHtml(alergi)}</span>
          <span style="color:#666">Status Terakhir</span><span>${lastStatus && lastStatus !== '-' ? `<span style="background:${escHtml(statusBg(lastStatus))};color:${escHtml(statusColor(lastStatus))};padding:2px 9px;border-radius:10px;font-size:10.5px;font-weight:700">${escHtml(lastStatus)}</span>` : '-'}</span>
        </div>
      </div>
    </div>

    <!-- SUMMARY BULAN -->
    <div style="display:flex;align-items:center;gap:0;border-bottom:1.5px solid #ddd;background:#f9f9f9;">
      <div style="padding:8px 16px;flex:1;border-right:1px solid #eee;text-align:center">
        <div style="font-size:10px;color:#666">Total Kunjungan</div>
        <div style="font-size:18px;font-weight:700;color:#1a6b4a">${escHtml(records.length)}</div>
      </div>
      <div style="padding:8px 16px;flex:1;border-right:1px solid #eee;text-align:center">
        <div style="font-size:10px;color:#666">Minggu Diperiksa</div>
        <div style="font-size:18px;font-weight:700;color:#1a6b4a">${escHtml(jmlMinggu)} / 4</div>
      </div>
      <div style="padding:8px 16px;flex:1;border-right:1px solid #eee;text-align:center">
        <div style="font-size:10px;color:#666">% Kehadiran</div>
        <div style="font-size:18px;font-weight:700;color:#1a6b4a">${escHtml(Math.min(100, Math.round(jmlMinggu / 4 * 100)))}%</div>
      </div>
      <div style="padding:8px 16px;flex:1;text-align:center">
        <div style="font-size:10px;color:#666">Status Terakhir</div>
        <div style="margin-top:3px">
          <span style="background:${escHtml(statusBg(lastStatus))};color:${escHtml(statusColor(lastStatus))};padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700">${escHtml(lastStatus)}</span>
        </div>
      </div>
    </div>

    <!-- TABEL MINGGUAN -->
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
        <thead>
          <tr style="background:#e8f5ef;">
            <th style="padding:7px 10px;text-align:center;color:#1a6b4a;border-right:1px solid #d0e8dc;white-space:nowrap">Minggu</th>
            <th style="padding:7px 10px;text-align:left;color:#1a6b4a;white-space:nowrap">Tanggal</th>
            <th style="padding:7px 10px;text-align:left;color:#1a6b4a;white-space:nowrap">TD (mmHg)</th>
            <th style="padding:7px 10px;text-align:center;color:#1a6b4a;white-space:nowrap">BB</th>
            <th style="padding:7px 10px;text-align:center;color:#1a6b4a;white-space:nowrap">Nadi</th>
            <th style="padding:7px 10px;text-align:center;color:#1a6b4a;white-space:nowrap">SpO2</th>
            <th style="padding:7px 10px;text-align:left;color:#1a6b4a">Diagnosis</th>
            <th style="padding:7px 10px;text-align:left;color:#1a6b4a">Tindakan</th>
            <th style="padding:7px 10px;text-align:left;color:#1a6b4a">Edukasi</th>
            <th style="padding:7px 10px;text-align:center;color:#1a6b4a;white-space:nowrap">Status</th>
          </tr>
        </thead>
        <tbody>${tabelMinggu}</tbody>
      </table>
    </div>

    <!-- RESEP / OBAT DIBERIKAN -->
    ${(function() {
      var allObat = records.reduce(function(acc, r) {
        (r.obatDiberikan || []).forEach(function(o) {
          acc.push({ nama: o.nama, jumlah: o.jumlah, satuan: o.satuan||'', aturanPakai: o.aturanPakai||'', mingguKe: r.mingguKe });
        });
        return acc;
      }, []);
      if (!allObat.length) return '';
      var rows = allObat.map(function(o) {
        return '<tr style="border-top:1px solid #eee;">'+
          '<td style="padding:5px 10px;text-align:center;color:#666;font-size:10px;">Mg-'+(escHtml(o.mingguKe||'-'))+'</td>'+
          '<td style="padding:5px 10px;font-weight:600">'+escHtml(o.nama)+'</td>'+
          '<td style="padding:5px 10px;text-align:center">'+escHtml(o.jumlah)+' '+escHtml(o.satuan)+'</td>'+
          '<td style="padding:5px 10px;color:#1a6b4a;font-weight:500">'+(escHtml(o.aturanPakai||'—'))+'</td>'+
          '</tr>';
      }).join('');
      return '<div style="border-top:1.5px solid #ddd;padding:10px 16px;">'+
        '<div style="font-size:10.5px;font-weight:700;color:#1a6b4a;margin-bottom:6px;">💊 Resep / Obat yang Diberikan</div>'+
        '<table style="width:100%;border-collapse:collapse;font-size:10.5px;">'+
          '<thead><tr style="background:#e8f5ef;">'+
            '<th style="padding:5px 10px;text-align:center;color:#1a6b4a;white-space:nowrap">Minggu</th>'+
            '<th style="padding:5px 10px;text-align:left;color:#1a6b4a">Nama Obat</th>'+
            '<th style="padding:5px 10px;text-align:center;color:#1a6b4a;white-space:nowrap">Jumlah</th>'+
            '<th style="padding:5px 10px;text-align:left;color:#1a6b4a">Aturan Pakai</th>'+
          '</tr></thead>'+
          '<tbody>'+rows+'</tbody>'+
        '</table></div>';
    })()}

    <!-- FOOTER TTD -->
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
              const lastTTD = records.filter(r => r && r.ttdDokter).pop();
              let ttdSrc = '';
              if (lastTTD) ttdSrc = resolveTTDSrc(lastTTD.ttdDokter);
              if (!ttdSrc && state.ttdDokterBase64 && state.ttdDokterBase64.length > 10) ttdSrc = state.ttdDokterBase64;
              return ttdSrc
                ? '<img src="' + safeUrl(ttdSrc) + '" style="height:55px;max-width:130px;object-fit:contain;display:block;margin:0 auto;" title="TTD Dokter" onerror="this.remove()">'
                : '';
            })()}
          </div>
          <div style="border-top:1px solid #999;padding-top:5px;">
            <div style="font-size:10px;color:#555;font-weight:600">${namaDokter !== '-' ? escHtml(namaDokter) : '(................................)'}</div>
          </div>
        </div>

      </div>
    </div>
  </div>`;
    }
