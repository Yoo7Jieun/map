// KMA API Hub High-Resolution Grid Data (500m)
// 고해상도 격자자료 - 특정지점 다중요소
// https://apihub.kma.go.kr/api/typ01/url/sfc_nc_var.php

import type { WeatherSnapshot } from "../types/weather";
import { computeAstro } from "./astro";

export type HighResParams = {
	authKey: string;
	lat: number;
	lon: number;
	tm1?: string; // YYYYMMDDHHmm
	tm2?: string; // YYYYMMDDHHmm
	obs?: string; // comma-separated variables
	itv?: number; // interval in minutes
};

async function fetchHighResData(params: HighResParams): Promise<any> {
	const now = new Date();
	// Go back 30 minutes for tm1 to ensure data availability
	const startTime = new Date(now.getTime() - 30 * 60 * 1000);
	const year1 = startTime.getFullYear();
	const month1 = String(startTime.getMonth() + 1).padStart(2, "0");
	const day1 = String(startTime.getDate()).padStart(2, "0");
	const hour1 = String(startTime.getHours()).padStart(2, "0");
	const minute1 = String(Math.floor(startTime.getMinutes() / 5) * 5).padStart(2, "0");
	const tm1Default = `${year1}${month1}${day1}${hour1}${minute1}`;

	// Use current time for tm2
	const year2 = now.getFullYear();
	const month2 = String(now.getMonth() + 1).padStart(2, "0");
	const day2 = String(now.getDate()).padStart(2, "0");
	const hour2 = String(now.getHours()).padStart(2, "0");
	const minute2 = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0");
	const tm2Default = `${year2}${month2}${day2}${hour2}${minute2}`;

	const url = new URL("https://apihub.kma.go.kr/api/typ01/url/sfc_nc_var.php");
	url.searchParams.set("tm1", params.tm1 || tm1Default);
	url.searchParams.set("tm2", params.tm2 || tm2Default);
	url.searchParams.set("lat", String(params.lat));
	url.searchParams.set("lon", String(params.lon));
	url.searchParams.set("obs", params.obs || "ta,hm,ws_10m,wd_10m,pa,rn_60m");
	url.searchParams.set("itv", String(params.itv || 5));
	url.searchParams.set("help", "1");
	url.searchParams.set("authKey", params.authKey);

	console.log("[HighRes] Fetching:", url.toString());

	const res = await fetch(url.toString());
	const text = await res.text();

	if (!res.ok) {
		throw new Error(`HighRes ${res.status}: ${text}`);
	}

	console.log("[HighRes] Response length:", text.length);
	console.log("[HighRes] Full response:", text);

	// Parse CSV-like response
	// Format: #START7777, # comment lines, # header line, data lines, #7777END
	const lines = text.trim().split(/\r?\n/);

	// Find header line (starts with # tm)
	const headerIdx = lines.findIndex((ln) => ln.trim().startsWith("# tm"));
	if (headerIdx === -1) {
		throw new Error("No header line found");
	}

	// Parse header: "# tm, ta, hm, ws_10m, wd_10m, pa, rn_60m"
	const headerLine = lines[headerIdx].substring(1).trim(); // Remove leading #
	const header = headerLine.split(/[,\s]+/).filter((h) => h.length > 0);

	// Find data lines (after header, before #7777END, not starting with #)
	const dataLines = lines.slice(headerIdx + 1).filter((ln) => ln && !ln.startsWith("#") && ln.trim().length > 0);

	if (dataLines.length === 0) {
		throw new Error("No data rows");
	}

	console.log("[HighRes] Header:", header);
	console.log("[HighRes] Data lines:", dataLines.length);

	// Use most recent data (last row)
	const lastRow = dataLines[dataLines.length - 1].split(/[,\s]+/).filter((s) => s.length > 0);

	console.log("[HighRes] Last row:", lastRow);

	const data: Record<string, number | null> = {};
	header.forEach((key, idx) => {
		const val = parseFloat(lastRow[idx]);
		data[key] = Number.isNaN(val) || val === -99 ? null : val;
	});

	console.log("[HighRes] Parsed data:", data);
	return data;
}

export async function fetchKmaHighResSnapshot(coord: { lat: number; lon: number }, authKey: string): Promise<WeatherSnapshot> {
	const data = await fetchHighResData({
		authKey,
		lat: coord.lat,
		lon: coord.lon,
		obs: "ta,hm,ws_10m,wd_10m,pa,rn_60m,rn_ox",
	});

	// Map variables
	const temperatureC = data["ta"] ?? null;
	const humidityPct = data["hm"] ?? null;
	const windSpeedMs = data["ws_10m"] ?? null;
	const windDirectionDeg = data["wd_10m"] ?? null;
	const pressureHpa = data["pa"] ?? null;
	const precipitationMm1h = data["rn_60m"] ?? null;
	const hasRain = data["rn_ox"] ?? 0; // 0=no, 1=yes

	const astro = computeAstro(coord.lat, coord.lon);

	const snapshot: WeatherSnapshot = {
		coord,
		timestamp: Math.floor(Date.now() / 1000),
		source: "kma",
		cloudCoverPct: 0, // Not available in this API
		cloudCoverLevel: undefined,
		windSpeedMs: windSpeedMs ?? 0,
		windDirectionDeg,
		humidityPct: humidityPct ?? 0,
		temperatureC,
		dewPointC: null,
		pressureHpa,
		precipitationProbabilityPct: undefined,
		precipitationMm1h,
		conditionCode: hasRain > 0 ? "Precip" : undefined,
		airQuality: undefined,
		threeHourTrend: undefined,
		fineTrend10m: undefined,
		moonIlluminationPct: astro.moonIlluminationPct,
		moonAltitudeDeg: astro.moonAltitudeDeg,
		moonPhaseName: astro.moonPhaseName,
		sunAltitudeDeg: astro.sunAltitudeDeg,
	};

	console.log("[HighRes] Snapshot created:", {
		temp: temperatureC,
		humidity: humidityPct,
		wind: windSpeedMs,
		pressure: pressureHpa,
	});

	return snapshot;
}
