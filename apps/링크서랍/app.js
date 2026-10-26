/* =====================================================================
 *  링크서랍 — 링크를 모아 두고 태그로 꺼냅니다
 * ---------------------------------------------------------------------
 *  자료가 사는 곳
 *    실제 저장은 localStorage 입니다(열쇠 "링크서랍.자료"). data.js 는 저장이
 *    비어 있을 때 읽는 «처음 자료» 이고, 「내보내기」가 그 파일을 새로 만들어 줍니다.
 *    웹페이지는 자기 폴더의 파일을 고쳐 쓸 수 없어서 이렇게 나눠 두었습니다.
 *
 *  링크를 여는 길은 하나뿐입니다 — 길게 누르기
 *    제목·주소는 진짜 <a href> 이지만 «그냥 누르기» 는 막아 두었습니다(사용자 지침
 *    2026-10-26: 쉽게 일반 탭에 열리는 것이 싫다). 그래서 탭은 속성 화면으로 가고,
 *    링크는 길게 누르기(휴대폰)·우클릭(PC)의 브라우저 메뉴에서 「시크릿 탭에서
 *    열기」로 엽니다. 웹페이지가 시크릿 탭을 코드로 여는 길은 없습니다.
 *
 *    ■ 고칠 때 주의 — <a href> 를 단추로 바꾸거나, CSS 에 -webkit-touch-callout:none
 *      을 걸면 그 메뉴가 사라집니다. click 만 막고 contextmenu 는 건드리지 마십시오.
 *
 *  꾹 누르기가 두 가지인 까닭
 *    제목 줄 위          → 브라우저 메뉴 (시크릿). 속성 화면에서는 주소도 같습니다
 *    그 밖의 카드 자리   → 여러 개 고르기
 *    자리를 나눠야 둘 다 삽니다.
 * ===================================================================== */

/* 판 번호 — index.html 의 ?v= 와 같아야 합니다. 화면 맨 아래에 떠서, 고친 것이
   안 보일 때 «옛 판이 캐시에서 나오고 있다» 를 바로 알 수 있습니다.
   손으로 고치지 말고 `node tools/판올리기.js 링크서랍` 을 쓰십시오. */
const VERSION = "1.1.1";

const KEY = "링크서랍.자료";   /* 열쇠 앞에 앱 이름 — 다른 앱의 저장을 덮지 않습니다 */
const V   = 1;                 /* 저장 모양 판 번호 */
const HOLD = 500;              /* 꾹 누르기로 치는 시간(ms) */
const CARD_TAGS = 3;           /* 카드에 보이는 태그 수 — 넘치면 +N */
const PAGE = 50;               /* 한 번에 보이는 줄 수 — 「더 보기」 가 이만큼씩 늘립니다 */

