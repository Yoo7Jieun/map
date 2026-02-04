/**
 * 예보 API 래퍼 및 점수 계산 로직
 */

import type {
	LatLng,
	ForecastRequest,
	ForecastScores,
	RawForecastApiResponse,
} from "@/types/observation";
import { latLngToGrid } from "./coordConvert";

// ============ API 래퍼 ============

/**
 * 달 위상 계산 (간단한 근사)
 * 음력 주기: 약 29.53일
 */
function calculateMoonPhase(date: Date): number {
	// 2000년 1월 6일 (알려진 신월)을 기준으로 계산
	const knownNewMoon = new Date(2000, 0, 6).getTime();
	const lunarCycle = 29.53059; // 음력 주기 (일)
	const daysSinceNewMoon = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
	const phase = (daysSinceNewMoon % lunarCycle) / lunarCycle;
	return phase; // 0=신월, 0.5=보름
}

/**
 * 달 고도 추정 (간단한 근사)
 */
function estimateMoonAltitude(date: Date, lat: number): number {
	const hour = date.getHours();
	const moonPhase = calculateMoonPhase(date);

	// 보름달은 밤에 높이 떠 있고, 신월은 낮에 떠 있음
	// 밤 9시(21시) 기준으로 계산
	const nightHour = 21;
	const hourDiff = Math.abs(hour - nightHour);

	// 보름달(0.5)일 때 밤에 높이 뜸
	if (moonPhase > 0.4 && moonPhase < 0.6) {
		return 60 - hourDiff * 5; // 보름달은 밤에 높이
	} else if (moonPhase < 0.1 || moonPhase > 0.9) {
		return -20; // 신월은 지평선 아래
	}

	// 그 외에는 위상에 따라 달라짐
	return (30 - Math.abs(0.5 - moonPhase) * 100) - hourDiff * 3;
}

/**
 * 예보 API 호출 (기상청 단기예보 연동)
 */
