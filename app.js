/* ─────────────────────────────────────────
   AI Mermaid 다이어그램 생성기 · app.js
   ───────────────────────────────────────── */

// ── 유틸 ──────────────────────────────────
function getSaveLocalCheck() {
  return document.getElementById('saveLocalCheck');
}

function isSaveLocalEnabled() {
  return getSaveLocalCheck()?.checked ?? false;
}

// ── 테마 ──────────────────────────────────
function applyTheme(mode) {
  const isLight = mode === 'light';
  document.documentElement.classList.toggle('light', isLight);
  document.getElementById('themeBtn').textContent = isLight ? '🌙' : '☀️';
  mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose', suppressErrorRendering: true });
  localStorage.setItem('theme', mode);
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
}

(function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    applyTheme(saved);
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    applyTheme('light');
  }
})();

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose', suppressErrorRendering: true });

// ── 다이어그램 타입 정의 ──────────────────
const MAIN_TYPES = [
  { id: 'flowchart',      icon: '🔵', name: 'Flowchart',        desc: '프로세스 흐름, 의사결정 구조' },
  { id: 'sequence',       icon: '🟣', name: 'Sequence Diagram', desc: '시스템/사용자 간 상호작용' },
  { id: 'gantt',          icon: '🟠', name: 'Gantt Chart',      desc: '프로젝트 일정 및 타임라인' },
  { id: 'mindmap',        icon: '🟡', name: 'Mindmap',          desc: '아이디어 연결, 개념 구조화' },
  { id: 'classDiagram',   icon: '🟢', name: 'Class Diagram',    desc: '객체지향 구조, 관계 모델' },
  { id: 'stateDiagram',   icon: '🔴', name: 'State Diagram',    desc: '상태 변화, 이벤트 흐름' },
  { id: 'erDiagram',      icon: '🩵', name: 'ER Diagram',       desc: '데이터베이스 관계 모델' },
];

const EXTRA_TYPES = [
  { id: 'journey',            icon: '🧭', name: 'User Journey',        desc: '사용자 경험 단계, UX 시나리오' },
  { id: 'timeline',           icon: '📅', name: 'Timeline',             desc: '역사/이벤트 시간순 정리' },
  { id: 'gitGraph',           icon: '🌿', name: 'Git Graph',            desc: '브랜치 전략, 커밋 히스토리' },
  { id: 'pie',                icon: '🥧', name: 'Pie Chart',            desc: '비율/구성 데이터 시각화' },
  { id: 'quadrantChart',      icon: '🎯', name: 'Quadrant Chart',       desc: '2x2 우선순위 매트릭스' },
  { id: 'requirementDiagram', icon: '📋', name: 'Requirement Diagram',  desc: '요구사항 추적, 기능 명세' },
];

const DIAGRAM_TYPES = [...MAIN_TYPES, ...EXTRA_TYPES];

// ── 상태 ──────────────────────────────────
let selectedTypes = [];
let currentCodes  = {};
let zoomLevels    = {};
let analysisResult = null;
let apiKey    = '';
let provider  = 'claude';
let openaiModel = 'gpt-4o-mini';
let detailLevel = 'low';

// ── 프로바이더 설정 ────────────────────────
const PROVIDER_CONFIG = {
  claude: {
    placeholder: 'Anthropic API Key를 입력하세요 (sk-ant-...)',
    validate: v => v.startsWith('sk-ant-'),
    hint: '❌ Anthropic 키는 sk-ant- 로 시작해야 합니다.',
  },
  openai: {
    placeholder: 'OpenAI API Key를 입력하세요 (sk-...)',
    validate: v => v.startsWith('sk-') && !v.startsWith('sk-ant-'),
    hint: '❌ OpenAI 키는 sk- 로 시작해야 합니다 (sk-ant- 제외).',
  },
};

// ── 상세도 ────────────────────────────────
function getDetailLevel() {
  return detailLevel === 'high' ? 'high' : 'low';
}

function setDetailLevel(level) {
  detailLevel = level === 'high' ? 'high' : 'low';
  document.getElementById('detailLow')?.classList.toggle('active', detailLevel === 'low');
  document.getElementById('detailHigh')?.classList.toggle('active', detailLevel === 'high');
  localStorage.setItem('mermaid_detail_level', detailLevel);
}

// ── 프로바이더 선택 ───────────────────────
function selectProvider(p) {
  provider = p;
  document.getElementById('providerClaude').classList.toggle('active', p === 'claude');
  document.getElementById('providerOpenai').classList.toggle('active', p === 'openai');
  document.getElementById('apiKeyInput').placeholder = PROVIDER_CONFIG[p].placeholder;

  const savedKey = isSaveLocalEnabled() ? localStorage.getItem('mermaid_api_key_' + p) : '';
  document.getElementById('apiKeyInput').value = savedKey || '';

  onApiKeyChange();
  document.getElementById('openaiModelRow').style.display = p === 'openai' ? 'block' : 'none';
  localStorage.setItem('mermaid_last_provider', p);
}

// ── API Key 변경 감지 ─────────────────────
function onApiKeyChange() {
  const val   = document.getElementById('apiKeyInput').value.trim();
  const valid = PROVIDER_CONFIG[provider].validate(val);
  const saveBtn = document.getElementById('apiKeySaveBtn');

  saveBtn.disabled = !valid;

  if (val.length > 6 && !valid) {
    document.getElementById('apiKeyStatus').textContent = PROVIDER_CONFIG[provider].hint;
    document.getElementById('apiKeyStatus').style.color = '#f87171';
  } else {
    document.getElementById('apiKeyStatus').textContent = isSaveLocalEnabled()
      ? 'API Key는 브라우저의 localStorage에 저장됩니다.'
      : 'API Key는 현재 세션(메모리)에만 유지되며 새로고침 시 삭제됩니다.';
    document.getElementById('apiKeyStatus').style.color = '#888';
  }
}

