/* ===== 데이터 모델 ===== */
var pts = [];
var curA = 1.0, curB = 0.0;

/* ===== MSE 계산 ===== */
function mse(a, b) {
    if (pts.length === 0) return 0;
    var s = 0;
    pts.forEach(function(p) { var e = p.y - a * p.x - b; s += e * e; });
    return s / pts.length;
}

/* ===== 2변수 MSE 이차형식 계수 계산 =====
   MSE(a,b) = Aa² + Bb² + Cab - Da - Eb + F
*/
function computeCoeffs() {
    var n = pts.length;
    if (n < 2) return null;
    var sx2 = 0, s1 = 0, sxy = 0, sy = 0, sx = 0, sy2 = 0;
    pts.forEach(function(p) {
        sx2 += p.x * p.x;
        sx  += p.x;
        sxy += p.x * p.y;
        sy  += p.y;
        sy2 += p.y * p.y;
    });
    /* MSE(a,b) = (1/n)[Σ(y-ax-b)²]
       = (Σx²/n)·a² + b² + (2Σx/n)·ab - (2Σxy/n)·a - (2Σy/n)·b + Σy²/n */
    var A = sx2 / n;
    var B = 1;
    var C = 2 * sx / n;
    var D = 2 * sxy / n;
    var E = 2 * sy / n;
    var F = sy2 / n;
    /* 최적해: 편미분 = 0
       ∂MSE/∂a = 2Aa + Cb - D = 0
       ∂MSE/∂b = 2Bb + Ca - E = 0
       → [2A  C][a]   [D]
          [C  2B][b] = [E]
       det = 4AB - C²
    */
    var det = 4 * A * B - C * C;
    var aStar = det !== 0 ? (2 * B * D - C * E) / det : 0;
    var bStar = det !== 0 ? (2 * A * E - C * D) / det : 0;
    var mseStar = mse(aStar, bStar);
    return { A: A, B: B, C: C, D: D, E: E, F: F, aStar: aStar, bStar: bStar, mseStar: mseStar };
}

/* ===== 슬라이더 범위 조정 ===== */
function updateSliderRanges(c) {
    var aR = Math.max(Math.abs(c.aStar) * 2.5, 3);
    var bR = Math.max(Math.abs(c.bStar) * 2.5, 5);
    document.getElementById('sliderA').min = (c.aStar - aR).toFixed(1);
    document.getElementById('sliderA').max = (c.aStar + aR).toFixed(1);
    document.getElementById('sliderB').min = (c.bStar - bR).toFixed(1);
    document.getElementById('sliderB').max = (c.bStar + bR).toFixed(1);
    /* 현재값이 범위 밖이면 최적값으로 초기화 */
    curA = +document.getElementById('sliderA').value;
    curB = +document.getElementById('sliderB').value;
    if (curA < +document.getElementById('sliderA').min || curA > +document.getElementById('sliderA').max) {
        curA = c.aStar; document.getElementById('sliderA').value = curA;
    }
    if (curB < +document.getElementById('sliderB').min || curB > +document.getElementById('sliderB').max) {
        curB = c.bStar; document.getElementById('sliderB').value = curB;
    }
}

/* ===== UI 업데이트 ===== */
function updateInfo() {
    var c = computeCoeffs();
    document.getElementById('valA').textContent = curA.toFixed(2);
    document.getElementById('valB').textContent = curB.toFixed(2);
    document.getElementById('curA').textContent = curA.toFixed(3);
    document.getElementById('curB').textContent = curB.toFixed(3);
    document.getElementById('curMSE').textContent = mse(curA, curB).toFixed(4);
    if (c) {
        document.getElementById('fA').textContent = c.A.toFixed(3);
        document.getElementById('fB').textContent = c.B.toFixed(3);
        document.getElementById('fC').textContent = c.C.toFixed(3);
        document.getElementById('fD').textContent = c.D.toFixed(3);
        document.getElementById('fE').textContent = c.E.toFixed(3);
        document.getElementById('fF').textContent = c.F.toFixed(3);
        document.getElementById('optA').textContent = c.aStar.toFixed(4);
        document.getElementById('optB').textContent = c.bStar.toFixed(4);
        document.getElementById('optMSE').textContent = c.mseStar.toFixed(4);
        document.getElementById('btnFindMin').disabled = false;
        document.getElementById('surfaceHint').style.display = 'none';
    } else {
        document.getElementById('btnFindMin').disabled = true;
        document.getElementById('surfaceHint').style.display = '';
    }
}

