'use strict';

/* ===== 함수 정의 ===== */
var FUNCS = [
    {   /* 넓은 포물선 (a=0.2) — 전체 범위에 펼쳐짐 */
        latex:    'f(x) = 0.2x^2 - 0.6x + 2.25',
        vtxLatex: 'f(x) = \\dfrac{1}{5}\\left(x - \\dfrac{3}{2}\\right)^{2} + \\dfrac{9}{5}',
        a: 0.2, b: -0.6, c: 2.25, x0def: -8
    },
    {   /* 중간 포물선 (a=0.5) — 왼쪽 영역 */
        latex:    'f(x) = 0.5x^2 + 3.5x + 8',
        vtxLatex: 'f(x) = \\dfrac{1}{2}\\left(x + \\dfrac{7}{2}\\right)^{2} + \\dfrac{15}{8}',
        a: 0.5, b: 3.5, c: 8, x0def: 3.5
    },
    {   /* 좁은 포물선 (a=1.5) — 오른쪽 좁은 영역 */
        latex:    'f(x) = 1.5x^2 - 7x + 9',
        vtxLatex: 'f(x) = \\dfrac{3}{2}\\left(x - \\dfrac{7}{3}\\right)^{2} + \\dfrac{5}{6}',
        a: 1.5, b: -7, c: 9, x0def: -1.5
    }
];

/* ===== 고정 좌표 범위 (모든 함수 공통) ===== */
var RANGE   = { xMin: -10, xMax: 10, yMin: 0, yMax: 30 };
var X_TICKS = [-10,-5,0,5,10];
var Y_TICKS = [0,10,20,30];

var funcIdx  = 0;
var showVtx  = false;
var clickX   = null;   /* 클릭한 x 좌표 (null = 없음) */

/* ===== 경사하강법 상태 ===== */
var gdHistory  = [];   /* [{step, x, fx, grad}] */
var gdCurStep  = 0;    /* histiry에서 현재 표시 중인 인덱스 */
var playing    = false;
var playTimer  = null;

/* ===== 수학 함수 ===== */
function f(x)  { var fn = FUNCS[funcIdx]; return fn.a*x*x + fn.b*x + fn.c; }
function df(x) { var fn = FUNCS[funcIdx]; return 2*fn.a*x + fn.b; }

function computeHistory(x0, alpha, n) {
    var hist = [];
    var x = x0;
    for (var i = 0; i <= n; i++) {
        var grad = df(x);
        hist.push({ step: i, x: x, fx: f(x), grad: grad });
        if (Math.abs(grad) < 0.0001) break;           /* 종료조건 */
        x = x - alpha * grad;
        if (!isFinite(x) || Math.abs(x) > 1e6) break; /* 발산 방지 */
    }
    return hist;
}

/* ===== 캔버스 ===== */
var graphWrap = document.getElementById('graphWrap');
var graphCvs  = document.getElementById('graphCvs');
var gCtx      = graphCvs.getContext('2d');
var PAD       = { top: 32, right: 32, bottom: 52, left: 58 };
var _range    = null;

function computeRange() { return RANGE; }

/* x:y 비율 동일한 좌표 변환 */
function getPlot(r) {
    var cw = graphCvs.width  - PAD.left - PAD.right;
    var ch = graphCvs.height - PAD.top  - PAD.bottom;
    var ppu = Math.min(cw / (r.xMax - r.xMin), ch / (r.yMax - r.yMin));
    var dw  = ppu * (r.xMax - r.xMin);
    var dh  = ppu * (r.yMax - r.yMin);
    return { x0: PAD.left + (cw - dw) / 2, y0: PAD.top + (ch - dh) / 2, w: dw, h: dh, ppu: ppu };
}

function tp(x, y, r) {
    var pl = getPlot(r);
    return { px: pl.x0 + (x - r.xMin) * pl.ppu, py: pl.y0 + (r.yMax - y) * pl.ppu };
}

function pxToX(px, r) {
    var pl = getPlot(r);
    return r.xMin + (px - pl.x0) / pl.ppu;
}

