/* 앱 이름 — 하는 일 한 줄 */

const out = document.getElementById("out");
const go  = document.getElementById("go");

go.addEventListener("click", () => {
  out.textContent = "눌렀습니다 — " + new Date().toLocaleTimeString("ko-KR");
});
