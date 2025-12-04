import { NextResponse } from "next/server";
import { getCache } from "../../../../lib/weatherCache";

export async function GET() {
	const cache = getCache();
	if (!cache.snapshot) {
		return NextResponse.json({ error: "No snapshot. Call POST /api/weather/refresh first." }, { status: 404 });
	}

	return NextResponse.json({ lastUpdated: cache.lastUpdated, snapshot: cache.snapshot });
}