// ── localStorage 저장 토글 ────────────────
function onSaveLocalToggle() {
  const isChecked = isSaveLocalEnabled();
  localStorage.setItem('mermaid_save_local', String(isChecked));

  if (!isChecked) {
    localStorage.removeItem('mermaid_api_key_claude');
    localStorage.removeItem('mermaid_api_key_openai');
    localStorage.removeItem('mermaid_openai_model');
  }

  onApiKeyChange();
}

// ── API Key 저장 ──────────────────────────
function saveApiKey() {
  const val = document.getElementById('apiKeyInput').value.trim();
  if (!PROVIDER_CONFIG[provider].validate(val)) return;
  apiKey = val;

  if (isSaveLocalEnabled()) {
    localStorage.setItem('mermaid_api_key_' + provider, val);
    if (provider === 'openai') {
      localStorage.setItem('mermaid_openai_model', openaiModel);
    }
  }

  const label    = provider === 'claude' ? 'Claude (Anthropic)' : 'OpenAI';
  const saveHint = isSaveLocalEnabled() ? ' 및 브라우저에 저장' : '';
  document.getElementById('apiKeyStatus').textContent = `✅ ${label} API Key가 설정${saveHint}되었습니다.`;
  document.getElementById('apiKeyStatus').style.color = '#34d399';
  document.getElementById('inputCard').classList.remove('hidden');
  document.getElementById('inputText').focus();
}

// ── 세션 복원 (마지막 프로바이더/모델) ────
(function initApiSettings() {
  const lastProvider = localStorage.getItem('mermaid_last_provider') || 'claude';
  const savedModel   = localStorage.getItem('mermaid_openai_model');
  const isSaveEnabled = localStorage.getItem('mermaid_save_local') !== 'false';
  const saveLocalCheck = getSaveLocalCheck();

  if (saveLocalCheck) saveLocalCheck.checked = isSaveEnabled;

  if (savedModel && isSaveEnabled) {
    openaiModel = savedModel;
    const sel = document.getElementById('openaiModelSelect');
    if (sel) sel.value = savedModel;
  }

  selectProvider(lastProvider);

  if (isSaveEnabled) {
    const savedKey = localStorage.getItem('mermaid_api_key_' + lastProvider);
    if (savedKey && PROVIDER_CONFIG[lastProvider].validate(savedKey)) {
      saveApiKey();
    }
  }
})();

// ── DOMContentLoaded ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const savedDetail = localStorage.getItem('mermaid_detail_level');
  setDetailLevel(savedDetail === 'high' ? 'high' : 'low');

  if (window.location.protocol === 'file:') {
    document.getElementById('apiKeyStatus').textContent =
      'ℹ️ index.html 직접 실행 모드(file://)입니다. 브라우저 정책에 따라 일부 환경에서만 제한이 발생할 수 있습니다.';
    document.getElementById('apiKeyStatus').style.color = '#888';
  }

  document.getElementById('apiKeyInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveApiKey();
  });

  document.getElementById('openaiModelSelect').addEventListener('change', e => {
    openaiModel = e.target.value;
  });

  // Ctrl+Enter: AI 분석 단축키
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const inputCard = document.getElementById('inputCard');
      if (!inputCard.classList.contains('hidden')) analyzeText();
    }
  });
});

// ── AI API 호출 ───────────────────────────
async function callAI(messages, systemPrompt) {
  if (!apiKey) throw new Error('API Key가 설정되지 않았습니다.');

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',          // Prompt Caching으로 비용 절감
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content.map(b => b.text || '').join('');
  }

  // OpenAI
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: openaiModel,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 1000,
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || `OpenAI API 오류: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content || '';
}

// ── 텍스트 분석 (AI 추천) ─────────────────
async function analyzeText() {
  const text = document.getElementById('inputText').value.trim();
  if (!text) return;

  setStatus('분석 중...', true);
  document.getElementById('analyzeBtn').disabled = true;
  document.getElementById('analyzeError').classList.add('hidden');

  try {
    const systemPrompt = `You are a diagram type recommender. Given user text, analyze it and return JSON only.
