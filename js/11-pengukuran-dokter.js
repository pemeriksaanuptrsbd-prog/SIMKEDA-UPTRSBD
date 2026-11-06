    // ══════════════════════════════════════
    //  PENGUKURAN AWAL (PETUGAS)
    // ══════════════════════════════════════
    function updateSelectPMPetugas() {
      const sel = document.getElementById('pilihPMPetugas');
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
      pmAcUpdateDisplay('pilihPMPetugas');
    }

    function onPilihPMPetugas() {
      const ni = document.getElementById('pilihPMPetugas').value;
      const pm = state.penerima.find(p => p.nomorInduk === ni);
      const box = document.getElementById('infoPMPetugas');
      if (!box) return;
      if (!pm) { box.style.display = 'none'; return; }
      const parts = [];
      if (pm.jenisDis) parts.push('Disabilitas: <strong>' + escHtml(pm.jenisDis) + '</strong>');
      if (pm.kamarBlok) parts.push('Asrama: <strong>' + escHtml(pm.kamarBlok) + '</strong>');
      if (pm.kondisiKronis && pm.kondisiKronis !== '-') parts.push('⚠️ Kronis: <strong style="color:var(--danger)">' + escHtml(pm.kondisiKronis) + '</strong>');
      if (pm.alergi) parts.push('🚫 Alergi: <strong style="color:var(--danger)">' + escHtml(pm.alergi) + '</strong>');
      document.getElementById('infoPMPetugasContent').innerHTML = parts.join(' &nbsp;·&nbsp; ');
      box.style.display = parts.length ? '' : 'none';
    }

    function cekSuhuAwal() {
      const v = parseFloat(document.getElementById('suhuAwal').value);
      const al = document.getElementById('vitalAlertAwal');
      if (!al) return;
      if (v > 37.5) { al.className = 'alert alert-warning show'; al.textContent = '⚠️ Suhu tinggi (' + v + '°C)'; }
      else if (v && v < 36) { al.className = 'alert alert-warning show'; al.textContent = '⚠️ Suhu rendah (' + v + '°C)'; }
      else al.classList.remove('show');
    }

    function cekSpo2Awal() {
      const v = parseFloat(document.getElementById('spo2Awal').value);
      const al = document.getElementById('vitalAlertAwal');
      if (!al) return;
      if (v && v < 95) { al.className = 'alert alert-warning show'; al.textContent = '⚠️ SpO2 rendah (' + v + '%)'; }
      else al.classList.remove('show');
    }

    async function simpanPengukuran(e) {
      if (e) e.preventDefault();
      const formPeng = document.getElementById('formPengukuran');
      const editId = formPeng ? formPeng.dataset.editId : null;
      let ni = document.getElementById('pilihPMPetugas').value;
      let tgl = document.getElementById('tglPengukuran').value;
      if (editId && (!ni || !tgl)) {
        const ex = (state.pengukuranAwal || []).find(x => String(x.id) === String(editId));
        if (ex) { if (!ni) ni = ex.nomorInduk; if (!tgl) tgl = ex.tglPengukuran; }
      }
      if (!ni || !tgl) { alert('PM dan tanggal wajib diisi!'); return; }
      const pm = state.penerima.find(p => p.nomorInduk === ni);
      const dataPeng = {
        id: editId || ('peng-' + Date.now()),
        nomorInduk: ni,
        namaPM: pm ? pm.namaPM : ni,
        kamarBlok: pm ? pm.kamarBlok : '',
        tglPengukuran: tgl,
        mingguKe: document.getElementById('mingguKePetugas').value,
        namaPetugas: document.getElementById('namaPetugasInput').value || state.namaPetugas || '',
        suhu: document.getElementById('suhuAwal').value,
        beratBadan: document.getElementById('beratAwal').value,
        tinggiBadan: document.getElementById('tinggiAwal').value,
        spo2: document.getElementById('spo2Awal').value,
        keluhan: document.getElementById('keluhanAwal').value,
        waktuInput: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (!_cekVitalSebelumSimpan({ tgl: tgl, suhu: dataPeng.suhu, bb: dataPeng.beratBadan, tb: dataPeng.tinggiBadan, spo2: dataPeng.spo2 }, 'alertPengukuran')) return;
      if (!state.pengukuranAwal) state.pengukuranAwal = [];
      if (editId) {
        // MODE EDIT: update data existing, pertahankan statusDokter
        const idx = state.pengukuranAwal.findIndex(x => String(x.id) === String(editId));
        const existing = idx !== -1 ? state.pengukuranAwal[idx] : null;
        dataPeng.statusDokter = existing ? existing.statusDokter : 'belum';
        if (existing && existing.waktuInput) dataPeng.waktuInput = existing.waktuInput;
        const _rekamBaru = existing ? { ...existing, ...dataPeng } : dataPeng;
        if (idx !== -1) state.pengukuranAwal[idx] = _rekamBaru;
        else state.pengukuranAwal.push(_rekamBaru);
        saveState();
        triggerSyncAfterSave(); renderDaftarPengukuran(); renderDaftarSiapPeriksa(); updateAntrianPickerPetugas();
        tandaiAntrianProsesSetelahUkur(ni);
        if (state.scriptUrl) kirimKeSheets('editPengukuran', _rekamBaru);
        delete formPeng.dataset.editId;
        const btnS = document.getElementById('btnSimpanPengukuran');
        if (btnS) { btnS.textContent = '💾 Simpan Pengukuran Awal'; btnS.style.background = ''; }
        const btnB = document.getElementById('btnBatalPengukuran');
        if (btnB) btnB.style.display = 'none';
        // Kosongkan form setelah edit (dulu isian tertinggal; klik Simpan lagi menimpa/menggandakan data)
        resetFormPengukuran();
        renderDaftarPengukuran();
        showAlert('alertPengukuran', 'success', '✅ Data pengukuran berhasil diperbarui!'); showToast('✅ Pengukuran berhasil diperbarui!');
      } else {
        // MODE BARU
        // Cek duplikat
        const existing = state.pengukuranAwal.find(x => !x._deleted && x.nomorInduk === ni && x.tglPengukuran === tgl);
        if (existing) {
          if (!confirm('Pengukuran hari ini untuk PM ini sudah ada. Timpa?')) return;
          // Pakai ID record lama supaya backend meng-update baris yang sama (upsert by id),
          // bukan membuat baris baru sementara baris lama jadi yatim di Google Sheets.
          dataPeng.id = existing.id;
          state.pengukuranAwal = state.pengukuranAwal.filter(x => x !== existing);
        }
        dataPeng.statusDokter = 'belum';
        state.pengukuranAwal.push(dataPeng);
        saveState(); triggerSyncAfterSave(); renderDaftarPengukuran(); renderDaftarSiapPeriksa(); updateAntrianPickerPetugas();
        tandaiAntrianProsesSetelahUkur(ni);
        if (state.scriptUrl) await kirimKeSheets('addPengukuran', dataPeng);
        showAlert('alertPengukuran', 'success', '✅ Pengukuran awal ' + (pm ? pm.namaPM : ni) + ' disimpan.'); showToast('✅ Pengukuran awal ' + (pm ? pm.namaPM : ni) + ' berhasil disimpan!');
        // Reset form tapi pertahankan tanggal yang baru disimpan agar tabel tetap menampilkan data hari ini
        const _tglBaru = tgl;
        resetFormPengukuran();
        // Jika tanggal yang disimpan bukan hari ini, kembalikan ke tanggal tsb agar tabel filter cocok
        const _now2 = new Date(); const _todayISO2 = _now2.getFullYear()+'-'+String(_now2.getMonth()+1).padStart(2,'0')+'-'+String(_now2.getDate()).padStart(2,'0');
        if (_tglBaru !== _todayISO2) { const tEl = document.getElementById('tglPengukuran'); if (tEl) tEl.value = _tglBaru; renderDaftarPengukuran(); }
      }
    }
    function resetFormPengukuran() {
      const form = document.getElementById('formPengukuran');
      if (form) { form.querySelectorAll('input,select,textarea').forEach(el => { if (el.type !== 'hidden') el.value = ''; }); }
      // Selalu kembalikan tanggal ke HARI INI setelah reset
      const tglEl = document.getElementById('tglPengukuran');
      if (tglEl) tglEl.value = isoLokal(new Date());
      // Kembalikan minggu ke sesuai tanggal hari ini
      const mgEl = document.getElementById('mingguKePetugas');
      if (mgEl) mgEl.value = String(getWeekOfMonth(new Date()));
      // Kembalikan nama petugas default
      const petEl = document.getElementById('namaPetugasInput');
      if (petEl && state.namaPetugas) petEl.value = state.namaPetugas;
      const box = document.getElementById('infoPMPetugas');
      if (box) box.style.display = 'none';
      const al = document.getElementById('vitalAlertAwal');
      if (al) al.classList.remove('show');
    }

    function renderDaftarPengukuran() {
      const tbody = document.getElementById('daftarPengukuranBody');
      if (!tbody) return;
      const _now = new Date();
      const today = _now.getFullYear() + '-' + String(_now.getMonth() + 1).padStart(2, '0') + '-' + String(_now.getDate()).padStart(2, '0');
      // Gunakan tanggal yang dipilih di form jika ada, fallback ke hari ini
      const tglFormEl = document.getElementById('tglPengukuran');
      const tglFilter = (tglFormEl && tglFormEl.value) ? tglFormEl.value : today;
      const list = (state.pengukuranAwal || []).filter(x => !x._deleted && x.tglPengukuran === tglFilter);
      const judulEl = document.querySelector('#page-pengukuran .card:nth-child(2) .section-title');
      if (judulEl) judulEl.textContent = '📋 Pengukuran ' + (tglFilter === today ? 'Hari Ini' : new Date(tglFilter + 'T00:00:00').toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})) + ' — Siap Diperiksa Dokter';
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:1.5rem">Belum ada pengukuran untuk tanggal ini</td></tr>'; return; }
      tbody.innerHTML = '';
      list.forEach(x => {
        const tr = document.createElement('tr');
        const statusBadge = x.statusDokter === 'sudah'
          ? '<span class="badge badge-green">✅ Diperiksa</span>'
          : '<span class="badge badge-yellow">⏳ Menunggu</span>';
        tr.innerHTML = '<td><strong>' + escHtml(x.namaPM) + '</strong></td>' +
          '<td class="text-muted">' + (escHtml(x.kamarBlok || '-')) + '</td>' +
          '<td>' + (x.suhu ? escHtml(x.suhu + '°C') : '-') + '</td>' +
          '<td>' + (x.beratBadan ? escHtml(x.beratBadan + 'kg') : '-') + (x.tinggiBadan ? escHtml(' / ' + x.tinggiBadan + 'cm') : '') + '</td>' +
          '<td>' + (x.spo2 ? escHtml(x.spo2 + '%') : '-') + '</td>' +
          '<td style="font-size:.8rem;max-width:150px">' + (escHtml(x.keluhan || '-')) + '</td>' +
          '<td>' + statusBadge + '</td><td></td>';
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-accent btn-sm'; btnEdit.textContent = '✏️'; btnEdit.title = 'Edit';
        btnEdit.onclick = () => editPengukuran(x.id);
        const btn = document.createElement('button');
        btn.className = 'btn btn-ghost btn-sm'; btn.style.color = 'var(--danger)'; btn.textContent = '🗑️';
        btn.onclick = () => hapusPengukuran(x.id);
        tr.lastElementChild.appendChild(btnEdit);
        tr.lastElementChild.appendChild(btn);
        tbody.appendChild(tr);
      });
    }

    function hapusPengukuran(id) {
      if (!confirm('Hapus data pengukuran ini?')) return;
      // ── Soft-delete: tandai _deleted agar tidak kembali saat auto-sync ──
      const idx = (state.pengukuranAwal || []).findIndex(x => String(x.id) === String(id));
      if (idx !== -1) {
        state.pengukuranAwal[idx] = { ...state.pengukuranAwal[idx], _deleted: true, updatedAt: new Date().toISOString() };
      }
      // Kirim penanda hapus ke server juga (dulu hanya di perangkat ini → data muncul lagi di perangkat lain)
      saveState(); triggerSyncAfterSave(); renderDaftarPengukuran(); renderDaftarSiapPeriksa();
      if (idx !== -1 && state.scriptUrl) {
        const rec = state.pengukuranAwal[idx];
        // Hapus barisnya langsung di server. (Dulu didahului editPengukuran berisi penanda
        // _deleted → kolom "_deleted" ikut tertulis permanen di spreadsheet.)
        kirimKeSheets('deletePengukuran', { id: rec.id });
      }
    }


    function editPengukuran(id) {
      const x = (state.pengukuranAwal || []).find(p => String(p.id) === String(id));
      if (!x) return;
      const formPeng = document.getElementById('formPengukuran');
      if (formPeng) formPeng.dataset.editId = id;
      showPage('pengukuran');
      setTimeout(() => {
        const set = (elId, val) => { const el = document.getElementById(elId); if (el) isiNilaiForm(el, val || ''); };
        set('pilihPMPetugas', x.nomorInduk);
        set('tglPengukuran', x.tglPengukuran);
        set('mingguKePetugas', x.mingguKe);
        set('namaPetugasInput', x.namaPetugas);
        set('suhuAwal', x.suhu);
        set('beratAwal', x.beratBadan);
        set('tinggiAwal', x.tinggiBadan);
        set('spo2Awal', x.spo2);
        set('keluhanAwal', x.keluhan);
        if (typeof onPilihPMPetugas === 'function') onPilihPMPetugas();
        const formCheck = document.getElementById('formPengukuran');
        if (formCheck) { formCheck.dataset.editId = id; formCheck.scrollIntoView({ behavior: 'smooth' }); }
        const btnSimpan = document.getElementById('btnSimpanPengukuran');
        if (btnSimpan) { btnSimpan.textContent = '✏️ Perbarui Pengukuran'; btnSimpan.style.background = 'var(--accent)'; }
        const btnBatal = document.getElementById('btnBatalPengukuran');
        if (btnBatal) btnBatal.style.display = '';
        showAlert('alertPengukuran', 'info', '✏️ Mode Edit — ubah data lalu klik Perbarui.');
      }, 100);
    }

    function batalEditPengukuran() {
      const formPeng = document.getElementById('formPengukuran');
      if (formPeng) { delete formPeng.dataset.editId; formPeng.reset(); }
      resetFormPengukuran();   // tanggal kembali ke hari ini (form.reset() mengosongkannya)
      renderDaftarPengukuran();
      const btnSimpan = document.getElementById('btnSimpanPengukuran');
      if (btnSimpan) { btnSimpan.textContent = '💾 Simpan Pengukuran Awal'; btnSimpan.style.background = ''; }
      const btnBatal = document.getElementById('btnBatalPengukuran');
      if (btnBatal) btnBatal.style.display = 'none';
      showAlert('alertPengukuran', 'info', 'Edit dibatalkan.');
    }
    function updateAntrianPickerPetugas() {
      const cont = document.getElementById('antrianPickerListPetugas');
      if (!cont) return;
      const today = new Date().toDateString();
      const list = state.antrian.filter(a => new Date(a.tglAntrian).toDateString() === today && a.status !== 'selesai' && a.status !== 'dihapus');
      cont.innerHTML = '';
      if (!list.length) {
        cont.innerHTML = '<span class="text-muted" style="font-size:.82rem">Tidak ada antrian hari ini</span>';
        return;
      }
      list.forEach(a => {
        const pm = state.penerima.find(p => p.nomorInduk === a.nomorInduk);
        const btn = document.createElement('button');
        btn.className = 'btn btn-accent btn-sm';
        btn.style.fontSize = '.8rem';
        btn.textContent = pm ? pm.namaPM : a.nomorInduk;
        btn.onclick = () => {
          const sel = document.getElementById('pilihPMPetugas');
          if (sel) { sel.value = a.nomorInduk; onPilihPMPetugas(); }
        };
        cont.appendChild(btn);
      });
    }

    function initWeekChipEl(elId) {
      const el = document.getElementById(elId);
      if (!el) return;
      const now = new Date();
      const wk = getWeekOfMonth(now);
      const mn = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()];
      el.textContent = 'Minggu ke-' + wk + ' · ' + mn + ' ' + now.getFullYear();
    }

    // ══════════════════════════════════════
    //  PEMERIKSAAN DOKTER — integrasi pengukuran awal
    // ══════════════════════════════════════
    function renderDaftarSiapPeriksa() {
      const cont = document.getElementById('daftarSiapPeriksa');
      if (!cont) return;
      const _nowS = new Date();
      const todayISO = _nowS.getFullYear() + '-' + String(_nowS.getMonth()+1).padStart(2,'0') + '-' + String(_nowS.getDate()).padStart(2,'0');
      // Batas 30 hari ke belakang agar data lama yang belum diperiksa tetap muncul
      const batas = new Date(_nowS - 30 * 86400000);
      const nomorAktif = new Set((state.penerima || []).map(p => p.nomorInduk));
      const siap = (state.pengukuranAwal || []).filter(x => !x._deleted)
        .filter(function(x) {
          const antrianSelesai = (state.antrian || []).some(function(a) {
            return a.nomorInduk === x.nomorInduk
              && a.status === 'selesai'
              && new Date(a.tglAntrian).toDateString() === new Date(x.tglPengukuran + 'T00:00:00').toDateString();
          });
          return x.statusDokter !== 'sudah'
            && !x.disembunyikanPetugas
            && !antrianSelesai
            && nomorAktif.has(x.nomorInduk)
            && new Date(x.tglPengukuran + 'T00:00:00') >= batas;
        })
        .sort((a, b) => new Date(b.tglPengukuran) - new Date(a.tglPengukuran));
      const antrianDarurat = (state.antrian || []).filter(a =>
        (a.prioritas === 'darurat' || a.prioritas === 'perlu_dokter')
        && a.status !== 'selesai' && a.status !== 'dihapus'
        && new Date(a.tglAntrian).toDateString() === _nowS.toDateString()
      );
      // Sembunyikan seluruh box jika kosong (baik dari pengukuran maupun insidental darurat)
      const box = document.getElementById('antrianPicker');
      cont.innerHTML = '';
      if (!siap.length && !antrianDarurat.length) {
        if (box) box.style.display = 'none';
        return;
      }
      if (box) box.style.display = '';
      siap.forEach(x => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:inline-flex;align-items:center;gap:0;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.12)';
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary btn-sm';
        btn.style.cssText = 'font-size:.8rem;border-radius:0;border-top-left-radius:8px;border-bottom-left-radius:8px;';
        btn.textContent = '📋 ' + x.namaPM + (x.suhu ? ' · ' + x.suhu + '°C' : '') + (x.tglPengukuran !== todayISO ? ' · ' + new Date(x.tglPengukuran + 'T00:00:00').toLocaleDateString('id-ID', {day:'numeric',month:'short'}) : '');
        btn.onclick = () => pilihPMDariPengukuran(x.nomorInduk);
        const del = document.createElement('button');
        del.className = 'btn btn-sm';
        del.title = 'Sembunyikan dari daftar (BUKAN menandai sudah diperiksa dokter)';
        del.style.cssText = 'font-size:.75rem;padding:0 7px;background:rgba(0,0,0,.18);color:#fff;border-radius:0;border-top-right-radius:8px;border-bottom-right-radius:8px;border-left:1px solid rgba(255,255,255,.2);';
        del.textContent = '✕';
        del.onclick = () => {
          if (!confirm('Sembunyikan "' + x.namaPM + '" dari daftar siap periksa?\n\nCatatan: ini HANYA menyembunyikan dari tampilan, BUKAN menandai bahwa dokter sudah memeriksa. Status pemeriksaan tetap "belum" sampai dokter benar-benar mengisi form Periksa Dokter.')) return;
          // Tandai sembunyi dari tampilan saja — TIDAK menyentuh statusDokter,
          // supaya "sudah diperiksa dokter" tetap murni berasal dari form Periksa Dokter.
          state.pengukuranAwal = (state.pengukuranAwal || []).map(item =>
            item.nomorInduk === x.nomorInduk && item.tglPengukuran === x.tglPengukuran
              ? { ...item, disembunyikanPetugas: true, updatedAt: new Date().toISOString() } : item
          );
          saveState(); triggerSyncAfterSave();
          renderDaftarSiapPeriksa();
        };
        wrap.appendChild(btn);
        wrap.appendChild(del);
        cont.appendChild(wrap);
      });

      // ── Tambahan: kasus Insidental Perlu Dokter/Darurat hari ini yang belum ditangani ──
      // Dokter tidak punya menu Antrian, jadi kasus ini WAJIB ikut tampil di sini juga.
      antrianDarurat.forEach(a => {
        const pmX = state.penerima.find(p => p.nomorInduk === a.nomorInduk);
        const namaX = pmX ? pmX.namaPM : a.nomorInduk;
        const wrap2 = document.createElement('div');
        wrap2.style.cssText = 'display:inline-flex;align-items:center;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.12)';
        const btn2 = document.createElement('button');
        btn2.className = 'btn btn-danger btn-sm';
        btn2.style.cssText = 'font-size:.8rem;border-radius:8px;';
        btn2.textContent = (a.prioritas === 'darurat' ? '🚨 DARURAT · ' : '⚡ Perlu Dokter · ') + namaX + ' (dari Insidental)';
        btn2.onclick = () => pilihPMDariPengukuran(a.nomorInduk);
        wrap2.appendChild(btn2);
        cont.appendChild(wrap2);
      });
    }


    function pilihPMDariPengukuran(ni) {
      const sel = document.getElementById('pilihanPM');
      if (sel) { sel.value = ni; onPilihPM(); }
    }

    function tampilHasilPengukuranAwal(ni) {
      const _nowP = new Date();
      const today = _nowP.getFullYear() + '-' + String(_nowP.getMonth() + 1).padStart(2, '0') + '-' + String(_nowP.getDate()).padStart(2, '0');
      // Cek juga tanggal pemeriksaan yang dipilih di form (mungkin beda dengan hari ini)
      const tglPeriksaEl = document.getElementById('tglPeriksa');
      const tglPeriksa = tglPeriksaEl ? tglPeriksaEl.value : '';
      // Pengukuran yang SAMA dengan yang akan dipakai saat simpan: tanggal periksa, atau ≤7 hari sebelumnya
      // (dulu tampilan & simpan bisa mengambil pengukuran berbulan-bulan lalu)
      const data = pilihPengukuranUntukPeriksa(ni, tglPeriksa || today);
      const box = document.getElementById('hasilPengukuranBox');
      const content = document.getElementById('hasilPengukuranContent');
      if (!box || !content) return;
      if (!data) { box.style.display = 'none'; return; }
      content.innerHTML = [
        data.suhu ? '<div style="padding:8px;background:white;border-radius:8px;text-align:center"><div style="font-size:.72rem;color:var(--text-muted)">Suhu</div><strong>' + escHtml(data.suhu) + '°C</strong></div>' : '',
        data.beratBadan ? '<div style="padding:8px;background:white;border-radius:8px;text-align:center"><div style="font-size:.72rem;color:var(--text-muted)">Berat Badan</div><strong>' + escHtml(data.beratBadan) + ' kg</strong></div>' : '',
        data.tinggiBadan ? '<div style="padding:8px;background:white;border-radius:8px;text-align:center"><div style="font-size:.72rem;color:var(--text-muted)">Tinggi Badan</div><strong>' + escHtml(data.tinggiBadan) + ' cm</strong></div>' : '',
        data.spo2 ? '<div style="padding:8px;background:white;border-radius:8px;text-align:center"><div style="font-size:.72rem;color:var(--text-muted)">SpO2</div><strong>' + escHtml(data.spo2) + '%</strong></div>' : '',
        data.keluhan ? '<div style="padding:8px;background:#fff8f0;border-radius:8px;grid-column:1/-1"><div style="font-size:.72rem;color:var(--text-muted)">Keluhan (Petugas)</div>' + escHtml(data.keluhan) + '</div>' : '',
        '<div style="padding:8px;background:white;border-radius:8px;text-align:center"><div style="font-size:.72rem;color:var(--text-muted)">Tgl Ukur</div><strong>' + (escHtml(data.tglPengukuran || '-')) + '</strong></div>',
        '<div style="padding:8px;background:white;border-radius:8px;text-align:center"><div style="font-size:.72rem;color:var(--text-muted)">Petugas</div><strong>' + escHtml(data.namaPetugas || '-') + '</strong></div>',
      ].filter(Boolean).join('');
      box.style.display = '';
      // Pre-fill tanggal dan minggu ke
      const mkEl = document.getElementById('mingguke'); if (mkEl && data.mingguKe && !mkEl.value) mkEl.value = data.mingguKe;
      const tglEl = document.getElementById('tglPeriksa'); if (tglEl && data.tglPengukuran && !tglEl.value) tglEl.value = data.tglPengukuran;
    }
    function initTTDCanvas() {
      const canvas = document.getElementById('ttdCanvas');
      if (!canvas || canvas._init) return;
      canvas._init = true;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#1a2332'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // Load saved TTD if any
      if (state.ttdDokterBase64) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = state.ttdDokterBase64;
        document.getElementById('ttdPlaceholder').style.display = 'none';
        document.getElementById('ttdStatus').textContent = 'TTD default dimuat';
      }

      const getPos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: (t.clientX - r.left) * (canvas.width / r.width), y: (t.clientY - r.top) * (canvas.height / r.height) };
      };
      const start = (e) => { e.preventDefault(); ttdDrawing = true; ttdLast = getPos(e); document.getElementById('ttdPlaceholder').style.display = 'none'; };
      let ttdDrawing = false;
      let ttdLast = { x: 0, y: 0 };

      const draw = (e) => {
        if (!ttdDrawing) return;
        e.preventDefault();

        const pos = getPos(e);

        ctx.beginPath();
        ctx.moveTo(ttdLast.x, ttdLast.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        ttdLast = pos;
      };
      const stop = () => { ttdDrawing = false; };
      canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stop); canvas.addEventListener('mouseleave', stop);
      canvas.addEventListener('touchstart', start, { passive: false }); canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', stop);
    }

    function hapusTTD() {
      const canvas = document.getElementById('ttdCanvas');
      if (!canvas) return;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      document.getElementById('ttdPlaceholder').style.display = '';
      document.getElementById('ttdStatus').textContent = '';
    }

    function simpanTTDDefault() {
      const canvas = document.getElementById('ttdCanvas');
      if (!canvas) return;
      state.ttdDokterBase64 = canvas.toDataURL();
      saveState();
      document.getElementById('ttdStatus').textContent = '✅ TTD disimpan sebagai default';
      showToast('✅ TTD Dokter berhasil disimpan sebagai default!');
      // Sync TTD ke Google Sheets agar semua device mendapatkan TTD yang sama
      if (state.scriptUrl) {
        kirimKeSheets('saveGlobalProfile', {
          namaPetugas: state.namaPetugas || '',
          defaultDokter: state.defaultDokter || '',
          namaKasi: state.namaKasi || '',
          ttdDokterBase64: state.ttdDokterBase64
        }).then(ok => {
          if (ok) showToast('☁️ TTD Dokter tersinkron ke semua perangkat!', 'success');
        });
      }
    }

    // ── Helper: kompres gambar TTD dari file ke base64 (max 320×110, JPEG 80%) ──
    function _kompresGambarTTD(file, callback) {
      if (!file || !file.type.startsWith('image/')) { alert('File harus berupa gambar!'); return; }
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const MAX_W = 320, MAX_H = 110;
          let w = img.width, h = img.height;
          if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
          if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d');
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          // ── Hapus background otomatis ─────────────────────────────────────
          // 1. Deteksi warna BG dari 9 titik sudut + tepi (bukan hanya 4 sudut)
          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;
          const px = (x, y) => { const i=(y*w+x)*4; return [d[i],d[i+1],d[i+2]]; };
          const mx = w-1, my = h-1, mx2 = Math.floor(w/2), my2 = Math.floor(h/2);
          // Sampel tepi: 4 sudut + 4 tengah tepi + 1 titik berpotensi BG (paling terang)
          const samples = [
            px(0,0), px(mx,0), px(0,my), px(mx,my),   // sudut
            px(mx2,0), px(mx2,my), px(0,my2), px(mx,my2) // tengah tepi
          ];
          // Ambil rata-rata dari sample yang "terang" (luminance > 100) agar
          // tidak terpengaruh sample yang kebetulan kena tinta TTD
          const bright = samples.filter(([r,g,b]) => (r*0.299+g*0.587+b*0.114) > 100);
          const pool = bright.length > 0 ? bright : samples;
          const bgR = Math.round(pool.reduce((s,c)=>s+c[0],0)/pool.length);
          const bgG = Math.round(pool.reduce((s,c)=>s+c[1],0)/pool.length);
          const bgB = Math.round(pool.reduce((s,c)=>s+c[2],0)/pool.length);
          const bgLum = bgR*0.299 + bgG*0.587 + bgB*0.114;

          // 2. Hapus pixel BG (hanya jika BG cukup terang — tidak proses BG gelap)
          if (bgLum > 80) {
            const THR = 45;   // toleransi warna cocok BG
            const FEATHER = 25; // zona transisi halus agar tepi TTD tidak kasar
            for (let i = 0; i < d.length; i += 4) {
              const r=d[i], g=d[i+1], b=d[i+2];
              const dist = Math.sqrt((r-bgR)**2 + (g-bgG)**2 + (b-bgB)**2);
              if (dist < THR) {
                d[i+3] = 0; // transparan penuh
              } else if (dist < THR + FEATHER) {
                // transisi halus → semakin jauh dari BG semakin opak
                d[i+3] = Math.round(((dist - THR) / FEATHER) * 255);
              }
              // dist >= THR+FEATHER → alpha tidak diubah (tetap opak = tinta TTD)
            }
            ctx.putImageData(imgData, 0, 0);
          }
          // ─────────────────────────────────────────────────────────────────

          const dataUrl = cv.toDataURL('image/png'); // PNG agar transparansi terjaga
          // Batas sel Google Sheets ±49.000 karakter — di atas itu TTD ditolak server
          if (dataUrl.length > 45000) {
            alert('Gambar TTD terlalu besar/rumit untuk disimpan. Coba foto TTD di kertas putih polos, dekat, dan terang.');
            return;
          }
          callback(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    // ── TTD KEPALA SEKSI ──
    function uploadTTDKasi() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = function(e) {
        _kompresGambarTTD(e.target.files[0], function(dataUrl) {
          state.ttdKasiBase64 = dataUrl;
          saveState();
          _refreshTTDPreview('ttdKasiPreview', 'ttdKasiEmpty', dataUrl);
          document.getElementById('ttdKasiStatus').textContent = '✅ TTD tersimpan';
          _sinkronTTD('ttdKasiBase64', dataUrl, 'ttdKasiStatus', 'TTD Kepala Seksi');
        });
      };
      input.click();
    }
    function hapusTTDKasiSetelan() {
      state.ttdKasiBase64 = '';
      saveState();
      _refreshTTDPreview('ttdKasiPreview', 'ttdKasiEmpty', '');
      document.getElementById('ttdKasiStatus').textContent = 'TTD dihapus';
      _sinkronTTD('ttdKasiBase64', '', 'ttdKasiStatus', 'TTD Kepala Seksi');
    }

    // ── TTD PETUGAS ──
    function uploadTTDPetugas() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = function(e) {
        _kompresGambarTTD(e.target.files[0], function(dataUrl) {
          state.ttdPetugasBase64 = dataUrl;
          saveState();
          _refreshTTDPreview('ttdPetugasPreview', 'ttdPetugasEmpty', dataUrl);
          document.getElementById('ttdPetugasStatus').textContent = '✅ TTD tersimpan';
          _sinkronTTD('ttdPetugasBase64', dataUrl, 'ttdPetugasStatus', 'TTD Petugas');
        });
      };
      input.click();
    }
    function hapusTTDPetugasSetelan() {
      state.ttdPetugasBase64 = '';
      saveState();
      _refreshTTDPreview('ttdPetugasPreview', 'ttdPetugasEmpty', '');
      document.getElementById('ttdPetugasStatus').textContent = 'TTD dihapus';
      _sinkronTTD('ttdPetugasBase64', '', 'ttdPetugasStatus', 'TTD Petugas');
    }

    // ── Helper: update preview box ──
    function _refreshTTDPreview(previewId, emptyId, dataUrl) {
      const box = document.getElementById(previewId);
      const emptyEl = document.getElementById(emptyId);
      if (!box) return;
      // Hapus img lama jika ada
      const oldImg = box.querySelector('img');
      if (oldImg) oldImg.remove();
      if (dataUrl && dataUrl.length > 10) {
        if (emptyEl) emptyEl.style.display = 'none';
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = 'max-width:196px;max-height:66px;object-fit:contain;display:block;';
        box.appendChild(img);
      } else {
        if (emptyEl) emptyEl.style.display = '';
      }
    }

    // ── Helper: sinkron satu TTD ke GlobalProfile di Sheets ──
    function _sinkronTTD(key, value, statusId, label) {
      if (!state.scriptUrl) return;
      const payload = { namaPetugas: state.namaPetugas||'', defaultDokter: state.defaultDokter||'', namaKasi: state.namaKasi||'' };
      payload[key] = value;
      kirimKeSheets('saveGlobalProfile', payload).then(ok => {
        const el = document.getElementById(statusId);
        if (el) el.textContent = ok ? '☁️ Tersinkron ke semua perangkat' : '⚠️ Gagal sinkron';
        if (ok) showToast('☁️ ' + label + ' tersinkron ke semua perangkat!', 'success');
      });
    }
