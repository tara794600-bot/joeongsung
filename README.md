# 탐정법인 정성 랜딩페이지

`렌딩페이지.svg`의 메인 데스크톱·모바일 구성을 React 컴포넌트와 반응형 CSS로 옮긴 랜딩페이지 골격입니다. 상담 폼은 Vercel Function을 거쳐 Firebase Firestore의 `consultationRequests` 컬렉션에 저장되며, Google Sheets와 Telegram으로도 전달됩니다.

## 실행

```bash
npm install
npm run dev
```

Vite 개발 서버는 화면 확인용입니다. 상담 API까지 로컬에서 확인하려면 Vercel CLI로 프로젝트를 연결한 뒤 아래 명령을 사용합니다.

```bash
vercel dev
```

## Firebase / Vercel 환경 변수

`.env.example`을 참고해 Vercel 프로젝트의 Development, Preview, Production 환경에 다음 값을 등록합니다.

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SHEET_RANGE` (기본값: `상담신청!A:I`)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

`FIREBASE_PRIVATE_KEY`는 줄바꿈을 `\n`으로 보존해 입력합니다. 브라우저에는 Firebase 관리자 인증정보가 포함되지 않으며, Firestore 쓰기는 `api/consultations.ts`에서만 수행됩니다.

Google Cloud Console에서 Sheets API를 활성화하고, 대상 스프레드시트를 `FIREBASE_CLIENT_EMAIL`의 서비스 계정 이메일에 편집자로 공유해야 합니다. 첫 번째 행에는 아래 순서로 헤더를 만들어 두면 됩니다.

```text
접수시간 | 접수번호 | 이름 | 연락처 | 상담가능시간 | 문의내용 | 상태 | 국가 | 유입경로
```

Telegram은 BotFather에서 만든 봇 토큰과 메시지를 받을 개인·그룹의 Chat ID를 등록합니다. 그룹으로 전송할 경우 봇을 해당 그룹에 먼저 초대해야 합니다.

외부 채널 전송 결과는 각 Firestore 문서의 `delivery.googleSheets`, `delivery.telegram` 필드에 `delivered` 또는 `failed` 상태로 기록됩니다. 한 채널의 장애가 있어도 Firestore의 원본 상담 접수는 유지됩니다.

`firebase/firestore.rules`는 클라이언트의 직접 읽기·쓰기를 막는 기본 규칙입니다. Firebase Admin SDK를 사용하는 Vercel Function은 이 규칙과 별도로 서버 권한으로 저장합니다.

## 확인 명령

```bash
npm run lint
npm run build
```

실제 운영 전에는 `src/App.tsx`의 전화번호, 사업자 정보, 개인정보처리방침 링크와 문구를 확정해야 합니다.
