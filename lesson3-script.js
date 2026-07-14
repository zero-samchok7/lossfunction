// ===== 데이터 모델 =====
var pts = [];
var currentA = 1.0;
var stepShown = 1;   // 1, 2, 3 (현재 보여진 단계)
var animating = false;
var rightOpen = false;
var showMin = false;

// MSE(a) 계산
function mse(a) {
  if (pts.length === 0) return 0;
  var sum = 0;
  pts.forEach(function(p){ sum += (p.y - a*p.x)*(p.y - a*p.x); });
  return sum / pts.length;
}

// MSE 이차식 계수 계산 (MSE = A·a² − B·a + C)
function computeCoeffs() {
  var n = pts.length;
  if (n === 0) return {A:0, B:0, C:0, aStar:0, mseStar:0};
  var sumX2 = 0, sumXY = 0, sumY2 = 0;
  pts.forEach(function(p){ sumX2 += p.x*p.x; sumXY += p.x*p.y; sumY2 += p.y*p.y; });
  var A = sumX2 / n;
  var B = 2 * sumXY / n;   // MSE(a) = A·a² − B·a + C, so a* = B/(2A)
  var C = sumY2 / n;
  var aStar = A > 0 ? B / (2*A) : 0;
  var mseStar = mse(aStar);
  return {A:A, B:B, C:C, aStar:aStar, mseStar:mseStar};
}

// 샘플 생성
function generateSample() {
  var slope = 0.5 + Math.random() * 2.0;
  var result = [];
  for (var i = 0; i < 10; i++) {
    var x = Math.round((2 + Math.random() * 14) * 10) / 10;
    var noise = (Math.random() - 0.5) * slope * x * 0.5;
    var y = Math.round(Math.min(20, Math.max(0.1, slope*x + noise)) * 10) / 10;
    result.push({x:x, y:y});
  }
  return result;
}

// ===== 좌측 산점도 캔버스 =====
var scatterCanvas = document.getElementById('scatterCanvas');
var sCtx = scatterCanvas.getContext('2d');

function resizeScatter() {
  scatterCanvas.width = scatterCanvas.offsetWidth;
  scatterCanvas.height = scatterCanvas.offsetHeight;
  redrawScatter();
}

function redrawScatter() {
  var w = scatterCanvas.width, h = scatterCanvas.height;
  var M = {t:14, r:14, b:30, l:36};
  sCtx.clearRect(0,0,w,h);
  sCtx.fillStyle='#fff'; sCtx.fillRect(0,0,w,h);
  // 고정 범위 0~20
  function tp(x,y) {
    return {px: M.l + x/20*(w-M.l-M.r), py: M.t + (1-y/20)*(h-M.t-M.b)};
  }
  // 격자 (0,5,10,15,20)
  sCtx.strokeStyle='#e2e8f0'; sCtx.lineWidth=1;
  [0,5,10,15,20].forEach(function(v){
    var vp=tp(v,0),hp=tp(0,v);
    sCtx.beginPath(); sCtx.moveTo(vp.px,M.t); sCtx.lineTo(vp.px,h-M.b); sCtx.stroke();
    sCtx.beginPath(); sCtx.moveTo(M.l,hp.py); sCtx.lineTo(w-M.r,hp.py); sCtx.stroke();
    sCtx.fillStyle='#4a5568'; sCtx.font='bold 11px sans-serif';
    sCtx.textAlign='center'; sCtx.fillText(v,vp.px,h-M.b+12);
    sCtx.textAlign='right';  sCtx.fillText(v,M.l-4,hp.py+3);
  });
  // 현재 y=ax 추세선
  if (pts.length > 0) {
    var xAtMax = currentA>0 ? Math.min(20/currentA,20) : 20;
    var p0=tp(0,0), pe=tp(xAtMax, Math.min(currentA*xAtMax,20));
    sCtx.beginPath(); sCtx.moveTo(p0.px,p0.py); sCtx.lineTo(pe.px,pe.py);
    sCtx.strokeStyle='#6c5ce7'; sCtx.lineWidth=2; sCtx.stroke();
  }
  // 데이터 포인트
  pts.forEach(function(p){
    var px=tp(p.x,p.y);
    sCtx.beginPath(); sCtx.arc(px.px,px.py,4,0,2*Math.PI);
    sCtx.fillStyle='#2d3748'; sCtx.fill();
  });
}