Return this exact JSON structure (no markdown, no explanation):
{
  "summary": "한 줄 요약 (한국어)",
  "recommended": ["flowchart","sequence","gantt","mindmap","classDiagram","stateDiagram","erDiagram"],
  "reasons": {
    "flowchart": "이 유형이 적합한 이유 (한국어, 1줄)",
    "sequence": "...",
    "gantt": "...",
    "mindmap": "...",
    "classDiagram": "...",
    "stateDiagram": "...",
    "erDiagram": "..."
  }
}
The "recommended" array must contain ALL 7 types sorted from most to least suitable.`;

    const raw   = await callAI([{ role: 'user', content: text }], systemPrompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    analysisResult = JSON.parse(clean);

    buildTypeGrid(analysisResult);
    document.getElementById('typeSection').classList.remove('hidden');
    setStatus('');
  } catch (e) {
    showError('analyzeError', '분석 중 오류가 발생했습니다: ' + e.message);
    setStatus('');
  }

  document.getElementById('analyzeBtn').disabled = false;
}

// ── 다이어그램 타입 그리드 구성 ──────────
function makeGroupHeader(label) {
  const el = document.createElement('div');
  el.className = 'group-header';
  el.innerHTML = `<span class="group-header-label">${label}</span><span class="group-header-line"></span>`;
  return el;
}

function makeCard(type, extraClass, reason) {
  const card = document.createElement('div');
  card.className = 'diagram-card' + (extraClass ? ' ' + extraClass : '');
  card.id = 'card_' + type.id;
  card.onclick = () => selectType(type.id);
  card.innerHTML = `<div class="d-icon">${type.icon}</div>
    <div class="d-name">${type.name}</div>
    <div class="d-desc">${reason}</div>`;
  return card;
}

function buildTypeGrid(analysis) {
  const grid = document.getElementById('diagramGrid');
  grid.innerHTML = '';
  const recommended = analysis.recommended || MAIN_TYPES.map(d => d.id);

  grid.appendChild(makeGroupHeader('✨ 대표 다이어그램 — AI 추천 순서'));
  recommended.forEach((id, i) => {
    const type = MAIN_TYPES.find(d => d.id === id);
    if (!type) return;
    const reason = analysis.reasons?.[id] || type.desc;
    grid.appendChild(makeCard(type, i === 0 ? 'recommended' : '', reason));
  });

  grid.appendChild(makeGroupHeader('➕ 추가 다이어그램'));
  EXTRA_TYPES.forEach(type => {
    grid.appendChild(makeCard(type, 'extra', type.desc));
  });
}

// ── 타입 선택 (최대 3개) ──────────────────
function selectType(id) {
  const idx = selectedTypes.indexOf(id);
  if (idx >= 0) {
    selectedTypes.splice(idx, 1);
  } else {
    if (selectedTypes.length >= 3) return;
    selectedTypes.push(id);
  }
  updateCardSelections();
}

function updateCardSelections() {
  const grid = document.getElementById('diagramGrid');
  document.querySelectorAll('.diagram-card').forEach(c => {
    c.classList.remove('selected');
    delete c.dataset.selNum;
  });

  selectedTypes.forEach((id, i) => {
    const card = document.getElementById('card_' + id);
    if (!card) return;
    card.classList.add('selected');
    card.dataset.selNum = i + 1;
  });

  const maxed = selectedTypes.length >= 3;
  if (maxed) grid.dataset.maxed = 'true';
  else delete grid.dataset.maxed;

  const n    = selectedTypes.length;
  const hint = document.getElementById('selectHint');
  hint.innerHTML = n === 0
    ? `유형을 선택하세요 — <span>${n} / 3</span> 선택됨`
    : `<span>${n}개</span> 선택됨${maxed ? ' (최대)' : ' — 추가 선택하거나 생성하세요'}`;

  const btn = document.getElementById('generateBtn');
  btn.disabled = n === 0;
  btn.textContent = n > 1
    ? `✨ 다이어그램 ${n}개 동시 생성하기`
    : '✨ 다이어그램 생성하기';
}

// ── 다이어그램 생성 ───────────────────────
const colorGuides = {
  flowchart: `STRICT RULES:
- Node IDs must be simple alphanumeric ONLY (e.g. A1, step2, nodeB). NEVER start IDs with a number.
- Korean text MUST be inside brackets: A1[한국어 텍스트] or A1((한글)).
- If a label contains special characters (+, -, :, /, etc.), wrap it in double quotes: A1["Label + with + chars"].
- Use classDef for colors and apply to nodes.`,
  sequence: `STRICT RULES:
- Participant names MUST be single English words (User, Server, DB, API, Auth).
- NEVER use Korean in participant aliases — "as" aliases with Korean CORRUPT the lexer.
  WRONG:  participant U as "사용자"   ← causes ALL following lines to be mis-tokenized
  CORRECT: participant User
- Korean IS allowed ONLY in message text: User->>Server: 한국어 메시지
- Korean IS allowed in note text: Note over User: 한국어 노트
- Note syntax: Note right of Actor: text  /  Note over A,B: text  /  Note left of Actor: text
- Use ONLY ASCII double quotes " (U+0022). NEVER use curly/fancy quotes " " (U+201C/U+201D).
- Each statement MUST be on its own line. NEVER concatenate statements.`,
  gantt: `Use dateFormat YYYY-MM-DD. Section and task names can be Korean.
Each task line: taskName : status, startDate, duration`,
  mindmap: `STRICT RULES:
- Use simple indentation.
- Labels can be Korean.
- If a label has special chars (+, -, 등), wrap in quotes: node["특수문자+"]`,
  classDiagram: `Class, attribute, and method names must be English. Korean allowed ONLY in %% comments.`,
  stateDiagram: `Use stateDiagram-v2.
- State names must be single English words.
- Add Korean description: state X : "한국어설명"
- Transitions: StateA --> StateB : "한국어레이블"`,
  erDiagram: `Entity and attribute names must be English. Korean allowed ONLY in %% comments or quoted relationship labels.`,
  journey: `title 제목 (Korean ok). section 단계명 (Korean ok). 작업명: score: ActorName (Actor must be English).`,
  timeline: `title 제목 (Korean ok). section 섹션명 (Korean ok). 날짜 : 이벤트설명 (Korean ok).`,
  gitGraph: `Branch names English. Commit messages can be Korean: commit id:"한국어"`,
  pie: `title 제목 (Korean ok). "항목명" : 숫자 (Labels in double quotes).`,
  quadrantChart: `STRICT SYNTAX RULES for quadrantChart:
- First line: quadrantChart (no arguments)
- title: title 제목 (Korean ok)
- x-axis: Both sides: x-axis LeftLabel --> RightLabel  |  Left only: x-axis Label
- y-axis: Both sides: y-axis BottomLabel --> TopLabel  |  Bottom only: y-axis Label
- Labels can be Korean (Mermaid 11.x supports Unicode in axis labels)
- Quadrant positions:
    quadrant-1  → TOP RIGHT
    quadrant-2  → TOP LEFT
    quadrant-3  → BOTTOM LEFT
    quadrant-4  → BOTTOM RIGHT
  Labels for quadrant-1/2/3/4: Korean ok
