"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MapNavigationButtons from "./MapNavigationButtons";
import type { SpotData } from "@/types/spots";

// 베이스맵 URL
const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// ============ 마커 아이콘 ============

const defaultIcon = L.divIcon({
	className: "spot-marker",
	html: `
		<div style="
			width: 32px;
			height: 32px;
			background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
			border-radius: 50% 50% 50% 0;
			transform: rotate(-45deg);
			border: 3px solid #fff;
			box-shadow: 0 2px 8px rgba(0,0,0,0.3);
			display: flex;
			align-items: center;
			justify-content: center;
		">
			<span style="transform: rotate(45deg); font-size: 14px;">⭐</span>
		</div>
	`,
	iconSize: [32, 32],
	iconAnchor: [16, 32],
	popupAnchor: [0, -32],
});

const selectedIcon = L.divIcon({
	className: "spot-marker-selected",
	html: `
		<div style="
			width: 40px;
			height: 40px;
			background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
			border-radius: 50% 50% 50% 0;
			transform: rotate(-45deg);
			border: 3px solid #fff;
			box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
			display: flex;
			align-items: center;
			justify-content: center;
			animation: bounce 0.5s ease;
		">
			<span style="transform: rotate(45deg); font-size: 18px;">🌟</span>
		</div>
	`,
	iconSize: [40, 40],
	iconAnchor: [20, 40],
	popupAnchor: [0, -40],
});

// ============ Props 타입 ============

interface SpotsMapProps {
	spots: SpotData[];
	selectedSpot: SpotData | null;
	onSpotSelect: (spotId: string) => void;
	isDomestic: boolean;
}

// ============ 지도 컨트롤러 ============

function MapController({ 
	selectedSpot, 
	isDomestic,
	spots 
}: { 
	selectedSpot: SpotData | null;
	isDomestic: boolean;
	spots: SpotData[];
}) {
	const map = useMap();

	useEffect(() => {
		if (selectedSpot) {
			map.flyTo([selectedSpot.latitude, selectedSpot.longitude], 10, { duration: 1 });
		}
	}, [selectedSpot, map]);

	useEffect(() => {
		if (spots.length === 0) return;

		if (isDomestic) {
			map.setView([36.5, 127.8], 7);
		} else {
			map.setView([20, 0], 2);
		}
	}, [isDomestic, map, spots.length]);

	return null;
}

// ============ 팝업 콘텐츠 ============

function SpotPopupContent({ spot }: { spot: SpotData }) {
	return (
		<div style={{ minWidth: "220px", padding: "4px" }}>
			<h3 style={{ 
				fontSize: "16px", 
				fontWeight: 700, 
				margin: "0 0 4px 0",
				color: "#1e293b"
			}}>
				{spot.name}
			</h3>
			<div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
				{spot.name_en}
			</div>
			
			<div style={{ fontSize: "13px", color: "#475569", marginBottom: "8px" }}>
				📍 {spot.full_address || spot.region || spot.country}
			</div>
			
			<div style={{ 
				display: "flex", 
				flexWrap: "wrap", 
				gap: "4px", 
				marginBottom: "8px" 
			}}>
				{spot.features.slice(0, 3).map((feature, idx) => (
					<span key={idx} style={{
						padding: "2px 6px",
						backgroundColor: "#e0f2fe",
						borderRadius: "4px",
						fontSize: "10px",
						color: "#0369a1",
					}}>
						{feature}
					</span>
				))}
			</div>
			
			<div style={{ 
				fontSize: "12px", 
				color: "#059669",
				padding: "6px 8px",
				backgroundColor: "#ecfdf5",
				borderRadius: "6px",
				marginBottom: "10px",
			}}>
				🗓️ 추천: {spot.best_season}
			</div>
			
			<MapNavigationButtons
				name={spot.name}
				latitude={spot.latitude}
				longitude={spot.longitude}
				address={spot.full_address}
				size="small"
				isDomestic={!spot.country}
				showMapLink={true}
			/>
		</div>
	);
}

// ============ 메인 컴포넌트 ============

export default function SpotsMap({ spots, selectedSpot, onSpotSelect, isDomestic }: SpotsMapProps) {
	const defaultCenter: [number, number] = isDomestic ? [36.5, 127.8] : [20, 0];
	const defaultZoom = isDomestic ? 7 : 2;

	return (
		<>
			<MapContainer
				center={defaultCenter}
				zoom={defaultZoom}
				style={{ width: "100%", height: "100%", background: "#1a1a2e" }}
				maxZoom={18}
				minZoom={2}
			>
				<TileLayer
					url={OSM_URL}
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
				/>

				<MapController 
					selectedSpot={selectedSpot} 
					isDomestic={isDomestic}
					spots={spots}
				/>

				{spots.map((spot) => (
					<Marker
						key={spot.id}
						position={[spot.latitude, spot.longitude]}
						icon={selectedSpot?.id === spot.id ? selectedIcon : defaultIcon}
						eventHandlers={{
							click: () => onSpotSelect(spot.id),
						}}
					>
						<Popup>
							<SpotPopupContent spot={spot} />
						</Popup>
					</Marker>
				))}
			</MapContainer>

			<style jsx global>{`
				@keyframes bounce {
					0%, 100% { transform: rotate(-45deg) translateY(0); }
					50% { transform: rotate(-45deg) translateY(-8px); }
				}
				.spot-marker, .spot-marker-selected {
					background: transparent !important;
					border: none !important;
				}
			`}</style>
		</>
	);
}
