/* =====================================================================
 *  한파일로묶기 — 앱을 HTML 한 장으로 묶습니다
 * ---------------------------------------------------------------------
 *    node tools/한파일로묶기.js 링크서랍
 *      → 링크서랍_1.0.3.html  (저장소 뿌리에 떨어집니다)
 *
 *  무엇에 쓰나
 *    서버 없이 그 파일 하나만 있으면 돕니다. 받아서 두 번 누르면 열리고,
 *    휴대폰에 보내 열어도 됩니다. 이름에 판 번호가 들어가 어느 판인지 압니다.
 *
 *  어떻게 묶나
 *    index.html 의 <script src="…"> 를 그 파일 속살로 바꿔 넣습니다.
 *    ?v= 는 뗍니다 — 한 장뿐이라 캐시 갈이가 필요 없습니다.
 *    「← 앱 목록」 줄도 뗍니다 — 혼자 도는 파일에는 갈 목록이 없습니다.
 *
 *  알아 둘 것
 *    file:// 로 열면 저장(localStorage)이 **그 파일만의 자리**에 쌓입니다.
 *    웹에 올린 판과 자료가 섞이지 않습니다. 옮기려면 「내보내기」를 쓰십시오.
 *
 *  묶은 파일은 저장소에 올리지 않습니다(.gitignore) — 언제든 다시 만듭니다.
 * ===================================================================== */

const fs = require("fs");
const path = require("path");

const name = process.argv[2];
if (!name) {
  console.error("어느 앱을 묶을지 적어 주십시오 —  node tools/한파일로묶기.js 링크서랍");
  process.exit(1);
}

const 뿌리 = path.join(__dirname, "..");
const dir  = path.join(뿌리, "apps", name);
const html = path.join(dir, "index.html");

if (!fs.existsSync(html)) {
  console.error(`apps/${name}/index.html 이 없습니다.`);
  process.exit(1);
}

let s = fs.readFileSync(html, "utf8");

/* 판 번호 — 파일 이름에 씁니다 */
const 판 = (s.match(/\?v=(\d+\.\d+\.\d+)/) || [])[1] || "0.0.0";

/* <script src="앞.js?v=…"></script> → 그 파일 속살 */
let 묶은수 = 0;
s = s.replace(/<script src="([^"]+?\.js)(\?v=[^"]*)?"><\/script>/g, (whole, src) => {
  const f = path.join(dir, src);
  if (!fs.existsSync(f)) {
    console.error(`  ! ${src} 가 없습니다 — 그대로 둡니다`);
    return whole;
  }
  묶은수++;
  /* 코드 안의 </script> 는 HTML 파서가 먼저 집어 가므로 갈라 둡니다 */
  const 속 = fs.readFileSync(f, "utf8").replace(/<\/script>/g, "<\\/script>");
  return `<script>\n/* ── ${src} ─────────────────────────────── */\n${속}\n</script>`;
});

/* 혼자 도는 파일에는 갈 「앱 목록」 이 없습니다 */
s = s.replace(/\s*<a class="back"[^>]*>[^<]*<\/a>/, "");

/* 머리말 */
s = s.replace(/^<!doctype html>/i,
  `<!doctype html>\n<!-- ${name} ${판} — ${new Date().toISOString().slice(0, 10)} 에 한 장으로 묶었습니다.\n` +
  `     node tools/한파일로묶기.js ${name} 로 언제든 다시 만듭니다. -->`);

const 나갈곳 = path.join(뿌리, `${name}_${판}.html`);
fs.writeFileSync(나갈곳, s);

const kb = Math.round(fs.statSync(나갈곳).size / 1024);
console.log(`${name}_${판}.html  —  스크립트 ${묶은수}개를 넣었습니다 · ${kb}KB`);
console.log(`받아서 두 번 누르면 열립니다. 저장은 이 파일만의 자리에 쌓입니다.`);
