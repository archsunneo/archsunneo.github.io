/* =====================================================================
   查你家財位 2026 · @archsunneo
   純前端、無後端、無帳號。所有計算為確定性查表 / 幾何運算，不含隨機。
   ===================================================================== */

'use strict';

/* ---------------------------------------------------------------------
   1. 常數表（傳統公開知識，查表用，不隨機）
   ------------------------------------------------------------------ */

// 24 山：子山中心為正北 0°，每山 15°，順時針。子 = 352.5°–7.5°
var MOUNTAINS = ['子','癸','丑','艮','寅','甲','卯','乙','辰','巽','巳','丙',
                 '午','丁','未','坤','申','庚','酉','辛','戌','乾','亥','壬'];

// 八方位：index 0 = 北，每 45°，北 = 337.5°–22.5°
var DIRS = [
  { name:'北',   gua:'坎', mid:0   },
  { name:'東北', gua:'艮', mid:45  },
  { name:'東',   gua:'震', mid:90  },
  { name:'東南', gua:'巽', mid:135 },
  { name:'南',   gua:'離', mid:180 },
  { name:'西南', gua:'坤', mid:225 },
  { name:'西',   gua:'兌', mid:270 },
  { name:'西北', gua:'乾', mid:315 }
];

// 九星屬性
var STARS = {
  1:{ n:'一白', full:'一白貪狼', tag:'桃花', lv:'good',
      desc:'人緣、感情、文職。適合放水養植物、擺開運花，或當成書桌談話區。' },
  2:{ n:'二黑', full:'二黑巨門', tag:'病符', lv:'bad',
      desc:'健康弱位。今年這方少堆雜物、少放紅色，保持乾燥通風；家中長輩房若在此要特別留意。' },
  3:{ n:'三碧', full:'三碧祿存', tag:'是非', lv:'bad',
      desc:'口舌、爭執、官非。避免在此方大聲吵鬧或擺尖銳金屬，放綠色植栽收斂。' },
  4:{ n:'四綠', full:'四綠文曲', tag:'文昌', lv:'good',
      desc:'考試、升學、企劃、寫作。書桌、讀書區、辦公桌擺這方最順；放四支毛筆或綠植加強。' },
  5:{ n:'五黃', full:'五黃廉貞', tag:'忌動工', lv:'worst',
      desc:'今年最忌動土的方位。不要在這方敲牆、鑽孔、大裝修、搬重家具；保持安靜、不放紅色、不放震動電器。' },
  6:{ n:'六白', full:'六白武曲', tag:'貴人', lv:'good',
      desc:'貴人、權威、事業助力。適合放金屬擺件、公司文件、主管辦公位。' },
  7:{ n:'七赤', full:'七赤破軍', tag:'破財', lv:'bad',
      desc:'漏財、小人、口舌是非。這方少放現金、保險箱、貴重物；忌水景魚缸，忌雜亂堆物。' },
  8:{ n:'八白', full:'八白左輔', tag:'流年財星', lv:'great',
      desc:'今年正財位。常坐的沙發、辦公位、保險箱擺這方；保持乾淨明亮、常有人走動。' },
  9:{ n:'九紫', full:'九紫右弼', tag:'喜慶', lv:'good',
      desc:'喜事、桃花、名聲。適合擺喜氣照片、暖色燈；求姻緣、求曝光的人多待這方。' }
};

/* 2026（丙午年）流年飛星：年紫白 = 11 − (2+0+2+6 → 10 → 1) = 10 → 一白入中宮，
   依洛書順飛：中1 → 乾2 → 兌3 → 艮4 → 離5 → 坎6 → 坤7 → 震8 → 巽9。
   下表為上述推導的固定結果，程式直接查表，不做動態運算。 */
var CENTER_STAR = 1;
var FLYING = {
  0:6,  // 北   坎
  1:4,  // 東北 艮 → 文昌 22.5°–67.5°
  2:8,  // 東   震 → 流年財星 67.5°–112.5°
  3:9,  // 東南 巽 → 喜慶 112.5°–157.5°
  4:5,  // 南   離 → 五黃 157.5°–202.5°
  5:7,  // 西南 坤 → 破財 202.5°–247.5°
  6:3,  // 西   兌
  7:2   // 西北 乾
};

/* ---------------------------------------------------------------------
   2. 角度 / 幾何工具
   ------------------------------------------------------------------ */

function norm360(d){ d = d % 360; return d < 0 ? d + 360 : d; }