function drawGrid(r) {
    var pl = getPlot(r);

    /* 격자선 */
    gCtx.strokeStyle = '#e2e8f0'; gCtx.lineWidth = 1;
    X_TICKS.forEach(function(v) {
        var px = pl.x0 + (v - r.xMin) * pl.ppu;
        gCtx.beginPath(); gCtx.moveTo(px, pl.y0); gCtx.lineTo(px, pl.y0 + pl.h); gCtx.stroke();
        gCtx.fillStyle = '#4a5568'; gCtx.font = 'bold 12px sans-serif'; gCtx.textAlign = 'center';
        gCtx.fillText(v, px, pl.y0 + pl.h + 17);
    });
    Y_TICKS.forEach(function(v) {
        var py = pl.y0 + (r.yMax - v) * pl.ppu;
        gCtx.beginPath(); gCtx.moveTo(pl.x0, py); gCtx.lineTo(pl.x0 + pl.w, py); gCtx.stroke();
        gCtx.fillStyle = '#4a5568'; gCtx.font = 'bold 12px sans-serif'; gCtx.textAlign = 'right';
        gCtx.fillText(v, pl.x0 - 6, py + 4);
    });

    /* x=0, y=0 축선 (강조) */
    var px0 = pl.x0 + (0 - r.xMin) * pl.ppu;
    var py0 = pl.y0 + r.yMax * pl.ppu;
    gCtx.strokeStyle = '#a0aec0'; gCtx.lineWidth = 1.5;
    gCtx.beginPath(); gCtx.moveTo(px0, pl.y0); gCtx.lineTo(px0, pl.y0 + pl.h); gCtx.stroke();
    gCtx.beginPath(); gCtx.moveTo(pl.x0, py0); gCtx.lineTo(pl.x0 + pl.w, py0); gCtx.stroke();

    /* 축 레이블 */
    gCtx.fillStyle = '#a0aec0'; gCtx.font = '13px sans-serif';
    gCtx.textAlign = 'center';
    gCtx.fillText('x', pl.x0 + pl.w + 16, py0);
    gCtx.save(); gCtx.translate(14, pl.y0 + pl.h / 2); gCtx.rotate(-Math.PI / 2);
    gCtx.fillText('f (x)', 0, 0); gCtx.restore();
}

function drawTangent(x, r) {
    var fn  = FUNCS[funcIdx];
    var slope = df(x);
    var span  = (fn.xMax - fn.xMin) * 0.32;
    var x1 = x - span, x2 = x + span;
    var p1 = tp(x1, f(x) + slope * (x1 - x), r);
    var p2 = tp(x2, f(x) + slope * (x2 - x), r);
    gCtx.beginPath(); gCtx.setLineDash([5, 4]);
    gCtx.strokeStyle = '#e53e3e'; gCtx.lineWidth = 1.5;
    gCtx.moveTo(p1.px, p1.py); gCtx.lineTo(p2.px, p2.py); gCtx.stroke();
    gCtx.setLineDash([]);
}

function drawArrow(x1, y1, x2, y2) {
    var angle = Math.atan2(y2 - y1, x2 - x1);
    gCtx.beginPath(); gCtx.moveTo(x1, y1); gCtx.lineTo(x2, y2);
    gCtx.strokeStyle = '#e53e3e'; gCtx.lineWidth = 1.5; gCtx.stroke();
    gCtx.beginPath();
    gCtx.moveTo(x2, y2);
    gCtx.lineTo(x2 - 9 * Math.cos(angle - 0.4), y2 - 9 * Math.sin(angle - 0.4));
    gCtx.lineTo(x2 - 9 * Math.cos(angle + 0.4), y2 - 9 * Math.sin(angle + 0.4));
    gCtx.closePath(); gCtx.fillStyle = '#e53e3e'; gCtx.fill();
}