/* 아래 load() 가 곧바로 쓰므로 먼저 세웁니다 */
const newId = () => (crypto.randomUUID ? crypto.randomUUID()
                                       : Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const today = () => new Date().toISOString().slice(0, 10);

const $ = id => document.getElementById(id);

let links    = load();
let picked   = new Set();   /* 걸러 보는 태그 — 여럿이면 «모두 가진 것» 만 */
let chosen   = new Set();   /* 여러 개 고르기에서 고른 링크의 id */
let choosing = false;       /* 여러 개 고르는 중인가 */
let editMode = false;       /* 편집 모드 — 태그 자리에 휴지통이 뜹니다 */
let sheetFor = null;        /* 태그 넣기 화면이 손보는 대상: "고른것" 또는 링크 id */

/* 지금 보고 있는 쪽. 걸러 보는 것이 바뀌면 1쪽으로 돌아갑니다 —
   안 그러면 엉뚱하게 5쪽을 펴 둔 채로 다른 태그를 봅니다. */
let 쪽 = 1;
const 처음부터 = () => { 쪽 = 1; };

/* 보는 방식 — 정렬과 태그 겹쳐 고르기. 이 브라우저에 따로 남겨 둡니다. */
const VIEW = "링크서랍.보기";
const SORTS = [
  { k: "added",     label: "넣은 순" },
  { k: "star-desc", label: "별점 높은 순" },
  { k: "star-asc",  label: "별점 낮은 순" }
];
let sortBy = "added";
let tagMode = "all";        /* all — 고른 태그를 모두 가진 것 · any — 하나라도 가진 것 */
try {
  const v = JSON.parse(localStorage.getItem(VIEW) || "{}");
  if (SORTS.some(s => s.k === v.sortBy)) sortBy = v.sortBy;
  if (v.tagMode === "any") tagMode = "any";
} catch (e) { /* 없으면 기본값으로 */ }

function saveView() {
  try { localStorage.setItem(VIEW, JSON.stringify({ sortBy, tagMode })); } catch (e) { /* 그냥 둡니다 */ }
}

/* ── 자료 읽고 쓰기 ──────────────────────────────────────────────── */

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {
    /* 저장이 깨졌어도 앱은 열려야 합니다 — 처음 자료로 섭니다 */
    console.warn("저장을 읽지 못했습니다. 처음 자료로 시작합니다.", e);
  }
  const seed = (window.LINKS_SEED || []).map(tidy);
  /* 처음 자료에는 id 가 없을 수 있습니다. 바로 저장해 두어야 속성 화면 주소가
     새로 고칠 때마다 달라지지 않습니다. */
  try { localStorage.setItem(KEY, JSON.stringify({ v: V, links: seed })); } catch (e) { /* 저장이 막혀도 봅니다 */ }
  return seed;
}

/* 저장 모양을 고칠 때는 여기에 옛 판을 옮기는 길을 더합니다 —
   사용자가 쌓아 둔 것을 말없이 버리지 않습니다. */
function migrate(d) {
  if (Array.isArray(d)) return d.map(tidy);          /* 판 0 — 배열만 저장했던 모양 */
  return (d.links || []).map(tidy);
}

function tidy(x) {
  return {
    id:    x.id || newId(),
    url:   String(x.url || "").trim(),
    title: String(x.title || "").trim(),
    tags:  Array.isArray(x.tags) ? [...new Set(x.tags.map(t => String(t).trim()).filter(Boolean))] : [],
    star:  Math.max(0, Math.min(5, Math.round(Number(x.star) || 0))),   /* 0 은 «안 먹였다» 입니다 */
    note:  String(x.note || ""),
    added: x.added || today()
  };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: V, links }));
  } catch (e) {
    say("저장하지 못했습니다 — 저장 공간이 찼거나 브라우저가 막고 있습니다.");
    console.error(e);
  }
}

const byId = id => links.find(l => l.id === id);

function host(url) {
  try { return new URL(url).host.replace(/^www\./, ""); }
  catch { return url; }
}

/* ── 별점 ────────────────────────────────────────────────────────── */
/* 별 다섯 개. 먹인 별을 다시 누르면 0 으로 돌아갑니다 — 그래야 잘못 먹인 것을 뺄 수 있습니다. */

function stars(x, big) {
  const box = document.createElement("div");
  box.className = "stars" + (big ? " d-stars" : "");
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "별점 " + x.star + "점");

  for (let i = 1; i <= 5; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = i <= x.star ? "on" : "";
    b.textContent = i <= x.star ? "★" : "☆";
    b.setAttribute("aria-label", i + "점");
    b.addEventListener("click", e => {
      e.stopPropagation();
      if (choosing) { toggleChoice(x.id); return; }   /* 고르는 중에는 고르기가 먼저입니다 */
      x.star = (x.star === i) ? 0 : i;
      save();
      if ($("v-detail").hidden) drawList(); else drawDetail(x);
    });
    box.append(b);
  }
  return box;
}