function mountainIndex(deg){ return Math.floor(norm360(deg + 7.5) / 15) % 24; }
function mountainName(deg){ return MOUNTAINS[mountainIndex(deg)]; }
function dirIndex(deg){ return Math.floor(norm360(deg + 22.5) / 45) % 8; }

// 離最近的「山」邊界有多少度（用來提醒騎線／壓線）
function boundaryGap(deg){
  var x = norm360(deg + 7.5) % 15;
  return Math.min(x, 15 - x);
}

var R_EARTH = 6378137;
var D2R = Math.PI / 180, R2D = 180 / Math.PI;

// 由 (lat,lng) 依方位角 brg 走 dist 公尺，回傳 [lat,lng]
function destPoint(lat, lng, brg, dist){
  var d = dist / R_EARTH, b = brg * D2R, p1 = lat * D2R, l1 = lng * D2R;
  var sp = Math.sin(p1), cp = Math.cos(p1), sd = Math.sin(d), cd = Math.cos(d);
  var p2 = Math.asin(sp * cd + cp * sd * Math.cos(b));
  var l2 = l1 + Math.atan2(Math.sin(b) * sd * cp, cd - sp * Math.sin(p2));
  return [p2 * R2D, norm360(l2 * R2D + 180) - 180];
}

// 兩點方位角（度，真北為 0）
function bearing(lat1, lng1, lat2, lng2){
  var p1 = lat1 * D2R, p2 = lat2 * D2R, dl = (lng2 - lng1) * D2R;
  var y = Math.sin(dl) * Math.cos(p2);
  var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return norm360(Math.atan2(y, x) * R2D);
}

// 兩個角度的最小夾角（0–180）
function angleDiff(a, b){
  var d = Math.abs(norm360(a) - norm360(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/* ---------------------------------------------------------------------
   3. 狀態
   ------------------------------------------------------------------ */

var state = {
  center: L.latLng(25.0330, 121.5654), // 台北 101 附近，僅作預設視角
  facing: 180,
  radius: 25,
  show24: true,
  placed: false,     // 使用者是否已經自己定過點
  alignMode: false,
  alignPts: []
};

var $ = function(id){ return document.getElementById(id); };

/* ---------------------------------------------------------------------
   4. 地圖
   ------------------------------------------------------------------ */

var map = L.map('map', {
  center: state.center, zoom: 19,
  zoomControl: false, scrollWheelZoom: false,   // 預設不吃頁面滾輪
  maxZoom: 21, attributionControl: true
});
L.control.zoom({ position: 'bottomleft' }).addTo(map);

// 點一下地圖才啟用滾輪縮放，滑鼠離開就交還給頁面
map.on('click', function(){ map.scrollWheelZoom.enable(); });
map.getContainer().addEventListener('mouseleave', function(){ map.scrollWheelZoom.disable(); });

var OSM_ATTR  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 貢獻者';
var NLSC_ATTR = '圖磚：<a href="https://maps.nlsc.gov.tw/">內政部國土測繪中心</a>';

var layers = {
  photo: L.tileLayer('https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    maxZoom: 21, maxNativeZoom: 20, attribution: NLSC_ATTR + '（正射影像）'
  }),
  emap: L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    maxZoom: 21, maxNativeZoom: 20, attribution: NLSC_ATTR + '（通用電子地圖）'
  }),
  osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: OSM_ATTR
  })
};

var currentLayer = 'photo';
layers.photo.addTo(map);
// 衛星圖在部分區域可能無圖磚，底下墊一層 OSM 當保險
var baseFallback = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, opacity: 1, attribution: OSM_ATTR
});
baseFallback.addTo(map);
baseFallback.bringToBack();

Array.prototype.forEach.call(document.querySelectorAll('.layer-switch button'), function(btn){
  btn.addEventListener('click', function(){
    var key = btn.getAttribute('data-layer');
    if (key === currentLayer) return;
    map.removeLayer(layers[currentLayer]);
    layers[key].addTo(map);
    currentLayer = key;
    // 只有國土測繪的圖層需要墊底圖（無涵蓋時才不會整片空白）
    if (key === 'osm'){ map.removeLayer(baseFallback); }
    else { baseFallback.addTo(map); baseFallback.bringToBack(); }
    Array.prototype.forEach.call(document.querySelectorAll('.layer-switch button'), function(b){
      b.classList.toggle('on', b === btn);
    });
    refreshOverlay();
  });
});

// 屋頂中心點
var roofIcon = L.divIcon({ className:'roof-dot', html:'<i></i>', iconSize:[18,18], iconAnchor:[9,9] });
var marker = L.marker(state.center, { icon: roofIcon, draggable: true, zIndexOffset: 1000 }).addTo(map);