/* ===== 3D 회전 상태 ===== */
var rotX = 0.55;  /* elevation (라디안) */
var rotY = -0.8;  /* azimuth (라디안) */
var isDragging = false, dragStartX = 0, dragStartY = 0, dragRotX = 0, dragRotY = 0;

/* ===== 3D → 2D 투영 ===== */
/* 좌표계: a → X, b → Z, MSE → Y(위쪽이 낮음) */
function project(ax, mseVal, bz, canvasW, canvasH, scale) {
    /* Y축 회전 (azimuth) */
    var cy = Math.cos(rotY), sy = Math.sin(rotY);
    var x1 = ax * cy - bz * sy;
    var z1 = ax * sy + bz * cy;
    /* X축 회전 (elevation) */
    var cx = Math.cos(rotX), sx2 = Math.sin(rotX);
    var y1 = mseVal * cx - z1 * sx2;
    var z2 = mseVal * sx2 + z1 * cx;
    /* 원근 투영 */
    var d = 4.5;
    var sc = d / (d + z2 * 0.3);
    return {
        px: canvasW / 2 + x1 * scale * sc,
        py: canvasH / 2 - y1 * scale * sc * 0.7,
        depth: z2
    };
}

/* ===== 3D 곡면 그리기 ===== */
var canvas = document.getElementById('surfaceCvs');
var ctx = canvas.getContext('2d');
var GRID = 24; /* 격자 분할 수 */
var animating = false;

function resizeSurface() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    drawSurface();
}

function drawSurface() {
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);

    var c = computeCoeffs();
    if (!c) return;

    var aR = Math.max(Math.abs(c.aStar) * 2, 2.5);
    var bR = Math.max(Math.abs(c.bStar) * 2, 4);
    var aMin = c.aStar - aR, aMax = c.aStar + aR;
    var bMin = c.bStar - bR, bMax = c.bStar + bR;

    /* MSE 범위 계산 */
    var mseMin = c.mseStar;
    var mseAtCorner = Math.max(
        mse(aMin, bMin), mse(aMin, bMax),
        mse(aMax, bMin), mse(aMax, bMax)
    );
    var mseRange = mseAtCorner - mseMin;
    if (mseRange < 0.01) mseRange = 0.01;

    var scale = Math.min(w, h) * 0.28;

    /* 격자 셀별 메쉬 생성 */
    var grid = [];
    for (var i = 0; i <= GRID; i++) {
        grid[i] = [];
        for (var j = 0; j <= GRID; j++) {
            var a = aMin + (aMax - aMin) * i / GRID;
            var b = bMin + (bMax - bMin) * j / GRID;
            var m = mse(a, b);
            /* MSE 값을 [-1, 1] 범위로 정규화 */
            var normA = (a - c.aStar) / aR;
            var normB = (b - c.bStar) / bR;
            var normMSE = (m - mseMin) / mseRange; /* 그릇 모양: 최솟값이 아래 */
            var pr = project(normA, normMSE, normB, w, h, scale);
            grid[i][j] = { px: pr.px, py: pr.py, depth: pr.depth, mse: m };
        }
    }

    /* 셀을 depth 기준으로 정렬 (painter's algorithm) */
    var cells = [];
    for (var i = 0; i < GRID; i++) {
        for (var j = 0; j < GRID; j++) {
            var avgDepth = (grid[i][j].depth + grid[i+1][j].depth + grid[i][j+1].depth + grid[i+1][j+1].depth) / 4;
            var avgMSE   = (grid[i][j].mse  + grid[i+1][j].mse  + grid[i][j+1].mse  + grid[i+1][j+1].mse)   / 4;
            cells.push({ i: i, j: j, depth: avgDepth, mse: avgMSE });
        }
    }
    cells.sort(function(a, b) { return b.depth - a.depth; });

    /* 셀 그리기 */
    cells.forEach(function(cell) {
        var t = (cell.mse - mseMin) / mseRange;
        t = Math.max(0, Math.min(1, t));
        /* 낮을수록 초록(#48bb78), 높을수록 보라(#6c5ce7) */
        var r = Math.round(72  + (108 - 72)  * t);
        var g = Math.round(187 + (92  - 187) * t);
        var bv= Math.round(120 + (231 - 120) * t);

        var i = cell.i, j = cell.j;
        var p00 = grid[i][j], p10 = grid[i+1][j], p11 = grid[i+1][j+1], p01 = grid[i][j+1];
        ctx.beginPath();
        ctx.moveTo(p00.px, p00.py);
        ctx.lineTo(p10.px, p10.py);
        ctx.lineTo(p11.px, p11.py);
        ctx.lineTo(p01.px, p01.py);
        ctx.closePath();
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + bv + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });

    /* 최솟값 ★ 마커 */
    var starNorm = project(0, 0, 0, w, h, scale);
    ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('★', starNorm.px, starNorm.py);
    ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#276749';
    ctx.fillText('최솟값 (a*,b*)', starNorm.px, starNorm.py + 14);

    /* 현재 (curA, curB) 빨간 점 */
    var normCA = (curA - c.aStar) / aR;
    var normCB = (curB - c.bStar) / bR;
    var normCM = (mse(curA, curB) - mseMin) / mseRange;
    var cp = project(normCA, normCM, normCB, w, h, scale);
    ctx.beginPath();
    ctx.arc(cp.px, cp.py, 7, 0, 2 * Math.PI);
    ctx.fillStyle = '#e53e3e'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    /* 좌표축 */
    drawAxes(w, h, scale);
}

