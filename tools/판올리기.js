/* =====================================================================
 *  판올리기 — 앱의 판 번호를 한 자리 올립니다
 * ---------------------------------------------------------------------
 *    node tools/판올리기.js 링크서랍            끝자리 +1  (1.0.0 → 1.0.1)
 *    node tools/판올리기.js 링크서랍 가운데      가운데 +1  (1.0.3 → 1.1.0)
 *    node tools/판올리기.js 링크서랍 앞          앞자리 +1  (1.1.2 → 2.0.0)
 *    node tools/판올리기.js 링크서랍 2.3.0       그 번호로
 *    node tools/판올리기.js --모두              앱을 전부 끝자리 +1
 *
 *  왜 있나
 *    브라우저는 주소가 같으면 받아 둔 옛 파일을 한참 더 씁니다. 고쳤는데 휴대폰에서
 *    안 바뀌어 보이는 까닭이 그것입니다. <script src="app.js?v=1.0.0"> 처럼 주소에
 *    판을 달아 두면, 판이 오를 때마다 주소가 갈려 새 파일을 받습니다.
 *
 *  무엇을 고치나
 *    apps/<앱>/index.html 의 ?v=…  (몇 개가 있든 모두)
 *    apps/<앱>/app.js    의 const VERSION = "…"  (있으면)
 *  둘이 어긋나면 화면 아래 「판」 과 실제로 받은 파일이 달라지므로 함께 맞춥니다.
 * ===================================================================== */

const fs = require("fs");
const path = require("path");

const APPS = path.join(__dirname, "..", "apps");
const RE_V   = /(\?v=)(\d+\.\d+\.\d+)/g;
const RE_VER = /(const VERSION\s*=\s*")(\d+\.\d+\.\d+)(")/;
const RE_SW  = /(const CACHE\s*=\s*"[^"]*-v)(\d+\.\d+\.\d+)(")/;

function bump(v, how) {
  if (/^\d+\.\d+\.\d+$/.test(how)) return how;
  const [a, b, c] = v.split(".").map(Number);
  if (how === "앞")     return `${a + 1}.0.0`;
  if (how === "가운데") return `${a}.${b + 1}.0`;
  return `${a}.${b}.${c + 1}`;
}

function 올리기(name, how) {
  const dir  = path.join(APPS, name);
  const html = path.join(dir, "index.html");
  if (!fs.existsSync(html)) {
    console.error(`  ! ${name} — apps/${name}/index.html 이 없습니다`);
    return false;
  }

  let s = fs.readFileSync(html, "utf8");
  const found = [...s.matchAll(RE_V)].map(m => m[2]);
  if (!found.length) {
    console.error(`  ! ${name} — index.html 에 ?v= 가 없습니다.`);
    console.error(`    <script src="app.js?v=1.0.0"> 처럼 먼저 붙여 주십시오.`);
    return false;
  }
  if (new Set(found).size > 1) {
    console.error(`  ! ${name} — ?v= 가 서로 다릅니다: ${[...new Set(found)].join(" · ")}`);
    console.error(`    손으로 하나로 맞춘 뒤 다시 돌리십시오.`);
    return false;
  }

  const 옛 = found[0];
  const 새 = bump(옛, how);
  s = s.replace(RE_V, `$1${새}`);
  fs.writeFileSync(html, s);

  /* app.js 의 VERSION 과 sw.js 의 캐시 이름도 함께 — 어긋나면 더 헷갈립니다 */
  const 같이 = [];
  for (const [파일, 자] of [["app.js", RE_VER], ["sw.js", RE_SW]]) {
    const f = path.join(dir, 파일);
    if (!fs.existsSync(f)) continue;
    const t = fs.readFileSync(f, "utf8");
    if (!자.test(t)) continue;
    fs.writeFileSync(f, t.replace(자, `$1${새}$3`));
    같이.push(파일);
  }

  console.log(`  ${name}  ${옛} → ${새}   (?v= ${found.length}자리${같이.length ? " · " + 같이.join(" · ") : ""})`);
  return true;
}

const [arg1, arg2] = process.argv.slice(2);

if (!arg1 || arg1 === "--도움") {
  console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^\/\* ?=*\n?| \* ?/gm, ""));
  process.exit(arg1 ? 0 : 1);
}

const how = arg2 || "끝";
let ok = true;

if (arg1 === "--모두") {
  const names = fs.readdirSync(APPS, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith("_"))
    .map(d => d.name);
  if (!names.length) { console.error("apps/ 에 앱이 없습니다."); process.exit(1); }
  console.log(`앱 ${names.length}개의 판을 올립니다 —`);
  for (const n of names) ok = 올리기(n, how) && ok;
} else {
  console.log("판을 올립니다 —");
  ok = 올리기(arg1, how);
}

if (!ok) process.exit(1);
console.log("끝났습니다. 휴대폰에서 화면 맨 아래 「판」 이 이 번호인지 보십시오.");
