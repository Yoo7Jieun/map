/**
 * 클라이언트 사이드 천문 계산
 * astronomy-engine 라이브러리 사용
 */

import { Observer, Body, Equator, Horizon, SearchRiseSet, Illumination, MoonPhase } from "astronomy-engine";

export interface CelestialInfo {
	// 달 정보
	moonAltitude: number;
	moonAzimuth: number;
	moonIllumination: number;
	moonPhase: string;
	moonRise: Date | null;
	moonSet: Date | null;

	// 은하수 중심(궁수자리) 정보
	milkyWayCenterAltitude: number;
	milkyWayCenterAzimuth: number;

	// 관측 적합도
	isGoodForObservation: boolean;
	observationScore: number; // 0-100
	
	// 관측 가능 시간
	observationStartTime: Date | null; // 천문 박명 종료 시간 (해가 -18도 아래)
	observationEndTime: Date | null; // 다음날 천문 박명 시작 시간
}

/**
 * 달 위상 이름 반환
 */
function getMoonPhaseName(phase: number): string {
	if (phase < 22.5) return "🌑 삭";
	if (phase < 67.5) return "🌒 초승달";
	if (phase < 112.5) return "🌓 상현달";
	if (phase < 157.5) return "🌔 상현망";
	if (phase < 202.5) return "🌕 보름달";
	if (phase < 247.5) return "🌖 하현망";
	if (phase < 292.5) return "🌗 하현달";
	if (phase < 337.5) return "🌘 그믐달";
	return "🌑 삭";
}

/**
 * 은하수 중심 (궁수자리 A*) 좌표
 * RA: 17h 45m 40s, Dec: -29° 0' 28"
 */
const GALACTIC_CENTER = {
	ra: 17 + 45 / 60 + 40 / 3600, // 시간 단위
	dec: -(29 + 0 / 60 + 28 / 3600), // 도 단위
};

/**
 * 적경/적위를 고도/방위각으로 변환
 */
function equatorialToHorizontal(
	ra: number, // 시간 단위
	dec: number, // 도 단위
	date: Date,
	lat: number,
	lng: number
): { altitude: number; azimuth: number } {
	const observer = new Observer(lat, lng, 0);

	// 항성시 계산
	const jd = date.getTime() / 86400000 + 2440587.5;
	const T = (jd - 2451545.0) / 36525;
	const GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * (0.000387933 - T / 38710000);
	const LST = (GMST + lng) % 360;

	// 시간각 계산
	const HA = (LST - ra * 15 + 360) % 360;
	const HArad = (HA * Math.PI) / 180;
	const decRad = (dec * Math.PI) / 180;
	const latRad = (lat * Math.PI) / 180;

	// 고도 계산
	const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(HArad);
	const altitude = (Math.asin(sinAlt) * 180) / Math.PI;

	// 방위각 계산
	const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
	let azimuth = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;
	if (Math.sin(HArad) > 0) azimuth = 360 - azimuth;

	return { altitude, azimuth };
}

/**
 * 해가 진 후 관측 가능 시간 계산 (천문 박명 종료/시작)
 * 천문 박명: 해가 지평선 아래 -18도 이하일 때 (완전히 캄캄한 상태)
 */
function calculateObservationTime(lat: number, lng: number, date: Date): { start: Date | null; end: Date | null } {
	const observer = new Observer(lat, lng, 0);
	
	let start: Date | null = null;
	let end: Date | null = null;
	
	try {
		// 해가 -18도 아래로 내려간 시간 (천문 박명 종료 = 관측 시작)
		// SearchAltitude가 없을 수 있으므로 SearchRiseSet을 사용하여 해가 지는 시간을 찾고, 그 후 -18도가 되는 시간을 추정
		const sunsetResult = SearchRiseSet(Body.Sun, observer, -1, date, 1);
		if (sunsetResult) {
			const sunsetTime = sunsetResult.date;
			// 해가 진 후 약 1.5시간 후에 천문 박명이 종료됨 (대략적 추정)
			start = new Date(sunsetTime.getTime() + 1.5 * 60 * 60 * 1000);
		}
		
		// 다음날 해가 -18도에서 올라오는 시간 (천문 박명 시작 = 관측 종료)
		const nextDay = new Date(date);
		nextDay.setDate(nextDay.getDate() + 1);
		const sunriseResult = SearchRiseSet(Body.Sun, observer, 1, nextDay, 1);
		if (sunriseResult) {
			const sunriseTime = sunriseResult.date;
			// 해가 뜨기 전 약 1.5시간 전에 천문 박명이 시작됨 (대략적 추정)
			end = new Date(sunriseTime.getTime() - 1.5 * 60 * 60 * 1000);
		}
	} catch (err) {
		console.warn("[Astronomy] 관측 시간 계산 실패:", err);
		// 계산 실패 시 null 반환
	}
	
	return { start, end };
}

