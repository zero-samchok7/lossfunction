# 예측과 최적화 lesson 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공통 CSS 시스템 + 허브 index.html + lesson1~3, lesson5 HTML 페이지 구현

**Architecture:** 각 lesson은 독립 HTML + JS 파일로 구성하고 lesson-common.css를 공유한다. Canvas API로 인터랙티브 시각화를 구현한다. lesson5는 기존 gradient.html/gradient-script.js를 git에서 복원하여 재활용한다.

**Tech Stack:** HTML5 Canvas, Vanilla JS (클래식 script), CSS Flexbox

## Global Constraints

- **더블클릭 실행**: `<script type="module">` 금지, `fetch()` 금지, 클래식 `<script src>` 사용
- **iPad landscape 최적화**: `100dvh`, `overflow:hidden`, 3패널 flex
- **공통 CSS**: 모든 페이지에서 `lesson-common.css` 사용 (`<link rel="stylesheet" href="lesson-common.css">`)
- **데이터 범위**: lesson2·3 x,y 모두 0~20 양수 전용; lesson1은 auto-scale
- **샘플 데이터 (lesson2·3·5)**: y ≈ slope·x + noise 형태, slope ∈ [0.5, 2.5], x ∈ [2, 18], noise = slope·x·(rand−0.5)·0.5, x·y 모두 0~20 클램핑
- **MSE 수식**: MSE(a) = (1/n)Σ(yᵢ−axᵢ)² = A·a² − B·a + C
  - A = Σxᵢ²/n, B = 2Σxᵢyᵢ/n, C = Σyᵢ²/n, a\* = B/(2A) = Σxᵢyᵢ/Σxᵢ²
- **헤더**: height 48px, `← 목록` 링크 → index.html, 중앙 차시 제목
- **CSS 변수**: --accent #6c5ce7, --accent-dark #5a4bd1, --accent-light #f0eeff, --bg #f8f9fa, --panel-bg #fff, --border #e2e8f0, --text #2d3748, --text-muted #718096
- **파일명**: lesson-common.css, index.html, lesson1.html, lesson1-script.js, lesson2.html, lesson2-script.js, lesson3.html, lesson3-script.js, lesson5.html, lesson5-script.js
- **커밋 전**: `git add <파일명>` (특정 파일만, -A 사용 금지)

---

### Task 1: lesson-common.css — 공통 디자인 시스템

**Files:**
- Create: `lesson-common.css`

**Interfaces:**
- Produces: 아래 모든 태스크에서 사용하는 CSS 클래스 및 변수
  - 레이아웃: `.lesson-header`, `.back-link`, `.lesson-title`, `.lesson-body`, `.panel-left`, `.panel-mid`, `.panel-right`
  - 컴포넌트: `.panel-section`, `.section-label`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-row`
  - 데이터: `.data-table`, `.slider-row`, `.slider-val`
  - 수식: `.formula-box`, `.formula-step` (display:none → .visible로 표시)
  - 결과: `.result-box` (display:none → .visible), `.result-row`, `.result-label`, `.result-val`
  - 비교: `.compare-row`, `.compare-cell`, `.compare-cell.winner`

- [ ] **Step 1: lesson-common.css 파일 작성**

```css
/* ===== CSS 변수 ===== */
:root {
  --accent: #6c5ce7;
  --accent-dark: #5a4bd1;
  --accent-light: #f0eeff;
  --bg: #f8f9fa;
  --panel-bg: #ffffff;
  --border: #e2e8f0;
  --text: #2d3748;
  --text-muted: #718096;
  --header-h: 48px;
}

/* ===== 리셋 + 기본 ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  background: var(--bg);
  color: var(--text);
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ===== 헤더 ===== */
.lesson-header {
  height: var(--header-h);
  background: var(--panel-bg);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}
.back-link {
  position: absolute;
  left: 14px;
  font-size: 0.82rem;
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
}
.back-link:hover { color: var(--accent); }
.lesson-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

