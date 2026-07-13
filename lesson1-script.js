/* ===== 데이터 모델 ===== */
var pts = [];           // [{x, y}, ...]
var lines = [];         // [{id, x1, y1, x2, y2, color, label}, ...]
var nextLineId = 1;
var LINE_COLORS = ['#e74c3c','#2980b9','#27ae60','#e67e22','#8e44ad','#16a085'];

var mode = 'point'; // 'point' | 'line'

var lineDraw = null;    // null | {x1, y1}
var linePreview = null; // null | {x, y}

var drag = null;        // null | {line, which: 'p1'|'p2'}

var rightOpen = false;
var showPred = false;
var showErr = false;
var selectedLineId = null;

/* ===== 캔버스 + 좌표 변환 ===== */
var canvas = document.getElementById('mainCanvas');
var ctx = canvas.getContext('2d');
var MARGIN = {top: 24, right: 24, bottom: 44, left: 48};

function resize() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  redraw();
}
window.addEventListener('resize', resize);

function getRange() {
  if (pts.length === 0) return {xMin:0, xMax:10, yMin:0, yMax:10};
  var xs = pts.map(function(p){return p.x;}), ys = pts.map(function(p){return p.y;});
  var xMin = Math.min.apply(null,xs), xMax = Math.max.apply(null,xs);
  var yMin = Math.min.apply(null,ys), yMax = Math.max.apply(null,ys);
  var xPad = Math.max((xMax-xMin)*0.12, 1), yPad = Math.max((yMax-yMin)*0.12, 1);
  return {xMin:xMin-xPad, xMax:xMax+xPad, yMin:Math.min(0,yMin-yPad), yMax:yMax+yPad};
}

function toPixel(x, y, range) {
  var w = canvas.width - MARGIN.left - MARGIN.right;
  var h = canvas.height - MARGIN.top - MARGIN.bottom;
  return {
    px: MARGIN.left + (x - range.xMin) / (range.xMax - range.xMin) * w,
    py: MARGIN.top  + (1 - (y - range.yMin) / (range.yMax - range.yMin)) * h
  };
}

function fromPixel(px, py, range) {
  var w = canvas.width - MARGIN.left - MARGIN.right;
  var h = canvas.height - MARGIN.top - MARGIN.bottom;
  return {
    x: range.xMin + (px - MARGIN.left) / w * (range.xMax - range.xMin),
    y: range.yMin + (1 - (py - MARGIN.top) / h) * (range.yMax - range.yMin)
  };
}

/* ===== 직선 방정식 ===== */
function lineEq(ln) {
  var dx = ln.x2 - ln.x1, dy = ln.y2 - ln.y1;
  if (Math.abs(dx) < 1e-9) return {slope: Infinity, intercept: ln.x1, label: 'x = '+ln.x1.toFixed(1)};
  var slope = dy / dx;
  var intercept = ln.y1 - slope * ln.x1;
  var label = 'y = ' + slope.toFixed(2) + 'x';
  if (intercept >= 0) label += ' + ' + intercept.toFixed(2);
  else label += ' − ' + Math.abs(intercept).toFixed(2);
  return {slope: slope, intercept: intercept, label: label};
}

function lineY(ln, x) {
  var eq = lineEq(ln);
  if (!isFinite(eq.slope)) return NaN;
  return eq.slope * x + eq.intercept;
}

/* ===== 그리기 ===== */
function redraw() {
  var range = getRange();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid(range);
  drawLines(range);
  if (lineDraw && linePreview) drawPreviewLine(range);
  drawHandles(range);
  drawPoints(range);
}

function niceTicks(min, max, count) {
  var range = max - min;
  var rawStep = range / count;
  var mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  var norm = rawStep / mag;
  var step = norm < 1.5 ? mag : norm < 3.5 ? 2*mag : norm < 7.5 ? 5*mag : 10*mag;
  var start = Math.ceil(min / step) * step;
  var ticks = [];
  for (var v = start; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1e9) / 1e9);
  return ticks;
}

function drawGrid(range) {
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  var xTicks = niceTicks(range.xMin, range.xMax, 6);
  var yTicks = niceTicks(range.yMin, range.yMax, 5);
  xTicks.forEach(function(v) {
    var p = toPixel(v, 0, range);
    ctx.beginPath(); ctx.moveTo(p.px, MARGIN.top); ctx.lineTo(p.px, canvas.height - MARGIN.bottom);
    ctx.stroke();
    ctx.fillStyle = '#718096'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(v, p.px, canvas.height - MARGIN.bottom + 14);
  });
  yTicks.forEach(function(v) {
    var p = toPixel(0, v, range);
    ctx.beginPath(); ctx.moveTo(MARGIN.left, p.py); ctx.lineTo(canvas.width - MARGIN.right, p.py);
    ctx.stroke();
    ctx.fillStyle = '#718096'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(v, MARGIN.left - 6, p.py + 4);
  });
}

