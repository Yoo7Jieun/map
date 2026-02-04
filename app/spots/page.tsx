"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import spotsData from "@/spots.json";
import SpotCard from "@/components/SpotCard";
import type { SpotData, RegionData } from "@/types/spots";

// 지도 컴포넌트 동적 로드
const SpotsMap = dynamic(() => import("@/components/SpotsMap"), {
	ssr: false,
	loading: () => (
		<div style={{ width: "100%", height: "100%", backgroundColor: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
			<div style={{ color: "#94a3b8", fontSize: "16px" }}>🗺️ 지도 준비 중...</div>
		</div>
	),
});

// ============ 데이터 가공 ============

// 국내 명소 평면화
const domesticSpots: SpotData[] = Object.values(spotsData.south_korea as Record<string, RegionData>)
	.flatMap((region) => region.spots);

// 해외 명소 평면화
const worldSpots: SpotData[] = Object.values(spotsData.world as Record<string, RegionData>)
	.flatMap((region) => region.spots);

// 국내 지역 목록
const domesticRegions = Object.entries(spotsData.south_korea as Record<string, RegionData>)
	.map(([key, value]) => ({ key, name: value.region_name }));

// 해외 지역 목록
const worldRegions = Object.entries(spotsData.world as Record<string, RegionData>)
	.map(([key, value]) => ({ key, name: value.region_name }));

// ============ 스타일 ============

const styles = {
	container: {
		display: "flex",
		height: "calc(100vh - 60px)",
		backgroundColor: "#0f172a",
	},
	sidebar: {
		width: "420px",
		height: "100%",
		backgroundColor: "#0f172a",
		borderRight: "1px solid rgba(255,255,255,0.1)",
		display: "flex",
		flexDirection: "column" as const,
		overflow: "hidden",
	},
	header: {
		padding: "20px",
		borderBottom: "1px solid rgba(255,255,255,0.1)",
	},
	searchBox: {
		display: "flex",
		gap: "8px",
		marginBottom: "16px",
	},
	searchInput: {
		flex: 1,
		padding: "12px 16px",
		borderRadius: "12px",
		border: "2px solid rgba(255,255,255,0.1)",
		backgroundColor: "rgba(255,255,255,0.05)",
		color: "#fff",
		fontSize: "15px",
		outline: "none",
	},
	tabs: {
		display: "flex",
		gap: "8px",
		marginBottom: "12px",
	},
	tab: {
		flex: 1,
		padding: "10px",
		borderRadius: "10px",
		border: "none",
		fontSize: "14px",
		fontWeight: 600,
		cursor: "pointer",
		transition: "all 0.2s",
	},
	filters: {
		display: "flex",
		gap: "8px",
		flexWrap: "wrap" as const,
	},
	filterChip: {
		padding: "6px 12px",
		borderRadius: "20px",
		border: "none",
		fontSize: "12px",
		fontWeight: 500,
		cursor: "pointer",
		transition: "all 0.2s",
	},
	listContainer: {
		flex: 1,
		overflowY: "auto" as const,
		padding: "16px",
	},
	mapContainer: {
		flex: 1,
		height: "100%",
	},
	count: {
		fontSize: "13px",
		color: "#64748b",
		marginBottom: "12px",
	},
	emptyState: {
		textAlign: "center" as const,
		padding: "40px 20px",
		color: "#64748b",
	},
};

// ============ 컴포넌트 ============

export default function SpotsPage() {
	const [activeTab, setActiveTab] = useState<"domestic" | "world">("domestic");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
	const [selectedSpot, setSelectedSpot] = useState<SpotData | null>(null);

	// 현재 탭의 데이터
	const currentSpots = activeTab === "domestic" ? domesticSpots : worldSpots;
	const currentRegions = activeTab === "domestic" ? domesticRegions : worldRegions;

	// 검색 및 필터링
	const filteredSpots = useMemo(() => {
		let result = currentSpots;

		// 지역 필터
		if (selectedRegion) {
			const regionData = activeTab === "domestic"
				? (spotsData.south_korea as Record<string, RegionData>)[selectedRegion]
				: (spotsData.world as Record<string, RegionData>)[selectedRegion];
			
			if (regionData) {
				result = regionData.spots;
			}
		}

		// 검색 필터
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter((spot) =>
				spot.name.toLowerCase().includes(query) ||
				spot.name_en.toLowerCase().includes(query) ||
				(spot.full_address && spot.full_address.toLowerCase().includes(query)) ||
				(spot.province && spot.province.toLowerCase().includes(query)) ||
				(spot.city && spot.city.toLowerCase().includes(query)) ||
				(spot.country && spot.country.toLowerCase().includes(query)) ||
				(spot.region && spot.region.toLowerCase().includes(query)) ||
				spot.features.some((f) => f.toLowerCase().includes(query))
			);
		}

		return result;
	}, [activeTab, currentSpots, selectedRegion, searchQuery]);

	// 탭 변경 시 초기화
	const handleTabChange = useCallback((tab: "domestic" | "world") => {
		setActiveTab(tab);
		setSelectedRegion(null);
		setSelectedSpot(null);
	}, []);

	// 명소 선택
	const handleSpotClick = useCallback((spot: SpotData) => {
		setSelectedSpot(spot);
	}, []);

	// 지도에서 명소 선택
	const handleMapSpotSelect = useCallback((spotId: string) => {
		const spot = filteredSpots.find((s) => s.id === spotId);
		if (spot) {
			setSelectedSpot(spot);
		}
	}, [filteredSpots]);

	return (
		<div style={styles.container}>
			{/* 사이드바 */}
			<div style={styles.sidebar}>
				{/* 헤더 */}
				<div style={styles.header}>
					<h1 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", marginBottom: "16px" }}>
						🌌 은하수 관측 명소
					</h1>
					
					{/* 검색 */}
					<div style={styles.searchBox}>
						<input
							type="text"
							placeholder="명소, 지역, 특징 검색..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							style={styles.searchInput}
						/>
					</div>
					
					{/* 탭 */}
					<div style={styles.tabs}>
						<button
							style={{
								...styles.tab,
								backgroundColor: activeTab === "domestic" ? "#2563eb" : "rgba(255,255,255,0.1)",
								color: activeTab === "domestic" ? "#fff" : "#94a3b8",
							}}
							onClick={() => handleTabChange("domestic")}
						>
							🇰🇷 국내 ({domesticSpots.length})
						</button>
						<button
							style={{
								...styles.tab,
								backgroundColor: activeTab === "world" ? "#2563eb" : "rgba(255,255,255,0.1)",
								color: activeTab === "world" ? "#fff" : "#94a3b8",
							}}
							onClick={() => handleTabChange("world")}
						>
							🌍 해외 ({worldSpots.length})
						</button>
					</div>
					
					{/* 지역 필터 */}
					<div style={styles.filters}>
						<button
							style={{
								...styles.filterChip,
								backgroundColor: selectedRegion === null ? "#3b82f6" : "rgba(255,255,255,0.1)",
								color: selectedRegion === null ? "#fff" : "#94a3b8",
							}}
							onClick={() => setSelectedRegion(null)}
						>
							전체
						</button>
						{currentRegions.map((region) => (
							<button
								key={region.key}
								style={{
									...styles.filterChip,
									backgroundColor: selectedRegion === region.key ? "#3b82f6" : "rgba(255,255,255,0.1)",
									color: selectedRegion === region.key ? "#fff" : "#94a3b8",
								}}
								onClick={() => setSelectedRegion(region.key)}
							>
								{region.name}
							</button>
						))}
					</div>
				</div>
				
				{/* 명소 리스트 */}
				<div style={styles.listContainer}>
					<div style={styles.count}>
						{filteredSpots.length}개 명소
						{searchQuery && ` · "${searchQuery}" 검색 결과`}
					</div>
					
					{filteredSpots.length === 0 ? (
						<div style={styles.emptyState}>
							<div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
							<div style={{ fontSize: "16px" }}>검색 결과가 없습니다</div>
						</div>
					) : (
						filteredSpots.map((spot) => (
							<SpotCard
								key={spot.id}
								spot={spot}
								isSelected={selectedSpot?.id === spot.id}
								onClick={() => handleSpotClick(spot)}
							/>
						))
					)}
				</div>
			</div>
			
			{/* 지도 */}
			<div style={styles.mapContainer}>
				<SpotsMap
					spots={filteredSpots}
					selectedSpot={selectedSpot}
					onSpotSelect={handleMapSpotSelect}
					isDomestic={activeTab === "domestic"}
				/>
			</div>
		</div>
	);
}
