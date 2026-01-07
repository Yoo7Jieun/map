/**
 * 기상청 단기예보 API
 * 격자 좌표(nx, ny)로 날씨 정보 조회
 */

import { NextRequest, NextResponse } from "next/server";

const KMA_API_KEY = process.env.KMA_SERVICE_KEY;
const BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";

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

	const params = new URLSearchParams({
		serviceKey: KMA_API_KEY,
		numOfRows: "60",
		pageNo: "1",
		dataType: "JSON",
		base_date: baseDate,
		base_time: baseTime,
		nx,
		ny,
	});

	try {
		const response = await fetch(`${BASE_URL}?${params}`, {
			next: { revalidate: 600 }, // 10분 캐시
		});

		const data = await response.json();

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
