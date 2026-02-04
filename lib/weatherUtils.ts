/**
 * 날씨 관련 유틸리티 함수
 */

/**
 * 이슬점 계산 (Magnus 공식)
 * @param temperatureC 기온 (°C)
 * @param humidityPct 상대습도 (%)
 * @returns 이슬점 (°C)
 */
export function calculateDewPoint(temperatureC: number, humidityPct: number): number {
	if (temperatureC === null || humidityPct === null || temperatureC < -50 || temperatureC > 60) {
		return 0;
	}

	const a = 17.27;
	const b = 237.7;
	const alpha = ((a * temperatureC) / (b + temperatureC)) + Math.log(humidityPct / 100.0);
	const dewPoint = (b * alpha) / (a - alpha);
	return Math.round(dewPoint * 10) / 10;
}

/**
 * 수증기량 계산 (절대습도, g/m³)
 * @param temperatureC 기온 (°C)
 * @param humidityPct 상대습도 (%)
 * @returns 수증기량 (g/m³)
 */
export function calculateAbsoluteHumidity(temperatureC: number, humidityPct: number): number {
	if (temperatureC === null || humidityPct === null) {
		return 0;
	}

	// 포화 수증기압 계산 (Tetens 공식)
	const saturationVaporPressure = 6.112 * Math.exp((17.67 * temperatureC) / (temperatureC + 243.5));
	
	// 실제 수증기압
	const actualVaporPressure = (saturationVaporPressure * humidityPct) / 100;
	
	// 절대습도 (g/m³) = 216.7 * (실제 수증기압 / (기온 + 273.15))
	const absoluteHumidity = (216.7 * actualVaporPressure) / (temperatureC + 273.15);
	
	return Math.round(absoluteHumidity * 10) / 10;
}

/**
 * 구름 격자에서 특정 위치의 구름량 조회
 * @param lat 위도
 * @param lng 경도
 * @param cloudGrid 구름 격자 데이터
 * @returns 구름량 (0-100%)
 */
export function getCloudCoverFromGrid(
	lat: number,
	lng: number,
	cloudGrid: { x0: number; y0: number; gridKm: number; xdim: number; ydim: number; grid: number[][] }
): number | null {
	if (!cloudGrid || !cloudGrid.grid || cloudGrid.grid.length === 0) {
		return null;
	}

	// 격자 좌표 계산
	// x0, y0는 격자의 시작 좌표 (경도, 위도)
	// gridKm은 격자 간격 (km)
	// 위도 1도 ≈ 111km, 경도 1도 ≈ 111km * cos(위도)
	const latRad = (lat * Math.PI) / 180;
	const kmPerDegLat = 111.0;
	const kmPerDegLng = 111.0 * Math.cos(latRad);
	
	const dx = (lng - cloudGrid.x0) * kmPerDegLng / cloudGrid.gridKm;
	const dy = (lat - cloudGrid.y0) * kmPerDegLat / cloudGrid.gridKm;

	// 격자 인덱스 계산 (반올림하여 가장 가까운 격자 선택)
	const x = Math.round(dx);
	const y = Math.round(dy);

	// 범위 체크
	if (x < 0 || x >= cloudGrid.xdim || y < 0 || y >= cloudGrid.ydim) {
		return null;
	}

	// 구름 값 읽기
	const cloudValue = cloudGrid.grid[y]?.[x] ?? 0;
	
	// 값이 0~1 범위면 그대로, 1~2 범위면 정규화 필요
	let normalizedValue = cloudValue;
	if (cloudValue > 1) {
		// 전체 격자에서 최대값 찾기
		let max = 0;
		for (let i = 0; i < cloudGrid.ydim; i++) {
			for (let j = 0; j < cloudGrid.xdim; j++) {
				const val = cloudGrid.grid[i]?.[j] ?? 0;
				if (val > max) max = val;
			}
		}
		if (max > 1 && max > 0) {
			normalizedValue = cloudValue / max;
		}
	}

	// 0~100%로 변환
	return Math.round(Math.min(100, Math.max(0, normalizedValue * 100)));
}

/**
 * 빛공해 등급 평가 (NASA VIIRS 데이터 기반)
 * 현재는 타일 이미지이므로 정확한 수치는 어려움
 * 대략적인 평가만 제공
 * @param lat 위도
 * @param lng 경도
 * @returns 빛공해 등급 (1-9, 1=최적, 9=심각)
 */
