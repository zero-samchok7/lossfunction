'use strict';

/* ═══════════════════════════════
   STATE
═══════════════════════════════ */
const MAX_ROWS = 20;
let rowCount = 10;
let tableData = Array.from({length: rowCount}, () => ({x: '', y: ''}));
let dataPts = [];
let corrPts = [];
let xbar = 0, ybar = 0;
let viewMode = 'original'; // 'original' | 'corrected'

// GD state
let gdA0 = 0;
let gdAlpha = 0.10;
let gdN = 10;
let gdHistory = []; // [{a, mse, grad}]
let gdCurrentStep = 0;
let gdRunning = false;
let gdTimer = null;

/* ═══════════════════════════════
   MATH
═══════════════════════════════ */
function calcCentroid(pts) {
    const n = pts.length;
    return {
        x: pts.reduce((s, p) => s + p.x, 0) / n,
        y: pts.reduce((s, p) => s + p.y, 0) / n
    };
}

function correctData(pts, cx, cy) {
    return pts.map(p => ({x: p.x - cx, y: p.y - cy}));
}

function mse(a, pts) {
    if (!pts.length) return NaN;
    return pts.reduce((s, p) => s + (p.y - a * p.x) ** 2, 0) / pts.length;
}

function gradient(a, pts) {
    if (!pts.length) return 0;
    return (-2 / pts.length) * pts.reduce((s, p) => s + p.x * (p.y - a * p.x), 0);
}

function optimalA(pts) {
    const sx2 = pts.reduce((s, p) => s + p.x * p.x, 0);
    if (Math.abs(sx2) < 1e-12) return 0;
    return pts.reduce((s, p) => s + p.x * p.y, 0) / sx2;
}

function niceStep(raw) {
    if (raw <= 0) return 1;
    const e = Math.floor(Math.log10(raw));
    const f = raw / 10 ** e;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * 10 ** e;
}

function fmtN(n, d) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return n.toFixed(d !== undefined ? d : 3);
}

/* ═══════════════════════════════
   GRADIENT DESCENT ENGINE
═══════════════════════════════ */
function gdReset() {
    gdStop();
    gdHistory = [];
    gdCurrentStep = 0;
    if (corrPts.length >= 2) {
        gdHistory.push({a: gdA0, mse: mse(gdA0, corrPts), grad: gradient(gdA0, corrPts)});
        computeAllSteps();
    }
    updateGdControls();
    updateStepSlider();
    updateRight();
    redrawLeft();
    redrawMid();
}

function computeAllSteps() {
    let a = gdA0;
    for (let i = 0; i < gdN; i++) {
        const g = gradient(a, corrPts);
        if (Math.abs(g) < 0.001) break;
        a = a - gdAlpha * g;
        gdHistory.push({a, mse: mse(a, corrPts), grad: gradient(a, corrPts)});
    }
}

function gdGoToStep(step) {
    gdCurrentStep = Math.max(0, Math.min(step, gdHistory.length - 1));
    document.getElementById('stepSlider').value = gdCurrentStep;
    document.getElementById('stepDisplay').textContent = gdCurrentStep;
    updateRight();
    redrawLeft();
    redrawMid();
}

function gdStop() {
    gdRunning = false;
    clearInterval(gdTimer);
    gdTimer = null;
}

function gdPlay() {
    if (gdRunning || corrPts.length < 2 || gdHistory.length === 0) return;
    if (gdCurrentStep >= gdHistory.length - 1) gdCurrentStep = 0;
    gdRunning = true;
    updateGdControls();
    const speedMap = {1: 1000, 2: 700, 3: 450, 4: 250, 5: 120};
    const delay = speedMap[+document.getElementById('speedSlider').value] || 450;
    gdTimer = setInterval(() => {
        if (gdCurrentStep >= gdHistory.length - 1) {
            gdStop(); updateGdControls(); return;
        }
        gdGoToStep(gdCurrentStep + 1);
    }, delay);
}

