import { NextResponse } from "next/server";
import { getCache } from "../../../../lib/weatherCache";

export async function GET() {
	const cache = getCache();
	if (!cache.highRes && !cache.cloudGrid) {
		return NextResponse.json({ error: "데이터 로딩 중입니다. 잠시 후 다시 시도해주세요." }, { status: 503 });
	}
	return NextResponse.json({
		lastUpdated: cache.lastUpdated,
		highRes: cache.highRes,
		cloudGrid: cache.cloudGrid,
	});
}
