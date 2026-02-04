"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { LatLng, ForecastScores, RawForecastApiResponse } from "@/types/observation";
import { fetchForecast, computeForecastScores, getDateOptions } from "@/lib/forecastApi";

interface ForecastTabProps {
	initialLocation?: LatLng | null;
}

// 지도 컴포넌트 동적 로드 (SSR 비활성화)
const ForecastMap = dynamic(() => import("./ForecastMap"), {
	ssr: false,
	loading: () => (
		<div style={{ width: "100%", height: "100%", backgroundColor: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
			<div style={{ color: "#94a3b8", fontSize: "16px" }}>🗺️ 지도 준비 중...</div>
		</div>
	),
});

// ============ 쉬운 용어 & 등급 시스템 ============

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
			message: "오늘 밤은 별 보기 딱 좋아요!",
			tip: "은하수도 선명하게 보여요. 카메라 챙기세요!",
			color: "#22c55e",
			bgColor: "rgba(34, 197, 94, 0.15)",
		};
	}
	if (score >= 60) {
		return {
			level: 4,
			label: "좋음",
			emoji: "✨",
			message: "별 보기 좋은 날이에요!",
			tip: "밝은 별과 은하수를 볼 수 있어요.",
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
			message: "오늘은 별 보기 어려워요",
			tip: "다른 날을 추천드려요.",
			color: "#f97316",
			bgColor: "rgba(249, 115, 22, 0.15)",
		};
	}
	return {
		level: 1,
		label: "불가",
		emoji: "🚫",
		message: "오늘은 별을 볼 수 없어요",
		tip: "맑은 날을 기다려주세요.",
		color: "#ef4444",
		bgColor: "rgba(239, 68, 68, 0.15)",
	};
}

// ============ 스타일 (큰 글씨 & 쉬운 UI) ============

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
	// 단계 표시
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
	// 카드
	card: {
		backgroundColor: "rgba(51, 65, 85, 0.4)",
		borderRadius: "16px",
		padding: "20px",
		marginBottom: "16px",
	},
	// 큰 버튼/선택
	bigSelect: {
		width: "100%",
		padding: "16px 20px",
		borderRadius: "12px",
		border: "2px solid rgba(255,255,255,0.1)",
		backgroundColor: "rgba(30, 41, 59, 0.8)",
		color: "#fff",
		fontSize: "18px",
		fontWeight: 500,
		cursor: "pointer",
		marginTop: "8px",
	},
	// 결과 박스
	resultBox: {
		textAlign: "center" as const,
		padding: "32px 24px",
		borderRadius: "20px",
		marginBottom: "20px",
	},
	// 상세정보 토글
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

