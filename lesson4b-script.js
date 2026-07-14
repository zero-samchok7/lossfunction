/* ===== 데이터 모델 ===== */
var tableData = [];
var rowCount = 10;
var dataPts = [];

/* ===== 경사하강법 상태 ===== */
var gdA0 = 0, gdAlpha = 0.10;
var curA = 0;          /* 현재 a 위치 */
var stepCount = 0;
var history = [];      /* [{a, mse, grad}] */
var gdStarted = false; /* 한 단계 이상 실행했는지 */

/* ===== MSE & 기울기 계산 (y=ax) ===== */
function mse(a) {
    if (dataPts.length === 0) return 0;
    var s = 0;
    dataPts.forEach(function(p) { s += (p.y - a * p.x) * (p.y - a * p.x); });
    return s / dataPts.length;
}

/* dMSE/da = (2/n) Σ(-xᵢ)(yᵢ - axᵢ) = (2/n)(a·Σxᵢ² - Σxᵢyᵢ) */
function gradient(a) {
    if (dataPts.length === 0) return 0;
    var sx2 = 0, sxy = 0;
    dataPts.forEach(function(p) { sx2 += p.x * p.x; sxy += p.x * p.y; });
    return 2 * (a * sx2 - sxy) / dataPts.length;
}

function optimalA() {
    var sx2 = 0, sxy = 0;
    dataPts.forEach(function(p) { sx2 += p.x * p.x; sxy += p.x * p.y; });
    return sx2 === 0 ? 0 : sxy / sx2;
}

/* ===== niceTicks ===== */
function niceTicks(min, max, count) {
    var range = max - min, rawStep = range / count;
    var mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    var norm = rawStep / mag;
    var step = norm < 1.5 ? mag : norm < 3.5 ? 2 * mag : norm < 7.5 ? 5 * mag : 10 * mag;
    var start = Math.ceil(min / step) * step, ticks = [];
    for (var v = start; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1e9) / 1e9);
    return ticks;
}

/* ===== 초기화 & 한 단계 ===== */
function gdReset() {
    gdA0 = parseFloat(document.getElementById('a0Input').value) || 0;
    gdAlpha = +document.getElementById('alphaSlider').value;
    curA = gdA0;
    stepCount = 0;
    history = [];
    gdStarted = false;
    var hasPts = dataPts.length >= 2;
    document.getElementById('btnStep').disabled = !hasPts;
    document.getElementById('btnStepReset').disabled = !hasPts;
    updateMidPanel();
    drawParabola();
    drawLeft();
}

function gdStep() {
    if (dataPts.length < 2) return;
    var g = gradient(curA);
    var m = mse(curA);
    history.push({ step: stepCount, a: curA, mse: m, grad: g });
    var newA = curA - gdAlpha * g;
    curA = newA;
    stepCount++;
    gdStarted = true;
    updateMidPanel();
    drawParabola();
    drawLeft();
}

/* ===== 중간 패널 업데이트 ===== */
function updateMidPanel() {
    if (!gdStarted || history.length === 0) {
        document.getElementById('statStep').textContent = '—';
        document.getElementById('statA').textContent = '—';
        document.getElementById('statMse').textContent = '—';
        document.getElementById('statGrad').textContent = '—';
        document.getElementById('stepFormula').textContent = '—';
        document.getElementById('convergeBox').style.display = 'none';
        document.getElementById('tangentHint').style.display = dataPts.length >= 2 ? '' : 'none';
    } else {
        var last = history[history.length - 1];
        document.getElementById('statStep').textContent = last.step;
        document.getElementById('statA').textContent = last.a.toFixed(4);
        document.getElementById('statMse').textContent = last.mse.toFixed(4);
        document.getElementById('statGrad').textContent = last.grad.toFixed(4);
        var fmtA = last.a.toFixed(3), fmtAlpha = gdAlpha.toFixed(2), fmtG = last.grad.toFixed(3);
        var fmtNew = curA.toFixed(3);
        document.getElementById('stepFormula').textContent =
            fmtNew + ' = ' + fmtA + ' − ' + fmtAlpha + ' × ' + fmtG;
        var converged = Math.abs(last.grad) < 0.001;
        document.getElementById('convergeBox').style.display = converged ? '' : 'none';
        document.getElementById('tangentHint').style.display = 'none';
    }

    /* 단계별 기록 테이블 */
    var tbody = document.getElementById('histTbody');
    tbody.innerHTML = '';
    history.forEach(function(h, idx) {
        var tr = document.createElement('tr');
        if (idx === history.length - 1) tr.className = 'current-row';
        tr.innerHTML = '<td>' + h.step + '</td>'
            + '<td>' + h.a.toFixed(3) + '</td>'
            + '<td>' + h.mse.toFixed(3) + '</td>'
            + '<td>' + h.grad.toFixed(3) + '</td>';
        tbody.appendChild(tr);
    });
    /* 최신 행으로 스크롤 */
    var hw = tbody.parentElement.parentElement;
    if (hw) hw.scrollTop = hw.scrollHeight;
}

