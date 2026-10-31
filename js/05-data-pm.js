    // ══════════════════════════════════════
    //  DATA PM
    // ══════════════════════════════════════
    // ══════════════════════════════════════
    //  GANTI NOMOR INDUK (koreksi salah ketik)
    //  Seluruh riwayat dipindah ke nomor baru — bukan membuat data baru.
    // ══════════════════════════════════════
    const _KOLEKSI_BER_NI = ['pemeriksaan', 'insidental', 'rujukan', 'pengukuranAwal', 'antrian', 'asesmenAwal'];
    function _hitungRiwayatNI(ni) {
      const t = String(ni).trim();
      const n = {};
      _KOLEKSI_BER_NI.forEach(function(k) { n[k] = (state[k] || []).filter(function(x) { return x && !x._deleted && String(x.nomorInduk).trim() === t; }).length; });
      return n;
    }
    // Ubah nomorInduk di semua catatan lokal milik PM ini (catatan PM itu sendiri diubah oleh pemanggil).
    function _gantiNomorIndukLokal(lama, baru) {
      const now = new Date().toISOString(); let jml = 0;
      const l = String(lama).trim();
      _KOLEKSI_BER_NI.forEach(function(k) {
        (state[k] || []).forEach(function(r) {
          if (r && String(r.nomorInduk).trim() === l) { r.nomorInduk = baru; r.updatedAt = now; jml++; }
        });
      });
      return jml;
    }
    // Foto rujukan yang masih menunggu terkirim (IndexedDB) ikut memakai nomor baru
    async function _gantiNIdiAntreanFoto(lama, baru) {
      try {
        if (typeof _bacaAntreanFoto !== 'function') return;
        const a = await _bacaAntreanFoto(); let ubah = false;
        a.forEach(function(it) {
          if (it && String(it.nomorInduk).trim() === String(lama).trim()) { it.nomorInduk = baru; ubah = true; }
          if (it && it.data && String(it.data.nomorInduk).trim() === String(lama).trim()) { it.data.nomorInduk = baru; ubah = true; }
        });
        if (ubah) await _tulisAntreanFoto(a);
      } catch (e) { /* tidak fatal */ }
    }
    // → { ok, antre?, error? }  Server dulu (bila ditolak, tidak ada yang berubah); offline → diantrekan.
    async function _kirimGantiNI(lama, baru, tglDaftar) {
      if (!state.scriptUrl) return { ok: true };
      const d = { lama: String(lama), baru: baru, tglDaftar: tglDaftar || '' };
      if (_bacaAntrean().length) await kirimAntrean();
      if (_bacaAntrean().length) { _antrekan('gantiNomorInduk', d); return { ok: true, antre: true }; }
      const r = await _postKeServer('gantiNomorInduk', d);
      if (r.status === 'ok') return { ok: true };
      if (r.status === 'jaringan' || r.status === 'sesi') { _antrekan('gantiNomorInduk', d); return { ok: true, antre: true }; }
      return { ok: false, error: r.error || 'Server menolak penggantian Nomor Induk.' };
    }

    // Fungsi simpan PM (dipanggil via onclick, lebih reliable dari form submit)
    async function simpanDataPM() {
      const btn = document.getElementById('btnSimpanPM');
      // Baca editNi dari form.dataset (lebih reliable) dengan fallback ke btn.dataset
      const _form = document.getElementById('formPendaftaran');
      const editNi = (state._editNI) ? state._editNI : ((_form && _form.dataset.editNi) ? _form.dataset.editNi : (_g_editNI || null));
      const data = {
        nomorInduk: document.getElementById('nomorInduk').value.trim(),
        noBPJS: (document.getElementById('noBPJS') || { value: '' }).value.trim(),
        namaPM: document.getElementById('namaPM').value.trim(),
        tglLahir: document.getElementById('tglLahir').value,
        jenisKelamin: document.getElementById('jenisKelamin').value,
        jenisDis: document.getElementById('jenisDis').value,
        kamarBlok: document.getElementById('kamarBlok').value,
        tglMasuk: document.getElementById('tglMasuk').value,
        golDarah: document.getElementById('golDarah').value,
        alergi: document.getElementById('alergi').value,
        kondisiKronis: document.getElementById('kondisiKronis').value,
        riwayatPenyakit: document.getElementById('riwayatPenyakit').value,
        alamat: document.getElementById('alamatPM') ? document.getElementById('alamatPM').value : '',
        statusPM: (document.getElementById('statusPM') || { value: 'Aktif' }).value || 'Aktif',
        tglDaftar: editNi ? (state.penerima.find(p => p.nomorInduk === editNi) || {}).tglDaftar : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      // Validasi dasar (berlaku untuk tambah & edit) — sama dengan aturan server
      if (!data.namaPM) {
        showAlert('alertPendaftaran', 'error', '❌ Nama Lengkap wajib diisi.'); return;
      }
      if (data.nomorInduk && !/^[A-Za-z0-9][A-Za-z0-9.\/_-]{2,29}$/.test(data.nomorInduk)) {
        showAlert('alertPendaftaran', 'error', '❌ Nomor Induk hanya boleh huruf/angka dan tanda - . / _ (3–30 karakter, tanpa spasi), mis. BDBP-2025-001.'); return;
      }
      setLoading('btnSimpanPM', 'spinPM', true);
      let ok = false;
      if (editNi) {
        // MODE EDIT
        const niLama = String(editNi).trim();
        if (!data.nomorInduk) {
          setLoading('btnSimpanPM', 'spinPM', false);
          showAlert('alertPendaftaran', 'error', '❌ Nomor Induk tidak boleh kosong.'); return;
        }
        if (data.nomorInduk !== niLama && state.penerima.findIndex(p => String(p.nomorInduk).trim() === niLama) !== -1) {
          // Nomor Induk DIGANTI → semua riwayat ikut pindah ke nomor baru (bukan data baru)
          const pakai = state.penerima.find(p => String(p.nomorInduk).trim() === data.nomorInduk);
          if (pakai) {
            setLoading('btnSimpanPM', 'spinPM', false);
            showAlert('alertPendaftaran', 'error', '❌ Nomor Induk "' + data.nomorInduk + '" sudah dipakai PM lain (' + (pakai.namaPM || '-') + '). Pilih nomor lain.'); return;
          }
          const r = _hitungRiwayatNI(niLama);
          const total = r.pemeriksaan + r.insidental + r.rujukan + r.pengukuranAwal + r.asesmenAwal;
          let ps = 'Ganti Nomor Induk\n\nDari: ' + niLama + '\nMenjadi: ' + data.nomorInduk + '\n\n';
          ps += total > 0
            ? 'Seluruh riwayat PM ini (' + r.pemeriksaan + ' pemeriksaan, ' + r.insidental + ' insidental, ' + r.rujukan + ' rujukan, ' + r.pengukuranAwal + ' pengukuran, ' + r.asesmenAwal + ' asesmen) ikut dipindahkan ke nomor baru.\n'
            : 'PM ini belum punya riwayat.\n';
          ps += 'Ini bukan data baru, dan nomor lama tidak akan terpakai lagi.\n\nLanjutkan?';
          if (!confirm(ps)) { setLoading('btnSimpanPM', 'spinPM', false); return; }
          const h = await _kirimGantiNI(niLama, data.nomorInduk, data.tglDaftar);
          if (!h.ok) {
            setLoading('btnSimpanPM', 'spinPM', false);
            showAlert('alertPendaftaran', 'error', '❌ ' + h.error); showToast(h.error, 'error'); return;
          }
          _gantiNomorIndukLokal(niLama, data.nomorInduk);
          await _gantiNIdiAntreanFoto(niLama, data.nomorInduk);
          const _pmLama = state.penerima.find(p => String(p.nomorInduk).trim() === niLama);
          if (_pmLama) _pmLama.nomorInduk = data.nomorInduk;
          if (h.antre) showToast('Nomor Induk diganti di perangkat ini; akan dikirim ke server saat tersambung.');
        }
        const idx = state.penerima.findIndex(p => String(p.nomorInduk).trim() === String(data.nomorInduk).trim());
        if (idx !== -1) {
          state.penerima[idx] = { ...state.penerima[idx], ...data };
          state._editNI = null; // clear SEBELUM saveState agar tidak tersimpan di localStorage
          if (state.scriptUrl) ok = await kirimKeSheets('editPM', data);
          saveState();
      triggerSyncAfterSave(); renderListPM(); updateSelectPM(); updateSelectPMPetugas(); updateSelectInsidental(); updateSelectRujukan(); updateSelectAsesmen(); renderDashboard(); try { renderDaftarSiapPeriksa(); } catch (e) {}
          // Reset edit mode
          btn.textContent = '💾 Simpan PM'; delete btn.dataset.editNi;
          const _f2 = document.getElementById('formPendaftaran'); if (_f2) delete _f2.dataset.editNi;
          _g_editNI = null; // clear global
          const ni = document.getElementById('nomorInduk'); if (ni) ni.readOnly = false;
          document.getElementById('formPendaftaran').reset();
          setLoading('btnSimpanPM', 'spinPM', false);
          showAlert('alertPendaftaran', 'success', '✅ Data PM berhasil diperbarui!'); showToast('✅ Data PM berhasil diperbarui!');
          // Tampilkan detail PM terbaru untuk konfirmasi visual
          setTimeout(() => { lihatDetailPM(String(data.nomorInduk)); }, 400);
        } else {
          setLoading('btnSimpanPM', 'spinPM', false);
          showAlert('alertPendaftaran', 'error', '❌ Gagal memperbarui: Data PM tidak ditemukan. Coba ulangi dari tombol Edit di tabel.');
        }
      } else {
        // MODE TAMBAH BARU
        // Validasi field wajib PM baru
        const missingPM = [];
        if (!data.nomorInduk) missingPM.push('Nomor Induk');
        if (!data.namaPM) missingPM.push('Nama Lengkap');
        if (!data.jenisDis) missingPM.push('Jenis Disabilitas');
        if (missingPM.length) {
          setLoading('btnSimpanPM', 'spinPM', false);
          showAlert('alertPendaftaran', 'error', '❌ Field wajib belum diisi: ' + missingPM.join(', '));
          showToast('Field wajib belum diisi: ' + missingPM.join(', '), 'error'); return;
        }
      if (state.penerima.find(p => p.nomorInduk === data.nomorInduk)) {
          setLoading('btnSimpanPM', 'spinPM', false);
          showAlert('alertPendaftaran', 'error', '❌ Nomor Induk sudah terdaftar!'); return;
        }
        if (state.scriptUrl) ok = await kirimKeSheets('addPM', data);
        state.penerima.push(data);
        saveState(); triggerSyncAfterSave(); renderListPM(); updateSelectPM(); updateSelectPMPetugas(); updateSelectInsidental(); updateSelectRujukan(); updateSelectAsesmen(); renderDashboard();
        document.getElementById('formPendaftaran').reset();
        setLoading('btnSimpanPM', 'spinPM', false);
        showAlert('alertPendaftaran', ok ? 'success' : 'info',
          ok ? '✅ PM baru berhasil disimpan!' : '💾 PM baru disimpan lokal!');
        showToast(ok ? '✅ PM baru berhasil disimpan!' : '💾 PM baru disimpan lokal.', ok ? 'success' : 'info');
      }
    }
    function hitungUsia(tglLahir) {
      if (!tglLahir) return '-';
      const lahir = new Date(tglLahir);
      if (isNaN(lahir)) return '-';
      const today = new Date();
      let usia = today.getFullYear() - lahir.getFullYear();
      const m = today.getMonth() - lahir.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < lahir.getDate())) usia--;
      return usia + ' th';
    }

    function filterListPM(q) { _pageState.listPM = 1; renderListPM(q.toLowerCase()); }

    document.getElementById('formPendaftaran').addEventListener('submit', function (e) { e.preventDefault(); simpanDataPM(); }); function renderListPM(filter) {
      filter = filter !== undefined ? filter : ((document.getElementById('searchListPM')||{}).value||'').toLowerCase();
      const tbody = document.getElementById('listPMBody');
      let list = filter ? state.penerima.filter(p =>
        (p.namaPM||'').toLowerCase().includes(filter) || (p.nomorInduk||'').toLowerCase().includes(filter)
      ) : state.penerima;

      document.getElementById('countPM').textContent = state.penerima.length + ' orang';
      const _pgListPM = document.getElementById('listPMPagination');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-muted)">Belum ada data PM.</td></tr>';
        if (_pgListPM) _pgListPM.innerHTML = '';
        return;
      }
      list = _fltTbl('listPM', list);   // v26: filter nama/tanggal (data, semua halaman)
      const _ppListPM = 100;
      const _totalPagesListPM = Math.max(1, Math.ceil(list.length / _ppListPM));
      if (_pageState.listPM > _totalPagesListPM) _pageState.listPM = _totalPagesListPM;
      const _startListPM = (_pageState.listPM - 1) * _ppListPM;
      const _pageListPM = list.slice(_startListPM, _startListPM + _ppListPM);
      tbody.innerHTML = '';
      _pageListPM.forEach((pm, _i) => {
        const i = _startListPM + _i;
        const last = getLastPeriksa(pm.nomorInduk);
        const tglStr = last ? new Date(last.tglPeriksa).toLocaleDateString('id-ID') : '-';
        const hari = last ? Math.floor((new Date() - new Date(last.tglPeriksa)) / 86400000) : null;
        const status = !last ? 'Belum pernah' : hari > 90 ? 'Terlambat' : hari > 30 ? 'Perlu Jadwal' : 'Rutin';
        const sc = !last || hari > 90 ? 'badge-red' : hari > 30 ? 'badge-yellow' : 'badge-green';
        const alamatTampil = pm.alamat ? (pm.alamat.length > 30 ? pm.alamat.substring(0, 30) + '…' : pm.alamat) : '-';
        const statusPMVal = pm.statusPM || 'Aktif';
        const statusPMBadge = statusPMVal === 'Aktif' ? ''
          : ' <span class="badge ' + (statusPMVal === 'Meninggal' ? 'badge-gray' : statusPMVal === 'Cuti' ? 'badge-yellow' : 'badge-gray') + '" style="font-size:.65rem;">' + escHtml(statusPMVal) + '</span>';
        const tr = document.createElement('tr');
        if (statusPMVal !== 'Aktif') tr.style.opacity = '.6';
        tr.innerHTML =
          '<td style="text-align:center">' + (escHtml(i + 1)) + '</td>' +
          '<td style="font-size:.8rem;color:var(--text-muted)">' + escHtml(pm.nomorInduk) + '</td>' +
          '<td style="font-weight:600">' + escHtml(pm.namaPM) + statusPMBadge + '</td>' +
          '<td style="text-align:center;font-size:.82rem">' + escHtml(hitungUsia(pm.tglLahir)) + '</td>' +
          '<td style="font-size:.78rem;max-width:140px" title="' + escHtml(pm.alamat || '') + '">' + escHtml(alamatTampil) + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(pm.jenisDis || '-') + '</td>' +
          '<td style="text-align:center">' + escHtml(pm.kamarBlok || '-') + '</td>' +
          '<td style="font-size:.82rem">' + escHtml(tglStr) + '</td>' +
          '<td><span class="badge ' + escHtml(sc) + '">' + escHtml(status) + '</span></td>' +
          '<td style="display:flex;gap:4px;flex-wrap:nowrap;">' +
          '<button class="btn btn-info btn-sm" title="Detail">👁️</button>' +
          '<button class="btn btn-sm" title="Rekam Medis" style="background:#e8f4fd;color:#2980b9;">🕒</button>' +
          '<button class="btn btn-accent btn-sm" title="Edit">✏️</button>' +
          '<button class="btn btn-ghost btn-sm" title="Hapus" style="color:var(--danger)">🗑️</button>' +
          '</td>';
        const [btnDetail, btnRekamMedis, btnEdit, btnHapus] = tr.querySelectorAll('button');
        btnDetail.onclick = () => lihatDetailPM(pm.nomorInduk);
        btnRekamMedis.onclick = () => tampilkanRekamMedis(pm.nomorInduk);
        btnEdit.onclick = () => editPM(pm.nomorInduk);
        btnHapus.onclick = () => hapusPM(pm.nomorInduk);
        tbody.appendChild(tr);
      });
      _renderPaginationControls('listPMPagination', 'listPM', list.length, _ppListPM, 'renderListPM');
    }

    async function hapusPM(nomorInduk) {
      const jmlPeriksa = (state.pemeriksaan || []).filter(x => x.nomorInduk === nomorInduk && !x._deleted).length;
      const jmlInsidental = (state.insidental || []).filter(x => x.nomorInduk === nomorInduk && !x._deleted).length;
      const jmlRujukan = (state.rujukan || []).filter(x => x.nomorInduk === nomorInduk && !x._deleted).length;
      const jmlAsesmen = (state.asesmenAwal || []).filter(x => x.nomorInduk === nomorInduk && !x._deleted).length;
      const totalRiwayat = jmlPeriksa + jmlInsidental + jmlRujukan + jmlAsesmen;
      let pesan = 'Hapus data PM ini?';
      if (totalRiwayat > 0) {
        pesan += '\n\n⚠️ PM ini punya riwayat: ' + jmlPeriksa + ' pemeriksaan, ' + jmlInsidental
          + ' insidental, ' + jmlRujukan + ' rujukan, ' + jmlAsesmen + ' asesmen.\n'
          + 'Riwayat tersebut TIDAK ikut terhapus, tapi setelah data PM induk dihapus, riwayat ini bisa jadi tidak muncul lagi di beberapa daftar/laporan karena nomor induknya sudah tidak terdaftar aktif.';
      } else {
        pesan += ' Data pemeriksaan terkait (jika ada) tidak ikut terhapus.';
      }
      if (!confirm(pesan)) return;
      state.penerima = state.penerima.filter(p => p.nomorInduk !== nomorInduk);
      // Bersihkan pengukuran awal agar tidak muncul di daftar siap periksa
      state.pengukuranAwal = (state.pengukuranAwal || []).filter(x => x.nomorInduk !== nomorInduk);
      saveState(); renderListPM(); updateSelectPM(); renderDashboard(); renderDaftarSiapPeriksa();
      try { updateSelectPMPetugas(); updateSelectInsidental(); updateSelectRujukan(); updateSelectAsesmen(); } catch (e) {}
      if (state.scriptUrl) await kirimKeSheets('deletePM', { nomorInduk });
    }

    // ── TAB ──
    function switchTab(tab) {
      document.getElementById('tabContentManual').style.display = tab === 'manual' ? '' : 'none';
      document.getElementById('tabContentImport').style.display = tab === 'import' ? '' : 'none';
      document.getElementById('tabInputManual').className = tab === 'manual' ? 'btn btn-primary' : 'btn btn-ghost';
      document.getElementById('tabImportCSV').className = tab === 'import' ? 'btn btn-primary' : 'btn btn-ghost';
    }

    // ── STEP WIZARD ──
    let currentStep = 1;
    let _g_editPeriksaId = null;   // Global backup editId pemeriksaan
    let _g_editNI = null;           // Global backup editNi penerima manfaat
    function goToStep(n) {
      currentStep = n;
      document.querySelectorAll('.import-step-content').forEach((el, i) => {
        el.style.display = (i + 1 === n) ? '' : 'none';
      });
      document.querySelectorAll('.import-step').forEach((el, i) => {
        el.classList.remove('active', 'done');
        if (i + 1 < n) el.classList.add('done');
        if (i + 1 === n) el.classList.add('active');
      });
      document.querySelectorAll('.step-line').forEach((el, i) => {
        el.classList.toggle('done', i + 1 < n);
      });
      // show stepContent3 for step 3 & 4 (preview/konfirmasi)
      if (n === 3 || n === 4) {
        document.getElementById('stepContent3').style.display = '';
        document.getElementById('stepContent2').style.display = 'none';
      }
    }

    // ── FILE UPLOAD ──
    function handleImportFile(input) {
      if (!input.files[0]) return;
      processImportFile(input.files[0]);
    }
    function handleDropFile(e) {
      e.preventDefault();
      document.getElementById('importArea').classList.remove('drag');
      const file = e.dataTransfer.files[0];
      if (file) processImportFile(file);
    }

    function processImportFile(file) {
      const ext = file.name.split('.').pop().toLowerCase();
      document.getElementById('importLoading').style.display = 'block';
      document.getElementById('importArea').style.display = 'none';

      if (ext === 'xlsx' || ext === 'xls') {
        // Load SheetJS from CDN then parse
        loadSheetJS(() => parseXLSX(file));
      } else {
        // CSV / TXT
        const reader = new FileReader();
        reader.onload = e => { parseCSV(e.target.result); };
        reader.readAsText(file);
      }
    }

    function loadSheetJS(cb) {
      if (window.XLSX) { cb(); return; }
      const script = document.createElement('script');
      script.src = 'vendor/xlsx.bundle.js';   // salinan lokal (jalan offline)
      let cobaCdn = false;
      script.onload = cb;
      script.onerror = () => {
        if (!cobaCdn) { cobaCdn = true; script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js'; return; }   // cadangan
        document.getElementById('importLoading').style.display = 'none';
        document.getElementById('importArea').style.display = 'block';
        alert('Gagal memuat library Excel. Periksa koneksi internet Anda, atau gunakan format CSV.');
      };
      document.head.appendChild(script);
    }

    function parseXLSX(file) {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          // dateNF: sel tanggal Excel dibaca sebagai YYYY-MM-DD (dulu "1/15/90" → kolom tanggal kosong saat PM diedit)
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
          processRows(rows, file.name);
        } catch (err) {
          document.getElementById('importLoading').style.display = 'none';
          document.getElementById('importArea').style.display = 'block';
          alert('Gagal membaca file Excel: ' + err.message);
        }
      };
      reader.readAsBinaryString(file);
    }

    function parseCSV(text) {
      // RFC 4180-compliant CSV parser — handles commas & newlines inside quoted fields
      function splitCSVLine(line) {
        const result = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuote && line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
            else { inQuote = !inQuote; }
          } else if (ch === ',' && !inQuote) {
            result.push(cur.trim()); cur = '';
          } else {
            cur += ch;
          }
        }
        result.push(cur.trim());
        return result;
      }

      // Re-join lines that were split mid-quoted-field
      const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      const joined = [];
      let buf = '';
      let openQ = 0;
      for (const l of rawLines) {
        for (const ch of l) { if (ch === '"') openQ++; }
        buf = buf ? buf + '\n' + l : l;
        if (openQ % 2 === 0) { joined.push(buf); buf = ''; openQ = 0; }
      }
      if (buf) joined.push(buf);

      const lines = joined.map(l => l.trim()).filter(l => l);
      if (lines.length < 2) {
        document.getElementById('importLoading').style.display = 'none';
        document.getElementById('importArea').style.display = 'block';
        alert('File CSV kosong atau hanya berisi header.');
        return;
      }
      const headers = splitCSVLine(lines[0]);
      const rows = lines.slice(1).map(line => {
        const cols = splitCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => obj[h] = cols[i] !== undefined ? cols[i] : '');
        return obj;
      });
      processRows(rows, 'file.csv');
    }

    // Map fleksibel dari berbagai nama kolom
    const COL_MAP = {
      nomorInduk: ['NomorInduk', 'Nomor Induk', 'No Induk', 'No.Induk', 'nomor_induk', 'ID', 'no_induk'],
      namaPM: ['NamaLengkap', 'Nama Lengkap', 'Nama', 'nama', 'NamaPM', 'nama_pm'],
      tglLahir: ['TanggalLahir', 'Tanggal Lahir', 'tgl_lahir', 'TglLahir', 'Tgl Lahir'],
      jenisKelamin: ['JenisKelamin', 'Jenis Kelamin', 'jenis_kelamin', 'JK'],
      jenisDis: ['JenisDisabilitas', 'Jenis Disabilitas', 'Disabilitas', 'disabilitas', 'jenis_dis'],
      kamarBlok: ['KamarBlok', 'Kamar Blok', 'Kamar', 'kamar', 'kamar_blok', 'Blok', 'Asrama', 'asrama'],
      tglMasuk: ['TanggalMasuk', 'Tanggal Masuk', 'tgl_masuk', 'TglMasuk', 'Tgl Masuk'],
      golDarah: ['GolonganDarah', 'Golongan Darah', 'gol_darah', 'GolDarah', 'Gol Darah'],
      kondisiKronis: ['KondisiKronis', 'Kondisi Kronis', 'kondisi_kronis', 'Kronis', 'Penyakit Kronis'],
      alergi: ['Alergi', 'alergi', 'Kontraindikasi'],
      riwayatPenyakit: ['RiwayatPenyakit', 'Riwayat Penyakit', 'riwayat'],
      alamat: ['Alamat', 'alamat', 'Address', 'address', 'alamat_pm', 'AlamatPM'],
    };

    function getCol(row, key) {
      for (const alias of COL_MAP[key] || []) {
        if (row[alias] !== undefined && row[alias] !== '') return String(row[alias]).trim();
      }
      return '';
    }

    // Tanggal impor → YYYY-MM-DD. Menerima 2025-01-31, 31/01/2025, 31-01-2025, 31.01.2025 (urutan Indonesia: hari/bulan/tahun).
    function _normTglImpor(v) {
      const t = String(v == null ? '' : v).trim();
      if (!t) return '';
      let m = t.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
      if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
      m = t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2}|\d{4})$/);
      if (m) {
        let y = m[3]; if (y.length === 2) y = (Number(y) > 30 ? '19' : '20') + y;
        const d = Number(m[1]), b = Number(m[2]);
        if (b >= 1 && b <= 12 && d >= 1 && d <= 31) return y + '-' + String(b).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      }
      const d = new Date(t);
      return isNaN(d.getTime()) ? t : isoLokal(d);
    }
    function _normJKImpor(v) {
      const t = String(v == null ? '' : v).trim().toLowerCase();
      if (/^(l|lk|laki|laki-laki|laki laki|pria|male|m)$/.test(t)) return 'Laki-laki';
      if (/^(p|pr|perempuan|wanita|female|f)$/.test(t)) return 'Perempuan';
      return String(v == null ? '' : v).trim();
    }

    function processRows(rows, filename) {
      document.getElementById('importLoading').style.display = 'none';

      csvBuffer = rows.map(r => ({
        nomorInduk: getCol(r, 'nomorInduk'),
        namaPM: getCol(r, 'namaPM'),
        tglLahir: _normTglImpor(getCol(r, 'tglLahir')),
        jenisKelamin: _normJKImpor(getCol(r, 'jenisKelamin')),
        jenisDis: getCol(r, 'jenisDis'),
        kamarBlok: getCol(r, 'kamarBlok'),
        tglMasuk: _normTglImpor(getCol(r, 'tglMasuk')),
        golDarah: getCol(r, 'golDarah').toUpperCase(),
        kondisiKronis: getCol(r, 'kondisiKronis'),
        alergi: getCol(r, 'alergi'),
        riwayatPenyakit: getCol(r, 'riwayatPenyakit'),
        alamat: getCol(r, 'alamat'),
        tglDaftar: new Date().toISOString()
      })).filter(r => r.nomorInduk && r.namaPM && /^[A-Za-z0-9][A-Za-z0-9.\/_-]{2,29}$/.test(r.nomorInduk));
      // Nomor Induk yang muncul DUA KALI di file yang sama: hanya baris pertama yang dipakai
      // (dulu keduanya ikut diimpor → PM ganda dengan nomor induk sama).
      const _niDilihat = new Set();
      const sebelumDedup = csvBuffer.length;
      csvBuffer = csvBuffer.filter(r => { const k = r.nomorInduk.toLowerCase(); if (_niDilihat.has(k)) return false; _niDilihat.add(k); return true; });
      const gandaDiFile = sebelumDedup - csvBuffer.length;

      const totalBaris = rows.length;
      const valid = csvBuffer.length;
      const dilewati = totalBaris - valid - gandaDiFile;

      // Cek duplikat
      const duplikat = csvBuffer.filter(pm => state.penerima.find(p => p.nomorInduk === pm.nomorInduk));
      const baru = csvBuffer.filter(pm => !state.penerima.find(p => p.nomorInduk === pm.nomorInduk));

      document.getElementById('importSummaryTitle').textContent = `Preview Import — ${filename}`;
      document.getElementById('importInfo').textContent =
        `${totalBaris} baris terbaca · ${valid} valid · ${dilewati} dilewati (kosong / Nomor Induk tidak valid)` +
        (gandaDiFile ? ` · ${gandaDiFile} Nomor Induk ganda di file (dipakai baris pertama)` : '');

      // Duplikat warning
      const dupWarn = document.getElementById('duplikatWarning');
      if (duplikat.length > 0) {
        dupWarn.className = 'alert alert-warning show';
        dupWarn.innerHTML = `⚠️ <strong>${duplikat.length} Nomor Induk sudah ada</strong> di sistem: ${duplikat.slice(0, 5).map(d => '<code style="background:#fff;padding:1px 5px;border-radius:3px">' + escHtml(d.nomorInduk) + '</code>').join(', ')}${duplikat.length > 5 ? ' ...' : ''}. Baris ini akan <strong>dilewati</strong> saat import.`;
      } else {
        dupWarn.classList.remove('show');
      }

      // Preview tabel (semua data, baris duplikat diberi tanda)
      const preview = csvBuffer.slice(0, 50); // max 50 rows preview
      let html = `<div style="margin-bottom:.75rem;font-size:.82rem;color:var(--text-muted)">Menampilkan ${Math.min(preview.length, 50)} dari ${valid} data valid (baris duplikat ditandai 🔁):</div>
  <table>
    <thead><tr>
      <th>#</th><th>No. Induk</th><th>Nama Lengkap</th>
      <th>Disabilitas</th><th>Kamar</th><th>Tgl Masuk</th><th>Kronis</th><th>Status</th>
    </tr></thead><tbody>`;
      preview.forEach((r, i) => {
        const isDup = !!state.penerima.find(p => p.nomorInduk === r.nomorInduk);
        html += `<tr style="${isDup ? 'opacity:.6;background:#fff8f0' : ''}">
      <td style="font-family:'JetBrains Mono';font-size:.75rem">${escHtml(i + 1)}</td>
      <td><code style="background:var(--primary-pale);padding:1px 6px;border-radius:4px;font-size:.77rem">${escHtml(r.nomorInduk)}</code></td>
      <td style="font-weight:${isDup ? '400' : '600'}">${escHtml(r.namaPM)}</td>
      <td class="text-muted">${escHtml(r.jenisDis || '-')}</td>
      <td class="text-muted">${escHtml(r.kamarBlok || '-')}</td>
      <td class="text-muted" style="font-size:.78rem">${r.tglMasuk ? (() => { try { return new Date(r.tglMasuk).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}); } catch(e){ return escHtml(r.tglMasuk); }})() : '-'}</td>
      <td class="text-muted" style="font-size:.78rem">${escHtml(r.kondisiKronis || '-')}</td>
      <td>${isDup ? '<span class="badge badge-yellow">🔁 Duplikat</span>' : '<span class="badge badge-green">✓ Baru</span>'}</td>
    </tr>`;
      });
      html += '</tbody></table>';
      if (csvBuffer.length > 50) html += `<div style="text-align:center;color:var(--text-muted);padding:10px;font-size:.82rem">... dan ${csvBuffer.length - 50} data lainnya</div>`;
      document.getElementById('importTable').innerHTML = html;

      // Update tombol
      document.getElementById('btnImport').innerHTML = `<div class="spinner" id="spinImport"></div> 📥 Import ${escHtml(baru.length)} Data Baru`;
      document.getElementById('btnImport').disabled = false;

      goToStep(4);
      // Manually set step 4 active
      document.querySelectorAll('.import-step')[3].classList.add('active');
    }

    async function eksekusiImport() {
      const baru = csvBuffer.filter(pm => !state.penerima.find(p => p.nomorInduk === pm.nomorInduk));
      if (baru.length === 0) { alert('Tidak ada data baru untuk diimport.'); return; }

      setLoading('btnImport', 'spinImport', true);

      let tambah = 0, gagal = 0;
      for (const pm of baru) {
        if (!pm.updatedAt) pm.updatedAt = new Date().toISOString();
        state.penerima.push(pm);
        tambah++;
        if (state.scriptUrl) {
          const ok = await kirimKeSheets('addPM', pm);
          if (!ok) gagal++;
        }
      }

      saveState(); triggerSyncAfterSave(); renderListPM(); updateSelectPM(); renderDashboard();
      try { updateSelectPMPetugas(); updateSelectInsidental(); updateSelectRujukan(); updateSelectAsesmen(); } catch (e) {}
      setLoading('btnImport', 'spinImport', false);
      showToast('✅ Import PM berhasil disimpan!');
      csvBuffer = [];

      const alertBox = document.getElementById('importAlertBox');
      alertBox.className = 'alert alert-success show';
      alertBox.innerHTML = `✅ <strong>Import selesai!</strong> ${escHtml(tambah)} PM berhasil ditambahkan ke sistem.`
        + (gagal > 0 ? ` (${gagal} gagal sinkronisasi ke Sheets — data tetap tersimpan lokal)` : '')
        + ` <a href="#" onclick="switchTab('manual');renderListPM()" style="color:var(--primary);font-weight:600"> → Lihat daftar PM</a>`;
      document.getElementById('btnImport').textContent = '✅ Selesai';

      // Reset step
      setTimeout(() => goToStep(1), 8000);
    }

    function downloadTemplateXLSX() {
      loadSheetJS(() => {
        const data = [
          ['NomorInduk', 'NamaLengkap', 'TanggalLahir', 'JenisKelamin', 'JenisDisabilitas', 'Asrama', 'TanggalMasuk', 'GolonganDarah', 'KondisiKronis', 'Alergi', 'Alamat'],
          ['BDBP-2025-001', 'Contoh Nama Satu', '1990-01-15', 'Laki-laki', 'Daksa Bawah', 'ASTRA 1', '2025-01-10', 'A', 'Hipertensi', '', 'Jl. Sudirman No. 1, Pasuruan'],
          ['BDBP-2025-002', 'Contoh Nama Dua', '1985-07-22', 'Perempuan', 'Post Stroke', 'ASTRI 1', '2025-01-15', 'B', 'DM Tipe 2', 'Penisilin', 'Jl. Ahmad Yani No. 5, Malang'],
          ['BDBP-2025-003', 'Contoh Nama Tiga', '1978-03-30', 'Laki-laki', 'Cedera Tulang Belakang', 'ASTRA 2', '2025-02-01', 'O', '-', '', 'Jl. Merdeka No. 10, Surabaya'],
          ['BDBP-2025-004', 'Contoh Nama Empat', '1992-06-10', 'Perempuan', 'Daksa Atas', 'ASTRI 2', '2025-02-10', 'AB', '-', '', 'Jl. Pahlawan No. 3, Sidoarjo'],
          ['', '(Lanjutkan isi PM di bawah ini)', '', '', '', '', '', '', '', '', ''],
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 26 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 35 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data_PM');
        XLSX.writeFile(wb, 'Template_Import_PM_SIMKEDA.xlsx');
      });
    }

    function downloadTemplateCSV() {
      const csv = `NomorInduk,NamaLengkap,TanggalLahir,JenisKelamin,JenisDisabilitas,Asrama,TanggalMasuk,GolonganDarah,KondisiKronis,Alergi,Alamat
BDBP-2025-001,Contoh Nama Satu,1990-01-15,Laki-laki,Daksa Bawah,ASTRA 1,2025-01-10,A,Hipertensi,,Jl. Sudirman No. 1 Pasuruan
BDBP-2025-002,Contoh Nama Dua,1985-07-22,Perempuan,Post Stroke,ASTRI 1,2025-01-15,B,DM Tipe 2,Penisilin,Jl. Ahmad Yani No. 5 Malang`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'Template_Import_PM_SIMKEDA.csv';
      a.click();
    }

    // ══════════════════════════════════════
