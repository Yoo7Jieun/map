// 태백시 행정구역 경계 (근사치 예시; 실제 행정 경계로 교체 필요)
// 실제 정확한 경계를 사용하려면 공식 행정구역 GeoJSON을 수집하여 좌표를 대체하세요.
// WGS84 위경도 배열 (시계 방향)
export const TAEBEAK_BOUNDARY: { lat: number; lng: number }[] = [
	{ lat: 37.2545, lng: 128.9042 },
	{ lat: 37.2413, lng: 128.9507 },
	{ lat: 37.2302, lng: 128.9901 },
	{ lat: 37.2174, lng: 129.0278 },
	{ lat: 37.1982, lng: 129.0604 },
	{ lat: 37.1763, lng: 129.0832 },
	{ lat: 37.1504, lng: 129.0919 },
	{ lat: 37.1218, lng: 129.0796 },
	{ lat: 37.1039, lng: 129.0512 },
	{ lat: 37.0911, lng: 129.0127 },
	{ lat: 37.0817, lng: 128.9684 },
	{ lat: 37.0792, lng: 128.9208 },
	{ lat: 37.0859, lng: 128.8746 },
	{ lat: 37.1017, lng: 128.8341 },
	{ lat: 37.1269, lng: 128.8076 },
	{ lat: 37.1563, lng: 128.7943 },
	{ lat: 37.1865, lng: 128.7962 },
	{ lat: 37.2144, lng: 128.8119 },
	{ lat: 37.2362, lng: 128.8384 },
	{ lat: 37.2507, lng: 128.8748 },
];

// 다각형 포함 여부 (Ray casting algorithm)
export function isPointInPolygon(lat: number, lng: number, poly: { lat: number; lng: number }[]): boolean {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const xi = poly[i].lng,
			yi = poly[i].lat;
		const xj = poly[j].lng,
			yj = poly[j].lat;
		const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0000001) + xi;
		if (intersect) inside = !inside;
	}
	return inside;
}