function drawAxes(w, h, scale) {
    var origin = project(0, 0, 0, w, h, scale);
    var axisLen = 1.35;

    function drawArrow(from, to, color, label) {
        ctx.beginPath();
        ctx.moveTo(from.px, from.py);
        ctx.lineTo(to.px, to.py);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        /* 화살촉 */
        var dx = to.px - from.px, dy = to.py - from.py;
        var len = Math.sqrt(dx*dx + dy*dy);
        if (len > 0) {
            var ux = dx/len, uy = dy/len;
            var s = 7;
            ctx.beginPath();
            ctx.moveTo(to.px, to.py);
            ctx.lineTo(to.px - s*(ux + uy*0.5), to.py - s*(uy - ux*0.5));
            ctx.lineTo(to.px - s*(ux - uy*0.5), to.py - s*(uy + ux*0.5));
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }
        /* 레이블 */
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(label, to.px + (dx > 0 ? 12 : -12), to.py + (dy > 0 ? 12 : -12));
    }

    var axA   = project(axisLen, 0, 0, w, h, scale);
    var axMSE = project(0, axisLen, 0, w, h, scale);
    var axB   = project(0, 0, axisLen, w, h, scale);

    drawArrow(origin, axA,   '#e53e3e', 'a');
    drawArrow(origin, axMSE, '#2b6cb0', 'MSE');
    drawArrow(origin, axB,   '#276749', 'b');
}

/* ===== 마우스/터치 드래그 회전 ===== */
var wrap = document.getElementById('surfaceWrap');

wrap.addEventListener('mousedown', function(e) {
    isDragging = true;
    dragStartX = e.clientX; dragStartY = e.clientY;
    dragRotX = rotX; dragRotY = rotY;
});
document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var dx = e.clientX - dragStartX, dy = e.clientY - dragStartY;
    rotY = dragRotY + dx * 0.008;
    rotX = Math.max(-1.2, Math.min(1.2, dragRotX - dy * 0.008));
    drawSurface();
});
document.addEventListener('mouseup', function() { isDragging = false; });

wrap.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return;
    isDragging = true;
    dragStartX = e.touches[0].clientX; dragStartY = e.touches[0].clientY;
    dragRotX = rotX; dragRotY = rotY;
}, { passive: true });
document.addEventListener('touchmove', function(e) {
    if (!isDragging || e.touches.length !== 1) return;
    var dx = e.touches[0].clientX - dragStartX, dy = e.touches[0].clientY - dragStartY;
    rotY = dragRotY + dx * 0.008;
    rotX = Math.max(-1.2, Math.min(1.2, dragRotX - dy * 0.008));
    drawSurface();
}, { passive: true });
document.addEventListener('touchend', function() { isDragging = false; });

