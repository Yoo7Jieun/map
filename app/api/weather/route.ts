/**
 * 기상청 단기예보 API
 * 격자 좌표(nx, ny)로 날씨 정보 조회
 */

import { NextRequest, NextResponse } from "next/server";

const KMA_API_KEY = process.env.KMA_SERVICE_KEY;
const BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";

// 디버깅: 환경 변수 확인
console.log("[KMA] 환경 변수 로드 확인:", KMA_API_KEY ? `키 존재 (${KMA_API_KEY.length}자)` : "키 없음");

function getBaseDateTime() {
	const now = new Date();
	const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);

	let hour = kst.getUTCHours();
	let minute = kst.getUTCMinutes();

	// 30분 이전이면 이전 시간 사용
	if (minute < 30) {
		hour = hour - 1;
		if (hour < 0) {
			hour = 23;
			kst.setUTCDate(kst.getUTCDate() - 1);
		}
	}

	const baseDate = `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, "0")}${String(kst.getUTCDate()).padStart(2, "0")}`;
	const baseTime = `${String(hour).padStart(2, "0")}30`;

	return { baseDate, baseTime };
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const nx = searchParams.get("nx");
	const ny = searchParams.get("ny");

	if (!nx || !ny) {
		return NextResponse.json({ error: "nx, ny 파라미터가 필요합니다" }, { status: 400 });
	}

	if (!KMA_API_KEY) {
		return NextResponse.json({ error: "기상청 API 키가 설정되지 않았습니다" }, { status: 500 });
	}

	const { baseDate, baseTime } = getBaseDateTime();

	// 기상청 API는 serviceKey가 이미 인코딩된 상태여야 함
	// URLSearchParams는 이중 인코딩하므로 직접 URL 구성
	const params = new URLSearchParams({
		numOfRows: "60",
		pageNo: "1",
		dataType: "JSON",
		base_date: baseDate,
		base_time: baseTime,
		nx,
		ny,
	});

	const url = `${BASE_URL}?serviceKey=${encodeURIComponent(KMA_API_KEY)}&${params}`;
	console.log("[KMA API] Request URL (serviceKey 숨김):", `${BASE_URL}?serviceKey=***&${params}`);

	try {
		const response = await fetch(url, {
			next: { revalidate: 600 }, // 10분 캐시
		});

		// 응답이 JSON인지 확인
		const contentType = response.headers.get("content-type");
		if (!contentType || !contentType.includes("application/json")) {
			const text = await response.text();
			console.error("[KMA API] 비JSON 응답:", text);
			return NextResponse.json({ 
				error: "기상청 API 인증 실패", 
				detail: text.includes("Unauthorized") ? "API 키가 유효하지 않거나 인증에 실패했습니다. KMA_SERVICE_KEY 환경 변수를 확인해주세요." : text 
			}, { status: 401 });
		}

		const data = await response.json();
		console.log("[KMA API] Response:", JSON.stringify(data).slice(0, 500));

		if (data.response?.header?.resultCode !== "00") {
			console.error("기상청 API 오류:", data.response?.header);
			return NextResponse.json({ error: "기상청 API 오류", detail: data.response?.header?.resultMsg }, { status: 502 });
		}

		const items = data.response?.body?.items?.item || [];

		// 필요한 데이터 추출
		let sky = 1; // 기본값: 맑음
		let temperature = 0;
		let humidity = 0;

		for (const item of items) {
			switch (item.category) {
				case "SKY":
					sky = parseInt(item.fcstValue, 10);
					break;
				case "T1H":
					temperature = parseFloat(item.fcstValue);
					break;
				case "REH":
					humidity = parseInt(item.fcstValue, 10);
					break;
			}
		}

		return NextResponse.json({
			sky,
			temperature,
			humidity,
			baseDate,
			baseTime,
			nx: parseInt(nx, 10),
			ny: parseInt(ny, 10),
		});
	} catch (error) {
		console.error("날씨 조회 실패:", error);
		return NextResponse.json({ error: "날씨 정보를 가져오는데 실패했습니다" }, { status: 500 });
	}
}