/* ===== 3패널 레이아웃 ===== */
.lesson-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.panel-left {
  width: 220px;
  flex-shrink: 0;
  background: var(--panel-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 12px;
  gap: 10px;
}
.panel-mid {
  flex: 1;
  background: var(--bg);
  position: relative;
  overflow: hidden;
}
.panel-right {
  width: 264px;
  flex-shrink: 0;
  background: var(--panel-bg);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 12px;
  gap: 10px;
}

/* ===== 패널 섹션 ===== */
.panel-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.section-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ===== 버튼 ===== */
.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-dark); }
.btn-secondary { background: var(--accent-light); color: var(--accent); }
.btn-secondary:hover { background: #e0d9ff; }
.btn-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
.btn-ghost:hover { background: var(--bg); }
.btn-row { display: flex; gap: 6px; }
.btn-row .btn { flex: 1; }

/* ===== 데이터 입력 테이블 ===== */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.data-table th {
  background: var(--bg);
  color: var(--text-muted);
  font-weight: 700;
  padding: 4px 6px;
  border: 1px solid var(--border);
  text-align: center;
}
.data-table td {
  padding: 2px 2px;
  border: 1px solid var(--border);
}
.data-table input[type=number] {
  width: 100%;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 0.82rem;
  color: var(--text);
  outline: none;
  padding: 2px 0;
}
.data-table input[type=number]:focus { background: var(--accent-light); }

/* ===== 슬라이더 ===== */
.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.slider-row label { font-size: 0.82rem; min-width: 24px; font-weight: 600; }
.slider-row input[type=range] { flex: 1; accent-color: var(--accent); cursor: pointer; }
.slider-val {
  font-size: 0.85rem;
  font-weight: 700;
  min-width: 40px;
  text-align: right;
  color: var(--accent);
}

/* ===== 수식 박스 ===== */
.formula-box {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.76rem;
  line-height: 1.7;
  font-family: 'Courier New', monospace;
  color: var(--text);
  word-break: break-all;
}
.formula-step {
  display: none;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed var(--border);
  font-size: 0.76rem;
  font-family: 'Courier New', monospace;
  line-height: 1.7;
}
.formula-step.visible { display: block; }
.formula-highlight { color: var(--accent); font-weight: 700; }

/* ===== 결과 박스 ===== */
.result-box {
  display: none;
  background: var(--accent-light);
  border: 1px solid #c5b8ff;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.82rem;
  gap: 4px;
  flex-direction: column;
}
.result-box.visible { display: flex; }
.result-row { display: flex; justify-content: space-between; align-items: baseline; }
.result-label { color: var(--text-muted); font-size: 0.78rem; }
.result-val { font-weight: 700; color: var(--accent); }

/* ===== MSE 비교 박스 ===== */
.compare-row { display: flex; gap: 8px; }
.compare-cell {
  flex: 1;
  background: var(--bg);
  border: 2px solid var(--border);
  border-radius: 8px;
  padding: 6px 4px;
  text-align: center;
  transition: border-color 0.2s, background 0.2s;
}
.compare-cell.winner { border-color: var(--accent); background: var(--accent-light); }
.compare-cell .c-label { font-size: 0.7rem; color: var(--text-muted); }
.compare-cell .c-val { font-size: 1rem; font-weight: 700; margin-top: 2px; }

/* ===== 캔버스 공통 ===== */
canvas { display: block; }
```

- [ ] **Step 2: 커밋**

```bash
git add lesson-common.css
git commit -m "feat: 공통 CSS 디자인 시스템 (lesson-common.css)"
```

---

### Task 2: index.html — 5차시 허브 메인

**Files:**
- Modify: `index.html` (기존 파일 덮어쓰기)

**Interfaces:**
- Consumes: `lesson-common.css`
- Produces: lesson1~5.html로 향하는 카드 5개 (lesson4는 비활성)

- [ ] **Step 1: index.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>예측과 최적화 단원 학습</title>
  <link rel="stylesheet" href="lesson-common.css">
  <style>
    .hub-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: auto;
    }
    .hub-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
      max-width: 960px;
    }
    .lesson-card {
      background: var(--panel-bg);
      border: 1.5px solid var(--border);
      border-radius: 16px;
      padding: 24px 16px 20px;
      width: 160px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: var(--text);
      transition: box-shadow 0.18s, border-color 0.18s;
    }
    .lesson-card:hover {
      border-color: var(--accent);
      box-shadow: 0 4px 20px rgba(108,92,231,0.18);
    }
    .lesson-card.disabled {
      opacity: 0.4;
      pointer-events: none;
    }
    .card-num {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.08em;
    }
    .card-title {
      font-size: 0.88rem;
      font-weight: 700;
      text-align: center;
      line-height: 1.45;
    }
    .card-desc {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-align: center;
      line-height: 1.55;
      flex: 1;
    }
    .card-btn {
      margin-top: 6px;
      padding: 5px 20px;
      background: var(--accent);
      color: #fff;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <header class="lesson-header">
    <span class="lesson-title">예측과 최적화 단원 학습</span>
  </header>
  <main class="hub-body">
    <div class="hub-grid">
      <a href="lesson1.html" class="lesson-card">
        <span class="card-num">1차시</span>
        <span class="card-title">추세선 직접 그리기</span>
        <span class="card-desc">직선을 그려 예측값과 오차를 확인합니다</span>
        <span class="card-btn">열기</span>
      </a>
      <a href="lesson2.html" class="lesson-card">
        <span class="card-num">2차시</span>
        <span class="card-title">y=ax 직선 비교</span>
        <span class="card-desc">두 직선의 평균제곱오차를 비교합니다</span>
        <span class="card-btn">열기</span>
      </a>
      <a href="lesson3.html" class="lesson-card">
        <span class="card-num">3차시</span>
        <span class="card-title">손실함수와 최솟값</span>
        <span class="card-desc">MSE 그래프에서 이차함수의 최솟값을 탐구합니다</span>
        <span class="card-btn">열기</span>
      </a>
      <a href="lesson4.html" class="lesson-card disabled">
        <span class="card-num">4차시</span>
        <span class="card-title">준비 중</span>
        <span class="card-desc">—</span>
        <span class="card-btn">열기</span>
      </a>
      <a href="lesson5.html" class="lesson-card">
        <span class="card-num">5차시</span>
        <span class="card-title">경사하강법</span>
        <span class="card-desc">경사를 따라 최솟값을 찾아가는 과정을 탐구합니다</span>
        <span class="card-btn">열기</span>
      </a>
    </div>
  </main>
</body>
</html>
```

- [ ] **Step 2: 브라우저에서 확인**
  - 카드 5개가 가로 나열
  - lesson4 카드가 회색·클릭 불가
  - hover 시 보라 테두리

- [ ] **Step 3: 커밋**

```bash
git add index.html
git commit -m "feat: 5차시 허브 메인 index.html"
```

---

### Task 3: lesson1.html + lesson1-script.js — 추세선 직접 그리기

**Files:**
- Create: `lesson1.html`
- Create: `lesson1-script.js`

**Interfaces:**
- Consumes: `lesson-common.css`
- Produces: 산점도 + 직선 그리기 + 예측값·오차 표

#### HTML 구조

- [ ] **Step 1: lesson1.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>1차시 — 추세선 직접 그리기</title>
  <link rel="stylesheet" href="lesson-common.css">
  <style>
    .mode-toggle { display: flex; gap: 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
    .mode-toggle .btn { border-radius: 0; flex: 1; border: none; background: var(--bg); color: var(--text-muted); }
    .mode-toggle .btn.active { background: var(--accent); color: #fff; }
    .line-legend { display: flex; flex-direction: column; gap: 4px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
    .legend-eq { font-family: 'Courier New', monospace; color: var(--text); }
    .legend-del { margin-left: auto; cursor: pointer; color: var(--text-muted); font-size: 0.7rem; }
    .legend-del:hover { color: #e53e3e; }
    /* 우측 패널 슬라이드 토글 */
    #rightPanel { transition: width 0.2s; }
    #rightPanel.hidden { width: 0; padding: 0; overflow: hidden; border: none; }
    /* 오른쪽 펼침 버튼 */
    #toggleRight {
      position: absolute; top: 10px; right: 10px;
      background: var(--panel-bg); border: 1px solid var(--border);
      border-radius: 8px; padding: 4px 8px; cursor: pointer;
      font-size: 0.78rem; font-weight: 700; color: var(--accent);
      z-index: 10;
    }
    /* 예측/오차 테이블 숨김 열 */
    .col-pred, .col-err { display: none; }
    .col-pred.show, .col-err.show { display: table-cell; }
  </style>
</head>
<body>
  <header class="lesson-header">
    <a href="index.html" class="back-link">← 목록</a>
    <span class="lesson-title">1차시 — 추세선 직접 그리기</span>
  </header>
  <main class="lesson-body">

    <!-- 좌측: 데이터 입력 -->
    <div class="panel-left">
      <div class="panel-section">
        <span class="section-label">데이터 입력</span>
        <table class="data-table" id="dataTable">
          <thead><tr><th>#</th><th>x</th><th>y</th></tr></thead>
          <tbody id="dataBody"></tbody>
        </table>
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" id="btnSample">샘플 생성</button>
        <button class="btn btn-ghost" id="btnReset">초기화</button>
      </div>
    </div>

    <!-- 중간: 캔버스 -->
    <div class="panel-mid">
      <canvas id="mainCanvas"></canvas>
      <!-- 모드 토글 (캔버스 위 좌측 상단) -->
      <div style="position:absolute;top:10px;left:10px;z-index:10;">
        <div class="mode-toggle">
          <button class="btn active" id="btnModePoint">점 추가</button>
          <button class="btn" id="btnModeLine">직선 그리기</button>
        </div>
      </div>
      <!-- 펼침 버튼 -->
      <button id="toggleRight">▶ 오차</button>
    </div>

    <!-- 우측: 예측·오차 패널 -->
    <div class="panel-right hidden" id="rightPanel">
      <div class="panel-section">
        <span class="section-label">직선 선택</span>
        <select id="lineSelect" class="btn btn-ghost" style="width:100%;text-align:center;"></select>
      </div>
      <div class="panel-section">
        <div class="btn-row">
          <button class="btn btn-secondary" id="btnShowPred">예측값 보기</button>
          <button class="btn btn-secondary" id="btnShowErr">오차 보기</button>
        </div>
      </div>
      <div class="panel-section">
        <table class="data-table" id="predTable">
          <thead>
            <tr>
              <th>x</th><th>y</th>
              <th class="col-pred">ŷ</th>
              <th class="col-err">y−ŷ</th>
            </tr>
          </thead>
          <tbody id="predBody"></tbody>
        </table>
      </div>
    </div>

  </main>
  <script src="lesson1-script.js"></script>
</body>
</html>
```

#### JS 구현

- [ ] **Step 2: lesson1-script.js 작성**

**데이터 모델:**
```javascript
// 데이터 포인트 배열
var pts = [];           // [{x, y}, ...]

// 직선 배열 (데이터 좌표계)
var lines = [];         // [{id, x1, y1, x2, y2, color, label}, ...]
var nextLineId = 1;
var LINE_COLORS = ['#e74c3c','#2980b9','#27ae60','#e67e22','#8e44ad','#16a085'];

// 현재 모드: 'point' | 'line'
var mode = 'point';

// 직선 그리기 상태 (첫 번째 클릭 후)
var lineDraw = null;   // null | {x1, y1} (데이터 좌표)
var linePreview = null; // 마우스 이동 중 미리보기용 {x2, y2}

// 드래그 상태 (endpoint 드래그)
var drag = null;       // null | {line, which: 'p1'|'p2'}

// 우측 패널 상태
var rightOpen = false;
var showPred = false;
var showErr = false;
var selectedLineId = null;
```

**캔버스 좌표 변환:**
```javascript
var canvas = document.getElementById('mainCanvas');
var ctx = canvas.getContext('2d');
var MARGIN = {top: 24, right: 24, bottom: 44, left: 48};

function resize() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  redraw();
}
window.addEventListener('resize', resize);

// 데이터 범위 계산 (여백 10% 추가)
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
```

**직선 방정식 계산:**
```javascript
// 두 점으로부터 slope, intercept, label 반환
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

// 주어진 x에서 직선의 y값
function lineY(ln, x) {
  var eq = lineEq(ln);
  if (!isFinite(eq.slope)) return NaN;
  return eq.slope * x + eq.intercept;
}
```

**canvas 그리기 (redraw):**
```javascript
function redraw() {
  var range = getRange();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 배경 흰색
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid(range);
  drawLines(range);
  if (lineDraw && linePreview) drawPreviewLine(range);
  drawHandles(range);
  drawPoints(range);
}

function drawGrid(range) {
  // x축, y축 그리기 (회색 눈금선 + 레이블)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  // x 눈금: 적절한 간격으로 5~8개
  // y 눈금: 적절한 간격으로 5~8개
  // 눈금 레이블: ctx.fillText(...)
  // 구현: niceTicks(min, max, 6) 함수 사용
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

// 눈금 간격 계산 (niceTicks: min, max, targetCount → [tick값 배열])
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

function drawLines(range) {
  lines.forEach(function(ln) {
    var p1 = toPixel(ln.x1, ln.y1, range), p2 = toPixel(ln.x2, ln.y2, range);
    // 직선을 캔버스 끝까지 연장
    var extended = extendLine(p1, p2);
    ctx.beginPath();
    ctx.moveTo(extended.x1, extended.y1);
    ctx.lineTo(extended.x2, extended.y2);
    ctx.strokeStyle = ln.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    // 방정식 레이블
    var eq = lineEq(ln);
    ctx.fillStyle = ln.color;
    ctx.font = 'bold 12px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(eq.label, p1.px + 4, p1.py - 6);
  });
}

// 선분(p1→p2)을 캔버스 경계까지 연장
function extendLine(p1, p2) {
  var dx = p2.px - p1.px, dy = p2.py - p1.py;
  var t1 = -1e6, t2 = 1e6;
  // 캔버스 경계 클리핑 (간단히 큰 t값으로 연장)
  var ex1 = p1.px + dx * (-1000), ey1 = p1.py + dy * (-1000);
  var ex2 = p1.px + dx * (1000),  ey2 = p1.py + dy * (1000);
  return {x1: ex1, y1: ey1, x2: ex2, y2: ey2};
}

// endpoint 핸들 원 그리기 (직선 모드일 때만)
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
```

**이벤트 핸들러:**
```javascript
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

function dist(ax, ay, bx, by) { return Math.sqrt((ax-bx)*(ax-bx)+(ay-by)*(ay-by)); }

function drawPreviewLine(range) {
  var p1 = toPixel(lineDraw.x1, lineDraw.y1, range);
  var p2 = toPixel(linePreview.x, linePreview.y, range);
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#a0aec0'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py); ctx.stroke();
  ctx.setLineDash([]);
}
```

**데이터 테이블 관리:**
```javascript
// 최대 15행. 각 행: <tr><td>#</td><td><input x></td><td><input y></td></tr>
// 입력 변경 시 pts 갱신, redraw(), updatePredTable() 호출
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
```

**직선 범례 + 선택 드롭다운:**
```javascript
function updateLegend() {
  var sel = document.getElementById('lineSelect');
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
```

**예측·오차 테이블:**
```javascript
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
```

**샘플 생성 + 초기화:**
```javascript
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
```

**우측 패널 토글:**
```javascript
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
```

**초기화 실행:**
```javascript
resize();
updateTable();
updateLegend();
```

- [ ] **Step 3: 브라우저 확인**
  - 점 추가 모드: 캔버스 클릭 → 점 추가 + 테이블에 반영
  - 직선 그리기 모드: 두 번 클릭 → 직선 생성, 방정식 레이블 표시
  - endpoint 드래그로 직선 이동
  - ▶ 오차 버튼 → 우측 패널 열림, 예측값/오차 표시
  - 샘플 생성 → 9개 데이터 포인트 생성

- [ ] **Step 4: 커밋**

```bash
git add lesson1.html lesson1-script.js
git commit -m "feat: 1차시 추세선 직접 그리기 (lesson1)"
```

---

### Task 4: lesson2.html + lesson2-script.js — y=ax 직선 비교와 MSE

**Files:**
- Create: `lesson2.html`
- Create: `lesson2-script.js`

**Interfaces:**
- Consumes: `lesson-common.css`
- Produces: 두 y=ax 직선 비교 + MSE 계산 + 최적 추세선 공개

- [ ] **Step 1: lesson2.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2차시 — y=ax 직선 비교</title>
  <link rel="stylesheet" href="lesson-common.css">
</head>
<body>
  <header class="lesson-header">
    <a href="index.html" class="back-link">← 목록</a>
    <span class="lesson-title">2차시 — y=ax 직선 비교</span>
  </header>
  <main class="lesson-body">

    <!-- 좌측: 데이터 입력 -->
    <div class="panel-left">
      <div class="panel-section">
        <span class="section-label">데이터 (0~20)</span>
        <table class="data-table" id="dataTable">
          <thead><tr><th>#</th><th>x</th><th>y</th></tr></thead>
          <tbody id="dataBody"></tbody>
        </table>
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" id="btnSample">샘플 생성</button>
        <button class="btn btn-ghost" id="btnReset">초기화</button>
      </div>
    </div>

    <!-- 중간: 캔버스 -->
    <div class="panel-mid">
      <canvas id="mainCanvas"></canvas>
    </div>

    <!-- 우측: 슬라이더 + MSE -->
    <div class="panel-right">
      <div class="panel-section">
        <span class="section-label" style="color:#e74c3c;">직선 1 (빨강)</span>
        <div class="slider-row">
          <label>a₁</label>
          <input type="range" id="slider1" min="0" max="20" step="0.1" value="1.0">
          <span class="slider-val" id="val1" style="color:#e74c3c;">1.0</span>
        </div>
      </div>
      <div class="panel-section">
        <span class="section-label" style="color:#2980b9;">직선 2 (파랑)</span>
        <div class="slider-row">
          <label>a₂</label>
          <input type="range" id="slider2" min="0" max="20" step="0.1" value="2.0">
          <span class="slider-val" id="val2" style="color:#2980b9;">2.0</span>
        </div>
      </div>

      <div class="panel-section">
        <span class="section-label">손실함수 (MSE)</span>
        <div class="formula-box" id="formulaBox1">
          데이터를 입력하면 식이 표시됩니다.
        </div>
        <div class="formula-box" id="formulaBox2" style="margin-top:4px;">
          &nbsp;
        </div>
      </div>

      <div class="panel-section">
        <span class="section-label">MSE 비교</span>
        <div class="compare-row">
          <div class="compare-cell" id="cell1">
            <div class="c-label">직선 1</div>
            <div class="c-val" id="mseVal1">—</div>
          </div>
          <div class="compare-cell" id="cell2">
            <div class="c-label">직선 2</div>
            <div class="c-val" id="mseVal2">—</div>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <button class="btn btn-primary" id="btnOptimal">최적 추세선 표시</button>
        <div class="result-box" id="optimalBox">
          <div class="result-row">
            <span class="result-label">MSE(a) =</span>
            <span style="font-size:0.7rem;font-family:monospace;" id="optFormula"></span>
          </div>
          <div class="result-row">
            <span class="result-label">최적 기울기 a*</span>
            <span class="result-val" id="optA">—</span>
          </div>
          <div class="result-row">
            <span class="result-label">최솟값 MSE(a*)</span>
            <span class="result-val" id="optMSE">—</span>
          </div>
        </div>
      </div>
    </div>

  </main>
  <script src="lesson2-script.js"></script>
</body>
</html>
```

- [ ] **Step 2: lesson2-script.js 작성**

**데이터 모델 + 수학 함수:**
```javascript
var pts = [];
var a1 = 1.0, a2 = 2.0;
var showOptimal = false;

// 샘플 생성: y ≈ slope*x (0~20 범위, 원점 근처)
function generateSample() {
  var slope = 0.5 + Math.random() * 2.0;
  var result = [];
  for (var i = 0; i < 8; i++) {
    var x = Math.round((2 + Math.random() * 14) * 10) / 10;
    var noise = (Math.random() - 0.5) * slope * x * 0.5;
    var y = Math.round(Math.min(20, Math.max(0.1, slope * x + noise)) * 10) / 10;
    result.push({x: x, y: y});
  }
  return result;
}

function mse(a) {
  if (pts.length === 0) return 0;
  var sum = 0;
  pts.forEach(function(p){ sum += (p.y - a * p.x) * (p.y - a * p.x); });
  return sum / pts.length;
}

function optimalA() {
  var sumXY = 0, sumX2 = 0;
  pts.forEach(function(p){ sumXY += p.x * p.y; sumX2 += p.x * p.x; });
  return sumX2 === 0 ? 0 : sumXY / sumX2;
}
```

**캔버스 그리기 (고정 0~20 범위):**
```javascript
var canvas = document.getElementById('mainCanvas');
var ctx = canvas.getContext('2d');
var MARGIN = {top: 24, right: 24, bottom: 44, left: 48};
var XMIN = 0, XMAX = 20, YMIN = 0, YMAX = 20;

function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; redraw(); }
window.addEventListener('resize', resize);

function toPixel(x, y) {
  var w = canvas.width - MARGIN.left - MARGIN.right;
  var h = canvas.height - MARGIN.top - MARGIN.bottom;
  return {
    px: MARGIN.left + x / 20 * w,
    py: MARGIN.top + (1 - y / 20) * h
  };
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  drawGrid();
  // 잔차선 (각 점에서 직선까지 수직선)
  if (pts.length > 0) {
    drawResiduals(a1, '#e74c3c');
    drawResiduals(a2, '#2980b9');
  }
  // y=ax 두 직선
  drawAxLine(a1, '#e74c3c', 'y = '+a1.toFixed(1)+'x');
  drawAxLine(a2, '#2980b9', 'y = '+a2.toFixed(1)+'x');
  // 최적 직선
  if (showOptimal) {
    var aOpt = optimalA();
    drawAxLine(aOpt, '#27ae60', 'y* = '+aOpt.toFixed(2)+'x');
  }
  // 데이터 포인트
  pts.forEach(function(p) {
    var px = toPixel(p.x, p.y);
    ctx.beginPath(); ctx.arc(px.px, px.py, 5, 0, 2*Math.PI);
    ctx.fillStyle = '#2d3748'; ctx.fill();
  });
}

function drawGrid() {
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (var v = 0; v <= 20; v += 5) {
    var vp = toPixel(v, 0), hp = toPixel(0, v);
    ctx.beginPath(); ctx.moveTo(vp.px, MARGIN.top); ctx.lineTo(vp.px, canvas.height-MARGIN.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(MARGIN.left, hp.py); ctx.lineTo(canvas.width-MARGIN.right, hp.py); ctx.stroke();
    ctx.fillStyle = '#718096'; ctx.font = '11px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(v, vp.px, canvas.height-MARGIN.bottom+14);
    ctx.textAlign = 'right';  ctx.fillText(v, MARGIN.left-5, hp.py+4);
  }
}

function drawAxLine(a, color, label) {
  // y = a*x는 (0,0)에서 (20, 20a)까지 — 단, 범위 내로 클리핑
  var yAt20 = Math.min(a * 20, 20);
  var xAtYMax = a > 0 ? Math.min(20 / a, 20) : 20;
  var p1 = toPixel(0, 0), p2 = toPixel(xAtYMax, Math.min(a * xAtYMax, 20));
  ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py);
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  // 레이블
  var midX = xAtYMax * 0.6, midY = Math.min(a * midX, 19);
  var mp = toPixel(midX, midY);
  ctx.fillStyle = color; ctx.font = 'bold 12px Courier New, monospace';
  ctx.textAlign = 'left'; ctx.fillText(label, mp.px + 4, mp.py - 5);
}

function drawResiduals(a, color) {
  ctx.setLineDash([3, 3]); ctx.strokeStyle = color + '88'; ctx.lineWidth = 1;
  pts.forEach(function(p) {
    var yhat = Math.min(a * p.x, 20);
    var top = toPixel(p.x, p.y), bot = toPixel(p.x, yhat);
    ctx.beginPath(); ctx.moveTo(top.px, top.py); ctx.lineTo(bot.px, bot.py); ctx.stroke();
  });
  ctx.setLineDash([]);
}
```

**MSE 수식 표시 (처음 3항 + ...):**
```javascript
function updateFormulaDisplay() {
  if (pts.length === 0) {
    document.getElementById('formulaBox1').textContent = '데이터를 입력하면 식이 표시됩니다.';
    document.getElementById('formulaBox2').innerHTML = '&nbsp;';
    document.getElementById('mseVal1').textContent = '—';
    document.getElementById('mseVal2').textContent = '—';
    return;
  }
  function makeFormula(a, colorClass) {
    var terms = pts.slice(0, 3).map(function(p) {
      return '(' + p.y.toFixed(1) + '−' + a.toFixed(1) + '×' + p.x.toFixed(1) + ')²';
    });
    var suffix = pts.length > 3 ? ' + ···' : '';
    var mseVal = mse(a);
    return terms.join(' + ') + suffix + '\n÷ ' + pts.length + ' = <b>' + mseVal.toFixed(3) + '</b>';
  }
  document.getElementById('formulaBox1').innerHTML = makeFormula(a1, 'red');
  document.getElementById('formulaBox2').innerHTML = makeFormula(a2, 'blue');
  var mse1 = mse(a1), mse2 = mse(a2);
  document.getElementById('mseVal1').textContent = mse1.toFixed(3);
  document.getElementById('mseVal2').textContent = mse2.toFixed(3);
  var c1 = document.getElementById('cell1'), c2 = document.getElementById('cell2');
  c1.classList.toggle('winner', mse1 < mse2);
  c2.classList.toggle('winner', mse2 < mse1);
}
```

**슬라이더 이벤트:**
```javascript
document.getElementById('slider1').addEventListener('input', function() {
  a1 = +this.value;
  document.getElementById('val1').textContent = a1.toFixed(1);
  redraw(); updateFormulaDisplay();
});
document.getElementById('slider2').addEventListener('input', function() {
  a2 = +this.value;
  document.getElementById('val2').textContent = a2.toFixed(1);
  redraw(); updateFormulaDisplay();
});
```

**최적 추세선 버튼:**
```javascript
document.getElementById('btnOptimal').addEventListener('click', function() {
  showOptimal = !showOptimal;
  this.textContent = showOptimal ? '최적 추세선 숨기기' : '최적 추세선 표시';
  var box = document.getElementById('optimalBox');
  if (showOptimal && pts.length > 0) {
    var aOpt = optimalA();
    var mseOpt = mse(aOpt);
    // 정리 안 된 식 표시
    var terms = pts.slice(0,3).map(function(p){
      return '('+p.y.toFixed(1)+'−a·'+p.x.toFixed(1)+')²';
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
```

**데이터 테이블 관리 + 샘플 생성:**
```javascript
// updateTable(): lesson1과 동일 구조, x/y 범위 0~20 힌트 표시
// 변경 시 pts 갱신, redraw(), updateFormulaDisplay() 호출
function updateTable() { /* lesson1과 동일 패턴, placeholder="0~20" */ }

document.getElementById('btnSample').addEventListener('click', function() {
  pts = generateSample(); showOptimal = false;
  document.getElementById('optimalBox').classList.remove('visible');
  document.getElementById('btnOptimal').textContent = '최적 추세선 표시';
  updateTable(); redraw(); updateFormulaDisplay();
});
document.getElementById('btnReset').addEventListener('click', function() {
  pts = []; showOptimal = false;
  document.getElementById('optimalBox').classList.remove('visible');
  updateTable(); redraw(); updateFormulaDisplay();
});
resize(); updateTable();
```

- [ ] **Step 3: 브라우저 확인**
  - 슬라이더로 a₁, a₂ 변경 → 직선 2개 실시간 갱신
  - MSE 수식: 처음 3항 + ···, 값 표시
  - 더 낮은 MSE 셀에 보라 강조
  - [최적 추세선 표시] → 초록 직선 + 결과 박스 등장
  - 잔차선(점선)이 각 데이터 포인트에서 직선까지 표시

- [ ] **Step 4: 커밋**

```bash
git add lesson2.html lesson2-script.js
git commit -m "feat: 2차시 y=ax 직선 비교와 MSE (lesson2)"
```

---

### Task 5: lesson3.html + lesson3-script.js — 손실함수와 최솟값

**Files:**
- Create: `lesson3.html`
- Create: `lesson3-script.js`

**Interfaces:**
- Consumes: `lesson-common.css`
- Produces: 좌측 산점도 + 중앙 MSE 포물선 + 우측 단계별 전개 + 최솟값 탐색

- [ ] **Step 1: lesson3.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3차시 — 손실함수와 최솟값</title>
  <link rel="stylesheet" href="lesson-common.css">
  <style>
    /* 좌측 패널: 산점도 캔버스 + 데이터 테이블 */
    #scatterCanvas { width: 100%; height: 180px; border-radius: 8px; border: 1px solid var(--border); }
    /* 중간 패널: MSE 포물선 캔버스 전체 채움 */
    #parabolaCanvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    /* a 슬라이더 값 색상 */
    #aVal { color: var(--accent); font-weight: 700; }
  </style>
</head>
<body>
  <header class="lesson-header">
    <a href="index.html" class="back-link">← 목록</a>
    <span class="lesson-title">3차시 — 손실함수와 최솟값</span>
  </header>
  <main class="lesson-body">

    <!-- 좌측: 산점도 + 데이터 -->
    <div class="panel-left">
      <div class="panel-section">
        <span class="section-label">산점도</span>
        <canvas id="scatterCanvas"></canvas>
      </div>
      <div class="panel-section">
        <span class="section-label">데이터 (0~20)</span>
        <table class="data-table" id="dataTable">
          <thead><tr><th>#</th><th>x</th><th>y</th></tr></thead>
          <tbody id="dataBody"></tbody>
        </table>
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" id="btnSample">샘플 생성</button>
        <button class="btn btn-ghost" id="btnReset">초기화</button>
      </div>
    </div>

    <!-- 중간: MSE 포물선 -->
    <div class="panel-mid">
      <canvas id="parabolaCanvas"></canvas>
    </div>

    <!-- 우측: 슬라이더 + 단계별 전개 + 최솟값 -->
    <div class="panel-right">
      <div class="panel-section">
        <span class="section-label">기울기 a 선택</span>
        <div class="slider-row">
          <label>a</label>
          <input type="range" id="aSlider" min="0" max="5" step="0.01" value="1.0">
          <span id="aVal">1.00</span>
        </div>
        <div class="result-row" style="margin-top:4px;">
          <span class="result-label">MSE(a) =</span>
          <span class="result-val" id="mseDisplay">—</span>
        </div>
      </div>

      <div class="panel-section">
        <span class="section-label">손실함수 전개</span>
        <div class="formula-box">
          <div id="step1">
            MSE(a) = [(y₁−ax₁)² + (y₂−ax₂)² + ··· + (yₙ−axₙ)²] / n
          </div>
          <div class="formula-step" id="step2">
            = (Σxᵢ²/n)·a² − 2(Σxᵢyᵢ/n)·a + Σyᵢ²/n
          </div>
          <div class="formula-step" id="step3">
            = <span id="coefA">—</span>·a² − <span id="coefB">—</span>·a + <span id="coefC">—</span>
          </div>
        </div>
        <button class="btn btn-secondary" id="btnNextStep">다음 단계 →</button>
      </div>

      <div class="panel-section" id="minSection" style="display:none;">
        <button class="btn btn-primary" id="btnFindMin">최솟값 찾기</button>
        <div class="result-box" id="minBox">
          <div class="result-row">
            <span class="result-label">꼭짓점 공식</span>
            <span style="font-size:0.76rem;font-family:monospace;">a* = B / (2A)</span>
          </div>
          <div class="result-row">
            <span class="result-label">최적 a*</span>
            <span class="result-val" id="minA">—</span>
          </div>
          <div class="result-row">
            <span class="result-label">최솟값 MSE(a*)</span>
            <span class="result-val" id="minMSE">—</span>
          </div>
        </div>
      </div>
    </div>

  </main>
  <script src="lesson3-script.js"></script>
</body>
</html>
```

- [ ] **Step 2: lesson3-script.js 작성**

**데이터 모델 + 수학:**
```javascript
var pts = [];
var currentA = 1.0;
var stepShown = 1;   // 1, 2, 3 (현재 보여진 단계)
var animating = false;

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

// 샘플 생성 (lesson2와 동일)
function generateSample() {
  var slope = 0.5 + Math.random() * 2.0;
  var result = [];
  for (var i = 0; i < 8; i++) {
    var x = Math.round((2 + Math.random() * 14) * 10) / 10;
    var noise = (Math.random() - 0.5) * slope * x * 0.5;
    var y = Math.round(Math.min(20, Math.max(0.1, slope*x + noise)) * 10) / 10;
    result.push({x:x, y:y});
  }
  return result;
}
```

**좌측 산점도 캔버스:**
```javascript
var scatterCanvas = document.getElementById('scatterCanvas');
var sCtx = scatterCanvas.getContext('2d');

function resizeScatter() {
  scatterCanvas.width = scatterCanvas.offsetWidth;
  scatterCanvas.height = scatterCanvas.offsetHeight;
  redrawScatter();
}

function redrawScatter() {
  var w = scatterCanvas.width, h = scatterCanvas.height;
  var M = {t:10, r:10, b:24, l:28};
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
    sCtx.fillStyle='#718096'; sCtx.font='9px sans-serif';
    sCtx.textAlign='center'; sCtx.fillText(v,vp.px,h-M.b+10);
    sCtx.textAlign='right';  sCtx.fillText(v,M.l-3,hp.py+3);
  });
  // 현재 y=ax 추세선
  if (pts.length > 0) {
    var yAt20 = Math.min(currentA*20, 20);
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
```

**중간 MSE 포물선 캔버스:**
```javascript
var pCanvas = document.getElementById('parabolaCanvas');
var pCtx = pCanvas.getContext('2d');
var PM = {top:30, right:30, bottom:50, left:55};

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

  // x축 범위: 0 ~ max(aStar*2, 5), 단 최소 2
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
    pCtx.fillStyle='#718096'; pCtx.font='11px sans-serif'; pCtx.textAlign='center';
    pCtx.fillText(v.toFixed(1), p.px, h-PM.bottom+14);
  });
  mTicks.forEach(function(v){
    var p=tp(0,v); pCtx.beginPath(); pCtx.moveTo(PM.left,p.py); pCtx.lineTo(w-PM.right,p.py); pCtx.stroke();
    pCtx.fillStyle='#718096'; pCtx.font='11px sans-serif'; pCtx.textAlign='right';
    pCtx.fillText(v.toFixed(2), PM.left-6, p.py+4);
  });
  // 축 레이블
  pCtx.fillStyle='#718096'; pCtx.font='12px sans-serif'; pCtx.textAlign='center';
  pCtx.fillText('기울기 a', w/2, h-8);
  pCtx.save(); pCtx.translate(14, h/2); pCtx.rotate(-Math.PI/2);
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

  // 최솟값 ★ 표시
  var starP = tp(aStar, coeffs.mseStar);
  pCtx.font = '18px sans-serif'; pCtx.fillStyle = '#f6ad55'; pCtx.textAlign = 'center';
  pCtx.fillText('★', starP.px, starP.py - 4);
  // a* 수직 점선
  pCtx.setLineDash([4,4]); pCtx.strokeStyle = '#f6ad55'; pCtx.lineWidth = 1;
  pCtx.beginPath(); pCtx.moveTo(starP.px, starP.py); pCtx.lineTo(starP.px, h-PM.bottom); pCtx.stroke();
  pCtx.setLineDash([]);
  // a* 레이블 (x축)
  pCtx.fillStyle = '#fff'; pCtx.fillRect(starP.px-18, h-PM.bottom+2, 36, 16);
  pCtx.fillStyle = '#f6ad55'; pCtx.font = 'bold 11px sans-serif'; pCtx.textAlign = 'center';
  pCtx.fillText('a*='+aStar.toFixed(2), starP.px, h-PM.bottom+13);
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
  document.getElementById('aSlider').value = Math.min(currentA, 5);
  updateADisplay();
});

function niceTicks(min, max, count) {
  var range = max - min, rawStep = range / count;
  var mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  var norm = rawStep / mag;
  var step = norm<1.5?mag:norm<3.5?2*mag:norm<7.5?5*mag:10*mag;
  var start = Math.ceil(min/step)*step, ticks = [];
  for (var v=start; v<=max+1e-9; v+=step) ticks.push(Math.round(v*1e9)/1e9);
  return ticks;
}
```

**슬라이더 + 수식 업데이트:**
```javascript
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
  document.getElementById('coefA').textContent = c.A.toFixed(4);
  document.getElementById('coefB').textContent = c.B.toFixed(4);
  document.getElementById('coefC').textContent = c.C.toFixed(4);
  // 슬라이더 범위 조정
  var aMax = Math.max(c.aStar * 2.5, 5);
  document.getElementById('aSlider').max = aMax.toFixed(1);
}
```

**단계별 전개 버튼:**
```javascript
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
```

**최솟값 찾기 버튼 + 애니메이션:**
```javascript
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
```

**샘플 생성 + 데이터 테이블:**
```javascript
function resetSteps() {
  stepShown = 1;
  document.getElementById('step2').classList.remove('visible');
  document.getElementById('step3').classList.remove('visible');
  document.getElementById('btnNextStep').textContent = '다음 단계 →';
  document.getElementById('btnNextStep').disabled = false;
  document.getElementById('minSection').style.display = 'none';
  document.getElementById('minBox').classList.remove('visible');
}