- Data points: 항목명: [x, y]  (x/y = float 0.0–1.0)
- Each directive MUST be on its own separate line.
- NEVER put x-axis and y-axis on the same line.
Example:
quadrantChart
    title 서비스 우선순위 분석
    x-axis 낮은 노력 --> 높은 노력
    y-axis 낮은 영향 --> 높은 영향
    quadrant-1 즉시 실행
    quadrant-2 장기 과제
    quadrant-3 재검토
    quadrant-4 모니터링
    기능A: [0.2, 0.8]
    기능B: [0.7, 0.6]
    기능C: [0.5, 0.3]`,
  requirementDiagram: `STRICT RULES (based on Mermaid official spec):

STRUCTURE: All blocks must be at the TOP LEVEL — NEVER nest blocks inside each other.

1. REQUIREMENT BLOCK — valid types:
   requirement | functionalRequirement | interfaceRequirement |
   performanceRequirement | physicalRequirement | designConstraint
   Fields: id, text (quoted), risk, verifymethod
   requirement reqName {
     id: R1
     text: "한국어 설명 (must be in double quotes)"
     risk: Low
     verifymethod: Test
   }
   Valid risk values: Low | Medium | High
   Valid verifymethod values: Analysis | Inspection | Test | Demonstration

2. ELEMENT BLOCK — has ONLY these two fields: type, docref (NO id/text/risk/verifymethod)
   element elemName {
     type: simulation
     docref: path/to/doc
   }
   IMPORTANT: If docref value contains a hyphen (-), space, or § — it MUST be in double quotes:
   docref: "docs/my-module.md"   ← hyphens need quotes (hyphen is tokenized as relationship operator)

3. RELATIONSHIPS (after all blocks) — valid types:
   contains | copies | derives | satisfies | verifies | refines | traces
   Format: sourceName - relationshipType -> destinationName
   Example: reqName - satisfies -> elemName

WRONG (causes parse error — NEVER do this):
  requirement foo {
    element bar { }    ← nested block is INVALID
  }

CORRECT FULL EXAMPLE:
requirementDiagram
  functionalRequirement loginReq {
    id: F1
    text: "사용자는 이메일로 로그인할 수 있어야 한다"
    risk: High
    verifymethod: Test
  }
  performanceRequirement perfReq {
    id: P1
    text: "응답시간은 2초 이내여야 한다"
    risk: Medium
    verifymethod: Inspection
  }
  element loginModule {
    type: module
    docref: docs/login.md
  }
  loginReq - satisfies -> loginModule
  loginReq - traces -> perfReq`,
};

function buildPrompt(typeId, text) {
  const isLow    = getDetailLevel() === 'low';
  const isOpenAI = provider === 'openai';

  const modelStrictRules = isOpenAI
    ? `\n### STRICT SYNTAX ENFORCEMENT FOR THIS MODEL:
- Every property inside a { block } MUST have a colon followed by a space (e.g., id: R1, NOT id R1).
- String values for 'text', 'docref', 'type' MUST be in double quotes.
- Ensure every opening { has a corresponding closing } on a new line.`
    : '';

  const summaryGuide = isLow
    ? `### VISUALIZATION STRATEGY: BEGINNER-FRIENDLY SUMMARY
- Goal: Create a CLEAR, SIMPLE diagram for someone who knows nothing about this topic.
- Rule 1: MAX 10-12 nodes total. DO NOT include minor details.
- Rule 2: Group related points into a single, high-level node.
- Rule 3: Use very short labels (1-3 words).
- Rule 4: Focus on the "Big Picture" or "Main Path".`
    : `### VISUALIZATION STRATEGY: PROFESSIONAL DETAIL
- Goal: Create a COMPREHENSIVE and DETAILED diagram for experts.
- Rule 1: Include all nuances, sub-steps, and technical details.
- Rule 2: Be as exhaustive as possible while maintaining correctness.
- Rule 3: Map out every logical connection from the provided text.`;

  return `You are a Mermaid expert and Information Architect.
Generate ONLY valid raw Mermaid ${typeId} code.
${modelStrictRules}

${summaryGuide}

CRITICAL RULES:
1. Node IDs MUST be simple English (n1, stepA). NEVER start IDs with numbers.
2. Korean text MUST be inside brackets or double quotes.
3. Wrap labels with special characters (+, -, :, /) in double quotes: id["Text + Here"].
4. First line must be exactly "${typeId === 'flowchart' ? 'flowchart LR' : typeId}".
5. NO markdown, NO explanation, NO backticks.
6. NEVER output JSON, JS objects, YAML, or key-value blocks on a single line.

DIAGRAM-SPECIFIC RULES:
${colorGuides[typeId] || ''}