function gdPause() { gdStop(); updateGdControls(); }

function updateGdControls() {
    const has = corrPts.length >= 2 && gdHistory.length > 0;
    document.getElementById('btnPlay').disabled    = !has || gdRunning;
    document.getElementById('btnPause').disabled   = !gdRunning;
    document.getElementById('btnGdReset').disabled = !has;
    updateStepSlider();
}

function updateStepSlider() {
    const slider = document.getElementById('stepSlider');
    const maxStep = Math.max(0, gdHistory.length - 1);
    slider.max = maxStep;
    slider.value = gdCurrentStep;
    slider.disabled = maxStep === 0;
    document.getElementById('stepDisplay').textContent = gdCurrentStep;
}

function updateRight() {
    if (gdHistory.length === 0 || corrPts.length < 2) {
        document.getElementById('formulaVals').textContent = '—';
        ['statStep','statA','statMse','statGrad'].forEach(id =>
            document.getElementById(id).textContent = '—');
        document.getElementById('convergeBox').style.display = 'none';
        document.getElementById('histTbody').innerHTML = '';
        return;
    }

    const cur  = gdHistory[gdCurrentStep];
    const prev = gdCurrentStep > 0 ? gdHistory[gdCurrentStep - 1] : null;

    // Formula
    const fv = document.getElementById('formulaVals');
    if (prev) {
        const newA = prev.a - gdAlpha * prev.grad;
        fv.innerHTML =
            `= ${fmtN(prev.a,4)} &minus; ${fmtN(gdAlpha,2)} &times; (${fmtN(prev.grad,4)})<br>= ${fmtN(newA,4)}`;
    } else {
        fv.textContent = `출발점: a₀ = ${fmtN(cur.a, 4)}`;
    }

    // Stats
    document.getElementById('statStep').textContent = gdCurrentStep;
    document.getElementById('statA').textContent    = fmtN(cur.a, 4);
    document.getElementById('statMse').textContent  = fmtN(cur.mse, 4);
    document.getElementById('statGrad').textContent = fmtN(cur.grad, 4);

    // Convergence
    document.getElementById('convergeBox').style.display =
        Math.abs(cur.grad) < 0.001 ? '' : 'none';

    // History table
    const tb = document.getElementById('histTbody');
    tb.innerHTML = '';
    for (let i = 0; i <= gdCurrentStep; i++) {
        const h = gdHistory[i];
        const tr = document.createElement('tr');
        if (i === gdCurrentStep) tr.className = 'current-row';
        tr.innerHTML = `<td>${i}</td><td>${fmtN(h.a,3)}</td><td>${fmtN(h.mse,3)}</td><td>${fmtN(h.grad,3)}</td>`;
        tb.appendChild(tr);
    }
    if (tb.lastChild) tb.lastChild.scrollIntoView({block: 'nearest'});
}

/* ═══════════════════════════════
   MIDDLE CANVAS
═══════════════════════════════ */
const midCvs = document.getElementById('midCvs');
const midCtx = midCvs.getContext('2d');
const MPAD = {top: 22, right: 18, bottom: 44, left: 56};
let MW = 0, MH = 0;
let midVP = {aMin: -3, aMax: 3, mseMin: 0, mseMax: 10, ta: 1, tm: 2};

function resizeMid() {
    const wrap = document.getElementById('midCanvasWrap');
    MW = midCvs.width  = wrap.clientWidth  - 4;
    MH = midCvs.height = wrap.clientHeight - 4;
    redrawMid();
}

function mPW() { return MW - MPAD.left - MPAD.right; }
function mPH() { return MH - MPAD.top  - MPAD.bottom; }
function mCX(a)   { return MPAD.left + (a   - midVP.aMin) / (midVP.aMax - midVP.aMin) * mPW(); }
function mCY(m)   { return MPAD.top  + (1 - (m - midVP.mseMin) / (midVP.mseMax - midVP.mseMin)) * mPH(); }
function mDatA(cx){ return midVP.aMin + (cx - MPAD.left) / mPW() * (midVP.aMax - midVP.aMin); }