export async function fetchForecast(req: ForecastRequest): Promise<RawForecastApiResponse> {
	try {
		// 위경도를 기상청 격자 좌표로 변환
		const grid = latLngToGrid(req.location.lat, req.location.lng);

		// API 호출
		const response = await fetch(
			`/api/forecast?nx=${grid.nx}&ny=${grid.ny}&date=${req.date}`
		);

		if (!response.ok) {
			throw new Error(`API 오류: ${response.status}`);
		}

		const data = await response.json();
		console.log("[Forecast] API 응답:", data);

		// 대상 날짜 기준 달 정보 계산
		const targetDate = new Date(req.date + "T21:00:00"); // 밤 9시 기준
		const moonPhase = calculateMoonPhase(targetDate);
		const moonAltitude = estimateMoonAltitude(targetDate, req.location.lat);

		// 시정 추정 (습도와 강수확률 기반)
		let visibility = 15000; // 기본 15km
		if (data.humidity > 80) visibility = 5000;
		else if (data.humidity > 60) visibility = 10000;
		if (data.precipitation > 50) visibility = Math.min(visibility, 3000);

		return {
			temperature: data.temperature || 10,
			humidity: data.humidity || 50,
			cloudCover: data.cloudCover || 50,
			windSpeed: data.windSpeed || 2,
			visibility,
			precipitation: data.precipitation || 0,
			moonPhase,
			moonAltitude,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		console.error("[Forecast] API 호출 실패:", error);

		// 폴백: Mock 데이터
		const dateHash = req.date.split("-").reduce((a, b) => a + parseInt(b), 0);
		const locHash = Math.floor(req.location.lat * 10 + req.location.lng * 10);
		const seed = (dateHash + locHash) % 100;
		const targetDate = new Date(req.date + "T21:00:00");

		return {
			temperature: 10 + (seed % 20),
			humidity: 30 + (seed % 50),
			cloudCover: seed % 100,
			windSpeed: (seed % 15) / 2,
			visibility: 5000 + (seed % 10) * 1000,
			precipitation: seed > 70 ? (seed % 10) / 10 : 0,
			moonPhase: calculateMoonPhase(targetDate),
			moonAltitude: estimateMoonAltitude(targetDate, req.location.lat),
			timestamp: new Date().toISOString(),
		};
	}
}

// ============ 점수 계산 로직 ============

/**
 * 구름 점수 계산 (cloudCover 기반)
 * 0% 구름 = 100점, 100% 구름 = 0점
 */
function calculateCloudScore(cloudCover: number): number {
	return Math.max(0, Math.min(100, 100 - cloudCover));
}

/**
 * 투명도 점수 계산 (습도 + 시정 기반)
 */
function calculateTransparencyScore(humidity: number, visibility: number): number {
	// 습도 점수 (낮을수록 좋음)
	let humidityScore = 100;
	if (humidity > 80) {
		humidityScore = 20;
	} else if (humidity > 60) {
		humidityScore = 50;
	} else if (humidity > 40) {
		humidityScore = 80;
	}

	// 시정 점수
	let visibilityScore = 100;
	if (visibility < 1000) {
		visibilityScore = 10;
	} else if (visibility < 5000) {
		visibilityScore = 40;
	} else if (visibility < 10000) {
		visibilityScore = 80;
	}

	// 가중 평균 (시정에 더 비중)
	return Math.round(humidityScore * 0.3 + visibilityScore * 0.7);
}

/**
 * 달 점수 계산 (어두울수록 높은 점수)
 * moonPhase: 0=신월(좋음), 0.5=보름(나쁨)
 * moonAltitude: 지평선 아래면 좋음
 */
function calculateMoonScore(moonPhase: number, moonAltitude: number): number {
	// 달 위상 점수 (신월=100, 보름=0)
	const phaseScore = 100 - Math.abs(moonPhase - 0) * 200;

	// 달 고도 점수 (지평선 아래면 100, 높이 떠있으면 낮음)
	let altitudeScore = 100;
	if (moonAltitude > 0) {
		altitudeScore = Math.max(0, 100 - moonAltitude * 2);
	}

	// 보름달이라도 지평선 아래면 괜찮음
	if (moonAltitude < 0) {
		return 100;
	}

	return Math.round((phaseScore + altitudeScore) / 2);
}

/**
 * 광공해 점수 계산 (위치 기반)
 */
function calculateLightPollutionScore(location: LatLng): number {
	// 대한민국 지역별 대략적인 광공해 수준
	const { lat, lng } = location;

	// 수도권 (서울, 인천, 경기)
	if (lat >= 37.0 && lat <= 37.8 && lng >= 126.5 && lng <= 127.5) {
		return 20; // 광공해 심함
	}

	// 부산, 대구, 광주 등 대도시
	if (
		(lat >= 35.0 && lat <= 35.3 && lng >= 129.0 && lng <= 129.3) ||
		(lat >= 35.8 && lat <= 36.0 && lng >= 128.5 && lng <= 128.7) ||
		(lat >= 35.1 && lat <= 35.2 && lng >= 126.8 && lng <= 126.9)
	) {
		return 30;
	}

	// 중소도시
	if (lat >= 36.0 && lat <= 38.0 && lng >= 126.0 && lng <= 130.0) {
		return 60;
	}

	// 산간/농어촌 지역
	return 90;
}

/**
 * 종합 관측 적합도 지수 (CSI) 계산
 */
function calculateCSI(
	cloudScore: number,
	transparencyScore: number,
	moonScore: number,
	lightPollutionScore: number
): number {
	// 가중치: 구름(40%) > 달(25%) > 광공해(20%) > 투명도(15%)
	return Math.round(
		cloudScore * 0.4 +
		moonScore * 0.25 +
		lightPollutionScore * 0.2 +
		transparencyScore * 0.15
	);
}

/**
 * CSI를 별점으로 변환 (0~5, 0.5 단위)
 */
function csiToStars(csi: number): number {
	const stars = (csi / 100) * 5;
	return Math.round(stars * 2) / 2; // 0.5 단위로 반올림
}

/**
 * CSI를 설명 텍스트로 변환
 */
function csiToSummary(csi: number, cloudScore: number, moonScore: number): string {
	if (csi >= 80) {
		return "🌟 최적의 관측 조건! 은하수를 선명하게 볼 수 있습니다.";
	}
	if (csi >= 60) {
		return "👍 좋은 관측 조건입니다. 밝은 별과 은하수 일부가 보입니다.";
	}
	if (csi >= 40) {
		if (cloudScore < 50) {
			return "☁️ 구름이 많아 관측이 어려울 수 있습니다.";
		}
		if (moonScore < 50) {
			return "🌙 달빛이 밝아 은하수 관측이 어렵습니다.";
		}
		return "😐 보통 수준의 관측 조건입니다.";
	}
	if (csi >= 20) {
		return "⚠️ 관측 조건이 좋지 않습니다. 다른 날을 추천드립니다.";
	}
	return "❌ 관측에 부적합합니다. 맑은 날을 기다려주세요.";
}

/**
 * 예보 데이터로 전체 점수 계산
 */
export function computeForecastScores(
	raw: RawForecastApiResponse,
	location: LatLng
): ForecastScores {
	const cloudScore = calculateCloudScore(raw.cloudCover);
	const transparencyScore = calculateTransparencyScore(raw.humidity, raw.visibility);
	const moonScore = calculateMoonScore(raw.moonPhase, raw.moonAltitude);
	const lightPollutionScore = calculateLightPollutionScore(location);

	const csi = calculateCSI(cloudScore, transparencyScore, moonScore, lightPollutionScore);
	const ratingStars = csiToStars(csi);
	const summary = csiToSummary(csi, cloudScore, moonScore);

	return {
		cloudScore,
		transparencyScore,
		moonScore,
		lightPollutionScore,
		csi,
		ratingStars,
		summary,
		rawApiData: raw,
	};
}

// ============ 유틸리티 함수 ============

/**
 * 날짜 포맷 변환 (Date → yyyy-MM-dd)
 */
export function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * 오늘부터 N일 후까지의 날짜 목록 생성
 */
export function getDateOptions(days: number = 7): { value: string; label: string }[] {
	const options: { value: string; label: string }[] = [];
	const today = new Date();

	for (let i = 0; i < days; i++) {
		const date = new Date(today);
		date.setDate(today.getDate() + i);
		const value = formatDate(date);
		const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
		const label = i === 0 ? "오늘" : i === 1 ? "내일" : `${date.getMonth() + 1}/${date.getDate()} (${weekday})`;
		options.push({ value, label });
	}

	return options;
}