/* ===== 우측: MSE 포물선 + 접선 그리기 ===== */
var pCvs = document.getElementById('parabolaCvs');
var pCtx = pCvs.getContext('2d');
var PM = { top: 36, right: 40, bottom: 56, left: 62 };

function resizeParabola() {
    pCvs.width = pCvs.offsetWidth;
    pCvs.height = pCvs.offsetHeight;
    drawParabola();
}

function drawParabola() {
    var w = pCvs.width, h = pCvs.height;
    pCtx.clearRect(0, 0, w, h);
    pCtx.fillStyle = '#fff'; pCtx.fillRect(0, 0, w, h);

    if (dataPts.length < 2) {
        document.getElementById('parabolaHint').style.display = '';
        return;
    }
    document.getElementById('parabolaHint').style.display = 'none';

    var aStar = optimalA();
    var aMax = Math.max(aStar * 2.2, Math.abs(curA) * 1.5, 5);
    var aMin = Math.min(-aMax * 0.3, curA - (aMax - curA) * 0.3, 0);
    var mseAtZero = mse(0);
    var yMax = Math.max(mseAtZero * 1.1, mse(curA) * 1.5, 1);
    var yMin = 0;
    var plotW = w - PM.left - PM.right, plotH = h - PM.top - PM.bottom;

    function tp(a, m) {
        return {
            px: PM.left + (a - aMin) / (aMax - aMin) * plotW,
            py: PM.top + (1 - (m - yMin) / (yMax - yMin)) * plotH
        };
    }

    /* 격자 */
    var aTicks = niceTicks(aMin, aMax, 5), mTicks = niceTicks(yMin, yMax, 4);
    pCtx.strokeStyle = '#e2e8f0'; pCtx.lineWidth = 1;
    aTicks.forEach(function(v) {
        var p = tp(v, 0);
        pCtx.beginPath(); pCtx.moveTo(p.px, PM.top); pCtx.lineTo(p.px, h - PM.bottom); pCtx.stroke();
        pCtx.fillStyle = '#4a5568'; pCtx.font = 'bold 13px sans-serif'; pCtx.textAlign = 'center';
        pCtx.fillText(v.toFixed(1), p.px, h - PM.bottom + 16);
    });
    mTicks.forEach(function(v) {
        var p = tp(0, v);
        pCtx.beginPath(); pCtx.moveTo(PM.left, p.py); pCtx.lineTo(w - PM.right, p.py); pCtx.stroke();
        pCtx.fillStyle = '#4a5568'; pCtx.font = 'bold 13px sans-serif'; pCtx.textAlign = 'right';
        pCtx.fillText(v.toFixed(2), PM.left - 8, p.py + 4);
    });

    /* 축 레이블 */
    pCtx.fillStyle = '#718096'; pCtx.font = '14px sans-serif'; pCtx.textAlign = 'center';
    pCtx.fillText('기울기 a', w / 2, h - 10);
    pCtx.save(); pCtx.translate(16, h / 2); pCtx.rotate(-Math.PI / 2);
    pCtx.fillText('MSE(a)', 0, 0); pCtx.restore();

    /* 포물선 */
    pCtx.beginPath();
    for (var i = 0; i <= 200; i++) {
        var a = aMin + (aMax - aMin) * i / 200;
        var p = tp(a, mse(a));
        if (i === 0) pCtx.moveTo(p.px, p.py); else pCtx.lineTo(p.px, p.py);
    }
    pCtx.strokeStyle = '#6c5ce7'; pCtx.lineWidth = 2.5; pCtx.stroke();

    /* 최솟값 ★ */
    var starP = tp(aStar, mse(aStar));
    pCtx.font = '18px sans-serif'; pCtx.fillStyle = '#f6ad55'; pCtx.textAlign = 'center';
    pCtx.fillText('★', starP.px, starP.py - 4);
    pCtx.setLineDash([4, 4]); pCtx.strokeStyle = '#f6ad55'; pCtx.lineWidth = 1;
    pCtx.beginPath(); pCtx.moveTo(starP.px, starP.py); pCtx.lineTo(starP.px, h - PM.bottom); pCtx.stroke();
    pCtx.setLineDash([]);
    pCtx.fillStyle = '#fff'; pCtx.fillRect(starP.px - 24, h - PM.bottom + 2, 48, 18);
    pCtx.fillStyle = '#f6ad55'; pCtx.font = 'bold 12px sans-serif'; pCtx.textAlign = 'center';
    pCtx.fillText('a*=' + aStar.toFixed(2), starP.px, h - PM.bottom + 15);

    /* 현재 a에서의 점 */
    var curM = mse(curA);
    var cp = tp(curA, curM);

    /* 접선 그리기 */
    var g = gradient(curA);
    /* 접선: y - curM = g*(a - curA) → 범위 내 클리핑 */
    var tangentA1 = aMin, tangentA2 = aMax;
    var tangentM1 = curM + g * (tangentA1 - curA);
    var tangentM2 = curM + g * (tangentA2 - curA);
    var tp1 = tp(tangentA1, tangentM1), tp2 = tp(tangentA2, tangentM2);
    pCtx.beginPath();
    pCtx.moveTo(tp1.px, tp1.py); pCtx.lineTo(tp2.px, tp2.py);
    pCtx.strokeStyle = '#e53e3e'; pCtx.lineWidth = 1.5; pCtx.setLineDash([6, 3]); pCtx.stroke();
    pCtx.setLineDash([]);

    /* 업데이트 방향 화살표 */
    if (gdStarted && history.length > 0) {
        var newA = curA; /* curA는 이미 다음 단계로 이동됨 */
        var last = history[history.length - 1];
        var prevP = tp(last.a, last.mse);
        var nextP = tp(newA, mse(newA));
        /* 화살표 (prevA → curA) */
        pCtx.beginPath();
        pCtx.moveTo(prevP.px, prevP.py); pCtx.lineTo(nextP.px, nextP.py);
        pCtx.strokeStyle = '#e53e3e'; pCtx.lineWidth = 2; pCtx.stroke();
        /* 화살촉 */
        var angle = Math.atan2(nextP.py - prevP.py, nextP.px - prevP.px);
        pCtx.beginPath();
        pCtx.moveTo(nextP.px, nextP.py);
        pCtx.lineTo(nextP.px - 10 * Math.cos(angle - 0.4), nextP.py - 10 * Math.sin(angle - 0.4));
        pCtx.lineTo(nextP.px - 10 * Math.cos(angle + 0.4), nextP.py - 10 * Math.sin(angle + 0.4));
        pCtx.closePath(); pCtx.fillStyle = '#e53e3e'; pCtx.fill();
    }

    /* 현재 점 (빨간 원) */
    pCtx.beginPath(); pCtx.arc(cp.px, cp.py, 7, 0, 2 * Math.PI);
    pCtx.fillStyle = '#e53e3e'; pCtx.fill();
    pCtx.strokeStyle = '#fff'; pCtx.lineWidth = 2; pCtx.stroke();

    /* 접선 기울기 레이블 */
    pCtx.fillStyle = '#e53e3e'; pCtx.font = 'bold 12px sans-serif'; pCtx.textAlign = 'left';
    var labelText = '기울기=' + g.toFixed(3);
    var lx = Math.min(cp.px + 10, w - PM.right - pCtx.measureText(labelText).width - 4);
    var ly = Math.max(cp.py - 10, PM.top + 14);
    pCtx.fillText(labelText, lx, ly);
}