var rafPending = false;
function scheduleOverlay(){
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(function(){ rafPending = false; refreshOverlay(); });
}
marker.on('drag', function(e){ state.center = e.target.getLatLng(); scheduleOverlay(); });
marker.on('dragend', function(){ state.placed = true; setHint(); render(); });

map.on('zoomend', function(){ refreshOverlay(); });

map.on('click', function(e){
  if (state.alignMode){ addAlignPoint(e.latlng); return; }
  state.center = e.latlng;
  marker.setLatLng(e.latlng);
  state.placed = true;
  setHint();
  refreshOverlay();
  render();
});

/* ---------------------------------------------------------------------
   5. 疊圖：八方位扇形 + 24 山刻度 + 坐向箭頭
   ------------------------------------------------------------------ */

var overlay = L.layerGroup().addTo(map);

var LV_COLOR = {
  great: '#b8892b',
  good:  '#2f6b45',
  bad:   '#6d6357',
  worst: '#a8321f'
};
var LV_FILL = { great: 0.30, good: 0.14, bad: 0.08, worst: 0.26 };

// 目前半徑在螢幕上大概幾個 pixel —— 用來決定標籤要不要畫，避免擠成一團
function pxRadius(){
  var c = state.center;
  var d = destPoint(c.lat, c.lng, 0, state.radius);
  return map.latLngToContainerPoint(c).distanceTo(
         map.latLngToContainerPoint(L.latLng(d[0], d[1])));
}

function refreshOverlay(){
  overlay.clearLayers();
  var c = state.center, R = state.radius;
  var px = pxRadius();
  var showSector = px >= 46;      // 放得下「方位 + 星」
  var showTag    = px >= 76;      // 再放得下「流年財星 / 破財」標籤
  var showMtn    = px >= 86;     // 再放得下 24 山字

  // --- 八方位扇形 ---
  for (var i = 0; i < 8; i++){
    var star = FLYING[i], s = STARS[star], mid = DIRS[i].mid;
    var pts = [[c.lat, c.lng]];
    for (var a = mid - 22.5; a <= mid + 22.5 + 0.001; a += 4.5){
      pts.push(destPoint(c.lat, c.lng, a, R));
    }
    L.polygon(pts, {
      color: LV_COLOR[s.lv], weight: 1.5, opacity: .95,
      fillColor: LV_COLOR[s.lv], fillOpacity: LV_FILL[s.lv], interactive: false
    }).addTo(overlay);

    // 標籤
    if (showSector){
      var lp = destPoint(c.lat, c.lng, mid, R * 0.62);
      L.marker(lp, {
        interactive: false,
        icon: L.divIcon({
          className: 'sector-label',
          html: '<div class="sl sl-' + s.lv + '">' +
                '<b>' + DIRS[i].name + '</b>' +
                '<em>' + s.n + '</em>' +
                (showTag ? '<span>' + s.tag + '</span>' : '') + '</div>',
          iconSize: [64, 46], iconAnchor: [32, 23]
        })
      }).addTo(overlay);
    }
  }

  // --- 24 山刻度 ---
  if (state.show24){
    for (var k = 0; k < 24; k++){
      var bd = norm360(7.5 + k * 15);                      // 邊界線
      L.polyline([[c.lat, c.lng], destPoint(c.lat, c.lng, bd, R)], {
        color: '#14110d', weight: 0.7, opacity: .35, interactive: false
      }).addTo(overlay);

      if (!showMtn) continue;
      var mc = norm360(k * 15);                             // 山的中心
      var mp = destPoint(c.lat, c.lng, mc, R * 0.88);
      L.marker(mp, {
        interactive: false,
        icon: L.divIcon({
          className: 'mtn-label',
          html: '<span class="ml">' + MOUNTAINS[mountainIndex(mc)] + '</span>',
          iconSize: [16, 16], iconAnchor: [8, 8]
        })
      }).addTo(overlay);
    }
  }

  // --- 坐向箭頭 ---
  var tip = destPoint(c.lat, c.lng, state.facing, R * 1.18);
  var back = destPoint(c.lat, c.lng, state.facing + 180, R * 0.95);
  L.polyline([back, [c.lat, c.lng], tip], {
    color: '#a8321f', weight: 4, opacity: .95, interactive: false
  }).addTo(overlay);
  var h1 = destPoint(c.lat, c.lng, state.facing - 7, R * 1.02);
  var h2 = destPoint(c.lat, c.lng, state.facing + 7, R * 1.02);
  L.polygon([tip, h1, h2], {
    color: '#a8321f', fillColor: '#a8321f', fillOpacity: 1, weight: 1, interactive: false
  }).addTo(overlay);
  L.marker(tip, {
    interactive: false,
    icon: L.divIcon({ className:'face-label', html:'<span class="fl">向</span>',
                      iconSize:[22,22], iconAnchor:[11,-4] })
  }).addTo(overlay);
  L.marker(back, {
    interactive: false,
    icon: L.divIcon({ className:'face-label', html:'<span class="fl fl-sit">坐</span>',
                      iconSize:[22,22], iconAnchor:[11,18] })
  }).addTo(overlay);

  // --- 對齊用的兩個點 ---
  var pinIcon = L.divIcon({ className:'align-pin', html:'<i></i>', iconSize:[12,12], iconAnchor:[6,6] });
  state.alignPts.forEach(function(p){
    L.marker(p, { icon: pinIcon, interactive: false }).addTo(overlay);
  });
  if (state.alignPts.length === 2){
    L.polyline(state.alignPts, { color:'#2a5878', weight:3, dashArray:'5,4', interactive:false }).addTo(overlay);
  }
}

