/* ===== 데이터 모델 ===== */
var pts = [];           // [{x, y}, ...]
var lines = [];         // [{id, x1, y1, x2, y2, color, label}, ...]
var nextLineId = 1;
var LINE_COLORS = ['#e74c3c','#2980b9','#27ae60','#e67e22','#8e44ad','#16a085'];

var mode = 'point'; // 'point' | 'line'

var lineDraw = null;    // null | {x1, y1}
var linePreview = null; // null | {x, y}

var drag = null;        // null | {line, which: 'p1'|'p2'|'body', startCx, startCy, origX1, origY1, origX2, origY2}

var rightOpen = false;
var showPred = false;
var showErr = false;
var selectedLineId = null;

/* ===== 캔버스 + 좌표 변환 ===== */
var canvas = document.getElementById('mainCanvas');
var ctx = canvas.getContext('2d');
var MARGIN = {top: 30, right: 44, bottom: 52, left: 56};

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
    ctx.fillStyle = '#4a5568'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(v, p.px, canvas.height - MARGIN.bottom + 16);
  });
  yTicks.forEach(function(v) {
    var p = toPixel(0, v, range);
    ctx.beginPath(); ctx.moveTo(MARGIN.left, p.py); ctx.lineTo(canvas.width - MARGIN.right, p.py);
    ctx.stroke();
    ctx.fillStyle = '#4a5568'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(v, MARGIN.left - 8, p.py + 4);
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
    ctx.font = 'bold 14px Courier New, monospace';
    ctx.textAlign = 'left';
    var labelW = ctx.measureText(eq.label).width;
    var lx = Math.min(p1.px + 4, canvas.width - MARGIN.right - labelW - 4);
    lx = Math.max(MARGIN.left + 4, lx);
    var ly = Math.max(p1.py - 8, MARGIN.top + 16);
    ctx.fillText(eq.label, lx, ly);
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

function distToLine(cx, cy, p1px, p2px) {
  var dx = p2px.px - p1px.px, dy = p2px.py - p1px.py;
  var len = Math.sqrt(dx*dx + dy*dy);
  if (len < 1e-9) return dist(cx, cy, p1px.px, p1px.py);
  return Math.abs(dy*(cx - p1px.px) - dx*(cy - p1px.py)) / len;
}

function handleDown(cx, cy) {
  var range = getRange();
  if (mode === 'line') {
    // 1순위: 끝점 드래그
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var p1px = toPixel(ln.x1, ln.y1, range), p2px = toPixel(ln.x2, ln.y2, range);
      if (dist(cx, cy, p1px.px, p1px.py) < 14) {
        drag = {line: ln, which: 'p1'};
        return true;
      }
      if (dist(cx, cy, p2px.px, p2px.py) < 14) {
        drag = {line: ln, which: 'p2'};
        return true;
      }
    }
    // 2순위: 직선 본체 드래그 (전체 이동)
    for (var j = 0; j < lines.length; j++) {
      var ln2 = lines[j];
      var p1px2 = toPixel(ln2.x1, ln2.y1, range), p2px2 = toPixel(ln2.x2, ln2.y2, range);
      if (distToLine(cx, cy, p1px2, p2px2) < 10) {
        drag = {
          line: ln2, which: 'body',
          startCx: cx, startCy: cy,
          origX1: ln2.x1, origY1: ln2.y1,
          origX2: ln2.x2, origY2: ln2.y2
        };
        return true;
      }
    }
    // 3순위: 새 직선 그리기
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
    var pt2 = fromPixel(cx, cy, range);
    pts.push({x: Math.round(pt2.x*10)/10, y: Math.round(pt2.y*10)/10});
    updateTable(); updatePredTable();
  }
  redraw();
  return false;
}

function handleMove(cx, cy) {
  var range = getRange();
  if (drag) {
    if (drag.which === 'body') {
      var dx = cx - drag.startCx, dy = cy - drag.startCy;
      var w = canvas.width - MARGIN.left - MARGIN.right;
      var h = canvas.height - MARGIN.top - MARGIN.bottom;
      var dxa = dx / w * (range.xMax - range.xMin);
      var dya = -dy / h * (range.yMax - range.yMin);
      drag.line.x1 = drag.origX1 + dxa;
      drag.line.y1 = drag.origY1 + dya;
      drag.line.x2 = drag.origX2 + dxa;
      drag.line.y2 = drag.origY2 + dya;
    } else {
      var pt = fromPixel(cx, cy, range);
      if (drag.which === 'p1') { drag.line.x1 = pt.x; drag.line.y1 = pt.y; }
      else { drag.line.x2 = pt.x; drag.line.y2 = pt.y; }
    }
    updateLegend(); updatePredTable(); redraw();
    return;
  }
  if (lineDraw) {
    linePreview = fromPixel(cx, cy, range);
    redraw();
  }
}

function handleUp() { drag = null; }

/* 마우스 */
canvas.addEventListener('mousedown', function(e) {
  var rect = canvas.getBoundingClientRect();
  handleDown(e.clientX - rect.left, e.clientY - rect.top);
});
canvas.addEventListener('mousemove', function(e) {
  var rect = canvas.getBoundingClientRect();
  handleMove(e.clientX - rect.left, e.clientY - rect.top);
});
canvas.addEventListener('mouseup', handleUp);
canvas.addEventListener('mouseleave', handleUp);

/* 터치 (패드 환경) */
canvas.addEventListener('touchstart', function(e) {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  var rect = canvas.getBoundingClientRect();
  handleDown(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
}, { passive: false });
canvas.addEventListener('touchmove', function(e) {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  var rect = canvas.getBoundingClientRect();
  handleMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
}, { passive: false });
canvas.addEventListener('touchend', function(e) {
  e.preventDefault();
  handleUp();
}, { passive: false });

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
  // 빈 입력 행: 최소 15개가 될 때까지, 이후에는 항상 1개 (무제한 추가 가능)
  var blankCount = Math.max(1, 15 - pts.length);
  for (var b = 0; b < blankCount; b++) {
    (function(rowIdx) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td style="text-align:center;color:var(--text-muted)">' + (rowIdx+1) + '</td>'
        + '<td><input type="number" step="0.1"></td>'
        + '<td><input type="number" step="0.1"></td>';
      var inputs = tr.querySelectorAll('input');
      function tryAdd() {
        if (inputs[0].value !== '' && inputs[1].value !== '') {
          pts.push({x: +inputs[0].value, y: +inputs[1].value});
          updateTable(); updatePredTable(); redraw();
        }
      }
      inputs[0].addEventListener('change', tryAdd);
      inputs[1].addEventListener('change', tryAdd);
      body.appendChild(tr);
    })(pts.length + b);
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
  if (statsOpen) updateStats();
}

/* ===== 샘플 생성 + 초기화 ===== */
function generateSample() {
  var slope = 0.5 + Math.random() * 2.5;
  var result = [];
  for (var i = 0; i < 10; i++) {
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

/* ===== 자료 통계 ===== */
var statsOpen = false;
function updateStats() {
  var ln = lines.find(function(l){ return l.id === selectedLineId; });
  var ids = ['statSumErr','statMeanErr','statSumAbsErr','statMeanAbsErr',
             'statSumSqrtErr','statMeanSqrtErr','statSumSqErr','statMeanSqErr'];
  if (!ln || pts.length === 0) {
    ids.forEach(function(id){ document.getElementById(id).textContent = '—'; });
    return;
  }
  var n = pts.length;
  var sumErr = 0, sumAbs = 0, sumSqrt = 0, sumSq = 0;
  pts.forEach(function(p) {
    var e = p.y - lineY(ln, p.x);
    sumErr  += e;
    sumAbs  += Math.abs(e);
    sumSqrt += Math.sqrt(Math.abs(e));
    sumSq   += e * e;
  });
  document.getElementById('statSumErr').textContent     = sumErr.toFixed(3);
  document.getElementById('statMeanErr').textContent    = (sumErr / n).toFixed(3);
  document.getElementById('statSumAbsErr').textContent  = sumAbs.toFixed(3);
  document.getElementById('statMeanAbsErr').textContent = (sumAbs / n).toFixed(3);
  document.getElementById('statSumSqrtErr').textContent = sumSqrt.toFixed(3);
  document.getElementById('statMeanSqrtErr').textContent= (sumSqrt / n).toFixed(3);
  document.getElementById('statSumSqErr').textContent   = sumSq.toFixed(3);
  document.getElementById('statMeanSqErr').textContent  = (sumSq / n).toFixed(3);
}
document.getElementById('btnShowStats').addEventListener('click', function() {
  statsOpen = !statsOpen;
  document.getElementById('statsBox').style.display = statsOpen ? 'flex' : 'none';
  this.classList.toggle('btn-primary', statsOpen);
  this.classList.toggle('btn-secondary', !statsOpen);
  if (statsOpen) updateStats();
});

/* ===== 초기화 실행 ===== */
resize();
updateTable();
updateLegend();