/* ===== 포물선 클릭 → a 위치 이동 ===== */
pCvs.addEventListener('click', function(e) {
    if (dataPts.length < 2) return;
    var rect = pCvs.getBoundingClientRect();
    var cx = e.clientX - rect.left;
    var w = pCvs.width;
    var aStar = optimalA();
    var aMax = Math.max(aStar * 2.2, Math.abs(curA) * 1.5, 5);
    var aMin = Math.min(-aMax * 0.3, 0);
    var plotW = w - PM.left - PM.right;
    var clicked = aMin + (cx - PM.left) / plotW * (aMax - aMin);
    clicked = Math.max(aMin, Math.min(aMax, clicked));
    curA = Math.round(clicked * 100) / 100;
    /* 클릭으로 이동 시 기록에 추가 */
    gdStarted = false; /* 이동만, 단계 기록은 리셋하지 않음 */
    drawParabola();
    drawLeft();
    /* stepFormula 업데이트 (다음 단계 미리보기) */
    updateStepPreview();
});

function updateStepPreview() {
    if (dataPts.length < 2) return;
    var g = gradient(curA);
    var m = mse(curA);
    document.getElementById('statA').textContent = curA.toFixed(4);
    document.getElementById('statMse').textContent = m.toFixed(4);
    document.getElementById('statGrad').textContent = g.toFixed(4);
    var newA = curA - gdAlpha * g;
    document.getElementById('stepFormula').textContent =
        newA.toFixed(3) + ' = ' + curA.toFixed(3) + ' − ' + gdAlpha.toFixed(2) + ' × ' + g.toFixed(3);
}