/* ---------------------------------------------------------------------
   6. 兩點對齊
   ------------------------------------------------------------------ */

function setHint(){
  var h = $('mapHint');
  if (state.alignMode){
    h.classList.add('act');
    h.innerHTML = state.alignPts.length === 0
      ? '沿著<b>大門那面外牆</b>點第 1 點'
      : '再點第 2 點（同一面牆的另一端）';
  } else {
    h.classList.remove('act');
    h.innerHTML = state.placed
      ? '紅點 = 屋頂中心。可再拖曳微調，或按「沿牆點兩下自動對齊」'
      : '拖動中央的紅點，對準你家<b>屋頂正中心</b>';
  }
}

function addAlignPoint(latlng){
  state.alignPts.push(latlng);
  if (state.alignPts.length < 2){ setHint(); refreshOverlay(); return; }

  var a = state.alignPts[0], b = state.alignPts[1];
  var wall = bearing(a.lat, a.lng, b.lat, b.lng);
  var mid  = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);

  // 兩個垂直方向，取「背離屋頂中心」的那個當作「向」
  var c1 = norm360(wall + 90), c2 = norm360(wall - 90);
  var out = bearing(state.center.lat, state.center.lng, mid.lat, mid.lng);
  var pick = angleDiff(c1, out) <= angleDiff(c2, out) ? c1 : c2;

  setFacing(Math.round(pick));
  state.alignMode = false;
  $('alignBtn').classList.remove('on');
  $('alignTip').hidden = false;
  $('alignTip').innerHTML =
    '已對齊：牆面走向 ' + Math.round(wall) + '°，取垂直方向 <b>' + Math.round(pick) +
    '°</b> 為「向」。<br>看地圖上的紅箭頭——它應該指向<b>屋外</b>（馬路那側）。指到屋內就按「翻轉 180°」。';
  setHint();
  render();
}

$('alignBtn').addEventListener('click', function(){
  state.alignMode = !state.alignMode;
  state.alignPts = [];
  this.classList.toggle('on', state.alignMode);
  $('alignTip').hidden = true;
  setHint();
  refreshOverlay();
});

$('flipBtn').addEventListener('click', function(){
  setFacing(norm360(state.facing + 180));
  render();
});

/* ---------------------------------------------------------------------
   7. 控制項
   ------------------------------------------------------------------ */

function setFacing(deg){
  state.facing = norm360(Math.round(deg));
  $('facing').value = state.facing;
  $('facingVal').textContent = state.facing;
  refreshOverlay();
}

$('facing').addEventListener('input', function(){
  setFacing(parseInt(this.value, 10));
  render();
});

Array.prototype.forEach.call(document.querySelectorAll('.nudge button'), function(btn){
  btn.addEventListener('click', function(){
    setFacing(state.facing + parseInt(btn.getAttribute('data-nudge'), 10));
    render();
  });
});

$('radius').addEventListener('input', function(){
  state.radius = parseInt(this.value, 10);
  $('radiusVal').textContent = state.radius;
  refreshOverlay();
});

$('show24').addEventListener('change', function(){
  state.show24 = this.checked;
  refreshOverlay();
});

/* ---------------------------------------------------------------------
   8. 地址搜尋（OpenStreetMap Nominatim）
   ------------------------------------------------------------------ */

