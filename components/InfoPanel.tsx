"use client";

import type { CelestialInfo } from "@/lib/astronomy";

interface WeatherInfo {
	sky: number;
	temperature: number;
	humidity: number;
}

interface SelectedLocation {
	lat: number;
	lng: number;
}

interface InfoPanelProps {
	selectedLocation: SelectedLocation | null;
	celestialInfo: CelestialInfo | null;
	weather: WeatherInfo | null;
	loading: boolean;
	onNavigate: () => void;
}

const styles = {
	panel: {
		position: "absolute" as const,
		bottom: "16px",
		right: "16px",
		width: "360px",
		maxWidth: "calc(100vw - 32px)",
		zIndex: 9999,
		backgroundColor: "rgba(17, 24, 39, 0.95)",
		backdropFilter: "blur(8px)",
		borderRadius: "12px",
		padding: "16px",
		color: "white",
		boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
	},
	title: {
		fontSize: "16px",
		fontWeight: 700,
		marginBottom: "12px",
		display: "flex",
		alignItems: "center",
		gap: "8px",
	},
	grid2: {
		display: "grid",
		gridTemplateColumns: "1fr 1fr",
		gap: "8px",
		marginBottom: "12px",
	},
	grid3: {
		display: "grid",
		gridTemplateColumns: "1fr 1fr 1fr",
		gap: "8px",
	},
	card: {
		backgroundColor: "#374151",
		borderRadius: "8px",
		padding: "10px",
	},
	cardCenter: {
		backgroundColor: "#374151",
		borderRadius: "8px",
		padding: "10px",
		textAlign: "center" as const,
	},
	label: {
		fontSize: "11px",
		color: "#9ca3af",
		marginBottom: "2px",
	},
	value: {
		fontSize: "14px",
		fontWeight: 500,
	},
	smallText: {
		fontSize: "11px",
		color: "#6b7280",
		marginTop: "2px",
	},
	sectionTitle: {
		fontSize: "13px",
		fontWeight: 600,
		color: "#d1d5db",
		marginBottom: "8px",
	},
	progressBar: {
		width: "100%",
		height: "8px",
		backgroundColor: "#374151",
		borderRadius: "4px",
		overflow: "hidden",
	},
	button: {
		width: "100%",
		padding: "12px",
		backgroundColor: "#facc15",
		color: "#000",
		fontWeight: 700,
		fontSize: "14px",
		border: "none",
		borderRadius: "8px",
		cursor: "pointer",
		marginTop: "12px",
	},
	hint: {
		position: "absolute" as const,
		bottom: "32px",
		left: "50%",
		transform: "translateX(-50%)",
		zIndex: 9999,
		backgroundColor: "rgba(17, 24, 39, 0.9)",
		backdropFilter: "blur(8px)",
		padding: "12px 24px",
		borderRadius: "24px",
		color: "white",
		fontSize: "14px",
	},
};

function getSkyText(sky: number) {
	switch (sky) {
		case 1:
			return "☀️ 맑음";
		case 3:
			return "⛅ 구름많음";
		case 4:
			return "☁️ 흐림";
		default:
			return "❓ 알 수 없음";
	}
}

// 하늘 상태에 따른 구름량 (SKY: 1=맑음, 3=구름많음, 4=흐림)
function getCloudAmount(sky: number): number {
	switch (sky) {
		case 1:
			return 20; // 맑음: 0~20%
		case 3:
			return 60; // 구름많음: 50~80%
		case 4:
			return 90; // 흐림: 80~100%
		default:
			return 50;
	}
}

// 관측 조건 평가
function getWeatherCondition(sky: number, humidity: number): { text: string; color: string } {
	const cloudAmount = getCloudAmount(sky);
	if (cloudAmount <= 30 && humidity <= 70) {
		return { text: "🌟 관측 최적", color: "#4ade80" };
	} else if (cloudAmount <= 50 && humidity <= 80) {
		return { text: "👍 관측 가능", color: "#facc15" };
	} else {
		return { text: "⚠️ 관측 부적합", color: "#fb923c" };
	}
}