/* ===== 좌측 산점도 ===== */
var lCvs = document.getElementById('leftCvs');
var lCtx = lCvs.getContext('2d');
var LPAD = { top: 22, right: 16, bottom: 42, left: 52 };

function resizeLeft() {
    lCvs.width = lCvs.offsetWidth;
    lCvs.height = lCvs.offsetHeight;
    drawLeft();
}

function drawLeft() {
    var w = lCvs.width, h = lCvs.height;
    lCtx.clearRect(0, 0, w, h);
    lCtx.fillStyle = '#fff'; lCtx.fillRect(0, 0, w, h);

    var plotW = w - LPAD.left - LPAD.right, plotH = h - LPAD.top - LPAD.bottom;
    function lCX(v) { return LPAD.left + (v / 20) * plotW; }
    function lCY(v) { return LPAD.top + (1 - v / 20) * plotH; }

    /* 격자 */
    lCtx.strokeStyle = '#e2e8f0'; lCtx.lineWidth = 1;
    [0, 5, 10, 15, 20].forEach(function(v) {
        lCtx.beginPath(); lCtx.moveTo(lCX(v), LPAD.top); lCtx.lineTo(lCX(v), h - LPAD.bottom); lCtx.stroke();
        lCtx.beginPath(); lCtx.moveTo(LPAD.left, lCY(v)); lCtx.lineTo(w - LPAD.right, lCY(v)); lCtx.stroke();
        var fs = Math.max(11, w * 0.032);
        lCtx.fillStyle = '#4a5568'; lCtx.font = 'bold ' + fs + 'px sans-serif';
        lCtx.textAlign = 'center'; lCtx.fillText(v, lCX(v), h - LPAD.bottom + 14);
        lCtx.textAlign = 'right';  lCtx.fillText(v, LPAD.left - 4, lCY(v) + 4);
    });

    /* 추세선 y=curA*x */
    if (dataPts.length > 0) {
        var xEnd = curA > 0 ? Math.min(20 / curA, 20) : 20;
        lCtx.beginPath();
        lCtx.moveTo(lCX(0), lCY(0));
        lCtx.lineTo(lCX(xEnd), lCY(Math.min(curA * xEnd, 20)));
        lCtx.strokeStyle = '#e53e3e'; lCtx.lineWidth = 2; lCtx.stroke();
    }

    /* 데이터 점 */
    dataPts.forEach(function(p) {
        lCtx.beginPath(); lCtx.arc(lCX(p.x), lCY(p.y), 4, 0, 2 * Math.PI);
        lCtx.fillStyle = '#2d3748'; lCtx.fill();
    });
}

