import { NextResponse } from "next/server";

export async function GET() {
	const serviceKey = process.env.KMA_SERVICE_KEY;
	if (!serviceKey) {
		return NextResponse.json({ error: "KMA_SERVICE_KEY env not set" }, { status: 500 });
	}

	try {
		// 현재 시각 기준 30분 전 (데이터 가용성)
		const now = new Date();
		now.setMinutes(now.getMinutes() - 30);
		const year = now.getUTCFullYear();
		const month = String(now.getUTCMonth() + 1).padStart(2, "0");
		const day = String(now.getUTCDate()).padStart(2, "0");
		const hour = String(now.getUTCHours()).padStart(2, "0");
		const minute = String(Math.floor(now.getUTCMinutes() / 10) * 10).padStart(2, "0");
		const dateTime = `${year}${month}${day}${hour}${minute}`;

		// 구름탐지 한반도 격자 데이터 조회
		const url = new URL("https://apihub.kma.go.kr/api/typ02/openApi/CloudSatlitInfoService/getGk2acldAll");
		url.searchParams.set("pageNo", "1");
		url.searchParams.set("numOfRows", "999999"); // 전체 격자 데이터
		url.searchParams.set("dataType", "JSON");
		url.searchParams.set("dateTime", dateTime);
		url.searchParams.set("resultType", "cld"); // 구름탐지
		url.searchParams.set("authKey", serviceKey);

		console.log("[CloudGrid] Fetching:", url.toString());

		const response = await fetch(url.toString());
		if (!response.ok) {
			const text = await response.text();
			console.error("[CloudGrid] Error:", response.status, text);
			return NextResponse.json({ error: `API error: ${response.status}` }, { status: response.status });
		}

		const data = await response.json();
		console.log("[CloudGrid] Response structure:", {
			hasResponse: !!data.response,
			hasHeader: !!data.response?.header,
			hasBody: !!data.response?.body,
			resultCode: data.response?.header?.resultCode,
			resultMsg: data.response?.header?.resultMsg,
		});

		// API 응답 구조 확인
		if (data.response?.header?.resultCode !== "00") {
			console.error("[CloudGrid] API error:", data.response?.header);
			return NextResponse.json(
				{
					error: "API 호출 실패",
					code: data.response?.header?.resultCode,
					message: data.response?.header?.resultMsg,
				},
				{ status: 500 }
			);
		}

		const body = data.response?.body;
		if (!body) {
			return NextResponse.json({ error: "응답 데이터 없음" }, { status: 500 });
		}

		// 격자 정보 추출
		const items = body.items?.item || [];
		console.log("[CloudGrid] Total items:", items.length);

		if (items.length === 0) {
			return NextResponse.json({ error: "데이터 없음", dateTime }, { status: 404 });
		}

		// 첫 번째 아이템에서 격자 메타데이터 추출
		const firstItem = items[0];
		const gridInfo = {
			dateTime: firstItem.dateTime,
			gridKm: parseFloat(firstItem.gridKm || "2"), // 격자 크기 (km)
			xdim: parseInt(firstItem.xdim || "0"), // X 격자 개수
			ydim: parseInt(firstItem.ydim || "0"), // Y 격자 개수
			x0: parseFloat(firstItem.x0 || "0"), // X 기준점
			y0: parseFloat(firstItem.y0 || "0"), // Y 기준점
		};

		// value 문자열을 2D 배열로 파싱
		// 형식: "0.1,0.2,0.3,..." (xdim * ydim 개의 값)
		const valueString = firstItem.value || "";
		const values = valueString.split(",").map((v: string) => parseFloat(v.trim()));

		console.log("[CloudGrid] Grid info:", gridInfo);
		console.log("[CloudGrid] Values count:", values.length, "Expected:", gridInfo.xdim * gridInfo.ydim);

		// 2D 배열로 변환
		const grid: number[][] = [];
		for (let y = 0; y < gridInfo.ydim; y++) {
			const row: number[] = [];
			for (let x = 0; x < gridInfo.xdim; x++) {
				const idx = y * gridInfo.xdim + x;
				row.push(values[idx] || 0);
			}
			grid.push(row);
		}

		return NextResponse.json(
			{
				...gridInfo,
				grid, // 2D 배열 [y][x]
				totalPoints: values.length,
			},
			{
				headers: {
					"Cache-Control": "public, max-age=600", // 10분 캐시
				},
			}
		);
	} catch (err: any) {
		console.error("[CloudGrid] Error:", err);
		return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
	}
}