Content:
${text}`;
}

async function generateDiagram() {
  if (selectedTypes.length === 0) return;
  const text = document.getElementById('inputText').value.trim();
  const n    = selectedTypes.length;

  setStatus(n > 1 ? `${n}개 다이어그램 병렬 생성 중...` : '다이어그램 생성 중...', true);
  document.getElementById('generateBtn').disabled = true;
  document.getElementById('generateError').classList.add('hidden');
  currentCodes = {};

  try {
    buildResultItems(selectedTypes);

    const results = await Promise.allSettled(
      selectedTypes.map(typeId =>
        callAI([{ role: 'user', content: text }], buildPrompt(typeId, text))
          .then(raw => raw.trim().replace(/^```[a-z]*\n?|```$/g, '').trim())
      )
    );

    for (let i = 0; i < selectedTypes.length; i++) {
      const typeId = selectedTypes[i];
      const result = results[i];
      if (result.status === 'fulfilled') {
        currentCodes[typeId] = result.value;
        document.getElementById('codeText_' + typeId).textContent = result.value;
        await renderDiagram(result.value, typeId);
      } else {
        const out = document.getElementById('diagramOutput_' + typeId);
        if (out) out.innerHTML = `<div style="color:#f87171;font-size:0.85rem">생성 실패: ${result.reason?.message || '알 수 없는 오류'}</div>`;
      }
    }

    document.getElementById('outputSection').classList.remove('hidden');
    document.getElementById('outputSection').scrollIntoView({ behavior: 'smooth' });
    setStatus('');
  } catch (e) {
    showError('generateError', '생성 중 오류: ' + e.message);
    setStatus('');
  }

  document.getElementById('generateBtn').disabled = false;
}

// ── 결과 아이템 빌드 ──────────────────────
function buildResultItems(typeIds) {
  const container = document.getElementById('resultsContainer');
  container.innerHTML = '';
  document.getElementById('outputSection').classList.remove('hidden');

  typeIds.forEach((typeId, i) => {
    const type = DIAGRAM_TYPES.find(d => d.id === typeId);
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `
      <div class="result-header">
        ${type.icon} ${type.name}
        <span class="r-badge">${i + 1}번째</span>
      </div>
      <div class="tabs" id="tabs_${typeId}">
        <div class="tab active" onclick="switchResultTab('${typeId}', 'preview')">👁 미리보기</div>
        <div class="tab" onclick="switchResultTab('${typeId}', 'code')">📋 코드</div>
      </div>
      <div id="preview_${typeId}">
        <div class="diagram-toolbar">
          <div class="zoom-controls">
            <button class="zoom-btn" onclick="zoomOut('${typeId}')">−</button>
            <span class="zoom-level" id="zoomLevel_${typeId}">100%</span>
            <button class="zoom-btn" onclick="zoomIn('${typeId}')">+</button>
            <button class="zoom-btn" onclick="zoomReset('${typeId}')" title="원래 크기">↺</button>
            <button class="zoom-btn" onclick="zoomFit('${typeId}')" title="너비 맞춤">↔ 맞춤</button>
          </div>
          <button class="zoom-btn fullscreen-btn" onclick="openFullscreen('${typeId}')" title="전체화면">⛶</button>
        </div>
        <div class="diagram-output" id="diagramOutput_${typeId}">
          <div style="color:var(--text-muted)"><span class="loader"></span> 생성 중...</div>
        </div>
      </div>
      <div id="code_${typeId}" class="hidden">
        <div class="code-output">
          <button class="copy-btn" onclick="copyCode('${typeId}')">복사</button>
          <span id="codeText_${typeId}"></span>
        </div>
      </div>`;
    container.appendChild(item);
  });
}

// ── 렌더링 (자동 수정 포함) ───────────────
async function renderDiagram(code, typeId, retryCount = 0) {
  const output = document.getElementById('diagramOutput_' + typeId);
  if (!output) return;

  try {
    // 1단계: 전역 — 곱슬따옴표를 ASCII 따옴표로 교체 (모든 다이어그램 타입 공통)
    const sanitized = sanitizeFancyQuotes(code);
    // 2단계: 타입별 구조 정규화
    const normalizedCode = normalizeMermaidCode(sanitized, typeId);
    if (normalizedCode !== code) {
      currentCodes[typeId] = normalizedCode;
      const codeEl = document.getElementById('codeText_' + typeId);
      if (codeEl) codeEl.textContent = normalizedCode;
      code = normalizedCode;
    }

    const id = 'mermaid_' + typeId + '_' + Date.now();
    const { svg } = await mermaid.render(id, code);
    output.innerHTML = `<div class="zoom-wrap" id="zoomWrap_${typeId}">${svg}</div>`;
    output.style.height = '';

    requestAnimationFrame(() => {
      const wrap  = document.getElementById('zoomWrap_' + typeId);
      const svgEl = output.querySelector('svg');
      if (!wrap || !svgEl) return;

      // 자연 크기 측정 (scale(1) 상태)
      wrap.style.transform = 'scale(1)';
      const naturalW = svgEl.getBoundingClientRect().width;
      const naturalH = svgEl.getBoundingClientRect().height;
      const containerW = output.clientWidth - 32;

      // 저장된 zoom이 있으면 유지, 없으면 너비에 맞게 자동 fit
      const savedZoom = zoomLevels[typeId];
      const fitScale  = Math.min(3, Math.max(0.25, containerW / naturalW));
      const scale     = savedZoom != null ? savedZoom : fitScale;
      setZoom(typeId, scale);

      // 스케일된 높이에 맞게 컨테이너 높이 조정 (여백 32px 포함)
      const scaledH = naturalH * scale + 32;
      output.style.height = Math.min(700, Math.max(60, scaledH)) + 'px';
    });
  } catch (e) {
    if (retryCount < 1) {
      output.innerHTML = `<div style="color:#a78bfa;font-size:0.85rem"><span class="loader"></span> 오류 감지 → 자동 수정 중... (${retryCount + 1}/2)</div>`;
      try {
        const fixed = await fixMermaidCode(code, e.message, typeId);
        currentCodes[typeId] = fixed;
        const codeEl = document.getElementById('codeText_' + typeId);
        if (codeEl) codeEl.textContent = fixed;
        await renderDiagram(fixed, typeId, retryCount + 1);
      } catch (e2) {
        output.innerHTML = `<div style="color:#f87171;font-size:0.85rem">자동 수정 실패: ${e2.message}<br><br>코드 탭에서 직접 확인하세요.</div>`;
      }
    } else {
      output.innerHTML = `<div style="color:#f87171;font-size:0.85rem">렌더링 실패 (2회 시도): ${e.message}<br><br>코드 탭에서 확인하세요.</div>`;
    }
  }
}

// ── Mermaid 코드 자동 수정 (AI) ───────────
function getFixRulesForType(typeId) {
  if (typeId === 'requirementDiagram') {
    return `Extra strict rules for requirementDiagram (Mermaid official spec):
