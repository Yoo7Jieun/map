/**
 * 기상청 단기예보 API (미래 날씨 예보용)
 * getVilageFcst - 3시간 단위 예보
 */

import { NextRequest, NextResponse } from "next/server";

const KMA_API_KEY = process.env.KMA_SERVICE_KEY;
const BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

/**
 * 예보 발표 시각 계산
 * 단기예보는 02, 05, 08, 11, 14, 17, 20, 23시에 발표
 */
function getBaseDateTime(targetDate: string) {
	const now = new Date();
	const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
	const currentHour = kst.getUTCHours();

	// 발표 시각 목록
	const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];

	// 현재 시간보다 이전인 가장 최신 발표 시각 찾기
	let baseHour = baseTimes[0];
	for (const t of baseTimes) {
		if (t <= currentHour) {
			baseHour = t;
		}
	}

	// 만약 현재 시각이 02시 이전이면 전날 23시 발표 사용
	if (currentHour < 2) {
		baseHour = 23;
		kst.setUTCDate(kst.getUTCDate() - 1);
	}

	const baseDate = `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, "0")}${String(kst.getUTCDate()).padStart(2, "0")}`;
	const baseTime = `${String(baseHour).padStart(2, "0")}00`;

	return { baseDate, baseTime };
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const nx = searchParams.get("nx");
	const ny = searchParams.get("ny");
	const targetDate = searchParams.get("date"); // yyyy-MM-dd 형식

	if (!nx || !ny) {
		return NextResponse.json({ error: "nx, ny 파라미터가 필요합니다" }, { status: 400 });
	}

	if (!KMA_API_KEY) {
		console.warn("[Forecast API] KMA_SERVICE_KEY 없음 - Mock 데이터 반환");
		// API 키 없으면 Mock 데이터 반환
		return NextResponse.json(generateMockForecast(targetDate || new Date().toISOString().split("T")[0]));
	}

	const { baseDate, baseTime } = getBaseDateTime(targetDate || "");

	const params = new URLSearchParams({
		numOfRows: "300",
		pageNo: "1",
		dataType: "JSON",
		base_date: baseDate,
		base_time: baseTime,
		nx,
		ny,
	});

	const url = `${BASE_URL}?serviceKey=${encodeURIComponent(KMA_API_KEY)}&${params}`;
	console.log("[Forecast API] Request:", `${BASE_URL}?serviceKey=***&${params}`);

	try {
		const response = await fetch(url, {
			next: { revalidate: 1800 }, // 30분 캐시
		});

		const contentType = response.headers.get("content-type");
		if (!contentType || !contentType.includes("application/json")) {
			const text = await response.text();
			console.error("[Forecast API] 비JSON 응답:", text);
			// API 실패 시 Mock 데이터 반환
			return NextResponse.json(generateMockForecast(targetDate || new Date().toISOString().split("T")[0]));
		}

		const data = await response.json();

		if (data.response?.header?.resultCode !== "00") {
			console.error("[Forecast API] 오류:", data.response?.header);
			return NextResponse.json(generateMockForecast(targetDate || new Date().toISOString().split("T")[0]));
		}

		const items = data.response?.body?.items?.item || [];

		// 대상 날짜의 데이터 필터링
		const targetDateFormatted = targetDate?.replace(/-/g, "") || baseDate;

		// 카테고리별 데이터 추출
		const result = {
			temperature: 0,
			humidity: 0,
			cloudCover: 0,
			windSpeed: 0,
			precipitation: 0,
			sky: 1,
			baseDate,
			baseTime,
			targetDate: targetDate || new Date().toISOString().split("T")[0],
		};

		// 대상 날짜의 오후 9시(21시) 데이터 우선, 없으면 가장 가까운 야간 시간대
		const nightHours = ["2100", "0000", "0300", "1800"];
		let foundData = false;

		for (const targetTime of nightHours) {
			if (foundData) break;

			for (const item of items) {
				if (item.fcstDate === targetDateFormatted && item.fcstTime === targetTime) {
					switch (item.category) {
						case "TMP": // 기온
							result.temperature = parseFloat(item.fcstValue);
							foundData = true;
							break;
						case "REH": // 습도
							result.humidity = parseInt(item.fcstValue, 10);
							break;
						case "SKY": // 하늘 상태 (1:맑음, 3:구름많음, 4:흐림)
							result.sky = parseInt(item.fcstValue, 10);
							result.cloudCover = result.sky === 1 ? 10 : result.sky === 3 ? 50 : 80;
							break;
						case "WSD": // 풍속
							result.windSpeed = parseFloat(item.fcstValue);
							break;
						case "POP": // 강수확률
							result.precipitation = parseInt(item.fcstValue, 10);
							break;
					}
				}
			}
		}

		// 야간 데이터가 없으면 첫 번째 유효한 데이터 사용
		if (!foundData) {
			for (const item of items) {
				if (item.fcstDate === targetDateFormatted || item.fcstDate >= targetDateFormatted) {
					switch (item.category) {
						case "TMP":
							if (result.temperature === 0) result.temperature = parseFloat(item.fcstValue);
							break;
						case "REH":
							if (result.humidity === 0) result.humidity = parseInt(item.fcstValue, 10);
							break;
						case "SKY":
							if (result.sky === 1) {
								result.sky = parseInt(item.fcstValue, 10);
								result.cloudCover = result.sky === 1 ? 10 : result.sky === 3 ? 50 : 80;
							}
							break;
						case "WSD":
							if (result.windSpeed === 0) result.windSpeed = parseFloat(item.fcstValue);
							break;
						case "POP":
							if (result.precipitation === 0) result.precipitation = parseInt(item.fcstValue, 10);
							break;
					}
				}
			}
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error("[Forecast API] 에러:", error);
		return NextResponse.json(generateMockForecast(targetDate || new Date().toISOString().split("T")[0]));
	}
}

/**
 * Mock 데이터 생성 (API 실패 시 사용)
 */
function generateMockForecast(targetDate: string) {
	const seed = targetDate.split("-").reduce((a, b) => a + parseInt(b), 0);
	return {
		temperature: 5 + (seed % 15),
		humidity: 40 + (seed % 40),
		cloudCover: (seed % 80) + 10,
		windSpeed: (seed % 10) / 2,
		precipitation: seed % 30,
		sky: (seed % 4) + 1,
		baseDate: new Date().toISOString().split("T")[0].replace(/-/g, ""),
		baseTime: "0500",
		targetDate,
		isMock: true,
	};
}
