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
	cloudCoverPct?: number; // 위성 데이터 기반 구름량
	dewPoint?: number; // 이슬점
	absoluteHumidity?: number; // 수증기량 (g/m³)
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

	// 구름량 추정 함수 (하늘 상태 기반)
	const getCloudAmount = (sky: number): number => {
		switch (sky) {
			case 1: return 20;
			case 3: return 60;
			case 4: return 90;
			default: return 50;
		}
	};

	// 초기 로드 시 지도 중심 위치의 정보 자동 로드
	useEffect(() => {
		const loadInitialLocation = async () => {
			const initialLocation: SelectedLocation = { lat: 36.5, lng: 127.5 };
			setSelectedLocation(initialLocation);
			setLoading(true);

			// 천문 정보 계산 (클라이언트) - 항상 먼저 계산
			console.log("[LeafletMap] 천문 정보 계산 시작:", { lat: initialLocation.lat, lng: initialLocation.lng });
			const astro = calculateCelestialInfo(initialLocation.lat, initialLocation.lng);
			console.log("[LeafletMap] 천문 정보 계산 완료:", astro);
			setCelestialInfo(astro); // 천문 정보는 즉시 설정

			// 기상 정보 가져오기 (서버)
			try {
				const grid = latLngToGrid(initialLocation.lat, initialLocation.lng);
				console.log("[LeafletMap] 날씨 API 호출:", { nx: grid.nx, ny: grid.ny });
				const res = await fetch(`/api/weather?nx=${grid.nx}&ny=${grid.ny}`);
				console.log("[LeafletMap] 날씨 API 응답:", res.status, res.ok);
				if (res.ok) {
					const data = await res.json();
					console.log("[LeafletMap] 날씨 데이터:", data);
					
					// 구름 격자 데이터 가져오기
					let cloudCoverPct: number | undefined;
					try {
						const cloudRes = await fetch("/api/satellite/cloud-grid");
						if (cloudRes.ok) {
							const cloudGrid = await cloudRes.json();
							const { getCloudCoverFromGrid } = await import("@/lib/weatherUtils");
							cloudCoverPct = getCloudCoverFromGrid(initialLocation.lat, initialLocation.lng, cloudGrid) ?? undefined;
						}
					} catch (err) {
						console.warn("구름 격자 데이터 조회 실패:", err);
					}
					
					// 수증기량 계산
					const { calculateDewPoint, calculateAbsoluteHumidity, estimateLightPollution, calculateObservationScore } = await import("@/lib/weatherUtils");
					const dewPoint = calculateDewPoint(data.temperature, data.humidity);
					const absoluteHumidity = calculateAbsoluteHumidity(data.temperature, data.humidity);
					
					// 빛공해 등급
					const lightPollution = estimateLightPollution(initialLocation.lat, initialLocation.lng);
					
					// 관측 적합도 계산 (빛공해, 구름, 수증기량만 고려)
					const observationScore = calculateObservationScore(
						initialLocation.lat,
						initialLocation.lng,
						lightPollution.level,
						cloudCoverPct ?? getCloudAmount(data.sky),
						absoluteHumidity
					);
					
					// 천문 정보에 관측 적합도 점수 업데이트
					astro.observationScore = observationScore.score;
					astro.isGoodForObservation = observationScore.isGood;
					
					setWeather({
						...data,
						cloudCoverPct,
						dewPoint,
						absoluteHumidity,
					});
					
					// 업데이트된 천문 정보 다시 설정
					setCelestialInfo(astro);
				} else {
					const errorData = await res.json().catch(() => ({}));
					console.warn("[LeafletMap] 날씨 API 응답 오류:", res.status, errorData);
					// API 실패 시 기본 날씨 데이터 사용
					await setDefaultWeather(initialLocation.lat, initialLocation.lng, astro);
				}
			} catch (err) {
				console.error("[LeafletMap] 날씨 정보 조회 실패:", err);
				// API 실패 시 기본 날씨 데이터 사용
				await setDefaultWeather(initialLocation.lat, initialLocation.lng, astro);
			}

			setLoading(false);
		};
		
		// API 실패 시 기본 날씨 데이터 설정
		const setDefaultWeather = async (lat: number, lng: number, astro: CelestialInfo) => {
			const { calculateDewPoint, calculateAbsoluteHumidity, estimateLightPollution, calculateObservationScore } = await import("@/lib/weatherUtils");
			
			// 기본값 (맑음, 15도, 60% 습도)
			const defaultSky = 1;
			const defaultTemp = 15;
			const defaultHumidity = 60;
			
			const dewPoint = calculateDewPoint(defaultTemp, defaultHumidity);
			const absoluteHumidity = calculateAbsoluteHumidity(defaultTemp, defaultHumidity);
			const lightPollution = estimateLightPollution(lat, lng);
			const observationScore = calculateObservationScore(
				lat, lng,
				lightPollution.level,
				getCloudAmount(defaultSky),
				absoluteHumidity
			);
			
			astro.observationScore = observationScore.score;
			astro.isGoodForObservation = observationScore.isGood;
			
			setWeather({
				sky: defaultSky,
				temperature: defaultTemp,
				humidity: defaultHumidity,
				cloudCoverPct: undefined,
				dewPoint,
				absoluteHumidity,
			});
			setCelestialInfo(astro);
		};

		loadInitialLocation();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// 위치 선택 핸들러
	const handleLocationSelect = useCallback(async (loc: SelectedLocation) => {
		setSelectedLocation(loc);
		setLoading(true);

		// 천문 정보 계산 (클라이언트) - 항상 먼저 계산
		console.log("[LeafletMap] 천문 정보 계산 시작:", { lat: loc.lat, lng: loc.lng });
		const astro = calculateCelestialInfo(loc.lat, loc.lng);
		console.log("[LeafletMap] 천문 정보 계산 완료:", astro);
		setCelestialInfo(astro); // 천문 정보는 즉시 설정
		
		// 기상 정보 가져오기 (서버)
		try {
			const grid = latLngToGrid(loc.lat, loc.lng);
			console.log("[LeafletMap] 날씨 API 호출:", { nx: grid.nx, ny: grid.ny });
			const res = await fetch(`/api/weather?nx=${grid.nx}&ny=${grid.ny}`);
			console.log("[LeafletMap] 날씨 API 응답:", res.status, res.ok);
			if (res.ok) {
				const data = await res.json();
				console.log("[LeafletMap] 날씨 데이터:", data);
				
				// 구름 격자 데이터 가져오기
				let cloudCoverPct: number | undefined;
				try {
					const cloudRes = await fetch("/api/satellite/cloud-grid");
					if (cloudRes.ok) {
						const cloudGrid = await cloudRes.json();
						const { getCloudCoverFromGrid } = await import("@/lib/weatherUtils");
						cloudCoverPct = getCloudCoverFromGrid(loc.lat, loc.lng, cloudGrid) ?? undefined;
					}
				} catch (err) {
					console.warn("구름 격자 데이터 조회 실패:", err);
				}
				
				// 수증기량 계산
				const { calculateDewPoint, calculateAbsoluteHumidity, estimateLightPollution, calculateObservationScore } = await import("@/lib/weatherUtils");
				const dewPoint = calculateDewPoint(data.temperature, data.humidity);
				const absoluteHumidity = calculateAbsoluteHumidity(data.temperature, data.humidity);
				
				// 빛공해 등급
				const lightPollution = estimateLightPollution(loc.lat, loc.lng);
				
				// 관측 적합도 계산 (빛공해, 구름, 수증기량만 고려)
				const observationScore = calculateObservationScore(
					loc.lat,
					loc.lng,
					lightPollution.level,
					cloudCoverPct ?? getCloudAmount(data.sky),
					absoluteHumidity
				);
				
				// 천문 정보에 관측 적합도 점수 업데이트
				astro.observationScore = observationScore.score;
				astro.isGoodForObservation = observationScore.isGood;
				
				setWeather({
					...data,
					cloudCoverPct,
					dewPoint,
					absoluteHumidity,
				});
				
				// 업데이트된 천문 정보 다시 설정
				setCelestialInfo(astro);
			} else {
				const errorData = await res.json().catch(() => ({}));
				console.warn("[LeafletMap] 날씨 API 응답 오류:", res.status, errorData);
				// API 실패 시 기본 날씨 데이터 사용
				await setDefaultWeatherForLocation(loc.lat, loc.lng, astro);
			}
		} catch (err) {
			console.error("[LeafletMap] 날씨 정보 조회 실패:", err);
			// API 실패 시 기본 날씨 데이터 사용
			await setDefaultWeatherForLocation(loc.lat, loc.lng, astro);
		}

		setLoading(false);
	}, []);
	
	// API 실패 시 기본 날씨 데이터 설정 (위치 선택 시)
	const setDefaultWeatherForLocation = async (lat: number, lng: number, astro: CelestialInfo) => {
		const { calculateDewPoint, calculateAbsoluteHumidity, estimateLightPollution, calculateObservationScore } = await import("@/lib/weatherUtils");
		
		// 기본값 (맑음, 15도, 60% 습도)
		const defaultSky = 1;
		const defaultTemp = 15;
		const defaultHumidity = 60;
		
		const dewPoint = calculateDewPoint(defaultTemp, defaultHumidity);
		const absoluteHumidity = calculateAbsoluteHumidity(defaultTemp, defaultHumidity);
		const lightPollution = estimateLightPollution(lat, lng);
		const observationScore = calculateObservationScore(
			lat, lng,
			lightPollution.level,
			getCloudAmount(defaultSky),
			absoluteHumidity
		);
		
		astro.observationScore = observationScore.score;
		astro.isGoodForObservation = observationScore.isGood;
		
		setWeather({
			sky: defaultSky,
			temperature: defaultTemp,
			humidity: defaultHumidity,
			cloudCoverPct: undefined,
			dewPoint,
			absoluteHumidity,
		});
		setCelestialInfo(astro);
	};

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