- First line must be exactly: requirementDiagram
- ALL blocks (requirement, element) must be at TOP LEVEL — NEVER nested inside each other.
- requirement block fields ONLY: id, text, risk, verifymethod
- element block fields ONLY: type, docref  (NO id/text/risk/verifymethod inside element)
- Valid risk values: Low | Medium | High
- Valid verifymethod values: Analysis | Inspection | Test | Demonstration
- Valid requirement types: requirement | functionalRequirement | interfaceRequirement | performanceRequirement | physicalRequirement | designConstraint
- Valid relationship types: contains | copies | derives | satisfies | verifies | refines | traces
- Relationship format: sourceName - relationshipType -> destinationName
- text value must be in double quotes: text: "description"
- type and docref values do NOT need quotes: type: simulation
- Every property must use colon syntax: id: R1  (NOT "id R1")
- Do not use semicolons.`;
  }
  return '';
}

async function fixMermaidCode(code, errorMsg, typeId = '') {
  const systemPrompt = `You are a Mermaid diagram syntax expert.
The user has a broken Mermaid diagram. Fix ALL syntax errors and return ONLY the corrected Mermaid code.
Rules:
- Output raw Mermaid code only. No markdown fences, no backticks, no explanation.
- Keep all content and structure intact, only fix syntax.
- For stateDiagram-v2: labels must NOT contain colons (:) inside state names — use spaces or hyphens instead.
- For stateDiagram-v2: transition labels after --> use colon syntax: StateA --> StateB : label
- Korean text is allowed but must not break syntax tokens.
- Remove or escape any characters that conflict with Mermaid parsing.
${getFixRulesForType(typeId)}`;

  const userMsg = `Mermaid code with error:\n${code}\n\nError message:\n${errorMsg}\n\nPlease fix and return only the corrected Mermaid code.`;
  const fixed   = await callAI([{ role: 'user', content: userMsg }], systemPrompt);
  const clean   = sanitizeFancyQuotes(fixed.trim().replace(/^```[a-z]*\n?|```$/g, '').trim());
  return normalizeMermaidCode(clean, typeId);
}

// ── 다이어그램별 정규화 함수 ─────────────────────────────────
// quadrantChart 정규화 ──────────────────────────────────────
// Mermaid 11.x: 한국어 axis 레이블 지원됨 (PR #5943)
// 남은 교정:
//   ① 쉼표 구분자 → --> 변환  ("A, B" → "A --> B")
//   ② 같은 줄에 여러 키워드 → 각각 별도 줄로 분리
//      예: "x-axis 단순함 --> 복잡함 y-axis 낮음 --> 높음"
//          "title Foo x-axis A --> B y-axis C --> D"

function normalizeQuadrantChart(code) {
  if (!code || typeof code !== 'string') return code;

  // quadrantChart 전용 키워드 감지 패턴
  const KW_RE = /\b(x-axis|y-axis|quadrant-[1-4]|title)\b/g;

  const lines  = code.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { result.push(''); continue; }

    // 같은 줄에 몇 개의 키워드가 있는지 확인
    const kwMatches = [...trimmed.matchAll(KW_RE)];

    if (kwMatches.length > 1) {
      // ─ 여러 키워드가 한 줄에 붙어 있음 → 키워드 경계마다 분리 ─
      const segments = [];

      // 첫 번째 키워드 이전 텍스트가 있으면 보존
      if (kwMatches[0].index > 0) {
        const before = trimmed.slice(0, kwMatches[0].index).trim();
        if (before) segments.push(before);
      }

      // 각 키워드 세그먼트 추출
      for (let i = 0; i < kwMatches.length; i++) {
        const start = kwMatches[i].index;
        const end   = i + 1 < kwMatches.length ? kwMatches[i + 1].index : trimmed.length;
        const seg   = trimmed.slice(start, end).trim();
        if (seg) segments.push(seg);
      }

      for (const seg of segments) {
        // 쉼표 구분자 교정도 함께 처리
        const fixed = seg.replace(/^(x-axis|y-axis)\s+(.+?),\s*([^,]+)$/, '$1 $2 --> $3');
        result.push('    ' + fixed);
      }
      continue;
    }

    // ─ 단일 줄: 쉼표 구분자만 교정 ─
    const axisM = trimmed.match(/^(x-axis|y-axis)\s+(.*)$/);
    if (axisM) {
      const cm = axisM[2].trim().match(/^(.+?),\s*(.+)$/);
      if (cm) {
        const indent = (line.match(/^(\s*)/) || ['', ''])[1];
        result.push(`${indent}${axisM[1]} ${cm[1].trim()} --> ${cm[2].trim()}`);
        continue;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

// ── 전역 따옴표 정규화 ────────────────────────────────────────
// 원인: AI가 "..." (U+201C/U+201D 타이포그래픽 따옴표)를 생성하면
//       Mermaid 렉서가 닫는 따옴표를 인식 못해 이후 코드 전체를 문자열로 읽음
//       → "as "흐름 확인"User->>Note..." 처럼 여러 줄이 하나의 토큰이 됨
function sanitizeFancyQuotes(code) {
  if (!code || typeof code !== 'string') return code;
  return code
    .replace(/[\u201C\u201D\u201E\u201F\u275D\u275E]/g, '"') // 곱슬 이중따옴표 → "
    .replace(/[\u2018\u2019\u201A\u201B\u275B\u275C]/g, "'") // 곱슬 단따옴표 → '
    .replace(/[\u02BB\u02BC\u2032\u2035]/g, "'");            // 기타 아포스트로피
}

// ── requirementDiagram: 중첩된 element 블록을 최상위로 추출 ──
// 원인: AI가 requirement { ... element { } } 형태로 중첩 생성
//       → Mermaid 파서가 "got 'ELEMENT'" 오류 발생
// 해결: depth 추적으로 중첩 element를 감지하여 최상위 레벨로 이동
function extractNestedElementBlocks(code) {
  if (!code || typeof code !== 'string') return code;

  const lines = code.split(/\r?\n/);
  const mainLines     = [];
  const extractedBlocks = [];

  let depth         = 0;
  let collecting    = false;  // 현재 중첩 element 수집 중
  let collectBuf    = [];
  let collectDepth  = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const opens  = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;

    if (collecting) {
      // 중첩 블록 내용을 수집
      collectBuf.push('  ' + trimmed);
      collectDepth += opens - closes;
      depth        += opens - closes;
      if (collectDepth <= 0) {
        // 블록 종료 — 최상위로 보냄
        extractedBlocks.push(collectBuf.join('\n'));
        collectBuf   = [];
        collectDepth = 0;
        collecting   = false;
      }
      continue;
    }

    // depth > 0인 상태에서 element 블록 시작을 발견하면 추출
    const isNestedElement = depth > 0 && /^element\s+\w[\w-]*/.test(trimmed);
    if (isNestedElement) {
      collecting   = true;
      collectDepth = opens - closes;
      if (opens === 0) {
        // { 가 다음 줄에 있는 경우 — 이 줄에서 열어줌
        collectBuf = [trimmed + ' {'];
        collectDepth = 1;
      } else {
        collectBuf = [trimmed];
      }
      depth += opens - closes;
      continue;
    }

    mainLines.push(line);
    depth += opens - closes;
  }

  // 추출된 element 블록을 맨 뒤에 최상위로 붙임
  for (const block of extractedBlocks) {
    mainLines.push('');
    mainLines.push(block);
  }

  return mainLines.join('\n');
}

function normalizeMermaidCode(code, typeId = '') {
  if (typeId === 'quadrantChart') {
    return normalizeQuadrantChart(code);
  }
  if (typeId !== 'requirementDiagram') return code;
  if (!code || typeof code !== 'string') return code;

  // 중첩된 element 블록을 최상위로 추출 (파서 오류 방지)
  let normalized = extractNestedElementBlocks(code);
  const reqBlockKinds = '(requirement|functionalRequirement|interfaceRequirement|performanceRequirement|physicalRequirement|designConstraint|element)';

  normalized = normalized.replace(/([^\n])\s+(id|text|risk|verifymethod)\s*:/g, '$1\n    $2:');
  normalized = normalized.replace(/([^\n])\s+(id|text|risk|verifymethod)\s+([^\n]+)/g, '$1\n    $2: $3');
  normalized = normalized.replace(new RegExp(`([^\\n])\\s+${reqBlockKinds}\\s+`, 'g'), '$1\n$2 ');

  const lines = normalized.split(/\r?\n/);
  const out   = [];
  let hasHeader      = false;
  let currentBlock   = null; // 'element' | 'requirement' | null
  let blockDepth     = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { out.push(line); continue; }

    if (!hasHeader && trimmed === 'requirementDiagram') hasHeader = true;

    const opens  = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;

    // 블록 시작 감지
    const block = line.match(new RegExp(`^(\\s*)${reqBlockKinds}\\s+([A-Za-z_][\\w-]*)(\\s*)$`));
    if (block) {
      const indent = block[1] || '  ';
      const kind   = block[2];
      currentBlock = kind === 'element' ? 'element' : 'requirement';
      blockDepth   = 1;
      out.push(`${indent}${kind} ${block[3]} {`);
      continue;
    }

    const inlineBlock = line.match(new RegExp(`^(\\s*)${reqBlockKinds}\\s+([A-Za-z_][\\w-]*)\\s*\\{\\s*(.*)$`));
    if (inlineBlock) {
      const indent = inlineBlock[1] || '  ';
      const kind   = inlineBlock[2];
      const tail   = (inlineBlock[4] || '').trim();
      currentBlock = kind === 'element' ? 'element' : 'requirement';
      blockDepth   = opens - closes;
      out.push(`${indent}${kind} ${inlineBlock[3]} {`);
      if (tail && tail !== '{') out.push(`${indent}  ${tail}`);
      continue;
    }

    // 블록 깊이 추적 (닫히면 초기화)
    if (currentBlock) {
      blockDepth += opens - closes;
      if (blockDepth <= 0) { currentBlock = null; blockDepth = 0; }
    }

    // 프로퍼티 파싱: element 안 → type/docref만, requirement 안 → id/text/risk/verifymethod만
    const prop = line.match(/^(\s*)(id|text|risk|verifymethod|type|docref)\s*:?\s*(.*)$/i);
    if (prop) {
      const indent = prop[1] || '    ';
      const key    = prop[2].toLowerCase();
      let value    = (prop[3] || '').trim();

      // element 블록 안에서 requirement 전용 필드는 무시
      if (currentBlock === 'element' && ['id', 'risk', 'verifymethod'].includes(key)) continue;
      // requirement 블록 안에서 element 전용 필드는 무시
      if (currentBlock === 'requirement' && key === 'docref') continue;

      if (key === 'text') {
        // text: 반드시 큰따옴표 (공식 스펙)
        if (!value.startsWith('"')) value = `"${value}`;
        if (!value.endsWith('"'))   value = `${value}"`;
      } else if (key === 'type' || key === 'docref') {
        // 기존 따옴표 제거 후 재판단
        value = value.replace(/^"|"$/g, '').trim();
        // 하이픈(-), 공백, § 등은 requirementDiagram 렉서가 LINE/관계 토큰으로 오인식
        // → 특수문자가 있으면 따옴표로 감쌈
        if (/[-\s§#@&]/.test(value)) {
          value = `"${value}"`;
        }
      } else if (key === 'risk') {
        // 공식 스펙: Low | Medium | High
        const v = value.trim().toLowerCase();
        value = { low: 'Low', medium: 'Medium', high: 'High' }[v] || 'Medium';
      } else if (key === 'verifymethod') {
        // 공식 스펙: Analysis | Inspection | Test | Demonstration
        const v = value.trim().toLowerCase();
        value = { test: 'Test', inspection: 'Inspection', analysis: 'Analysis', demonstration: 'Demonstration' }[v] || 'Test';
      }

      out.push(`${indent}${key}: ${value}`);
      continue;
    }

    out.push(line);
  }

  normalized = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!hasHeader && !normalized.startsWith('requirementDiagram')) {
    normalized = `requirementDiagram\n${normalized}`;
  }
  normalized = balanceRequirementBlocks(normalized);
  return normalized;
}

