/**
 * 기상 데이터 인메모리 캐시 + 주기적 자동 갱신
 *
 * 갱신 주기:
 * - 고해상도 격자 (기온/습도/풍속): 5분
 * - 구름격자: 10분
 */

import type { WeatherSnapshot } from "../types/weather";

// ============ 타입 정의 ============

export interface CloudGridData {
	dateTime: string;
	gridKm: number;
	xdim: number;
	ydim: number;
	x0: number;
	y0: number;
	grid: number[][];
	totalPoints: number;
	fetchedAt: number;
}

export interface WeatherCacheData {
	highRes: WeatherSnapshot | null;
	cloudGrid: CloudGridData | null;
	lastUpdated: {
		highRes: number | null;
		cloudGrid: number | null;
	};
	isRefreshing: {
		highRes: boolean;
		cloudGrid: boolean;
	};
}

// ============ 캐시 저장소 (globalThis로 모듈 리로드 시에도 유지) ============

declare global {
	// eslint-disable-next-line no-var
	var __weatherCache: WeatherCacheData | undefined;
}

const cache: WeatherCacheData = globalThis.__weatherCache ?? {
	highRes: null,
	cloudGrid: null,
	lastUpdated: {
		highRes: null,
		cloudGrid: null,
	},
	isRefreshing: {
		highRes: false,
		cloudGrid: false,
	},
};

globalThis.__weatherCache = cache;

// 갱신 주기 (ms)
const REFRESH_INTERVAL = {
	highRes: 5 * 60 * 1000, // 5분
	cloudGrid: 10 * 60 * 1000, // 10분
};

// 기본 좌표 (대한민국 중심)
const DEFAULT_COORD = { lat: 36.5, lon: 127.5 };

// ============ Getter ============

export function getCache(): WeatherCacheData {
	return cache;
}

export function getHighRes(): WeatherSnapshot | null {
	return cache.highRes;
}

export function getCloudGrid(): CloudGridData | null {
	return cache.cloudGrid;
}

// ============ 갱신 함수 ============

async function refreshHighRes(): Promise<void> {
	if (cache.isRefreshing.highRes) {
		console.log("[Cache] HighRes 이미 갱신 중, 스킵");
		return;
	}

	const serviceKey = process.env.KMA_SERVICE_KEY;
	if (!serviceKey) {
		console.error("[Cache] KMA_SERVICE_KEY 없음");
		return;
	}

	cache.isRefreshing.highRes = true;
	console.log("[Cache] HighRes 갱신 시작...");

	try {
		const { fetchKmaHighResSnapshot } = await import("./kmaHighRes");
		const snapshot = await fetchKmaHighResSnapshot(DEFAULT_COORD, serviceKey);
		cache.highRes = snapshot;
		cache.lastUpdated.highRes = Date.now();
		console.log("[Cache] HighRes 갱신 완료:", {
			temp: snapshot.temperatureC,
			humidity: snapshot.humidityPct,
		});
	} catch (err) {
		console.error("[Cache] HighRes 갱신 실패:", err);
	} finally {
		cache.isRefreshing.highRes = false;
	}
}

