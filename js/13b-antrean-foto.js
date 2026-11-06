    // ══════════════════════════════════════════════════════
    //  ANTREAN FOTO OFFLINE
    //  Foto yang gagal terkirim karena sinyal hilang disimpan di perangkat
    //  (IndexedDB, bukan localStorage yang kecil) lalu dikirim otomatis
    //  begitu ada koneksi. Isi antrean tidak pernah hilang kecuali server
    //  menolaknya berkali-kali.
    // ══════════════════════════════════════════════════════
    const _ANTREAN_FOTO_KEY = 'antreanFoto';
    const _ANTREAN_FOTO_MAKS_COBA = 5;
    var _antreanFotoJalan = false;
    var _antreanFotoJumlah = 0;
    var _fotoBaruDiAntrekan = 0;

    async function _bacaAntreanFoto() {
      try { const a = await _idbGetArray(_ANTREAN_FOTO_KEY); return Array.isArray(a) ? a : []; }
      catch (e) { return []; }
    }
    async function _tulisAntreanFoto(a) {
      await _idbSetArray(_ANTREAN_FOTO_KEY, a);   // melempar galat bila gagal → pemanggil tahu
      _antreanFotoJumlah = a.length;
      _updateBadgeAntrean();
    }
    async function _segarkanJumlahAntreanFoto() {
      _antreanFotoJumlah = (await _bacaAntreanFoto()).length;
      _updateBadgeAntrean();
    }
    // Simpan satu foto ke antrean. Mengembalikan true bila aman tersimpan di perangkat.
    async function _antrekanFoto(item) {
      try {
        const a = await _bacaAntreanFoto();
        a.push(Object.assign({ coba: 0, t: new Date().toISOString() }, item));
        await _tulisAntreanFoto(a);
        _fotoBaruDiAntrekan++;
        return true;
      } catch (e) {
        console.warn('[SIMKEDA] foto tidak bisa disimpan ke antrean offline', e);
        return false;
      }
    }
    // Galat jaringan (boleh diantrekan) vs ditolak server (jangan diantrekan)
    function _galatJaringan(err) {
      return !navigator.onLine || (err && (err.name === 'AbortError' || err.name === 'TypeError'));
    }

    // Terapkan hasil unggah yang berhasil ke data di aplikasi
    function _terapkanFotoTerkirim(item, r) {
      if (item.jenis === 'minggu') {
        const d = item.data;
        const slotSama = f => String(f.slot) === String(d.slot) && f.tglPeriksa === d.tglPeriksa;
        // Foto lama di slot yang sama dihapus juga di server (sama seperti unggah langsung) → tidak ganda
        (state.fotoMinggu || []).filter(f => slotSama(f) && f.isLink && String(f.id) !== String(d.id))
          .forEach(f => { if (state.scriptUrl && typeof kirimKeSheets === 'function') kirimKeSheets('deleteFoto', { id: f.id, driveFileId: f.driveFileId || '', url: f.url || '' }); });
        state.fotoMinggu = (state.fotoMinggu || []).filter(f => !slotSama(f));
        state.fotoMinggu.push({
          id: d.id, url: r.driveUrl, isLink: true, slot: d.slot, label: d.label,
          tglPeriksa: d.tglPeriksa, nama: d.nama, bulan: d.bulan, tahun: d.tahun,
          driveFileId: r.driveFileId || '', waktu: d.waktu, updatedAt: new Date().toISOString()
        });
        saveState();
        // Kirim tautan foto ke server lewat sinkron (dulu tidak dipicu → foto tidak muncul di HP lain)
        if (typeof triggerSyncAfterSave === 'function') { try { triggerSyncAfterSave(); } catch (e) {} }
        if (typeof renderFotoMinggu === 'function') { try { renderFotoMinggu(); } catch (e) {} }
        return true;
      }
      if (item.jenis === 'rujukan') {
        // Cari catatan rujukan milik foto ini (PM + tanggal sama, yang terbaru)
        const cocok = (state.rujukan || []).filter(x => !x._deleted && String(x.nomorInduk) === String(item.nomorInduk) && String(x.tgl).slice(0, 10) === String(item.tgl).slice(0, 10));
        if (!cocok.length) return false;   // catatannya belum disimpan → coba lagi nanti
        const rec = cocok[cocok.length - 1];
        rec['foto' + item.slotNo] = r.driveUrl;
        rec.updatedAt = new Date().toISOString();
        saveState();
        _antrekan('addRujukan', rec);        // kirim catatan yang sudah berisi foto
        if (typeof kirimAntrean === 'function') kirimAntrean();
        return true;
      }
      return true;
    }

    async function kirimAntreanFoto(manual) {
      if (_antreanFotoJalan || !state.scriptUrl || !_sesiToken || !navigator.onLine) return;
      let a = await _bacaAntreanFoto();
      if (!a.length) { _antreanFotoJumlah = 0; _updateBadgeAntrean(); return; }
      _antreanFotoJalan = true;
      let terkirim = 0, dibuang = 0;
      try {
        for (let i = 0; i < a.length;) {
          const it = a[i];
          let r = null, jaringan = false;
          if (it.driveUrlTerunggah) {
            // Foto SUDAH terunggah sebelumnya; tinggal menempelkan ke catatan rujukan
            // (jangan unggah ulang — dulu tiap percobaan membuat file ganda di Drive)
            r = { ok: true, driveUrl: it.driveUrlTerunggah, driveFileId: it.driveFileIdTerunggah || '' };
          } else {
            const ctl = new AbortController(); const tid = setTimeout(function() { ctl.abort(); }, 90000);
            try {
              const resp = await fetch(state.scriptUrl, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: it.action, data: it.data, deviceId: state._deviceId || 'web' }), signal: ctl.signal });
              clearTimeout(tid);
              try { r = JSON.parse(await resp.text()); } catch (pe) { r = { ok: false, error: 'respons bukan JSON' }; }
            } catch (e) { clearTimeout(tid); jaringan = true; }
          }
          if (jaringan) break;                                   // sinyal hilang lagi → berhenti, coba nanti
          if (r && !r.ok && /sesi tidak sah|token tidak valid/i.test(r.error || '')) { _laporkanSyncGagal(r.error); break; }
          if (r && !r.ok && /server sibuk|terlalu banyak request|coba lagi/i.test(r.error || '')) break;   // sementara → coba nanti
          let selesai = false;
          if (r && r.ok && r.driveUrl && String(r.driveUrl).length > 10) {
            selesai = _terapkanFotoTerkirim(it, r);
            if (selesai) terkirim++;
            else {
              // Catatan rujukan belum disimpan: simpan alamat foto, tunggu sampai 7 hari
              it.driveUrlTerunggah = r.driveUrl; it.driveFileIdTerunggah = r.driveFileId || '';
              if (it.data) delete it.data.url;                    // isi foto tidak perlu disimpan lagi
              if (Date.now() - new Date(it.t || 0).getTime() > 7 * 86400000) it.coba = _ANTREAN_FOTO_MAKS_COBA;
            }
          } else {
            it.coba = (it.coba || 0) + 1;                        // ditolak server
            console.warn('[SIMKEDA] foto antrean ditolak:', r && r.error);
          }
          if (selesai || it.coba >= _ANTREAN_FOTO_MAKS_COBA) {
            if (!selesai) dibuang++;
            a.splice(i, 1);
          } else { i++; }
          try { await _tulisAntreanFoto(a); } catch (e) { break; }
        }
      } finally { _antreanFotoJalan = false; }
      if (terkirim && typeof showToast === 'function') showToast('☁️ ' + terkirim + ' foto tertunda berhasil diunggah ke Drive');
      if (dibuang && typeof showToast === 'function') showToast('⚠️ ' + dibuang + ' foto ditolak server berulang kali dan dibuang — unggah ulang manual', 'warning');
      else if (manual && a.length && typeof showToast === 'function') showToast('Foto belum bisa terkirim — coba lagi saat koneksi stabil.');
    }

    window.addEventListener('online', function() { kirimAntreanFoto(); });
    setInterval(function() { kirimAntreanFoto(); }, 45000);
    window.addEventListener('load', function() { _segarkanJumlahAntreanFoto().then(function() { kirimAntreanFoto(); }); });