function balanceRequirementBlocks(code) {
  if (!code || typeof code !== 'string') return code;
  const lines = code.split(/\r?\n/);
  let balance = 0;
  const fixed = [];

  for (const line of lines) {
    balance += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    fixed.push(line);
  }

  while (balance > 0) { fixed.push('  }'); balance--; }
  return fixed.join('\n');
}

// ── 탭 전환 ──────────────────────────────
function switchResultTab(typeId, tab) {
  const tabEls = document.querySelectorAll(`#tabs_${typeId} .tab`);
  tabEls.forEach((t, i) => t.classList.toggle('active', (tab === 'preview' && i === 0) || (tab === 'code' && i === 1)));
  document.getElementById('preview_' + typeId).classList.toggle('hidden', tab !== 'preview');
  document.getElementById('code_'    + typeId).classList.toggle('hidden', tab !== 'code');
}

// ── 코드 복사 ────────────────────────────
function copyCode(typeId) {
  const code = currentCodes[typeId] || '';
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.querySelector(`#code_${typeId} .copy-btn`);
    if (btn) {
      btn.textContent = '✅ 복사됨';
      setTimeout(() => { btn.textContent = '복사'; }, 1500);
    }
  });
}

// ── 초기화 ───────────────────────────────
function resetAll() {
  selectedTypes  = [];
  currentCodes   = {};
  zoomLevels     = {};
  analysisResult = null;
  document.getElementById('inputText').value = '';
  document.getElementById('typeSection').classList.add('hidden');
  document.getElementById('outputSection').classList.add('hidden');
  document.getElementById('resultsContainer').innerHTML = '';
  document.getElementById('statusMsg').classList.add('hidden');
  document.getElementById('generateBtn').disabled = true;
  closeFullscreen();
  document.getElementById('inputText').focus();
}