/* ===== 데이터 테이블 ===== */
function buildTable() {
    var tbody = document.getElementById('tbody');
    tbody.innerHTML = '';
    tableData.forEach(function(row, i) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td class="rn">' + (i + 1) + '</td>'
            + '<td class="ci"><input type="number" step="0.1" data-r="' + i + '" data-c="x" value="' + row.x + '"></td>'
            + '<td class="ci"><input type="number" step="0.1" data-r="' + i + '" data-c="y" value="' + row.y + '"></td>';
        if (row.x !== '') tr.querySelector('[data-c=x]').classList.add('has-val');
        if (row.y !== '') tr.querySelector('[data-c=y]').classList.add('has-val');
        tbody.appendChild(tr);
    });
    tbody.addEventListener('change', function(e) {
        var inp = e.target;
        if (!inp.dataset.r) return;
        var r = +inp.dataset.r, col = inp.dataset.c;
        tableData[r][col] = inp.value;
        inp.classList.toggle('has-val', inp.value !== '');
        onDataChange();
    });
}

function onDataChange() {
    dataPts = tableData
        .filter(function(r) { return r.x !== '' && r.y !== '' && !isNaN(+r.x) && !isNaN(+r.y); })
        .map(function(r) { return { x: +r.x, y: +r.y }; });
    gdReset();
}

/* ===== 샘플 생성 & 초기화 ===== */
function generateSample() {
    var slope = 0.5 + Math.random() * 2.0;
    var result = [];
    for (var i = 0; i < 8; i++) {
        var x = Math.round((2 + Math.random() * 14) * 10) / 10;
        var noise = (Math.random() - 0.5) * slope * x * 0.5;
        var y = Math.round(Math.min(20, Math.max(0.1, slope * x + noise)) * 10) / 10;
        result.push({ x: x, y: y });
    }
    return result;
}

function loadSampleData() {
    var samples = generateSample();
    tableData = Array.from({ length: 10 }, function() { return { x: '', y: '' }; });
    rowCount = 10;
    buildTable();
    samples.forEach(function(pt, i) {
        tableData[i] = { x: String(pt.x), y: String(pt.y) };
        var xEl = document.querySelector('input[data-r="' + i + '"][data-c="x"]');
        var yEl = document.querySelector('input[data-r="' + i + '"][data-c="y"]');
        if (xEl) { xEl.value = pt.x; xEl.classList.add('has-val'); }
        if (yEl) { yEl.value = pt.y; yEl.classList.add('has-val'); }
    });
    onDataChange();
}

function resetData() {
    tableData = Array.from({ length: 10 }, function() { return { x: '', y: '' }; });
    rowCount = 10;
    buildTable();
    onDataChange();
}

/* ===== 이벤트 연결 ===== */
document.getElementById('a0Input').addEventListener('input', function() {
    var v = parseFloat(this.value);
    if (!isNaN(v)) { gdA0 = v; gdReset(); }
});
document.getElementById('alphaSlider').addEventListener('input', function() {
    gdAlpha = +this.value;
    document.getElementById('alphaDisplay').textContent = gdAlpha.toFixed(2);
    gdReset();
});
document.getElementById('btnStep').addEventListener('click', gdStep);
document.getElementById('btnStepReset').addEventListener('click', gdReset);
document.getElementById('btnSample').addEventListener('click', loadSampleData);
document.getElementById('btnReset').addEventListener('click', resetData);

window.addEventListener('resize', function() { resizeLeft(); resizeParabola(); });

/* ===== 초기화 ===== */
tableData = Array.from({ length: 10 }, function() { return { x: '', y: '' }; });
buildTable();
loadSampleData();
setTimeout(function() { resizeLeft(); resizeParabola(); }, 10);
