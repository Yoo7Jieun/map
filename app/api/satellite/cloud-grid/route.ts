import { NextResponse } from "next/server";
import { getCloudGrid } from "../../../../lib/weatherCache";

export async function GET() {
	const cloudGrid = getCloudGrid();

	if (!cloudGrid) {
		return NextResponse.json({ error: "구름 데이터 로딩 중입니다. 잠시 후 다시 시도해주세요." }, { status: 503 });
	}

	return NextResponse.json(cloudGrid, {
		headers: {
			"Cache-Control": "public, max-age=60", // 클라이언트 캐시 1분
		},
	});
}