/* ===== 슬라이더 이벤트 ===== */
document.getElementById('sliderA').addEventListener('input', function() {
    curA = +this.value;
    updateInfo(); drawSurface();
});
document.getElementById('sliderB').addEventListener('input', function() {
    curB = +this.value;
    updateInfo(); drawSurface();
});

/* ===== 최솟값 찾기 애니메이션 ===== */
document.getElementById('btnFindMin').addEventListener('click', function() {
    if (animating) return;
    var c = computeCoeffs();
    if (!c) return;
    var startA = curA, startB = curB;
    var targetA = c.aStar, targetB = c.bStar;
    var steps = 50, step = 0;
    animating = true;
    var slA = document.getElementById('sliderA'), slB = document.getElementById('sliderB');
    function animate() {
        step++;
        var t = step / steps;
        var ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        curA = startA + (targetA - startA) * ease;
        curB = startB + (targetB - startB) * ease;
        slA.value = curA; slB.value = curB;
        updateInfo(); drawSurface();
        if (step < steps) { requestAnimationFrame(animate); }
        else { curA = targetA; curB = targetB; slA.value = curA; slB.value = curB; updateInfo(); drawSurface(); animating = false; }
    }
    animate();
});

/* ===== 데이터 테이블 ===== */
function updateTable() {
    var body = document.getElementById('dataBody');
    body.innerHTML = '';
    pts.forEach(function(p, i) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td class="rn">' + (i + 1) + '</td>'
            + '<td><input type="number" value="' + p.x + '" step="0.1"></td>'
            + '<td><input type="number" value="' + p.y + '" step="0.1"></td>';
        var ins = tr.querySelectorAll('input');
        ins[0].classList.add('has-val'); ins[1].classList.add('has-val');
        ins[0].addEventListener('change', function() { pts[i].x = +this.value; onDataChange(); });
        ins[1].addEventListener('change', function() { pts[i].y = +this.value; onDataChange(); });
        body.appendChild(tr);
    });
    var blanks = Math.max(1, 15 - pts.length);
    for (var b = 0; b < blanks; b++) {
        (function(rowIdx) {
            var tr = document.createElement('tr');
            tr.innerHTML = '<td class="rn">' + (rowIdx + 1) + '</td>'
                + '<td><input type="number" step="0.1"></td>'
                + '<td><input type="number" step="0.1"></td>';
            var ins = tr.querySelectorAll('input');
            function tryAdd() {
                if (ins[0].value !== '' && ins[1].value !== '') {
                    pts.push({ x: +ins[0].value, y: +ins[1].value });
                    onDataChange(); updateTable();
                }
            }
            ins[0].addEventListener('change', tryAdd);
            ins[1].addEventListener('change', tryAdd);
            body.appendChild(tr);
        })(pts.length + b);
    }
}

function onDataChange() {
    var c = computeCoeffs();
    if (c) updateSliderRanges(c);
    updateInfo(); drawSurface();
}

/* ===== 샘플 생성 ===== */
function generateSample() {
    var a = 0.5 + Math.random() * 2.0;
    var b = -5 + Math.random() * 10;
    var result = [];
    for (var i = 0; i < 10; i++) {
        var x = Math.round((1 + Math.random() * 14) * 10) / 10;
        var noise = (Math.random() - 0.5) * Math.abs(a) * x * 0.4;
        var y = Math.round((a * x + b + noise) * 10) / 10;
        result.push({ x: x, y: y });
    }
    return result;
}

document.getElementById('btnSample').addEventListener('click', function() {
    pts = generateSample();
    curA = 1.0; curB = 0.0;
    document.getElementById('sliderA').value = 1.0;
    document.getElementById('sliderB').value = 0.0;
    updateTable(); onDataChange();
});
document.getElementById('btnReset').addEventListener('click', function() {
    pts = []; curA = 1.0; curB = 0.0;
    document.getElementById('sliderA').value = 1.0;
    document.getElementById('sliderB').value = 0.0;
    updateTable(); onDataChange();
});

window.addEventListener('resize', resizeSurface);

/* ===== 초기화 ===== */
updateTable();
updateInfo();
setTimeout(resizeSurface, 10);
