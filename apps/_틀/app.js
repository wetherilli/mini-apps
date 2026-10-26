/* 앱 이름 — 하는 일 한 줄 */

/* 판 번호 — index.html 의 ?v= 와 같아야 합니다.
   손으로 고치지 말고 `node tools/판올리기.js <앱이름>` 을 쓰십시오. */
const VERSION = "1.0.0";
document.getElementById("ver").textContent = VERSION;

const out = document.getElementById("out");
const go  = document.getElementById("go");

go.addEventListener("click", () => {
  out.textContent = "눌렀습니다 — " + new Date().toLocaleTimeString("ko-KR");
});