async function refreshCloudGrid(): Promise<void> {
	if (cache.isRefreshing.cloudGrid) {
		console.log("[Cache] CloudGrid 이미 갱신 중, 스킵");
		return;
	}

	const serviceKey = process.env.KMA_SERVICE_KEY;
	if (!serviceKey) {
		console.error("[Cache] KMA_SERVICE_KEY 없음");
		return;
	}

	cache.isRefreshing.cloudGrid = true;
	console.log("[Cache] CloudGrid 갱신 시작...");

	try {
		// 현재 시각 기준 30분 전
		const now = new Date();
		now.setMinutes(now.getMinutes() - 30);
		const year = now.getUTCFullYear();
		const month = String(now.getUTCMonth() + 1).padStart(2, "0");
		const day = String(now.getUTCDate()).padStart(2, "0");
		const hour = String(now.getUTCHours()).padStart(2, "0");
		const minute = String(Math.floor(now.getUTCMinutes() / 10) * 10).padStart(2, "0");
		const dateTime = `${year}${month}${day}${hour}${minute}`;

		const url = new URL("https://apihub.kma.go.kr/api/typ02/openApi/CloudSatlitInfoService/getGk2acldAll");
		url.searchParams.set("pageNo", "1");
		url.searchParams.set("numOfRows", "999999");
		url.searchParams.set("dataType", "JSON");
		url.searchParams.set("dateTime", dateTime);
		url.searchParams.set("resultType", "cld");
		url.searchParams.set("authKey", serviceKey);

		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		const data = await response.json();
		if (data.response?.header?.resultCode !== "00") {
			throw new Error(`API 오류: ${data.response?.header?.resultMsg}`);
		}

		const items = data.response?.body?.items?.item || [];
		if (items.length === 0) {
			throw new Error("데이터 없음");
		}

		const firstItem = items[0];
		const gridInfo = {
			dateTime: firstItem.dateTime,
			gridKm: parseFloat(firstItem.gridKm || "2"),
			xdim: parseInt(firstItem.xdim || "0"),
			ydim: parseInt(firstItem.ydim || "0"),
			x0: parseFloat(firstItem.x0 || "0"),
			y0: parseFloat(firstItem.y0 || "0"),
		};

		const valueString = firstItem.value || "";
		const values = valueString.split(",").map((v: string) => parseFloat(v.trim()));

		const grid: number[][] = [];
		for (let y = 0; y < gridInfo.ydim; y++) {
			const row: number[] = [];
			for (let x = 0; x < gridInfo.xdim; x++) {
				const idx = y * gridInfo.xdim + x;
				row.push(values[idx] || 0);
			}
			grid.push(row);
		}

		cache.cloudGrid = {
			...gridInfo,
			grid,
			totalPoints: values.length,
			fetchedAt: Date.now(),
		};
		cache.lastUpdated.cloudGrid = Date.now();

		console.log("[Cache] CloudGrid 갱신 완료:", {
			dateTime: gridInfo.dateTime,
			gridSize: `${gridInfo.xdim}x${gridInfo.ydim}`,
		});
	} catch (err) {
		console.error("[Cache] CloudGrid 갱신 실패:", err);
	} finally {
		cache.isRefreshing.cloudGrid = false;
	}
}

// ============ 스케줄러 ============

let isSchedulerRunning = false;

export function startCacheScheduler(): void {
	if (isSchedulerRunning) {
		console.log("[Cache] 스케줄러 이미 실행 중");
		return;
	}

	isSchedulerRunning = true;
	console.log("[Cache] 스케줄러 시작");
	console.log(`[Cache] - HighRes: ${REFRESH_INTERVAL.highRes / 1000}초 간격`);
	console.log(`[Cache] - CloudGrid: ${REFRESH_INTERVAL.cloudGrid / 1000}초 간격`);

	// 즉시 첫 번째 fetch 실행
	refreshHighRes();
	refreshCloudGrid();

	// 주기적 갱신 설정
	setInterval(refreshHighRes, REFRESH_INTERVAL.highRes);
	setInterval(refreshCloudGrid, REFRESH_INTERVAL.cloudGrid);
}

// 서버 시작 시 자동 실행 (싱글톤 보장)
if (typeof globalThis !== "undefined") {
	const g = globalThis as any;
	if (!g.__weatherCacheSchedulerStarted) {
		g.__weatherCacheSchedulerStarted = true;
		// 약간의 딜레이 후 시작 (서버 초기화 대기)
		setTimeout(() => {
			startCacheScheduler();
		}, 1000);
	}
}

// ============ 수동 갱신 (필요시) ============

export async function forceRefreshAll(): Promise<void> {
	await Promise.all([refreshHighRes(), refreshCloudGrid()]);
}

export { refreshHighRes, refreshCloudGrid };
