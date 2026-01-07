/**
 * 위경도(WGS84) ↔ 기상청 격자(nx/ny) 좌표 변환
 * 기상청 단기예보 API용
 */

interface GridCoord {
	nx: number;
	ny: number;
}

interface LatLngCoord {
	lat: number;
	lng: number;
}

// 기상청 격자 변환 상수
const RE = 6371.00877; // 지구 반경(km)
const GRID = 5.0; // 격자 간격(km)
const SLAT1 = 30.0; // 투영 위도1(degree)
const SLAT2 = 60.0; // 투영 위도2(degree)
const OLON = 126.0; // 기준점 경도(degree)
const OLAT = 38.0; // 기준점 위도(degree)
const XO = 43; // 기준점 X좌표(GRID)
const YO = 136; // 기준점 Y좌표(GRID)

const DEGRAD = Math.PI / 180.0;
const RADDEG = 180.0 / Math.PI;

const re = RE / GRID;
const slat1 = SLAT1 * DEGRAD;
const slat2 = SLAT2 * DEGRAD;
const olon = OLON * DEGRAD;
const olat = OLAT * DEGRAD;

const sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
const snLog = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
const sf = (Math.tan(Math.PI * 0.25 + slat1 * 0.5) ** snLog * Math.cos(slat1)) / snLog;
const ro = (re * sf) / Math.tan(Math.PI * 0.25 + olat * 0.5) ** snLog;

/**
 * 위경도 → 기상청 격자 좌표 변환
 */
export function latLngToGrid(lat: number, lng: number): GridCoord {
	const ra = (re * sf) / Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5) ** snLog;
	let theta = lng * DEGRAD - olon;
	if (theta > Math.PI) theta -= 2.0 * Math.PI;
	if (theta < -Math.PI) theta += 2.0 * Math.PI;
	theta *= snLog;

	return {
		nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
		ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
	};
}

/**
 * 기상청 격자 좌표 → 위경도 변환
 */
export function gridToLatLng(nx: number, ny: number): LatLngCoord {
	const xn = nx - XO;
	const yn = ro - ny + YO;
	const ra = Math.sqrt(xn * xn + yn * yn);
	const alat = (2.0 * Math.atan(((re * sf) / ra) ** (1.0 / snLog)) - Math.PI * 0.5) * RADDEG;

	let theta = 0;
	if (Math.abs(xn) <= 0.0) {
		theta = 0.0;
	} else if (Math.abs(yn) <= 0.0) {
		theta = Math.PI * 0.5;
		if (xn < 0.0) theta = -theta;
	} else {
		theta = Math.atan2(xn, yn);
	}
	const alon = theta / snLog + olon * RADDEG;

	return {
		lat: alat,
		lng: alon,
	};
}