/* 많이 쓴 태그부터 — 추천 줄과 거르기 줄이 함께 씁니다 */
function tagCounts() {
  const c = new Map();
  for (const x of links) for (const t of x.tags) c.set(t, (c.get(t) || 0) + 1);
  return new Map([...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")));
}

/* ── 어느 화면인가 ───────────────────────────────────────────────── */
/* #/l/<id> 면 속성 화면입니다. 뒤로 가기가 그대로 듣게 주소를 씁니다. */

function route() {
  const m = location.hash.match(/^#\/l\/(.+)$/);
  const x = m ? byId(decodeURIComponent(m[1])) : null;

  if (x) {
    stopChoosing();
    $("v-list").hidden = true;
    $("v-detail").hidden = false;
    drawDetail(x);
  } else {
    if (m) location.replace("#");   /* 지워진 링크의 주소 — 목록으로 */
    $("v-detail").hidden = true;
    $("v-detail").textContent = "";
    $("v-list").hidden = false;
    draw();
  }
  scrollTo(0, 0);
}
addEventListener("hashchange", route);

/* ── 꾹 누르기 ───────────────────────────────────────────────────── */
/* 누른 채 HOLD 만큼 버티면 onHold 를 부릅니다. 손가락이 움직이면 그만둡니다.
   <a> 위에서 시작한 것은 브라우저에 맡깁니다 — 거기서 시크릿 메뉴가 뜹니다. */
function onHold(node, fn) {
  let timer = null, sx = 0, sy = 0;
  node._held = false;

  const stop = () => { clearTimeout(timer); timer = null; };

  node.addEventListener("pointerdown", e => {
    if (e.button) return;
    if (e.target.closest("a")) return;
    node._held = false;
    sx = e.clientX; sy = e.clientY;
    timer = setTimeout(() => {
      node._held = true;
      /* 손끝에 한 번 울려 줍니다. 손댄 적 없는 창에서는 크롬이 막고 콘솔에 적으므로 먼저 봅니다 */
      try {
        if (navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate(12);
      } catch (e) { /* 그냥 둡니다 */ }
      fn();
    }, HOLD);
  });
  node.addEventListener("pointermove", e => {
    if (timer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) stop();
  });
  for (const t of ["pointerup", "pointercancel", "pointerleave"]) node.addEventListener(t, stop);
}

/* 링크를 그냥 누르면 열리지 않습니다 — 길게 누르라고 일러 줍니다 */
function holdOnly(a) {
  a.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    say("길게 누르거나(휴대폰) 우클릭해서(PC) 「시크릿 탭에서 열기」를 고르십시오.");
  });
}

/* ── 목록 화면 ───────────────────────────────────────────────────── */

function shown() {
  const q = $("q").value.trim().toLowerCase();

  const rows = links.filter(x => {
    if (picked.size) {
      /* 모두 — 고른 태그를 다 가진 것만 · 아무거나 — 하나라도 가진 것 */
      const hit = [...picked].filter(t => x.tags.includes(t)).length;
      if (tagMode === "all" ? hit < picked.size : hit === 0) return false;
    }
    if (!q) return true;
    return (x.title + " " + x.url + " " + x.note + " " + x.tags.join(" ")).toLowerCase().includes(q);
  });

  /* 넣은 순은 links 의 차례 그대로입니다. 별점이 같으면 그 차례를 지킵니다. */
  if (sortBy === "star-desc") rows.sort((a, b) => b.star - a.star);
  if (sortBy === "star-asc")  rows.sort((a, b) => a.star - b.star);
  return rows;
}

function drawToolbar() {
  const s = SORTS.find(s => s.k === sortBy) || SORTS[0];
  $("sort").textContent = s.label;

  const mode = $("tagmode");
  mode.hidden = picked.size < 2;      /* 하나만 골랐으면 둘이 같은 뜻입니다 */
  mode.textContent = tagMode === "all" ? "모두 가진 것" : "하나라도 가진 것";

  const n = shown().length;
  const 처음 = (쪽 - 1) * PAGE + 1;
  const 끝   = Math.min(쪽 * PAGE, n);
  $("count").textContent = n > PAGE          ? `${처음}–${끝} / ${n}개`
                         : n < links.length  ? `${n} / ${links.length}개`
                                             : `${n}개`;
}

$("sort").addEventListener("click", () => {
  const i = SORTS.findIndex(s => s.k === sortBy);
  sortBy = SORTS[(i + 1) % SORTS.length].k;
  saveView();
  처음부터();
  draw();
});

$("tagmode").addEventListener("click", () => {
  tagMode = tagMode === "all" ? "any" : "all";
  saveView();
  처음부터();
  draw();
});

function drawTagbar() {
  const count = tagCounts();
  const box = $("tagbar");
  box.textContent = "";
  for (const [t, n] of count) {
    box.append(chip(t, n, picked.has(t), () => {
      if (picked.has(t)) picked.delete(t); else picked.add(t);
      처음부터();
      draw();
    }));
  }
}

function chip(name, n, on, fn) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "tag";
  b.setAttribute("aria-pressed", on ? "true" : "false");
  b.append(document.createTextNode(name));
  if (n != null) {
    const s = document.createElement("span");
    s.className = "n";
    s.textContent = n;
    b.append(s);
  }
  b.addEventListener("click", fn);
  return b;
}

function drawList() {
  const rows = shown();
  /* 지우고 나서 마지막 쪽이 비었을 수 있습니다 — 있는 쪽으로 끌어당깁니다 */
  const 총쪽 = Math.max(1, Math.ceil(rows.length / PAGE));
  if (쪽 > 총쪽) 쪽 = 총쪽;

  drawToolbar();            /* 센 개수와 단추 글이 함께 바뀝니다 */
  const list = $("list");
  list.textContent = "";
  $("pager").textContent = "";

  if (!rows.length) {
    const d = document.createElement("li");
    d.className = "empty";
    d.textContent = links.length ? "걸리는 것이 없습니다." : "아직 넣은 링크가 없습니다. ＋ 로 넣으십시오.";
    list.append(d);
    return;
  }

  /* 한 쪽에 PAGE 줄만 그립니다 — 한꺼번에 다 그리면 많아질수록 느려집니다 */
  for (const x of rows.slice((쪽 - 1) * PAGE, 쪽 * PAGE)) list.append(card(x));

  drawPager(총쪽);
}

/* ‹ 1 2 3 … 9 ›  — 좁은 화면에 다 깔 수 없으니 지금 쪽 둘레만 적고 나머지는 … 로 */
function drawPager(총쪽) {
  const box = $("pager");
  box.textContent = "";
  if (총쪽 <= 1) return;

  const 단추 = (글, 갈곳, { 지금 = false, 못눌러 = false } = {}) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = 글;
    if (지금) b.setAttribute("aria-current", "page");
    if (못눌러) b.disabled = true;
    else b.addEventListener("click", () => 쪽넘기기(갈곳));
    box.append(b);
  };
  const 사이 = () => {
    const s = document.createElement("span");
    s.className = "gap";
    s.textContent = "…";
    box.append(s);
  };

  단추("‹", 쪽 - 1, { 못눌러: 쪽 === 1 });

  /* 1쪽·끝쪽은 늘 보이고, 가운데는 지금 쪽 ±1 만 */
  const 적을쪽 = new Set([1, 총쪽, 쪽 - 1, 쪽, 쪽 + 1]);
  let 앞 = 0;
  for (let i = 1; i <= 총쪽; i++) {
    if (!적을쪽.has(i)) continue;
    if (i - 앞 > 1) 사이();
    단추(String(i), i, { 지금: i === 쪽 });
    앞 = i;
  }

  단추("›", 쪽 + 1, { 못눌러: 쪽 === 총쪽 });
}

