/* =====================================================================
 *  링크서랍 — 링크를 모아 두고 태그로 꺼냅니다
 * ---------------------------------------------------------------------
 *  자료가 사는 곳
 *    실제 저장은 localStorage 입니다(열쇠 "링크서랍.자료"). data.js 는 저장이
 *    비어 있을 때 읽는 «처음 자료» 이고, 「내보내기」가 그 파일을 새로 만들어 줍니다.
 *    웹페이지는 자기 폴더의 파일을 고쳐 쓸 수 없어서 이렇게 나눠 두었습니다.
 *
 *  링크를 누르면
 *    일반 새 탭에서 엽니다. 시크릿 탭은 웹페이지가 열 수 없습니다 — 그래서 제목을
 *    진짜 <a href> 로 두어, 길게 누르기(휴대폰)·우클릭(PC)의 브라우저 메뉴에
 *    「시크릿 탭에서 열기」가 뜨게 합니다. JS 로 window.open 하는 단추로 바꾸면
 *    그 메뉴가 사라집니다 — 바꾸지 마십시오.
 * ===================================================================== */

const KEY = "링크서랍.자료";   /* 열쇠 앞에 앱 이름 — 다른 앱의 저장을 덮지 않습니다 */
const V   = 1;                 /* 저장 모양 판 번호 */

const $ = id => document.getElementById(id);
const el = { q:$("q"), add:$("add"), panel:$("panel"), tagbar:$("tagbar"), list:$("list"),
             msg:$("msg"), file:$("file"),
             url:$("f-url"), title:$("f-title"), tags:$("f-tags"), note:$("f-note"),
             save:$("f-save"), cancel:$("f-cancel") };

/* 아래 load() 가 곧바로 쓰므로 먼저 세웁니다 */
const newId = () => (crypto.randomUUID ? crypto.randomUUID()
                                       : Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const today = () => new Date().toISOString().slice(0, 10);

let links   = load();
let picked  = new Set();   /* 고른 태그 — 여럿이면 «모두 가진 것» 만 봅니다 */
let editing = null;        /* 고치는 중인 링크의 id */

/* ── 자료 읽고 쓰기 ──────────────────────────────────────────────── */

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {
    /* 저장이 깨졌어도 앱은 열려야 합니다 — 처음 자료로 섭니다 */
    console.warn("저장을 읽지 못했습니다. 처음 자료로 시작합니다.", e);
  }
  return (window.LINKS_SEED || []).map(tidy);
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
    tags:  Array.isArray(x.tags) ? x.tags.map(t => String(t).trim()).filter(Boolean) : [],
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

/* ── 화면 그리기 ─────────────────────────────────────────────────── */

function shown() {
  const q = el.q.value.trim().toLowerCase();
  return links.filter(x => {
    for (const t of picked) if (!x.tags.includes(t)) return false;
    if (!q) return true;
    return (x.title + " " + x.url + " " + x.note + " " + x.tags.join(" ")).toLowerCase().includes(q);
  });
}

function host(url) {
  try { return new URL(url).host.replace(/^www\./, ""); }
  catch { return url; }
}

function drawTags() {
  const count = new Map();
  for (const x of links) for (const t of x.tags) count.set(t, (count.get(t) || 0) + 1);
  const names = [...count.keys()].sort((a, b) => count.get(b) - count.get(a) || a.localeCompare(b, "ko"));

  el.tagbar.textContent = "";
  for (const t of names) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tag";
    b.setAttribute("aria-pressed", picked.has(t) ? "true" : "false");
    b.append(document.createTextNode(t));
    const n = document.createElement("span");
    n.className = "n";
    n.textContent = count.get(t);
    b.append(n);
    b.addEventListener("click", () => {
      if (picked.has(t)) picked.delete(t); else picked.add(t);
      draw();
    });
    el.tagbar.append(b);
  }
}