function calcMidVP(aOpt, a0start, pts) {
    const spread = Math.max(Math.abs(aOpt - a0start) * 1.4, Math.abs(aOpt) * 0.8, 2.5);
    const aLo = aOpt - spread, aHi = aOpt + spread;
    let mseMax = 0;
    for (let i = 0; i <= 80; i++) {
        const a = aLo + (aHi - aLo) * i / 80;
        const m = mse(a, pts);
        if (!isNaN(m)) mseMax = Math.max(mseMax, m);
    }
    mseMax = (mseMax || 10) * 1.2;
    const ta = niceStep((aHi - aLo) / 5);
    const tm = niceStep(mseMax / 4);
    return {
        aMin: Math.floor(aLo / ta) * ta,
        aMax: Math.ceil(aHi / ta) * ta,
        mseMin: 0,
        mseMax: Math.ceil(mseMax / tm) * tm,
        ta, tm
    };
}

function redrawMid() {
    if (!MW || !MH) return;
    midCtx.clearRect(0, 0, MW, MH);
    const hint = document.getElementById('midHint');
    if (corrPts.length < 2) { hint.style.display = ''; return; }
    hint.style.display = 'none';

    const aOpt = optimalA(corrPts);
    const a0ref = gdHistory.length > 0 ? gdHistory[0].a : gdA0;
    midVP = calcMidVP(aOpt, a0ref, corrPts);

    // Grid
    midCtx.save(); midCtx.strokeStyle = '#edf2f7'; midCtx.lineWidth = 1;
    for (let a = Math.ceil(midVP.aMin / midVP.ta) * midVP.ta; a <= midVP.aMax + 1e-9; a += midVP.ta) {
        const cx = mCX(Math.round(a * 1e9) / 1e9);
        midCtx.beginPath(); midCtx.moveTo(cx, MPAD.top); midCtx.lineTo(cx, MH - MPAD.bottom); midCtx.stroke();
    }
    for (let m = 0; m <= midVP.mseMax + 1e-9; m += midVP.tm) {
        const cy = mCY(Math.round(m * 1e9) / 1e9);
        midCtx.beginPath(); midCtx.moveTo(MPAD.left, cy); midCtx.lineTo(MW - MPAD.right, cy); midCtx.stroke();
    }
    midCtx.restore();

    // Axes + labels
    midCtx.save(); midCtx.strokeStyle = '#cbd5e0'; midCtx.lineWidth = 1.5;
    midCtx.beginPath(); midCtx.moveTo(MPAD.left, mCY(0)); midCtx.lineTo(MW - MPAD.right, mCY(0)); midCtx.stroke();
    const axX = (midVP.aMin <= 0 && midVP.aMax >= 0) ? mCX(0) : MPAD.left;
    midCtx.beginPath(); midCtx.moveTo(axX, MPAD.top); midCtx.lineTo(axX, MH - MPAD.bottom); midCtx.stroke();
    const fs = Math.max(9, MW * 0.02);
    midCtx.font = `${fs}px sans-serif`; midCtx.fillStyle = '#a0aec0';
    midCtx.textAlign = 'center'; midCtx.textBaseline = 'top';
    for (let a = Math.ceil(midVP.aMin / midVP.ta) * midVP.ta; a <= midVP.aMax + 1e-9; a += midVP.ta)
        midCtx.fillText(Math.round(a * 1e9) / 1e9, mCX(Math.round(a * 1e9) / 1e9), MH - MPAD.bottom + 4);
    midCtx.textAlign = 'right'; midCtx.textBaseline = 'middle';
    for (let m = 0; m <= midVP.mseMax + 1e-9; m += midVP.tm)
        midCtx.fillText(Math.round(m * 1e9) / 1e9, MPAD.left - 4, mCY(Math.round(m * 1e9) / 1e9));
    midCtx.fillStyle = '#718096';
    midCtx.font = `bold ${fs}px sans-serif`;
    midCtx.textAlign = 'center'; midCtx.textBaseline = 'bottom';
    midCtx.fillText('기울기 a', MPAD.left + mPW() / 2, MH - 2);
    midCtx.save(); midCtx.translate(13, MPAD.top + mPH() / 2); midCtx.rotate(-Math.PI / 2);
    midCtx.fillText('MSE', 0, 0); midCtx.restore();
    midCtx.restore();

    // Parabola
    midCtx.save(); midCtx.strokeStyle = '#667eea'; midCtx.lineWidth = 2.5; midCtx.setLineDash([]);
    midCtx.beginPath();
    let started = false;
    for (let i = 0; i <= 300; i++) {
        const a = midVP.aMin + (midVP.aMax - midVP.aMin) * i / 300;
        const m = mse(a, corrPts);
        if (isNaN(m) || m > midVP.mseMax * 1.05) { started = false; continue; }
        const cx = mCX(a), cy = mCY(m);
        if (!started) { midCtx.moveTo(cx, cy); started = true; } else { midCtx.lineTo(cx, cy); }
    }
    midCtx.stroke(); midCtx.restore();

    // Minimum ★
    const mOpt = mse(aOpt, corrPts);
    if (mOpt <= midVP.mseMax) {
        midCtx.save();
        midCtx.fillStyle = '#e53e3e'; midCtx.font = `bold 15px sans-serif`;
        midCtx.textAlign = 'center'; midCtx.textBaseline = 'bottom';
        midCtx.fillText('★', mCX(aOpt), mCY(mOpt) - 2);
        midCtx.restore();
    }

    // Trail
    if (gdHistory.length > 1 && gdCurrentStep >= 1) {
        midCtx.save();
        for (let i = 1; i <= gdCurrentStep; i++) {
            const p = gdHistory[i - 1], q = gdHistory[i];
            if (p.mse > midVP.mseMax || q.mse > midVP.mseMax) continue;
            const alpha = 0.25 + 0.75 * (i / gdHistory.length);
            midCtx.strokeStyle = `rgba(43,108,176,${alpha.toFixed(2)})`;
            midCtx.lineWidth = 1.8; midCtx.setLineDash([3, 2]);
            midCtx.beginPath();
            midCtx.moveTo(mCX(p.a), mCY(p.mse));
            midCtx.lineTo(mCX(q.a), mCY(q.mse));
            midCtx.stroke();
        }
        midCtx.restore();
    }

    // Current point + tangent
    if (gdHistory.length > 0) {
        const cur = gdHistory[gdCurrentStep];
        if (cur.mse <= midVP.mseMax) {
            // Tangent
            const g = cur.grad;
            const dA = (midVP.aMax - midVP.aMin) * 0.12;
            const aL = cur.a - dA, aR = cur.a + dA;
            const mL = cur.mse + g * (aL - cur.a);
            const mR = cur.mse + g * (aR - cur.a);
            midCtx.save();
            midCtx.strokeStyle = '#c53030'; midCtx.lineWidth = 1.5; midCtx.setLineDash([5, 3]);
            midCtx.beginPath();
            midCtx.moveTo(mCX(aL), mCY(mL));
            midCtx.lineTo(mCX(aR), mCY(mR));
            midCtx.stroke();
            // Dot
            midCtx.setLineDash([]);
            midCtx.beginPath(); midCtx.arc(mCX(cur.a), mCY(cur.mse), 7, 0, Math.PI * 2);
            midCtx.fillStyle = '#2b6cb0'; midCtx.fill();
            midCtx.strokeStyle = '#fff'; midCtx.lineWidth = 2; midCtx.stroke();
            midCtx.restore();
        }
    }
}

