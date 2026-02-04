/**
 * 은하수 관측 보조 서비스 - 도메인 타입 정의
 */

// ============ 공통 타입 ============

export type LatLng = {
	lat: number;
	lng: number;
};

// ============ 예보 기능 타입 ============

export type ForecastRequest = {
	location: LatLng;
	date: string; // ISO 형식 (yyyy-MM-dd)
};

export type ForecastScores = {
	cloudScore: number; // 0~100 (구름 점수, 높을수록 맑음)
	transparencyScore: number; // 0~100 (투명도 점수)
	moonScore: number; // 0~100 (달 점수, 높을수록 어두움)
	lightPollutionScore: number; // 0~100 (광공해 점수, 높을수록 어두움)
	csi: number; // 0~100 (종합 관측 적합도 지수)
	ratingStars: number; // 0~5, 0.5 단위
	summary: string; // 간단한 설명
	rawApiData: unknown; // 응답 원본
};

export type RawForecastApiResponse = {
	temperature: number;
	humidity: number;
	cloudCover: number; // 0~100%
	windSpeed: number;
	visibility: number;
	precipitation: number;
	moonPhase: number; // 0~1 (0=신월, 0.5=보름)
	moonAltitude: number; // 달 고도 (도)
	timestamp: string;
};

// ============ 실시간 기능 타입 ============

export type StationMeta = {
	id: string;
	name: string;
	location: LatLng;
	region?: string; // 지역 (예: 서울, 경기 등)
};

export type StationRealtimeData = {
	stationId: string;
	humidity: number | null; // %
	windSpeed: number | null; // m/s
	visibility: number | null; // m (optional)
	temperature: number | null;
	pressure: number | null; // hPa
	measuredAt: string; // ISO
};

export type StationScore = {
	station: StationMeta;
	cloudScore: number; // 0~100
	transparencyScore: number; // 0~100
	combinedScore: number; // 0~100
	distance: number; // 사용자로부터의 거리 (m)
	lastUpdate: string; // ISO
	// 원시 날씨 데이터
	temperature: number | null;
	humidity: number | null;
	windSpeed: number | null;
	visibility: number | null;
};

// ============ 상태 관리 타입 ============

export type ForecastState = {
	selectedLocation: LatLng | null;
	selectedDate: string | null;
	loading: boolean;
	error: string | null;
	result: ForecastScores | null;
};

export type RealtimeState = {
	userLocation: LatLng | null;
	stations: StationMeta[];
	nearbyStationIds: string[];
	stationScores: StationScore[];
	loading: boolean;
	error: string | null;
	lastUpdateAt: string | null;
	isTracking: boolean;
};

// ============ 유틸리티 타입 ============

export type TabType = "forecast" | "realtime";

export type MapClickEvent = {
	latlng: LatLng;
};
