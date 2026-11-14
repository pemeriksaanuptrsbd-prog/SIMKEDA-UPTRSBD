/**
 * berkas-ooxml.js : pembuat berkas Word (.docx) dan Excel (.xlsx) ASLI tanpa pustaka luar.
 * Dipakai bersama oleh TERAVIA dan SIMKEDA (salin apa adanya).
 *
 * Mengapa: berkas "Word/Excel" lama sebenarnya halaman HTML yang diberi akhiran .doc/.xls. Word dan Excel versi baru,
 * Word/Excel di HP, serta Google Docs/Sheets menganggapnya rusak. Berkas di sini memakai format resmi (OOXML dalam ZIP).
 *
 *   Berkas.xlsx(daftarSheet)           -> Uint8Array
 *   Berkas.docxDariHtml(html, opsi)    -> Promise<Uint8Array>
 *   Berkas.unduh(bytes, nama, mime)    -> memicu unduhan
 */
(function (g) {
  'use strict';
  var MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // ---------- Alat dasar ----------
  var ENC = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  function u8(str) {
    if (ENC) return ENC.encode(str);
    var s = unescape(encodeURIComponent(str)), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }
  function dariBase64(b64) { var bin = atob(b64), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  /** Teks aman untuk XML 1.0 (karakter kendali dibuang). */
  function x(s) {
    return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(a) { var c = 0xFFFFFFFF; for (var i = 0; i < a.length; i++) c = CRC[(c ^ a[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  /** ZIP tanpa kompresi (metode "store"): berkas : [{nama, data: Uint8Array}] */
  function zip(berkas) {
    var now = new Date(), dt = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(), tm = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    var potong = [], pusat = [], offset = 0, total = 0;
    berkas.forEach(function (f) {
      var nm = u8(f.nama), d = f.data, crc = crc32(d);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true);
      h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true);
      c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, offset, true);
      potong.push(new Uint8Array(h.buffer), nm, d); pusat.push(new Uint8Array(c.buffer), nm);
      offset += 30 + nm.length + d.length; total++;
    });
    var ukPusat = 0; pusat.forEach(function (p) { ukPusat += p.length; });
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, total, true); e.setUint16(10, total, true); e.setUint32(12, ukPusat, true); e.setUint32(16, offset, true);
    var semua = potong.concat(pusat, [new Uint8Array(e.buffer)]), n = 0; semua.forEach(function (p) { n += p.length; });
    var out = new Uint8Array(n), o = 0; semua.forEach(function (p) { out.set(p, o); o += p.length; });
    return out;
  }

  function unduh(bytes, nama, mime) {
    var blob = new Blob([bytes], { type: mime }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  var XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  var NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
  var NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  // =====================================================================================================================
  //  EXCEL (.xlsx)
  // =====================================================================================================================
  var WARNA = { biru: '1A3FAE', cyan: '0B6A86', oranye: 'D98A00', hijau: '1A8A4F', abu: 'F2F2F2' };

  function namaKolom(n) { var s = ''; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function aman(nama) { return String(nama).replace(/[\[\]\*\?\/\\:]/g, ' ').substr(0, 31).trim() || 'Sheet'; }
  function refSheet(nama) { return "'" + String(nama).replace(/'/g, "''") + "'"; }
  /** Alamat sel/rentang dengan tanda $ : rentang('Sheet', 1, 0, 1, 5) = 'Sheet'!$B$1:$B$6 (kolom, baris awal, kolom, baris akhir; semua 0-awal) */
  function rentang(sheet, c1, r1, c2, r2) { return refSheet(sheet) + '!$' + namaKolom(c1) + '$' + (r1 + 1) + (c1 === c2 && r1 === r2 ? '' : ':$' + namaKolom(c2) + '$' + (r2 + 1)); }

  // gaya sel -> nomor xf di styles.xml
  var GAYA = { biasa: 0, judul: 1, sub: 2, kepala: 3, sel: 4, angka: 5, tebal: 6, tebalAngka: 7, uraian: 8, catatan: 9 };
  function stylesXml() {
    var fonts = ['<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>',
      '<font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font>',
      '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>',
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>',
      '<font><i/><sz val="10"/><color rgb="FF595959"/><name val="Calibri"/><family val="2"/></font>'];
    var fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FF' + WARNA.biru + '"/><bgColor indexed="64"/></patternFill></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FF' + WARNA.abu + '"/><bgColor indexed="64"/></patternFill></fill>'];
    var sisi = function (n) { return '<' + n + ' style="thin"><color rgb="FF808080"/></' + n + '>'; };
    var borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>', '<border>' + sisi('left') + sisi('right') + sisi('top') + sisi('bottom') + '<diagonal/></border>'];
    var xf = function (font, fill, border, h, v, wrap) {
      return '<xf numFmtId="0" fontId="' + font + '" fillId="' + fill + '" borderId="' + border + '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment' + (h ? ' horizontal="' + h + '"' : '') + ' vertical="' + (v || 'top') + '"' + (wrap ? ' wrapText="1"' : '') + '/></xf>';
    };
    var xfs = [xf(0, 0, 0, '', 'top', false), xf(1, 0, 0, '', 'center', false), xf(2, 0, 0, '', 'center', false), xf(3, 2, 1, 'center', 'center', true),
      xf(0, 0, 1, '', 'top', true), xf(0, 0, 1, 'center', 'top', false), xf(2, 3, 1, '', 'top', true), xf(2, 3, 1, 'center', 'top', false), xf(0, 0, 0, '', 'top', true), xf(4, 0, 0, '', 'top', true)];
    return XML + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="' + fonts.length + '">' + fonts.join('') + '</fonts><fills count="' + fills.length + '">' + fills.join('') + '</fills><borders count="' + borders.length + '">' + borders.join('') +
      '</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + xfs.length + '">' + xfs.join('') + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }

  function sheetXml(sh, adaGambar) {
    var baris = sh.baris || [], gabung = (sh.gabung || []).slice(), lebar = sh.lebar || [];
    var xml = XML + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="' + NS_R + '">';
    xml += '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>';
    xml += '<sheetViews><sheetView workbookViewId="0"' + (sh.tanpaGaris ? ' showGridLines="0"' : '') + '>' + (sh.bekukan ? '<pane ySplit="' + sh.bekukan + '" topLeftCell="A' + (sh.bekukan + 1) + '" activePane="bottomLeft" state="frozen"/>' : '') + '</sheetView></sheetViews>';
    xml += '<sheetFormatPr defaultRowHeight="15"/>';
    if (lebar.length) xml += '<cols>' + lebar.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols>';
    xml += '<sheetData>';
    baris.forEach(function (r, ri) {
      var sel = Array.isArray(r) ? r : (r && r.sel) || [], tinggi = (!Array.isArray(r) && r && r.tinggi) || 0, cs = '';
      var ci = 0;
      sel.forEach(function (c) {
        if (c === null || c === undefined || c === '') { ci++; return; }
        var o = (typeof c === 'object') ? c : { v: c }, gaya = o.g || (typeof o.v === 'number' ? 'angka' : 'sel'), s = GAYA[gaya] || 0, ref = namaKolom(ci) + (ri + 1);
        if (o.gabung && o.gabung > 1) gabung.push(ref + ':' + namaKolom(ci + o.gabung - 1) + (ri + 1));
        if (typeof o.v === 'number' && isFinite(o.v)) cs += '<c r="' + ref + '" s="' + s + '"><v>' + o.v + '</v></c>';
        else cs += '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + x(o.v) + '</t></is></c>';
        // sel gabungan: sel-sel sisanya diberi gaya yang sama agar garis tepi lengkap
        if (o.gabung && o.gabung > 1) for (var k = 1; k < o.gabung; k++) cs += '<c r="' + namaKolom(ci + k) + (ri + 1) + '" s="' + s + '"/>';
        ci += (o.gabung && o.gabung > 1) ? o.gabung : 1;
      });
      xml += '<row r="' + (ri + 1) + '"' + (tinggi ? ' ht="' + tinggi + '" customHeight="1"' : '') + '>' + cs + '</row>';
    });
    xml += '</sheetData>';
    if (gabung.length) xml += '<mergeCells count="' + gabung.length + '">' + gabung.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>';
    xml += '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="' + (sh.mendatar ? 'landscape' : 'portrait') + '" fitToWidth="1" fitToHeight="0"/>';
    if (adaGambar) xml += '<drawing r:id="rId1"/>';
    return xml + '</worksheet>';
  }

  /** Grafik batang native Excel. gf = {judul, jenis:'kolom'|'bar', kategori:{ref, nilai:[]}, seri:[{nama, namaRef, ref, nilai:[], warna}], kolom, baris, lebar, tinggi} */
  function chartXml(gf) {
    var bar = gf.jenis === 'bar';
    var teks = function (t, sz, b) { return '<c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="' + sz + '" b="' + (b ? 1 : 0) + '"/></a:pPr><a:r><a:rPr lang="id-ID" sz="' + sz + '" b="' + (b ? 1 : 0) + '"/><a:t>' + x(t) + '</a:t></a:r></a:p></c:rich></c:tx>'; };
    var strCache = function (arr) { return '<c:strCache><c:ptCount val="' + arr.length + '"/>' + arr.map(function (v, i) { return '<c:pt idx="' + i + '"><c:v>' + x(v) + '</c:v></c:pt>'; }).join('') + '</c:strCache>'; };
    var numCache = function (arr) { return '<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="' + arr.length + '"/>' + arr.map(function (v, i) { return '<c:pt idx="' + i + '"><c:v>' + (isFinite(v) ? v : 0) + '</c:v></c:pt>'; }).join('') + '</c:numCache>'; };
    var sers = gf.seri.map(function (s, i) {
      return '<c:ser><c:idx val="' + i + '"/><c:order val="' + i + '"/><c:tx><c:strRef><c:f>' + x(s.namaRef) + '</c:f>' + strCache([s.nama]) + '</c:strRef></c:tx>' +
        '<c:spPr><a:solidFill><a:srgbClr val="' + (s.warna || WARNA.biru) + '"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>' +
        '<c:dLbls><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>' +
        '<c:cat><c:strRef><c:f>' + x(gf.kategori.ref) + '</c:f>' + strCache(gf.kategori.nilai) + '</c:strRef></c:cat><c:val><c:numRef><c:f>' + x(s.ref) + '</c:f>' + numCache(s.nilai) + '</c:numRef></c:val></c:ser>';
    }).join('');
    return XML + '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="' + NS_R + '"><c:roundedCorners val="0"/><c:chart>' +
      '<c:title>' + teks(gf.judul, 1200, true) + '<c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>' +
      '<c:barChart><c:barDir val="' + (bar ? 'bar' : 'col') + '"/><c:grouping val="clustered"/><c:varyColors val="0"/>' + sers + '<c:gapWidth val="80"/><c:axId val="111111111"/><c:axId val="222222222"/></c:barChart>' +
      '<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="' + (bar ? 'maxMin' : 'minMax') + '"/></c:scaling><c:delete val="0"/><c:axPos val="' + (bar ? 'l' : 'b') + '"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="222222222"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>' +
      '<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="' + (bar ? 'b' : 'l') + '"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="D9D9D9"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="111111111"/><c:crosses val="' + (bar ? 'max' : 'autoZero') + '"/><c:crossBetween val="between"/></c:valAx>' +
      '</c:plotArea>' + (gf.seri.length > 1 ? '<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>' : '') + '<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>';
  }
  function drawingXml(grafik, idAwal) {
    return XML + '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="' + NS_R + '" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">' +
      grafik.map(function (gf, i) {
        var c1 = gf.kolom, r1 = gf.baris, c2 = c1 + (gf.lebar || 8), r2 = r1 + (gf.tinggi || 16);
        return '<xdr:twoCellAnchor><xdr:from><xdr:col>' + c1 + '</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>' + r1 + '</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>' + c2 + '</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>' + r2 + '</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>' +
          '<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="' + (i + 2) + '" name="Grafik ' + (idAwal + i) + '"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId' + (i + 1) + '"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>';
      }).join('') + '</xdr:wsDr>';
  }

  /** daftar : [{nama, lebar:[], baris:[], gabung:[], mendatar, bekukan, grafik:[...]}] */
  function xlsx(daftar) {
    var files = [], tipe = '', relWb = '', sheetsWb = '', nChart = 0, nDraw = 0, dipakai = {};
    daftar.forEach(function (sh, i) {
      var nm = aman(sh.nama), asli = nm, k = 2; while (dipakai[nm.toLowerCase()]) nm = asli.substr(0, 28) + ' ' + (k++); dipakai[nm.toLowerCase()] = 1; sh.nama = nm;
    });
    daftar.forEach(function (sh, i) {
      var n = i + 1, ada = sh.grafik && sh.grafik.length;
      files.push({ nama: 'xl/worksheets/sheet' + n + '.xml', data: u8(sheetXml(sh, ada)) });
      tipe += '<Override PartName="/xl/worksheets/sheet' + n + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      relWb += '<Relationship Id="rId' + n + '" Type="' + NS_R + '/worksheet" Target="worksheets/sheet' + n + '.xml"/>';
      sheetsWb += '<sheet name="' + x(sh.nama) + '" sheetId="' + n + '" r:id="rId' + n + '"/>';
      if (ada) {
        nDraw++;
        var rel = '';
        sh.grafik.forEach(function (gf, j) { nChart++; files.push({ nama: 'xl/charts/chart' + nChart + '.xml', data: u8(chartXml(gf)) }); rel += '<Relationship Id="rId' + (j + 1) + '" Type="' + NS_R + '/chart" Target="../charts/chart' + nChart + '.xml"/>'; tipe += '<Override PartName="/xl/charts/chart' + nChart + '.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>'; });
        files.push({ nama: 'xl/drawings/drawing' + nDraw + '.xml', data: u8(drawingXml(sh.grafik, nChart - sh.grafik.length + 1)) });
        files.push({ nama: 'xl/drawings/_rels/drawing' + nDraw + '.xml.rels', data: u8(XML + '<Relationships xmlns="' + NS_REL + '">' + rel + '</Relationships>') });
        files.push({ nama: 'xl/worksheets/_rels/sheet' + n + '.xml.rels', data: u8(XML + '<Relationships xmlns="' + NS_REL + '"><Relationship Id="rId1" Type="' + NS_R + '/drawing" Target="../drawings/drawing' + nDraw + '.xml"/></Relationships>') });
        tipe += '<Override PartName="/xl/drawings/drawing' + nDraw + '.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>';
      }
    });
    var ns = daftar.length;
    relWb += '<Relationship Id="rId' + (ns + 1) + '" Type="' + NS_R + '/styles" Target="styles.xml"/>';
    files.unshift(
      { nama: '[Content_Types].xml', data: u8(XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + tipe + '</Types>') },
      { nama: '_rels/.rels', data: u8(XML + '<Relationships xmlns="' + NS_REL + '"><Relationship Id="rId1" Type="' + NS_R + '/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
      { nama: 'xl/workbook.xml', data: u8(XML + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="' + NS_R + '"><bookViews><workbookView/></bookViews><sheets>' + sheetsWb + '</sheets></workbook>') },
      { nama: 'xl/_rels/workbook.xml.rels', data: u8(XML + '<Relationships xmlns="' + NS_REL + '">' + relWb + '</Relationships>') },
      { nama: 'xl/styles.xml', data: u8(stylesXml()) });
    return zip(files);
  }

  // =====================================================================================================================
  //  WORD (.docx) dari HTML
  // =====================================================================================================================
  var LEBAR_ISI = 9638;   // lebar teks A4 (twips) dengan margin 2 cm
  var TAG_BLOK = { DIV: 1, P: 1, TABLE: 1, OL: 1, UL: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, SVG: 1, SECTION: 1, ARTICLE: 1, FIGURE: 1, FIGCAPTION: 1, BLOCKQUOTE: 1 };

  function gayaDari(el) {
    var o = {}, st = (el.getAttribute && el.getAttribute('style')) || '';
    st.split(';').forEach(function (p) { var i = p.indexOf(':'); if (i > 0) o[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim(); });
    return o;
  }
  function angkaPt(v) { // '12pt' | '16px' | '1.2em'(abaikan) -> poin
    var m = /^(-?[\d.]+)\s*(pt|px)?$/.exec(String(v || '').trim()); if (!m) return null;
    return m[2] === 'px' ? parseFloat(m[1]) * 0.75 : parseFloat(m[1]);
  }
  function twips(v) { var p = angkaPt(v); return p == null ? null : Math.round(p * 20); }
  function ruang(st) { // margin -> {atas, bawah} twips (tidak negatif)
    var a = null, b = null;
    if (st['margin']) { var p = st['margin'].split(/\s+/); var at = twips(p[0]), ba = twips(p.length === 1 ? p[0] : p.length >= 3 ? p[2] : p[0]); a = at; b = ba; }
    if (st['margin-top'] != null) a = twips(st['margin-top']); if (st['margin-bottom'] != null) b = twips(st['margin-bottom']);
    return { atas: Math.max(0, a || 0), bawah: Math.max(0, b || 0) };
  }
  function tebal(v) { return v === 'bold' || v === 'bolder' || parseInt(v, 10) >= 600; }
  function warnaHex(v) { var m = /^#([0-9a-f]{6})$/i.exec(String(v || '').trim()); if (m) return m[1].toUpperCase(); m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(String(v || '').trim()); return m ? (m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toUpperCase() : ''; }

  /** Konteks huruf yang diwariskan ke anak: {b,i,u,sz(setengah poin),f(font),w(warna),jc} */
  function ctxDari(el, p) {
    var c = { b: p.b, i: p.i, u: p.u, sz: p.sz, f: p.f, w: p.w, jc: p.jc }, st = gayaDari(el), t = el.tagName;
    if (t === 'B' || t === 'STRONG' || t === 'TH') c.b = true; if (t === 'I' || t === 'EM') c.i = true; if (t === 'U') c.u = true;
    if (/^H[1-6]$/.test(t)) { c.b = true; c.sz = { H1: 32, H2: 28, H3: 26, H4: 24, H5: 22, H6: 22 }[t]; }
    if (st['font-weight']) c.b = tebal(st['font-weight']);
    if (st['font-style']) c.i = st['font-style'] === 'italic';
    if (st['text-decoration'] && /underline/.test(st['text-decoration'])) c.u = true;
    if (st['font-size']) { var pt = angkaPt(st['font-size']); if (pt) c.sz = Math.round(pt * 2); }
    if (st['font-family']) { var f = st['font-family'].split(',')[0].replace(/['"]/g, '').trim(); if (f) c.f = f; }
    if (st['color']) { var w = warnaHex(st['color']); if (w) c.w = w; }
    if (st['text-align']) c.jc = { center: 'center', right: 'right', justify: 'both', left: 'left' }[st['text-align']] || c.jc;
    var al = el.getAttribute && el.getAttribute('align'); if (al && !st['text-align']) c.jc = { center: 'center', right: 'right', justify: 'both', left: 'left' }[al] || c.jc;
    return c;
  }
  function rPr(c) {
    return '<w:rPr>' + (c.f ? '<w:rFonts w:ascii="' + x(c.f) + '" w:hAnsi="' + x(c.f) + '" w:cs="' + x(c.f) + '"/>' : '') + (c.b ? '<w:b/>' : '') + (c.i ? '<w:i/>' : '') + (c.u ? '<w:u w:val="single"/>' : '') + (c.w ? '<w:color w:val="' + c.w + '"/>' : '') + (c.sz ? '<w:sz w:val="' + c.sz + '"/><w:szCs w:val="' + c.sz + '"/>' : '') + '</w:rPr>';
  }
  function run(teks, c) { return '<w:r>' + rPr(c) + '<w:t xml:space="preserve">' + x(teks) + '</w:t></w:r>'; }

  function Penulis(ctxAwal, gambar) { this.rels = []; this.media = []; this.gambar = gambar; this.idGbr = 0; this.ctxAwal = ctxAwal; }

  Penulis.prototype.drawing = function (info, cxPx, cyPx) {
    var id = ++this.idGbr, rid = 'rIdG' + id, ext = info.jenis === 'jpeg' ? 'jpg' : 'png', nama = 'image' + id + '.' + ext;
    this.media.push({ nama: 'word/media/' + nama, data: info.data }); this.rels.push('<Relationship Id="' + rid + '" Type="' + NS_R + '/image" Target="media/' + nama + '"/>');
    var cx = Math.round(cxPx * 9525), cy = Math.round(cyPx * 9525);
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="' + id + '" name="Gambar ' + id + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + id + '" name="' + nama + '"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  };

  /** Ukuran tampil gambar (px) dari gaya/atribut, dijaga proporsional dan tidak melebihi lebar halaman. */
  function ukuranGambar(el, info, maksPx) {
    var st = gayaDari(el), h = angkaPt(st['height']), w = angkaPt(st['width']);
    h = h != null ? h / 0.75 : null; w = w != null ? w / 0.75 : null;
    if (h == null && el.getAttribute('height') && /^[\d.]+$/.test(el.getAttribute('height'))) h = parseFloat(el.getAttribute('height'));
    if (w == null && el.getAttribute('width') && /^[\d.]+$/.test(el.getAttribute('width'))) w = parseFloat(el.getAttribute('width'));
    var rasio = info.w / info.h;
    if (h == null && w == null) {
      if (el.classList && el.classList.contains('ttd-img')) { h = Math.min(80, 240 / rasio); } else { h = info.h; }
      w = h * rasio;
    } else if (h == null) h = w / rasio; else if (w == null) w = h * rasio;
    if (w > maksPx) { h = h * maksPx / w; w = maksPx; }
    return [Math.max(1, w), Math.max(1, h)];
  }

  // inline: kumpulkan "run" dari simpul teks / span / b / i / br / img
  Penulis.prototype.inline = function (node, c, hasil, st) {
    var self = this;
    if (node.nodeType === 3) {
      var t = node.nodeValue.replace(/[ \t\r\n\f]+/g, ' ');
      if (st.awal) { t = t.replace(/^ /, ''); }
      if (t === '') return;
      if (t !== ' ' || !st.awal) { hasil.push(run(t, c)); st.awal = false; st.akhirSpasi = / $/.test(t); }
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName;
    if (tag === 'BR') { hasil.push('<w:r><w:br/></w:r>'); st.awal = true; return; }
    if (tag === 'IMG') { var inf = this.gambar.get(node); if (inf) { var u = ukuranGambar(node, inf, 560); hasil.push(this.drawing(inf, u[0], u[1])); st.awal = false; } return; }
    if (tag === 'SCRIPT' || tag === 'STYLE') return;
    var c2 = ctxDari(node, c);
    for (var n = node.firstChild; n; n = n.nextSibling) this.inline(n, c2, hasil, st);
  };

  function adaBlok(el) { for (var n = el.firstChild; n; n = n.nextSibling) { if (n.nodeType === 1 && (TAG_BLOK[n.tagName] || TAG_BLOK[String(n.tagName).toUpperCase()] || (n.hasAttribute && n.hasAttribute('data-kop-surat')))) return true; } return false; }
  function isiTeks(el) { return (el.textContent || '').replace(/[\s ]+/g, '') !== ''; }

  Penulis.prototype.paragraf = function (runs, c, st, ekstra) {
    ekstra = ekstra || {};
    var p = '<w:pPr>' + (ekstra.keepNext ? '<w:keepNext/>' : '') + (ekstra.keepLines ? '<w:keepLines/>' : '') + (ekstra.border || '') +
      '<w:spacing w:before="' + (ekstra.atas || 0) + '" w:after="' + (ekstra.bawah || 0) + '"' + (ekstra.baris ? ' w:line="' + ekstra.baris + '" w:lineRule="' + (ekstra.aturBaris || 'auto') + '"' : '') + '/>' +
      (ekstra.kiri || ekstra.pertama != null ? '<w:ind w:left="' + (ekstra.kiri || 0) + '"' + (ekstra.gantung ? ' w:hanging="' + ekstra.gantung + '"' : (ekstra.pertama ? ' w:firstLine="' + ekstra.pertama + '"' : '')) + '/>' : '') +
      (c.jc && c.jc !== 'left' ? '<w:jc w:val="' + c.jc + '"/>' : '') + '</w:pPr>';
    return '<w:p>' + p + runs.join('') + '</w:p>';
  };

  /** Properti paragraf dari gaya blok. */
  function ekstraDari(el, st) {
    var e = {}, r = ruang(st);
    e.atas = r.atas; e.bawah = r.bawah;
    if (st['line-height']) { var lh = parseFloat(st['line-height']); if (!isNaN(lh)) { if (/(px|pt)$/.test(st['line-height'])) { e.baris = Math.round(twips(st['line-height'])); e.aturBaris = 'atLeast'; } else e.baris = Math.round(240 * lh); } }
    if (st['text-indent']) { var ti = twips(st['text-indent']); if (ti) e.pertama = ti; }
    var pa = st['padding-left'] && twips(st['padding-left']); if (pa) e.kiri = pa;
    if (/avoid/.test(st['page-break-after'] || '') || /avoid/.test(st['break-after'] || '')) e.keepNext = true;
    if (/avoid/.test(st['page-break-inside'] || '') || /avoid/.test(st['break-inside'] || '')) e.keepLines = true;
    if (st['border-bottom'] && /solid|double/.test(st['border-bottom'])) { var lb = angkaPt(st['border-bottom'].split(/\s+/)[0]) || 1; e.border = '<w:pBdr><w:bottom w:val="single" w:sz="' + Math.max(4, Math.round(lb * 8)) + '" w:space="1" w:color="000000"/></w:pBdr>'; }
    return e;
  }

  Penulis.prototype.blok = function (el, c, out) {
    var self = this, tag = el.tagName;
    if (el.nodeType !== 1) return;
    if (tag === 'SCRIPT' || tag === 'STYLE') return;
    if (el.hasAttribute && el.hasAttribute('data-kop-surat')) { this.kop(el, c, out); return; }
    if (tag === 'TABLE') { this.tabel(el, c, out); return; }
    if (tag === 'OL' || tag === 'UL') { this.daftar(el, c, out); return; }
    if (tag === 'svg' || tag === 'SVG') { var inf = this.gambar.get(el); if (inf) { var u = ukuranGambar(el, inf, 600); out.push(this.paragraf([this.drawing(inf, u[0], u[1])], { jc: 'center' }, {}, { atas: 60, bawah: 60, keepNext: false })); } return; }
    if (tag === 'IMG') { var rr = [], ss = { awal: true }; this.inline(el, c, rr, ss); if (rr.length) out.push(this.paragraf(rr, c, {}, { atas: 0, bawah: 0 })); return; }
    var c2 = ctxDari(el, c), st = gayaDari(el);
    if (!adaBlok(el)) {
      var runs = [], s = { awal: true };
      for (var n = el.firstChild; n; n = n.nextSibling) this.inline(n, c2, runs, s);
      var ex = ekstraDari(el, st), tinggi = st['height'] ? twips(st['height']) : 0;
      if (!runs.length && !isiTeks(el)) { if (tinggi) { out.push(this.paragraf([], c2, {}, { atas: 0, bawah: 0, baris: tinggi, aturBaris: 'exact' })); } else if (el.querySelector && (el.querySelector('img'))) { /* gambar sudah di runs */ } return; }
      out.push(this.paragraf(runs, c2, {}, ex)); return;
    }
    // campuran: simpul inline dikumpulkan jadi paragraf, simpul blok diproses sendiri
    var buf = [], s2 = { awal: true }, ex2 = ekstraDari(el, st), tulis = function () { if (buf.length && buf.join('').replace(/<[^>]+>/g, '').trim() !== '' || buf.join('').indexOf('w:drawing') >= 0) out.push(self.paragraf(buf, c2, {}, { atas: 0, bawah: 0 })); buf = []; s2 = { awal: true }; };
    if (ex2.atas) out.push(this.paragraf([], c2, {}, { atas: 0, bawah: 0, baris: ex2.atas, aturBaris: 'exact' }));
    for (var m = el.firstChild; m; m = m.nextSibling) {
      if (m.nodeType === 1 && (TAG_BLOK[m.tagName] || TAG_BLOK[String(m.tagName).toUpperCase()] || (m.hasAttribute && m.hasAttribute('data-kop-surat')))) { tulis(); this.blok(m, c2, out); }
      else this.inline(m, c2, buf, s2);
    }
    tulis();
    if (ex2.bawah) out.push(this.paragraf([], c2, {}, { atas: 0, bawah: 0, baris: ex2.bawah, aturBaris: 'exact' }));
  };

  Penulis.prototype.daftar = function (el, c, out) {
    var self = this, no = 0, c2 = ctxDari(el, c);
    for (var li = el.firstChild; li; li = li.nextSibling) {
      if (li.nodeType !== 1 || li.tagName !== 'LI') continue;
      no++; var runs = [run((el.tagName === 'OL' ? no + '.' : '•'), c2), '<w:r><w:tab/></w:r>'], s = { awal: true }, c3 = ctxDari(li, c2);
      for (var n = li.firstChild; n; n = n.nextSibling) this.inline(n, c3, runs, s);
      out.push(this.paragraf(runs, c3, {}, { kiri: 720, gantung: 360, bawah: 60, baris: 360 }));
    }
  };

  /** Kop surat: logo di kiri, baris teks di tengah, garis tebal di bawah. */
  Penulis.prototype.kop = function (el, c, out) {
    var img = el.querySelector('img'), inf = img && this.gambar.get(img), isi = el.firstElementChild, baris = [];
    if (isi) for (var n = isi.firstElementChild; n; n = n.nextElementSibling) { if (n.tagName === 'DIV') baris.push(n); }
    var ck = { f: 'Arial', sz: 22, jc: 'center' };
    var paras = baris.map(function (b) { var runs = [], s = { awal: true }, cc = ctxDari(b, ck); for (var m = b.firstChild; m; m = m.nextSibling) this.inline(m, cc, runs, s); return this.paragraf(runs, cc, {}, { atas: 0, bawah: 0 }); }, this).join('');
    var u = inf ? ukuranGambar(img, inf, 120) : [0, 0], lebarLogo = 1500;
    var logo = inf ? this.paragraf([this.drawing(inf, u[0], u[1])], { jc: 'left' }, {}, {}) : '<w:p/>';
    var tb = '<w:tbl><w:tblPr><w:tblW w:w="' + LEBAR_ISI + '" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="40" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="' + lebarLogo + '"/><w:gridCol w:w="' + (LEBAR_ISI - lebarLogo) + '"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="' + lebarLogo + '" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>' + logo + '</w:tc><w:tc><w:tcPr><w:tcW w:w="' + (LEBAR_ISI - lebarLogo) + '" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>' + (paras || '<w:p/>') + '</w:tc></w:tr></w:tbl>';
    out.push(tb);
    out.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="24" w:space="1" w:color="000000"/></w:pBdr><w:spacing w:before="0" w:after="120" w:line="120" w:lineRule="exact"/></w:pPr></w:p>');
  };

  Penulis.prototype.tabel = function (el, c, out) {
    var self = this, cT = ctxDari(el, c), stT = gayaDari(el);
    var rows = []; el.querySelectorAll('tr').forEach(function (tr) { var p = tr.parentNode; while (p && p !== el && p.tagName !== 'TABLE') p = p.parentNode; if (p === el || !p) rows.push(tr); });
    if (!rows.length) return;
    var ncol = 0; rows.forEach(function (tr) { var n = 0; Array.prototype.forEach.call(tr.children, function (td) { n += parseInt(td.getAttribute('colspan') || '1', 10) || 1; }); ncol = Math.max(ncol, n); });
    if (!ncol) return;
    // lebar kolom dari baris dengan sel terbanyak; persen -> twips, sisanya dibagi rata
    var acuan = rows.reduce(function (a, tr) { return tr.children.length > a.children.length ? tr : a; }, rows[0]), lebar = [], tetap = 0, kosong = 0;
    var kol = []; Array.prototype.forEach.call(acuan.children, function (td) { var sp = parseInt(td.getAttribute('colspan') || '1', 10) || 1, st = gayaDari(td), w = st['width'] || td.getAttribute('width') || ''; var m = /^([\d.]+)%$/.exec(w); kol.push({ sp: sp, pct: m ? parseFloat(m[1]) : null }); });
    var totalPct = 0, bebas = 0; kol.forEach(function (k) { if (k.pct != null) totalPct += k.pct; else bebas += k.sp; });
    kol.forEach(function (k) { var tot = k.pct != null ? Math.round(LEBAR_ISI * k.pct / 100) : Math.round(LEBAR_ISI * Math.max(0, 100 - totalPct) / 100 / Math.max(1, bebas)) * k.sp; for (var i = 0; i < k.sp; i++) lebar.push(Math.round(tot / k.sp)); });
    while (lebar.length < ncol) lebar.push(Math.round(LEBAR_ISI / ncol)); lebar.length = ncol;
    var jml = lebar.reduce(function (a, b) { return a + b; }, 0); if (jml > LEBAR_ISI * 1.02 || jml < LEBAR_ISI * 0.6) { var f = LEBAR_ISI / jml; lebar = lebar.map(function (w) { return Math.round(w * f); }); }
    var tw = '<w:tbl><w:tblPr><w:tblW w:w="' + lebar.reduce(function (a, b) { return a + b; }, 0) + '" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + lebar.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>';
    rows.forEach(function (tr) {
      var kepala = tr.parentNode && tr.parentNode.tagName === 'THEAD', cs = '', idx = 0, cR = ctxDari(tr, cT), stR = gayaDari(tr);
      Array.prototype.forEach.call(tr.children, function (td) {
        if (td.tagName !== 'TD' && td.tagName !== 'TH') return;
        var sp = parseInt(td.getAttribute('colspan') || '1', 10) || 1, st = gayaDari(td), cc = ctxDari(td, cR), w = 0; for (var i = 0; i < sp; i++) w += lebar[idx + i] || 0; idx += sp;
        var bd = st['border'] || '', bdTop = st['border-top'] || '', bdBot = st['border-bottom'] || '';
        var garis = function (n, v) { if (v && /solid/.test(v) && !/none/.test(v)) { var tb = angkaPt(v.split(/\s+/)[0]) || 0.75; return '<w:' + n + ' w:val="single" w:sz="' + Math.max(4, Math.round(tb * 8)) + '" w:space="0" w:color="' + (warnaHex(v.split(/\s+/).pop()) || '000000') + '"/>'; } return ''; };
        var tcb = garis('top', bdTop || bd) + garis('left', bd) + garis('bottom', bdBot || bd) + garis('right', bd);
        var bg = warnaHex(st['background'] || st['background-color'] || '');
        var va = { middle: 'center', bottom: 'bottom' }[st['vertical-align']] || (td.getAttribute('valign') === 'middle' ? 'center' : 'top');
        var isi = []; var sub = new Penulis(); sub.gambar = self.gambar; sub.rels = self.rels; sub.media = self.media; sub.idGbr = self.idGbr; sub.ctxAwal = self.ctxAwal;
        var tmp = { nodeType: 1, tagName: 'DIV', firstChild: td.firstChild, hasAttribute: function () { return false; }, getAttribute: function () { return null; } };
        // isi sel: diperlakukan seperti blok campuran
        var cellCtx = cc;
        var buf = [], s = { awal: true }, selesai = function () { if (buf.length) { isi.push(self.paragraf(buf, cellCtx, {}, { atas: 0, bawah: 0 })); buf = []; s = { awal: true }; } };
        for (var n = td.firstChild; n; n = n.nextSibling) {
          if (n.nodeType === 1 && (TAG_BLOK[n.tagName] || TAG_BLOK[String(n.tagName).toUpperCase()])) { selesai(); self.blok(n, cellCtx, isi); }
          else self.inline(n, cellCtx, buf, s);
        }
        selesai();
        if (!isi.length || /<\/w:tbl>$/.test(isi[isi.length - 1])) isi.push('<w:p/>');
        cs += '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (sp > 1 ? '<w:gridSpan w:val="' + sp + '"/>' : '') + (tcb ? '<w:tcBorders>' + tcb + '</w:tcBorders>' : '') + (bg ? '<w:shd w:val="clear" w:color="auto" w:fill="' + bg + '"/>' : '') + '<w:vAlign w:val="' + va + '"/></w:tcPr>' + isi.join('') + '</w:tc>';
      });
      tw += '<w:tr><w:trPr><w:cantSplit/>' + (kepala ? '<w:tblHeader/>' : '') + '</w:trPr>' + cs + '</w:tr>';
    });
    tw += '</w:tbl>';
    out.push(tw);
    out.push('<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p>');   // jarak sesudah tabel
  };

  // ---------- Gambar: baca ukuran PNG/JPEG, SVG dirasterkan ----------
  function ukuranPng(a) { if (a.length > 24 && a[1] === 0x50 && a[2] === 0x4E && a[3] === 0x47) { var dv = new DataView(a.buffer, a.byteOffset, a.byteLength); return { w: dv.getUint32(16), h: dv.getUint32(20) }; } return null; }
  function ukuranJpeg(a) {
    if (a[0] !== 0xFF || a[1] !== 0xD8) return null; var i = 2;
    while (i < a.length - 9) { if (a[i] !== 0xFF) { i++; continue; } var m = a[i + 1]; if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: (a[i + 5] << 8) | a[i + 6], w: (a[i + 7] << 8) | a[i + 8] }; i += 2 + ((a[i + 2] << 8) | a[i + 3]); }
    return null;
  }
  function dariDataUrl(src) {
    var m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(src || ''); if (!m) return null;
    var data = dariBase64(m[2]), jenis = /png/i.test(m[1]) ? 'png' : 'jpeg', uk = jenis === 'png' ? ukuranPng(data) : ukuranJpeg(data);
    return uk ? { data: data, jenis: jenis, w: uk.w, h: uk.h } : null;
  }
  /** Rasterisasi SVG -> PNG di browser. Dapat diganti (mis. saat pengujian) lewat Berkas.rasterSvg. */
  function rasterBrowser(svg, w, h) {
    return new Promise(function (ya, tidak) {
      var im = new Image(), skala = 2;
      im.onload = function () { var cv = document.createElement('canvas'); cv.width = w * skala; cv.height = h * skala; var cx = cv.getContext('2d'); cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height); ya({ data: dariBase64(cv.toDataURL('image/png').split(',')[1]), w: w, h: h, jenis: 'png' }); };
      im.onerror = function () { tidak(new Error('Grafik tidak dapat dirender.')); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  function siapkanGambar(root) {
    var peta = new Map(), tugas = [];
    root.querySelectorAll('img').forEach(function (im) { var inf = dariDataUrl(im.getAttribute('src')); if (inf) peta.set(im, inf); });
    root.querySelectorAll('svg').forEach(function (sv) {
      var vb = (sv.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number), w = parseFloat(sv.getAttribute('width')) || vb[2] || 600, h = parseFloat(sv.getAttribute('height')) || vb[3] || 300;
      var kloning = sv.cloneNode(true); kloning.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); kloning.setAttribute('width', w); kloning.setAttribute('height', h);
      var s = new XMLSerializer().serializeToString(kloning);
      tugas.push((Berkas.rasterSvg || rasterBrowser)(s, w, h).then(function (inf) { inf.w = inf.w || w; inf.h = inf.h || h; peta.set(sv, inf); }, function () {}));
    });
    return Promise.all(tugas).then(function () { return peta; });
  }

  function stylesDocx() {
    return XML + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>';
  }

  /** HTML (laporan/dokumen) -> berkas .docx. opsi: {judul} */
  function docxDariHtml(html, opsi) {
    opsi = opsi || {};
    var doc = new DOMParser().parseFromString('<!DOCTYPE html><html><body>' + html + '</body></html>', 'text/html'), body = doc.body;
    return siapkanGambar(body).then(function (peta) {
      var pw = new Penulis({}, peta), out = [], c0 = { f: 'Times New Roman', sz: 24 };
      for (var n = body.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 1) pw.blok(n, c0, out);
        else if (n.nodeType === 3 && n.nodeValue.trim()) { var r = []; pw.inline(n, c0, r, { awal: true }); out.push(pw.paragraf(r, c0, {}, {})); }
      }
      var sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';
      var dok = XML + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="' + NS_R + '" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' + out.join('') + sect + '</w:body></w:document>';
      var files = [
        { nama: '[Content_Types].xml', data: u8(XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>') },
        { nama: '_rels/.rels', data: u8(XML + '<Relationships xmlns="' + NS_REL + '"><Relationship Id="rId1" Type="' + NS_R + '/officeDocument" Target="word/document.xml"/></Relationships>') },
        { nama: 'word/document.xml', data: u8(dok) },
        { nama: 'word/styles.xml', data: u8(stylesDocx()) },
        { nama: 'word/_rels/document.xml.rels', data: u8(XML + '<Relationships xmlns="' + NS_REL + '"><Relationship Id="rIdS" Type="' + NS_R + '/styles" Target="styles.xml"/>' + pw.rels.join('') + '</Relationships>') }
      ].concat(pw.media);
      return zip(files);
    });
  }

  var Berkas = { xlsx: xlsx, docxDariHtml: docxDariHtml, unduh: unduh, zip: zip, rentang: rentang, namaKolom: namaKolom, MIME_DOCX: MIME_DOCX, MIME_XLSX: MIME_XLSX, WARNA: WARNA, rasterSvg: null };
  g.Berkas = Berkas;
  if (typeof module !== 'undefined' && module.exports) module.exports = Berkas;
})(typeof window !== 'undefined' ? window : globalThis);
