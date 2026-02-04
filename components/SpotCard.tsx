"use client";

import MapNavigationButtons from "./MapNavigationButtons";
import type { SpotData } from "@/types/spots";

// ============ 타입 ============

interface SpotCardProps {
	spot: SpotData;
	isSelected: boolean;
	onClick: () => void;
}

// ============ 스타일 ============

const styles = {
	card: {
		backgroundColor: "rgba(51, 65, 85, 0.4)",
		borderRadius: "16px",
		padding: "16px",
		marginBottom: "12px",
		cursor: "pointer",
		transition: "all 0.2s",
		border: "2px solid transparent",
	},
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: "8px",
	},
	name: {
		fontSize: "16px",
		fontWeight: 700,
		color: "#fff",
		margin: 0,
	},
	countryBadge: {
		padding: "4px 8px",
		backgroundColor: "rgba(59, 130, 246, 0.2)",
		borderRadius: "6px",
		fontSize: "11px",
		color: "#60a5fa",
	},
	location: {
		fontSize: "12px",
		color: "#94a3b8",
		marginBottom: "10px",
	},
	featuresContainer: {
		display: "flex",
		flexWrap: "wrap" as const,
		gap: "6px",
		marginBottom: "10px",
	},
	featureTag: {
		padding: "3px 8px",
		backgroundColor: "rgba(34, 197, 94, 0.15)",
		borderRadius: "6px",
		fontSize: "11px",
		color: "#4ade80",
	},
	moreTag: {
		padding: "3px 8px",
		backgroundColor: "rgba(255,255,255,0.1)",
		borderRadius: "6px",
		fontSize: "11px",
		color: "#94a3b8",
	},
	season: {
		fontSize: "12px",
		color: "#64748b",
		marginBottom: "12px",
	},
};

// ============ 컴포넌트 ============

export default function SpotCard({ spot, isSelected, onClick }: SpotCardProps) {
	const location = spot.full_address || spot.region || "";

	return (
		<div
			style={{
				...styles.card,
				borderColor: isSelected ? "#3b82f6" : "transparent",
				backgroundColor: isSelected
					? "rgba(59, 130, 246, 0.15)"
					: "rgba(51, 65, 85, 0.4)",
			}}
			onClick={onClick}
		>
			{/* 헤더 */}
			<div style={styles.header}>
				<h3 style={styles.name}>{spot.name}</h3>
				{spot.country && (
					<span style={styles.countryBadge}>{spot.country}</span>
				)}
			</div>

			{/* 위치 */}
			<div style={styles.location}>📍 {location}</div>

			{/* 특징 태그 */}
			<div style={styles.featuresContainer}>
				{spot.features.slice(0, 3).map((feature, idx) => (
					<span key={idx} style={styles.featureTag}>
						{feature}
					</span>
				))}
				{spot.features.length > 3 && (
					<span style={styles.moreTag}>+{spot.features.length - 3}</span>
				)}
			</div>

			{/* 추천 시기 */}
			<div style={styles.season}>🗓️ 추천: {spot.best_season}</div>

			{/* 길찾기 버튼 */}
			<MapNavigationButtons
				name={spot.name}
				latitude={spot.latitude}
				longitude={spot.longitude}
				address={spot.full_address}
				size="medium"
				isDomestic={!spot.country}
				showMapLink={true}
			/>
		</div>
	);
}
