    // ══════════════════════════════════════
    //  STOK OBAT
    // ══════════════════════════════════════

    // ── Helper: ambil daftar obat dari form dinamis ──
    function ambilObatDariForm(konteks) {
      const listId = konteks === 'pemeriksaan' ? 'obatPemeriksaanList' : 'obatInsidentalList';
      const rows = document.querySelectorAll('#' + listId + ' .obat-row');
      const hasil = [];
      rows.forEach(function(row) {
        const namaEl   = row.querySelector('.obat-nama');
        const jmlEl    = row.querySelector('.obat-jml-val');
        const satEl    = row.querySelector('.obat-sat-val');
        const aturanEl = row.querySelector('.obat-aturan-val');
        const nama  = namaEl  ? namaEl.value.trim()           : '';
        const jml   = jmlEl   ? (parseFloat(jmlEl.value)||0)  : 0;
        const sat   = satEl   ? satEl.value.trim()             : '';
        const aturan = aturanEl ? aturanEl.value.trim()        : '';
        if (nama && jml > 0) hasil.push({ nama: nama, jumlah: jml, satuan: sat, aturanPakai: aturan });
      });
      return hasil;
    }

    // ── Reset baris obat di form ──
    function resetObatForm(konteks) {
      const listId = konteks === 'pemeriksaan' ? 'obatPemeriksaanList' : 'obatInsidentalList';
      const el = document.getElementById(listId);
      if (el) el.innerHTML = '';
    }

    // ── Tambah baris input obat ──
    // ── Satuan umum default ──
    const SATUAN_UMUM = ['Tablet','Kapsul','Kaplet','Sirup (ml)','Sachet','Salep (gr)','Tetes (ml)','Ampul','Vial','Suppositoria','Plester','Inhaler','Patch'];

    // ── Tutup semua dropdown obat ──
    function tutupSemuaObatDrop() {
      document.querySelectorAll('.obat-ac-drop').forEach(function(d){ d.classList.remove('show'); });
    }
    document.addEventListener('click', function(e){
      if (!e.target.closest('.obat-nama-wrap') && !e.target.closest('.obat-sat-wrap')) tutupSemuaObatDrop();
    });

    // ── Dropdown NAMA obat ──
    function tampilObatDrop(input) {
      const wrap = input.closest('.obat-nama-wrap');
      const drop = wrap ? wrap.querySelector('.obat-ac-drop') : null;
      if (!drop) return;
      const q = input.value.trim().toLowerCase();
      const stok = state.stokObat || [];
      const hasil = q ? stok.filter(function(o){ return o && o.nama && String(o.nama).toLowerCase().includes(q); }) : stok.filter(function(o){ return o && o.nama; });
      tutupSemuaObatDrop();
      if (!stok.length) {
        drop.innerHTML = '<div class="obat-ac-empty">Belum ada stok obat — isi di halaman Stok Obat</div>';
        drop.classList.add('show'); return;
      }
      if (!hasil.length) {
        drop.innerHTML = '<div class="obat-ac-empty">Tidak ditemukan — nama bisa diketik bebas</div>';
        drop.classList.add('show'); return;
      }
      drop.innerHTML = hasil.slice(0,30).map(function(o){
        const habis = (Number(o.stok)||0) <= 0;
        const low   = !habis && (Number(o.stok)||0) <= (Number(o.minimum)||10);
        const satuanAman = escHtml(o.satuan||'');
        const stokLabel = habis ? '❌ Habis' : low ? ('⚠️ Sisa '+o.stok+' '+satuanAman) : ('✓ '+o.stok+' '+satuanAman);
        const cls = (habis||low) ? 'low' : '';
        // Satuan dikodekan apa adanya (jsArg sudah mengamankan): dulu di-escHtml dulu sehingga
        // satuan seperti "Salep (gr) & krim" masuk ke form sebagai "&amp;".
        const nEnc = encodeURIComponent(o.nama), sEnc = encodeURIComponent(String(o.satuan||''));
        return '<div class="obat-ac-item" onmousedown="pilihObatDariDrop(this,\''+jsArg(nEnc)+'\',\''+jsArg(sEnc)+'\')">'+
          '<span class="ac-nama">'+escHtml(o.nama)+'</span>'+
          '<span class="ac-stok '+escHtml(cls)+'">'+escHtml(stokLabel)+'</span></div>';
      }).join('');
      drop.classList.add('show');
      _sorotPertamaObat(drop);
    }
    function pilihObatDariDrop(item, namaEnc, satEnc) {
      const wrap = item.closest('.obat-nama-wrap');
      if (!wrap) return;
      const input = wrap.querySelector('.obat-nama');
      const drop  = wrap.querySelector('.obat-ac-drop');
      const row   = wrap.closest('.obat-row');
      if (input) input.value = decodeURIComponent(namaEnc);
      if (drop)  drop.classList.remove('show');
      if (row) {
        const satEl = row.querySelector('.obat-sat-val');
        if (satEl && !satEl.value) { satEl.value = decodeURIComponent(satEnc); }
        const jmlEl = row.querySelector('.obat-jml-val');
        if (jmlEl) setTimeout(function(){ jmlEl.focus(); }, 60);
      }
    }
    // Papan ketik untuk saran obat/satuan: ↑/↓ pindah, Enter pilih, Esc tutup. Saran pertama otomatis tersorot.
    function _navDropObat(e, drop) {
      if (!drop || !drop.classList.contains('show')) return;
      var items = Array.prototype.slice.call(drop.querySelectorAll('.obat-ac-item'));
      if (!items.length) return;
      var i = items.findIndex(function(x) { return x.classList.contains('active'); });
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        items.forEach(function(x) { x.classList.remove('active'); });
        i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
        items[i].classList.add('active'); items[i].scrollIntoView({ block: 'nearest' });
        drop.dataset.nav = '1';
      } else if (e.key === 'Enter') {
        e.preventDefault();   // jangan mengirim formulir
        if (i >= 0) items[i].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        else drop.classList.remove('show');
      } else if (e.key === 'Tab') {
        if (drop.dataset.nav === '1' && i >= 0) { e.preventDefault(); items[i].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); }
        else drop.classList.remove('show');
      } else if (e.key === 'Escape') { drop.classList.remove('show'); }
    }
    function _sorotPertamaObat(drop) {
      drop.dataset.nav = '';
      var pertama = drop.querySelector('.obat-ac-item'); if (pertama) pertama.classList.add('active');
    }
    function navObatDrop(e, input) {
      const wrap = input.closest('.obat-nama-wrap');
      _navDropObat(e, wrap ? wrap.querySelector('.obat-ac-drop') : null);
    }

    // ── Dropdown SATUAN ──
    function tampilSatuanDrop(input) {
      const wrap = input.closest('.obat-sat-wrap');
      const drop = wrap ? wrap.querySelector('.obat-ac-drop') : null;
      if (!drop) return;
      const q = input.value.trim().toLowerCase();
      // Kumpulkan satuan dari stok obat (unik) + satuan umum
      const stokSatuan = [...new Set((state.stokObat||[]).map(function(o){ return o.satuan; }).filter(Boolean))];
      const semua = [...new Set([...stokSatuan, ...SATUAN_UMUM])];
      const hasil = q ? semua.filter(function(s){ return s.toLowerCase().includes(q); }) : semua;
      tutupSemuaObatDrop();
      drop.innerHTML = hasil.map(function(s){
        const isStok = stokSatuan.includes(s);
        return '<div class="obat-ac-item" onmousedown="pilihSatuanDariDrop(this,\''+encodeURIComponent(s)+'\')">'+
          '<span class="ac-nama">'+escHtml(s)+'</span>'+
          (isStok ? '<span class="ac-stok" style="color:var(--primary);font-size:.7rem">dari stok</span>' : '')+
          '</div>';
      }).join('') || '<div class="obat-ac-empty">Ketik satuan bebas</div>';
      drop.classList.add('show');      _sorotPertamaObat(drop);
    }
    function pilihSatuanDariDrop(item, satEnc) {
      const wrap = item.closest('.obat-sat-wrap');
      if (!wrap) return;
      const input = wrap.querySelector('.obat-sat-val');
      const drop  = wrap.querySelector('.obat-ac-drop');
      if (input) input.value = decodeURIComponent(satEnc);
      if (drop)  drop.classList.remove('show');
      // Fokus ke aturan pakai / jumlah berikutnya
      const row = wrap.closest('.obat-row');
      if (row) {
        const next = row.querySelector('.obat-aturan-val') || row.querySelector('.obat-jml-val');
        if (next) setTimeout(function(){ next.focus(); }, 60);
      }
    }
    function navSatuanDrop(e, input) {
      const wrap = input.closest('.obat-sat-wrap');
      _navDropObat(e, wrap ? wrap.querySelector('.obat-ac-drop') : null);
    }

    // ── Tambah baris input obat (card layout, mobile-friendly) ──
    function tambahBarisObat(konteks) {
      const listId = konteks === 'pemeriksaan' ? 'obatPemeriksaanList' : 'obatInsidentalList';
      const container = document.getElementById(listId);
      if (!container) return;
      const isPeriksa = konteks === 'pemeriksaan';
      const uid = 'ob-' + Date.now() + '-' + Math.random().toString(36).slice(2,5);
      const aturanHtml = isPeriksa
        ? '<div class="obat-aturan-wrap" style="display:flex;flex-direction:column;">'+
            '<label class="obat-field-label">Aturan Pakai</label>'+
            '<input type="text" class="obat-field obat-aturan-val" placeholder="Cth: 3\xD71 sesudah makan">'+
          '</div>'
        : '';
      const row = document.createElement('div');
      row.className = 'obat-row';
      row.innerHTML =
        // Nama Obat
        '<div class="obat-nama-wrap">'+
          '<label class="obat-field-label">Nama Obat</label>'+
          '<input type="text" class="obat-field obat-nama" id="'+escHtml(uid)+'" placeholder="Ketik nama obat..." '+
            'autocomplete="off" autocorrect="off" spellcheck="false" '+
            'oninput="tampilObatDrop(this)" onfocus="tampilObatDrop(this)" onkeydown="navObatDrop(event,this)">'+
          '<div class="obat-ac-drop"></div>'+
        '</div>'+
        // Jumlah
        '<div class="obat-jml-wrap" style="display:flex;flex-direction:column;">'+
          '<label class="obat-field-label">Jumlah</label>'+
          '<input type="number" class="obat-field obat-jml-val" placeholder="Jml" min="0.5" step="0.5">'+
        '</div>'+
        // Satuan (dropdown)
        '<div class="obat-sat-wrap">'+
          '<label class="obat-field-label">Satuan</label>'+
          '<input type="text" class="obat-field obat-sat-val" placeholder="Pilih / ketik..." '+
            'autocomplete="off" autocorrect="off" spellcheck="false" '+
            'oninput="tampilSatuanDrop(this)" onfocus="tampilSatuanDrop(this)" onkeydown="navSatuanDrop(event,this)">'+
          '<div class="obat-ac-drop"></div>'+
        '</div>'+
        aturanHtml +
        // Tombol hapus
        '<div class="obat-del">'+
          '<label class="obat-field-label" style="visibility:hidden">-</label>'+
          '<button type="button" onclick="this.closest(\'.obat-row\').remove()" '+
            'style="width:34px;height:38px;background:var(--danger-light);border:1.5px solid #f5c6cb;'+
            'border-radius:8px;color:var(--danger);font-size:1rem;cursor:pointer;'+
            'display:flex;align-items:center;justify-content:center;">\u2715</button>'+
        '</div>';
      container.appendChild(row);
      const inp = row.querySelector('.obat-nama');
      if (inp) setTimeout(function(){ inp.focus(); }, 60);
    }

    function autoSatuan(input, konteks) {
      const nama = input.value.trim();
      const obat = (state.stokObat||[]).find(function(o){ return String(o.nama||'').toLowerCase()===nama.toLowerCase(); });
      if (obat) {
        const row = input.closest('.obat-row');
        if (row) { const s = row.querySelector('.obat-sat-val'); if (s && !s.value) s.value = obat.satuan; }
      }
    }

    // ── Kirim perubahan jumlah stok ke server sebagai SELISIH (mis. -2), bukan angka akhir.
    //    Server menjumlahkannya di bawah kunci, jadi dua perangkat tidak saling menimpa. ──
    function _kirimSelisihStok(items) {
      const list = (items || []).filter(it => it && it.nama && Number(it.selisih));
      if (!list.length || !state.scriptUrl) return;
      kirimKeSheets('ubahStok', { items: list.map(it => ({ nama: it.nama, selisih: Number(it.selisih) })) });
    }
    // Data obat untuk dikirim ke server TANPA jumlah stok (stok hanya diubah lewat selisih)
    function _dataObatTanpaStok(o) {
      const d = Object.assign({}, o);
      delete d.stok;
      return d;
    }
    function _cariIdxObat(nama) {
      const k = String(nama == null ? '' : nama).trim().toLowerCase();
      return (state.stokObat || []).findIndex(o => String(o.nama || '').trim().toLowerCase() === k);
    }

    // ── Pemakaian obat oleh PM (bukan stok masuk/keluar manual) ──
    // Dulu rekap "obat digunakan" ikut menjumlahkan stok MASUK (termasuk stok awal obat baru).
    function _isPemakaian(o) { return !!o && o.sumber !== 'manual' && (Number(o.jumlah) || 0) > 0; }

    // Hapus catatan pemakaian obat milik satu pemeriksaan/insidental (dipakai saat rekaman itu
    // dihapus atau daftar obatnya diedit). Mengembalikan daftar ID yang dihapus.
    // kirim=true → hapus juga di server (aksi deleteObatKeluar).
    function _hapusLogObatSumber(sumber, rec, kirim) {
      if (!rec || !Array.isArray(state.obatKeluar)) return [];
      const kode = sumber === 'pemeriksaan' ? 'p' : 'i';
      const awalan = 'ok-sync-' + kode + '-' + String(rec.id) + '-';
      const tgl = normTgl(sumber === 'pemeriksaan' ? rec.tglPeriksa : rec.tgl);
      const namaPM = String(rec.namaPM || '').toLowerCase();
      // Catatan lama (sebelum ada refId) dicocokkan per nama obat, maksimal sebanyak obat di rekaman
      const sisa = {};
      (rec.obatDiberikan || []).forEach(o => { const k = String(o.nama || '').trim().replace(/\s+/g, ' ').toLowerCase(); if (k) sisa[k] = (sisa[k] || 0) + 1; });
      const ids = [];
      state.obatKeluar = state.obatKeluar.filter(o => {
        if (!o) return false;
        let cocok = false;
        if (o.refId) cocok = String(o.refId) === String(rec.id) && o.sumber === sumber;
        else if (String(o.id || '').indexOf(awalan) === 0) cocok = true;
        else if (o.sumber === sumber && normTgl(o.tgl) === tgl && String(o.namaPM || '').toLowerCase() === namaPM) {
          const k = String(o.namaObat || '').trim().replace(/\s+/g, ' ').toLowerCase();
          if (sisa[k] > 0) { sisa[k]--; cocok = true; }
        }
        if (cocok) ids.push(String(o.id));
        return !cocok;
      });
      // ID sintetis bersifat tetap (sama di semua perangkat) → ikut dihapus di server bila pernah terkirim
      (rec.obatDiberikan || []).forEach((_, i) => { if (ids.indexOf(awalan + i) === -1) ids.push(awalan + i); });
      if (kirim && state.scriptUrl && ids.length) kirimKeSheets('deleteObatKeluar', { ids: ids });
      return ids;
    }

    // Edit pemeriksaan/insidental: catatan pemakaian lama diganti dengan daftar obat yang baru
    // (jumlah stok dikoreksi terpisah oleh terapkanKoreksiStokEdit).
    function _gantiLogObatSumber(sumber, recLama, recBaru) {
      const lamaStr = JSON.stringify((recLama && recLama.obatDiberikan) || []);
      const baruStr = JSON.stringify((recBaru && recBaru.obatDiberikan) || []);
      const tglLama = recLama ? (sumber === 'pemeriksaan' ? recLama.tglPeriksa : recLama.tgl) : '';
      const tglBaru = recBaru ? (sumber === 'pemeriksaan' ? recBaru.tglPeriksa : recBaru.tgl) : '';
      if (lamaStr === baruStr && String(tglLama) === String(tglBaru)) return;   // obat & tanggal tidak berubah
      if (recLama) _hapusLogObatSumber(sumber, recLama, true);
      if (recBaru && (recBaru.obatDiberikan || []).length) {
        catatPemakaianObat(recBaru.obatDiberikan, recBaru.namaPM, sumber,
          sumber === 'pemeriksaan' ? recBaru.namaDokter : recBaru.petugas, tglBaru, recBaru.id, false);
      } else {
        saveState(); renderRekapObat(); renderLogMutasi(); updateStokStats();
      }
    }

    // ── Catat pemakaian obat & kurangi stok ──
    // refId = ID pemeriksaan/insidental asal; kurangiStok=false → hanya mencatat (dipakai saat edit)
    function catatPemakaianObat(obatList, namaPM, sumber, petugas, tgl, refId, kurangiStok) {
      if (!obatList || obatList.length === 0) return;
      if (kurangiStok === undefined) kurangiStok = true;
      if (!state.obatKeluar) state.obatKeluar = [];
      if (!state.stokObat) state.stokObat = [];
      const newEntries = [];
      const selisihStok = [];
      obatList.forEach(item => {
        const namaBersih = String(item.nama || '').trim().replace(/\s+/g, ' ');
        const stokIdx = _cariIdxObat(namaBersih);
        let sisaStok = null;
        // Pakai nama BAKU dari master Stok Obat kalau cocok, supaya rekap/mutasi tidak
        // pecah gara-gara beda spasi/kapitalisasi saat petugas mengetik manual.
        const namaFinal = stokIdx !== -1 ? state.stokObat[stokIdx].nama : namaBersih;
        if (stokIdx !== -1 && kurangiStok) {
          const _jml = parseFloat(item.jumlah) || 0;
          state.stokObat[stokIdx].stok = Math.max(0, (Number(state.stokObat[stokIdx].stok) || 0) - _jml);
          state.stokObat[stokIdx].updatedAt = new Date().toISOString();
          selisihStok.push({ nama: namaFinal, selisih: -_jml });
        }
        if (stokIdx !== -1) sisaStok = state.stokObat[stokIdx].stok;
        const entry = {
          id: 'ok-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
          tgl: normTgl(tgl) || isoLokal(new Date()),
          namaObat: namaFinal, jumlah: Number(item.jumlah) || 0, satuan: item.satuan,
          namaPM: namaPM || '-', sumber, petugas: petugas || '', sisaStok,
          refId: refId ? String(refId) : '',
          waktuInput: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        state.obatKeluar.unshift(entry);
        newEntries.push(entry);
      });
      saveState(); updateStokStats(); renderStokObat(); renderRekapObat(); renderLogMutasi(); updateSelectMutasiObat(); updateSelectObatPM();
      if (state.scriptUrl) {
        // Kirim pengurangan stok (selisih) + setiap entri pemakaian ke Sheets
        _kirimSelisihStok(selisihStok);
        newEntries.forEach(entry => kirimKeSheets('addObatKeluar', entry));
      }
    }

    // ── Helper: normalisasi tanggal ke YYYY-MM-DD ──
    function normTgl(val) {
      if (!val) return '';
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        // Gunakan waktu lokal (bukan UTC) agar tanggal tidak geser
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const dd = String(d.getDate()).padStart(2,'0');
        return y + '-' + m + '-' + dd;
      } catch(e) { return ''; }
    }

    // ══════════════════════════════════════
    //  REBUILD obatKeluar dari data sync
    //  (fix: HP lain tidak punya log lokal)
    // ══════════════════════════════════════
    function rebuildObatKeluarDariSync() {
      if (!state.obatKeluar) state.obatKeluar = [];
      const _k = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const kunci = (tgl, nama, pm, sumber) => [normTgl(tgl), _k(nama), _k(pm), sumber].join('|');
      const sintetis = o => String((o && o.id) || '').indexOf('ok-sync-') === 0;

      // Rekaman sumber yang masih ada (insidental yang sudah dihapus tidak dihitung)
      const sumberAda = {};
      (state.pemeriksaan || []).forEach(p => { if (p && !p._deleted) sumberAda['p-' + String(p.id)] = 1; });
      (state.insidental || []).forEach(x => { if (x && !x._deleted) sumberAda['i-' + String(x.id)] = 1; });

      // Catatan asli (bukan sintetis): per kunci tgl|obat|PM|sumber, dan per refId
      const lookup = {};
      const refAda = {};
      state.obatKeluar.forEach(o => {
        if (!o || sintetis(o)) return;
        const k = kunci(o.tgl, o.namaObat, o.namaPM, o.sumber);
        lookup[k] = (lookup[k] || 0) + 1;
        if (o.refId) refAda[o.sumber + '|' + String(o.refId)] = 1;
      });

      // ── Buang catatan sintetis yang tidak berlaku lagi ──
      // (rekaman asalnya sudah dihapus, atau sudah ada catatan asli yang sama → dulu terhitung dua kali)
      let berubah = false;
      state.obatKeluar = state.obatKeluar.filter(o => {
        if (!o) { berubah = true; return false; }
        if (!sintetis(o)) return true;
        const m = String(o.id).match(/^ok-sync-([pi])-(.*)-\d+$/);
        const buang = !m || !sumberAda[m[1] + '-' + m[2]] ||
          refAda[(m[1] === 'p' ? 'pemeriksaan' : 'insidental') + '|' + m[2]] ||
          lookup[kunci(o.tgl, o.namaObat, o.namaPM, o.sumber)] > 0;
        if (buang) berubah = true;
        return !buang;
      });
      const existingIds = new Set(state.obatKeluar.map(o => o.id));

      let added = 0;
      const tambah = (rec, kode, sumber, tgl, petugas) => {
        if (!rec || rec._deleted || !Array.isArray(rec.obatDiberikan) || !rec.obatDiberikan.length) return;
        if (refAda[sumber + '|' + String(rec.id)]) return;   // sudah tercatat lewat refId
        const pakai = {};
        rec.obatDiberikan.forEach(function(ob, idx) {
          if (!ob || !ob.nama || !((Number(ob.jumlah) || 0) > 0)) return;
          const synId = 'ok-sync-' + kode + '-' + String(rec.id) + '-' + idx;
          if (existingIds.has(synId)) return;
          const key = kunci(tgl, ob.nama, rec.namaPM, sumber);
          pakai[key] = (pakai[key] || 0) + 1;
          if ((lookup[key] || 0) >= pakai[key]) return;   // sudah ada catatan asli yang sama
          state.obatKeluar.push({
            id: synId,
            tgl: normTgl(tgl),
            namaObat: ob.nama, jumlah: Number(ob.jumlah) || 0, satuan: ob.satuan || '',
            namaPM: rec.namaPM || '-', sumber: sumber,
            petugas: petugas || '',
            sisaStok: null,
            refId: String(rec.id),
            waktuInput: rec.waktuInput || rec.updatedAt || tgl || '',
            updatedAt: rec.updatedAt || ''
          });
          existingIds.add(synId);
          added++;
        });
      };
      // ── Rekonstruksi dari pemeriksaan & insidental (HP lain tidak punya log lokal) ──
      (state.pemeriksaan || []).forEach(p => tambah(p, 'p', 'pemeriksaan', p && p.tglPeriksa, p && p.namaDokter));
      (state.insidental || []).forEach(x => tambah(x, 'i', 'insidental', x && x.tgl, x && x.petugas));

      if (added > 0 || berubah) {
        // Urutkan kembali setelah rebuild
        state.obatKeluar.sort(function(a, b) {
          return new Date(b.waktuInput || b.tgl || 0) - new Date(a.waktuInput || a.tgl || 0);
        });
        saveState();
      }
      return added;
    }

    function updateStokStats() {
      const stok = state.stokObat || [];
      const now = new Date();
      const bulanIni = now.getMonth() + 1, tahunIni = now.getFullYear();
      const el = id => document.getElementById(id);
      if (el('stokStatTotal')) el('stokStatTotal').textContent = stok.length;
      if (el('stokStatHampirHabis')) el('stokStatHampirHabis').textContent = stok.filter(o => (Number(o.stok)||0) > 0 && (Number(o.stok)||0) <= (Number(o.minimum)||10)).length;
      if (el('stokStatHabis')) el('stokStatHabis').textContent = stok.filter(o => (Number(o.stok)||0) <= 0 && stok.length > 0).length;
      const keluarBulan = (state.obatKeluar||[]).filter(o => {
        const d = new Date(o.tgl||o.waktuInput);
        return d.getMonth()+1===bulanIni && d.getFullYear()===tahunIni && _isPemakaian(o);
      }).reduce((s,o) => s + (Number(o.jumlah)||0), 0);
      if (el('stokStatKeluarBulan')) el('stokStatKeluarBulan').textContent = keluarBulan;
      // PM dapat obat bulan ini (unik)
      const pmBulanIni = new Set((state.obatKeluar||[]).filter(o => {
        const d = new Date(o.tgl||o.waktuInput);
        return d.getMonth()+1===bulanIni && d.getFullYear()===tahunIni && _isPemakaian(o) && o.namaPM && o.namaPM !== '-';
      }).map(o => _normNama(o.namaPM)));
      if (el('stokStatPMBulan')) el('stokStatPMBulan').textContent = pmBulanIni.size;
    }

    function renderPMPerBulan() {
      const container = document.getElementById('pmPerBulanTable');
      if (!container) return;
      const BULAN_F = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      // Per bulan: PM dihitung berdasarkan NAMA (huruf besar/kecil & spasi ganda diabaikan) → nama sama = 1 PM
      const byMonth = {};
      (state.obatKeluar||[]).forEach(o => {
        if (!o.namaPM || o.namaPM === '-' || !_isPemakaian(o)) return;
        const d = new Date(o.tgl||o.waktuInput);
        if (!d || isNaN(d.getTime()) || d.getFullYear() < 2020) return;
        const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
        if (!byMonth[key]) byMonth[key] = { bulan: d.getMonth()+1, tahun: d.getFullYear(), pm: new Map(), jml: 0, kali: 0 };
        const k = _normNama(o.namaPM);
        const e = byMonth[key].pm.get(k) || { nama: String(o.namaPM).replace(/\s+/g,' ').trim(), n: 0, ragam: new Set() };
        e.n++; e.ragam.add(String(o.namaPM)); byMonth[key].pm.set(k, e);
        byMonth[key].kali++;
        byMonth[key].jml += (Number(o.jumlah)||0);
      });
      const sorted = Object.keys(byMonth).sort().reverse();
      if (!sorted.length) {
        container.innerHTML = '<div style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:1rem;">Belum ada data pemakaian obat</div>';
        return;
      }
      const th = 'padding:7px 12px;border:1px solid var(--border);';
      let html = '<div class="table-wrap"><table data-no-analisis="1" style="width:100%;border-collapse:collapse;font-size:.87rem;min-width:560px;">';
      html += '<thead><tr style="background:var(--primary-pale);">';
      html += '<th style="'+th+'text-align:center;width:28px;">No</th>';
      html += '<th style="'+th+'">Bulan</th>';
      html += '<th style="'+th+'text-align:center;">Jumlah PM<div style="font-weight:400;font-size:.68rem;color:var(--text-muted);">nama yang sama dihitung 1 PM</div></th>';
      html += '<th style="'+th+'text-align:center;">Kali Menerima<div style="font-weight:400;font-size:.68rem;color:var(--text-muted);">jumlah seluruh penerimaan</div></th>';
      html += '<th style="'+th+'text-align:center;">Total Unit Obat</th>';
      html += '<th style="'+th+'">Nama PM <span style="font-weight:400;font-size:.7rem;color:var(--text-muted);">(angka dalam kurung = jumlah penerimaan)</span></th></tr></thead><tbody id="pmBulanRows">';
      sorted.forEach((key, i) => {
        const d = byMonth[key];
        const pmList = [...d.pm.values()].sort((a,b) => a.nama.localeCompare(b.nama,'id'));
        const ulang = pmList.filter(e => e.n > 1).length;
        const namaTxt = pmList.map(e => e.n > 1 ? e.nama + ' (' + e.n + ' kali)' : e.nama).join(', ');
        html += `<tr style="${i%2?'background:#fafafa':''}">
          <td style="${th}text-align:center;font-weight:700;color:var(--text-muted);">${escHtml(i+1)}</td>
          <td style="${th}font-weight:600;">${escHtml(BULAN_F[d.bulan])} ${escHtml(d.tahun)}</td>
          <td style="${th}text-align:center;"><div style="font-size:1.1rem;font-weight:700;color:var(--primary);">${escHtml(d.pm.size)}</div>
            <div style="font-size:.68rem;color:var(--text-muted);">${ulang ? escHtml(ulang)+' PM menerima lebih dari 1 kali (dihitung 1 PM)' : 'tidak ada nama ganda'}</div></td>
          <td style="${th}text-align:center;font-family:'JetBrains Mono',monospace;font-weight:600;">${escHtml(d.kali)}</td>
          <td style="${th}text-align:center;font-family:'JetBrains Mono',monospace;font-weight:600;">${escHtml(d.jml)}</td>
          <td style="${th}font-size:.8rem;color:var(--text-muted);">${escHtml(namaTxt)}</td>
        </tr>`;
      });
      html += '</tbody></table></div>';
      container.innerHTML = html;
      _pasangFilterTabel(container);
    }

    function togglePMPerBulan() {
      const body = document.getElementById('pmPerBulanBody');
      const icon = document.getElementById('pmPerBulanToggleIcon');
      if (!body) return;
      const hidden = body.style.display === 'none';
      body.style.display = hidden ? '' : 'none';
      if (icon) icon.textContent = hidden ? '▲ Sembunyikan' : '▼ Tampilkan';
      if (hidden) renderPMPerBulan();
    }

    function renderStokObat(q) {
      const tbody = document.getElementById('tabelStokBody');
      if (!tbody) return;
      let list = [...(state.stokObat || [])].filter(o => o && o.nama).sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
      if (q) list = list.filter(o => String(o.nama).toLowerCase().includes(String(q).toLowerCase()));
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:1.5rem;">Belum ada data obat — tambahkan di form di atas</td></tr>';
        updateStokStats(); return;
      }
      const now = new Date();
      tbody.innerHTML = '';
      list.forEach((o, i) => {
        const stok = Number(o.stok) || 0, min = Number(o.minimum) || 10;
        let badge = '<span class="badge badge-green">✅ Aman</span>';
        if (stok <= 0) badge = '<span class="badge badge-red">🔴 Habis</span>';
        else if (stok <= min) badge = '<span class="badge badge-yellow">⚠️ Hampir Habis</span>';
        let kd = o.kadaluarsa || '-', kdStyle = '';
        if (o.kadaluarsa) {
          const diff = Math.round((_tglLokalMs(o.kadaluarsa) - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
          if (diff < 0) { kdStyle = 'color:var(--danger);font-weight:700;'; kd += ' ⚠️Expired'; }
          else if (diff <= 30) { kdStyle = 'color:var(--accent);font-weight:600;'; kd += ' (!'+diff+'hr)'; }
        }
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">${escHtml(i+1)}</td>
          <td><strong>${escHtml(o.nama)}</strong></td><td>${escHtml(o.satuan||'-')}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${stok<=0?'var(--danger)':stok<=min?'var(--accent)':'var(--primary)'}">${escHtml(stok)}</td>
          <td style="color:var(--text-muted)">${escHtml(min)}</td>
          <td style="${escHtml(kdStyle)}">${escHtml(kd)}</td>
          <td>${escHtml(o.keterangan||'-')}</td><td>${badge}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-ghost btn-sm" onclick="editStokObat('${jsArg(o.nama)}')">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="hapusStokObat('${jsArg(o.nama)}')" style="color:var(--danger)">🗑️</button>
          </td>`;
        tbody.appendChild(tr);
      });
      updateStokStats();
    }

    function filterStok(q) { renderStokObat(q); }

    function simpanStokObat() {
      const nama = document.getElementById('stokNamaObat').value.trim();
      const satuan = document.getElementById('stokSatuan').value.trim();
      if (!nama || !satuan) { showAlert('alertStok', 'error', '❌ Nama obat dan satuan wajib diisi!'); return; }
      // Edit memakai NAMA obat yang sedang diedit (bukan nomor urut) — urutan bisa berubah saat sinkron
      const _editNama = document.getElementById('stokNamaObat').dataset.editNama;
      const editIdx = _editNama !== undefined ? _cariIdxObat(_editNama) : -1;
      const data = {
        nama, satuan,
        stok: parseFloat(document.getElementById('stokJumlah').value) || 0,
        minimum: parseFloat(document.getElementById('stokMinimum').value) || 10,
        kadaluarsa: document.getElementById('stokKadaluarsa').value || '',
        keterangan: document.getElementById('stokKeterangan').value.trim(),
        updatedAt: new Date().toISOString()
      };
      if (!state.stokObat) state.stokObat = [];
      if (!state.obatKeluar) state.obatKeluar = [];

      // ── Helper: catat mutasi stok (masuk/keluar) agar muncul di Riwayat Mutasi Stok ──
      const catatMutasi = (namaObat, satuanObat, selisih, sisaStokBaru, ket) => {
        if (!selisih) return; // tidak ada perubahan jumlah, tidak perlu dicatat
        const entry = {
          id: 'mut-' + Date.now() + '-' + Math.round(Math.random() * 1000),
          tgl: isoLokal(new Date()),
          namaObat, jumlah: selisih,
          satuan: satuanObat || '',
          namaPM: '-', sumber: 'manual',
          petugas: state.namaPetugas || '',
          keterangan: (selisih > 0 ? 'Stok Masuk' : 'Stok Keluar') + (ket ? ': ' + ket : ''),
          sisaStok: sisaStokBaru, waktuInput: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        state.obatKeluar.unshift(entry);
        if (state.scriptUrl) kirimKeSheets('addObatKeluar', entry);
      };

      const kirim = [];   // [aksi, data] dikirim berurutan setelah state disimpan
      if (editIdx >= 0) {
        const lama = state.stokObat[editIdx];
        const stokLama = Number(lama.stok) || 0;
        if (String(lama.nama).toLowerCase() !== nama.toLowerCase() && _cariIdxObat(nama) !== -1) {
          showAlert('alertStok', 'error', '❌ Nama obat "' + nama + '" sudah ada di daftar.'); return;
        }
        state.stokObat[editIdx] = { ...lama, ...data };
        const selisih = data.stok - stokLama;
        catatMutasi(nama, satuan, selisih, data.stok, 'Koreksi/edit data obat');
        if (String(lama.nama) !== nama) {
          // Ganti nama = hapus baris lama + tambah baris baru (ID stok adalah nama obat)
          kirim.push(['deleteStokObat', { nama: lama.nama }]);
          kirim.push(['addStokObat', state.stokObat[editIdx]]);
        } else {
          kirim.push(['editStokObat', _dataObatTanpaStok(state.stokObat[editIdx])]);
          if (selisih) kirim.push(['ubahStok', { items: [{ nama: nama, selisih: selisih }] }]);
        }
        showAlert('alertStok', 'success', '✅ Data obat berhasil diperbarui!');
      } else {
        const exists = _cariIdxObat(nama);
        if (exists >= 0) {
          state.stokObat[exists].stok = (Number(state.stokObat[exists].stok) || 0) + data.stok;
          if (data.kadaluarsa) state.stokObat[exists].kadaluarsa = data.kadaluarsa;
          if (data.keterangan) state.stokObat[exists].keterangan = data.keterangan;
          state.stokObat[exists].minimum = data.minimum;
          state.stokObat[exists].updatedAt = data.updatedAt;
          catatMutasi(state.stokObat[exists].nama, state.stokObat[exists].satuan, data.stok, state.stokObat[exists].stok, 'Penambahan stok obat');
          kirim.push(['editStokObat', _dataObatTanpaStok(state.stokObat[exists])]);
          if (data.stok) kirim.push(['ubahStok', { items: [{ nama: state.stokObat[exists].nama, selisih: data.stok }] }]);
          showAlert('alertStok', 'info', 'ℹ️ Obat sudah ada — stok ditambahkan!');
        } else {
          state.stokObat.push(data);
          catatMutasi(nama, satuan, data.stok, data.stok, 'Stok awal obat baru');
          kirim.push(['addStokObat', data]);
          showAlert('alertStok', 'success', '✅ Obat baru berhasil ditambahkan!');
        }
      }
      saveState(); batalEditStok(); renderStokObat(); updateSelectMutasiObat(); renderLogMutasi(); renderRekapObat(); showToast('💊 Stok obat disimpan!');
      if (state.scriptUrl) {
        (async () => { for (const [aksi, d] of kirim) await kirimKeSheets(aksi, d); })();
      }
    }

    function editStokObat(namaAtauIdx) {
      const idx = typeof namaAtauIdx === 'number' ? namaAtauIdx : _cariIdxObat(namaAtauIdx);
      const o = state.stokObat[idx]; if (!o) return;
      document.getElementById('stokNamaObat').value = o.nama;
      document.getElementById('stokNamaObat').dataset.editNama = o.nama;
      document.getElementById('stokSatuan').value = o.satuan || '';
      document.getElementById('stokJumlah').value = o.stok || 0;
      document.getElementById('stokMinimum').value = o.minimum || 10;
      document.getElementById('stokKadaluarsa').value = o.kadaluarsa || '';
      document.getElementById('stokKeterangan').value = o.keterangan || '';
      document.getElementById('btnBatalEditStok').style.display = '';
      document.getElementById('stokNamaObat').focus();
    }

    function batalEditStok() {
      ['stokNamaObat','stokSatuan','stokJumlah','stokMinimum','stokKadaluarsa','stokKeterangan'].forEach(id => {
        const el = document.getElementById(id); if (el) { el.value = ''; delete el.dataset.editIdx; delete el.dataset.editNama; }
      });
      const b = document.getElementById('btnBatalEditStok'); if (b) b.style.display = 'none';
    }

    function hapusStokObat(namaAtauIdx) {
      const idx = typeof namaAtauIdx === 'number' ? namaAtauIdx : _cariIdxObat(namaAtauIdx);
      const o = state.stokObat[idx];
      if (!o) return;
      if (!confirm('Hapus obat "' + (o.nama || '') + '" dari daftar?')) return;
      state.stokObat.splice(idx, 1); saveState(); renderStokObat(); updateSelectMutasiObat(); showToast('🗑️ Obat dihapus.');
      // Hapus sungguhan di server (dulu hanya kirim daftar lengkap → obat muncul lagi saat sinkron)
      if (state.scriptUrl) kirimKeSheets('deleteStokObat', { nama: o.nama });
    }

    function updateSelectMutasiObat() {
      const sel = document.getElementById('mutasiPilihObat'); if (!sel) return;
      const curr = sel.value;
      sel.innerHTML = '<option value="">-- Pilih Obat --</option>';
      [...(state.stokObat || [])].filter(o => o && o.nama).sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id')).forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.nama; opt.textContent = o.nama + ' (' + (o.stok||0) + ' ' + o.satuan + ')';
        sel.appendChild(opt);
      });
      if (curr) sel.value = curr;
    }

    function simpanMutasiStok() {
      const namaObat = document.getElementById('mutasiPilihObat').value;
      const jenis = document.getElementById('mutasiJenis').value;
      const jumlah = parseFloat(document.getElementById('mutasiJumlah').value) || 0;
      const ket = document.getElementById('mutasiKet').value.trim();
      if (!namaObat || jumlah <= 0) { showAlert('alertMutasi','error','❌ Pilih obat dan isi jumlah!'); return; }
      const idx = _cariIdxObat(namaObat);
      if (idx === -1) { showAlert('alertMutasi','error','❌ Obat tidak ditemukan!'); return; }
      const stokLama = Number(state.stokObat[idx].stok) || 0;
      if (jenis === 'keluar' && jumlah > stokLama) { showAlert('alertMutasi','error','❌ Stok tidak cukup! Tersedia: '+stokLama); return; }
      state.stokObat[idx].stok = jenis === 'masuk' ? stokLama + jumlah : Math.max(0, stokLama - jumlah);
      state.stokObat[idx].updatedAt = new Date().toISOString();
      const sisaStok = state.stokObat[idx].stok;
      if (!state.obatKeluar) state.obatKeluar = [];
      const mutasiEntry = {
        id: 'mut-' + Date.now(),
        tgl: isoLokal(new Date()),
        namaObat, jumlah: jenis === 'masuk' ? jumlah : -jumlah,
        satuan: state.stokObat[idx].satuan || '',
        namaPM: '-', sumber: 'manual',
        petugas: state.namaPetugas || '',
        keterangan: (jenis === 'masuk' ? 'Stok Masuk' : 'Stok Keluar') + (ket ? ': '+ket : ''),
        sisaStok, waktuInput: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.obatKeluar.unshift(mutasiEntry);
      saveState();
      document.getElementById('mutasiJumlah').value = '';
      document.getElementById('mutasiKet').value = '';
      showAlert('alertMutasi','success','✅ Mutasi berhasil! Sisa stok: '+sisaStok+' '+state.stokObat[idx].satuan);
      renderStokObat(); renderLogMutasi(); renderRekapObat(); updateSelectMutasiObat(); showToast('🔄 Mutasi stok tersimpan!');
      if (state.scriptUrl) {
        _kirimSelisihStok([{ nama: state.stokObat[idx].nama, selisih: sisaStok - stokLama }]);
        kirimKeSheets('addObatKeluar', mutasiEntry);
      }
    }

    function updateSelectObatPM() {
      // Isi dropdown filter PM pada rekap obat dan log mutasi
      const allPM = [...new Set((state.obatKeluar||[]).map(o=>o.namaPM).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));
      ['rekapObatPM','logMutasiPM'].forEach(function(id){
        const sel = document.getElementById(id);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">Semua PM</option>';
        allPM.forEach(n => {
          const opt = document.createElement('option');
          opt.value = n; opt.textContent = n;
          if (n === cur) opt.selected = true;
          sel.appendChild(opt);
        });
      });
    }

    // ── Pagination generik untuk tabel-tabel besar ──
    const _pageState = {
      rekapObat: 1, logMutasi: 1,
      listPM: 1, kasiPM: 1, riwayat: 1, kasiRiwayat: 1, riwayatAdmin: 1,
      insidental: 1, kasiInsidental: 1, rekapInsidental: 1,
      rujukan: 1, kasiRujukan: 1, rekapRujukan: 1,
      asesmenList: 1, kasiAsesmen: 1
    };
    function _renderPaginationControls(containerId, key, totalItems, perPage, onPageChange) {
      const el = document.getElementById(containerId); if (!el) return;
      const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
      if (_pageState[key] > totalPages) _pageState[key] = totalPages;
      const cur = _pageState[key];
      if (totalItems === 0) { el.innerHTML = ''; return; }
      const from = (cur - 1) * perPage + 1;
      const to = Math.min(cur * perPage, totalItems);
      let btns = '';
      const mkBtn = (label, page, disabled, active) => `<button type="button" ${disabled?'disabled':''} onclick="${disabled?'':`_goToPage('${key}',${page},'${onPageChange}')`}"
          style="min-width:30px;padding:5px 9px;border-radius:8px;border:1.5px solid var(--border);font-size:.8rem;cursor:${disabled?'default':'pointer'};
          background:${active?'var(--primary)':'#fff'};color:${active?'#fff':'var(--text)'};opacity:${disabled?0.4:1};">${escHtml(label)}</button>`;
      btns += mkBtn('‹ Prev', cur - 1, cur <= 1, false);
      const pagesToShow = [];
      for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - cur) <= 1) pagesToShow.push(p);
      }
      let lastShown = 0;
      pagesToShow.forEach(p => {
        if (lastShown && p - lastShown > 1) btns += `<span style="padding:0 4px;color:var(--text-muted);">…</span>`;
        btns += mkBtn(String(p), p, false, p === cur);
        lastShown = p;
      });
      btns += mkBtn('Next ›', cur + 1, cur >= totalPages, false);
      el.innerHTML = `
        <div style="font-size:.78rem;color:var(--text-muted);">Menampilkan ${escHtml(from)}–${escHtml(to)} dari ${escHtml(totalItems)} data</div>
        <div style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center;">${btns}</div>`;
    }
    function _goToPage(key, page, renderFnName) {
      _pageState[key] = page;
      window[renderFnName]();
    }

    function renderRekapObat() {
      const tbody = document.getElementById('rekapObatBody');
      const summaryEl = document.getElementById('rekapObatSummary');
      if (!tbody) return;
      const bulan = parseInt(document.getElementById('rekapObatBulan')?.value || '0');
      const tahun = document.getElementById('rekapObatTahun')?.value || '';
      const sumber = document.getElementById('rekapObatSumber')?.value || '';
      const filterPM = document.getElementById('rekapObatPM')?.value || '';
      // Default: hanya pemakaian obat oleh PM. Filter "Mutasi Manual" menampilkan stok masuk/keluar manual.
      let list = (state.obatKeluar || []).filter(o => sumber === 'manual' ? (o && o.sumber === 'manual' && Number(o.jumlah)) : _isPemakaian(o));
      if (bulan > 0) list = list.filter(o => { const d = new Date(o.tgl||o.waktuInput); return d.getFullYear() > 2000 && d.getMonth()+1 === bulan; });
      if (tahun) list = list.filter(o => { const d = new Date(o.tgl||o.waktuInput); return d.getFullYear() === parseInt(tahun); });
      if (sumber) list = list.filter(o => o.sumber === sumber);
      if (filterPM) list = list.filter(o => o.namaPM === filterPM);
      // Urutkan tanggal terbaru dulu
      list.sort((a,b) => new Date(b.tgl||b.waktuInput||0) - new Date(a.tgl||a.waktuInput||0));
      const perObat = {};
      list.forEach(o => {
        if (!_isPemakaian(o)) return;   // kartu ringkasan = jumlah obat yang DIGUNAKAN
        if (!perObat[o.namaObat]) perObat[o.namaObat] = { total:0, satuan:o.satuan||'' };
        perObat[o.namaObat].total += Number(o.jumlah)||0;
        if (o.satuan) perObat[o.namaObat].satuan = o.satuan;
      });
      if (summaryEl) {
        const entries = Object.entries(perObat).sort((a,b)=>b[1].total-a[1].total);
        summaryEl.innerHTML = entries.length === 0 ? '' : entries.map(([n,d]) => `
          <div style="background:var(--primary-pale);border-radius:10px;padding:.85rem 1rem;border-left:3px solid var(--primary);">
            <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:2px;">${escHtml(n)}</div>
            <div style="font-size:1.4rem;font-weight:700;color:var(--primary);font-family:'JetBrains Mono',monospace;">${escHtml(d.total)}</div>
            <div style="font-size:.72rem;color:var(--text-muted);">${escHtml(d.satuan)} digunakan</div>
          </div>`).join('');
      }
      const sL = { pemeriksaan:'🩺 Pemeriksaan', insidental:'🚨 Insidental', manual:'🔄 Manual' };
      const pgEl = document.getElementById('rekapObatPagination');
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:1.5rem;">Tidak ada data pemakaian untuk filter ini</td></tr>';
        if (pgEl) pgEl.innerHTML = '';
        return;
      }
      list = _fltTbl('rekapObat', list);   // v26: filter nama/tanggal (data, semua halaman)
      const perPage = 100;
      const totalPages = Math.max(1, Math.ceil(list.length / perPage));
      if (_pageState.rekapObat > totalPages) _pageState.rekapObat = totalPages;
      const startIdx = (_pageState.rekapObat - 1) * perPage;
      const pageList = list.slice(startIdx, startIdx + perPage);
      tbody.innerHTML = '';
      pageList.forEach((o, i) => {
        const idx = startIdx + i;
        const tr = document.createElement('tr');
        const tglDisplay = o.tgl ? (() => { try { return new Date(o.tgl).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}); } catch(e){ return o.tgl; }})() : '-';
        tr.innerHTML = `<td style="text-align:center;font-size:.78rem;color:var(--text-muted);font-weight:600;">${escHtml(idx+1)}</td>
          <td>${escHtml(tglDisplay)}</td><td><strong>${escHtml(o.namaObat)}</strong></td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--primary);">${escHtml(o.jumlah)}</td>
          <td>${escHtml(o.satuan||'-')}</td><td>${escHtml(o.namaPM||'-')}</td>
          <td><span class="badge ${o.sumber==='pemeriksaan'?'badge-blue':o.sumber==='insidental'?'badge-yellow':'badge-gray'}">${escHtml(sL[o.sumber]||o.sumber)}</span></td>
          <td>${escHtml(o.petugas||'-')}</td>`;
        tbody.appendChild(tr);
      });
      _renderPaginationControls('rekapObatPagination', 'rekapObat', list.length, perPage, 'renderRekapObat');
    }

    function renderLogMutasi() {
      const tbody = document.getElementById('logMutasiBody'); if (!tbody) return;
      const filterBulan = parseInt((document.getElementById('logMutasiBulan')||{value:'0'}).value||'0');
      const filterTahun = (document.getElementById('logMutasiTahun')||{value:''}).value||'';
      const filterPM2 = (document.getElementById('logMutasiPM')||{value:''}).value||'';
      let list = [...(state.obatKeluar || [])].sort((a,b)=>new Date(b.waktuInput||b.tgl||0)-new Date(a.waktuInput||a.tgl||0));
      if (filterBulan > 0) list = list.filter(o => { const d = new Date(o.waktuInput||o.tgl||0); return d.getMonth()+1 === filterBulan; });
      if (filterTahun) list = list.filter(o => { const d = new Date(o.waktuInput||o.tgl||0); return d.getFullYear() === parseInt(filterTahun); });
      if (filterPM2) list = list.filter(o => o.namaPM === filterPM2);
      const pgEl2 = document.getElementById('logMutasiPagination');
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.5rem;">Belum ada riwayat mutasi</td></tr>';
        if (pgEl2) pgEl2.innerHTML = '';
        return;
      }
      list = _fltTbl('logMutasi', list);   // v26: filter nama/tanggal (data, semua halaman)
      const perPage2 = 100;
      const totalPages2 = Math.max(1, Math.ceil(list.length / perPage2));
      if (_pageState.logMutasi > totalPages2) _pageState.logMutasi = totalPages2;
      const startIdx2 = (_pageState.logMutasi - 1) * perPage2;
      const pageList2 = list.slice(startIdx2, startIdx2 + perPage2);
      tbody.innerHTML = '';
      pageList2.forEach(o => {
        const jml = o.jumlah||0;
        const isMasuk = o.sumber === 'manual' && jml > 0;
        const waktu = o.waktuInput ? new Date(o.waktuInput).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : o.tgl||'-';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="font-size:.8rem;">${escHtml(waktu)}</td><td><strong>${escHtml(o.namaObat)}</strong></td>
          <td><span class="badge ${isMasuk?'badge-green':'badge-red'}">${isMasuk?'📥 Masuk':'📤 Keluar'}</span></td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${isMasuk?'var(--primary)':'var(--danger)'};">${isMasuk?'+':'-'}${escHtml(Math.abs(jml))} ${escHtml(o.satuan||'')}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${o.sisaStok!==null&&o.sisaStok!==undefined?escHtml(o.sisaStok):'-'}</td>
          <td style="font-size:.8rem;">${escHtml(o.keterangan||(o.sumber==='pemeriksaan'?'Pemeriksaan: '+o.namaPM:o.sumber==='insidental'?'Insidental: '+o.namaPM:'-'))}</td>`;
        tbody.appendChild(tr);
      });
      _renderPaginationControls('logMutasiPagination', 'logMutasi', list.length, perPage2, 'renderLogMutasi');
    }

    // ── Pengurutan untuk cetak/ekspor ──
    // Obat: abjad A–Z tanpa membedakan huruf besar/kecil (bahasa Indonesia).
    function _urutAbjadObat(list) {
      return [...list].sort((a, b) => String(a.nama || '').localeCompare(String(b.nama || ''), 'id', { sensitivity: 'base' }));
    }
    // Pemakaian obat: tanggal lama → baru; tanggal sama → jam input, lalu nama PM, lalu nama obat.
    function _msTglPakai(o) {
      const t = _tglLokalMs(o && o.tgl ? o.tgl : (o && o.waktuInput));
      return isNaN(t) ? Infinity : t;
    }
    function _urutTglPakai(list) {
      return [...list].sort((a, b) => {
        const d = _msTglPakai(a) - _msTglPakai(b);
        if (d && isFinite(d)) return d;
        if (_msTglPakai(a) !== _msTglPakai(b)) return _msTglPakai(a) === Infinity ? 1 : -1;
        const w = String(a.waktuInput || '').localeCompare(String(b.waktuInput || ''));
        if (w) return w;
        const pm = String(a.namaPM || '').localeCompare(String(b.namaPM || ''), 'id', { sensitivity: 'base' });
        if (pm) return pm;
        return String(a.namaObat || '').localeCompare(String(b.namaObat || ''), 'id', { sensitivity: 'base' });
      });
    }

    function cetakStokObat() {
      const now = new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
      const rows = _urutAbjadObat((state.stokObat||[]).filter(o => o && o.nama)).map((o, i) => {
        const stok=o.stok||0,min=o.minimum||10;
        const statusColor = stok<=0?'#721c24':stok<=min?'#856404':'#155724';
        const statusBg = stok<=0?'#fdecea':stok<=min?'#fff3cd':'#d4edda';
        const status = stok<=0?'Habis':stok<=min?'Hampir Habis':'Aman';
        return `<tr><td style="text-align:center;font-weight:700;color:#888;">${escHtml(i+1)}</td><td>${escHtml(o.nama)}</td><td style="text-align:center;">${escHtml(o.satuan||'-')}</td><td style="font-weight:700;color:${stok<=0?'#c0392b':stok<=min?'#856404':'#1a6b4a'};text-align:center;">${escHtml(stok)}</td><td style="text-align:center;">${escHtml(min)}</td><td style="text-align:center;">${escHtml(o.kadaluarsa||'-')}</td><td>${escHtml(o.keterangan||'-')}</td><td style="text-align:center;"><span class="badge-pdf" style="background:${escHtml(statusBg)};color:${escHtml(statusColor)};">${escHtml(status)}</span></td></tr>`;
      }).join('');
      const html = `<div style="font-family:Arial,sans-serif;font-size:10pt;padding:8px;">
        <style>
          table{border-collapse:collapse;width:100%;table-layout:fixed;}
          th,td{border:1px solid #ccc;padding:5px 7px;word-wrap:break-word;overflow-wrap:break-word;overflow:hidden;vertical-align:middle;}
          th{background:#e8f5ef;color:#1a6b4a;font-weight:700;font-size:8.5pt;white-space:nowrap;word-break:normal;}
          .badge-pdf{display:inline-block;padding:2px 6px;border-radius:6px;font-size:8pt;font-weight:700;white-space:normal;word-break:break-word;max-width:100%;box-sizing:border-box;text-align:center;}
          @media print{@page{margin:1.5cm 1cm;}}
        </style>
        ${_pdfHeader('LAPORAN STOK OBAT','UPT Rehabilitasi Sosial Bina Daksa Pasuruan')}
        <p style="font-size:9pt;color:#555;margin-bottom:8px;">${escHtml(now)}</p>
        <table>
          <colgroup>
            <col style="width:5%"><col><col style="width:9%"><col style="width:8%">
            <col style="width:7%"><col style="width:13%"><col style="width:19%"><col style="width:12%">
          </colgroup>
          <thead><tr>
            <th style="padding:6px 8px;text-align:center;">No</th>
            <th style="padding:6px 8px;text-align:left;">Nama Obat</th>
            <th style="padding:6px 8px;text-align:center;">Satuan</th>
            <th style="padding:6px 8px;text-align:center;">Stok</th>
            <th style="padding:6px 8px;text-align:center;">Min.</th>
            <th style="padding:6px 8px;text-align:center;">Kadaluarsa</th>
            <th style="padding:6px 8px;">Golongan</th>
            <th style="padding:6px 8px;text-align:center;">Status</th>
          </tr></thead>
          <tbody>${rows||'<tr><td colspan="8" style="text-align:center;padding:12px;color:#888;">Tidak ada data</td></tr>'}</tbody>
        </table>
        ${typeof _htmlAnalisisStokCetak === 'function' ? _htmlAnalisisStokCetak(true) : ''}
        ${_pdfTTD(new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}))}
      </div>`;
      printKartuIsolated(html);
    }

    // ══════════════════════════════════════
    //  EXCEL EXPORT UTILITY
    // ══════════════════════════════════════
    function exportToExcel(filename, sheetName, headers, rows, colWidths) {
      loadSheetJS(() => {
        const wb = XLSX.utils.book_new();
        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // ── Lebar kolom ──────────────────────────────
        if (colWidths && colWidths.length) {
          ws['!cols'] = colWidths.map(w => ({wch: w}));
        } else {
          // auto: max dari header/nilai
          ws['!cols'] = headers.map((h, ci) => {
            const maxData = rows.reduce((mx, r) => Math.max(mx, String(r[ci]||'').length), 0);
            return {wch: Math.max(h.length + 2, Math.min(maxData + 2, 40), 10)};
          });
        }

        // ── Freeze baris header ───────────────────────
        ws['!freeze'] = {xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft'};

        // ── Style header (hijau gelap, putih, bold, border) ───
        const hdrStyle = {
          font: {bold: true, color: {rgb: 'FFFFFF'}, sz: 10, name: 'Arial'},
          fill: {patternType: 'solid', fgColor: {rgb: '1A6B4A'}},
          alignment: {horizontal: 'center', vertical: 'center', wrapText: true},
          border: {
            top:    {style: 'thin', color: {rgb: '0D4A30'}},
            bottom: {style: 'thin', color: {rgb: '0D4A30'}},
            left:   {style: 'thin', color: {rgb: '0D4A30'}},
            right:  {style: 'thin', color: {rgb: '0D4A30'}}
          }
        };
        headers.forEach((h, c) => {
          const cellAddr = XLSX.utils.encode_cell({r: 0, c});
          if (ws[cellAddr]) ws[cellAddr].s = hdrStyle;
        });

        // ── Style data rows ───────────────────────────
        const borderStyle = {style: 'thin', color: {rgb: 'CCCCCC'}};
        const border = {top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle};
        rows.forEach((row, r) => {
          const isAlt = r % 2 === 1;
          row.forEach((val, c) => {
            const cellAddr = XLSX.utils.encode_cell({r: r + 1, c});
            if (!ws[cellAddr]) return;
            const isNum = typeof val === 'number';
            ws[cellAddr].s = {
              font: {sz: 10, name: 'Arial'},
              fill: isAlt ? {patternType: 'solid', fgColor: {rgb: 'F0F7F4'}} : {patternType: 'none'},
              alignment: {
                horizontal: isNum ? 'center' : 'left',
                vertical: 'center',
                wrapText: true
              },
              border
            };
          });
        });

        // ── Tinggi baris header ───────────────────────
        ws['!rows'] = [{hpt: 28}];

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, filename);
      });
    }

    function exportExcelRiwayat() {
      const bulan = parseInt((document.getElementById('kasiRiwayatBulan')||{}).value||'0');
      const tahun = parseInt((document.getElementById('kasiRiwayatTahun')||{}).value||'0');
      let list = [...state.pemeriksaan].sort((a,b)=>new Date(b.tglPeriksa)-new Date(a.tglPeriksa));
      if (bulan) list = list.filter(p=>p.tglPeriksa&&new Date(p.tglPeriksa).getMonth()+1===bulan);
      if (tahun) list = list.filter(p=>p.tglPeriksa&&new Date(p.tglPeriksa).getFullYear()===tahun);
      const headers = ['Tanggal','Nama PM','Asrama','Diagnosis','TD','Terapi','Edukasi','Obat Diberikan','Status','Dokter'];
      const rows = list.map(p => {
        const pm = state.penerima.find(x=>x.nomorInduk===p.nomorInduk);
        const obat = (p.obatDiberikan&&p.obatDiberikan.length)?p.obatDiberikan.map(o=>((o.nama||'')+(o.jumlah?' '+o.jumlah:'')+' '+(o.satuan||'')).trim()).join(', '):'-';
        return [p.tglPeriksa?new Date(p.tglPeriksa).toLocaleDateString('id-ID'):'-', p.namaPM||'-', pm?pm.kamarBlok:'-', p.diagnosis||'-', p.tekananDarah||'-', p.tindakan||'-', p.rencana||'-', obat, p.statusKondisi||'-', p.namaDokter||'-'];
      });
      exportToExcel('riwayat-pemeriksaan.xlsx','Riwayat',headers,rows,[13,22,14,22,9,20,22,25,10,22]);
      showToast('📊 File Excel sedang diunduh...');
    }

    function exportExcelInsidental() {
      const bulan = parseInt((document.getElementById('kasiInsidentalBulan')||{}).value||'0');
      const tahun = parseInt((document.getElementById('kasiInsidentalTahun')||{}).value||'0');
      let list = [...(state.insidental||[])].filter(x=>!x._deleted).sort((a,b)=>new Date(b.tgl)-new Date(a.tgl));
      if (bulan) list = list.filter(x=>x.tgl&&new Date(x.tgl).getMonth()+1===bulan);
      if (tahun) list = list.filter(x=>x.tgl&&new Date(x.tgl).getFullYear()===tahun);
      const headers = ['Tanggal','Waktu','Nama PM','Asrama','Keluhan','Tindakan','Obat','Petugas','Rujukan?'];
      const rows = list.map(x => {
        const obat=(x.obatDiberikan&&x.obatDiberikan.length)?x.obatDiberikan.map(o=>((o.nama||'')+(o.jumlah?' '+o.jumlah:'')+' '+(o.satuan||'')).trim()).join(', '):'-';
        return [x.tgl?new Date(x.tgl).toLocaleDateString('id-ID'):'-', fmtWaktu(x.waktu)||'-', x.namaPM||'-', x.kamarBlok||'-', x.keluhan||'-', x.tindakan||'-', obat, x.petugas||'-', x.perluRujukan==='ya'?'Ya':'Tidak'];
      });
      exportToExcel('insidental.xlsx','Insidental',headers,rows,[13,9,22,14,30,25,25,18,10]);
      showToast('📊 File Excel sedang diunduh...');
    }

    function exportExcelRujukan() {
      const bulan = parseInt((document.getElementById('kasiRujBulan')||document.getElementById('rekapRujBulan')||{}).value||'0');
      const tahun = parseInt((document.getElementById('kasiRujTahun')||document.getElementById('rekapRujTahun')||{}).value||'0');
      let list = [...(state.rujukan||[])].filter(x=>!x._deleted).sort((a,b)=>new Date(b.tgl)-new Date(a.tgl));
      if (bulan) list = list.filter(x=>x.tgl&&new Date(x.tgl).getMonth()+1===bulan);
      if (tahun) list = list.filter(x=>x.tgl&&new Date(x.tgl).getFullYear()===tahun);
      const headers = ['Tanggal','Nama PM','Asrama','Jenis','Tujuan RS','Diagnosis','Alasan','Hasil','BPJS','Dokter'];
      const rows = list.map(x => [x.tgl?new Date(x.tgl).toLocaleDateString('id-ID'):'-', x.namaPM||'-', x.kamarBlok||'-', x.jenis||'-', x.tujuan||'-', x.diagnosis||'-', x.alasan||'-', x.hasil||'-', x.jaminan||'-', x.dokter||'-']);
      exportToExcel('rujukan.xlsx','Rujukan',headers,rows,[13,22,14,14,22,22,22,25,14,22]);
      showToast('📊 File Excel sedang diunduh...');
    }

    function exportExcelAsesmen() {
      const list = [...(state.asesmenAwal||[])].sort((a,b)=>new Date(b.tglSimpan||0)-new Date(a.tglSimpan||0));
      const headers = ['Nama PM','Anamnesa','Usia Terjadi','Alat Bantu','Dx Utama','Derajat Disabilitas','Potensi Rehab','Rekomendasi','Dokter'];
      const rows = list.map(a => {
        const rek=[...(a.rekomendasi||[]),...(a.rekLainCheck&&a.rekLain?[a.rekLain]:[])].join('; ');
        return [a.namaPM||'-', a.anamnesa||'-', a.usiaOnset?a.usiaOnset+' th':'-', a.alatSebelum||'-', a.dxUtama||'-', a.derajat||'-', a.potensi||'-', rek||'-', a.namaDokter||'-'];
      });
      exportToExcel('asesmen-awal.xlsx','Asesmen Awal',headers,rows,[22,30,13,18,22,18,18,30,22]);
      showToast('📊 File Excel sedang diunduh...');
    }

    function exportExcelStokObat() {
      const list = [...(state.stokObat||[])].sort((a,b)=>a.nama.localeCompare(b.nama,'id'));
      const headers = ['Nama Obat','Satuan','Stok','Stok Minimum','Kadaluarsa','Golongan/Keterangan','Status'];
      const rows = list.map(o => {
        const stok=o.stok||0,min=o.minimum||10;
        const status=stok<=0?'Habis':stok<=min?'Hampir Habis':'Aman';
        return [o.nama||'-', o.satuan||'-', stok, min, o.kadaluarsa||'-', o.keterangan||'-', status];
      });
      exportToExcel('stok-obat.xlsx','Stok Obat',headers,rows,[28,12,10,14,14,25,14]);
      showToast('📊 File Excel sedang diunduh...');
    }

    function exportExcelRekapObat() {
      const bulan = parseInt(document.getElementById('rekapObatBulan')?.value||'0');
      const tahun = document.getElementById('rekapObatTahun')?.value||'';
      const sumber = document.getElementById('rekapObatSumber')?.value||'';
      let list = (state.obatKeluar||[]).filter(o => sumber === 'manual' ? (o && o.sumber === 'manual' && Number(o.jumlah)) : _isPemakaian(o));
      if (bulan>0) list=list.filter(o=>new Date(o.tgl||o.waktuInput).getMonth()+1===bulan);
      if (tahun) list=list.filter(o=>new Date(o.tgl||o.waktuInput).getFullYear()===parseInt(tahun));
      if (sumber) list=list.filter(o=>o.sumber===sumber);
      const filterPM = document.getElementById('rekapObatPM')?.value||'';
      if (filterPM) list=list.filter(o=>o.namaPM===filterPM);
      const headers=['Tanggal','Nama Obat','Jumlah','Satuan','Nama PM','Sumber','Petugas/Dokter'];
      list = _urutTglPakai(list);
      const rows=list.map(o=>[o.tgl?new Date(o.tgl).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'-', o.namaObat||'-', o.jumlah||0, o.satuan||'-', o.namaPM||'-', o.sumber||'-', o.petugas||'-']);
      exportToExcel('rekap-pemakaian-obat.xlsx','Rekap Obat',headers,rows,[14,28,10,10,22,14,20]);
      showToast('📊 File Excel sedang diunduh...');
    }

    function exportExcelInsidentalPeriksa() {
      const bulan = parseInt((document.getElementById('kasiInsidentalPeriksa_bulan')||{value:'0'}).value||'0');
      const tahun = parseInt((document.getElementById('kasiInsidentalPeriksa_tahun')||{value:'0'}).value||'0');
      let insList = [...(state.insidental||[])].filter(x=>!x._deleted);
      if (bulan) insList=insList.filter(x=>x.tgl&&new Date(x.tgl).getMonth()+1===bulan);
      if (tahun) insList=insList.filter(x=>x.tgl&&new Date(x.tgl).getFullYear()===tahun);
      const headers=['Nama PM','Asrama','Tgl Insidental','Keluhan','Tgl Periksa','Diagnosis','Status'];
      const rows=[];
      insList.forEach(x=>{
        const periksa=(state.pemeriksaan||[]).filter(p=>p.nomorInduk===x.nomorInduk&&new Date(p.tglPeriksa)>=new Date(x.tgl)).sort((a,b)=>new Date(a.tglPeriksa)-new Date(b.tglPeriksa));
        if(!periksa.length) return;
        const p=periksa[0];
        const pm=state.penerima.find(r=>r.nomorInduk===x.nomorInduk);
        rows.push([x.namaPM||'-', pm?pm.kamarBlok:'-', x.tgl?new Date(x.tgl).toLocaleDateString('id-ID'):'-', x.keluhan||'-', p.tglPeriksa?new Date(p.tglPeriksa).toLocaleDateString('id-ID'):'-', p.diagnosis||'-', p.statusKondisi||'-']);
      });
      exportToExcel('insidental-periksa-dokter.xlsx','PM Insidental Periksa',headers,rows,[22,14,13,30,13,22,16]);
      showToast('📊 File Excel sedang diunduh...');
    }

    function cetakRekapObat() {
      const bulan = parseInt(document.getElementById('rekapObatBulan')?.value||'0');
      const tahun = document.getElementById('rekapObatTahun')?.value||'';
      const sumber = document.getElementById('rekapObatSumber')?.value||'';
      let list = (state.obatKeluar||[]).filter(o => sumber === 'manual' ? (o && o.sumber === 'manual' && Number(o.jumlah)) : _isPemakaian(o));
      if (bulan>0) list=list.filter(o=>new Date(o.tgl||o.waktuInput).getMonth()+1===bulan);
      if (tahun) list=list.filter(o=>new Date(o.tgl||o.waktuInput).getFullYear()===parseInt(tahun));
      if (sumber) list=list.filter(o=>o.sumber===sumber);
      const filterPM = document.getElementById('rekapObatPM')?.value||'';
      if (filterPM) list=list.filter(o=>o.namaPM===filterPM);
      const B=['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const judul=(bulan>0?B[bulan]+' ':'')+tahun;
      const sL={pemeriksaan:'Pemeriksaan',insidental:'Insidental',manual:'Manual'};
      list = _urutTglPakai(list);
      const rows=list.map(o=>`<tr><td>${o.tgl?escHtml(new Date(o.tgl).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})):'-'}</td><td><strong>${escHtml(o.namaObat)}</strong></td><td style="font-weight:700;color:#1a6b4a;text-align:center;">${escHtml(o.jumlah)}</td><td style="text-align:center;">${escHtml(o.satuan||'-')}</td><td>${escHtml(o.namaPM||'-')}</td><td>${escHtml(sL[o.sumber]||o.sumber||'-')}</td><td style="font-size:9pt">${escHtml(o.petugas||'-')}</td></tr>`).join('');
      const html = `<div style="font-family:Arial,sans-serif;font-size:10pt;padding:8px;">
        <style>
          table{border-collapse:collapse;width:100%;table-layout:fixed;}
          th,td{border:1px solid #ccc;padding:5px 7px;word-wrap:break-word;overflow-wrap:break-word;overflow:hidden;vertical-align:middle;}
          th{background:#e8f5ef;color:#1a6b4a;font-weight:700;font-size:8.5pt;white-space:nowrap;word-break:normal;}
          .badge-pdf{display:inline-block;padding:2px 6px;border-radius:6px;font-size:8pt;font-weight:700;white-space:normal;word-break:break-word;max-width:100%;box-sizing:border-box;text-align:center;}
          @media print{@page{margin:1.5cm 1cm;}}
        </style>
        ${_pdfHeader('REKAP PEMAKAIAN OBAT'+(judul?' — '+judul:''),'UPT Rehabilitasi Sosial Bina Daksa Pasuruan')}
        <p style="font-size:9pt;color:#555;margin-bottom:8px;">Dicetak: ${escHtml(new Date().toLocaleString('id-ID'))}</p>
        <table>
          <colgroup>
            <col style="width:13%"><col><col style="width:9%"><col style="width:9%">
            <col style="width:17%"><col style="width:14%"><col style="width:14%">
          </colgroup>
          <thead><tr>
            <th style="padding:6px 8px;text-align:left;">Tanggal</th>
            <th style="padding:6px 8px;">Nama Obat</th>
            <th style="padding:6px 8px;text-align:center;">Jumlah</th>
            <th style="padding:6px 8px;text-align:center;">Satuan</th>
            <th style="padding:6px 8px;">Nama PM</th>
            <th style="padding:6px 8px;">Sumber</th>
            <th style="padding:6px 8px;">Petugas/Dokter</th>
          </tr></thead>
          <tbody>${rows||'<tr><td colspan="7" style="text-align:center;padding:12px;color:#888;">Tidak ada data</td></tr>'}</tbody>
        </table>
        ${_pdfTTD(new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}))}
      </div>`;
      printKartuIsolated(_sisipAnalisisPDF(html));
    }

    // ══════════════════════════════════════
    //  AUTO-EXTEND DROPDOWN TAHUN
    //  Supaya tidak perlu update kode setiap kali tahun terakhir di
    //  daftar sudah terlewati — semua <select id="...Tahun"> otomatis
    //  diperpanjang sampai (tahun berjalan + 5) setiap web dibuka.
    // ══════════════════════════════════════
    function autoExtendYearSelects() {
      const nowYear = new Date().getFullYear();
      const targetMaxYear = nowYear + 5; // buffer 5 tahun ke depan
      document.querySelectorAll('select[id$="Tahun"]').forEach(sel => {
        const existingYears = [...sel.options].map(o => parseInt(o.value)).filter(v => !isNaN(v));
        if (!existingYears.length) return; // select tanpa opsi tahun numerik (mis. hanya label), lewati
        const maxExisting = Math.max(...existingYears);
        for (let y = maxExisting + 1; y <= targetMaxYear; y++) {
          const opt = document.createElement('option');
          opt.value = String(y);
          opt.textContent = String(y);
          sel.appendChild(opt);
        }
        // Perbaiki juga default "tahun terpilih" yang sebelumnya di-hardcode (mis. selalu 2026)
        // supaya otomatis mengikuti tahun berjalan saat web pertama kali dibuka.
        if (sel.value && sel.value !== '' && parseInt(sel.value) !== nowYear &&
            [...sel.options].some(o => o.value === String(nowYear))) {
          sel.value = String(nowYear);
        }
      });
    }
