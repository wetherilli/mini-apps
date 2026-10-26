/* =====================================================================
 *  아이콘 굽기 — 앱 아이콘 png 를 그려 냅니다
 * ---------------------------------------------------------------------
 *    node tools/아이콘-굽기.js 링크서랍
 *      → apps/링크서랍/icon/icon-192.png · icon-512.png · icon-512-maskable.png
 *
 *  홈 화면에 앉히려면(앱으로 설치) manifest 에 192·512 png 가 있어야 합니다.
 *  그림판을 열 것 없이 여기서 바로 그립니다 — 바탕에 모티브 한 장뿐입니다.
 *
 *  모티브는 아래 MOTIFS 에 앱 이름으로 적습니다. 그리는 규칙은 함수 하나이고,
 *  0~1 로 잰 자리를 받아 「여기 칠할까」 를 답합니다. 새 앱을 더할 때는 그 함수만
 *  씁니다 — 한 장을 세 벌(보통·큰 것·테두리 여유 둔 것)로 굽는 일은 여기서 합니다.
 *
 *  maskable 은 안드로이드가 둥글게·네모나게 제 맘대로 깎는 판입니다. 그래서
 *  모티브를 80% 로 줄여 가운데 둡니다(깎여도 안 잘립니다).
 *
 *  PNG 는 zlib 만으로 만듭니다 — 설치할 것이 없습니다.
 * ===================================================================== */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/* ── 앱마다 바탕색·모티브 ──────────────────────────────────────── */
const MOTIFS = {
  링크서랍: {
    바탕: [0, 0, 0],         /* 까만 바탕 (사용자 지침 2026-10-26) */
    빛:   [255, 255, 255],   /* 하얀 눈 */

    /* 눈 — 위아래로 엇갈린 두 동그라미가 겹친 자리가 눈매(아몬드)입니다.
       가운데를 동그랗게 비우면 바탕이 비쳐 눈동자가 되고, 그 안에 점 하나로 빛을 둡니다.
         눈매 반 너비 0.375 · 반 높이 0.2 →  d = (w²-h²)/2h,  r = d + h        */
    그릴까(x, y) {
      const 거리 = (cx, cy) => Math.hypot(x - cx, y - cy);
      const d = 0.2516, r = 0.4516;

      const 눈매 = 거리(0.5, 0.5 + d) <= r && 거리(0.5, 0.5 - d) <= r;
      if (!눈매) return false;

      if (거리(0.5, 0.5) <= 0.135) {            /* 눈동자 — 바탕색으로 비웁니다 */
        return 거리(0.545, 0.452) <= 0.042;     /* 그 안의 빛 한 점 */
      }
      return true;
    }
  }
};

/* ── PNG 만들기 (24비트 RGB) ───────────────────────────────────── */
function png(width, height, 색뽑기) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0;                                  /* 필터 없음 */
    for (let x = 0; x < width; x++) {
      const [r, g, b] = 색뽑기(x, y);
      raw[p++] = r; raw[p++] = g; raw[p++] = b;
    }
  }

  const 덩이 = (이름, 속) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(속.length);
    const 몸 = Buffer.concat([Buffer.from(이름, "ascii"), 속]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(몸) >>> 0);
    return Buffer.concat([len, 몸, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;    /* 한 칸 8비트 */
  ihdr[9] = 2;    /* 참색(RGB) */

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    덩이("IHDR", ihdr),
    덩이("IDAT", zlib.deflateSync(raw, { level: 9 })),
    덩이("IEND", Buffer.alloc(0))
  ]);
}

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

/* ── 굽기 ──────────────────────────────────────────────────────── */
const name = process.argv[2];
const 도안 = MOTIFS[name];
if (!도안) {
  console.error(`${name || "(앱 이름을 적어 주십시오)"} — 도안이 없습니다.`);
  console.error(`tools/아이콘-굽기.js 의 MOTIFS 에 더한 뒤 다시 돌리십시오.`);
  console.error(`지금 있는 것: ${Object.keys(MOTIFS).join(" · ") || "(없음)"}`);
  process.exit(1);
}

const dir = path.join(__dirname, "..", "apps", name, "icon");
fs.mkdirSync(dir, { recursive: true });

/* 줄임 — 가장자리가 계단지지 않게 한 칸을 3×3 으로 재 봅니다 */
function 칠하기(크기, 줄임) {
  return (x, y) => {
    let 든다 = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      let u = (x + (i + 0.5) / 3) / 크기;
      let v = (y + (j + 0.5) / 3) / 크기;
      u = (u - 0.5) / 줄임 + 0.5;
      v = (v - 0.5) / 줄임 + 0.5;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1 && 도안.그릴까(u, v)) 든다++;
    }
    const a = 든다 / 9;
    return 도안.바탕.map((c, i) => Math.round(c + (도안.빛[i] - c) * a));
  };
}

for (const [파일, 크기, 줄임] of [
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  ["icon-512-maskable.png", 512, 0.8]      /* 깎여도 안 잘리게 */
]) {
  fs.writeFileSync(path.join(dir, 파일), png(크기, 크기, 칠하기(크기, 줄임)));
  console.log(`  apps/${name}/icon/${파일}  (${크기}×${크기})`);
}
console.log("구웠습니다. 눈으로 한 번 보십시오 — 수치로는 알 수 없습니다.");