export default function ForecastTab({ initialLocation }: ForecastTabProps) {
	const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<ForecastScores | null>(null);
	const [weatherData, setWeatherData] = useState<RawForecastApiResponse | null>(null);
	const [showDetails, setShowDetails] = useState(false);

	const dateOptions = getDateOptions(7);

	// 명소에서 전달받은 초기 위치 설정
	useEffect(() => {
		if (initialLocation) {
			setSelectedLocation(initialLocation);
		}
	}, [initialLocation]);

	// 현재 단계 계산
	const currentStep = result ? 3 : selectedLocation ? 2 : 1;

	// 지도 클릭 핸들러
	const handleMapClick = useCallback((latlng: LatLng) => {
		setSelectedLocation(latlng);
		setResult(null);
		setWeatherData(null);
		setError(null);
		setSelectedDate(null);
	}, []);

	// 날짜 선택 핸들러
	const handleDateChange = useCallback(
		async (date: string) => {
			if (!date || !selectedLocation) return;

			setSelectedDate(date);
			setLoading(true);
			setError(null);

			try {
				const rawData = await fetchForecast({
					location: selectedLocation,
					date,
				});
				setWeatherData(rawData);
				const scores = computeForecastScores(rawData, selectedLocation);
				setResult(scores);
			} catch (err) {
				console.error("예보 조회 실패:", err);
				setError("날씨 정보를 가져오지 못했어요. 다시 시도해주세요.");
			} finally {
				setLoading(false);
			}
		},
		[selectedLocation]
	);

	const grade = result ? getGrade(result.csi) : null;

	return (
		<div style={styles.container}>
			{/* 지도 영역 */}
			<div style={styles.mapContainer}>
				<ForecastMap
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
						backgroundColor: currentStep >= 2 ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
						color: currentStep >= 2 ? "#60a5fa" : "#64748b",
					}}>
						<span>2️⃣</span>
						<span>날짜</span>
						{currentStep > 2 && <span>✓</span>}
					</div>
					<div style={{
						...styles.step,
						backgroundColor: currentStep >= 3 ? "rgba(34, 197, 94, 0.2)" : "rgba(255,255,255,0.05)",
						color: currentStep >= 3 ? "#4ade80" : "#64748b",
					}}>
						<span>3️⃣</span>
						<span>결과</span>
					</div>
				</div>

				{/* Step 1: 장소 선택 */}
				<div style={styles.card}>
					<div style={{ fontSize: "20px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
						📍 어디서 별을 볼까요?
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
								별을 보고 싶은 장소를 선택해요
							</div>
						</div>
					)}
				</div>

				{/* Step 2: 날짜 선택 */}
				{selectedLocation && (
					<div style={styles.card}>
						<div style={{ fontSize: "20px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
							📅 언제 별을 볼까요?
						</div>
						<select
							style={{
								...styles.bigSelect,
								opacity: loading ? 0.6 : 1,
							}}
							value={selectedDate || ""}
							onChange={(e) => handleDateChange(e.target.value)}
							disabled={loading}
						>
							<option value="">날짜를 선택해주세요</option>
							{dateOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
				)}

				{/* 로딩 */}
				{loading && (
					<div style={{ textAlign: "center", padding: "40px" }}>
						<div style={{ fontSize: "48px", marginBottom: "16px", animation: "pulse 1.5s infinite" }}>🔭</div>
						<div style={{ fontSize: "18px", color: "#94a3b8" }}>
							날씨 정보를 확인하고 있어요...
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

				{/* Step 3: 결과 */}
				{result && grade && !loading && (
					<>
						{/* 메인 결과 - 큰 글씨로 핵심만 */}
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

						{/* 별 보기 점수 (간단하게) */}
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
									{result.csi}
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
									width: `${result.csi}%`,
									height: "100%",
									backgroundColor: grade.color,
									borderRadius: "6px",
									transition: "width 0.5s ease",
								}} />
							</div>
						</div>

						{/* 상세 정보 토글 */}
						<button
							style={styles.detailToggle}
							onClick={() => setShowDetails(!showDetails)}
						>
							{showDetails ? "▲ 상세 정보 숨기기" : "▼ 상세 정보 보기"}
						</button>

						{/* 상세 정보 (접을 수 있음) */}
						{showDetails && (
							<div style={{ marginTop: "16px" }}>
								{/* 날씨 정보 */}
								{weatherData && (
									<div style={styles.card}>
										<div style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
											🌤️ 예상 날씨
										</div>
										<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
											<div style={{ textAlign: "center", padding: "12px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
												<div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>🌡️ 기온</div>
												<div style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0" }}>{weatherData.temperature}°</div>
											</div>
											<div style={{ textAlign: "center", padding: "12px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
												<div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>💧 습도</div>
												<div style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0" }}>{weatherData.humidity}%</div>
											</div>
											<div style={{ textAlign: "center", padding: "12px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
												<div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>☁️ 구름</div>
												<div style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0" }}>{weatherData.cloudCover}%</div>
											</div>
										</div>
									</div>
								)}

								{/* 세부 점수 */}
								<div style={styles.card}>
									<div style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
										📊 세부 점수
									</div>
									
									{[
										{ icon: "☁️", label: "하늘 맑음", score: result.cloudScore, desc: "구름이 적을수록 좋아요" },
										{ icon: "💨", label: "공기 맑음", score: result.transparencyScore, desc: "공기가 깨끗할수록 좋아요" },
										{ icon: "🌙", label: "달 어두움", score: result.moonScore, desc: "달이 없거나 작을수록 좋아요" },
										{ icon: "🌃", label: "밤하늘 어두움", score: result.lightPollutionScore, desc: "도시 불빛이 적을수록 좋아요" },
									].map((item, idx) => (
										<div key={idx} style={{ marginBottom: idx < 3 ? "16px" : 0 }}>
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

// 점수 색상
function getScoreColor(score: number): string {
	if (score >= 80) return "#22c55e";
	if (score >= 60) return "#84cc16";
	if (score >= 40) return "#facc15";
	if (score >= 20) return "#f97316";
	return "#ef4444";
}