function 쪽넘기기(갈곳) {
  쪽 = 갈곳;
  drawList();
  /* 쪽을 넘기면 목록 머리로 올립니다 — 안 그러면 새 쪽의 한가운데에 서 있게 됩니다 */
  $("list").scrollIntoView({ block: "start" });
}

function card(x) {
  const li = document.createElement("li");
  li.className = "row" + (chosen.has(x.id) ? " on" : "");

  const body = document.createElement("div");
  body.className = "body";

  /* 첫 줄 — 제목. 진짜 <a href> 라야 길게 누르기 메뉴가 뜹니다 */
  const a = document.createElement("a");
  a.className = "t";
  a.href = x.url;
  a.textContent = x.title || x.url;
  holdOnly(a);
  body.append(a);

  /* 둘째 줄 — 별점과 태그가 나란히 섭니다 (편집 모드면 휴지통만) */
  const mini = document.createElement("div");
  mini.className = "mini";
  if (!editMode) mini.append(stars(x, false));
  if (editMode) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "trash";
    b.textContent = "🗑 지우기";
    b.addEventListener("click", e => { e.stopPropagation(); remove(x); });
    mini.append(b);
  } else {
    for (const t of x.tags.slice(0, CARD_TAGS)) {
      const s = document.createElement("span");
      s.textContent = t;
      mini.append(s);
    }
    if (x.tags.length > CARD_TAGS) {
      const s = document.createElement("span");
      s.className = "more";
      s.textContent = "+" + (x.tags.length - CARD_TAGS);
      mini.append(s);
    }
  }
  if (mini.childElementCount) body.append(mini);

  /* 카드를 누르면 속성, 꾹 누르면 여러 개 고르기 */
  onHold(body, () => { startChoosing(); toggleChoice(x.id); });
  body.addEventListener("click", e => {
    if (body._held) { body._held = false; return; }   /* 꾹 누른 뒤의 클릭은 흘립니다 */
    if (e.target.closest("a") || e.target.closest("button")) return;
    if (choosing) { toggleChoice(x.id); return; }
    location.hash = "#/l/" + encodeURIComponent(x.id);
  });
  li.append(body);

  const side = document.createElement("div");
  side.className = "side";
  const mark = document.createElement("span");
  if (choosing) { mark.className = "mark"; mark.textContent = chosen.has(x.id) ? "☑" : "☐"; }
  else          { mark.className = "go-in"; mark.textContent = "›"; }
  side.append(mark);
  side.addEventListener("click", () => {
    if (choosing) toggleChoice(x.id);
    else location.hash = "#/l/" + encodeURIComponent(x.id);
  });
  li.append(side);

  return li;
}

