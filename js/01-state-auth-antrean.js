    // ══════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════
    var ADL_ITEMS = [
      'Makan', 'Mandi', 'Berpakaian', 'Buang air kecil/besar',
      'Mobilitas tempat tidur', 'Mobilitas kursi roda / alat bantu'
    ];

        let state = {
      role: 'petugas',
      penerima: [],
      pemeriksaan: [],
      pengukuranAwal: [],
      insidental: [],
      antrian: [],
      scriptUrl: 'https://script.google.com/macros/s/AKfycbyjEkqHAnvKB50HYRrUsFn0XPVb057RWoTQHO50k0Sa5eMIUj_oW5f3gsfDP1Mi7Xd_/exec',
      defaultDokter: '',
      namaPetugas: '',
      daftarPetugas: [],
      petugasCetak: '',
      namaKasi: '',
      pinKasi: '1234',
      pinDokter: '1111',
      pinPetugas: '2222',
      pinAdmin: '0000',
      ttdDokterBase64: '',
      ttdKasiBase64: '',
      ttdPetugasBase64: '',
      customJenisDis: [],
      rujukan: [],
      fotoMinggu: [],
      asesmenAwal: [],
      stokObat: [],
      obatKeluar: [],
      appToken: '',
      _activePinHash: null
    };

    let csvBuffer = [];

    let _pendingRole = null;

    // ══════════════════════════════════════════════════════
    //  PROTEKSI TOKEN — satu titik sisip untuk SEMUA request ke backend
    //  (tidak perlu ubah tiap pemanggilan fetch yang tersebar di file ini)
    // ══════════════════════════════════════════════════════
    let _sesiToken = '';
    try { _sesiToken = sessionStorage.getItem('simkeda_sesi_token') || ''; } catch (e) {}
    (function() {
      const _origFetch = window.fetch.bind(window);
      window.fetch = function(input, init) {
        try {
          const urlStr = typeof input === 'string' ? input : (input && input.url) || '';
          if (state.scriptUrl && state.appToken && urlStr.indexOf(state.scriptUrl) === 0) {
            if (init && init.method === 'POST' && typeof init.body === 'string') {
              try {
                const parsed = JSON.parse(init.body);
                if (!parsed.token) parsed.token = state.appToken;
                // Token sesi dari login server (role ditentukan server dari sesi ini)
                if (!parsed.sesi) parsed.sesi = _sesiToken || '';
                init = Object.assign({}, init, { body: JSON.stringify(parsed) });
              } catch (e) { /* body bukan JSON — biarkan apa adanya */ }
            } else if (urlStr.indexOf('token=') === -1) {
              const sep = urlStr.indexOf('?') === -1 ? '?' : '&';
              input = urlStr + sep + 'token=' + encodeURIComponent(state.appToken) +
                      '&sesi=' + encodeURIComponent(_sesiToken || '') +
                      '&deviceId=' + encodeURIComponent(state._deviceId || 'web');
            }
          }
        } catch (e) { /* wrapper tidak boleh mematahkan fetch asli */ }
        return _origFetch(input, init);
      };
    })();

    // Beberapa pemanggilan backend (loadAll/loadAntrian/getPhotoBase64) memakai
    // XMLHttpRequest langsung, bukan fetch — sisipkan token di sini juga.
    (function() {
      const _origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        try {
          if (state.scriptUrl && state.appToken && typeof url === 'string' &&
              url.indexOf(state.scriptUrl) === 0 && url.indexOf('token=') === -1) {
            const sep = url.indexOf('?') === -1 ? '?' : '&';
            url = url + sep + 'token=' + encodeURIComponent(state.appToken) +
                  '&sesi=' + encodeURIComponent(_sesiToken || '') +
                  '&deviceId=' + encodeURIComponent(state._deviceId || 'web');
          }
        } catch (e) { /* wrapper tidak boleh mematahkan XHR asli */ }
        const args = Array.prototype.slice.call(arguments, 2);
        return _origOpen.apply(this, [method, url].concat(args));
      };
    })();

    const HARDCODED_GAS_URL = 'https://script.google.com/macros/s/AKfycbyjEkqHAnvKB50HYRrUsFn0XPVb057RWoTQHO50k0Sa5eMIUj_oW5f3gsfDP1Mi7Xd_/exec';
    // ── Token aplikasi: harus SAMA PERSIS dengan APP_TOKEN di Code.gs ──
    // Tanpa token yang cocok, backend akan menolak semua request (lihat cekToken di Code.gs).
    // GANTI nilai ini (dan nilai di Code.gs) sebelum deploy ke produksi — jangan pakai contoh ini.
    const APP_TOKEN = '';
    // ══════════════════════════════════════════════════════════════
    //  INDEXEDDB — penyimpanan untuk data besar (riwayat pemeriksaan dkk)
    //  Kapasitasnya jauh lebih besar dari localStorage (~5-10MB), jadi
    //  5 array yang paling gemuk dipindah kesini supaya localStorage tidak
    //  cepat penuh lagi. Field lain (profil, PIN, konfigurasi, dll) TETAP
    //  di localStorage seperti biasa — cuma yang besar yang dipindah.
    // ══════════════════════════════════════════════════════════════
    const IDB_NAME = 'simkeda_bigdata';
    const IDB_STORE = 'arrays';
    const IDB_BIGKEYS = ['pemeriksaan', 'rujukan', 'obatKeluar', 'insidental', 'pengukuranAwal'];
    let _idbDb = null;
    let _idbBukaJanji = null;
    // Selama data lama dari IndexedDB BELUM selesai dimuat, saveState() tidak boleh
    // menulis array besar ke IndexedDB — kalau tidak, array kosong saat aplikasi
    // baru dibuka bisa menimpa riwayat yang tersimpan (data lokal hilang).
    let _idbSudahDimuat = false;
    let _idbSiapResolve = null;
    const _idbSiap = new Promise(function(r) { _idbSiapResolve = r; });
    let _idbTersedia = true; // jadi false kalau ternyata IndexedDB tidak bisa dipakai (browser lawas/mode privat tertentu) → otomatis balik pakai localStorage seperti sebelumnya

    function _idbBuka() {
      if (_idbDb) return Promise.resolve(_idbDb);
      if (_idbBukaJanji) return _idbBukaJanji;   // satu koneksi saja, jangan buka berkali-kali
      _idbBukaJanji = new Promise(function(resolve, reject) {
        if (!window.indexedDB) { reject(new Error('IndexedDB tidak didukung browser ini')); return; }
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = function(ev) {
          const db = ev.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'k' });
        };
        req.onsuccess = function(ev) { _idbDb = ev.target.result; resolve(_idbDb); };
        req.onerror = function(ev) { _idbBukaJanji = null; reject(ev.target.error || new Error('Gagal membuka IndexedDB')); };
        req.onblocked = function() { console.warn('[SIMKEDA] IndexedDB tertahan tab lain'); };
      });
      return _idbBukaJanji;
    }

    // Simpan satu array besar ke IndexedDB (fire-and-forget dari sisi pemanggil)
    async function _idbSetArray(key, value) {
      if (!_idbTersedia) throw new Error('IndexedDB tidak tersedia');
      const db = await _idbBuka();
      return new Promise(function(resolve, reject) {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put({ k: key, v: value });
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function(ev) { reject(ev.target.error || new Error('Gagal menulis ke IndexedDB')); };
      });
    }

    // Baca satu array besar dari IndexedDB
    async function _idbGetArray(key) {
      if (!_idbTersedia) return undefined;
      const db = await _idbBuka();
      return new Promise(function(resolve, reject) {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = function() { resolve(req.result ? req.result.v : undefined); };
        req.onerror = function(ev) { reject(ev.target.error || new Error('Gagal membaca dari IndexedDB')); };
      });
    }

    // Simpan SEMUA array besar dari `state` saat ini ke IndexedDB.
    // Dipanggil dari saveState() — async, tidak memblokir alur simpan biasa.
    async function _idbSimpanSemuaArrayBesar() {
      if (!_idbTersedia) return false;
      try {
        await _idbBuka();
        for (const key of IDB_BIGKEYS) {
          if (state[key] !== undefined) await _idbSetArray(key, state[key]);
        }
        return true;
      } catch (e) {
        console.warn('[SIMKEDA] IndexedDB gagal dipakai, otomatis kembali ke localStorage untuk array besar:', e);
        _idbTersedia = false; // fallback permanen untuk sesi ini — jangan coba-coba lagi tiap saveState
        return false;
      }
    }

    // Muat SEMUA array besar dari IndexedDB ke dalam `state`.
    // Dipanggil sekali saat aplikasi baru dibuka (setelah loadState()).
    async function _idbMuatSemuaArrayBesar() {
      if (!_idbTersedia) return false;
      try {
        await _idbBuka();
        let adaData = false;
        for (const key of IDB_BIGKEYS) {
          const v = await _idbGetArray(key);
          if (Array.isArray(v)) {
            // Gabungkan (bukan timpa): rekaman yang sempat dibuat sebelum IndexedDB
            // selesai dimuat tetap dipertahankan.
            const ada = new Set(v.map(function(r) { return r && r.id != null ? String(r.id) : null; }).filter(Boolean));
            const tambahan = (Array.isArray(state[key]) ? state[key] : []).filter(function(r) { return r && r.id != null && !ada.has(String(r.id)); });
            state[key] = v.concat(tambahan);
            adaData = true;
          }
        }
        return adaData;
      } catch (e) {
        console.warn('[SIMKEDA] Gagal memuat data besar dari IndexedDB, pakai apa adanya dari localStorage:', e);
        _idbTersedia = false;
        return false;
      }
    }

    // Migrasi SEKALI SAJA: kalau IndexedDB masih kosong tapi localStorage
    // (yang baru saja dibaca oleh loadState()) sudah punya isi array besar,
    // pindahkan ke IndexedDB sekarang juga. Data TIDAK hilang — cuma pindah
    // rumah. Setelah ini, saveState() tidak akan menulis array besar ke
    // localStorage lagi, jadi localStorage otomatis mengecil banyak.
    async function _idbMigrasiDariLocalStorageJikaPerlu() {
      if (_idbSudahDimuat) return;   // hanya sekali per pembukaan aplikasi
      try {
        await _idbMigrasiInti();
      } finally {
        _idbSudahDimuat = true;
        try { if (_idbTersedia) await _idbSimpanSemuaArrayBesar(); } catch (e) {}
        if (_idbSiapResolve) _idbSiapResolve();
        try { if (typeof _setelahDataLokalSiap === 'function') _setelahDataLokalSiap(); } catch (e) { console.warn('[SIMKEDA] render ulang setelah data lokal siap gagal:', e); }
      }
    }
    async function _idbMigrasiInti() {
      if (!_idbTersedia) return;
      try {
        await _idbBuka();
        const sudahAdaDiIdb = await _idbMuatSemuaArrayBesar();
        if (!sudahAdaDiIdb) {
          // IndexedDB masih kosong — kalau state (hasil loadState dari
          // localStorage) sudah punya data array besar, itu berarti data
          // lama dari sebelum migrasi. Pindahkan sekarang.
          let adaYangDipindah = false;
          for (const key of IDB_BIGKEYS) {
            if (Array.isArray(state[key]) && state[key].length > 0) adaYangDipindah = true;
          }
          if (adaYangDipindah) {
            console.info('[SIMKEDA] Migrasi data besar dari localStorage ke IndexedDB (sekali saja)...');
            await _idbSimpanSemuaArrayBesar();
            // Simpan ulang supaya localStorage langsung mengecil (array besar
            // tidak lagi ikut ditulis ke localStorage oleh saveState()).
            saveState();
            console.info('[SIMKEDA] ✅ Migrasi ke IndexedDB selesai.');
          }
        } else {
          // IndexedDB sudah punya data (device ini sudah pernah migrasi
          // sebelumnya) — state sudah diisi ulang oleh _idbMuatSemuaArrayBesar
          // di atas, jadi tidak perlu apa-apa lagi.
        }
      } catch (e) {
        console.warn('[SIMKEDA] Migrasi ke IndexedDB gagal, tetap pakai localStorage:', e);
        _idbTersedia = false;
      }
    }

    // id / nomorInduk / nama obat selalu teks — server lama bisa mengirimnya sebagai angka
    function _normalisasiIdState() {
      const kunci = ['penerima', 'pemeriksaan', 'pengukuranAwal', 'insidental', 'rujukan', 'antrian', 'asesmenAwal', 'fotoMinggu', 'obatKeluar', 'stokObat'];
      kunci.forEach(function(k) {
        if (!Array.isArray(state[k])) { state[k] = []; return; }
        state[k] = state[k].filter(function(r) { return r && typeof r === 'object'; });
        state[k].forEach(function(r) {
          if (r.id !== undefined && r.id !== null && typeof r.id !== 'string') r.id = String(r.id);
          if (r.nomorInduk !== undefined && r.nomorInduk !== null && typeof r.nomorInduk !== 'string') r.nomorInduk = String(r.nomorInduk);
          if (k === 'stokObat' && r.nama !== undefined && r.nama !== null && typeof r.nama !== 'string') r.nama = String(r.nama);
          if (k === 'stokObat') { const n = Number(r.stok); if (r.stok !== '' && !isNaN(n)) r.stok = n; }
        });
      });
    }

    function loadState() {
      try {
        const s = localStorage.getItem('simkeda_v2');
        if (s) Object.assign(state, JSON.parse(s));
      } catch (e) { }
      // scriptUrl & token: pakai nilai tertanam bila ada. Versi publik (dist-github)
      // sengaja dikosongkan → pakai URL yang diisi lewat Setelan/Konfigurasi.
      if (HARDCODED_GAS_URL) state.scriptUrl = HARDCODED_GAS_URL;
      else state.scriptUrl = String(state.scriptUrl || '').trim();
      if (APP_TOKEN && APP_TOKEN !== 'ISI_TOKEN_DI_SINI') state.appToken = APP_TOKEN;
      else state.appToken = String(state.appToken || '').trim();
      // Pastikan field baru ada
      if (!state.pengukuranAwal) state.pengukuranAwal = [];
      if (!state.insidental) state.insidental = [];
      if (!state.rujukan) state.rujukan = [];
      if (!state.fotoMinggu) state.fotoMinggu = [];
      if (!state.asesmenAwal) state.asesmenAwal = [];
      if (!state.customJenisDis) state.customJenisDis = [];
      if (!state.stokObat) state.stokObat = [];
      if (!state.obatKeluar) state.obatKeluar = [];
      if (!state.pinKasi) state.pinKasi = '1234';
      if (!state.pinDokter) state.pinDokter = '1111';
      if (!state.pinPetugas) state.pinPetugas = '2222';
      if (!state.pinAdmin) state.pinAdmin = '0000';
      // Normalisasi tglPengukuran dan tglPeriksa yang mungkin tersimpan sebagai datetime penuh dari GAS
      try {
        const _nd = function(v) {
          if (!v || /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
          const d = new Date(v); if (isNaN(d.getTime())) return v;
          return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        };
        state.pengukuranAwal = (state.pengukuranAwal||[]).map(x => x.tglPengukuran ? Object.assign({},x,{tglPengukuran:_nd(x.tglPengukuran)}) : x);
        state.pemeriksaan = (state.pemeriksaan||[]).map(x => x.tglPeriksa ? Object.assign({},x,{tglPeriksa:_nd(x.tglPeriksa)}) : x);
      } catch(e) {}
      // Bersihkan antrian kemarin
      const todayStr = new Date().toDateString();
      state.antrian = (Array.isArray(state.antrian) ? state.antrian : []).filter(a => a && new Date(a.tglAntrian).toDateString() === todayStr);
      if (!Array.isArray(state.penerima)) state.penerima = [];
      if (!Array.isArray(state.pemeriksaan)) state.pemeriksaan = [];
      try { _normalisasiIdState(); } catch (e) {}
      // ID unik per perangkat (dipakai server untuk batas laju & penguncian PIN per perangkat).
      // Dulu tidak pernah dibuat → semua perangkat terhitung satu ("web").
      if (!state._deviceId || state._deviceId === 'web') {
        state._deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
        try { const raw = JSON.parse(localStorage.getItem('simkeda_v2') || '{}'); raw._deviceId = state._deviceId; localStorage.setItem('simkeda_v2', JSON.stringify(raw)); } catch (e) {}
      }
    }
    // ── PENANDA ERROR SAVE — dipakai UI untuk menampilkan peringatan
    //    kalau localStorage gagal ditulis (misalnya quota penuh).
    let _saveStateGagalTerakhir = null;
    let _pangkasSaatIniBerjalan = false; // hanya cegah pemangkasan bertumpuk DALAM satu panggilan, bukan lintas sesi

    // ── Pangkas riwayat pemeriksaan/rujukan LAMA dari cache lokal saja
    //    (TIDAK menghapus apa pun di Google Sheets — data lama tetap ada
    //    dan tetap bisa dilihat/ditarik ulang dari server kapan saja).
    //    Dipanggil otomatis oleh saveState() saat localStorage penuh. ──
    function _pangkasCacheLokalLama() {
      const BATAS = 300; // simpan maksimal 300 record terbaru per kategori di cache lokal
      let adaPerubahan = false;
      function ambilTanggal(x) {
        return new Date(x.tglPeriksa || x.tgl || x.waktu || x.waktuInput || x.updatedAt || 0).getTime() || 0;
      }
      // Rekaman yang belum pasti terkirim ke server (diubah sesudah kirim terakhir yang berhasil)
      // TIDAK boleh ikut dibuang — itu satu-satunya salinannya.
      const tKirim = state.lastPushOk ? new Date(state.lastPushOk).getTime() || 0 : 0;
      const belumTerkirim = x => !tKirim || !x || !x.updatedAt || new Date(x.updatedAt).getTime() >= tKirim;
      function pangkasArr(arr) {
        if (!Array.isArray(arr) || arr.length <= BATAS) return arr;
        const urut = arr.slice().sort((a, b) => ambilTanggal(b) - ambilTanggal(a));
        const hasil = urut.filter((x, i) => i < BATAS || belumTerkirim(x));
        if (hasil.length < arr.length) adaPerubahan = true;
        return hasil;
      }
      if (state.pemeriksaan) state.pemeriksaan = pangkasArr(state.pemeriksaan);
      if (state.rujukan)     state.rujukan     = pangkasArr(state.rujukan);
      if (state.insidental)  state.insidental  = pangkasArr(state.insidental);
      return adaPerubahan;
    }

    function saveState() {
      try {
        state._savedAt = new Date().toISOString();
        // ── Kalau IndexedDB tersedia, JANGAN ikutkan 5 array besar saat
        //    menulis ke localStorage — itu sumber utama "quota penuh".
        //    Array besar itu ditulis TERPISAH ke IndexedDB secara async
        //    di bawah (tidak memblokir baris ini). Kalau IndexedDB ternyata
        //    tidak tersedia, tetap sertakan semuanya ke localStorage seperti
        //    sebelumnya (fallback, supaya tidak ada data yang tidak
        //    tersimpan sama sekali). ──
        let dataUntukLocalStorage = state;
        if (_idbTersedia) {
          dataUntukLocalStorage = {};
          for (const k in state) {
            if (IDB_BIGKEYS.indexOf(k) === -1) dataUntukLocalStorage[k] = state[k];
          }
          // Simpan array besar ke IndexedDB di latar belakang (tidak di-await
          // supaya saveState() tetap terasa instan seperti sebelumnya untuk
          // ratusan pemanggilnya yang tidak pakai await).
          if (_idbSudahDimuat) {
            _idbSimpanSemuaArrayBesar().catch(function(e) {
              console.warn('[SIMKEDA] Gagal simpan array besar ke IndexedDB:', e);
            });
          }
        }
        localStorage.setItem('simkeda_v2', JSON.stringify(dataUntukLocalStorage));
        // Sukses → bersihkan penanda gagal kalau sebelumnya pernah gagal
        if (_saveStateGagalTerakhir) {
          _saveStateGagalTerakhir = null;
          console.info('[SIMKEDA] saveState pulih normal setelah sebelumnya gagal.');
        }
        return true;
      } catch (e) {
        // ── Coba pemulihan otomatis dulu kalau ini soal QUOTA PENUH: pangkas
        //    riwayat lama dari cache lokal (bukan dari Sheets) lalu simpan
        //    ulang SEKALI, sebelum benar-benar menyerah. Ini dijalankan
        //    SETIAP kali quota penuh (bukan cuma sekali per sesi) — sync
        //    latar belakang (muatDariSheets/pullFromSheets/fastPollAntrian)
        //    bisa memenuhi ulang localStorage kapan saja, jadi harus selalu
        //    bisa memangkas ulang, bukan cuma di kesempatan pertama. ──
        const iniQuotaError = e && (e.name === 'QuotaExceededError' || /quota/i.test(String(e.message || e)));
        // Pemangkasan riwayat HANYA berguna bila riwayat ikut tersimpan di localStorage (IndexedDB
        // tidak tersedia). Dulu riwayat tetap dipangkas walau sudah di IndexedDB: tidak mengurangi
        // isi localStorage sama sekali, tetapi riwayat di perangkat (termasuk yang belum terkirim) hilang.
        if (iniQuotaError && !_pangkasSaatIniBerjalan && !_idbTersedia) {
          _pangkasSaatIniBerjalan = true;
          try {
            if (_pangkasCacheLokalLama()) {
              state._savedAt = new Date().toISOString();
              const _dataRetry = _idbTersedia ? Object.keys(state).reduce(function(o, k) { if (IDB_BIGKEYS.indexOf(k) === -1) o[k] = state[k]; return o; }, {}) : state;
              localStorage.setItem('simkeda_v2', JSON.stringify(_dataRetry));
              console.warn('[SIMKEDA] Localstorage penuh → berhasil disimpan setelah memangkas riwayat lama dari cache lokal (data lama TETAP AMAN & lengkap di Google Sheets).');
              const _skrgToast = Date.now();
              if (!_saveStateGagalTerakhir || (_skrgToast - _saveStateGagalTerakhir) > 15000) {
                _saveStateGagalTerakhir = _skrgToast;
                try {
                  if (typeof showToast === 'function') {
                    showToast('ℹ️ Penyimpanan lokal hampir penuh — riwayat pemeriksaan/rujukan lama di perangkat ini dirapikan otomatis untuk hemat ruang. Data lama TIDAK hilang, tetap lengkap di Google Sheets.', 8000);
                  }
                } catch (e3) { /* abaikan */ }
              }
              _pangkasSaatIniBerjalan = false;
              return true;
            }
          } catch (e2) {
            console.error('[SIMKEDA] Pemangkasan otomatis gagal / masih penuh setelah dipangkas:', e2);
          }
          _pangkasSaatIniBerjalan = false;
        }
        // JANGAN ditelan diam-diam — ini penyebab paling umum "data hilang
        // saat refresh": localStorage gagal ditulis (paling sering karena
        // quota penuh, ~5-10MB per origin), tapi state di memori tetap
        // berubah sehingga UI tampak berhasil padahal tidak pernah
        // tersimpan permanen.
        console.error('[SIMKEDA] ❌ saveState GAGAL menulis ke localStorage:', e);
        const sekarang = Date.now();
        // Throttle notifikasi ke user supaya tidak spam kalau gagal berkali-kali
        if (!_saveStateGagalTerakhir || (sekarang - _saveStateGagalTerakhir) > 15000) {
          _saveStateGagalTerakhir = sekarang;
          let pesan = '⚠️ Data GAGAL disimpan di penyimpanan lokal (localStorage penuh atau diblokir browser). ' +
                      'Data akan HILANG jika halaman di-refresh sebelum ini diperbaiki. ' +
                      'Segera hapus foto lama / bersihkan data, atau hubungi admin.';
          try {
            if (typeof showToast === 'function') showToast(pesan, 8000);
            else if (typeof showAlert === 'function') showAlert('alertGlobal', 'error', pesan);
            else alert(pesan);
          } catch (e2) { alert(pesan); }
          try {
            let bar = document.getElementById('storageErrorBar');
            if (!bar) {
              bar = document.createElement('div');
              bar.id = 'storageErrorBar';
              bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c0392b;color:#fff;padding:8px 12px;font-size:.85rem;text-align:center;';
              document.body.appendChild(bar);
            }
            bar.textContent = '⚠️ Penyimpanan lokal penuh — data terbaru belum tersimpan permanen. Segera bersihkan data (mis. foto lama) lalu simpan ulang.';
          } catch (e3) { /* abaikan kalau DOM belum siap */ }
        }
        return false;
      }
    }

    // ── Daily reset antrian saat tengah malam ──
    function scheduleMidnightReset() {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5); // +5 detik buffer
      const msUntilMidnight = midnight - now;
      setTimeout(() => {
        try {
          const todayStr = new Date().toDateString();
          state.antrian = state.antrian.filter(a =>
            new Date(a.tglAntrian).toDateString() === todayStr);
          saveState();
          if (typeof renderAntrian === 'function') renderAntrian();
          if (typeof renderDashboard === 'function') renderDashboard();
          console.log('[SIMKEDA] Daily reset antrian dijalankan @ tengah malam');
        } catch(e) { console.warn('Midnight reset error:', e); }
        scheduleMidnightReset(); // jadwalkan lagi untuk besok
      }, msUntilMidnight);
    }

    // Tambah timestamp updatedAt ke setiap record saat disimpan
    function stampNow() { return new Date().toISOString(); }

    // ── Escape HTML — mencegah XSS saat data pengguna dirender ke innerHTML ──
    function escHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // ── Pengaman keluaran HTML ──
    // jsArg: untuk nilai di dalam string JS pada atribut on*="..." (mis. onclick="f('${jsArg(x)}')").
    //   escHtml SAJA tidak cukup di sini: browser mengubah &#39; kembali jadi ' SEBELUM JS dibaca.
    function jsArg(v) {
      return escHtml(String(v == null ? '' : v).replace(/[^\w .,:;()\/@#%+=\-]/g, function(c) {
        return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
      }));
    }
    // safeUrl: untuk atribut src/href. Hanya http(s), blob:, data:image/*;base64, data:application/pdf;base64 dan alamat relatif.
    function safeUrl(v) {
      const s = String(v == null ? '' : v).trim();
      if (/^(https?:\/\/|blob:|data:image\/[a-z0-9.+-]+;base64,|data:application\/pdf;base64,|#|\.{0,2}\/)/i.test(s) || /^[\w][\w.\/-]*$/.test(s)) return escHtml(s);
      return '';
    }

    // ── Isi nilai ke elemen form dengan aman ──
    // <select> menolak nilai yang tidak ada di daftar pilihannya (nilai jadi kosong) →
    // saat data diedit lalu disimpan, isian itu terhapus (mis. Jenis Disabilitas tambahan
    // yang dibuat di HP lain, asrama di luar daftar baku, jenis kelamin "L"). Pilihan yang
    // belum ada ditambahkan dulu supaya nilai lama tetap terbawa.
    function isiNilaiForm(el, val) {
      if (!el) return;
      let v = (val === undefined || val === null) ? '' : String(val);
      // <input type="date"/"time"> hanya menerima YYYY-MM-DD / HH:MM; nilai dari Sheets bisa berupa ISO lengkap
      if ((el.type === 'date' || el.type === 'time') && v && !/^\d{4}-\d{2}-\d{2}$|^\d{1,2}:\d{2}/.test(v)) {
        const d = new Date(v);
        if (!isNaN(d.getTime())) v = el.type === 'date' ? isoLokal(d) : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      }
      if (el.type === 'time' && /^\d:\d{2}/.test(v)) v = '0' + v;
      if (el.type === 'time' && /^\d{2}:\d{2}:\d{2}/.test(v)) v = v.slice(0, 5);
      if (el.tagName === 'SELECT' && v !== '' && ![...el.options].some(o => o.value === v)) {
        const opt = document.createElement('option');
        opt.value = v; opt.textContent = v;
        const tambah = el.querySelector('option[value="__tambah__"]');
        if (tambah) el.insertBefore(opt, tambah); else el.appendChild(opt);
      }
      el.value = v;
    }

    // ── Hash PIN sederhana (proteksi casual terhadap inspeksi DevTools) ──
    // CATATAN: ini bukan enkripsi kuat — hanya menyamarkan PIN dari pembacaan kasual.
    // Gunakan prefix "h:" untuk menandai PIN sudah di-hash, agar backward-compat
    // dengan PIN plaintext lama yang sudah tersimpan.
    function hashPIN(pin) {
      if (pin == null) return '';
      const s = String(pin);
      let h = 0;
      for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
      }
      // ditambah panjang untuk mengurangi tabrakan dasar
      return 'h:' + h.toString(36) + '_' + s.length.toString(36);
    }
    function verifyPIN(input, stored) {
      if (!stored) return false;
      const s = String(stored);
      // Backward compat: jika tersimpan plaintext (belum di-hash), bandingkan langsung
      if (!s.startsWith('h:')) return String(input) === s;
      return hashPIN(input) === s;
    }


    // ══════════════════════════════════════════════════════
    //  LOGIN DI SERVER + ANTREAN OFFLINE
    //  - PIN diperiksa oleh server (SHA-256 + garam, dibatasi percobaan salah).
    //    Server memberi token sesi; token inilah yang dikirim di tiap request.
    //  - Perubahan data yang gagal terkirim karena jaringan disimpan di
    //    antrean (localStorage) dan dikirim ulang otomatis.
    // ══════════════════════════════════════════════════════
    function _simpanSesi(tok) {
      _sesiToken = tok || '';
      try {
        if (tok) sessionStorage.setItem('simkeda_sesi_token', tok);
        else sessionStorage.removeItem('simkeda_sesi_token');
      } catch (e) {}
    }
    async function _sha256Lokal(teks) {
      try {
        if (!(window.crypto && crypto.subtle)) return '';
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
        return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
      } catch (e) { return ''; }
    }
    // Penanda login offline: hanya ada bila perangkat ini PERNAH berhasil login online.
    async function _simpanVerifierOffline(role, pin) {
      try {
        const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const h = await _sha256Lokal(salt + ':' + pin);
        if (h) localStorage.setItem('simkeda_vf_' + role, JSON.stringify({ salt: salt, h: h }));
      } catch (e) {}
    }
    function _hapusVerifierOffline(role) { try { localStorage.removeItem('simkeda_vf_' + role); } catch (e) {} }
    async function _cocokVerifierOffline(role, pin) {
      try {
        const v = JSON.parse(localStorage.getItem('simkeda_vf_' + role) || 'null');
        if (!v) return false;
        const h = await _sha256Lokal(v.salt + ':' + pin);
        return !!h && h === v.h;
      } catch (e) { return false; }
    }

    // → { ok, pesan, terkunci, wajibGantiPin, offline }
    async function verifikasiLogin(role, pin) {
      pin = String(pin == null ? '' : pin).trim();
      // Perangkat belum terhubung ke server → mode lokal (belum ada data server yang bisa diakses).
      if (!state.scriptUrl) {
        const lokal = { petugas: state.pinPetugas || '2222', dokter: state.pinDokter || '1111', kasi: state.pinKasi || '1234', admin: state.pinAdmin || '0000' }[role];
        return verifyPIN(pin, lokal) ? { ok: true, lokal: true } : { ok: false, pesan: '❌ PIN salah.' };
      }
      const controller = new AbortController();
      const tid = setTimeout(function() { controller.abort(); }, 20000);
      try {
        const resp = await fetch(state.scriptUrl, {
          method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'login', role: role, pin: pin, deviceId: state._deviceId || 'web' }),
          signal: controller.signal
        });
        clearTimeout(tid);
        const json = JSON.parse(await resp.text());
        if (json && json.ok && json.sesi) {
          _simpanSesi(json.sesi);
          _simpanVerifierOffline(role, pin);
          return { ok: true, wajibGantiPin: !!json.wajibGantiPin };
        }
        return { ok: false, terkunci: !!(json && json.terkunci), pesan: '❌ ' + ((json && json.error) || 'Login ditolak server.') };
      } catch (e) {
        clearTimeout(tid);
        // Server tidak terjangkau → boleh masuk offline HANYA bila perangkat ini pernah login online dengan PIN yang sama.
        if (await _cocokVerifierOffline(role, pin)) {
          _simpanSesi('');
          return { ok: true, offline: true };
        }
        return { ok: false, pesan: '❌ Tidak bisa terhubung ke server, dan perangkat ini belum pernah login online dengan PIN tersebut.' };
      }
    }

    // Ganti PIN sendiri (roleTarget kosong/sama dengan role aktif) atau admin mengatur PIN role lain.
    async function kirimGantiPin(pinBaru, roleTarget) {
      pinBaru = String(pinBaru || '').trim();
      if (!/^\d{4}$/.test(pinBaru)) return { ok: false, error: 'PIN harus 4 digit angka.' };
      const own = !roleTarget || roleTarget === state.role;
      if (!state.scriptUrl) {
        const kunci = { petugas: 'pinPetugas', dokter: 'pinDokter', kasi: 'pinKasi', admin: 'pinAdmin' }[roleTarget || state.role];
        if (kunci) { state[kunci] = hashPIN(pinBaru); saveState(); }
        return { ok: true, lokal: true };
      }
      try {
        const resp = await fetch(state.scriptUrl, {
          method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: own ? 'gantiPin' : 'aturPin', data: { pinBaru: pinBaru, role: roleTarget || state.role }, deviceId: state._deviceId || 'web' })
        });
        const json = JSON.parse(await resp.text());
        if (json && json.ok) {
          if (own) _simpanVerifierOffline(state.role, pinBaru); else _hapusVerifierOffline(roleTarget);
          return { ok: true };
        }
        return { ok: false, error: (json && json.error) || 'Ditolak server.' };
      } catch (e) {
        return { ok: false, error: 'Tidak bisa terhubung ke server.' };
      }
    }

    // Layar wajib ganti PIN (muncul setelah login dengan PIN bawaan/lemah). Tidak bisa ditutup sebelum PIN diganti.
    function tampilWajibGantiPin() {
      // Diingat selama tab terbuka: muat ulang halaman tidak bisa dipakai untuk melewati layar ini
      try { sessionStorage.setItem('simkeda_wajib_ganti', '1'); } catch (e) {}
      if (document.getElementById('wajibGantiPinOverlay')) return;
      const ov = document.createElement('div');
      ov.id = 'wajibGantiPinOverlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(10,30,22,.85);display:flex;align-items:center;justify-content:center;padding:16px;';
      ov.innerHTML = '<div style="background:#fff;border-radius:14px;max-width:360px;width:100%;padding:22px;font-family:inherit;">' +
        '<h3 style="margin:0 0 8px;color:#1a6b4a;">🔐 Ganti PIN Anda</h3>' +
        '<p style="font-size:.85rem;color:#444;margin:0 0 14px;">PIN Anda masih PIN bawaan/mudah ditebak. Buat PIN baru 4 digit (jangan angka sama atau berurutan) sebelum melanjutkan.</p>' +
        '<input id="wgpBaru" type="password" inputmode="numeric" maxlength="4" placeholder="PIN baru (4 digit)" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #bbb;border-radius:8px;box-sizing:border-box;">' +
        '<input id="wgpUlang" type="password" inputmode="numeric" maxlength="4" placeholder="Ulangi PIN baru" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #bbb;border-radius:8px;box-sizing:border-box;">' +
        '<div id="wgpErr" style="color:#c0392b;font-size:.82rem;min-height:1.2em;margin-bottom:8px;"></div>' +
        '<button id="wgpBtn" style="width:100%;padding:11px;border:0;border-radius:8px;background:#1a6b4a;color:#fff;font-weight:600;cursor:pointer;">Simpan PIN Baru</button></div>';
      document.body.appendChild(ov);
      const err = document.getElementById('wgpErr');
      document.getElementById('wgpBtn').onclick = async function() {
        const a = document.getElementById('wgpBaru').value.trim(), b = document.getElementById('wgpUlang').value.trim();
        if (a !== b) { err.textContent = 'Konfirmasi PIN tidak sama.'; return; }
        this.disabled = true; err.textContent = 'Menyimpan...';
        const r = await kirimGantiPin(a);
        this.disabled = false;
        if (!r.ok) { err.textContent = r.error || 'Gagal menyimpan PIN.'; return; }
        try { sessionStorage.removeItem('simkeda_wajib_ganti'); } catch (e) {}
        ov.remove();
        if (typeof showToast === 'function') showToast('✅ PIN baru tersimpan.');
      };
    }

    // ── Antrean offline untuk perubahan data ──
    const _ANTREAN_KEY = 'simkeda_antrean_v1';
    let _antreanJalan = false;
    function _bacaAntrean() { try { return JSON.parse(localStorage.getItem(_ANTREAN_KEY) || '[]'); } catch (e) { return []; } }
    function _tulisAntrean(a) {
      try { localStorage.setItem(_ANTREAN_KEY, JSON.stringify(a)); }
      catch (e) { console.warn('[SIMKEDA] antrean offline gagal disimpan (penyimpanan penuh?)', e); }
      _updateBadgeAntrean();
    }
    function _antrekan(action, data) {
      const a = _bacaAntrean();
      a.push({ action: action, data: data, t: new Date().toISOString() });
      if (a.length > 500) a.splice(0, a.length - 500);
      _tulisAntrean(a);
    }
    function _updateBadgeAntrean() {
      try {
        let el = document.getElementById('antreanBadge');
        const nFoto = (typeof _antreanFotoJumlah === 'number') ? _antreanFotoJumlah : 0;
        const n = _bacaAntrean().length + nFoto;
        if (!el) {
          if (!n) return;
          el = document.createElement('div');
          el.id = 'antreanBadge';
          el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;background:#b9770e;color:#fff;padding:7px 12px;border-radius:20px;font-size:.78rem;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);';
          el.title = 'Ketuk untuk mencoba kirim sekarang';
          el.onclick = function() { kirimAntrean(true); if (typeof kirimAntreanFoto === 'function') kirimAntreanFoto(true); };
          document.body.appendChild(el);
        }
        el.style.display = n ? '' : 'none';
        el.textContent = '⏳ ' + n + ' perubahan belum terkirim' + (nFoto ? ' (termasuk ' + nFoto + ' foto)' : '');
      } catch (e) {}
    }
    // → { status: 'ok' | 'ditolak' | 'sesi' | 'jaringan', error }
    async function _postKeServer(action, data) {
      const controller = new AbortController();
      const tid = setTimeout(function() { controller.abort(); }, 30000);
      try {
        const resp = await fetch(state.scriptUrl, {
          method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: action, data: data, deviceId: state._deviceId || 'web', timestamp: new Date().toISOString() }),
          signal: controller.signal
        });
        clearTimeout(tid);
        const raw = await resp.text();
        let hasil = null;
        try { hasil = JSON.parse(raw); } catch (pe) {
          console.error('[SIMKEDA] respons bukan JSON. status=' + resp.status + ' raw=', raw.slice(0, 500));
          return { status: 'jaringan', error: 'respons server tidak dikenali (status ' + resp.status + ')' };
        }
        if (hasil && hasil.ok === true) return { status: 'ok' };
        const msg = (hasil && hasil.error) || 'ditolak tanpa keterangan';
        if (/sesi tidak sah|token tidak valid/i.test(msg)) return { status: 'sesi', error: msg };
        // Penolakan sementara (server sibuk / batas laju / batas waktu Google) BUKAN berarti
        // datanya salah — perlakukan seperti gangguan jaringan supaya tetap diantrekan, bukan dibuang.
        if (/server sibuk|terlalu banyak request|coba lagi|lock|timed? ?out|exceeded maximum execution|service invoked too many|layanan/i.test(msg)) return { status: 'jaringan', error: msg };
        return { status: 'ditolak', error: msg };
      } catch (e) {
        clearTimeout(tid);
        return { status: 'jaringan', error: 'tidak bisa terhubung ke server (' + (e && e.message ? e.message : 'jaringan') + ')' };
      }
    }
    async function kirimAntrean(manual) {
      if (_antreanJalan || !state.scriptUrl || !_sesiToken || !navigator.onLine) return;
      if (!_bacaAntrean().length) { _updateBadgeAntrean(); return; }
      _antreanJalan = true;
      let terkirim = 0;
      const ditolak = [];
      try {
        while (true) {
          const a = _bacaAntrean();
          if (!a.length) break;
          const it = a[0];
          const r = await _postKeServer(it.action, it.data);
          if (r.status === 'jaringan' || r.status === 'sesi') {
            if (r.status === 'sesi') _laporkanSyncGagal(r.error);
            break;
          }
          if (r.status === 'ditolak') { console.warn('[SIMKEDA] item antrean ditolak server & dibuang:', it.action, r.error); ditolak.push(r.error); }
          else terkirim++;
          const cur = _bacaAntrean(); cur.shift(); _tulisAntrean(cur);
        }
      } finally { _antreanJalan = false; }
      // Dulu perubahan yang ditolak server dibuang diam-diam (hanya tercatat di konsol)
      if (ditolak.length && typeof showToast === 'function') {
        showToast('⚠️ ' + ditolak.length + ' perubahan tertunda DITOLAK server dan tidak tersimpan di spreadsheet: ' + ditolak[0] + ' — periksa data lalu simpan ulang.', 9000);
      } else if (terkirim && typeof showToast === 'function') showToast('☁️ ' + terkirim + ' perubahan tertunda berhasil dikirim');
      else if (manual && _bacaAntrean().length && typeof showToast === 'function') showToast('Belum bisa terkirim — coba lagi saat koneksi stabil.');
    }
    window.addEventListener('online', function() { kirimAntrean(); });
    setInterval(function() { kirimAntrean(); }, 30000);
    window.addEventListener('load', _updateBadgeAntrean);

    // ── Terapkan penanda "terhapus" dari server ke data lokal ──
    const _TOMBSTONE_KEY = { penerima: ['penerima', 'nomorInduk'], pemeriksaan: ['pemeriksaan', 'id'], insidental: ['insidental', 'id'],
      rujukan: ['rujukan', 'id'], pengukuranAwal: ['pengukuranAwal', 'id'], antrian: ['antrian', 'id'], asesmenAwal: ['asesmenAwal', 'nomorInduk'],
      fotoMinggu: ['fotoMinggu', 'id'], obatKeluar: ['obatKeluar', 'id'], stokObat: ['stokObat', 'nama'] };
    function _terapkanTerhapus(daftar) {
      let berubah = false;
      const peta = {};
      daftar.forEach(function(t) {
        const k = t.sheet + '|' + String(t.id).trim();
        const w = new Date(t.deletedAt).getTime() || 0;
        if (!peta[k] || w > peta[k]) peta[k] = w;
      });
      Object.keys(_TOMBSTONE_KEY).forEach(function(sh) {
        const sk = _TOMBSTONE_KEY[sh][0], idk = _TOMBSTONE_KEY[sh][1];
        const arr = state[sk];
        if (!Array.isArray(arr) || !arr.length) return;
        const baru = arr.filter(function(r) {
          const w = peta[sh + '|' + String(r && r[idk] != null ? r[idk] : '').trim()];
          if (!w) return true;
          const tUp = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
          return tUp > w;   // diedit SETELAH dihapus → pertahankan
        });
        if (baru.length !== arr.length) { state[sk] = baru; berubah = true; }
      });
      return berubah;
    }


    // ══════════════════════════════════════════════════════
    //  VALIDASI NILAI MEDIS
    //  galat   = mustahil secara medis/format → simpan DIBLOKIR
    //  ragu    = mungkin salah ketik → minta konfirmasi dulu
    //  Nilai tinggi/rendah yang masih mungkin (mis. TD 150/95) TIDAK dihambat.
    // ══════════════════════════════════════════════════════
    const BATAS_VITAL = {
      sist:  { nama: 'Tekanan darah sistolik', satuan: 'mmHg', galat: [60, 260], ragu: [80, 220] },
      diast: { nama: 'Tekanan darah diastolik', satuan: 'mmHg', galat: [30, 160], ragu: [50, 130] },
      nadi:  { nama: 'Nadi', satuan: '/mnt', galat: [30, 220], ragu: [40, 150] },
      napas: { nama: 'Pernapasan', satuan: '/mnt', galat: [5, 70], ragu: [10, 40] },
      suhu:  { nama: 'Suhu tubuh', satuan: '°C', galat: [32, 43], ragu: [35, 40] },
      bb:    { nama: 'Berat badan', satuan: 'kg', galat: [2, 350], ragu: [15, 200] },
      tb:    { nama: 'Tinggi badan', satuan: 'cm', galat: [40, 240], ragu: [100, 210] },
      spo2:  { nama: 'SpO₂', satuan: '%', galat: [50, 100], ragu: [85, 100] }
    };
    function _angkaVital(v) {
      if (v === undefined || v === null) return null;
      const t = String(v).trim().replace(',', '.');
      if (t === '' || t === '-') return null;
      return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NaN;
    }
    // → { galat: [teks], ragu: [teks] }
    function validasiVital(v, hariIni) {
      const galat = [], ragu = [];
      const cekNilai = function(kunci, nilai) {
        const b = BATAS_VITAL[kunci];
        if (nilai === null) return;
        if (isNaN(nilai)) { galat.push(b.nama + ' harus berupa angka.'); return; }
        if (nilai < b.galat[0] || nilai > b.galat[1]) galat.push(b.nama + ' ' + nilai + ' ' + b.satuan + ' tidak masuk akal (batas ' + b.galat[0] + '–' + b.galat[1] + '). Periksa kembali.');
        else if (nilai < b.ragu[0] || nilai > b.ragu[1]) ragu.push(b.nama + ' ' + nilai + ' ' + b.satuan);
      };
      // tanggal
      const hi = hariIni || new Date();
      const besok = new Date(hi.getFullYear(), hi.getMonth(), hi.getDate() + 1);
      const fmt = function(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
      if (v.tgl) {
        if (!/^\d{4}-\d{2}-\d{2}/.test(String(v.tgl))) galat.push('Format tanggal tidak dikenali.');
        else if (String(v.tgl).slice(0, 10) > fmt(besok)) galat.push('Tanggal pemeriksaan tidak boleh di masa depan.');
        else if (String(v.tgl).slice(0, 10) < '2000-01-01') galat.push('Tanggal pemeriksaan terlalu lama (sebelum tahun 2000).');
      }
      if (v.kontrol) {
        const k = String(v.kontrol).slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) galat.push('Format tanggal kontrol ulang tidak dikenali.');
        else if (v.tgl && k < String(v.tgl).slice(0, 10)) galat.push('Jadwal kontrol ulang tidak boleh sebelum tanggal pemeriksaan.');
      }
      // tekanan darah: 120/80
      if (v.td !== undefined && v.td !== null && String(v.td).trim() !== '') {
        const m = String(v.td).trim().match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
        if (!m) galat.push('Format tekanan darah harus seperti 120/80.');
        else {
          const sis = parseInt(m[1], 10), dia = parseInt(m[2], 10);
          if (sis <= dia) galat.push('Tekanan darah ' + sis + '/' + dia + ': sistolik harus lebih besar dari diastolik.');
          cekNilai('sist', sis); cekNilai('diast', dia);
        }
      }
      cekNilai('nadi', _angkaVital(v.nadi)); cekNilai('napas', _angkaVital(v.napas)); cekNilai('suhu', _angkaVital(v.suhu));
      cekNilai('bb', _angkaVital(v.bb)); cekNilai('tb', _angkaVital(v.tb)); cekNilai('spo2', _angkaVital(v.spo2));
      return { galat: galat, ragu: ragu };
    }
    function _cekVitalSebelumSimpan(v, alertId) {
      const h = validasiVital(v);
      if (h.galat.length) {
        const pesan = '❌ ' + h.galat.join(' ');
        try { showAlert(alertId, 'error', pesan); } catch (e) {}
        try { showToast(h.galat[0], 'error'); } catch (e) {}
        return false;
      }
      if (h.ragu.length) {
        return confirm('Nilai berikut tidak biasa:\n• ' + h.ragu.join('\n• ') + '\n\nApakah sudah benar dan ingin tetap disimpan?');
      }
      return true;
    }
