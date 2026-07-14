/* ===== 데이터 모델 ===== */
var pts = [];
var a1 = 1.0, a2 = 2.0;
var showOptimal = false;

/* ===== 샘플 생성 ===== */
// y ≈ slope*x (0~30 범위, 원점 근처)
function generateSample() {
  var slope = 0.5 + Math.random() * 2.0;
  var result = [];
  for (var i = 0; i < 10; i++) {
    var x = Math.round((2 + Math.random() * 14) * 10) / 10;
    var noise = (Math.random() - 0.5) * slope * x * 0.5;
    var y = Math.round(Math.min(20, Math.max(0.1, slope * x + noise)) * 10) / 10;
    result.push({x: x, y: y});
  }
  return result;
}

/* ===== 수학 함수 ===== */
function mse(a) {
  if (pts.length === 0) return 0;
  var sum = 0;
  pts.forEach(function(p) { sum += (p.y - a * p.x) * (p.y - a * p.x); });
  return sum / pts.length;
}

function optimalA() {
  var sumXY = 0, sumX2 = 0;
  pts.forEach(function(p) { sumXY += p.x * p.y; sumX2 += p.x * p.x; });
  return sumX2 === 0 ? 0 : sumXY / sumX2;
}

/* ===== 캔버스 그리기 (고정 0~30 범위) ===== */
var canvas = document.getElementById('mainCanvas');
var ctx = canvas.getContext('2d');
var MARGIN = {top: 30, right: 44, bottom: 52, left: 56};
var rightOpen = false;

function resize() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  redraw();
}
window.addEventListener('resize', resize);

