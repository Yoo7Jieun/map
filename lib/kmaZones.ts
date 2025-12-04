import type { WeatherSnapshot } from "../types/weather";
import { computeAstro } from "./astro";

type ZoneInfo = {
	regId: string;
	regName: string;
	lat: number;
	lon: number;
};

let zoneCache: ZoneInfo[] | null = null;
let lastFetchMs = 0;

async function fetchZoneList(authKey: string): Promise<ZoneInfo[]> {
	const base = "https://apihub.kma.go.kr/api/typ02/openApi/FcstZoneInfoService/getFcstZoneCd";
	const params = new URLSearchParams({
		pageNo: "1",
		numOfRows: "5000",
		dataType: "JSON",
		authKey,
	});
	const res = await fetch(`${base}?${params.toString()}`);
	if (!res.ok) {
		throw new Error(`Zone list ${res.status}`);
	}
	const data = await res.json().catch(() => null);
	let items: any[] = [];
	if (Array.isArray(data?.items)) {
		items = data.items;
	} else if (Array.isArray(data?.response?.body?.items)) {
		items = data.response.body.items;
	} else if (Array.isArray(data?.response?.body?.items?.item)) {
		items = data.response.body.items.item;
	} else if (data?.response?.body?.items?.item) {
		items = [data.response.body.items.item];
	}
	const out: ZoneInfo[] = [];
	for (const it of items) {
		const regId = it.regId || it.REG_ID || it.reg_id;
		const regName = it.regName || it.REG_NAME || it.reg_name || "";
		const lat = parseFloat(String(it.lat ?? it.LAT ?? it.latitude ?? "NaN"));
		const lon = parseFloat(String(it.lon ?? it.LON ?? it.longitude ?? "NaN"));
		if (regId && Number.isFinite(lat) && Number.isFinite(lon)) {
			out.push({ regId, regName, lat, lon });
		}
	}
	return out;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const toRad = (d: number) => (d * Math.PI) / 180;
	const R = 6371000;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export async function ensureZones(): Promise<ZoneInfo[]> {
	const authKey = process.env.KMA_SERVICE_KEY || "";
	const now = Date.now();
	if (zoneCache && now - lastFetchMs < 12 * 60 * 60 * 1000) return zoneCache; // 12h cache
	const zones = await fetchZoneList(authKey);
	zoneCache = zones;
	lastFetchMs = now;
	return zones;
}

export async function findNearestZone(coord: { lat: number; lon: number }): Promise<ZoneInfo | null> {
	const zones = await ensureZones();
	let best: ZoneInfo | null = null;
	let bestD = Infinity;
	for (const z of zones) {
		const d = haversine(coord.lat, coord.lon, z.lat, z.lon);
		if (d < bestD) {
			bestD = d;
			best = z;
		}
	}
	return best;
}

async function fetchZoneForecast(regId: string, tmfc = "0"): Promise<string> {
	const base = "https://apihub.kma.go.kr/api/typ01/url/fct_shrt_reg.php";
	const params = new URLSearchParams({ tmfc, disp: "1", authKey: process.env.KMA_SERVICE_KEY || "" });
	const res = await fetch(`${base}?${params.toString()}`);
	if (!res.ok) throw new Error(`Zone forecast ${res.status}`);
	return await res.text();
}

function parseCsv(text: string): { header: string[]; rows: string[][] } {
	const lines = text.trim().split(/\r?\n/);
	const header = lines[0].split(",").map((s) => s.trim());
	const rows = lines.slice(1).map((ln) => ln.split(",").map((s) => s.trim()));
	return { header, rows };
}

function pickRowForRegId(data: { header: string[]; rows: string[][] }, regId: string) {
	const idxReg = data.header.findIndex((h) => h.toUpperCase() === "REG_ID");
	if (idxReg < 0) return null;
	return data.rows.find((r) => r[idxReg] === regId) || null;
}

export async function fetchKmaZoneSnapshot(coord: { lat: number; lon: number }): Promise<WeatherSnapshot> {
	const zone = await findNearestZone(coord);
	if (!zone) throw new Error("No zone matched");
	const csv = await fetchZoneForecast(zone.regId, "0");
	const parsed = parseCsv(csv);
	const row = pickRowForRegId(parsed, zone.regId) || parsed.rows[0];
	const get = (name: string) => {
		const idx = parsed.header.findIndex((h) => h.toUpperCase() === name.toUpperCase());
		if (idx < 0) return null;
		return row[idx] ?? null;
	};
	const ta = parseFloat(String(get("TA") ?? "NaN"));
	const skyCode = parseInt(String(get("SKY") ?? "0"), 10);
	const prep = parseInt(String(get("PREP") ?? "0"), 10);
	const astro = computeAstro(coord.lat, coord.lon);
	const cloudCoverPct = skyCode === 1 ? 5 : skyCode === 2 ? 30 : skyCode === 3 ? 70 : skyCode === 4 ? 95 : 0;

	const snapshot: WeatherSnapshot = {
		coord,
		timestamp: Math.floor(Date.now() / 1000),
		source: "kma",
		cloudCoverPct,
		cloudCoverLevel: undefined,
		windSpeedMs: 0,
		windDirectionDeg: null,
		humidityPct: 0,
		temperatureC: Number.isFinite(ta) ? ta : null,
		dewPointC: null,
		pressureHpa: null,
		precipitationProbabilityPct: undefined,
		precipitationMm1h: null,
		conditionCode: prep > 0 ? "Precip" : undefined,
		airQuality: undefined,
		threeHourTrend: undefined,
		fineTrend10m: undefined,
		moonIlluminationPct: astro.moonIlluminationPct,
		moonAltitudeDeg: astro.moonAltitudeDeg,
		moonPhaseName: astro.moonPhaseName,
		sunAltitudeDeg: astro.sunAltitudeDeg,
	};

	return snapshot;
}