/**
 * 천문 정보 계산
 * 관측 적합도는 해가 진 후 시간 기준으로 계산
 */
export function calculateCelestialInfo(lat: number, lng: number, date: Date = new Date()): CelestialInfo {
	try {
		const observer = new Observer(lat, lng, 0);

		// 관측 가능 시간 계산 (해가 -18도 아래)
		const observationTime = calculateObservationTime(lat, lng, date);
		
		// 관측 시간대의 대표 시간 (천문 박명 종료 후 1시간)
		const observationDate = observationTime.start 
			? new Date(observationTime.start.getTime() + 60 * 60 * 1000) 
			: new Date(date.getTime() + 12 * 60 * 60 * 1000); // 기본값: 현재 시간 + 12시간

		// 달 위치 계산 (관측 시간대 기준)
		const moonEq = Equator(Body.Moon, observationDate, observer, true, true);
		const moonHor = Horizon(observationDate, observer, moonEq.ra, moonEq.dec, "normal");

		// 달 밝기
		const moonIllum = Illumination(Body.Moon, observationDate);

		// 달 위상
		const moonPhaseAngle = MoonPhase(observationDate);
		const moonPhaseName = getMoonPhaseName(moonPhaseAngle);

		// 달 출몰 시간
		let moonRise: Date | null = null;
		let moonSet: Date | null = null;
		try {
			const riseResult = SearchRiseSet(Body.Moon, observer, 1, observationDate, 1);
			if (riseResult) moonRise = riseResult.date;
			const setResult = SearchRiseSet(Body.Moon, observer, -1, observationDate, 1);
			if (setResult) moonSet = setResult.date;
		} catch (err) {
			console.warn("[Astronomy] 달 출몰 시간 계산 실패:", err);
			// 극지방 등에서 계산 실패할 수 있음
		}

		// 은하수 중심 위치 (관측 시간대 기준)
		const galacticCenter = equatorialToHorizontal(GALACTIC_CENTER.ra, GALACTIC_CENTER.dec, observationDate, lat, lng);

		// 관측 적합도 점수는 별도 함수에서 계산 (빛공해, 구름, 수증기량만 고려)
		// 여기서는 기본값만 설정
		const observationScore = 0;
		const isGoodForObservation = false;

		return {
			moonAltitude: Math.round(moonHor.altitude * 10) / 10,
			moonAzimuth: Math.round(moonHor.azimuth * 10) / 10,
			moonIllumination: Math.round(moonIllum.phase_fraction * 100),
			moonPhase: moonPhaseName,
			moonRise,
			moonSet,
			milkyWayCenterAltitude: Math.round(galacticCenter.altitude * 10) / 10,
			milkyWayCenterAzimuth: Math.round(galacticCenter.azimuth * 10) / 10,
			isGoodForObservation,
			observationScore,
			observationStartTime: observationTime.start,
			observationEndTime: observationTime.end,
		};
	} catch (err) {
		console.error("[Astronomy] 천문 정보 계산 실패:", err);
		// 에러 발생 시 기본값 반환
		return {
			moonAltitude: 0,
			moonAzimuth: 0,
			moonIllumination: 0,
			moonPhase: "—",
			moonRise: null,
			moonSet: null,
			milkyWayCenterAltitude: 0,
			milkyWayCenterAzimuth: 0,
			isGoodForObservation: false,
			observationScore: 0,
			observationStartTime: null,
			observationEndTime: null,
		};
	}
}