function extendLine(p1, p2) {
  var dx = p2.px - p1.px, dy = p2.py - p1.py;
  var ex1 = p1.px + dx * (-1000), ey1 = p1.py + dy * (-1000);
  var ex2 = p1.px + dx * (1000),  ey2 = p1.py + dy * (1000);
  return {x1: ex1, y1: ey1, x2: ex2, y2: ey2};
}

function drawLines(range) {
  lines.forEach(function(ln) {
    var p1 = toPixel(ln.x1, ln.y1, range), p2 = toPixel(ln.x2, ln.y2, range);
    var extended = extendLine(p1, p2);
    ctx.beginPath();
    ctx.moveTo(extended.x1, extended.y1);
    ctx.lineTo(extended.x2, extended.y2);
    ctx.strokeStyle = ln.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    var eq = lineEq(ln);
    ctx.fillStyle = ln.color;
    ctx.font = 'bold 12px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(eq.label, p1.px + 4, p1.py - 6);
  });
}

function drawHandles(range) {
  if (mode !== 'line') return;
  lines.forEach(function(ln) {
    [{x:ln.x1,y:ln.y1},{x:ln.x2,y:ln.y2}].forEach(function(p) {
      var px = toPixel(p.x, p.y, range);
      ctx.beginPath(); ctx.arc(px.px, px.py, 7, 0, 2*Math.PI);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = ln.color; ctx.lineWidth = 2; ctx.stroke();
    });
  });
}

function drawPoints(range) {
  pts.forEach(function(p) {
    var px = toPixel(p.x, p.y, range);
    ctx.beginPath(); ctx.arc(px.px, px.py, 5, 0, 2*Math.PI);
    ctx.fillStyle = '#4a5568'; ctx.fill();
  });
}

function drawPreviewLine(range) {
  var p1 = toPixel(lineDraw.x1, lineDraw.y1, range);
  var p2 = toPixel(linePreview.x, linePreview.y, range);
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#a0aec0'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py); ctx.stroke();
  ctx.setLineDash([]);
}

/* ===== 이벤트 핸들러 ===== */
function dist(ax, ay, bx, by) { return Math.sqrt((ax-bx)*(ax-bx)+(ay-by)*(ay-by)); }

canvas.addEventListener('mousedown', function(e) {
  var rect = canvas.getBoundingClientRect();
  var cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  var range = getRange();

  if (mode === 'line') {
    // endpoint 드래그 여부 확인
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var p1px = toPixel(ln.x1, ln.y1, range), p2px = toPixel(ln.x2, ln.y2, range);
      if (dist(cx, cy, p1px.px, p1px.py) < 10) { drag = {line: ln, which: 'p1'}; return; }
      if (dist(cx, cy, p2px.px, p2px.py) < 10) { drag = {line: ln, which: 'p2'}; return; }
    }
    // 새 직선 그리기
    var pt = fromPixel(cx, cy, range);
    if (!lineDraw) {
      lineDraw = {x1: pt.x, y1: pt.y};
    } else {
      var color = LINE_COLORS[lines.length % LINE_COLORS.length];
      lines.push({id: nextLineId++, x1: lineDraw.x1, y1: lineDraw.y1, x2: pt.x, y2: pt.y, color: color});
      lineDraw = null; linePreview = null;
      updateLegend(); updatePredTable();
    }
  } else {
    // 점 추가 모드
    var pt = fromPixel(cx, cy, range);
    pts.push({x: Math.round(pt.x*10)/10, y: Math.round(pt.y*10)/10});
    updateTable(); updatePredTable();
  }
  redraw();
});

canvas.addEventListener('mousemove', function(e) {
  var rect = canvas.getBoundingClientRect();
  var cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  var range = getRange();
  if (drag) {
    var pt = fromPixel(cx, cy, range);
    if (drag.which === 'p1') { drag.line.x1 = pt.x; drag.line.y1 = pt.y; }
    else { drag.line.x2 = pt.x; drag.line.y2 = pt.y; }
    updateLegend(); updatePredTable(); redraw(); return;
  }
  if (lineDraw) {
    linePreview = fromPixel(cx, cy, range);
    redraw();
  }
});

canvas.addEventListener('mouseup', function() { drag = null; });
canvas.addEventListener('mouseleave', function() { drag = null; });

/* ===== 모드 전환 ===== */
document.getElementById('btnModePoint').addEventListener('click', function() {
  mode = 'point';
  lineDraw = null; linePreview = null;
  this.classList.add('active');
  document.getElementById('btnModeLine').classList.remove('active');
  redraw();
});
document.getElementById('btnModeLine').addEventListener('click', function() {
  mode = 'line';
  this.classList.add('active');
  document.getElementById('btnModePoint').classList.remove('active');
  redraw();
});