midCvs.addEventListener('click', e => {
    if (corrPts.length < 2) return;
    const rect = midCvs.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (MW / rect.width);
    const cy = (e.clientY - rect.top)  * (MH / rect.height);
    if (cx < MPAD.left || cx > MW - MPAD.right || cy < MPAD.top || cy > MH - MPAD.bottom) return;
    gdA0 = Math.round(mDatA(cx) * 100) / 100;
    document.getElementById('a0Input').value = gdA0;
    gdReset();
});

/* ═══════════════════════════════
   LEFT CANVAS
═══════════════════════════════ */
const leftCvs = document.getElementById('leftCvs');
const leftCtx = leftCvs.getContext('2d');
const LPAD = {top: 18, right: 10, bottom: 36, left: 44};
let LW = 0, LH = 0;
let leftVP = {xMin: -5, xMax: 5, yMin: -5, yMax: 5, tx: 2, ty: 2};

function resizeLeft() {
    const wrap = document.getElementById('leftCanvasWrap');
    LW = leftCvs.width  = wrap.clientWidth;
    LH = leftCvs.height = wrap.clientHeight;
    redrawLeft();
}

function calcVP(pts) {
    if (pts.length < 2) return {xMin: -5, xMax: 5, yMin: -5, yMax: 5, tx: 2, ty: 2};
    let xl = Math.min(...pts.map(p => p.x)), xh = Math.max(...pts.map(p => p.x));
    let yl = Math.min(...pts.map(p => p.y)), yh = Math.max(...pts.map(p => p.y));
    const xs = xh - xl || Math.abs(xh) || 1;
    const ys = yh - yl || Math.abs(yh) || 1;
    xl -= xs * 0.3; xh += xs * 0.3; yl -= ys * 0.3; yh += ys * 0.3;
    const tx = niceStep((xh - xl) / 5), ty = niceStep((yh - yl) / 4);
    return {
        xMin: Math.floor(xl / tx) * tx, xMax: Math.ceil(xh / tx) * tx,
        yMin: Math.floor(yl / ty) * ty, yMax: Math.ceil(yh / ty) * ty, tx, ty
    };
}

