"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng, StationScore } from "@/types/observation";
import { getScoreColor, formatDistance, getScoreGrade } from "@/lib/realtimeApi";

// VWorld 베이스맵
const VWORLD_KEY = process.env.NEXT_PUBLIC_VWORLD_KEY || "";
const VWORLD_BASE_URL = `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png?domain=localhost`;
const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// 선택 위치 아이콘 (파란색 원)
const selectedIcon = new L.DivIcon({
	className: "selected-location-marker",
	html: `
		<div style="
			width: 20px;
			height: 20px;
			background: #3b82f6;
			border: 3px solid #fff;
			border-radius: 50%;
			box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
		"></div>
	`,
	iconSize: [20, 20],
	iconAnchor: [10, 10],
});

interface RealtimeMapProps {
	userLocation: LatLng | null;
	stationScores: StationScore[];
	onMapClick?: (latlng: LatLng) => void;
}

// 클릭 이벤트 핸들러 컴포넌트
function ClickHandler({ onMapClick }: { onMapClick?: (latlng: LatLng) => void }) {
	useMapEvents({
		click(e) {
			if (onMapClick) {
				onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
			}
		},
	});
	return null;
}

// 지도 중심 업데이트 컴포넌트
function MapCenterUpdater({ center }: { center: LatLng | null }) {
	const map = useMap();
	const prevCenter = useRef<LatLng | null>(null);

	useEffect(() => {
		if (center && (!prevCenter.current || 
			prevCenter.current.lat !== center.lat || 
			prevCenter.current.lng !== center.lng)) {
			map.setView([center.lat, center.lng], 10);
			prevCenter.current = center;
		}
	}, [center, map]);

	return null;
}

export default function RealtimeMap({ userLocation, stationScores, onMapClick }: RealtimeMapProps) {
	return (
		<MapContainer
			center={[36.5, 127.5]}
			zoom={7}
			style={{ width: "100%", height: "100%", background: "#1a1a2e" }}
			maxZoom={18}
		>
			{/* 베이스맵 */}
			{VWORLD_KEY ? (
				<TileLayer
					url={VWORLD_BASE_URL}
					attribution='&copy; <a href="https://www.vworld.kr/">VWorld</a>'
				/>
			) : (
				<TileLayer
					url={OSM_URL}
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
				/>
			)}

			{/* 클릭 핸들러 */}
			<ClickHandler onMapClick={onMapClick} />

			{/* 지도 중심 업데이트 */}
			<MapCenterUpdater center={userLocation} />

			{/* 선택된 위치 표시 */}
			{userLocation && (
				<>
					{/* 선택 위치 범위 원 */}
					<Circle
						center={[userLocation.lat, userLocation.lng]}
						radius={500}
						pathOptions={{
							color: "#3b82f6",
							fillColor: "#3b82f6",
							fillOpacity: 0.1,
							weight: 1,
						}}
					/>
					{/* 선택 위치 마커 */}
					<Marker position={[userLocation.lat, userLocation.lng]} icon={selectedIcon}>
						<Popup>
							<div style={{ fontSize: "12px" }}>
								<strong>📍 선택한 위치</strong><br />
								{userLocation.lat.toFixed(5)}°, {userLocation.lng.toFixed(5)}°
							</div>
						</Popup>
					</Marker>
				</>
			)}

			{/* 관측소 마커들 */}
			{stationScores.map((item) => (
				<CircleMarker
					key={item.station.id}
					center={[item.station.location.lat, item.station.location.lng]}
					radius={Math.max(12, item.combinedScore / 5)}
					pathOptions={{
						color: getScoreColor(item.combinedScore),
						fillColor: getScoreColor(item.combinedScore),
						fillOpacity: 0.7,
						weight: 2,
					}}
				>
					<Popup>
						<div style={{ fontSize: "12px", minWidth: "150px" }}>
							<div style={{ fontWeight: 600, marginBottom: "8px" }}>
								🏢 {item.station.name} ({item.station.region})
							</div>
							<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
								<span>종합 점수:</span>
								<strong style={{ color: getScoreColor(item.combinedScore) }}>
									{item.combinedScore}점
								</strong>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
								<span>구름:</span>
								<span style={{ color: getScoreColor(item.cloudScore) }}>
									{item.cloudScore}점 ({getScoreGrade(item.cloudScore)})
								</span>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
								<span>투명도:</span>
								<span style={{ color: getScoreColor(item.transparencyScore) }}>
									{item.transparencyScore}점 ({getScoreGrade(item.transparencyScore)})
								</span>
							</div>
							<div style={{ borderTop: "1px solid #eee", paddingTop: "8px", marginTop: "8px", color: "#666" }}>
								거리: {formatDistance(item.distance)}
							</div>
						</div>
					</Popup>
				</CircleMarker>
			))}
		</MapContainer>
	);
}
