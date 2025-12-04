export type Coordinates = {
	lat: number;
	lon: number;
};

export type TrendPoint3h = {
	dt: number; // epoch seconds
	cloudCoverPct?: number;
	windSpeedMs?: number;
	precipitationProbabilityPct?: number;
	temperatureC?: number | null;
};

export type TrendPointFine = {
	dt: number; // epoch seconds
	cloudCoverLevel?: number; // SKY code mapped (1~4)
	precipitationMm1h?: number | null;
	temperatureC?: number | null;
};

export type AirQuality = {
	pm25?: number | null;
	pm10?: number | null;
	o3?: number | null;
	no2?: number | null;
};

export type WeatherSnapshot = {
	coord: Coordinates;
	timestamp: number; // epoch seconds
	source: "owm" | "kma";
	cloudCoverPct: number; // 0-100 (approx or direct)
	cloudCoverLevel?: number; // KMA SKY code normalized 1–4
	windSpeedMs: number;
	windDirectionDeg: number | null;
	humidityPct: number;
	temperatureC: number | null;
	dewPointC?: number | null;
	pressureHpa: number | null;
	precipitationProbabilityPct?: number; // POP
	precipitationMm1h?: number | null; // RN1
	conditionCode?: string; // SKY+PTY combined label
	airQuality?: AirQuality;
	threeHourTrend?: TrendPoint3h[]; // 3h cadence forecast
	fineTrend10m?: TrendPointFine[]; // Ultra short-term (10m/1h mix)
	// Astro
	moonIlluminationPct: number | null;
	moonAltitudeDeg: number | null;
	moonPhaseName: string | null;
	sunAltitudeDeg: number | null;
};

export type WeatherCache = {
	lastUpdated: number | null; // epoch seconds
	snapshot: WeatherSnapshot | null;
};
