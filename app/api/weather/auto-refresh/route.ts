import { NextResponse } from "next/server";
import { forceRefreshAll, getCache } from "../../../../lib/weatherCache";

export async function POST() {
	try {
		await forceRefreshAll();
		const cache = getCache();

		return NextResponse.json({
			ok: true,
			lastUpdated: cache.lastUpdated,
			hasHighRes: !!cache.highRes,
			hasCloudGrid: !!cache.cloudGrid,
		});
	} catch (err: any) {
		console.error("[AUTO-REFRESH] Error:", err);
		return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
	}
}