function draw() { drawTagbar(); drawList(); drawSelbar(); }

/* ── 여러 개 고르기 ──────────────────────────────────────────────── */

function startChoosing() {
  if (choosing) return;
  choosing = true;
  if (editMode) setEdit(false);
}

function stopChoosing() {
  if (!choosing && !chosen.size) return;
  choosing = false;
  chosen.clear();
  if (!$("v-list").hidden) draw();
  else drawSelbar();
}

function toggleChoice(id) {
  if (chosen.has(id)) chosen.delete(id); else chosen.add(id);
  if (!chosen.size) { stopChoosing(); return; }
  draw();
}

function drawSelbar() {
  const bar = $("selbar");
  bar.hidden = !choosing || !chosen.size;
  $("sel-n").textContent = chosen.size + "개 골랐습니다";
}

$("sel-none").addEventListener("click", stopChoosing);
$("sel-tag").addEventListener("click", () => openSheet("고른것"));

/* ── 태그 넣기 화면 ──────────────────────────────────────────────── */
/* 고른 링크 여럿에게, 또는 한 링크에게 태그를 한꺼번에 답니다. */

let sheetPick = new Set();

function openSheet(what) {
  sheetFor = what;
  sheetPick = new Set();
  $("sheet-new").value = "";

  const n = what === "고른것" ? chosen.size : 1;
  $("sheet-sub").textContent = `링크 ${n}개에 답니다. 많이 쓴 태그부터 보입니다.`;
  drawSheetReco();
  $("sheet").hidden = false;
  $("sheet-new").focus();
}

function drawSheetReco() {
  const box = $("sheet-reco");
  box.textContent = "";
  const count = tagCounts();
  if (!count.size) {
    const p = document.createElement("p");
    p.textContent = "아직 쓴 태그가 없습니다 — 아래에 적으십시오.";
    box.append(p);
    return;
  }
  for (const [t, n] of count) {
    box.append(chip(t, n, sheetPick.has(t), () => {
      if (sheetPick.has(t)) sheetPick.delete(t); else sheetPick.add(t);
      drawSheetReco();
    }));
  }
}

