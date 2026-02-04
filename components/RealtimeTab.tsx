"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { LatLng, StationScore } from "@/types/observation";
import {
	STATION_LIST,
	fetchRealtimeData,
	computeStationScores,
	getNearestStations,
	formatDistance,
} from "@/lib/realtimeApi";

interface RealtimeTabProps {
	initialLocation?: LatLng | null;
}

// 지도 컴포넌트 동적 로드 (SSR 비활성화)
const RealtimeMap = dynamic(() => import("./RealtimeMapSimple"), {
	ssr: false,
	loading: () => (
		<div style={{ width: "100%", height: "100%", backgroundColor: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
			<div style={{ color: "#94a3b8", fontSize: "16px" }}>🗺️ 지도 준비 중...</div>
		</div>
	),
});

// ============ 쉬운 등급 시스템 ============

function getGrade(score: number): {
	level: number;
	label: string;
	emoji: string;
	message: string;
	tip: string;
	color: string;
	bgColor: string;
} {
	if (score >= 80) {
		return {
			level: 5,
			label: "최고",
			emoji: "🌟",
			message: "지금 별 보기 딱 좋아요!",
			tip: "바로 나가서 밤하늘을 즐기세요!",
			color: "#22c55e",
			bgColor: "rgba(34, 197, 94, 0.15)",
		};
	}
	if (score >= 60) {
		return {
			level: 4,
			label: "좋음",
			emoji: "✨",
			message: "지금 별 볼 수 있어요!",
			tip: "밝은 별과 은하수가 보일 거예요.",
			color: "#84cc16",
			bgColor: "rgba(132, 204, 22, 0.15)",
		};
	}
	if (score >= 40) {
		return {
			level: 3,
			label: "보통",
			emoji: "🌙",
			message: "별이 어느 정도 보여요",
			tip: "밝은 별 위주로 관측 가능해요.",
			color: "#facc15",
			bgColor: "rgba(250, 204, 21, 0.15)",
		};
	}
	if (score >= 20) {
		return {
			level: 2,
			label: "흐림",
			emoji: "☁️",
			message: "지금은 별 보기 어려워요",
			tip: "날씨가 좋아지길 기다려요.",
			color: "#f97316",
			bgColor: "rgba(249, 115, 22, 0.15)",
		};
	}
	return {
		level: 1,
		label: "불가",
		emoji: "🚫",
		message: "지금은 별을 볼 수 없어요",
		tip: "맑은 날을 기다려주세요.",
		color: "#ef4444",
		bgColor: "rgba(239, 68, 68, 0.15)",
	};
}

function getScoreColor(score: number): string {
	if (score >= 80) return "#22c55e";
	if (score >= 60) return "#84cc16";
	if (score >= 40) return "#facc15";
	if (score >= 20) return "#f97316";
	return "#ef4444";
}

// ============ 스타일 ============

const styles = {
	container: {
		display: "flex",
		width: "100%",
		height: "100%",
		backgroundColor: "#0f172a",
	},
	mapContainer: {
		flex: 1,
		height: "100%",
		position: "relative" as const,
	},
	panel: {
		width: "400px",
		height: "100%",
		backgroundColor: "#0f172a",
		borderLeft: "1px solid rgba(255,255,255,0.1)",
		overflowY: "auto" as const,
		padding: "24px",
	},
	stepIndicator: {
		display: "flex",
		justifyContent: "center",
		gap: "8px",
		marginBottom: "24px",
	},
	step: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		padding: "8px 12px",
		borderRadius: "20px",
		fontSize: "14px",
		fontWeight: 600,
	},
	card: {
		backgroundColor: "rgba(51, 65, 85, 0.4)",
		borderRadius: "16px",
		padding: "20px",
		marginBottom: "16px",
	},
	resultBox: {
		textAlign: "center" as const,
		padding: "32px 24px",
		borderRadius: "20px",
		marginBottom: "20px",
	},
	detailToggle: {
		width: "100%",
		padding: "14px",
		border: "none",
		borderRadius: "12px",
		backgroundColor: "rgba(255,255,255,0.05)",
		color: "#94a3b8",
		fontSize: "15px",
		cursor: "pointer",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "8px",
	},
};

// ============ 컴포넌트 ============

export default function RealtimeTab({ initialLocation }: RealtimeTabProps) {
	const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
	const [weatherData, setWeatherData] = useState<StationScore | null>(null);
	const [nearestStationName, setNearestStationName] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdateAt, setLastUpdateAt] = useState<string | null>(null);
	const [showDetails, setShowDetails] = useState(false);

	// 명소에서 전달받은 초기 위치로 데이터 로드
	useEffect(() => {
		if (initialLocation) {
			handleMapClick(initialLocation);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialLocation]);

	// 지도 클릭 핸들러
	const handleMapClick = useCallback(async (latlng: LatLng) => {
		setSelectedLocation(latlng);
		setLoading(true);
		setError(null);
		setShowDetails(false);

		try {
			// 가장 가까운 관측소 1개 찾기
			const nearbyStations = getNearestStations(latlng, STATION_LIST, 1);
			
			if (nearbyStations.length === 0) {
				setError("근처에 관측소가 없어요.");
				setLoading(false);
				return;
			}

			// 관측소 데이터 가져오기
			const stationIds = nearbyStations.map((s) => s.id);
			const data = await fetchRealtimeData(stationIds);
			const scores = computeStationScores(nearbyStations, data, latlng);
			
			if (scores.length > 0) {
				setWeatherData(scores[0]);
				setNearestStationName(scores[0].station.name);
				setLastUpdateAt(new Date().toISOString());
			}
		} catch (err) {
			console.error("실시간 데이터 조회 실패:", err);
			setError("날씨 정보를 가져오지 못했어요.");
		} finally {
			setLoading(false);
		}
	}, []);

	const grade = weatherData ? getGrade(weatherData.combinedScore) : null;
	const currentStep = weatherData ? 2 : selectedLocation ? 1 : 0;

	return (
		<div style={styles.container}>
			{/* 지도 영역 */}
			<div style={styles.mapContainer}>
				<RealtimeMap
					selectedLocation={selectedLocation}
					onMapClick={handleMapClick}
				/>
			</div>

			{/* 우측 패널 */}
			<div style={styles.panel}>
				{/* 단계 표시 */}
				<div style={styles.stepIndicator}>
					<div style={{
						...styles.step,
						backgroundColor: currentStep >= 1 ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
						color: currentStep >= 1 ? "#60a5fa" : "#64748b",
					}}>
						<span>1️⃣</span>
						<span>장소</span>
						{currentStep > 1 && <span>✓</span>}
					</div>
					<div style={{
						...styles.step,
						backgroundColor: currentStep >= 2 ? "rgba(34, 197, 94, 0.2)" : "rgba(255,255,255,0.05)",
						color: currentStep >= 2 ? "#4ade80" : "#64748b",
					}}>
						<span>2️⃣</span>
						<span>결과</span>
					</div>
				</div>

				{/* Step 1: 장소 선택 */}
				<div style={styles.card}>
					<div style={{ fontSize: "20px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
						📍 지금 어디서 별을 볼까요?
					</div>
					{selectedLocation ? (
						<div style={{
							padding: "16px",
							backgroundColor: "rgba(34, 197, 94, 0.1)",
							borderRadius: "12px",
							border: "2px solid rgba(34, 197, 94, 0.3)",
						}}>
							<div style={{ fontSize: "16px", color: "#4ade80", fontWeight: 600, marginBottom: "4px" }}>
								✓ 장소를 선택했어요!
							</div>
							<div style={{ fontSize: "14px", color: "#94a3b8" }}>
								지도를 다시 클릭하면 변경할 수 있어요
							</div>
						</div>
					) : (
						<div style={{
							padding: "24px",
							backgroundColor: "rgba(59, 130, 246, 0.1)",
							borderRadius: "12px",
							border: "2px dashed rgba(59, 130, 246, 0.3)",
							textAlign: "center",
						}}>
							<div style={{ fontSize: "40px", marginBottom: "12px" }}>👆</div>
							<div style={{ fontSize: "18px", color: "#60a5fa", fontWeight: 600 }}>
								지도를 클릭해주세요
							</div>
							<div style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>
								지금 바로 별을 볼 수 있는지 확인해요
							</div>
						</div>
					)}
				</div>

				{/* 로딩 */}
				{loading && (
					<div style={{ textAlign: "center", padding: "40px" }}>
						<div style={{ fontSize: "48px", marginBottom: "16px", animation: "pulse 1.5s infinite" }}>📡</div>
						<div style={{ fontSize: "18px", color: "#94a3b8" }}>
							실시간 날씨를 확인하고 있어요...
						</div>
					</div>
				)}

				{/* 에러 */}
				{error && (
					<div style={{
						...styles.card,
						backgroundColor: "rgba(239, 68, 68, 0.1)",
						border: "2px solid rgba(239, 68, 68, 0.3)",
						textAlign: "center",
					}}>
						<div style={{ fontSize: "32px", marginBottom: "12px" }}>😢</div>
						<div style={{ fontSize: "16px", color: "#f87171" }}>{error}</div>
					</div>
				)}

				{/* Step 2: 결과 */}
				{weatherData && grade && !loading && (
					<>
						{/* 메인 결과 */}
						<div style={{
							...styles.resultBox,
							backgroundColor: grade.bgColor,
							border: `2px solid ${grade.color}40`,
						}}>
							<div style={{ fontSize: "64px", marginBottom: "16px" }}>{grade.emoji}</div>
							<div style={{
								fontSize: "28px",
								fontWeight: 800,
								color: grade.color,
								marginBottom: "8px",
							}}>
								{grade.level}등급 - {grade.label}
							</div>
							<div style={{
								fontSize: "22px",
								fontWeight: 600,
								color: "#fff",
								marginBottom: "12px",
								lineHeight: 1.4,
							}}>
								{grade.message}
							</div>
							<div style={{
								fontSize: "16px",
								color: "#94a3b8",
								lineHeight: 1.5,
							}}>
								💡 {grade.tip}
							</div>
						</div>

						{/* 별 보기 점수 */}
						<div style={styles.card}>
							<div style={{ textAlign: "center" }}>
								<div style={{ fontSize: "16px", color: "#94a3b8", marginBottom: "8px" }}>
									⭐ 별 보기 점수
								</div>
								<div style={{
									fontSize: "56px",
									fontWeight: 800,
									color: grade.color,
									lineHeight: 1,
								}}>
									{weatherData.combinedScore}
								</div>
								<div style={{ fontSize: "16px", color: "#64748b", marginTop: "4px" }}>
									100점 만점
								</div>
							</div>

							{/* 점수 바 */}
							<div style={{
								marginTop: "20px",
								height: "12px",
								backgroundColor: "rgba(255,255,255,0.1)",
								borderRadius: "6px",
								overflow: "hidden",
							}}>
								<div style={{
									width: `${weatherData.combinedScore}%`,
									height: "100%",
									backgroundColor: grade.color,
									borderRadius: "6px",
									transition: "width 0.5s ease",
								}} />
							</div>

							{/* 기준 관측소 */}
							<div style={{
								marginTop: "16px",
								padding: "12px",
								backgroundColor: "rgba(255,255,255,0.05)",
								borderRadius: "10px",
								textAlign: "center",
							}}>
								<div style={{ fontSize: "13px", color: "#64748b" }}>
									📍 기준 관측소: <strong style={{ color: "#94a3b8" }}>{nearestStationName}</strong>
									<span style={{ marginLeft: "8px" }}>({formatDistance(weatherData.distance)})</span>
								</div>
								{lastUpdateAt && (
									<div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
										🕐 {new Date(lastUpdateAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준
									</div>
								)}
							</div>
						</div>

						{/* 상세 정보 토글 */}
						<button
							style={styles.detailToggle}
							onClick={() => setShowDetails(!showDetails)}
						>
							{showDetails ? "▲ 상세 정보 숨기기" : "▼ 상세 정보 보기"}
						</button>

						{/* 상세 정보 */}
						{showDetails && (
							<div style={{ marginTop: "16px" }}>
								{/* 실시간 날씨 */}
								<div style={styles.card}>
									<div style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
										🌤️ 실시간 날씨
									</div>
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
										<div style={{ textAlign: "center", padding: "12px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
											<div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>🌡️ 기온</div>
											<div style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0" }}>
												{weatherData.temperature !== null ? `${weatherData.temperature}°` : "-"}
											</div>
										</div>
										<div style={{ textAlign: "center", padding: "12px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
											<div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>💧 습도</div>
											<div style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0" }}>
												{weatherData.humidity !== null ? `${weatherData.humidity}%` : "-"}
											</div>
										</div>
										<div style={{ textAlign: "center", padding: "12px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
											<div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>👁️ 시정</div>
											<div style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0" }}>
												{weatherData.visibility !== null ? `${Math.round(weatherData.visibility / 1000)}km` : "-"}
											</div>
										</div>
									</div>
								</div>

								{/* 세부 점수 */}
								<div style={styles.card}>
									<div style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
										📊 세부 점수
									</div>
									
									{[
										{ icon: "☁️", label: "하늘 맑음", score: weatherData.cloudScore, desc: "구름이 적을수록 좋아요" },
										{ icon: "💨", label: "공기 맑음", score: weatherData.transparencyScore, desc: "시정이 좋을수록 좋아요" },
									].map((item, idx) => (
										<div key={idx} style={{ marginBottom: idx < 1 ? "16px" : 0 }}>
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
												<span style={{ fontSize: "15px", color: "#e2e8f0" }}>
													{item.icon} {item.label}
												</span>
												<span style={{ fontSize: "18px", fontWeight: 700, color: getScoreColor(item.score) }}>
													{item.score}점
												</span>
											</div>
											<div style={{
												height: "8px",
												backgroundColor: "rgba(255,255,255,0.1)",
												borderRadius: "4px",
												overflow: "hidden",
											}}>
												<div style={{
													width: `${item.score}%`,
													height: "100%",
													backgroundColor: getScoreColor(item.score),
													borderRadius: "4px",
												}} />
											</div>
											<div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
												{item.desc}
											</div>
										</div>
									))}
								</div>

								{/* 관측 팁 */}
								<div style={{
									...styles.card,
									backgroundColor: "rgba(59, 130, 246, 0.1)",
									border: "1px solid rgba(59, 130, 246, 0.3)",
								}}>
									<div style={{ fontSize: "15px", fontWeight: 700, color: "#60a5fa", marginBottom: "8px" }}>
										💡 관측 팁
									</div>
									<div style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: 1.7 }}>
										{weatherData.humidity !== null && weatherData.humidity > 70 ? (
											"습도가 높아요. 렌즈에 이슬이 맺힐 수 있으니 제습제를 준비하세요."
										) : weatherData.combinedScore >= 60 ? (
											"좋은 조건이에요! 눈을 어둠에 적응시키면 더 많은 별이 보여요."
										) : (
											"날씨가 좋아지면 다시 확인해보세요. 달력 페이지에서 달이 없는 날도 확인하세요!"
										)}
									</div>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* 애니메이션 스타일 */}
			<style jsx global>{`
				@keyframes pulse {
					0%, 100% { opacity: 1; transform: scale(1); }
					50% { opacity: 0.7; transform: scale(1.05); }
				}
			`}</style>
		</div>
	);
}