function toPixel(x, y) {
  var w = canvas.width - MARGIN.left - MARGIN.right;
  var h = canvas.height - MARGIN.top - MARGIN.bottom;
  return {
    px: MARGIN.left + x / 30 * w,
    py: MARGIN.top + (1 - y / 30) * h
  };
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  // 잔차선 (각 점에서 직선까지 수직선)
  if (pts.length > 0) {
    drawResiduals(a1, '#e74c3c');
    drawResiduals(a2, '#2980b9');
  }
  // y=ax 두 직선
  drawAxLine(a1, '#e74c3c', 'y = ' + a1.toFixed(1) + 'x');
  drawAxLine(a2, '#2980b9', 'y = ' + a2.toFixed(1) + 'x');
  // 최적 직선
  if (showOptimal) {
    var aOpt = optimalA();
    drawAxLine(aOpt, '#27ae60', 'y* = ' + aOpt.toFixed(2) + 'x');
  }
  // 데이터 포인트
  pts.forEach(function(p) {
    var px = toPixel(p.x, p.y);
    ctx.beginPath();
    ctx.arc(px.px, px.py, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#2d3748';
    ctx.fill();
  });
}

function drawGrid() {
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (var v = 0; v <= 30; v += 5) {
    var vp = toPixel(v, 0), hp = toPixel(0, v);
    ctx.beginPath();
    ctx.moveTo(vp.px, MARGIN.top);
    ctx.lineTo(vp.px, canvas.height - MARGIN.bottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(MARGIN.left, hp.py);
    ctx.lineTo(canvas.width - MARGIN.right, hp.py);
    ctx.stroke();
    ctx.fillStyle = '#4a5568';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(v, vp.px, canvas.height - MARGIN.bottom + 16);
    ctx.textAlign = 'right';
    ctx.fillText(v, MARGIN.left - 8, hp.py + 4);
  }
}

function drawAxLine(a, color, label) {
  // y = a*x는 (0,0)에서 시작 — 범위 내로 클리핑
  // a가 크면 y=30일 때 x=30/a에서 끝남, a가 작으면 x=30일 때 y=30a에서 끝남
  var xEnd, yEnd;
  if (a <= 0) {
    xEnd = 30;
    yEnd = 0;
  } else if (a * 30 <= 30) {
    xEnd = 30;
    yEnd = a * 30;
  } else {
    xEnd = 30 / a;
    yEnd = 30;
  }
  var p1 = toPixel(0, 0);
  var p2 = toPixel(xEnd, yEnd);
  ctx.beginPath();
  ctx.moveTo(p1.px, p1.py);
  ctx.lineTo(p2.px, p2.py);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  // 레이블 (직선 중간 지점에 표시)
  var midX = xEnd * 0.6;
  var midY = Math.min(a * midX, 19);
  var mp = toPixel(midX, midY);
  ctx.fillStyle = color;
  ctx.font = 'bold 14px Courier New, monospace';
  ctx.textAlign = 'left';
  var labelW = ctx.measureText(label).width;
  var lx = Math.min(mp.px + 4, canvas.width - MARGIN.right - labelW - 4);
  lx = Math.max(MARGIN.left + 4, lx);
  var ly = Math.max(mp.py - 6, MARGIN.top + 16);
  ctx.fillText(label, lx, ly);
}

function drawResiduals(a, color) {
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = color + '88';
  ctx.lineWidth = 1;
  pts.forEach(function(p) {
    var yhat = Math.min(a * p.x, 30);
    var top = toPixel(p.x, p.y);
    var bot = toPixel(p.x, yhat);
    ctx.beginPath();
    ctx.moveTo(top.px, top.py);
    ctx.lineTo(bot.px, bot.py);
    ctx.stroke();
  });
  ctx.setLineDash([]);
}

/* ===== MSE 수식 표시 (처음 3항 + ...) ===== */
function updateFormulaDisplay() {
  if (pts.length === 0) {
    document.getElementById('formulaBox1').textContent = '데이터를 입력하면 식이 표시됩니다.';
    document.getElementById('formulaBox2').innerHTML = '&nbsp;';
    document.getElementById('mseVal1').textContent = '—';
    document.getElementById('mseVal2').textContent = '—';
    document.getElementById('cell1').classList.remove('winner');
    document.getElementById('cell2').classList.remove('winner');
    return;
  }
  function makeFormula(a) {
    var terms = pts.slice(0, 3).map(function(p) {
      return '(' + p.y.toFixed(1) + '−' + a.toFixed(1) + '×' + p.x.toFixed(1) + ')²';
    });
    var suffix = pts.length > 3 ? ' + ···' : '';
    var mseVal = mse(a);
    return terms.join(' + ') + suffix + '<br>÷ ' + pts.length + ' = <b>' + mseVal.toFixed(3) + '</b>';
  }
  document.getElementById('formulaBox1').innerHTML = makeFormula(a1);
  document.getElementById('formulaBox2').innerHTML = makeFormula(a2);
  var mse1 = mse(a1), mse2 = mse(a2);
  document.getElementById('mseVal1').textContent = mse1.toFixed(3);
  document.getElementById('mseVal2').textContent = mse2.toFixed(3);
  var c1 = document.getElementById('cell1'), c2 = document.getElementById('cell2');
  c1.classList.toggle('winner', mse1 < mse2);
  c2.classList.toggle('winner', mse2 < mse1);
}

/* ===== 슬라이더 이벤트 ===== */
document.getElementById('slider1').addEventListener('input', function() {
  a1 = +this.value;
  document.getElementById('val1').textContent = a1.toFixed(1);
  redraw();
  updateFormulaDisplay();
});
document.getElementById('slider2').addEventListener('input', function() {
  a2 = +this.value;
  document.getElementById('val2').textContent = a2.toFixed(1);
  redraw();
  updateFormulaDisplay();
});

/* ===== 최적 추세선 버튼 ===== */
document.getElementById('btnOptimal').addEventListener('click', function() {
  showOptimal = !showOptimal;
  this.textContent = showOptimal ? '최적 추세선 숨기기' : '최적 추세선 표시';
  var box = document.getElementById('optimalBox');
  if (showOptimal && pts.length > 0) {
    var aOpt = optimalA();
    var mseOpt = mse(aOpt);
    var terms = pts.slice(0, 3).map(function(p) {
      return '(' + p.y.toFixed(1) + '−a·' + p.x.toFixed(1) + ')²';
    });
    var suffix = pts.length > 3 ? ' + ···' : '';
    document.getElementById('optFormula').textContent = '[' + terms.join('+') + suffix + '] ÷ ' + pts.length;
    document.getElementById('optA').textContent = aOpt.toFixed(3);
    document.getElementById('optMSE').textContent = mseOpt.toFixed(3);
    box.classList.add('visible');
  } else {
    box.classList.remove('visible');
  }
  redraw();
});

/* ===== 데이터 테이블 관리 ===== */
function updateTable() {
  var body = document.getElementById('dataBody');
  body.innerHTML = '';
  pts.forEach(function(p, i) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="text-align:center;color:var(--text-muted)">' + (i + 1) + '</td>'
      + '<td><input type="number" value="' + p.x + '" step="0.1" min="0" max="30"></td>'
      + '<td><input type="number" value="' + p.y + '" step="0.1" min="0" max="30"></td>';
    var inputs = tr.querySelectorAll('input');
    inputs[0].addEventListener('change', function() {
      pts[i].x = +this.value; redraw(); updateFormulaDisplay();
    });
    inputs[1].addEventListener('change', function() {
      pts[i].y = +this.value; redraw(); updateFormulaDisplay();
    });
    body.appendChild(tr);
  });
  // 빈 입력 행: 최소 15개가 될 때까지, 이후에는 항상 1개 (무제한 추가 가능)
  var blankCount = Math.max(1, 15 - pts.length);
  for (var b = 0; b < blankCount; b++) {
    (function(rowIdx) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td style="text-align:center;color:var(--text-muted)">' + (rowIdx + 1) + '</td>'
        + '<td><input type="number" step="0.1" min="0" max="30"></td>'
        + '<td><input type="number" step="0.1" min="0" max="30"></td>';
      var inputs = tr.querySelectorAll('input');
      function tryAdd() {
        if (inputs[0].value !== '' && inputs[1].value !== '') {
          pts.push({x: +inputs[0].value, y: +inputs[1].value});
          updateTable(); redraw(); updateFormulaDisplay();
        }
      }
      inputs[0].addEventListener('change', tryAdd);
      inputs[1].addEventListener('change', tryAdd);
      body.appendChild(tr);
    })(pts.length + b);
  }
}

/* ===== 샘플 생성 + 초기화 ===== */
document.getElementById('btnSample').addEventListener('click', function() {
  pts = generateSample();
  showOptimal = false;
  document.getElementById('optimalBox').classList.remove('visible');
  document.getElementById('btnOptimal').textContent = '최적 추세선 표시';
  updateTable();
  redraw();
  updateFormulaDisplay();
});
document.getElementById('btnReset').addEventListener('click', function() {
  pts = [];
  showOptimal = false;
  document.getElementById('optimalBox').classList.remove('visible');
  document.getElementById('btnOptimal').textContent = '최적 추세선 표시';
  updateTable();
  redraw();
  updateFormulaDisplay();
});

/* ===== 우측 패널 토글 ===== */
document.getElementById('toggleRight').addEventListener('click', function() {
  rightOpen = !rightOpen;
  document.getElementById('rightPanel').classList.toggle('hidden', !rightOpen);
  this.textContent = rightOpen ? '◀ 손실함수' : '▶ 손실함수';
});

/* ===== 초기화 실행 ===== */
resize();
updateTable();