$("sheet-cancel").addEventListener("click", () => { $("sheet").hidden = true; });
$("sheet").addEventListener("click", e => { if (e.target.id === "sheet") $("sheet").hidden = true; });

$("sheet-go").addEventListener("click", () => {
  const add = [...sheetPick, ...$("sheet-new").value.split(",").map(t => t.trim()).filter(Boolean)];
  if (!add.length) { $("sheet").hidden = true; return; }

  const targets = sheetFor === "고른것" ? links.filter(l => chosen.has(l.id)) : [byId(sheetFor)].filter(Boolean);
  for (const x of targets) x.tags = [...new Set([...x.tags, ...add])];
  save();

  $("sheet").hidden = true;
  say(`${targets.length}개에 태그 ${add.length}개를 달았습니다.`);

  if (sheetFor === "고른것") { stopChoosing(); draw(); }
  else route();
});

/* ── 편집 모드 ───────────────────────────────────────────────────── */

function setEdit(on) {
  editMode = on;
  $("edit").setAttribute("aria-pressed", on ? "true" : "false");
  $("edit").textContent = on ? "끝" : "편집";
  drawList();
}

$("edit").addEventListener("click", () => {
  if (!editMode) stopChoosing();
  setEdit(!editMode);
});

function remove(x) {
  if (!confirm("「" + (x.title || x.url) + "」 을 지웁니다. 되돌릴 수 없습니다.")) return;
  links = links.filter(l => l.id !== x.id);
  chosen.delete(x.id);
  save();
  say("지웠습니다.");
  if (location.hash.startsWith("#/l/")) location.hash = "#";
  else draw();
}

/* ── 넣기 폼 ─────────────────────────────────────────────────────── */

const F = { url:$("f-url"), title:$("f-title"), tags:$("f-tags"), note:$("f-note"), reco:$("f-reco") };

/* 태그 칸에 적힌 것을 읽고 씁니다 — 추천 칩이 이 칸을 채웁니다 */
const readTags  = input => input.value.split(",").map(t => t.trim()).filter(Boolean);
const writeTags = (input, arr) => { input.value = arr.join(", "); };

function drawReco(box, input) {
  box.textContent = "";
  const has = new Set(readTags(input));
  for (const [t, n] of tagCounts()) {
    box.append(chip(t, n, has.has(t), () => {
      const now = readTags(input);
      writeTags(input, now.includes(t) ? now.filter(x => x !== t) : [...now, t]);
      drawReco(box, input);
    }));
  }
}

function openPanel() {
  stopChoosing();
  if (editMode) setEdit(false);
  F.url.value = "";
  F.title.value = "";
  writeTags(F.tags, [...picked]);     /* 걸러 보던 태그를 미리 채웁니다 */
  F.note.value = "";
  drawReco(F.reco, F.tags);
  $("panel").hidden = false;
  F.url.focus();
}

function closePanel() { $("panel").hidden = true; $("panel").reset(); }

$("add").addEventListener("click", () => { if ($("panel").hidden) openPanel(); else closePanel(); });
$("f-cancel").addEventListener("click", closePanel);
F.tags.addEventListener("input", () => drawReco(F.reco, F.tags));

