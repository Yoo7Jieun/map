// KMA API Hub Village Forecast (동네예보) integration
import { latLonToGridServer } from "./kmaGrid";
import type { WeatherSnapshot, TrendPoint3h, TrendPointFine } from "../types/weather";
import { computeAstro } from "./astro";

const BASE = "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0";

type KmaItem = {
	baseDate?: string;
	baseTime?: string;
	category: string;
	fcstDate?: string;
	fcstTime?: string;
	fcstValue?: string;
	obsrValue?: string;
};

async function kmaFetch(path: string, params: Record<string, string | number>): Promise<KmaItem[]> {
	const pairs: string[] = [];
	for (const [k, v] of Object.entries(params)) {
		if (k === "serviceKey") {
			pairs.push(`authKey=${v}`);
		} else {
			pairs.push(`${k}=${encodeURIComponent(String(v))}`);
		}
	}
	const url = `${BASE}/${path}?${pairs.join("&")}`;
	const res = await fetch(url);
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`KMA ${path} error ${res.status}: ${text}`);
	}
	const json = await res.json();
	let items: any[] = [];
	if (Array.isArray(json?.response?.body?.items?.item)) {
		items = json.response.body.items.item;
	} else if (json?.response?.body?.items?.item) {
		items = [json.response.body.items.item];
	}
	return items;
}

function recentVillageBase(date: Date): { baseDate: string; baseTime: string } {
	const issue = [2, 5, 8, 11, 14, 17, 20, 23];
	const y = date.getFullYear();
	const m = (date.getMonth() + 1).toString().padStart(2, "0");
	const d = date.getDate().toString().padStart(2, "0");
	const h = date.getHours();
	let sel = issue[0];
	for (const t of issue) if (h >= t) sel = t;
	const baseDate = `${y}${m}${d}`;
	const baseTime = `${sel.toString().padStart(2, "0")}00`;
	return { baseDate, baseTime };
}

function toInt(v: string | undefined): number | null {
	if (v == null) return null;
	const n = parseInt(v, 10);
	return Number.isNaN(n) ? null : n;
}

function skyToCloudPct(skyCode: number | null): number {
	if (skyCode == null) return 0;
	switch (skyCode) {
		case 1:
			return 5;
		case 2:
			return 30;
		case 3:
			return 70;
		case 4:
			return 95;
		default:
			return 0;
	}
}

function magnusDewPoint(tempC: number | null, humidityPct: number): number | null {
	if (tempC == null) return null;
	if (!humidityPct) return null;
	const a = 17.62;
	const b = 243.12;
	const alpha = (a * tempC) / (b + tempC) + Math.log(humidityPct / 100);
	const dew = (b * alpha) / (a - alpha);
	return +dew.toFixed(1);
}