function updateTable() {
  // lesson2와 동일 패턴: pts를 표시, 빈 행 추가
  // 변경 시 pts 갱신, updateCoeffDisplay(), updateADisplay(), resizeScatter(), redrawParabola() 호출
  var body = document.getElementById('dataBody');
  body.innerHTML = '';
  pts.forEach(function(p, i) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="text-align:center;color:var(--text-muted)">' + (i+1) + '</td>'
      + '<td><input type="number" value="' + p.x + '" min="0" max="20" step="0.1"></td>'
      + '<td><input type="number" value="' + p.y + '" min="0" max="20" step="0.1"></td>';
    var inputs = tr.querySelectorAll('input');
    inputs[0].addEventListener('change', function() { pts[i].x=+this.value; updateCoeffDisplay(); updateADisplay(); });
    inputs[1].addEventListener('change', function() { pts[i].y=+this.value; updateCoeffDisplay(); updateADisplay(); });
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

// 초기화
resizeScatter(); resizeParabola(); updateTable();
```

- [ ] **Step 3: 브라우저 확인**
  - 샘플 생성 → 좌측 산점도 + 중앙 포물선 동시 표시
  - 슬라이더/캔버스 클릭 → 빨간 점 + 추세선 실시간 갱신
  - [다음 단계 →] 두 번 → step2, step3 순서대로 등장, 계수 값 표시
  - [최솟값 찾기] → 빨간 점이 ★ 위치로 애니메이션, 결과 박스 등장
  - ★ 위치에 수직 점선 + a* 레이블

- [ ] **Step 4: 커밋**

```bash
git add lesson3.html lesson3-script.js
git commit -m "feat: 3차시 손실함수와 최솟값 (lesson3)"
```

---

### Task 6: lesson5.html + lesson5-script.js — 경사하강법 (gradient.html 재활용)

**Files:**
- Restore from git: `gradient.html`, `gradient-script.js`, `gradient-style.css`
- Create: `lesson5.html` (gradient.html 기반, CSS 교체)
- Create: `lesson5-script.js` (gradient-script.js 기반, 샘플 함수 교체)

**Interfaces:**
- Consumes: `lesson-common.css`, `gradient-script.js`에서 파생된 `lesson5-script.js`
- Produces: 경사하강법 탐구 페이지 (lesson-common.css 스타일로 통일)

- [ ] **Step 1: gradient 파일 복원**

```bash
git checkout HEAD -- gradient.html gradient-script.js gradient-style.css
```

- [ ] **Step 2: lesson5.html 생성**

gradient.html을 복사하여 lesson5.html 생성 후 다음 변경:
1. `<title>`: `5차시 — 경사하강법`
2. `<link>`: `gradient-style.css` 제거, `lesson-common.css` 추가
3. `<script src>`: `gradient-script.js` → `lesson5-script.js`
4. 헤더 HTML 클래스를 lesson-common.css 클래스로 교체:
   - 기존 `<header>` → `<header class="lesson-header">`
   - 기존 헤더 내 텍스트 → `<a href="index.html" class="back-link">← 목록</a><span class="lesson-title">5차시 — 경사하강법</span>`
5. 좌측·중간·우측 패널 wrapper div에 `.panel-left`, `.panel-mid`, `.panel-right` 클래스 추가 (기존 클래스 유지하되 공통 클래스 병행)
6. 버튼에 `.btn` + `.btn-primary` / `.btn-secondary` 클래스 추가 (기존 클래스 유지)
7. 본문 최상위 flex wrapper에 `.lesson-body` 추가

> **참고**: gradient-script.js는 기존 CSS 클래스명으로 DOM을 조작하므로, 기존 클래스를 제거하지 말고 lesson-common.css 클래스를 **추가**하는 방식으로 적용한다.

- [ ] **Step 3: lesson5-script.js 생성**

gradient-script.js를 복사하여 lesson5-script.js 생성 후 다음만 변경:

샘플 생성 함수 교체 (기존 `generateSampleData` 또는 유사 함수 찾아 교체):
```javascript
// 기존 샘플 생성 함수를 찾아 아래로 교체
// (기존: 임의 x, y 범위 데이터 / 신규: y ≈ ax 형태, 원점 근처)
function generateSampleData() {
  var slope = 0.6 + Math.random() * 1.8;
  var data = [];
  for (var i = 0; i < 8; i++) {
    var x = Math.round((2 + Math.random() * 14) * 10) / 10;
    var noise = (Math.random() - 0.5) * slope * x * 0.5;
    var y = Math.round(Math.min(20, Math.max(0.2, slope * x + noise)) * 10) / 10;
    data.push({x: x, y: y});
  }
  return data;
}
```

> gradient-script.js에서 샘플 생성 함수의 정확한 이름을 확인하고 위 내용으로 교체한다. 다른 코드는 수정하지 않는다.

- [ ] **Step 4: lesson-common.css에서 lesson5 전용 스타일 보완**

lesson5.html을 브라우저에서 열어 gradient-style.css 없이 올바르게 표시되는지 확인한다.
깨지는 부분이 있다면 lesson5.html의 `<style>` 블록에 페이지별 오버라이드를 추가한다 (lesson-common.css 수정 금지).

예시:
```html
<style>
  /* lesson5 전용 보정 */
  .gd-table { font-size: 0.78rem; }
  .step-badge { ... }
</style>
```

- [ ] **Step 5: 브라우저 확인**
  - 헤더 스타일이 lesson1~3과 동일하게 보임
  - ← 목록 클릭 → index.html 이동
  - 샘플 생성 시 원점 근처를 지나는 데이터 생성
  - 경사하강법 기능 정상 작동 (재생, 정지, 단계, 리셋)

- [ ] **Step 6: 커밋**

```bash
git add lesson5.html lesson5-script.js
git commit -m "feat: 5차시 경사하강법 lesson5 (gradient 재활용 + 스타일 통일)"
```

---

## 최종 검증

모든 태스크 완료 후:

- [ ] index.html에서 lesson1~3, lesson5 링크 모두 작동
- [ ] 5개 페이지 헤더 높이·폰트·색상이 동일
- [ ] lesson4 카드는 비활성 (회색, 클릭 불가)
- [ ] 더블클릭으로 index.html 열면 모든 링크 정상 작동
- [ ] iPad 가로 모드 시뮬레이션 (브라우저 DevTools: 1024×768): 3패널이 화면에 꽉 참

```bash
git log --oneline -10
```
최근 커밋 6개 이상 확인.