$("panel").addEventListener("submit", e => {
  e.preventDefault();
  let url = F.url.value.trim();
  if (!url) return;
  if (!/^[a-z]+:\/\//i.test(url)) url = "https://" + url;   /* 주소만 적어도 받습니다 */

  links.unshift(tidy({
    url,
    title: F.title.value.trim() || host(url),
    tags:  readTags(F.tags),
    note:  F.note.value.trim(),
    added: today()
  }));
  save();
  closePanel();
  draw();
  say("넣었습니다.");
});

/* ── 속성 화면 ───────────────────────────────────────────────────── */

function drawDetail(x) {
  const v = $("v-detail");
  v.textContent = "";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "small";
  back.textContent = "‹ 목록";
  back.addEventListener("click", () => history.back());
  v.append(back);

  const h = document.createElement("h1");
  h.textContent = x.title || x.url;
  v.append(h);

  const a = document.createElement("a");
  a.className = "d-url";
  a.href = x.url;
  a.textContent = x.url;
  holdOnly(a);                    /* 여기서도 그냥 눌러서는 안 열립니다 */
  v.append(a);

  v.append(stars(x, true));

  const tags = document.createElement("div");
  tags.className = "chips";
  tags.style.marginTop = "14px";
  for (const t of x.tags) {
    tags.append(chip(t, null, false, () => {   /* 태그를 누르면 그 태그로 걸러 봅니다 */
      picked = new Set([t]);
      처음부터();
      location.hash = "#";
    }));
  }
  tags.append(chip("＋ 태그", null, false, () => openSheet(x.id)));
  v.append(tags);

  if (x.note) {
    const p = document.createElement("p");
    p.className = "d-note";
    p.textContent = x.note;
    v.append(p);
  }

  const meta = document.createElement("p");
  meta.className = "d-meta";
  meta.textContent = "넣은 날 " + x.added + " · " + host(x.url);
  v.append(meta);

  const hint = document.createElement("p");
  hint.className = "d-meta";
  hint.textContent = "주소를 길게 누르거나(휴대폰) 우클릭해서(PC) 「시크릿 탭에서 열기」를 고르십시오.";
  v.append(hint);

  const btns = document.createElement("div");
  btns.className = "d-btns";
  btns.append(mkBtn("고치기", "go", () => drawEdit(x)));
  btns.append(mkBtn("주소 베끼기", "", () => copy(x.url)));
  btns.append(mkBtn("지우기", "bad", () => remove(x)));
  v.append(btns);

  const msg = document.createElement("div");
  msg.id = "msg2";
  msg.className = "msgbox";
  msg.setAttribute("role", "status");
  v.append(msg);
}

function mkBtn(label, cls, fn) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.textContent = label;
  b.addEventListener("click", fn);
  return b;
}

/* 속성 화면 안에서 고칩니다 — 같은 모양의 폼을 세웁니다 */
function drawEdit(x) {
  const v = $("v-detail");
  v.textContent = "";

  const form = document.createElement("form");
  form.className = "panel";

  const url   = field(form, "주소", "url", x.url);
  const title = field(form, "제목", "text", x.title);
  const tags  = field(form, "태그 — 쉼표로 나눕니다", "text", x.tags.join(", "));

  const head = document.createElement("p");
  head.className = "reco-head";
  head.textContent = "많이 쓴 태그부터";
  form.append(head);
  const reco = document.createElement("div");
  reco.className = "chips";
  form.append(reco);
  drawReco(reco, tags);
  tags.addEventListener("input", () => drawReco(reco, tags));

  const noteLabel = document.createElement("label");
  noteLabel.append(document.createTextNode("메모"));
  const note = document.createElement("textarea");
  note.value = x.note;
  noteLabel.append(note);
  form.append(noteLabel);

  const btns = document.createElement("div");
  btns.className = "btns";
  const ok = document.createElement("button");
  ok.type = "submit"; ok.className = "go"; ok.textContent = "고치기";
  btns.append(ok);
  btns.append(mkBtn("그만", "", () => drawDetail(x)));
  form.append(btns);

  form.addEventListener("submit", e => {
    e.preventDefault();
    let u = url.value.trim();
    if (!u) return;
    if (!/^[a-z]+:\/\//i.test(u)) u = "https://" + u;
    x.url   = u;
    x.title = title.value.trim() || host(u);
    x.tags  = [...new Set(readTags(tags))];
    x.note  = note.value.trim();
    save();
    drawDetail(x);
    say("고쳤습니다.");
  });

  v.append(form);
}

function field(form, label, type, value) {
  const l = document.createElement("label");
  l.append(document.createTextNode(label));
  const i = document.createElement("input");
  /* type="url" 로 두면 「diatoms.org」 를 브라우저가 막습니다 — https:// 는 저장할 때 붙입니다 */
  i.type = "text";
  if (type === "url") i.inputMode = "url";
  i.value = value;
  l.append(i);
  form.append(l);
  return i;
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); say("주소를 베꼈습니다."); }
  catch { say("베끼지 못했습니다 — 주소를 길게 눌러 베끼십시오."); }
}

