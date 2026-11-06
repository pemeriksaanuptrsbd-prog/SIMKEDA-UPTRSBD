// ══════════════════════════════════════════════════════════════
//  20 — Prioritas terapi dan tautan hasil terapi per PM (data dari TERAVIA)
//  Di daftar Data PM: lencana prioritas terapi + tombol 🩺 yang membuka daftar semua form hasil terapi PM itu
//  (asesmen, catatan terapi, reasesmen, evaluasi, selesai layanan). Tautan membuka TERAVIA (perlu login TERAVIA).
//  Hanya membaca; isi klinis tidak dibawa ke SIMKEDA.
// ══════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var peta = null, memuat = false, waktu = 0;
  var SINGKAT = { 'Fisioterapi': 'Fisio', 'Terapi okupasi': 'Okupasi', 'Terapi wicara': 'Wicara' };
  function e(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function adaUrl() { return typeof state !== 'undefined' && state.scriptUrl; }
  function ambil(lanjut) {
    if (!adaUrl() || memuat) return;
    if (peta && Date.now() - waktu < 300000) return;
    memuat = true;
    fetch(state.scriptUrl + '?action=teraviaPM').then(function (r) { return r.text(); }).then(function (t) {
      var j = JSON.parse(t); if (!j.ok) throw new Error(j.error || 'ditolak');
      peta = j.data; waktu = Date.now(); memuat = false; if (lanjut) lanjut();
    }).catch(function () { memuat = false; peta = peta || {}; waktu = Date.now() - 240000; });   // gagal: coba lagi sekitar 1 menit kemudian
  }
  function lencana(p) {
    var warna = p.fase === 'Terapi' ? '#e1f5e8;color:#17653a' : p.fase === 'Asesmen' ? '#fff0d1;color:#7a4a00' : '#e4ecff;color:#1a3fae';
    var teks = p.fase === 'Asesmen' ? 'asesmen' : (p.posisi ? '#' + p.posisi + '/' + p.dari : '') + (p.fase === 'Terapi' && p.hari ? ' ' + p.hari : p.fase !== 'Terapi' ? ' menunggu jadwal' : '');
    return '<span title="' + e(p.layanan + ' · ' + p.fase) + '" style="display:inline-block;margin:2px 4px 0 0;padding:1px 7px;border-radius:999px;font-size:.66rem;font-weight:700;background:' + warna + '">' + e(SINGKAT[p.layanan] || p.layanan) + ' ' + e(teks) + '</span>';
  }
  function hiasBaris() {
    var tb = document.getElementById('listPMBody'); if (!tb || !peta) return;
    tb.querySelectorAll('tr').forEach(function (tr) {
      var td = tr.querySelectorAll('td'); if (td.length < 10 || tr.getAttribute('data-tv')) return;
      var ni = (td[1].textContent || '').trim(), x = peta[ni]; tr.setAttribute('data-tv', '1');
      if (x && x.program.length) { var d = document.createElement('div'); d.innerHTML = x.program.map(lencana).join(''); td[2].appendChild(d);
        var dg = []; x.program.forEach(function (p) { if (p.diagnosa && dg.indexOf(p.diagnosa) < 0) dg.push(p.diagnosa); });
        if (dg.length) { var dd = document.createElement('div'); dd.style.cssText = 'font-size:.72rem;color:#5b6b8c;margin-top:2px'; dd.textContent = 'Dx: ' + dg.join('; '); td[2].appendChild(dd); } }
      var aksi = td[9], b = document.createElement('button');
      b.className = 'btn btn-sm'; b.title = 'Hasil terapi (TERAVIA)'; b.textContent = '🩺'; b.style.cssText = 'background:#e4ecff;color:#1a3fae;'; b.onclick = function () { buka(ni, td[2].childNodes[0] ? td[2].childNodes[0].textContent : ni); };
      aksi.appendChild(b);
    });
  }
  function buka(ni, nama) {
    var lama = document.getElementById('modalTeraviaPM'); if (lama) lama.remove();
    var ov = document.createElement('div'); ov.id = 'modalTeraviaPM';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,20,50,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px';
    ov.innerHTML = '<div style="background:#fff;border-radius:14px;max-width:720px;width:100%;max-height:88vh;overflow:auto;padding:18px 20px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h3 style="margin:0">🩺 Hasil terapi · ' + e(nama) + '</h3><button class="btn btn-ghost btn-sm" id="tvTutup" type="button">✕</button></div><div id="tvIsi" style="margin-top:10px">⏳ Mengambil data dari TERAVIA…</div></div>';
    document.body.appendChild(ov);
    ov.onclick = function (ev) { if (ev.target === ov) ov.remove(); }; document.getElementById('tvTutup').onclick = function () { ov.remove(); };
    fetch(state.scriptUrl + '?action=teraviaPM&nomorInduk=' + encodeURIComponent(ni)).then(function (r) { return r.text(); }).then(function (t) {
      var j = JSON.parse(t); if (!j.ok) throw new Error(j.error || 'ditolak'); var d = j.data, o = '';
      o += d.program.length ? '<div style="margin-bottom:10px"><b>Program terapi & prioritas</b><table style="width:100%;border-collapse:collapse;font-size:.85rem;margin-top:4px"><tr style="text-align:left;color:#5b6b8c"><th>Layanan</th><th>Diagnosa</th><th>Status</th><th>Hari</th><th>Prioritas</th></tr>' +
        d.program.map(function (p) { return '<tr style="border-top:1px solid #eef1f7"><td>' + e(p.layanan) + '</td><td>' + (e(p.diagnosa) || '-') + '</td><td>' + e(p.fase) + '</td><td>' + e(p.fase === 'Terapi' ? p.hari : '-') + '</td><td>' + (p.fase === 'Asesmen' ? '-' : '#' + p.posisi + ' dari ' + p.dari) + '</td></tr>'; }).join('') + '</table></div>' : '<div style="margin-bottom:10px;color:#5b6b8c">PM ini belum terdaftar di layanan terapi (TERAVIA).</div>';
      o += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b>Form hasil terapi (' + d.dokumen.length + ')</b><a class="btn btn-sm" target="_blank" rel="noopener" href="' + e(d.tautanRekam) + '">Buka rekam medis di TERAVIA ↗</a></div>';
      o += d.dokumen.length ? '<table style="width:100%;border-collapse:collapse;font-size:.85rem;margin-top:6px"><tr style="text-align:left;color:#5b6b8c"><th>Tanggal</th><th>Layanan</th><th>Form</th><th>Status</th><th>Petugas</th><th></th></tr>' +
        d.dokumen.map(function (x) { return '<tr style="border-top:1px solid #eef1f7"><td>' + e(x.tanggal) + '</td><td>' + e(x.layanan) + '</td><td>' + e(x.judul) + '</td><td>' + e(x.status) + '</td><td>' + e(x.petugas) + '</td><td><a target="_blank" rel="noopener" href="' + e(x.tautan) + '">Buka ↗</a></td></tr>'; }).join('') + '</table>' : '<div style="margin-top:6px;color:#5b6b8c">Belum ada form hasil terapi.</div>';
      o += '<div style="margin-top:10px;font-size:.75rem;color:#5b6b8c">Tautan membuka TERAVIA dan memerlukan login TERAVIA. Isi klinis tidak ditampilkan di SIMKEDA.</div>';
      document.getElementById('tvIsi').innerHTML = o;
    }).catch(function (er) { var h = document.getElementById('tvIsi'); if (h) h.innerHTML = '<span style="color:#a02020">❌ ' + e(er.message) + '</span>'; });
  }
  function pasang() {
    if (typeof window.renderListPM !== 'function' || window.renderListPM._tv) return;
    var asli = window.renderListPM;
    window.renderListPM = function () { var h = asli.apply(this, arguments); hiasBaris(); ambil(function () { var tb = document.getElementById('listPMBody'); if (tb) tb.querySelectorAll('tr[data-tv]').forEach(function (r) { r.removeAttribute('data-tv'); }); hiasBaris(); }); return h; };
    window.renderListPM._tv = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
})();
