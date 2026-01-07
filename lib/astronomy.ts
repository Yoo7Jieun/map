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
 * 천문 정보 계산
 */
export function calculateCelestialInfo(lat: number, lng: number, date: Date = new Date()): CelestialInfo {
	const observer = new Observer(lat, lng, 0);

	// 달 위치 계산
	const moonEq = Equator(Body.Moon, date, observer, true, true);
	const moonHor = Horizon(date, observer, moonEq.ra, moonEq.dec, "normal");

	// 달 밝기
	const moonIllum = Illumination(Body.Moon, date);

	// 달 위상
	const moonPhaseAngle = MoonPhase(date);
	const moonPhaseName = getMoonPhaseName(moonPhaseAngle);

	// 달 출몰 시간
	let moonRise: Date | null = null;
	let moonSet: Date | null = null;
	try {
		const riseResult = SearchRiseSet(Body.Moon, observer, 1, date, 1);
		if (riseResult) moonRise = riseResult.date;
		const setResult = SearchRiseSet(Body.Moon, observer, -1, date, 1);
		if (setResult) moonSet = setResult.date;
	} catch {
		// 극지방 등에서 계산 실패할 수 있음
	}

	// 은하수 중심 위치
	const galacticCenter = equatorialToHorizontal(GALACTIC_CENTER.ra, GALACTIC_CENTER.dec, date, lat, lng);

	// 관측 적합도 점수 계산 (0-100)
	let score = 0;

	// 달 조건 (40점)
	// - 달이 지평선 아래: +20점
	// - 달 밝기 낮을수록: +20점
	if (moonHor.altitude < 0) {
		score += 20;
	} else if (moonHor.altitude < 10) {
		score += 10;
	}
	score += Math.round((1 - moonIllum.phase_fraction) * 20);

	// 은하수 조건 (60점)
	// - 은하수 고도 높을수록: 최대 60점
	if (galacticCenter.altitude > 0) {
		score += Math.min(60, Math.round(galacticCenter.altitude));
	}

	const isGoodForObservation = score >= 50 && galacticCenter.altitude > 15;

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
		observationScore: score,
	};
}
