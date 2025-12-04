import { NextRequest, NextResponse } from "next/server";

type SatelliteType = "cld" | "ir105" | "vi006";

const channelMap: Record<SatelliteType, { lvl: string; chn?: string; dat?: string }> = {
	vi006: { lvl: "l1b", chn: "vi006" }, // 가시영상 (빨강)
	ir105: { lvl: "l1b", chn: "ir105" }, // 적외영상
	cld: { lvl: "l2", dat: "cld" }, // 구름탐지
};

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const type = (searchParams.get("type") || "ir105") as SatelliteType;

	const serviceKey = process.env.KMA_SERVICE_KEY;
	if (!serviceKey) {
		return NextResponse.json({ error: "KMA_SERVICE_KEY env not set" }, { status: 500 });
	}

	const config = channelMap[type];
	if (!config) {
		return NextResponse.json({ error: "Invalid satellite type" }, { status: 400 });
	}

	try {
		// Get current time rounded to 10 minutes (satellite image interval)
		const now = new Date();
		// Go back 30 minutes to ensure data is available
		now.setMinutes(now.getMinutes() - 30);
		const year = now.getUTCFullYear();
		const month = String(now.getUTCMonth() + 1).padStart(2, "0");
		const day = String(now.getUTCDate()).padStart(2, "0");
		const hour = String(now.getUTCHours()).padStart(2, "0");
		const minute = String(Math.floor(now.getUTCMinutes() / 10) * 10).padStart(2, "0");
		const tm = `${year}${month}${day}${hour}${minute}`;

		// Build URL for image download
		const baseUrl = "https://apihub.kma.go.kr/api/typ01/url/sat_file_down2.php";
		const params = new URLSearchParams({
			typ: "img",
			lvl: config.lvl,
			are: "ko", // 한반도
			tm: tm,
			authKey: serviceKey,
		});

		if (config.chn) {
			params.set("chn", config.chn);
		}
		if (config.dat) {
			params.set("dat", config.dat);
		}

		const url = `${baseUrl}?${params.toString()}`;

		console.log("[Satellite] Fetching image:", url);

		const response = await fetch(url);

		if (!response.ok) {
			const text = await response.text();
			console.error("[Satellite] Error:", response.status, text);
			return NextResponse.json({ error: `Satellite API error: ${response.status}` }, { status: response.status });
		}

		// 응답 데이터 읽기
		const buffer = await response.arrayBuffer();
		const bytes = new Uint8Array(buffer);

		// 바이너리 시그니처로 실제 파일 형식 확인
		// PNG: 89 50 4E 47 (0x89 'P' 'N' 'G')
		// ZIP: 50 4B 03 04 ('P' 'K' 0x03 0x04)
		const isPNG = bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
		const isZIP = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

		console.log("[Satellite] 파일 시그니처:", {
			first4Bytes: Array.from(bytes.slice(0, 4)).map((b) => "0x" + b.toString(16).padStart(2, "0")),
			isPNG,
			isZIP,
			contentType: response.headers.get("content-type"),
		});

		if (isPNG) {
			// 직접 PNG 파일
			console.log("[Satellite] PNG 이미지 직접 반환");
			return new NextResponse(buffer, {
				status: 200,
				headers: {
					"Content-Type": "image/png",
					"Cache-Control": "public, max-age=600",
				},
			});
		}

		if (isZIP) {
			// ZIP 파일 - 압축 해제 필요
			const AdmZip = require("adm-zip");
			try {
				const zip = new AdmZip(Buffer.from(buffer));
				const zipEntries = zip.getEntries();

				console.log(
					"[Satellite] ZIP 파일 내용:",
					zipEntries.map((e: any) => e.entryName)
				);

				// PNG 파일 찾기 (썸네일 제외)
				const pngEntry =
					zipEntries.find((entry: any) => {
						const name = entry.entryName.toLowerCase();
						return name.endsWith(".png") && !name.includes("thumbnail") && !name.includes("thumb");
					}) || zipEntries.find((entry: any) => entry.entryName.toLowerCase().endsWith(".png"));

				if (!pngEntry) {
					// JPG로 대체 시도
					const jpgEntry = zipEntries.find((entry: any) => entry.entryName.toLowerCase().endsWith(".jpg") || entry.entryName.toLowerCase().endsWith(".jpeg"));

					if (jpgEntry) {
						console.log("[Satellite] JPG 추출:", jpgEntry.entryName);
						const jpgBuffer = zip.readFile(jpgEntry);
						return new NextResponse(jpgBuffer, {
							status: 200,
							headers: {
								"Content-Type": "image/jpeg",
								"Cache-Control": "public, max-age=600",
							},
						});
					}

					console.error(
						"[Satellite] ZIP에 이미지 없음. 파일 목록:",
						zipEntries.map((e: any) => e.entryName)
					);
					return NextResponse.json(
						{
							error: "ZIP 파일에 이미지가 없습니다",
							files: zipEntries.map((e: any) => e.entryName),
						},
						{ status: 500 }
					);
				}

				console.log("[Satellite] PNG 추출:", pngEntry.entryName);
				const pngBuffer = zip.readFile(pngEntry);

				return new NextResponse(pngBuffer, {
					status: 200,
					headers: {
						"Content-Type": "image/png",
						"Cache-Control": "public, max-age=600",
					},
				});
			} catch (zipErr: any) {
				console.error("[Satellite] ZIP 추출 오류:", zipErr);
				return NextResponse.json({ error: "ZIP 압축 해제 실패: " + zipErr.message }, { status: 500 });
			}
		}

		// PNG도 ZIP도 아닌 경우
		const text = Buffer.from(buffer).toString("utf-8", 0, 200);
		console.error("[Satellite] 알 수 없는 파일 형식:", {
			contentType: response.headers.get("content-type"),
			first200chars: text,
		});
		return NextResponse.json(
			{
				error: "지원하지 않는 파일 형식입니다",
				contentType: response.headers.get("content-type"),
			},
			{ status: 500 }
		);
	} catch (err: any) {
		console.error("[Satellite] Error:", err);
		return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
	}
}