function drawGraph() {
    var w = graphCvs.width, h = graphCvs.height;
    gCtx.clearRect(0, 0, w, h);
    gCtx.fillStyle = '#fafbfc'; gCtx.fillRect(0, 0, w, h);

    var r = computeRange();
    _range = r;

    drawGrid(r);

    /* 플롯 영역 클리핑 */
    var pl = getPlot(r);
    gCtx.save();
    gCtx.beginPath(); gCtx.rect(pl.x0, pl.y0, pl.w, pl.h); gCtx.clip();

    /* 포물선 */
    var fn = FUNCS[funcIdx];
    gCtx.beginPath();
    for (var i = 0; i <= 600; i++) {
        var x = r.xMin + (r.xMax - r.xMin) * i / 600;
        var p = tp(x, f(x), r);
        if (i === 0) gCtx.moveTo(p.px, p.py); else gCtx.lineTo(p.px, p.py);
    }
    gCtx.strokeStyle = '#6c5ce7'; gCtx.lineWidth = 2.5; gCtx.stroke();

    /* 꼭짓점 ★ */
    var vx = -fn.b / (2 * fn.a);
    var vy = f(vx);
    if (vx >= r.xMin && vx <= r.xMax && vy >= r.yMin && vy <= r.yMax) {
        var vp = tp(vx, vy, r);
        gCtx.font = '15px sans-serif'; gCtx.fillStyle = '#f6ad55'; gCtx.textAlign = 'center';
        gCtx.fillText('★', vp.px, vp.py - 3);
    }

    /* 클릭 점 (GD 없을 때만) */
    if (clickX !== null && gdHistory.length === 0) {
        drawTangent(clickX, r);
        var cp = tp(clickX, f(clickX), r);
        gCtx.beginPath(); gCtx.arc(cp.px, cp.py, 5.5, 0, 2 * Math.PI);
        gCtx.fillStyle = '#e53e3e'; gCtx.fill();
        gCtx.strokeStyle = '#fff'; gCtx.lineWidth = 1.5; gCtx.stroke();

        var slopeVal = df(clickX);
        var slopeText = '접선의 기울기 = ' + (slopeVal >= 0 ? '+' : '') + slopeVal.toFixed(3);
        gCtx.fillStyle = '#e53e3e'; gCtx.font = 'bold 12px sans-serif';
        var lx = Math.min(cp.px + 10, w - PAD.right - gCtx.measureText(slopeText).width - 4);
        var ly = Math.max(cp.py - 10, PAD.top + 14);
        gCtx.textAlign = 'left'; gCtx.fillText(slopeText, lx, ly);
    }

    /* GD 경로 점들 */
    var displayCount = Math.min(gdCurStep + 1, gdHistory.length);
    for (var j = 0; j < displayCount; j++) {
        var hj = gdHistory[j];
        var isCur = (j === displayCount - 1);
        var pj = tp(hj.x, hj.fx, r);

        /* x축까지 수직 점선 */
        var yBase = Math.max(r.yMin, 0);
        var pBase = tp(hj.x, yBase, r);
        gCtx.beginPath(); gCtx.setLineDash([3, 3]);
        gCtx.strokeStyle = isCur ? 'rgba(229,62,62,0.45)' : 'rgba(144,205,244,0.55)';
        gCtx.lineWidth = 1;
        gCtx.moveTo(pj.px, pj.py); gCtx.lineTo(pj.px, pBase.py); gCtx.stroke();
        gCtx.setLineDash([]);

        /* 이전→현재 화살표 */
        if (j > 0 && isCur) {
            var prev = gdHistory[j - 1];
            var pp   = tp(prev.x, prev.fx, r);
            drawArrow(pp.px, pp.py, pj.px, pj.py);
        }

        /* 점 */
        gCtx.beginPath(); gCtx.arc(pj.px, pj.py, isCur ? 6 : 3.5, 0, 2 * Math.PI);
        gCtx.fillStyle = isCur ? '#e53e3e' : '#90cdf4'; gCtx.fill();
        if (isCur) { gCtx.strokeStyle = '#fff'; gCtx.lineWidth = 1.5; gCtx.stroke(); }
    }

    /* 현재 GD 점 접선 */
    if (gdHistory.length > 0 && gdCurStep < gdHistory.length) {
        drawTangent(gdHistory[gdCurStep].x, r);
    }

    gCtx.restore(); /* 클리핑 해제 */
}

/* ===== 리사이즈 ===== */
function resize() {
    graphCvs.width  = graphWrap.clientWidth;
    graphCvs.height = graphWrap.clientHeight;
    drawGraph();
}
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(graphWrap);

/* ===== 캔버스 클릭 ===== */
graphCvs.addEventListener('click', function(e) {
    if (gdHistory.length > 0) return; /* GD 중에는 무시 */
    var rect = graphCvs.getBoundingClientRect();
    var px   = (e.clientX - rect.left) * graphCvs.width / rect.width;
    if (!_range) return;
    var x  = pxToX(px, _range);
    x = Math.max(_range.xMin + 0.01, Math.min(_range.xMax - 0.01, x));
    clickX = x;
    document.getElementById('x0Input').value = x.toFixed(3);
    showPointInfo(x);
    drawGraph();
});

function showPointInfo(x) {
    document.getElementById('piHint').style.display = 'none';
    document.getElementById('piRows').style.display = '';
    var grad = df(x);
    document.getElementById('piX').textContent   = x.toFixed(3);
    document.getElementById('piFx').textContent  = f(x).toFixed(3);
    var gradEl = document.getElementById('piGrad');
    gradEl.textContent = (grad >= 0 ? '+' : '') + grad.toFixed(3);
    gradEl.className = 'pi-val ' + (grad > 0 ? 'pi-grad-pos' : grad < 0 ? 'pi-grad-neg' : '');
}