/* ===== 데이터 테이블 ===== */
function updateTable() {
  var body = document.getElementById('dataBody');
  body.innerHTML = '';
  pts.forEach(function(p, i) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="text-align:center;color:var(--text-muted)">' + (i+1) + '</td>'
      + '<td><input type="number" value="' + p.x + '" step="0.1"></td>'
      + '<td><input type="number" value="' + p.y + '" step="0.1"></td>';
    var inputs = tr.querySelectorAll('input');
    inputs[0].addEventListener('change', function() { pts[i].x = +this.value; redraw(); updatePredTable(); });
    inputs[1].addEventListener('change', function() { pts[i].y = +this.value; redraw(); updatePredTable(); });
    body.appendChild(tr);
  });
  // 빈 행 추가 (데이터 입력용, 최대 15)
  if (pts.length < 15) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="text-align:center;color:var(--text-muted)">' + (pts.length+1) + '</td>'
      + '<td><input type="number" placeholder="x" step="0.1"></td>'
      + '<td><input type="number" placeholder="y" step="0.1"></td>';
    var inputs = tr.querySelectorAll('input');
    inputs[0].addEventListener('change', function() {
      if (inputs[1].value !== '') { pts.push({x:+inputs[0].value, y:+inputs[1].value}); updateTable(); updatePredTable(); redraw(); }
    });
    inputs[1].addEventListener('change', function() {
      if (inputs[0].value !== '') { pts.push({x:+inputs[0].value, y:+inputs[1].value}); updateTable(); updatePredTable(); redraw(); }
    });
    body.appendChild(tr);
  }
}

/* ===== 직선 범례 + 선택 드롭다운 ===== */
var sel = document.getElementById('lineSelect');

function updateLegend() {
  sel.innerHTML = '';
  if (lines.length === 0) { sel.innerHTML = '<option>직선 없음</option>'; return; }
  lines.forEach(function(ln) {
    var eq = lineEq(ln);
    ln.label = eq.label;
    var opt = document.createElement('option');
    opt.value = ln.id;
    opt.textContent = eq.label;
    sel.appendChild(opt);
  });
  if (selectedLineId === null && lines.length > 0) selectedLineId = lines[0].id;
  sel.value = selectedLineId;
}

sel.addEventListener('change', function() { selectedLineId = +this.value; updatePredTable(); });

/* ===== 예측·오차 테이블 ===== */
function updatePredTable() {
  var body = document.getElementById('predBody');
  body.innerHTML = '';
  var ln = lines.find(function(l){return l.id === selectedLineId;});
  pts.forEach(function(p) {
    var yhat = ln ? lineY(ln, p.x) : NaN;
    var err = isNaN(yhat) ? '—' : (p.y - yhat).toFixed(2);
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="text-align:center">' + p.x + '</td>'
      + '<td style="text-align:center">' + p.y + '</td>'
      + '<td class="col-pred" style="text-align:center">' + (isNaN(yhat)?'—':yhat.toFixed(2)) + '</td>'
      + '<td class="col-err" style="text-align:center">' + err + '</td>';
    body.appendChild(tr);
  });
  // 열 표시 상태 적용
  document.querySelectorAll('.col-pred').forEach(function(el){ el.classList.toggle('show', showPred); });
  document.querySelectorAll('.col-err').forEach(function(el){ el.classList.toggle('show', showErr); });
}

/* ===== 샘플 생성 + 초기화 ===== */
function generateSample() {
  var slope = 0.5 + Math.random() * 2.5;
  var result = [];
  for (var i = 0; i < 9; i++) {
    var x = Math.round((2 + Math.random() * 14) * 10) / 10;
    var noise = (Math.random() - 0.5) * slope * x * 0.4;
    var y = Math.round(Math.max(0.5, slope * x + noise) * 10) / 10;
    result.push({x: x, y: y});
  }
  return result;
}

document.getElementById('btnSample').addEventListener('click', function() {
  pts = generateSample(); lines = []; lineDraw = null; selectedLineId = null;
  updateTable(); updateLegend(); updatePredTable(); redraw();
});
document.getElementById('btnReset').addEventListener('click', function() {
  pts = []; lines = []; lineDraw = null; selectedLineId = null;
  updateTable(); updateLegend(); updatePredTable(); redraw();
});

/* ===== 우측 패널 토글 ===== */
document.getElementById('toggleRight').addEventListener('click', function() {
  rightOpen = !rightOpen;
  var panel = document.getElementById('rightPanel');
  panel.classList.toggle('hidden', !rightOpen);
  this.textContent = rightOpen ? '◀ 오차' : '▶ 오차';
  setTimeout(resize, 210);
});
document.getElementById('btnShowPred').addEventListener('click', function() {
  showPred = !showPred;
  this.classList.toggle('btn-primary', showPred);
  this.classList.toggle('btn-secondary', !showPred);
  updatePredTable();
});
document.getElementById('btnShowErr').addEventListener('click', function() {
  showErr = !showErr;
  this.classList.toggle('btn-primary', showErr);
  this.classList.toggle('btn-secondary', !showErr);
  updatePredTable();
});

/* ===== 초기화 실행 ===== */
resize();
updateTable();
updateLegend();