var srBox = $('searchResults');

function showResults(html){ srBox.innerHTML = html; srBox.hidden = false; }
function hideResults(){ srBox.hidden = true; srBox.innerHTML = ''; }

// 台灣的「門牌」在 OpenStreetMap 上很不完整（實測：台北市信義區市府路1號 → 0 筆），
// 但「路段」查得到。所以這裡做降級搜尋：門牌查不到就退成路段、再退成行政區，
// 最後一哩由使用者自己把紅點拖到屋頂——那本來就只有屋主知道。
function buildQueries(raw){
  var q = raw.replace(/\s+/g, ' ').trim();
  var hasNo = /[號樓]/.test(q);

  // 去掉「45號」「12之3號」「5樓」之後的部分
  var noNo = q.replace(/[0-9０-９一二三四五六七八九十百]+\s*(之[0-9０-９]+)?\s*號.*$/, '')
              .replace(/[0-9０-９]+\s*樓.*$/, '')
              .trim();
  // 去掉開頭的縣市（實測「信義區市府路」比「台北市信義區市府路」快也準）
  var noCity = noNo.replace(/^[^市縣]{1,3}[市縣]/, '').trim();
  // 去掉巷弄
  var noLane = noCity.replace(/[0-9０-９]+\s*[巷弄].*$/, '').trim();

  // 帶門牌的查詢在 Nominatim 上實測要跑 10 秒才回 0 筆（台灣門牌資料不全），
  // 所以有「號」時直接跳過原字串，先打路段層級。
  var list = hasNo ? [noCity, noNo, noLane] : [q, noCity, noLane];

  list.slice().forEach(function(x){
    if (x && x.indexOf('台') >= 0) list.push(x.replace(/台/g, '臺'));
  });

  var seen = {}, out = [];
  list.forEach(function(x){
    if (x && x.length >= 2 && !seen[x]){ seen[x] = 1; out.push(x); }
  });
  return out.slice(0, 4);
}

function nominatim(q){
  var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timer = ctrl ? setTimeout(function(){ ctrl.abort(); }, 8000) : null;
  return fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5' +
               '&countrycodes=tw&accept-language=zh-TW&q=' + encodeURIComponent(q),
               { headers: { 'Accept': 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
    .then(function(r){
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }, function(err){
      if (timer) clearTimeout(timer);
      throw new Error(err && err.name === 'AbortError' ? '逾時' : String(err.message || err));
    });
}

function doSearch(){
  var raw = $('addr').value.trim();
  if (!raw) return;
  var queries = buildQueries(raw);
  showResults('<div class="sr-msg">搜尋中…</div>');

  (function next(i){
    if (i >= queries.length){
      showResults('<div class="sr-msg">查不到這個地址。' +
                  '台灣的門牌在開放地圖上很不齊，建議只打「區 + 路名」（例如「信義區市府路」），' +
                  '或直接在地圖上放大，把紅點拖到你家屋頂。</div>');
      return;
    }
    nominatim(queries[i])
      .then(function(list){
        if (!list || !list.length){
          setTimeout(function(){ next(i + 1); }, 350);   // 對 Nominatim 客氣一點
          return;
        }
        renderResults(list, queries[i], queries[i] !== raw);
      })
      .catch(function(err){
        if (i + 1 < queries.length){ setTimeout(function(){ next(i + 1); }, 350); return; }
        showResults('<div class="sr-msg">地址服務暫時連不上（' + escapeHtml(String(err.message)) +
                    '）。可以直接在地圖上放大、把紅點拖到你家屋頂。</div>');
      });
  })(0);
}

function renderResults(list, usedQuery, fellBack){
  var html = '';
  if (fellBack){
    html += '<div class="sr-msg sr-note">查不到完整門牌，改用「' + escapeHtml(usedQuery) +
            '」找到這條路。選一個最近的，再自己把紅點拖到你家屋頂。</div>';
  }
  list.forEach(function(item, i){
    html += '<button type="button" data-i="' + i + '">' + escapeHtml(item.display_name) + '</button>';
  });
  showResults(html);
  Array.prototype.forEach.call(srBox.querySelectorAll('button'), function(b){
    b.addEventListener('click', function(){
      var it = list[parseInt(b.getAttribute('data-i'), 10)];
      gotoLatLng(parseFloat(it.lat), parseFloat(it.lon));
      hideResults();
    });
  });
}

function gotoLatLng(lat, lng){
  var ll = L.latLng(lat, lng);
  state.center = ll;
  state.placed = true;
  state.alignPts = [];
  marker.setLatLng(ll);
  map.setView(ll, 19);
  setHint();
  refreshOverlay();
  render();
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
  });
}

