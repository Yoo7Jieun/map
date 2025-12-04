import type { Coordinates, WeatherSnapshot } from "../types/weather";

const OWM_BASE = "https://api.openweathermap.org/data/2.5";

function toC(k: number | undefined): number | null {
	if (typeof k !== "number") return null;
	return +(k - 273.15).toFixed(1);
}

export async function fetchOWMCurrent(coord: Coordinates, apiKey: string): Promise<WeatherSnapshot> {
	const url = `${OWM_BASE}/weather?lat=${coord.lat}&lon=${coord.lon}&appid=${apiKey}`;
	const res = await fetch(url);
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`OWM error ${res.status}: ${text}`);
	}
	const data = await res.json();

	const cloudCoverPct = typeof data.clouds?.all === "number" ? data.clouds.all : 0;
	const windSpeedMs = typeof data.wind?.speed === "number" ? data.wind.speed : 0;
	const windDirectionDeg = typeof data.wind?.deg === "number" ? data.wind.deg : null;
	const humidityPct = typeof data.main?.humidity === "number" ? data.main.humidity : 0;
	const temperatureC = toC(data.main?.temp);
	const pressureHpa = typeof data.main?.pressure === "number" ? data.main.pressure : null;

	// Minimal astro placeholders for now; can be computed server-side later
	const snapshot: WeatherSnapshot = {
		coord,
		timestamp: Math.floor(Date.now() / 1000),
		source: "owm",
		cloudCoverPct,
		windSpeedMs,
		windDirectionDeg,
		humidityPct,
		temperatureC,
		pressureHpa,
		moonIlluminationPct: null,
		moonAltitudeDeg: null,
		moonPhaseName: null,
		sunAltitudeDeg: null,
	};

	return snapshot;
}