/* ===== 함수 전환 ===== */
document.querySelectorAll('.func-btn[data-idx]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        funcIdx = +this.dataset.idx;
        showVtx = false;
        gdHistory = []; gdCurStep = 0;
        document.querySelectorAll('.func-btn[data-idx]').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        var btnVtx = document.getElementById('btnVertex');
        btnVtx.textContent = '표준형'; btnVtx.classList.remove('on');
        var x0 = FUNCS[funcIdx].x0def;
        document.getElementById('x0Input').value = x0.toFixed(1);
        clickX = x0;
        updateFuncFormula();
        resetRightPanel();
        showPointInfo(x0);
        resize();
    });
});

/* ===== 오른쪽 패널 토글 ===== */
var rightPanel = document.getElementById('rightPanel');
document.getElementById('btnToggleRight').addEventListener('click', function() {
    var isHidden = rightPanel.classList.toggle('hidden');
    this.textContent = isHidden ? '경사하강법 ▶' : '◀ 경사하강법';
    this.classList.toggle('open', !isHidden);
});

document.getElementById('btnVertex').addEventListener('click', function() {
    showVtx = !showVtx;
    this.textContent = showVtx ? '표준형 ▲' : '표준형';
    this.classList.toggle('on', showVtx);
    document.getElementById('formulaVertex').style.visibility = showVtx ? 'visible' : 'hidden';
});

function updateFuncFormula() {
    var fn = FUNCS[funcIdx];
    document.getElementById('formulaStd').innerHTML =
        katex.renderToString(fn.latex, { throwOnError: false, displayMode: true });
    document.getElementById('formulaVertex').innerHTML =
        katex.renderToString(fn.vtxLatex, { throwOnError: false, displayMode: true });
    document.getElementById('formulaVertex').style.visibility = 'hidden';
}

/* ===== 컨트롤 이벤트 ===== */
var alphaSlider  = document.getElementById('alphaSlider');
var alphaDisplay = document.getElementById('alphaDisplay');
var nSlider      = document.getElementById('nSlider');
var nDisplay     = document.getElementById('nDisplay');
var x0Input      = document.getElementById('x0Input');
var stepSlider   = document.getElementById('stepSlider');
var stepDisplay  = document.getElementById('stepDisplay');
var speedSlider  = document.getElementById('speedSlider');

alphaSlider.addEventListener('input', function() {
    alphaDisplay.textContent = (+this.value).toFixed(3);
    recompute();
});
nSlider.addEventListener('input', function() {
    nDisplay.textContent = this.value;
    recompute();
});
x0Input.addEventListener('change', function() {
    var x = parseFloat(this.value);
    if (!isNaN(x)) { clickX = x; showPointInfo(x); recompute(); }
});

function recompute() {
    if (gdHistory.length === 0) return; /* 아직 시작 전이면 무시 */
    stopPlay();
    var x0    = parseFloat(x0Input.value) || FUNCS[funcIdx].x0def;
    var alpha = +alphaSlider.value;
    var n     = +nSlider.value;
    gdHistory  = computeHistory(x0, alpha, n);
    gdCurStep  = Math.min(gdCurStep, gdHistory.length - 1);
    stepSlider.max   = gdHistory.length - 1;
    stepSlider.value = gdCurStep;
    stepDisplay.textContent = gdCurStep;
    updateRightPanel();
    drawGraph();
}

function initGD() {
    var x0    = parseFloat(x0Input.value) || FUNCS[funcIdx].x0def;
    var alpha = +alphaSlider.value;
    var n     = +nSlider.value;
    gdHistory  = computeHistory(x0, alpha, n);
    gdCurStep  = 0;
    stepSlider.max   = gdHistory.length - 1;
    stepSlider.value = 0;
    stepDisplay.textContent = 0;
    clickX = null;
    resetPointInfo();
}

document.getElementById('btnPlay').addEventListener('click', function() {
    if (gdHistory.length === 0) initGD();
    else if (gdCurStep >= gdHistory.length - 1) { gdCurStep = 0; stepSlider.value = 0; }
    stopPlay();
    startPlay();
    updateRightPanel(); drawGraph();
});

