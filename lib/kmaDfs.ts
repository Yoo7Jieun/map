// KMA API Hub High-Resolution Grid Data (500m)
// 고해상도 격자자료 - 특정지점 다중요소
// https://apihub.kma.go.kr/api/typ01/url/sfc_nc_var.php

import type { WeatherSnapshot } from "../types/weather";
import { computeAstro } from "./astro";

export async function fetchKmaDfsSnapshot(_params: any, coord: { lat: number; lon: number }): Promise<WeatherSnapshot> {
	const authKey = _params.authKey;

	// Use current time rounded to 5-minute interval
	const now = new Date();
	// Go back 10 minutes to ensure data is available
	now.setMinutes(now.getMinutes() - 10);
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hour = String(now.getHours()).padStart(2, "0");
	const minute = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0");
	const tm1 = `${year}${month}${day}${hour}${minute}`;
	const tm2 = tm1; // Same time for single point

	const url = new URL("https://apihub.kma.go.kr/api/typ01/url/sfc_nc_var.php");
	url.searchParams.set("tm1", tm1);
	url.searchParams.set("tm2", tm2);
	url.searchParams.set("lat", String(coord.lat));
	url.searchParams.set("lon", String(coord.lon));
	url.searchParams.set("obs", "ta,hm,ws_10m,wd_10m,pa,rn_60m");
	url.searchParams.set("itv", "5");
	url.searchParams.set("help", "1");
	url.searchParams.set("authKey", authKey);

	console.log("[HighRes] Fetching:", url.toString());

	const res = await fetch(url.toString());
	const text = await res.text();

	if (!res.ok) {
		throw new Error(`HighRes ${res.status}: ${text}`);
	}

	console.log("[HighRes] Response length:", text.length);

	// Parse CSV response
	const lines = text.trim().split(/\r?\n/);
	const dataLines = lines.filter((ln) => ln && !ln.startsWith("#") && ln.includes(","));

	if (dataLines.length === 0) {
		throw new Error("No data in response");
	}

	// Use last data line (most recent)
	const lastLine = dataLines[dataLines.length - 1];
	const parts = lastLine.split(",").map((s) => s.trim());

	console.log("[HighRes] Data line:", lastLine);

	// Parse values: tm, ta, hm, ws_10m, wd_10m, pa, rn_60m
	const temperatureC = parseFloat(parts[1]) || null;
	const humidityPct = parseFloat(parts[2]) || null;
	const windSpeedMs = parseFloat(parts[3]) || null;
	const windDirectionDeg = parseFloat(parts[4]) || null;
	const pressureHpa = parseFloat(parts[5]) || null;
	const precipitationMm1h = parseFloat(parts[6]) || null;

	const astro = computeAstro(coord.lat, coord.lon);

	const snapshot: WeatherSnapshot = {
		coord,
		timestamp: Math.floor(Date.now() / 1000),
		source: "kma",
		cloudCoverPct: 0,
		cloudCoverLevel: undefined,
		windSpeedMs: windSpeedMs ?? 0,
		windDirectionDeg,
		humidityPct: humidityPct ?? 0,
		temperatureC,
		dewPointC: null,
		pressureHpa,
		precipitationProbabilityPct: undefined,
		precipitationMm1h,
		conditionCode: precipitationMm1h && precipitationMm1h > 0 ? "Precip" : undefined,
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