// ===== 중간 MSE 포물선 캔버스 =====
var pCanvas = document.getElementById('parabolaCanvas');
var pCtx = pCanvas.getContext('2d');
var PM = {top:36, right:40, bottom:56, left:62};

function resizeParabola() {
  pCanvas.width = pCanvas.offsetWidth;
  pCanvas.height = pCanvas.offsetHeight;
  redrawParabola();
}

window.addEventListener('resize', function(){ resizeScatter(); resizeParabola(); });

function redrawParabola() {
  var w = pCanvas.width, h = pCanvas.height;
  pCtx.clearRect(0,0,w,h);
  pCtx.fillStyle='#fff'; pCtx.fillRect(0,0,w,h);

  if (pts.length < 2) {
    pCtx.fillStyle='#718096'; pCtx.font='14px sans-serif'; pCtx.textAlign='center';
    pCtx.fillText('데이터를 2개 이상 입력하세요', w/2, h/2);
    return;
  }

  var coeffs = computeCoeffs();
  var aStar = coeffs.aStar;

  // x축 범위: 0 ~ max(aStar*2.2, 5)
  var aMax = Math.max(aStar * 2.2, 5);
  // y축 범위: 0 ~ MSE(0)*1.1
  var mseAtZero = mse(0);
  var yMax = Math.max(mseAtZero * 1.1, coeffs.mseStar * 3, 1);

  function tp(a, m) {
    var plotW = w - PM.left - PM.right, plotH = h - PM.top - PM.bottom;
    return {
      px: PM.left + a/aMax*plotW,
      py: PM.top + (1 - m/yMax)*plotH
    };
  }

  // 격자 + 축 레이블
  var aTicks = niceTicks(0, aMax, 5), mTicks = niceTicks(0, yMax, 4);
  pCtx.strokeStyle='#e2e8f0'; pCtx.lineWidth=1;
  aTicks.forEach(function(v){
    var p=tp(v,0); pCtx.beginPath(); pCtx.moveTo(p.px,PM.top); pCtx.lineTo(p.px,h-PM.bottom); pCtx.stroke();
    pCtx.fillStyle='#4a5568'; pCtx.font='bold 13px sans-serif'; pCtx.textAlign='center';
    pCtx.fillText(v.toFixed(1), p.px, h-PM.bottom+16);
  });
  mTicks.forEach(function(v){
    var p=tp(0,v); pCtx.beginPath(); pCtx.moveTo(PM.left,p.py); pCtx.lineTo(w-PM.right,p.py); pCtx.stroke();
    pCtx.fillStyle='#4a5568'; pCtx.font='bold 13px sans-serif'; pCtx.textAlign='right';
    pCtx.fillText(v.toFixed(2), PM.left-8, p.py+4);
  });
  // 축 레이블
  pCtx.fillStyle='#718096'; pCtx.font='14px sans-serif'; pCtx.textAlign='center';
  pCtx.fillText('기울기 a', w/2, h-10);
  pCtx.save(); pCtx.translate(16, h/2); pCtx.rotate(-Math.PI/2);
  pCtx.fillText('MSE(a)', 0, 0); pCtx.restore();

  // 포물선 그리기
  pCtx.beginPath();
  for (var i = 0; i <= 200; i++) {
    var a = aMax * i / 200;
    var m = mse(a);
    var p = tp(a, m);
    if (i === 0) pCtx.moveTo(p.px, p.py); else pCtx.lineTo(p.px, p.py);
  }
  pCtx.strokeStyle = '#6c5ce7'; pCtx.lineWidth = 2.5; pCtx.stroke();

  // 현재 a 위치 (빨간 점)
  var curMSE = mse(currentA);
  var curP = tp(currentA, curMSE);
  pCtx.beginPath(); pCtx.arc(curP.px, curP.py, 7, 0, 2*Math.PI);
  pCtx.fillStyle = '#e53e3e'; pCtx.fill();
  pCtx.strokeStyle = '#fff'; pCtx.lineWidth = 2; pCtx.stroke();

  // 최솟값 ★ 표시 (최솟값 찾기 버튼 누른 후에만)
  if (showMin) {
    var starP = tp(aStar, coeffs.mseStar);
    pCtx.font = '18px sans-serif'; pCtx.fillStyle = '#f6ad55'; pCtx.textAlign = 'center';
    pCtx.fillText('★', starP.px, starP.py - 4);
    // a* 수직 점선
    pCtx.setLineDash([4,4]); pCtx.strokeStyle = '#f6ad55'; pCtx.lineWidth = 1;
    pCtx.beginPath(); pCtx.moveTo(starP.px, starP.py); pCtx.lineTo(starP.px, h-PM.bottom); pCtx.stroke();
    pCtx.setLineDash([]);
    // a* 레이블 (x축)
    var label = 'a*=' + aStar.toFixed(2);
    var lw = pCtx.measureText(label).width;
    pCtx.fillStyle = '#fff'; pCtx.fillRect(starP.px - lw/2 - 3, h-PM.bottom+2, lw + 6, 18);
    pCtx.fillStyle = '#f6ad55'; pCtx.font = 'bold 13px sans-serif'; pCtx.textAlign = 'center';
    pCtx.fillText(label, starP.px, h-PM.bottom+15);
  }
}