$("q").addEventListener("input", () => { 처음부터(); drawList(); });

/* ── 내보내기·불러오기 ──────────────────────────────────────────── */

$("export").addEventListener("click", () => {
  const body = links.map(x => ({ id: x.id, url: x.url, title: x.title, tags: x.tags,
                                 star: x.star, note: x.note, added: x.added }));
  const text =
    "/* 링크서랍 자료 — " + today() + " 에 내보냈습니다.\n" +
    " * 이 파일을 apps/링크서랍/data.js 에 덮으면 다음에 열 때 기본값이 됩니다. */\n" +
    "window.LINKS_SEED = " + JSON.stringify(body, null, 2) + ";\n";

  const url = URL.createObjectURL(new Blob([text], { type: "text/javascript;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.js";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say(links.length + "개를 data.js 로 내보냈습니다.");
});

$("import").addEventListener("click", () => $("file").click());

$("file").addEventListener("change", async () => {
  const f = $("file").files[0];
  if (!f) return;
  try {
    const got = parseSeed(await f.text());
    if (confirm("지금 있는 " + links.length + "개를 불러온 " + got.length + "개로 바꿉니다. 계속할까요?")) {
      links = got;
      picked.clear();
      처음부터();
      stopChoosing();
      save();
      draw();
      say(got.length + "개를 불러왔습니다.");
    }
  } catch (e) {
    say("읽지 못했습니다 — 「내보내기」로 받은 data.js 나 JSON 파일인지 보십시오.");
    console.error(e);
  } finally {
    $("file").value = "";
  }
});

/* data.js 든 JSON 이든 받습니다. eval 은 쓰지 않습니다 — 파일 안의 코드를
   돌리지 않고, 대괄호 안의 JSON 만 떼어 읽습니다. */
function parseSeed(text) {
  const m = text.match(/window\.LINKS_SEED\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
  const json = m ? m[1] : text;
  const got = JSON.parse(json);
  if (!Array.isArray(got)) throw new Error("배열이 아닙니다");
  return got.map(tidy).filter(x => x.url);
}

/* 되돌리기는 쌓아 둔 것을 통째로 버립니다 — 한 번에 되지 않고 두 번 눌러야 합니다
   (사용자 지침 2026-10-26). 첫 번째 누름은 단추 글만 바꾸고, 5초 안에 다시 눌러야
   실제로 지웁니다. 잘못 누른 사람은 그냥 기다리면 됩니다. */
let resetArmed = null;

function disarmReset() {
  clearTimeout(resetArmed);
  resetArmed = null;
  $("reset").textContent = "처음 자료로 되돌리기";
  $("reset").classList.remove("armed");
}

$("reset").addEventListener("click", () => {
  if (!resetArmed) {
    $("reset").textContent = "정말요? 한 번 더";
    $("reset").classList.add("armed");
    resetArmed = setTimeout(disarmReset, 5000);
    say("쌓아 둔 " + links.length + "개를 버리고 data.js 의 처음 자료로 돌아갑니다. 그만두려면 그냥 두십시오.");
    return;
  }
  disarmReset();
  localStorage.removeItem(KEY);
  links = load();
  picked.clear();
  처음부터();
  stopChoosing();
  draw();
  say("처음 자료로 되돌렸습니다.");
});

/* ── 알림 한 줄 ─────────────────────────────────────────────────── */

let sayTimer;
function say(text) {
  const box = $("v-detail").hidden ? $("msg") : ($("msg2") || $("msg"));
  box.textContent = text;
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { box.textContent = ""; }, 4000);
}

$("ver").textContent = VERSION;
route();

/* 앱으로 설치해 두면 인터넷 없이도 열립니다. https 에서만 돕니다 —
   한 장으로 묶은 판(file://)이나 미리보기(http)에서는 조용히 넘어갑니다. */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(e => console.warn("서비스 워커를 세우지 못했습니다.", e)));
}