// ── 줌 제어 ──────────────────────────────
function setZoom(typeId, level) {
  zoomLevels[typeId] = level;
  const wrap    = document.getElementById('zoomWrap_' + typeId);
  const display = document.getElementById('zoomLevel_' + typeId);
  if (wrap)    wrap.style.transform  = `scale(${level})`;
  if (display) display.textContent   = Math.round(level * 100) + '%';
}

function zoomIn(typeId)    { setZoom(typeId, Math.min(4,    (zoomLevels[typeId] || 1) + 0.25)); }
function zoomOut(typeId)   { setZoom(typeId, Math.max(0.25, (zoomLevels[typeId] || 1) - 0.25)); }
function zoomReset(typeId) { setZoom(typeId, 1); }

function zoomFit(typeId) {
  const wrap   = document.getElementById('zoomWrap_' + typeId);
  const output = document.getElementById('diagramOutput_' + typeId) || document.getElementById('fsDiagram');
  if (!wrap || !output) return;

  wrap.style.transform = 'scale(1)';
  const svg    = wrap.querySelector('svg');
  if (!svg) return;
  const svgW      = svg.getBoundingClientRect().width;
  const containerW = output.clientWidth - 48;
  const fitScale  = Math.min(4, Math.max(0.25, containerW / svgW));
  setZoom(typeId, fitScale);
}

// ── 전체화면 ──────────────────────────────
function openFullscreen(typeId) {
  const type    = DIAGRAM_TYPES.find(d => d.id === typeId);
  const srcWrap = document.getElementById('zoomWrap_' + typeId);
  if (!srcWrap) return;

  const fsWrap = document.getElementById('zoomWrap___fs__');
  fsWrap.innerHTML = srcWrap.innerHTML;
  fsWrap.style.transform = 'scale(1)';
  zoomLevels.__fs__ = 1;
  document.getElementById('zoomLevel___fs__').textContent = '100%';
  document.getElementById('fsTitle').textContent = type ? `${type.icon} ${type.name}` : '';
  document.getElementById('fsModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => zoomFit('__fs__'));
}

function closeFullscreen() {
  document.getElementById('fsModal').classList.add('hidden');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeFullscreen();
});

// ── 상태 메시지 ───────────────────────────
function setStatus(msg, loading = false) {
  const el = document.getElementById('statusMsg');
  if (!msg) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.innerHTML = loading ? `<span class="loader"></span>${msg}` : msg;
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}
