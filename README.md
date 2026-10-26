# mini-apps

브라우저에서 바로 돌아가는 작은 앱들을 한 저장소에 모아 둡니다.
빌드 도구도, 설치할 것도 없습니다 — `index.html` 을 열면 그대로 돌아갑니다.

## 구조

```
index.html          앱 목록 — 여기서 각 앱으로 들어갑니다
apps/<앱이름>/       앱 하나. 저마다 독립입니다
  index.html          화면
  app.js              동작
  README.md           이 앱이 무엇인지 한 줄
  assets/             (쓸 때만) 그림·소리
apps/_틀/            새 앱을 만들 때 베껴 쓰는 빈 틀
.claude/launch.json  미리보기 서버 설정 (python http.server :8766)
```

앱끼리 코드를 나눠 쓰지 않습니다. 한 앱을 고쳐도 다른 앱은 건드리지 않습니다 —
작은 앱을 여럿 두는 저장소에서는 그것이 가장 싸게 먹힙니다.

## 미리보기

`file://` 로 열어도 대개 돌아가지만, 쪽 파일을 불러오는 앱은 서버가 있어야 합니다.

```bash
python -m http.server 8766 --bind 127.0.0.1
```

그 다음 http://127.0.0.1:8766/ 을 엽니다. Claude Code 에서는 `.claude/launch.json` 의
`mini-apps` 설정이 같은 일을 합니다.

## 새 앱 만들기

1. `apps/_틀/` 을 `apps/<앱이름>/` 으로 베낍니다.
2. `index.html` 의 `<title>` 과 `<h1>` 을 고칩니다.
3. 그 앱 `README.md` 에 무엇을 하는 앱인지 한 줄 적습니다.
4. 뿌리 `index.html` 의 앱 목록에 한 줄 더합니다.

```bash
cp -r apps/_틀 "apps/<앱이름>"
```

## 앱 목록

| 앱 | 하는 일 |
|---|---|
| (아직 없습니다) | |
