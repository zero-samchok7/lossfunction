# 수식 LaTeX 렌더링 구현 안내 (KaTeX 오프라인)

> 더블클릭으로 바로 열리는 정적 파일 구조를 유지하면서,  
> 교과서 수준의 수식 렌더링(KaTeX v0.17.0)을 오프라인으로 적용한 내역입니다.

---

## 추가된 파일 구조

```
lib/
└── katex/
    ├── katex.min.css          ← 수식 스타일
    ├── katex.min.js           ← 렌더링 엔진
    ├── contrib/
    │   └── auto-render.min.js ← \(...\) / \[...\] 자동 감지
    └── fonts/
        └── KaTeX_*.woff2      ← 수학 전용 폰트 21종
```

- **버전:** KaTeX v0.17.0
- **설치:** `npm install katex` → `lib/katex/` 에 복사
- **인터넷 불필요:** 모든 파일이 로컬에 포함되어 오프라인에서도 작동

---

## 각 파일 변경 내역

### lesson1.html

**변경 내용:** KaTeX 로드 추가 (수식 변환 없음)

```html
<!-- <head> -->
<link rel="stylesheet" href="lib/katex/katex.min.css">

<!-- </body> 직전 -->
<script src="lib/katex/katex.min.js"></script>
<script src="lesson1-script.js"></script>
<script src="lib/katex/contrib/auto-render.min.js"></script>
<script>renderMathInElement(document.body, {...});</script>
```

---

### lesson2.html + lesson2-script.js

**변경 내용:** MSE 전개식을 KaTeX로 실시간 렌더링

`lesson2.html` — formula-box에 가로 스크롤 처리 추가:
```css
.formula-box { overflow-x: auto; }
.formula-box .katex-display { margin: 0.3em 0; }
```

`lesson2-script.js` — `makeFormula()` 함수를 LaTeX 출력으로 전환:

| 이전 | 이후 |
|------|------|
| `(5.2−1.0×3.1)²` 같은 HTML 문자열 | `\dfrac{(5.2-1.0\cdot3.1)^2+\cdots}{n}` LaTeX 문자열 |
| `innerHTML`에 HTML 직접 삽입 | `katex.renderToString(latex, {displayMode:true})` 사용 |

**렌더링 결과 예시:**

$$\dfrac{(5.2-1.0\cdot3.1)^2+(8.4-1.0\cdot5.6)^2+(9.1-1.0\cdot6.2)^2+\cdots}{10} = 1.234$$

---

### lesson3.html + lesson3-script.js

**변경 내용:** 손실함수 전개 3단계를 모두 LaTeX로 전환

#### step1 (정적 HTML → LaTeX)

```
MSE(a) = (1/n) × [(y₁−ax₁)² + ...] 형태의 텍스트
```
↓
```latex
\[\text{MSE}(a) = \frac{1}{n}\bigl[(y_1-ax_1)^2+(y_2-ax_2)^2+\cdots+(y_n-ax_n)^2\bigr]\]
```

#### step2 (정적 HTML → LaTeX)

```
= (Σxᵢ²/n)·a² − 2(Σxᵢyᵢ/n)·a + Σyᵢ²/n 형태의 텍스트
```
↓
```latex
\[= \frac{\sum x_i^2}{n}\cdot a^2 - \frac{2\sum x_i y_i}{n}\cdot a + \frac{\sum y_i^2}{n}\]
```

#### step3 (동적 — JS에서 katex.renderToString 사용)

`updateCoeffDisplay()` 에서 계수가 계산되면 자동으로 렌더링:
```javascript
var latex = '= \\textcolor{#6c5ce7}{' + A + '}\\,a^2'
          + ' - \\textcolor{#6c5ce7}{' + B + '}\\,a'
          + ' + \\textcolor{#6c5ce7}{' + C + '}';
document.getElementById('step3').innerHTML =
  katex.renderToString(latex, {throwOnError: false, displayMode: true});
```
계수 A, B, C가 보라색으로 강조 표시됩니다.

#### 꼭짓점 공식 (정적 → LaTeX)

```
a* = B / (2A)  →  \(a^* = \dfrac{B}{2A}\)
```

---

### lesson4a.html

**변경 내용:** MSE(a,b) 정의 공식을 LaTeX로 전환

```
MSE(a,b) =
 (1/n) × Σ(yᵢ − axᵢ − b)²
```
↓
```latex
\[\text{MSE}(a,b) = \frac{1}{n}\sum_{i=1}^{n}(y_i - ax_i - b)^2\]
```

> 아래의 계수 전개식(`= A·a² + B·b² + C·ab − ...`)은 데이터에 따라 동적으로 바뀌므로  
> 기존 HTML 스팬(span) 방식을 유지합니다.

---

### lesson4b.html

**변경 내용:** 경사하강법 공식을 LaTeX로 전환

```
a_new = a_old − α × (접선의 기울기)
```
↓
```latex
\(a_{\text{new}} = a_{\text{old}} - \alpha \times (\text{접선의 기울기})\)
```

---

### lesson5.html

**변경 내용:** lesson4b.html과 동일

```latex
\(a_{\text{new}} = a_{\text{old}} - \alpha \times (\text{접선의 기울기})\)
```

---

## KaTeX 로드 방식 (모든 차시 공통)

각 HTML 파일의 `</body>` 직전 구조:

```html
<!-- 1. KaTeX 엔진 (레슨 스크립트보다 먼저 — JS에서 katex 객체 사용 가능) -->
<script src="lib/katex/katex.min.js"></script>

<!-- 2. 레슨 스크립트 (필요 시 katex.renderToString() 사용) -->
<script src="lessonN-script.js"></script>

<!-- 3. 자동 렌더러 -->
<script src="lib/katex/contrib/auto-render.min.js"></script>
<script>
  renderMathInElement(document.body, {
    delimiters: [
      {left: "\\(", right: "\\)", display: false},
      {left: "\\[", right: "\\]", display: true}
    ],
    throwOnError: false
  });
</script>
```

### 렌더링 방식 구분

| 구분 | 방식 | 적용 위치 |
|------|------|----------|
| 정적 수식 | HTML에 `\(...\)` / `\[...\]` 작성 → auto-render | lesson3 step1·2, lesson4a 정의, lesson4b·5 공식 |
| 동적 수식 | JS에서 `katex.renderToString()` 호출 | lesson2 전개식, lesson3 step3 계수 |

---

## 주의 사항

- `node_modules/` 폴더는 git에 포함되지 않습니다 (`.gitignore` 권장).  
  실제 서빙에 필요한 파일은 `lib/katex/` 에 이미 복사되어 있습니다.
- 수식이 넓을 경우 `.formula-box { overflow-x: auto; }` 가 적용되어 가로 스크롤이 생깁니다.
- `\textcolor{#6c5ce7}{...}` 는 KaTeX v0.10.1+ 에서 지원됩니다.
