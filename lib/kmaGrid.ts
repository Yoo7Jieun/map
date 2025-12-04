// KMA Lambert Conformal Conic grid conversion (to 5km grid nx, ny)
// Based on official specification from KMA (Vilage forecast)
export function latLonToGrid(lat: number, lon: number) {
	const RE = 6371.00877; // Earth radius (km)
	const GRID = 5.0; // Grid spacing (km)
	const SLAT1 = 30.0;
	const SLAT2 = 60.0;
	const OLON = 126.0;
	const OLAT = 38.0;
	const XO = 43; // Origin X (GRID)
	const YO = 136; // Origin Y (GRID)
	const DEGRAD = Math.PI / 180.0;

	const re = RE / GRID;
	const slat1 = SLAT1 * DEGRAD;
	const slat2 = SLAT2 * DEGRAD;
	const olon = OLON * DEGRAD;
	const olat = OLAT * DEGRAD;

	let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
	sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
	let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
	sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
	let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
	ro = (re * sf) / Math.pow(ro, sn);
	let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
	ra = (re * sf) / Math.pow(ra, sn);
	let theta = lon * DEGRAD - olon;
	if (theta > Math.PI) theta -= 2.0 * Math.PI;
	if (theta < -Math.PI) theta += 2.0 * Math.PI;
	theta *= sn;
	const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
	const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
	return { nx: x, ny: y };
}

// Server-side grid conversion cache
const gridCache = new Map<string, { nx: number; ny: number }>();

// Convert lat/lon to grid using KMA server API (more accurate than local calculation)
export async function latLonToGridServer(lat: number, lon: number, authKey: string): Promise<{ nx: number; ny: number }> {
	const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
	if (gridCache.has(cacheKey)) {
		return gridCache.get(cacheKey)!;
	}

	const url = `https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-dfs_xy_lonlat?lon=${lon}&lat=${lat}&help=0&authKey=${authKey}`;
	try {
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`Grid conversion ${res.status}`);
		}
		const text = await res.text();
		// Parse CSV-like response: lon,lat,x,y
		const lines = text.trim().split(/\r?\n/);
		const dataLine = lines.find((ln) => !ln.startsWith("#") && ln.includes(","));
		if (!dataLine) throw new Error("Invalid grid response");
		const parts = dataLine.split(",").map((s) => s.trim());
		const x = parseInt(parts[2], 10);
		const y = parseInt(parts[3], 10);
		if (Number.isNaN(x) || Number.isNaN(y)) throw new Error("Invalid grid numbers");
		const result = { nx: x, ny: y };
		gridCache.set(cacheKey, result);
		return result;
	} catch (err) {
		// Fallback to local calculation
		console.warn("Server grid conversion failed, using local:", err);
		return latLonToGrid(lat, lon);
	}
}