$('searchBtn').addEventListener('click', doSearch);
$('addr').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); doSearch(); } });
document.addEventListener('click', function(e){
  if (srBox.contains(e.target)) return;
  if (e.target === $('addr') || e.target === $('searchBtn') || e.target === $('geoBtn')) return;
  hideResults();
});

$('geoBtn').addEventListener('click', function(){
  if (!navigator.geolocation){
    showResults('<div class="sr-msg">這個瀏覽器不支援定位。請直接搜地址或拖點。</div>');
    return;
  }
  showResults('<div class="sr-msg">定位中…</div>');
  navigator.geolocation.getCurrentPosition(function(pos){
    hideResults();
    gotoLatLng(pos.coords.latitude, pos.coords.longitude);
  }, function(){
    showResults('<div class="sr-msg">拿不到定位（可能是你拒絕了權限，或非 HTTPS）。請改用地址搜尋。</div>');
  }, { enableHighAccuracy: true, timeout: 8000 });
});

/* ---------------------------------------------------------------------
   9. 結果渲染
   ------------------------------------------------------------------ */

function render(){
  var face = state.facing, sit = norm360(face + 180);
  var faceM = mountainName(face), sitM = mountainName(sit);
  var faceD = DIRS[dirIndex(face)], sitD = DIRS[dirIndex(sit)];

  $('faceMtn').textContent = faceM;
  $('sitMtn').textContent  = sitM;

  var gap = boundaryGap(face);
  var sub = '坐' + sitD.name + '朝' + faceD.name +
            '（' + sitM + '山' + faceM + '向 · ' + sitD.gua + '宅）　向 = ' + face + '°';
  if (gap < 1.5){
    sub += '<br><span style="color:#e0b45a">⚠ 這個角度離「山」的分界只有 ' + gap.toFixed(1) +
           '°，屬於壓線／騎線，換一山吉凶就翻盤——這種情況務必找人實測，不要照本頁結論下決定。</span>';
  }
  $('sittingSub').innerHTML = sub;

  // 九宮格（畫面上北方朝上）
  var layout = [7, 0, 1, 6, -1, 2, 5, 4, 3];   // -1 = 中宮
  var html = '';
  layout.forEach(function(di){
    if (di === -1){
      var cs = STARS[CENTER_STAR];
      html += '<div class="cell center">' +
                '<span class="cell-dir">中宮</span>' +
                '<span class="cell-star">' + cs.n + '</span>' +
                '<span class="cell-tag" style="background:#ddd2bf;color:#3a332a">' + cs.tag + '</span>' +
                '<span class="cell-deg">全宅氣場</span>' +
              '</div>';
      return;
    }
    var d = DIRS[di], s = STARS[FLYING[di]];
    var lo = norm360(d.mid - 22.5), hi = norm360(d.mid + 22.5);
    html += '<div class="cell lv-' + s.lv + '">' +
              '<span class="cell-dir">' + d.name + '</span>' +
              '<span class="cell-star">' + s.n + '</span>' +
              '<span class="cell-tag">' + s.tag + '</span>' +
              '<span class="cell-deg">' + lo + '° – ' + hi + '°</span>' +
            '</div>';
  });
  $('grid9').innerHTML = html;

  // 條列說明：吉的排前面
  var order = [2, 1, 3, 0, 6, 7, 5, 4];  // 東、東北、東南、北、西、西北、西南、南
  var list = '';
  order.forEach(function(di){
    var d = DIRS[di], s = STARS[FLYING[di]];
    var lo = norm360(d.mid - 22.5), hi = norm360(d.mid + 22.5);
    list += '<div class="star-item lv-' + s.lv + '">' +
              '<h3>' + d.name + '方 · ' + s.full + '（' + s.tag + '）' +
              '<span>' + lo + '° – ' + hi + '°</span></h3>' +
              '<p>' + s.desc + '</p>' +
            '</div>';
  });
  $('starList').innerHTML = list;
}

/* ---------------------------------------------------------------------
   10. 啟動
   ------------------------------------------------------------------ */

Array.prototype.forEach.call(document.querySelectorAll('input[type=range]'), function(el){
  el.addEventListener('wheel', function(e){ e.preventDefault(); }, { passive: false });
});

$('facingVal').textContent = state.facing;
$('radiusVal').textContent = state.radius;
setHint();
refreshOverlay();
render();

