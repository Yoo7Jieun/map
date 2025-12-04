import type { WeatherCache } from "../types/weather";

const cache: WeatherCache = { lastUpdated: null, snapshot: null };

export function setSnapshot(snapshot: WeatherCache["snapshot"]) {
	cache.snapshot = snapshot;
	cache.lastUpdated = snapshot ? snapshot.timestamp : null;
}

export function getCache(): WeatherCache {
	return cache;
}
