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

/* ─ placeholders (구현은 Task 4~5에서) ─ */
function redrawMid() {}
function updateRight() {}
function gdReset() {}
function resizeMid() {}

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
