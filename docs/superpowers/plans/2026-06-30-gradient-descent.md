# 경사하강법 탐구 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고등학교 AI수학 학생이 1변수 경사하강법(기울기 a 최적화)을 직접 탐구할 수 있는 iPad 가로용 인터랙티브 웹페이지 구현

**Architecture:** gradient.html + gradient-style.css + gradient-script.js 3파일 구성. 더블클릭으로 바로 열리는 정적 파일. 데이터를 무게중심 이동으로 보정한 뒤 y=ax 형태로 1변수 경사하강법 적용. 왼쪽(산점도) ↔ 중간(MSE 포물선) 실시간 동기화.

**Tech Stack:** HTML5 Canvas API, Vanilla JavaScript, CSS Flexbox

## Global Constraints
- 더블클릭으로 바로 열림 — ES 모듈(`import`/`export`) 금지, `fetch` 금지
- `<link>`, `<script src>` 클래식 방식만 사용
- iPad 가로 모드 최적화 (landscape, 1180×820 기준)
- 외부 라이브러리 없음

---

### Task 1: HTML 골격 + CSS 3패널 레이아웃

**Files:**
- Create: `gradient.html`
- Create: `gradient-style.css`

**Interfaces:**
- Produces: 이후 모든 태스크가 `getElementById`로 참조할 element ID 확정

- [ ] **Step 1: `gradient.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>경사하강법 탐구</title>
    <link rel="stylesheet" href="gradient-style.css">
</head>
<body>
<header>경사하강법 탐구</header>
<div class="main">

    <!-- LEFT: 데이터 & 산점도 -->
    <div class="panel panel-left">
        <div class="panel-title">데이터 &amp; 산점도</div>
        <div class="left-top">
            <div class="btn-row">
                <button id="btnSample">샘플 생성</button>
                <button id="btnReset">초기화</button>
                <button id="btnToggleView" disabled>보정 보기</button>
            </div>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th></th><th>x</th><th>y</th><th></th>
                        </tr>
                    </thead>
                    <tbody id="tbody"></tbody>
                </table>
            </div>
        </div>
        <div class="left-bottom">
            <div class="canvas-wrap" id="leftCanvasWrap">
                <canvas id="leftCvs"></canvas>
            </div>
            <div class="eq-row">
                <span id="leftEq" class="eq-ph">데이터를 입력하세요</span>
            </div>
            <div class="mse-row">
                <span class="mse-label">MSE</span>
                <span id="leftMse" class="mse-val">—</span>
            </div>
        </div>
    </div>

    <!-- MIDDLE: MSE 포물선 -->
    <div class="panel panel-mid">
        <div class="panel-title">MSE 포물선</div>
        <div class="canvas-wrap mid-canvas-wrap" id="midCanvasWrap">
            <canvas id="midCvs"></canvas>
            <div class="mid-hint" id="midHint">데이터를 입력하면 포물선이 나타납니다</div>
        </div>
        <div class="mid-controls">
            <button id="btnPlay" disabled>▶ 실행</button>
            <button id="btnPause" disabled>⏸ 일시정지</button>
            <button id="btnGdReset" disabled>↺ 초기화</button>
            <div class="slider-row">
                <label>속도</label>
                <input type="range" id="speedSlider" min="1" max="5" value="3">
            </div>
            <div class="slider-row">
                <label>단계 <span id="stepDisplay">0</span></label>
                <input type="range" id="stepSlider" min="0" max="0" value="0" disabled>
            </div>
        </div>
    </div>

    <!-- RIGHT: 컨트롤 & 수치 -->
    <div class="panel panel-right">
        <div class="panel-title">컨트롤 &amp; 수치</div>
        <div class="right-scroll">
            <div class="ctrl-sec">
                <div class="sec-label">초기 설정</div>
                <div class="ctrl-row">
                    <label>초깃값 a₀</label>
                    <input type="number" id="a0Input" step="0.1" value="0">
                </div>
                <div class="ctrl-row">
                    <label>학습률 α &nbsp;<span id="alphaDisplay">0.10</span></label>
                    <input type="range" id="alphaSlider" min="0.01" max="1.0" step="0.01" value="0.10">
                </div>
                <div class="ctrl-row">
                    <label>반복 횟수 n &nbsp;<span id="nDisplay">10</span></label>
                    <input type="range" id="nSlider" min="1" max="30" value="10">
                </div>
            </div>
            <div class="ctrl-sec">
                <div class="sec-label">경사하강법 공식</div>
                <div class="formula-box">
                    <div class="formula-line">a<sub>new</sub> = a<sub>old</sub> &minus; α &times; (dMSE/da)</div>
                    <div class="formula-line formula-vals" id="formulaVals">—</div>
                </div>
            </div>
            <div class="ctrl-sec">
                <div class="sec-label">현재 단계</div>
                <div class="stat-row"><span class="stat-label">단계</span><span id="statStep" class="stat-val">—</span></div>
                <div class="stat-row"><span class="stat-label">a</span><span id="statA" class="stat-val">—</span></div>
                <div class="stat-row"><span class="stat-label">MSE</span><span id="statMse" class="stat-val">—</span></div>
                <div class="stat-row"><span class="stat-label">dMSE/da</span><span id="statGrad" class="stat-val">—</span></div>
                <div id="convergeBox" class="converge-box" style="display:none">수렴 완료 ✓</div>
            </div>
            <div class="ctrl-sec hist-sec">
                <div class="sec-label">단계별 기록</div>
                <div class="hist-wrap">
                    <table class="hist-table">
                        <thead><tr><th>n</th><th>a</th><th>MSE</th><th>dMSE/da</th></tr></thead>
                        <tbody id="histTbody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

</div>
<script src="gradient-script.js"></script>
</body>
</html>
```