export async function fetchKmaVilageSnapshot(coord: { lat: number; lon: number }, serviceKey: string): Promise<WeatherSnapshot> {
	const grid = await latLonToGridServer(coord.lat, coord.lon, serviceKey);
	const now = new Date();
	const base = recentVillageBase(now);
	const common = {
		serviceKey: serviceKey,
		numOfRows: 1000,
		pageNo: 1,
		dataType: "JSON",
		base_date: base.baseDate,
		base_time: base.baseTime,
		nx: grid.nx,
		ny: grid.ny,
	} as const;

	const villageItems = await kmaFetch("getVilageFcst", common);
	let ultraNcstItems: KmaItem[] = [];
	let ultraFcstItems: KmaItem[] = [];

	// Try ultra short-term APIs, skip if not approved
	try {
		ultraNcstItems = await kmaFetch("getUltraSrtNcst", { ...common, base_time: now.getHours().toString().padStart(2, "0") + "00" });
	} catch (err) {
		console.warn("Ultra short-term nowcast not available:", err);
	}
	try {
		ultraFcstItems = await kmaFetch("getUltraSrtFcst", { ...common, base_time: now.getHours().toString().padStart(2, "0") + "00" });
	} catch (err) {
		console.warn("Ultra short-term forecast not available:", err);
	}

	let skyNow: number | null = null;
	let ptyNow: number | null = null;
	let tempNow: number | null = null;
	let humidityNow: number | null = null;
	let windSpeedNow: number | null = null;
	let windDirNow: number | null = null;
	let rn1: number | null = null;

	for (const it of ultraNcstItems) {
		const v = toInt(it.obsrValue);
		switch (it.category) {
			case "SKY":
				skyNow = v;
				break;
			case "PTY":
				ptyNow = v;
				break;
			case "T1H":
				tempNow = v;
				break;
			case "REH":
				humidityNow = v;
				break;
			case "WSD":
				windSpeedNow = v;
				break;
			case "VEC":
				windDirNow = v;
				break;
			case "RN1":
				rn1 = v;
				break;
		}
	}

	const trend3h: TrendPoint3h[] = [];
	for (const it of villageItems) {
		if (!it.fcstDate || !it.fcstTime) continue;
		const year = +it.fcstDate.slice(0, 4);
		const month = +it.fcstDate.slice(4, 6) - 1;
		const day = +it.fcstDate.slice(6, 8);
		const hour = +it.fcstTime.slice(0, 2);
		const dt = new Date(Date.UTC(year, month, day, hour));
		const epoch = Math.floor(dt.getTime() / 1000);
		let point = trend3h.find((p) => p.dt === epoch);
		if (!point) {
			point = { dt: epoch };
			trend3h.push(point);
		}
		const v = toInt(it.fcstValue);
		switch (it.category) {
			case "SKY":
				point.cloudCoverPct = skyToCloudPct(v);
				break;
			case "WSD":
				point.windSpeedMs = v ?? undefined;
				break;
			case "POP":
				point.precipitationProbabilityPct = v ?? undefined;
				break;
			case "TMP":
				point.temperatureC = v ?? null;
				break;
		}
	}
	trend3h.sort((a, b) => a.dt - b.dt);
	const cutoff = Math.floor(Date.now() / 1000) + 24 * 3600;
	const filteredTrend3h = trend3h.filter((p) => p.dt <= cutoff).slice(0, 10);

	const fineTrend: TrendPointFine[] = [];
	for (const it of ultraFcstItems) {
		if (!it.fcstDate || !it.fcstTime) continue;
		const year = +it.fcstDate.slice(0, 4);
		const month = +it.fcstDate.slice(4, 6) - 1;
		const day = +it.fcstDate.slice(6, 8);
		const hour = +it.fcstTime.slice(0, 2);
		const minute = +it.fcstTime.slice(2, 4);
		const dt = new Date(Date.UTC(year, month, day, hour, minute));
		const epoch = Math.floor(dt.getTime() / 1000);
		let point = fineTrend.find((p) => p.dt === epoch);
		if (!point) {
			point = { dt: epoch };
			fineTrend.push(point);
		}
		const v = toInt(it.fcstValue);
		switch (it.category) {
			case "SKY":
				point.cloudCoverLevel = v ?? undefined;
				break;
			case "T1H":
				point.temperatureC = v ?? null;
				break;
			case "RN1":
				point.precipitationMm1h = v ?? null;
				break;
			case "PTY":
				point.precipitationMm1h = v ?? null;
				break;
		}
	}
	fineTrend.sort((a, b) => a.dt - b.dt);
	const fineFiltered = fineTrend.slice(0, 12);

	const astro = computeAstro(coord.lat, coord.lon);
	const humidityPct = humidityNow ?? 0;
	const dewPointC = magnusDewPoint(tempNow, humidityPct);

	const snapshot: WeatherSnapshot = {
		coord,
		timestamp: Math.floor(Date.now() / 1000),
		source: "kma",
		cloudCoverPct: skyToCloudPct(skyNow),
		cloudCoverLevel: skyNow ?? undefined,
		windSpeedMs: windSpeedNow ?? 0,
		windDirectionDeg: windDirNow,
		humidityPct,
		temperatureC: tempNow,
		dewPointC,
		pressureHpa: null,
		precipitationProbabilityPct: filteredTrend3h[0]?.precipitationProbabilityPct,
		precipitationMm1h: rn1,
		conditionCode: ptyNow != null && ptyNow > 0 ? "Precip" : undefined,
		airQuality: undefined,
		threeHourTrend: filteredTrend3h,
		fineTrend10m: fineFiltered,
		moonIlluminationPct: astro.moonIlluminationPct,
		moonAltitudeDeg: astro.moonAltitudeDeg,
		moonPhaseName: astro.moonPhaseName,
		sunAltitudeDeg: astro.sunAltitudeDeg,
	};

	return snapshot;
}
