/**
 * 구름 격자 데이터를 히트맵 이미지로 변환
 */

export interface CloudGridData {
	dateTime: string;
	gridKm: number;
	xdim: number;
	ydim: number;
	x0: number;
	y0: number;
	grid: number[][]; // [y][x] 구름 탐지 값 (0~1)
}

export interface HeatmapOptions {
	width: number; // 출력 이미지 너비
	height: number; // 출력 이미지 높이
	colorScale?: (value: number) => string; // 값 -> 색상 변환 함수
	opacity?: number; // 전체 투명도 (0~1)
}

/**
 * 기본 색상 스케일: 구름 농도에 따른 색상
 * 0 = 투명 (구름 없음)
 * 0.5 = 반투명 흰색 (얇은 구름)
 * 1 = 불투명 회색 (짙은 구름)
 */
export const defaultCloudColorScale = (value: number): string => {
	if (value <= 0) return "rgba(255, 255, 255, 0)"; // 투명
	if (value >= 1) return "rgba(200, 200, 220, 0.9)"; // 짙은 구름

	// 0~1 사이: 점진적으로 불투명해짐
	const opacity = value * 0.9;
	const brightness = Math.max(200, 255 - value * 55); // 밝기 감소
	return `rgba(${brightness}, ${brightness}, ${brightness + 20}, ${opacity})`;
};

/**
 * Canvas에 히트맵 그리기
 */
export function createCloudHeatmap(data: CloudGridData, options: HeatmapOptions): HTMLCanvasElement {
	const { width, height, colorScale = defaultCloudColorScale, opacity = 1 } = options;

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas context not available");

	// 배경 투명
	ctx.clearRect(0, 0, width, height);

	// 격자 크기 계산
	const cellWidth = width / data.xdim;
	const cellHeight = height / data.ydim;

	// grid 값 분포 확인용
	let min = 1,
		max = 0,
		sum = 0,
		count = 0;
	// grid 값이 1~2 범위면 0~1로 정규화
	const gridMin = min;
	const gridMax = max;
	const normalize = (v: number) => {
		if (gridMax - gridMin < 0.01) return 0; // 값이 거의 같으면 0
		return (v - gridMin) / (gridMax - gridMin);
	};
	for (let y = 0; y < data.ydim; y++) {
		for (let x = 0; x < data.xdim; x++) {
			const raw = data.grid[y]?.[x] || 0;
			if (raw <= 0) continue;
			const value = normalize(raw);
			const color = colorScale(value);
			ctx.fillStyle = color;
			ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
		}
	}
	if (count > 0) {
		const avg = sum / count;
		console.log(`[CloudHeatmap] grid value min:${min.toFixed(3)} max:${max.toFixed(3)} avg:${avg.toFixed(3)} count:${count}`);
	}

	// 전체 투명도 적용
	if (opacity < 1) {
		ctx.globalAlpha = opacity;
	}

	return canvas;
}

/**
 * Canvas를 Data URL로 변환 (이미지로 사용)
 */
export function canvasToDataURL(canvas: HTMLCanvasElement): string {
	return canvas.toDataURL("image/png");
}

/**
 * 오로라 스타일 색상 스케일 (파랑-보라-분홍)
 */
export const auroraColorScale = (value: number): string => {
	if (value <= 0) return "rgba(0, 0, 0, 0)";

	// 0~0.3: 파랑
	if (value < 0.3) {
		const alpha = value / 0.3;
		return `rgba(100, 150, 255, ${alpha * 0.7})`;
	}

	// 0.3~0.7: 보라
	if (value < 0.7) {
		const t = (value - 0.3) / 0.4;
		const r = 100 + t * 100;
		const g = 150 - t * 100;
		const b = 255;
		return `rgba(${r}, ${g}, ${b}, 0.8)`;
	}

	// 0.7~1: 분홍
	const t = (value - 0.7) / 0.3;
	const r = 200 + t * 55;
	const g = 50 + t * 100;
	const b = 255 - t * 100;
	return `rgba(${r}, ${g}, ${b}, 0.9)`;
};

/**
 * 기상 표준형 색상 스케일 (Option 1 선택)
 * 값 증가에 따라 하늘색 → 청회색 → 중간회색 → 짙은회색
 * - 0 ~ 0.03 : 노이즈 제거 (투명)
 * - 0.03 ~ 0.20 : 연한 하늘색 (얇은 / 산발 구름)
 * - 0.20 ~ 0.50 : 파스텔 청회색 (부분적 구름)
 * - 0.50 ~ 0.80 : 중간 회색 (대부분 덮임)
 * - 0.80 ~ 1.00 : 짙은 회색(약간 남색기) (완전 덮임)
 */
export const meteoCloudColorScale = (value: number): string => {
	if (value <= 0.03) return "rgba(0,0,0,0)";
	// 강렬한 기상 팔레트: 파랑-초록-노랑-주황-빨강
	const stops = [
		{ v: 0.03, r: 80, g: 180, b: 255, a: 0.7 }, // 하늘색
		{ v: 0.2, r: 0, g: 220, b: 100, a: 0.8 }, // 초록
		{ v: 0.5, r: 255, g: 230, b: 0, a: 0.85 }, // 노랑
		{ v: 0.8, r: 255, g: 140, b: 0, a: 0.9 }, // 주황
		{ v: 1.0, r: 255, g: 40, b: 40, a: 1.0 }, // 빨강
	];
	let lower = stops[0];
	let upper = stops[stops.length - 1];
	for (let i = 0; i < stops.length - 1; i++) {
		if (value >= stops[i].v && value <= stops[i + 1].v) {
			lower = stops[i];
			upper = stops[i + 1];
			break;
		}
	}
	const span = upper.v - lower.v || 1;
	const t = Math.min(1, Math.max(0, (value - lower.v) / span));
	const r = Math.round(lower.r + (upper.r - lower.r) * t);
	const g = Math.round(lower.g + (upper.g - lower.g) * t);
	const b = Math.round(lower.b + (upper.b - lower.b) * t);
	const a = lower.a + (upper.a - lower.a) * t;
	return `rgba(${r}, ${g}, ${b}, ${a})`;
};
