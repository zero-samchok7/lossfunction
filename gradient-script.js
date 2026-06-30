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

/* ─ placeholders (구현은 Task 3~5에서) ─ */
function redrawLeft() {}
function redrawMid() {}
function updateRight() {}
function gdReset() {}
function resizeLeft() {}
function resizeMid() {}

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
