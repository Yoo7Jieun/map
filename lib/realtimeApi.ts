/**
 * 실시간 관측 API 래퍼 및 점수 계산 로직
 */

import type {
	LatLng,
	StationMeta,
	StationRealtimeData,
	StationScore,
} from "@/types/observation";

// ============ 관측소 메타 데이터 (Mock) ============

/**
 * 전국 관측소 목록 (실제 구현 시 API에서 로드하거나 정적 파일 사용)
 */
export const STATION_LIST: StationMeta[] = [
	// 서울/경기
	{ id: "108", name: "서울", location: { lat: 37.5714, lng: 126.9658 }, region: "서울" },
	{ id: "119", name: "수원", location: { lat: 37.2634, lng: 126.9881 }, region: "경기" },
	{ id: "202", name: "양평", location: { lat: 37.4887, lng: 127.4944 }, region: "경기" },
	{ id: "203", name: "이천", location: { lat: 37.2638, lng: 127.4844 }, region: "경기" },
	// 강원
	{ id: "101", name: "춘천", location: { lat: 37.9025, lng: 127.7356 }, region: "강원" },
	{ id: "105", name: "강릉", location: { lat: 37.7514, lng: 128.8908 }, region: "강원" },
	{ id: "114", name: "원주", location: { lat: 37.3376, lng: 127.9453 }, region: "강원" },
	{ id: "216", name: "태백", location: { lat: 37.1697, lng: 128.9856 }, region: "강원" },
	{ id: "217", name: "정선", location: { lat: 37.3808, lng: 128.6609 }, region: "강원" },
	// 충청
	{ id: "131", name: "청주", location: { lat: 36.6394, lng: 127.4403 }, region: "충북" },
	{ id: "133", name: "대전", location: { lat: 36.3722, lng: 127.3725 }, region: "대전" },
	{ id: "232", name: "천안", location: { lat: 36.7639, lng: 127.2906 }, region: "충남" },
	// 전라
	{ id: "140", name: "군산", location: { lat: 36.0017, lng: 126.7628 }, region: "전북" },
	{ id: "146", name: "전주", location: { lat: 35.8414, lng: 127.1192 }, region: "전북" },
	{ id: "156", name: "광주", location: { lat: 35.1728, lng: 126.8914 }, region: "광주" },
	{ id: "165", name: "목포", location: { lat: 34.8172, lng: 126.3814 }, region: "전남" },
	// 경상
	{ id: "143", name: "대구", location: { lat: 35.8852, lng: 128.6186 }, region: "대구" },
	{ id: "152", name: "울산", location: { lat: 35.5597, lng: 129.3200 }, region: "울산" },
	{ id: "159", name: "부산", location: { lat: 35.1044, lng: 129.0319 }, region: "부산" },
	{ id: "192", name: "진주", location: { lat: 35.1642, lng: 128.0414 }, region: "경남" },
	{ id: "271", name: "봉화", location: { lat: 36.9433, lng: 128.9144 }, region: "경북" },
	{ id: "277", name: "영덕", location: { lat: 36.5328, lng: 129.4092 }, region: "경북" },
	// 제주
	{ id: "184", name: "제주", location: { lat: 33.5142, lng: 126.5297 }, region: "제주" },
	{ id: "185", name: "고산", location: { lat: 33.2939, lng: 126.1628 }, region: "제주" },
	{ id: "188", name: "성산", location: { lat: 33.3869, lng: 126.8803 }, region: "제주" },
];

// ============ API 래퍼 ============

// 위경도 → 기상청 격자 좌표 변환 (coordConvert.ts에서 가져오기)
import { latLngToGrid } from "./coordConvert";

/**
 * 실시간 관측 데이터 조회 (기상청 초단기예보 API 연동)
 */
export async function fetchRealtimeData(stationIds: string[]): Promise<StationRealtimeData[]> {
	const now = new Date();

	// 각 관측소의 위치 기반으로 기상청 API 호출
	const results = await Promise.all(
		stationIds.map(async (id) => {
			const station = STATION_LIST.find((s) => s.id === id);
			if (!station) {
				return generateMockData(id, now);
			}

			try {
				// 위경도를 기상청 격자 좌표로 변환
				const grid = latLngToGrid(station.location.lat, station.location.lng);

				// 기존 weather API 호출
				const response = await fetch(`/api/weather?nx=${grid.nx}&ny=${grid.ny}`);

				if (!response.ok) {
					console.warn(`[Realtime] 관측소 ${station.name} API 오류:`, response.status);
					return generateMockData(id, now);
				}

				const data = await response.json();
				console.log(`[Realtime] ${station.name} 응답:`, data);

				// 시정 추정 (습도 기반 - 실제 API에서 제공하지 않음)
				let visibility = 15000;
				if (data.humidity > 90) visibility = 2000;
				else if (data.humidity > 80) visibility = 5000;
				else if (data.humidity > 70) visibility = 8000;
				else if (data.humidity > 60) visibility = 12000;

				return {
					stationId: id,
					humidity: data.humidity || 50,
					windSpeed: data.windSpeed || 2, // API에서 제공 안하면 기본값
					visibility,
					temperature: data.temperature || 10,
					pressure: null,
					measuredAt: now.toISOString(),
				};
			} catch (error) {
				console.warn(`[Realtime] 관측소 ${id} 데이터 조회 실패:`, error);
				return generateMockData(id, now);
			}
		})
	);

	return results;
}