// 캔버스 클릭 → a 값 선택
pCanvas.addEventListener('click', function(e) {
  if (pts.length < 2) return;
  var rect = pCanvas.getBoundingClientRect();
  var cx = e.clientX - rect.left;
  var coeffs = computeCoeffs();
  var aMax = Math.max(coeffs.aStar * 2.2, 5);
  var plotW = pCanvas.width - PM.left - PM.right;
  var a = (cx - PM.left) / plotW * aMax;
  if (a < 0) a = 0; if (a > aMax) a = aMax;
  currentA = Math.round(a * 100) / 100;
  document.getElementById('aSlider').value = Math.min(currentA, +document.getElementById('aSlider').max);
  updateADisplay();
});

// ===== niceTicks =====
function niceTicks(min, max, count) {
  var range = max - min, rawStep = range / count;
  var mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  var norm = rawStep / mag;
  var step = norm<1.5?mag:norm<3.5?2*mag:norm<7.5?5*mag:10*mag;
  var start = Math.ceil(min/step)*step, ticks = [];
  for (var v=start; v<=max+1e-9; v+=step) ticks.push(Math.round(v*1e9)/1e9);
  return ticks;
}

// ===== 슬라이더 + 수식 업데이트 =====
function updateADisplay() {
  document.getElementById('aVal').textContent = currentA.toFixed(2);
  document.getElementById('mseDisplay').textContent = pts.length>0 ? mse(currentA).toFixed(4) : '—';
  redrawScatter(); redrawParabola();
}

document.getElementById('aSlider').addEventListener('input', function() {
  currentA = +this.value;
  updateADisplay();
});

// 수식 계수 업데이트 (데이터 변경 시)
function updateCoeffDisplay() {
  if (pts.length < 2) return;
  var c = computeCoeffs();
  var A = c.A.toFixed(4), B = c.B.toFixed(4), C = c.C.toFixed(4);
  var latex = '= \\textcolor{#6c5ce7}{' + A + '}\\,a^2 - \\textcolor{#6c5ce7}{' + B + '}\\,a + \\textcolor{#6c5ce7}{' + C + '}';
  document.getElementById('step3').innerHTML = katex.renderToString(latex, {throwOnError: false, displayMode: true});
  // 슬라이더 범위 조정
  var aMax = Math.max(c.aStar * 2.5, 5);
  document.getElementById('aSlider').max = aMax.toFixed(1);
}