export function estimateLightPollution(lat: number, lng: number): {
	level: number; // 1-9
	description: string;
	color: string;
	score: number; // 0-100 (100=최적, 0=심각)
} {
	// 대한민국 지역별 대략적인 빛공해 수준
	// 실제로는 NASA VIIRS 타일에서 픽셀 값을 읽어야 하지만,
	// 여기서는 지역별 대략적인 평가만 제공
	
	let level: number;
	let description: string;
	let color: string;
	
	// 수도권 (서울, 인천, 경기)
	if (lat >= 37.0 && lat <= 37.8 && lng >= 126.5 && lng <= 127.5) {
		level = 8;
		description = "매우 심각";
		color = "#ef4444";
	}
	// 부산, 대구, 광주 등 대도시
	else if (
		(lat >= 35.0 && lat <= 35.3 && lng >= 129.0 && lng <= 129.3) || // 부산
		(lat >= 35.8 && lat <= 36.0 && lng >= 128.5 && lng <= 128.7) || // 대구
		(lat >= 35.1 && lat <= 35.2 && lng >= 126.8 && lng <= 126.9)   // 광주
	) {
		level = 7;
		description = "심각";
		color = "#f97316";
	}
	// 중소도시
	else if (lat >= 36.0 && lat <= 38.0 && lng >= 126.0 && lng <= 130.0) {
		level = 5;
		description = "보통";
		color = "#fbbf24";
	}
	// 산간/농어촌 지역
	else {
		level = 2;
		description = "양호";
		color = "#4ade80";
	}
	
	// 등급을 점수로 변환 (1=100점, 9=0점)
	const score = Math.round(100 - ((level - 1) / 8) * 100);
	
	return { level, description, color, score };
}

/**
 * 관측 적합도 계산 (빛공해, 구름, 수증기량만 고려)
 * @param lat 위도
 * @param lng 경도
 * @param lightPollutionLevel 빛공해 등급 (1-9)
 * @param cloudCoverPct 구름량 (0-100%)
 * @param absoluteHumidity 수증기량 (g/m³)
 * @returns 관측 적합도 점수 (0-100)
 */
export function calculateObservationScore(
	lat: number,
	lng: number,
	lightPollutionLevel: number,
	cloudCoverPct: number,
	absoluteHumidity: number
): {
	score: number; // 0-100
	isGood: boolean;
	breakdown: {
		lightPollution: number;
		cloudCover: number;
		humidity: number;
	};
} {
	// 빛공해 점수 (40점 만점)
	// 등급 1-2: 40점, 3-4: 30점, 5-6: 20점, 7-8: 10점, 9: 0점
	let lightPollutionScore = 0;
	if (lightPollutionLevel <= 2) {
		lightPollutionScore = 40;
	} else if (lightPollutionLevel <= 4) {
		lightPollutionScore = 30;
	} else if (lightPollutionLevel <= 6) {
		lightPollutionScore = 20;
	} else if (lightPollutionLevel <= 8) {
		lightPollutionScore = 10;
	}
	
	// 구름량 점수 (40점 만점)
	// 구름량이 적을수록 높은 점수
	// 0%: 40점, 25%: 30점, 50%: 20점, 75%: 10점, 100%: 0점
	const cloudCoverScore = Math.max(0, 40 - (cloudCoverPct / 100) * 40);
	
	// 수증기량 점수 (20점 만점)
	// 수증기량이 적을수록 높은 점수
	// 0-5 g/m³: 20점, 5-10: 15점, 10-15: 10점, 15-20: 5점, 20+: 0점
	let humidityScore = 20;
	if (absoluteHumidity > 20) {
		humidityScore = 0;
	} else if (absoluteHumidity > 15) {
		humidityScore = 5;
	} else if (absoluteHumidity > 10) {
		humidityScore = 10;
	} else if (absoluteHumidity > 5) {
		humidityScore = 15;
	}
	
	const totalScore = Math.round(lightPollutionScore + cloudCoverScore + humidityScore);
	const isGood = totalScore >= 50;
	
	return {
		score: totalScore,
		isGood,
		breakdown: {
			lightPollution: Math.round(lightPollutionScore),
			cloudCover: Math.round(cloudCoverScore),
			humidity: Math.round(humidityScore),
		},
	};
}