/**
 * Mock 데이터 생성 (API 실패 시 폴백)
 */
function generateMockData(stationId: string, now: Date): StationRealtimeData {
	const seed = parseInt(stationId) + now.getMinutes();
	return {
		stationId,
		humidity: 40 + (seed % 40),
		windSpeed: (seed % 20) / 2,
		visibility: 3000 + (seed % 12) * 1000,
		temperature: 5 + (seed % 20),
		pressure: 1010 + (seed % 20),
		measuredAt: now.toISOString(),
	};
}

// ============ 점수 계산 로직 ============

/**
 * 구름 점수 계산 (습도 기반)
 * humidity ≤ 20 → 100점
 * 20 < humidity < 100 → 100 - (humidity - 20) * 1.25
 */
function calculateCloudScore(humidity: number | null): number {
	if (humidity === null) return 50; // 데이터 없으면 중간값

	if (humidity <= 20) return 100;

	const score = 100 - (humidity - 20) * 1.25;
	return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 투명도 점수 계산 (풍속 + 시정 기반)
 */
function calculateTransparencyScore(
	windSpeed: number | null,
	visibility: number | null
): number {
	// 풍속 점수
	let windScore = 100;
	if (windSpeed !== null) {
		if (windSpeed < 5) {
			windScore = 100;
		} else if (windSpeed < 10) {
			windScore = 80 - (windSpeed - 5) * 8;
		} else {
			windScore = 40;
		}
	}

	// 시정 점수
	let visibilityScore = 100;
	if (visibility !== null) {
		if (visibility >= 10000) {
			visibilityScore = 100;
		} else if (visibility >= 5000) {
			visibilityScore = 80;
		} else if (visibility >= 1000) {
			visibilityScore = 40;
		} else {
			visibilityScore = 10;
		}
	}

	// 가중 평균 (시정에 더 비중: 70%)
	const score = windScore * 0.3 + visibilityScore * 0.7;
	return Math.round(score);
}

/**
 * 종합 점수 계산
 */
function calculateCombinedScore(cloudScore: number, transparencyScore: number): number {
	// 구름 점수에 더 비중 (60:40)
	return Math.round(cloudScore * 0.6 + transparencyScore * 0.4);
}

/**
 * 관측소별 점수 계산
 */
export function computeStationScores(
	metaList: StationMeta[],
	dataList: StationRealtimeData[],
	userLocation: LatLng
): StationScore[] {
	const dataMap = new Map(dataList.map((d) => [d.stationId, d]));

	return metaList
		.map((station) => {
			const data = dataMap.get(station.id);
			if (!data) return null;

			const cloudScore = calculateCloudScore(data.humidity);
			const transparencyScore = calculateTransparencyScore(data.windSpeed, data.visibility);
			const combinedScore = calculateCombinedScore(cloudScore, transparencyScore);
			const distance = calculateDistance(userLocation, station.location);

			return {
				station,
				cloudScore,
				transparencyScore,
				combinedScore,
				distance,
				lastUpdate: data.measuredAt,
				// 원시 날씨 데이터 포함
				temperature: data.temperature,
				humidity: data.humidity,
				windSpeed: data.windSpeed,
				visibility: data.visibility,
			};
		})
		.filter((s): s is StationScore => s !== null);
}

// ============ 유틸리티 함수 ============

/**
 * 두 좌표 사이의 거리 계산 (Haversine 공식, 미터 단위)
 */
export function calculateDistance(from: LatLng, to: LatLng): number {
	const R = 6371000; // 지구 반경 (미터)
	const dLat = ((to.lat - from.lat) * Math.PI) / 180;
	const dLng = ((to.lng - from.lng) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((from.lat * Math.PI) / 180) *
			Math.cos((to.lat * Math.PI) / 180) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return Math.round(R * c);
}

/**
 * 가장 가까운 N개 관측소 선택
 */
export function getNearestStations(
	userLocation: LatLng,
	stations: StationMeta[],
	count: number = 5
): StationMeta[] {
	return [...stations]
		.map((station) => ({
			station,
			distance: calculateDistance(userLocation, station.location),
		}))
		.sort((a, b) => a.distance - b.distance)
		.slice(0, count)
		.map(({ station }) => station);
}

/**
 * 거리 포맷 (미터 → km 또는 m)
 */
export function formatDistance(meters: number): string {
	if (meters >= 1000) {
		return `${(meters / 1000).toFixed(1)}km`;
	}
	return `${meters}m`;
}

/**
 * 점수에 따른 색상 반환
 */
export function getScoreColor(score: number): string {
	if (score >= 80) return "#22c55e"; // green
	if (score >= 60) return "#84cc16"; // lime
	if (score >= 40) return "#facc15"; // yellow
	if (score >= 20) return "#f97316"; // orange
	return "#ef4444"; // red
}

/**
 * 점수에 따른 등급 텍스트
 */
export function getScoreGrade(score: number): string {
	if (score >= 80) return "최적";
	if (score >= 60) return "좋음";
	if (score >= 40) return "보통";
	if (score >= 20) return "나쁨";
	return "매우 나쁨";
}
