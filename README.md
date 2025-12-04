# my-map-app (Next.js + Kakao Maps 샘플)

간단한 Next.js 샘플 프로젝트입니다. Kakao Maps JavaScript SDK를 사용해 지도 위에 사용자 데이터 레이어(마커)를 표시하고, 카테고리 필터로 표시 항목을 제어하는 예제입니다.

빠른 시작

1. Node.js (v18+)가 설치되어 있는지 확인하세요.
2. 프로젝트 루트에서 의존성 설치:

```bash
npm install
```

3. 환경변수 설정: Kakao Developers에서 발급한 JS 키를 `NEXT_PUBLIC_KAKAO_KEY`로 설정하세요.

macOS / Linux 예:

```bash
export NEXT_PUBLIC_KAKAO_KEY=your_kakao_js_key_here
npm run dev
```

4. 브라우저에서 `http://localhost:3000` 열기

메모

- 이 예제는 개발·테스트용 샘플 데이터만 포함합니다.
- 상용 배포 시 Kakao API 이용약관과 사용량을 반드시 확인하세요.