function lPW() { return LW - LPAD.left - LPAD.right; }
function lPH() { return LH - LPAD.top  - LPAD.bottom; }
function lCX(x) { return LPAD.left + (x - leftVP.xMin) / (leftVP.xMax - leftVP.xMin) * lPW(); }
function lCY(y) { return LPAD.top  + (1 - (y - leftVP.yMin) / (leftVP.yMax - leftVP.yMin)) * lPH(); }

function redrawLeft() {
    if (!LW || !LH) return;
    const pts = viewMode === 'corrected' ? corrPts : dataPts;
    leftVP = calcVP(pts.length >= 2 ? pts : [{x: -5, y: -5}, {x: 5, y: 5}]);
    leftCtx.clearRect(0, 0, LW, LH);

    // Grid
    leftCtx.save(); leftCtx.strokeStyle = '#edf2f7'; leftCtx.lineWidth = 1;
    for (let x = Math.ceil(leftVP.xMin / leftVP.tx) * leftVP.tx; x <= leftVP.xMax + 1e-9; x += leftVP.tx) {
        const cx = lCX(Math.round(x * 1e9) / 1e9);
        leftCtx.beginPath(); leftCtx.moveTo(cx, LPAD.top); leftCtx.lineTo(cx, LH - LPAD.bottom); leftCtx.stroke();
    }
    for (let y = Math.ceil(leftVP.yMin / leftVP.ty) * leftVP.ty; y <= leftVP.yMax + 1e-9; y += leftVP.ty) {
        const cy = lCY(Math.round(y * 1e9) / 1e9);
        leftCtx.beginPath(); leftCtx.moveTo(LPAD.left, cy); leftCtx.lineTo(LW - LPAD.right, cy); leftCtx.stroke();
    }
    leftCtx.restore();

    // Axes
    leftCtx.save(); leftCtx.strokeStyle = '#cbd5e0'; leftCtx.lineWidth = 1.5;
    const ay = (leftVP.yMin <= 0 && leftVP.yMax >= 0) ? lCY(0) : LH - LPAD.bottom;
    const ax = (leftVP.xMin <= 0 && leftVP.xMax >= 0) ? lCX(0) : LPAD.left;
    leftCtx.beginPath(); leftCtx.moveTo(LPAD.left, ay); leftCtx.lineTo(LW - LPAD.right, ay); leftCtx.stroke();
    leftCtx.beginPath(); leftCtx.moveTo(ax, LPAD.top); leftCtx.lineTo(ax, LH - LPAD.bottom); leftCtx.stroke();
    const fs = Math.max(9, LW * 0.03);
    leftCtx.font = `${fs}px sans-serif`; leftCtx.fillStyle = '#a0aec0';
    leftCtx.textAlign = 'center'; leftCtx.textBaseline = 'top';
    for (let x = Math.ceil(leftVP.xMin / leftVP.tx) * leftVP.tx; x <= leftVP.xMax + 1e-9; x += leftVP.tx)
        leftCtx.fillText(Math.round(x * 1e9) / 1e9, lCX(Math.round(x * 1e9) / 1e9), LH - LPAD.bottom + 3);
    leftCtx.textAlign = 'right'; leftCtx.textBaseline = 'middle';
    for (let y = Math.ceil(leftVP.yMin / leftVP.ty) * leftVP.ty; y <= leftVP.yMax + 1e-9; y += leftVP.ty)
        leftCtx.fillText(Math.round(y * 1e9) / 1e9, LPAD.left - 3, lCY(Math.round(y * 1e9) / 1e9));
    leftCtx.restore();

    // Trend line
    const curA = gdHistory.length > 0 ? gdHistory[gdCurrentStep].a : null;
    if (curA !== null) {
        leftCtx.save(); leftCtx.strokeStyle = '#c53030'; leftCtx.lineWidth = 2; leftCtx.setLineDash([]);
        if (viewMode === 'corrected') {
            leftCtx.beginPath();
            leftCtx.moveTo(lCX(leftVP.xMin), lCY(curA * leftVP.xMin));
            leftCtx.lineTo(lCX(leftVP.xMax), lCY(curA * leftVP.xMax));
        } else {
            leftCtx.beginPath();
            leftCtx.moveTo(lCX(leftVP.xMin), lCY(curA * (leftVP.xMin - xbar) + ybar));
            leftCtx.lineTo(lCX(leftVP.xMax), lCY(curA * (leftVP.xMax - xbar) + ybar));
        }
        leftCtx.stroke(); leftCtx.restore();
    }

    // Centroid marker (오렌지 십자)
    if (dataPts.length >= 2) {
        const cx = viewMode === 'corrected' ? 0 : xbar;
        const cy = viewMode === 'corrected' ? 0 : ybar;
        const px = lCX(cx), py = lCY(cy), sz = 7;
        leftCtx.save(); leftCtx.strokeStyle = '#ed8936'; leftCtx.lineWidth = 1.8;
        leftCtx.beginPath(); leftCtx.moveTo(px - sz, py); leftCtx.lineTo(px + sz, py); leftCtx.stroke();
        leftCtx.beginPath(); leftCtx.moveTo(px, py - sz); leftCtx.lineTo(px, py + sz); leftCtx.stroke();
        leftCtx.restore();
    }

    // Data points
    const r = Math.max(4, LW * 0.014);
    for (const p of pts) {
        leftCtx.beginPath(); leftCtx.arc(lCX(p.x), lCY(p.y), r, 0, Math.PI * 2);
        leftCtx.fillStyle = '#2d3748'; leftCtx.fill();
        leftCtx.strokeStyle = '#fff'; leftCtx.lineWidth = 1.5; leftCtx.stroke();
    }

    // Equation + MSE label
    const eqEl = document.getElementById('leftEq');
    const mseEl = document.getElementById('leftMse');
    if (curA === null || corrPts.length < 2) {
        eqEl.className = 'eq-ph';
        eqEl.textContent = dataPts.length >= 2 ? '보정 보기로 전환하세요' : '데이터를 입력하세요';
        mseEl.textContent = '—';
    } else {
        eqEl.className = 'eq-blue';
        if (viewMode === 'corrected') {
            eqEl.textContent = `y = ${fmtN(curA, 3)}x`;
        } else {
            const b = ybar - curA * xbar;
            eqEl.textContent = `y = ${fmtN(curA, 3)}x ${b >= 0 ? '+' : '−'} ${fmtN(Math.abs(b), 3)}`;
        }
        mseEl.textContent = fmtN(mse(curA, corrPts), 4);
    }
}