- [ ] **Step 2: `gradient-style.css` 작성**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif;
    background: #f0f4f8; height: 100dvh; overflow: hidden;
    display: flex; flex-direction: column; color: #2d3748;
}
header {
    text-align: center; padding: 9px 16px; font-size: 1.05rem; font-weight: 700;
    background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.08); flex-shrink: 0;
}
.main { display: flex; flex: 1; gap: 8px; padding: 8px; overflow: hidden; min-height: 0; }
.panel {
    background: #fff; border-radius: 14px; box-shadow: 0 1px 6px rgba(0,0,0,0.07);
    display: flex; flex-direction: column; overflow: hidden;
}
.panel-title {
    font-size: 0.78rem; font-weight: 700; color: #a0aec0;
    text-transform: uppercase; letter-spacing: 0.06em;
    padding: 9px 12px 7px; border-bottom: 1px solid #f0f4f8; flex-shrink: 0;
}

/* ── LEFT ── */
.panel-left { width: 300px; flex-shrink: 0; }
.left-top { display: flex; flex-direction: column; height: 195px; flex-shrink: 0; border-bottom: 1px solid #f0f4f8; }
.btn-row { display: flex; gap: 5px; padding: 6px 8px 5px; flex-shrink: 0; }
.btn-row button {
    flex: 1; padding: 5px 4px; border-radius: 7px; font-size: 0.74rem; font-weight: 700;
    cursor: pointer; border: 1.5px solid #e2e8f0; background: #f7fafc; color: #4a5568;
}
.btn-row button:hover:not(:disabled) { background: #edf2f7; }
.btn-row button:disabled { opacity: 0.4; cursor: not-allowed; }
#btnToggleView { background: #ebf8ff; border-color: #90cdf4; color: #2b6cb0; }
#btnToggleView.corrected { background: #f0fff4; border-color: #9ae6b4; color: #276749; }
.table-wrap { overflow-y: auto; flex: 1; min-height: 0; }
table { width: 100%; border-collapse: collapse; }
thead th {
    font-size: 0.7rem; font-weight: 700; color: #a0aec0;
    padding: 4px 2px; text-align: center;
    position: sticky; top: 0; background: #fff;
    border-bottom: 1px solid #edf2f7; z-index: 1;
}
tbody tr { border-bottom: 1px solid #f7fafc; }
tbody tr:hover { background: #f7fafc; }
.rn { font-size: 0.68rem; color: #cbd5e0; text-align: center; width: 16px; padding: 0 1px; }
.ci { padding: 2px 1px; }
.ci input {
    width: 100%; border: 1px solid #e2e8f0; border-radius: 4px;
    padding: 3px; font-size: 0.8rem; text-align: center;
    outline: none; color: #2d3748; -moz-appearance: textfield;
}
.ci input::-webkit-outer-spin-button,
.ci input::-webkit-inner-spin-button { -webkit-appearance: none; }
.ci input:focus { border-color: #667eea; box-shadow: 0 0 0 2px rgba(102,126,234,0.15); }
.ci input.has-val { background: #ebf8ff; border-color: #90cdf4; font-weight: 600; }
.btn-del { background: none; border: none; cursor: pointer; color: #e2e8f0; font-size: 0.85rem; width: 20px; padding: 0; }
.btn-del:hover { color: #e53e3e; }
.left-bottom { flex: 1; display: flex; flex-direction: column; min-height: 0; padding: 5px 8px 6px; }
.canvas-wrap { flex: 1; min-height: 0; position: relative; }
.canvas-wrap canvas { display: block; }
.eq-row { padding: 4px 0 2px; font-size: 0.85rem; font-weight: 700; min-height: 1.4em; text-align: center; }
.eq-ph { color: #cbd5e0; font-weight: 400; font-size: 0.76rem; }
.eq-blue { color: #2b6cb0; }
.mse-row { display: flex; justify-content: space-between; padding: 1px 0 0; font-size: 0.77rem; }
.mse-label { color: #718096; font-weight: 600; }
.mse-val { font-weight: 700; color: #2d3748; }

/* ── MIDDLE ── */
.panel-mid { flex: 1; min-width: 0; }
.mid-canvas-wrap { display: flex; align-items: center; justify-content: center; }
.mid-hint {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    font-size: 0.82rem; color: #a0aec0; text-align: center; pointer-events: none;
    line-height: 1.6;
}
.mid-controls {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px;
    border-top: 1px solid #f0f4f8; flex-shrink: 0; flex-wrap: wrap;
}
.mid-controls button {
    padding: 5px 11px; border-radius: 7px; font-size: 0.8rem; font-weight: 700;
    cursor: pointer; border: 1.5px solid #e2e8f0; background: #f7fafc; color: #4a5568;
}
.mid-controls button:hover:not(:disabled) { background: #edf2f7; }
.mid-controls button:disabled { opacity: 0.4; cursor: not-allowed; }
#btnPlay { background: #c6f6d5; border-color: #9ae6b4; color: #276749; }
#btnPause { background: #fefcbf; border-color: #f6e05e; color: #744210; }
#btnGdReset { background: #fff5f5; border-color: #fed7d7; color: #c53030; }
.slider-row { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: #718096; font-weight: 600; }
.slider-row input[type=range] { width: 80px; }

/* ── RIGHT ── */
.panel-right { width: 222px; flex-shrink: 0; }
.right-scroll { overflow-y: auto; flex: 1; min-height: 0; }
.ctrl-sec { padding: 10px 12px; border-bottom: 1px solid #f0f4f8; }
.ctrl-sec:last-child { border-bottom: none; }
.hist-sec { flex: 1; }
.sec-label { font-size: 0.7rem; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px; }
.ctrl-row { margin: 6px 0; }
.ctrl-row label { display: block; font-size: 0.74rem; color: #718096; font-weight: 600; margin-bottom: 3px; }
.ctrl-row input[type=number] {
    width: 100%; border: 1px solid #e2e8f0; border-radius: 6px;
    padding: 5px 8px; font-size: 0.85rem; color: #2d3748; outline: none;
    -moz-appearance: textfield;
}
.ctrl-row input[type=number]::-webkit-outer-spin-button,
.ctrl-row input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
.ctrl-row input[type=number]:focus { border-color: #667eea; }
.ctrl-row input[type=range] { width: 100%; margin-top: 2px; }
.formula-box { background: #f7fafc; border-radius: 7px; padding: 8px 10px; font-size: 0.77rem; }
.formula-line { color: #4a5568; line-height: 1.8; }
.formula-vals { color: #2b6cb0; font-weight: 700; font-size: 0.8rem; }
.stat-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 0.78rem; }
.stat-label { color: #718096; font-weight: 600; }
.stat-val { font-weight: 700; color: #2d3748; }
.converge-box {
    margin-top: 7px; padding: 6px 10px; background: #f0fff4; border: 1px solid #9ae6b4;
    border-radius: 7px; color: #276749; font-size: 0.78rem; font-weight: 700; text-align: center;
}
.hist-wrap { overflow-y: auto; max-height: 160px; }
.hist-table { width: 100%; border-collapse: collapse; font-size: 0.71rem; }
.hist-table th {
    color: #a0aec0; font-weight: 700; padding: 3px 2px; text-align: center;
    position: sticky; top: 0; background: #fff; border-bottom: 1px solid #edf2f7;
}
.hist-table td { padding: 2px; text-align: center; border-bottom: 1px solid #f7fafc; color: #4a5568; }
.hist-table tr.current-row td { background: #ebf8ff; font-weight: 700; color: #2b6cb0; }
```

- [ ] **Step 3: 브라우저에서 `gradient.html` 더블클릭으로 열기**
  - 3패널 레이아웃이 화면에 꽉 차는지 확인
  - 스크롤바 없이 전체가 보이는지 확인

---

### Task 2: 수학 엔진 + 데이터 테이블

**Files:**
- Create: `gradient-script.js`

**Interfaces:**
- Produces:
  - `dataPts: [{x, y}]` — 파싱된 유효 데이터 (원본 좌표)
  - `corrPts: [{x, y}]` — 무게중심 이동된 보정 데이터
  - `xbar, ybar: number` — 무게중심 좌표
  - `mse(a, pts) → number`
  - `gradient(a, pts) → number`
  - `optimalA(pts) → number`
  - `onDataChange()` — 데이터 변경 시 전체 업데이트 진입점
  - `redrawLeft()`, `redrawMid()`, `updateRight()` — 이후 태스크에서 구현 (여기서는 빈 함수로 선언)

- [ ] **Step 1: 상태 변수 + 수학 함수 작성**

```javascript
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
```

- [ ] **Step 2: 데이터 테이블 빌드 함수 작성**

```javascript
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
```

- [ ] **Step 3: 샘플 생성 + 초기화 + onDataChange 작성**

```javascript
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
```

- [ ] **Step 4: 이벤트 리스너 + INIT (파일 맨 아래)**

```javascript
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
```

- [ ] **Step 5: 브라우저에서 확인**
  - 샘플 생성 → 테이블에 10개 데이터 표시
  - 직접 입력 → 마지막 행 채우면 새 행 추가 (최대 20행)
  - 초기화 → 테이블 비워짐
  - 콘솔에서 `dataPts`, `corrPts`, `xbar`, `ybar` 값 확인
    - `corrPts`의 x 평균, y 평균이 0에 가까운지 확인

---

### Task 3: 왼쪽 패널 캔버스 (산점도 + 추세선)

**Files:**
- Modify: `gradient-script.js` — `redrawLeft()` placeholder 교체

**Interfaces:**
- Consumes: `dataPts`, `corrPts`, `xbar`, `ybar`, `viewMode`, `gdHistory[gdCurrentStep].a`
- Produces: `redrawLeft()`, `resizeLeft()` (window resize에서 호출)

- [ ] **Step 1: 캔버스 설정 + 뷰포트 계산**

`redrawLeft() {}` placeholder **위**에 삽입:

```javascript
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
```

- [ ] **Step 2: `redrawLeft()` 본체 구현 (placeholder 교체)**

```javascript
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
```

- [ ] **Step 3: INIT 블록에 `resizeLeft()` 추가**

INIT 맨 아래 `loadSampleData();` 다음 줄에 추가:
```javascript
resizeLeft();
```

- [ ] **Step 4: 브라우저에서 확인**
  - 산점도 점 정상 표시
  - 무게중심 오렌지 십자 표시
  - 원본 ↔ 보정 전환 시 좌표 이동 확인 (보정 시 십자가 원점 근처로 이동)
  - 원본 보기: 추세선 없음 (GD 미실행 시)

---

### Task 4: 중간 패널 캔버스 (MSE 포물선)

**Files:**
- Modify: `gradient-script.js` — `redrawMid()` placeholder 교체

**Interfaces:**
- Consumes: `corrPts`, `optimalA()`, `mse()`, `gradient()`, `gdHistory`, `gdCurrentStep`, `gdA0`
- Produces: `redrawMid()`, `resizeMid()`, 포물선 클릭 → `gdA0` + `a0Input` 업데이트

- [ ] **Step 1: 캔버스 설정**

`redrawMid() {}` placeholder **위**에 삽입:

```javascript
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
```

- [ ] **Step 2: `redrawMid()` 본체 구현 (placeholder 교체)**

```javascript
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
```

- [ ] **Step 3: 포물선 클릭으로 초깃값 설정**

`resizeMid()` 함수 아래에 추가:

```javascript
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
```

- [ ] **Step 4: INIT 블록에 `resizeMid()` 추가**

`resizeLeft();` 다음 줄에 추가:
```javascript
resizeMid();
```

- [ ] **Step 5: 브라우저에서 확인**
  - 포물선이 보라색 곡선으로 그려지는지 확인
  - 최솟값 ★ 표시 확인
  - 포물선 클릭 → 오른쪽 패널 a₀ 입력값 업데이트 확인
  - 축 레이블 "기울기 a" / "MSE" 확인

---

### Task 5: 경사하강법 엔진 + 오른쪽 패널 + 애니메이션

**Files:**
- Modify: `gradient-script.js` — `updateRight()` placeholder 교체 및 GD 엔진 추가

**Interfaces:**
- Consumes: `corrPts`, `gdA0`, `gdAlpha`, `gdN`, `mse()`, `gradient()`
- Produces: `gdHistory`, `gdReset()`, `gdPlay()`, `gdPause()`, `gdGoToStep()`, `updateRight()`

- [ ] **Step 1: 경사하강법 엔진**

`updateRight() {}` placeholder **위**에 삽입:

```javascript
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
```

- [ ] **Step 2: `updateRight()` 본체 구현 (placeholder 교체)**

```javascript
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
```

- [ ] **Step 3: 오른쪽 패널 이벤트 리스너 (INIT 블록 바로 위에 추가)**

```javascript
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
```

- [ ] **Step 4: 브라우저에서 전체 흐름 확인**

다음 시나리오를 순서대로 테스트:

1. 페이지 열기 → 샘플 데이터 자동 로드, 포물선 + 산점도 표시
2. 포물선 클릭 → 오른쪽 a₀ 값 업데이트, 중간 패널에 점 표시
3. ▶ 실행 → 점이 단계별로 포물선 위를 이동, 왼쪽 추세선 동기화
4. ⏸ 일시정지 → 멈춤
5. 단계 슬라이더로 특정 단계 선택 → 해당 단계 수치 표시
6. 학습률 0.9 이상 → 포물선 위에서 발산 확인
7. 수렴 시 "수렴 완료 ✓" 표시 확인
8. 보정 보기 전환 → y = ax 형태 추세선, 원본 보기 → y = ax + b 형태
9. 샘플 생성 → 전체 리셋 후 새 데이터 반영
10. 초기화 → 그래프 초기화

- [ ] **Step 5: iPad 해상도 확인**

Chrome DevTools → 기기: iPad Air 또는 커스텀 1180×820 설정:
- 3패널 레이아웃이 화면 안에 들어오는지 확인
- 모든 버튼, 슬라이더 터치 가능한 크기인지 확인
- 스크롤 없이 전체 사용 가능한지 확인

---

## 자체 검토 (Spec Coverage)

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| 3패널 iPad 가로 레이아웃 | Task 1 |
| 데이터 입력 테이블 (최대 20행) | Task 2 |
| 샘플 생성 (10개) + 초기화 버튼 | Task 2 |
| 무게중심 이동 보정 (자동) | Task 2 |
| 원본 ↔ 보정 전환 버튼 | Task 2, 3 |
| 산점도 + 무게중심 마커 | Task 3 |
| 추세선 (보정: y=ax, 원본: y=ax+b) | Task 3 |
| 방정식 + MSE 표시 | Task 3 |
| MSE(a) 포물선 + 최솟값 ★ | Task 4 |
| 포물선 클릭 → 초깃값 설정 | Task 4 |
| 경사하강법 엔진 (수렴 조건 포함) | Task 5 |
| ▶/⏸/↺ 애니메이션 컨트롤 | Task 5 |
| 속도 슬라이더 + 단계 슬라이더 | Task 5 |
| 경사하강법 공식 실시간 표시 | Task 5 |
| 현재 단계 수치 (a, MSE, dMSE/da) | Task 5 |
| 수렴 완료 표시 (\|dMSE/da\| < 0.001) | Task 5 |
| 단계별 기록 테이블 | Task 5 |
| 접선 표시 (포물선 위 현재 점) | Task 4 |
| 자취 (trail) | Task 4 |
| 왼쪽-중간 실시간 동기화 | Task 3, 5 |
| 더블클릭으로 열림 | Task 1 (ES 모듈 없음) |
