import { NextResponse } from "next/server";
import { fetchKmaHighResSnapshot } from "../../../../lib/kmaHighRes";
import { setSnapshot } from "../../../../lib/weatherCache";

// 태백시청 좌표
const DEFAULT_COORD = { lat: 37.1667, lon: 128.9889 };

export async function POST() {
	const serviceKey = process.env.KMA_SERVICE_KEY;
	if (!serviceKey) {
		return NextResponse.json({ error: "KMA_SERVICE_KEY env not set" }, { status: 500 });
	}

	try {
		const snapshot = await fetchKmaHighResSnapshot(DEFAULT_COORD, serviceKey);
		setSnapshot(snapshot);

		return NextResponse.json({
			ok: true,
			timestamp: snapshot.timestamp,
			coord: snapshot.coord,
			temp: snapshot.temperatureC,
			humidity: snapshot.humidityPct,
		});
	} catch (err: any) {
		console.error("[AUTO-REFRESH] Error:", err);
		return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
	}
}