export default function InfoPanel({ selectedLocation, celestialInfo, weather, loading, onNavigate }: InfoPanelProps) {
	if (!selectedLocation) {
		return <div style={styles.hint}>지도를 클릭하여 관측 장소를 선택하세요</div>;
	}

	return (
		<div style={styles.panel}>
			<div style={styles.title}>
				📍 선택한 위치
				{loading && <span style={{ fontSize: "12px", color: "#9ca3af" }}>불러오는 중...</span>}
			</div>

			{/* 좌표 */}
			<div style={styles.grid2}>
				<div style={styles.card}>
					<div style={styles.label}>위도</div>
					<div style={{ ...styles.value, fontFamily: "monospace" }}>{selectedLocation.lat.toFixed(5)}°</div>
				</div>
				<div style={styles.card}>
					<div style={styles.label}>경도</div>
					<div style={{ ...styles.value, fontFamily: "monospace" }}>{selectedLocation.lng.toFixed(5)}°</div>
				</div>
			</div>

			{/* 천문 정보 */}
			{celestialInfo && (
				<div style={{ marginBottom: "12px" }}>
					<div style={styles.sectionTitle}>🌌 천문 정보</div>
					<div style={styles.grid2}>
						<div style={styles.card}>
							<div style={styles.label}>달</div>
							<div style={styles.value}>{celestialInfo.moonPhase}</div>
							<div style={styles.smallText}>
								밝기 {celestialInfo.moonIllumination}% · 고도 {celestialInfo.moonAltitude}°
							</div>
						</div>
						<div style={styles.card}>
							<div style={styles.label}>은하수 중심</div>
							<div style={styles.value}>고도 {celestialInfo.milkyWayCenterAltitude}°</div>
							<div style={styles.smallText}>방위각 {celestialInfo.milkyWayCenterAzimuth}°</div>
						</div>
					</div>

					{/* 관측 점수 */}
					<div style={{ ...styles.card, marginTop: "8px" }}>
						<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
							<span style={styles.label}>관측 적합도</span>
							<span
								style={{
									fontWeight: 700,
									color: celestialInfo.observationScore >= 50 ? "#4ade80" : "#fb923c",
								}}
							>
								{celestialInfo.observationScore}점
							</span>
						</div>
						<div style={styles.progressBar}>
							<div
								style={{
									width: `${celestialInfo.observationScore}%`,
									height: "100%",
									backgroundColor: celestialInfo.observationScore >= 50 ? "#22c55e" : "#f97316",
									borderRadius: "4px",
								}}
							/>
						</div>
						<div style={{ ...styles.smallText, marginTop: "6px" }}>{celestialInfo.isGoodForObservation ? "✅ 은하수 관측에 적합합니다" : "⚠️ 은하수 관측에 부적합합니다"}</div>
					</div>
				</div>
			)}

			{/* 날씨 정보 */}
			{weather && (
				<div style={{ marginBottom: "12px" }}>
					<div style={styles.sectionTitle}>🌤️ 날씨</div>
					<div style={styles.grid2}>
						<div style={styles.card}>
							<div style={styles.label}>하늘 상태</div>
							<div style={styles.value}>{getSkyText(weather.sky)}</div>
						</div>
						<div style={styles.card}>
							<div style={styles.label}>구름량</div>
							<div style={styles.value}>약 {getCloudAmount(weather.sky)}%</div>
						</div>
					</div>
					<div style={{ ...styles.grid2, marginTop: "8px" }}>
						<div style={styles.card}>
							<div style={styles.label}>기온</div>
							<div style={styles.value}>{weather.temperature}°C</div>
						</div>
						<div style={styles.card}>
							<div style={styles.label}>습도</div>
							<div style={styles.value}>{weather.humidity}%</div>
						</div>
					</div>
					{/* 날씨 기반 관측 조건 */}
					<div style={{ ...styles.card, marginTop: "8px", textAlign: "center" }}>
						<span style={{ color: getWeatherCondition(weather.sky, weather.humidity).color, fontWeight: 600 }}>{getWeatherCondition(weather.sky, weather.humidity).text}</span>
					</div>
				</div>
			)}

			{/* 길찾기 버튼 */}
			<button style={styles.button} onClick={onNavigate}>
				🚗 카카오맵으로 길찾기
			</button>
		</div>
	);
}