document.getElementById('btnStep').addEventListener('click', function() {
    stopPlay();
    if (gdHistory.length === 0) { initGD(); }
    else if (gdCurStep < gdHistory.length - 1) {
        gdCurStep++;
        stepSlider.value = gdCurStep;
        stepDisplay.textContent = gdCurStep;
    }
    updateRightPanel(); drawGraph();
});

document.getElementById('btnReset').addEventListener('click', function() {
    stopPlay();
    gdHistory = []; gdCurStep = 0;
    stepSlider.max = 0; stepSlider.value = 0; stepDisplay.textContent = 0;
    clickX = null;
    resetRightPanel(); resetPointInfo(); drawGraph();
});

stepSlider.addEventListener('input', function() {
    if (gdHistory.length === 0) return;
    stopPlay();
    gdCurStep = +this.value;
    stepDisplay.textContent = gdCurStep;
    updateRightPanel(); drawGraph();
});

var SPEEDS = [600, 380, 200, 100, 50];

function startPlay() {
    if (playing) return;
    playing = true;
    (function tick() {
        if (!playing) return;
        if (gdCurStep >= gdHistory.length - 1) { playing = false; return; }
        gdCurStep++;
        stepSlider.value = gdCurStep;
        stepDisplay.textContent = gdCurStep;
        updateRightPanel(); drawGraph();
        if (gdCurStep < gdHistory.length - 1)
            playTimer = setTimeout(tick, SPEEDS[(+speedSlider.value) - 1] || 200);
        else
            playing = false;
    })();
}

function stopPlay() {
    playing = false;
    clearTimeout(playTimer); playTimer = null;
}

/* ===== 오른쪽 패널 업데이트 ===== */
function updateRightPanel() {
    if (gdHistory.length === 0 || gdCurStep >= gdHistory.length) { resetRightPanel(); return; }
    var h = gdHistory[gdCurStep];
    document.getElementById('statStep').textContent = h.step;
    document.getElementById('statX').textContent    = h.x.toFixed(4);
    document.getElementById('statFx').textContent   = h.fx.toFixed(4);
    document.getElementById('statGrad').textContent = h.grad.toFixed(4);

    if (gdCurStep < gdHistory.length - 1) {
        var alpha = +alphaSlider.value;
        var next  = gdHistory[gdCurStep + 1];
        document.getElementById('formulaVals').textContent =
            next.x.toFixed(4) + ' = ' + h.x.toFixed(4)
            + ' − ' + alpha.toFixed(3) + ' × (' + h.grad.toFixed(4) + ')';
    } else {
        document.getElementById('formulaVals').textContent = '(마지막 단계)';
    }

    /* 종료조건 박스: 감춤 */
    document.getElementById('stopBox').style.display = 'none';

    /* 기록 테이블 */
    var tbody = document.getElementById('histTbody');
    tbody.innerHTML = '';
    gdHistory.slice(0, gdCurStep + 1).forEach(function(entry, i) {
        var tr = document.createElement('tr');
        if (i === gdCurStep) tr.className = 'current-row';
        tr.innerHTML = '<td>' + entry.step + '</td>'
            + '<td>' + entry.x.toFixed(3) + '</td>'
            + '<td>' + entry.fx.toFixed(3) + '</td>'
            + '<td>' + entry.grad.toFixed(3) + '</td>';
        tbody.appendChild(tr);
    });
    var hw = document.querySelector('.hist-wrap');
    if (hw) hw.scrollTop = hw.scrollHeight;
}

function resetRightPanel() {
    ['statStep', 'statX', 'statFx', 'statGrad'].forEach(function(id) {
        document.getElementById(id).textContent = '—';
    });
    document.getElementById('formulaVals').textContent = '—';
    document.getElementById('stopBox').style.display = 'none';
    document.getElementById('histTbody').innerHTML = '';
}

function resetPointInfo() {
    document.getElementById('piHint').style.display = '';
    document.getElementById('piRows').style.display = 'none';
}

/* ===== 초기화 ===== */
(function init() {
    updateFuncFormula();
    alphaDisplay.textContent = (+alphaSlider.value).toFixed(3);
    nDisplay.textContent     = nSlider.value;
    /* 초기 클릭 점: 함수①의 기본 x₀ */
    clickX = FUNCS[0].x0def;
    document.getElementById('x0Input').value = clickX.toFixed(1);
    resize(); /* resize → drawGraph 내부에서 showPointInfo 호출 안 되므로 별도 호출 */
    showPointInfo(clickX);
}());