function drawList() {
  const rows = shown();
  el.list.textContent = "";

  if (!rows.length) {
    const d = document.createElement("li");
    d.className = "empty";
    d.textContent = links.length ? "걸리는 것이 없습니다." : "아직 넣은 링크가 없습니다. ＋ 로 넣으십시오.";
    el.list.append(d);
    return;
  }

  for (const x of rows) {
    const li = document.createElement("li");
    li.className = "row";

    /* 진짜 <a href> 입니다 — 길게 누르기·우클릭 메뉴가 살아 있어야 합니다 */
    const a = document.createElement("a");
    a.className = "t";
    a.href = x.url;
    a.target = "_blank";
    a.rel = "noreferrer noopener";
    a.textContent = x.title || x.url;
    li.append(a);

    const h = document.createElement("span");
    h.className = "host";
    h.textContent = host(x.url);
    li.append(h);

    if (x.note) {
      const p = document.createElement("p");
      p.className = "note";
      p.textContent = x.note;
      li.append(p);
    }

    if (x.tags.length) {
      const wrap = document.createElement("div");
      wrap.className = "tags";
      for (const t of x.tags) {
        const s = document.createElement("span");
        s.textContent = t;
        wrap.append(s);
      }
      li.append(wrap);
    }

    const acts = document.createElement("div");
    acts.className = "acts";
    acts.append(mini("고치기", () => openPanel(x)));
    acts.append(mini("주소 베끼기", () => copy(x.url)));
    acts.append(mini("지우기", () => remove(x), true));
    li.append(acts);

    el.list.append(li);
  }
}

function mini(label, fn, bad) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "small" + (bad ? " bad" : "");
  b.textContent = label;
  b.addEventListener("click", fn);
  return b;
}

function draw() { drawTags(); drawList(); }

/* ── 넣기·고치기·지우기 ─────────────────────────────────────────── */

function openPanel(x) {
  editing = x ? x.id : null;
  el.url.value   = x ? x.url : "";
  el.title.value = x ? x.title : "";
  el.tags.value  = x ? x.tags.join(", ") : [...picked].join(", ");
  el.note.value  = x ? x.note : "";
  el.save.textContent = x ? "고치기" : "넣기";
  el.panel.hidden = false;
  el.url.focus();
}

function closePanel() {
  el.panel.hidden = true;
  editing = null;
  el.panel.reset();
}

el.add.addEventListener("click", () => {
  if (el.panel.hidden) openPanel(null); else closePanel();
});
el.cancel.addEventListener("click", closePanel);

el.panel.addEventListener("submit", e => {
  e.preventDefault();
  let url = el.url.value.trim();
  if (!url) return;
  if (!/^[a-z]+:\/\//i.test(url)) url = "https://" + url;   /* 주소만 적어도 받습니다 */

  const got = {
    url,
    title: el.title.value.trim() || host(url),
    tags:  el.tags.value.split(",").map(t => t.trim()).filter(Boolean),
    note:  el.note.value.trim()
  };

  if (editing) {
    const x = links.find(l => l.id === editing);
    if (x) Object.assign(x, got);
    say("고쳤습니다.");
  } else {
    links.unshift(tidy(Object.assign({}, got, { added: today() })));
    say("넣었습니다.");
  }
  save();
  closePanel();
  draw();
});

function remove(x) {
  if (!confirm("「" + (x.title || x.url) + "」 을 지웁니다. 되돌릴 수 없습니다.")) return;
  links = links.filter(l => l.id !== x.id);
  save();
  draw();
  say("지웠습니다.");
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); say("주소를 베꼈습니다."); }
  catch { say("베끼지 못했습니다 — 주소를 길게 눌러 베끼십시오."); }
}

el.q.addEventListener("input", drawList);

/* ── 내보내기·불러오기 ──────────────────────────────────────────── */

$("export").addEventListener("click", () => {
  /* id 는 이 브라우저에서만 쓰는 번호라 내보내지 않습니다 — 열 때 다시 붙습니다 */
  const body = links.map(x => ({ url: x.url, title: x.title, tags: x.tags, note: x.note, added: x.added }));
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

$("import").addEventListener("click", () => el.file.click());

el.file.addEventListener("change", async () => {
  const f = el.file.files[0];
  if (!f) return;
  try {
    const got = parseSeed(await f.text());
    if (confirm("지금 있는 " + links.length + "개를 불러온 " + got.length + "개로 바꿉니다. 계속할까요?")) {
      links = got;
      picked.clear();
      save();
      draw();
      say(got.length + "개를 불러왔습니다.");
    }
  } catch (e) {
    say("읽지 못했습니다 — 「내보내기」로 받은 data.js 나 JSON 파일인지 보십시오.");
    console.error(e);
  } finally {
    el.file.value = "";
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

$("reset").addEventListener("click", () => {
  if (!confirm("이 브라우저에 쌓은 것을 버리고 data.js 의 처음 자료로 돌아갑니다. 계속할까요?")) return;
  localStorage.removeItem(KEY);
  links = (window.LINKS_SEED || []).map(tidy);
  picked.clear();
  draw();
  say("처음 자료로 되돌렸습니다.");
});

let sayTimer;
function say(text) {
  el.msg.textContent = text;
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { el.msg.textContent = ""; }, 4000);
}

draw();