/* ═══════════════════════════════
   TABLE
═══════════════════════════════ */
function buildTable() {
    const tb = document.getElementById('tbody');
    tb.innerHTML = '';
    for (let i = 0; i < rowCount; i++) tb.appendChild(createRowEl(i));
    setupNav();
}

function createRowEl(i) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="rn">${i + 1}</td>
        <td class="ci"><input type="number" step="any" placeholder="−" data-r="${i}" data-c="x"></td>
        <td class="ci"><input type="number" step="any" placeholder="−" data-r="${i}" data-c="y"></td>
        <td><button class="btn-del" data-r="${i}">×</button></td>`;
    tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', onCellInput));
    tr.querySelector('.btn-del').addEventListener('click', e => {
        const r = +e.currentTarget.dataset.r;
        tableData[r] = {x: '', y: ''};
        ['x', 'y'].forEach(c => {
            const el = document.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
            if (el) { el.value = ''; el.classList.remove('has-val'); }
        });
        onDataChange();
    });
    return tr;
}

function addRow() {
    if (rowCount >= MAX_ROWS) return;
    tableData.push({x: '', y: ''});
    rowCount++;
    document.getElementById('tbody').appendChild(createRowEl(rowCount - 1));
    setupNav();
}

function setupNav() {
    const inputs = [];
    for (let i = 0; i < rowCount; i++) {
        const xi = document.querySelector(`input[data-r="${i}"][data-c="x"]`);
        const yi = document.querySelector(`input[data-r="${i}"][data-c="y"]`);
        if (xi) inputs.push(xi);
        if (yi) inputs.push(yi);
    }
    inputs.forEach((inp, idx) => {
        inp.onkeydown = e => {
            if (e.key !== 'Enter' && e.key !== 'Tab') return;
            if (e.key === 'Tab' && e.shiftKey) return;
            e.preventDefault();
            const next = idx === inputs.length - 1
                ? inputs.find((inp2, j) => j % 2 === 0 && inp2.value === '') ?? inputs[0]
                : inputs[idx + 1];
            next?.focus();
        };
    });
}

function onCellInput(e) {
    const r = +e.target.dataset.r, c = e.target.dataset.c;
    tableData[r][c] = e.target.value;
    e.target.classList.toggle('has-val', e.target.value !== '');
    if (c === 'y' && tableData[r].x !== '' && r === rowCount - 1 && rowCount < MAX_ROWS) {
        addRow();
    }
    onDataChange();
}

/* ═══════════════════════════════
   SAMPLE DATA
═══════════════════════════════ */
function generateSample() {
    const trueA = 1.0 + Math.random() * 2.0;
    const trueB = 2.0 + Math.random() * 5.0;
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const x = Math.round((1 + Math.random() * 9) * 10) / 10;
        const noise = (Math.random() - 0.5) * 3;
        const y = Math.round((trueA * x + trueB + noise) * 10) / 10;
        pts.push({x, y});
    }
    return pts;
}

function loadSampleData() {
    const samples = generateSample();
    tableData = Array.from({length: 10}, () => ({x: '', y: ''}));
    rowCount = 10;
    buildTable();
    samples.forEach((pt, i) => {
        tableData[i] = {x: String(pt.x), y: String(pt.y)};
        const xEl = document.querySelector(`input[data-r="${i}"][data-c="x"]`);
        const yEl = document.querySelector(`input[data-r="${i}"][data-c="y"]`);
        if (xEl) { xEl.value = pt.x; xEl.classList.add('has-val'); }
        if (yEl) { yEl.value = pt.y; yEl.classList.add('has-val'); }
    });
    viewMode = 'original';
    onDataChange();
}

function resetData() {
    tableData = Array.from({length: 10}, () => ({x: '', y: ''}));
    rowCount = 10;
    viewMode = 'original';
    buildTable();
    onDataChange();
}

/* ═══════════════════════════════
   DATA CHANGE
═══════════════════════════════ */
function onDataChange() {
    dataPts = tableData
        .filter(r => r.x !== '' && r.y !== '' && !isNaN(+r.x) && !isNaN(+r.y))
        .map(r => ({x: +r.x, y: +r.y}));

    if (dataPts.length >= 2) {
        const c = calcCentroid(dataPts);
        xbar = c.x; ybar = c.y;
        corrPts = correctData(dataPts, xbar, ybar);
    } else {
        xbar = 0; ybar = 0; corrPts = [];
    }

    const toggleBtn = document.getElementById('btnToggleView');
    toggleBtn.disabled = dataPts.length < 2;
    toggleBtn.textContent = viewMode === 'original' ? '보정 보기' : '원본 보기';
    toggleBtn.classList.toggle('corrected', viewMode === 'corrected');

    gdReset();
    redrawLeft();
    redrawMid();
    updateRight();
}

/* ═══════════════════════════════
   RIGHT PANEL EVENTS
═══════════════════════════════ */
document.getElementById('a0Input').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) { gdA0 = v; gdReset(); redrawLeft(); redrawMid(); updateRight(); }
});
document.getElementById('alphaSlider').addEventListener('input', e => {
    gdAlpha = +e.target.value;
    document.getElementById('alphaDisplay').textContent = gdAlpha.toFixed(2);
    gdReset(); redrawLeft(); redrawMid(); updateRight();
});
document.getElementById('nSlider').addEventListener('input', e => {
    gdN = +e.target.value;
    document.getElementById('nDisplay').textContent = gdN;
    gdReset(); redrawLeft(); redrawMid(); updateRight();
});
document.getElementById('stepSlider').addEventListener('input', e => {
    gdStop(); updateGdControls(); gdGoToStep(+e.target.value);
});
document.getElementById('speedSlider').addEventListener('input', () => {
    if (gdRunning) { gdStop(); gdPlay(); }
});
document.getElementById('btnPlay').addEventListener('click', gdPlay);
document.getElementById('btnPause').addEventListener('click', gdPause);
document.getElementById('btnGdReset').addEventListener('click', () => {
    gdStop(); gdCurrentStep = 0;
    updateGdControls(); updateRight(); redrawLeft(); redrawMid();
});

/* ═══════════════════════════════
   INIT
═══════════════════════════════ */
document.getElementById('btnSample').addEventListener('click', loadSampleData);
document.getElementById('btnReset').addEventListener('click', resetData);
document.getElementById('btnToggleView').addEventListener('click', () => {
    if (dataPts.length < 2) return;
    viewMode = viewMode === 'original' ? 'corrected' : 'original';
    const btn = document.getElementById('btnToggleView');
    btn.textContent = viewMode === 'original' ? '보정 보기' : '원본 보기';
    btn.classList.toggle('corrected', viewMode === 'corrected');
    redrawLeft();
    redrawMid();
});

window.addEventListener('resize', () => { resizeLeft(); resizeMid(); });

buildTable();
loadSampleData();
resizeLeft();
resizeMid();