/* ---------------------------------------------------------------------
   11. 分享結果卡（純前端 canvas，不上傳、不經過任何伺服器）

   為什麼卡片主打「坐向」而不是「財位在哪」：
   2026 的飛星八方位是絕對方位，每個人都一樣（流年財星都在東），
   拿那個當結果卡沒有個人化、也沒人想轉。真正因人而異的是
   「你家坐什麼朝什麼、大門正對到哪一顆流年星」——那才值得轉。
   ------------------------------------------------------------------ */

var SERIF_STACK = '"Noto Serif TC","Microsoft JhengHei","PingFang TC",serif';
var SANS_STACK  = '"Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif';

var CARD_COLOR = {
  ink:'#14110d', gold:'#e0b45a', goldDeep:'#b8892b',
  red:'#a8321f', paper:'#f4ece0', muted:'#a4977f'
};
var CARD_LV = { great:'#e0b45a', good:'#6aa77f', bad:'#8b8073', worst:'#c9503a' };

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function drawShareCard(){
  var W = 1080, H = 1350;
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var g = cv.getContext('2d');

  var face = state.facing, sit = norm360(face + 180);
  var faceM = mountainName(face), sitM = mountainName(sit);
  var fD = DIRS[dirIndex(face)], sD = DIRS[dirIndex(sit)];
  var faceStar = STARS[FLYING[dirIndex(face)]];

  // 底
  g.fillStyle = CARD_COLOR.ink; g.fillRect(0, 0, W, H);
  var rad = g.createRadialGradient(W / 2, -120, 60, W / 2, 420, 900);
  rad.addColorStop(0, '#241d14'); rad.addColorStop(1, CARD_COLOR.ink);
  g.fillStyle = rad; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(224,180,90,.24)'; g.lineWidth = 2;
  roundRect(g, 22, 22, W - 44, H - 44, 10); g.stroke();

  // 中央單層浮水印（被裁掉邊角仍在；刻意不做四角印記，那會讀成農場傳單）
  g.save();
  g.translate(W / 2, H / 2); g.rotate(-24 * Math.PI / 180);
  // 這張卡中央就是輪盤，浮水印比貼文卡再淡一級，才不會吃掉方位標籤
  g.globalAlpha = 0.055; g.fillStyle = CARD_COLOR.gold;
  g.font = '900 132px ' + SANS_STACK;
  g.textAlign = 'center'; g.fillText('@archsunneo', 0, 46);
  g.restore(); g.globalAlpha = 1; g.textAlign = 'left';

  // 頁首
  g.textBaseline = 'alphabetic';
  g.fillStyle = CARD_COLOR.goldDeep;
  g.font = '700 25px ' + SANS_STACK;
  g.fillText('不帶羅盤的風水師 · 王旭 Neo', 56, 82);

  g.fillStyle = CARD_COLOR.paper;
  g.font = '900 44px ' + SERIF_STACK;
  g.fillText('我家的 2026 方位圖', 56, 148);

  // 坐向（這張卡真正個人化的部分）
  g.fillStyle = CARD_COLOR.gold;
  g.font = '900 92px ' + SERIF_STACK;
  g.fillText('坐' + sD.name + '朝' + fD.name, 56, 250);
  g.fillStyle = CARD_COLOR.muted;
  g.font = '600 30px ' + SANS_STACK;
  g.fillText(sitM + '山' + faceM + '向 · ' + sD.gua + '宅 · 向 ' + face + '°', 58, 296);

  // 說明 + 壓線警告（工具上會警告，卡片就不能不講——否則對外少講一句）
  g.fillStyle = CARD_COLOR.muted;
  g.font = '400 24px ' + SANS_STACK;
  g.fillText('八方位以真北為準；房子轉幾度不影響方位，只影響坐向。', 58, 348);

  var gap = boundaryGap(face);
  if (gap < 1.5){
    g.fillStyle = '#e8a696';
    g.font = '700 24px ' + SANS_STACK;
    g.fillText('⚠ 這個角度離「山」的分界只有 ' + gap.toFixed(1) + '°，換一山結果就不同——建議找人實測。', 58, 388);
  }

  // 八方位輪盤
  var cx = W / 2, cy = 700, R = 248;
  for (var i = 0; i < 8; i++){
    var s = STARS[FLYING[i]], mid = DIRS[i].mid;
    var a0 = (mid - 22.5 - 90) * Math.PI / 180;
    var a1 = (mid + 22.5 - 90) * Math.PI / 180;
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath();
    g.fillStyle = CARD_LV[s.lv];
    g.globalAlpha = s.lv === 'great' ? 0.34 : (s.lv === 'worst' ? 0.30 : 0.16);
    g.fill(); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(224,180,90,.35)'; g.lineWidth = 1.5; g.stroke();

    var lr = (mid - 90) * Math.PI / 180, lx = cx + Math.cos(lr) * R * 0.66, ly = cy + Math.sin(lr) * R * 0.66;
    g.textAlign = 'center';
    g.fillStyle = CARD_COLOR.paper; g.font = '900 27px ' + SERIF_STACK;
    g.fillText(DIRS[i].name, lx, ly - 6);
    g.fillStyle = CARD_LV[s.lv] === CARD_LV.bad ? CARD_COLOR.muted : CARD_LV[s.lv];
    g.font = '700 22px ' + SANS_STACK;
    g.fillText(s.n, lx, ly + 22);
    g.font = '700 19px ' + SANS_STACK;
    g.fillText(s.tag, lx, ly + 46);
    g.textAlign = 'left';
  }
  g.strokeStyle = 'rgba(224,180,90,.5)'; g.lineWidth = 2;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();

  // 大門朝向箭頭
  var fr = (face - 90) * Math.PI / 180;
  var tipX = cx + Math.cos(fr) * (R + 34), tipY = cy + Math.sin(fr) * (R + 34);
  g.strokeStyle = CARD_COLOR.red; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(tipX, tipY); g.stroke();
  g.fillStyle = CARD_COLOR.red;
  g.beginPath(); g.arc(cx, cy, 12, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(tipX, tipY, 15, 0, Math.PI * 2); g.fill();
  g.fillStyle = CARD_COLOR.paper; g.font = '900 22px ' + SANS_STACK;
  g.textAlign = 'center';
  g.fillText('向', tipX, tipY + 8);
  g.textAlign = 'left';

  // 大門正對哪顆星
  var boxY = 1010, boxH = 128;
  var worst = (faceStar.lv === 'worst' || faceStar.lv === 'bad');
  g.fillStyle = worst ? 'rgba(168,50,31,.16)' : 'rgba(224,180,90,.12)';
  roundRect(g, 56, boxY, W - 112, boxH, 12); g.fill();
  g.strokeStyle = worst ? CARD_COLOR.red : CARD_COLOR.gold; g.lineWidth = 2; g.stroke();
  g.fillStyle = worst ? '#d0442a' : CARD_COLOR.goldDeep;
  g.font = '700 22px ' + SANS_STACK;
  g.fillText('大 門 正 對 這 一 面 ， 今 年 是', 82, boxY + 44);
  g.fillStyle = worst ? '#e8a696' : CARD_COLOR.gold;
  g.font = '900 46px ' + SERIF_STACK;
  g.fillText(faceStar.full + '（' + faceStar.tag + '）', 82, boxY + 98);

  // 頁尾
  g.fillStyle = CARD_COLOR.gold;
  roundRect(g, 56, 1168, W - 112, 78, 12); g.fill();
  g.fillStyle = CARD_COLOR.ink;
  g.font = '900 32px ' + SERIF_STACK;
  g.fillText('查你家財位 · 衛星圖版', 82, 1218);
  g.font = '700 26px ' + SANS_STACK;
  g.textAlign = 'right'; g.fillText('archsunneo.github.io/caiwei', W - 82, 1218); g.textAlign = 'left';

  g.fillStyle = CARD_COLOR.muted; g.font = '400 21px ' + SANS_STACK;
  g.fillText('民俗參考，不保證任何財運結果', 56, 1290);
  g.fillStyle = CARD_COLOR.gold; g.font = '700 22px ' + SANS_STACK;
  g.textAlign = 'right'; g.fillText('@archsunneo', W - 56, 1290); g.textAlign = 'left';

  return cv;
}

$('makeCard').addEventListener('click', function(){
  var btn = this;
  btn.disabled = true;
  btn.textContent = '產生中…';

  var go = function(){
    try {
      var cv = drawShareCard();
      var url = cv.toDataURL('image/png');
      $('cardImg').src = url;
      $('cardWrap').hidden = false;
      var dl = $('dlCard');
      dl.href = url; dl.hidden = false;
      btn.textContent = '重新產生（改完坐向再按一次）';
      $('cardWrap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      btn.textContent = '產生失敗：' + (err && err.message ? err.message : '未知錯誤');
    }
    btn.disabled = false;
  };

  // 等字型就緒再畫，否則 canvas 會用 fallback 字，字重跑掉
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  else go();
});