// ===== 단계별 전개 버튼 =====
document.getElementById('btnNextStep').addEventListener('click', function() {
  if (pts.length < 2) { alert('데이터를 2개 이상 입력하세요.'); return; }
  if (stepShown < 3) {
    stepShown++;
    document.getElementById('step' + stepShown).classList.add('visible');
    if (stepShown === 3) {
      updateCoeffDisplay();
      this.textContent = '전개 완료';
      this.disabled = true;
      document.getElementById('minSection').style.display = 'flex';
      document.getElementById('minSection').style.flexDirection = 'column';
      document.getElementById('minSection').style.gap = '6px';
    }
  }
});

// ===== 최솟값 찾기 버튼 + 애니메이션 =====
document.getElementById('btnFindMin').addEventListener('click', function() {
  if (pts.length < 2 || animating) return;
  var coeffs = computeCoeffs();
  var aStar = coeffs.aStar;
  var startA = currentA;
  var steps = 40;
  var step = 0;
  animating = true;
  function animate() {
    step++;
    currentA = startA + (aStar - startA) * (step / steps);
    document.getElementById('aSlider').value = Math.min(currentA, +document.getElementById('aSlider').max);
    updateADisplay();
    if (step < steps) { requestAnimationFrame(animate); }
    else {
      currentA = aStar;
      showMin = true;
      updateADisplay();
      animating = false;
      // 결과 표시
      document.getElementById('minA').textContent = aStar.toFixed(4);
      document.getElementById('minMSE').textContent = coeffs.mseStar.toFixed(4);
      document.getElementById('minBox').classList.add('visible');
    }
  }
  animate();
});

// ===== 샘플 생성 + 데이터 테이블 =====
function resetSteps() {
  stepShown = 1;
  showMin = false;
  document.getElementById('step2').classList.remove('visible');
  document.getElementById('step3').classList.remove('visible');
  document.getElementById('btnNextStep').textContent = '다음 단계 →';
  document.getElementById('btnNextStep').disabled = false;
  document.getElementById('minSection').style.display = 'none';
  document.getElementById('minBox').classList.remove('visible');
}

function updateTable() {
  var body = document.getElementById('dataBody');
  body.innerHTML = '';
  pts.forEach(function(p, i) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="text-align:center;color:var(--text-muted)">' + (i+1) + '</td>'
      + '<td><input type="number" value="' + p.x + '" min="0" max="20" step="0.1"></td>'
      + '<td><input type="number" value="' + p.y + '" min="0" max="20" step="0.1"></td>';
    var inputs = tr.querySelectorAll('input');
    inputs[0].addEventListener('change', function() { pts[i].x=+this.value; resetSteps(); updateCoeffDisplay(); updateADisplay(); });
    inputs[1].addEventListener('change', function() { pts[i].y=+this.value; resetSteps(); updateCoeffDisplay(); updateADisplay(); });
    body.appendChild(tr);
  });
}

document.getElementById('btnSample').addEventListener('click', function() {
  pts = generateSample(); currentA = 1.0;
  document.getElementById('aSlider').value = 1.0;
  resetSteps(); updateTable(); updateCoeffDisplay(); updateADisplay();
  setTimeout(function(){ resizeScatter(); resizeParabola(); }, 10);
});

document.getElementById('btnReset').addEventListener('click', function() {
  pts = []; currentA = 1.0;
  resetSteps(); updateTable(); updateADisplay();
  resizeScatter(); resizeParabola();
});

// ===== 우측 패널 토글 =====
document.getElementById('toggleRight').addEventListener('click', function() {
  rightOpen = !rightOpen;
  document.getElementById('rightPanel').classList.toggle('hidden', !rightOpen);
  this.textContent = rightOpen ? '◀ 손실함수' : '▶ 손실함수';
});

// ===== 초기화 =====
resizeScatter(); resizeParabola(); updateTable();
