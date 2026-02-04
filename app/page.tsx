"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { TabType, LatLng } from "@/types/observation";

// 탭 컴포넌트 동적 로드 (SSR 비활성화 - Leaflet 관련)
const ForecastTab = dynamic(() => import("@/components/ForecastTab"), {
	ssr: false,
	loading: () => <TabLoadingPlaceholder />,
});

const RealtimeTab = dynamic(() => import("@/components/RealtimeTab"), {
	ssr: false,
	loading: () => <TabLoadingPlaceholder />,
});

// 로딩 플레이스홀더
function TabLoadingPlaceholder() {
	return (
		<div style={{
			width: "100%",
			height: "100%",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "#0f172a",
			color: "#94a3b8",
		}}>
			<div style={{ textAlign: "center" }}>
				<div style={{ fontSize: "48px", marginBottom: "16px", animation: "pulse 1.5s infinite" }}>🌌</div>
				<div style={{ fontSize: "16px" }}>로딩 중...</div>
			</div>
		</div>
	);
}

// ============ 스타일 ============

const styles = {
	container: {
		width: "100%",
		height: "calc(100vh - 60px)",
		display: "flex",
		flexDirection: "column" as const,
		backgroundColor: "#0f172a",
		overflow: "hidden",
	},
	tabBar: {
		display: "flex",
		justifyContent: "center",
		gap: "8px",
		padding: "12px 24px",
		backgroundColor: "rgba(15, 23, 42, 0.98)",
		borderBottom: "1px solid rgba(255,255,255,0.1)",
	},
	tab: {
		padding: "12px 24px",
		borderRadius: "12px",
		border: "none",
		fontSize: "16px",
		fontWeight: 600,
		cursor: "pointer",
		display: "flex",
		alignItems: "center",
		gap: "8px",
		transition: "all 0.2s",
	},
	content: {
		flex: 1,
		overflow: "hidden",
	},
	spotBanner: {
		padding: "12px 20px",
		backgroundColor: "rgba(99, 102, 241, 0.15)",
		borderBottom: "1px solid rgba(99, 102, 241, 0.3)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "12px",
	},
};

// ============ 메인 페이지 ============

export default function HomePage() {
	const searchParams = useSearchParams();
	const [activeTab, setActiveTab] = useState<TabType>("forecast");
	const [initialLocation, setInitialLocation] = useState<LatLng | null>(null);
	const [spotName, setSpotName] = useState<string | null>(null);

	// URL 쿼리 파라미터에서 좌표 읽기
	useEffect(() => {
		const lat = searchParams.get("lat");
		const lng = searchParams.get("lng");
		const name = searchParams.get("name");

		if (lat && lng) {
			setInitialLocation({
				lat: parseFloat(lat),
				lng: parseFloat(lng),
			});
			setSpotName(name);
		}
	}, [searchParams]);

	return (
		<div style={styles.container}>
			{/* 명소에서 온 경우 배너 표시 */}
			{spotName && (
				<div style={styles.spotBanner}>
					<span style={{ fontSize: "18px" }}>📍</span>
					<span style={{ color: "#a5b4fc", fontWeight: 600 }}>
						{spotName}
					</span>
					<span style={{ color: "#94a3b8", fontSize: "14px" }}>
						의 관측 조건을 확인하세요
					</span>
				</div>
			)}

			{/* 탭 바 */}
			<div style={styles.tabBar}>
				<button
					style={{
						...styles.tab,
						backgroundColor: activeTab === "forecast" ? "#2563eb" : "rgba(255,255,255,0.05)",
						color: activeTab === "forecast" ? "#fff" : "#94a3b8",
					}}
					onClick={() => setActiveTab("forecast")}
				>
					<span style={{ fontSize: "20px" }}>🔭</span>
					<span>예보로 확인</span>
				</button>
				<button
					style={{
						...styles.tab,
						backgroundColor: activeTab === "realtime" ? "#2563eb" : "rgba(255,255,255,0.05)",
						color: activeTab === "realtime" ? "#fff" : "#94a3b8",
					}}
					onClick={() => setActiveTab("realtime")}
				>
					<span style={{ fontSize: "20px" }}>📡</span>
					<span>실시간 확인</span>
				</button>
			</div>

			{/* 콘텐츠 영역 */}
			<div style={styles.content}>
				{activeTab === "forecast" ? (
					<ForecastTab initialLocation={initialLocation} />
				) : (
					<RealtimeTab initialLocation={initialLocation} />
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
