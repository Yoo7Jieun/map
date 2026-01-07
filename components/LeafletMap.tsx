"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { calculateCelestialInfo, type CelestialInfo } from "@/lib/astronomy";
import { latLngToGrid } from "@/lib/coordConvert";
import ControlPanel from "./ControlPanel";
import InfoPanel from "./InfoPanel";

// 마커 아이콘 설정 (Leaflet 기본 아이콘 문제 해결)
const markerIcon = new L.Icon({
	iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
	iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
	shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
});

interface SelectedLocation {
	lat: number;
	lng: number;
	placeName?: string;
}

interface WeatherInfo {
	sky: number; // 1:맑음, 3:구름많음, 4:흐림
	temperature: number;
	humidity: number;
}

// NASA GIBS 광공해 타일 레이어 (최대 줌 레벨 8)
const NASA_VIIRS_URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png";

// OpenStreetMap 베이스맵
const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// VWorld 베이스맵 - 한국어 라벨 (domain 파라미터 추가)
const VWORLD_KEY = process.env.NEXT_PUBLIC_VWORLD_KEY || "";
const VWORLD_BASE_URL = `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png?domain=localhost`;

function LocationMarker({ onLocationSelect }: { onLocationSelect: (loc: SelectedLocation) => void }) {
	const [position, setPosition] = useState<L.LatLng | null>(null);

	useMapEvents({
		click(e) {
			setPosition(e.latlng);
			onLocationSelect({
				lat: e.latlng.lat,
				lng: e.latlng.lng,
			});
		},
	});

	return position ? (
		<Marker position={position} icon={markerIcon}>
			<Popup>
				<div className="text-sm">
					<p>위도: {position.lat.toFixed(5)}</p>
					<p>경도: {position.lng.toFixed(5)}</p>
				</div>
			</Popup>
		</Marker>
	) : null;
}

export default function LeafletMap() {
	const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
	const [celestialInfo, setCelestialInfo] = useState<CelestialInfo | null>(null);
	const [weather, setWeather] = useState<WeatherInfo | null>(null);
	const [loading, setLoading] = useState(false);
	const [showLightPollution, setShowLightPollution] = useState(false); // 기본 OFF

	// 디버깅용
	useEffect(() => {
		console.log("[DEBUG] VWorld Key:", VWORLD_KEY || "없음");
		console.log("[DEBUG] VWorld URL:", VWORLD_BASE_URL);
	}, []);

	// 위치 선택 핸들러
	const handleLocationSelect = useCallback(async (loc: SelectedLocation) => {
		setSelectedLocation(loc);
		setLoading(true);

		// 천문 정보 계산 (클라이언트)
		const astro = calculateCelestialInfo(loc.lat, loc.lng);
		setCelestialInfo(astro);

		// 기상 정보 가져오기 (서버)
		try {
			const grid = latLngToGrid(loc.lat, loc.lng);
			const res = await fetch(`/api/weather?nx=${grid.nx}&ny=${grid.ny}`);
			if (res.ok) {
				const data = await res.json();
				setWeather(data);
			}
		} catch (err) {
			console.error("날씨 정보 조회 실패:", err);
		}

		setLoading(false);
	}, []);

	// 카카오맵 길찾기 열기
	const openKakaoNavigation = () => {
		if (!selectedLocation) return;
		const { lat, lng } = selectedLocation;
		const name = encodeURIComponent("선택한 위치");

		// 모바일 앱 체크
		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

		if (isMobile) {
			// 카카오맵 앱으로 연결 시도
			window.location.href = `kakaomap://route?ep=${lat},${lng}&by=CAR`;
			// 앱이 없으면 웹으로 폴백
			setTimeout(() => {
				window.open(`https://map.kakao.com/link/to/${name},${lat},${lng}`, "_blank");
			}, 500);
		} else {
			window.open(`https://map.kakao.com/link/to/${name},${lat},${lng}`, "_blank");
		}
	};

	return (
		<div className="relative w-full h-screen">
			<MapContainer center={[36.5, 127.5]} zoom={7} className="w-full h-full z-0" style={{ background: "#1a1a2e" }} maxZoom={18}>
				{/* VWorld 베이스맵 (한국어 라벨) */}
				<TileLayer url={VWORLD_BASE_URL} attribution='&copy; <a href="https://www.vworld.kr/">VWorld</a>' />

				{/* NASA 광공해 오버레이 */}
				{showLightPollution && <TileLayer url={NASA_VIIRS_URL} opacity={0.6} maxNativeZoom={8} maxZoom={18} attribution='&copy; <a href="https://earthdata.nasa.gov/">NASA</a>' />}

				<LocationMarker onLocationSelect={handleLocationSelect} />
			</MapContainer>

			{/* 컨트롤 패널 */}
			<ControlPanel showLightPollution={showLightPollution} onToggleLightPollution={() => setShowLightPollution(!showLightPollution)} />

			{/* 정보 패널 */}
			<InfoPanel selectedLocation={selectedLocation} celestialInfo={celestialInfo} weather={weather} loading={loading} onNavigate={openKakaoNavigation} />
		</div>
	);
}
