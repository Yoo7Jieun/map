// global.d.ts
export {};

declare global {
	interface Window {
		kakao?: any; // 임시: 필요한 경우 더 정밀한 타입 정의 추가
	}

	const kakao: any;
}
