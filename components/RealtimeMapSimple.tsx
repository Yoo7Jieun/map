"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "@/types/observation";
import "leaflet/dist/leaflet.css";

// VWorld / OSM 베이스맵 URL
const VWORLD_KEY = process.env.NEXT_PUBLIC_VWORLD_KEY || "";
const VWORLD_BASE_URL = `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png?domain=localhost`;
const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// 선택 위치 마커 아이콘
const selectedIcon = new L.Icon({
	iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
	iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
	shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
});

interface RealtimeMapSimpleProps {
	selectedLocation: LatLng | null;
	onMapClick: (latlng: LatLng) => void;
}

// 지도 클릭 이벤트 핸들러 컴포넌트
function MapClickHandler({ onMapClick }: { onMapClick: (latlng: LatLng) => void }) {
	useMapEvents({
		click: (e) => {
			onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
		},
	});
	return null;
}

// 선택 위치로 지도 이동 컴포넌트
function FlyToLocation({ location }: { location: LatLng | null }) {
	const map = useMap();

	useEffect(() => {
		if (location) {
			map.flyTo([location.lat, location.lng], 10, { duration: 1 });
		}
	}, [location, map]);

	return null;
}

export default function RealtimeMapSimple({ selectedLocation, onMapClick }: RealtimeMapSimpleProps) {
	// 한국 중심 좌표
	const defaultCenter: [number, number] = [36.5, 127.5];
	const defaultZoom = 7;

	return (
		<MapContainer
			center={defaultCenter}
			zoom={defaultZoom}
			style={{ width: "100%", height: "100%", background: "#1a1a2e" }}
			zoomControl={true}
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

			{/* 지도 클릭 이벤트 */}
			<MapClickHandler onMapClick={onMapClick} />

			{/* 선택 위치로 이동 */}
			<FlyToLocation location={selectedLocation} />

			{/* 선택 위치 마커 */}
			{selectedLocation && (
				<Marker
					position={[selectedLocation.lat, selectedLocation.lng]}
					icon={selectedIcon}
				>
					<Popup>
						<div style={{ textAlign: "center", padding: "4px" }}>
							<div style={{ fontWeight: 700, marginBottom: "4px" }}>📍 선택한 위치</div>
							<div style={{ fontSize: "12px", color: "#666" }}>
								{selectedLocation.lat.toFixed(5)}°, {selectedLocation.lng.toFixed(5)}°
							</div>
						</div>
					</Popup>
				</Marker>
			)}
		</MapContainer>
	);
}
