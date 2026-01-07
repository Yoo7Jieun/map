"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { WeatherSnapshot } from "../types/weather";
import CloudHeatmapOverlay from "./CloudHeatmapOverlay";

type Place = { id: number | string; name: string; lat: number; lng: number; category?: string };

const loadKakao = (key: string) => {
	return new Promise<any>((resolve, reject) => {
		if (typeof window === "undefined") return reject(new Error("window undefined"));
		if (window.kakao && window.kakao.maps) return resolve(window.kakao);

		const existing = document.querySelector("script[data-kakao-sdk]");
		if (existing) {
			existing.addEventListener("load", () => {
				window.kakao.maps.load(() => resolve(window.kakao));
			});
			return;
		}

		if (!key) {
			console.warn("NEXT_PUBLIC_KAKAO_KEY is not set. Kakao Maps will not load.");
			return reject(new Error("Missing Kakao key"));
		}

		const script = document.createElement("script");
		script.setAttribute("data-kakao-sdk", "1");
		script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services,clusterer`;
		script.async = true;
		script.onload = () => {
			window.kakao.maps.load(() => resolve(window.kakao));
		};
		script.onerror = (e) => {
			console.error("Kakao SDK script failed to load:", script.src, e);
			reject(e);
		};
		document.head.appendChild(script);
	});
};

export default function Map({ places = [], center = { lat: 37.1667, lng: 128.9889 } }: { places?: Place[]; center?: { lat: number; lng: number } }) {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<any>(null);
	const mapDivRef = useRef<HTMLDivElement | null>(null);
	const markersRef = useRef<any[]>([]);
	// const polygonRef = useRef<any>(null);
	// const outsideMsgRef = useRef<HTMLDivElement | null>(null);
	const [loaded, setLoaded] = useState(false);
	const [searchKeyword, setSearchKeyword] = useState("");
	const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
	const [weatherError, setWeatherError] = useState<string | null>(null);
	const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(center);
	const [showCloudHeatmap, setShowCloudHeatmap] = useState(true);

	// Weather fetch 함수 (컴포넌트 레벨)
	const fetchWeather = useCallback(() => {
		fetch("/api/weather/current")
			.then((r) => {
				if (r.status === 503) {
					// 데이터 로딩 중
					return Promise.reject(new Error("데이터 로딩 중..."));
				}
				if (!r.ok) {
					return Promise.reject(new Error("weather http " + r.status));
				}
				return r.json();
			})
			.then((data) => {
				setWeather(data.highRes);
				setWeatherError(null);
			})
			.catch((e) => {
				console.error("[Weather] Error:", e);
				setWeatherError(e.message);
			});
	}, []);

	useEffect(() => {
		let mounted = true;
		const key = process.env.NEXT_PUBLIC_KAKAO_KEY || "";

		loadKakao(key)
			.then((kakao) => {
				if (!mounted) return;
				if (!mapRef.current) {
					const options = {
						center: new kakao.maps.LatLng(center.lat, center.lng),
						level: 9, // 대한민국 전체가 보이도록 줌 레벨 조정
					};
					mapRef.current = new kakao.maps.Map(mapDivRef.current, options);
				}
				// 지도 중심 이동 시 mapCenter 갱신
				if (mapRef.current && window.kakao) {
					window.kakao.maps.event.addListener(mapRef.current, "center_changed", function () {
						const c = mapRef.current.getCenter();
						setMapCenter({ lat: c.getLat(), lng: c.getLng() });
					});
				}
				setLoaded(true);
			})
			.catch((err) => {
				console.error("Kakao load failed", err);
			});

		// Fetch weather snapshot initially
		fetchWeather();

		// Auto-refresh weather every 1 minute
		const weatherInterval = setInterval(fetchWeather, 60 * 1000);

		return () => {
			mounted = false;
			clearInterval(weatherInterval);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// update markers when places prop changes
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !window.kakao) return;

		// remove old markers
		markersRef.current.forEach((m) => m.setMap(null));
		markersRef.current = [];

		const infowindow = new window.kakao.maps.InfoWindow({ removable: true });

		places.forEach((p) => {
			const position = new window.kakao.maps.LatLng(p.lat, p.lng);
			const marker = new window.kakao.maps.Marker({ position });
			marker.setMap(map);
			window.kakao.maps.event.addListener(marker, "click", function () {
				infowindow.setContent(`<div style="padding:8px">${p.name}</div>`);
				infowindow.open(map, marker);
			});
			markersRef.current.push(marker);
		});

		// adjust bounds if there are places
		if (places.length > 0) {
			const bounds = new window.kakao.maps.LatLngBounds();
			places.forEach((p) => bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng)));
			map.setBounds(bounds);
		}
	}, [places]);

	// Search within current map bounds using Kakao Places service
	const searchInMap = () => {
		const map = mapRef.current;
		if (!map || !window.kakao) return;
		if (!searchKeyword || searchKeyword.trim().length === 0) return;

		const ps = new window.kakao.maps.services.Places();
		const bounds = map.getBounds();

		// clear existing markers
		markersRef.current.forEach((m) => m.setMap(null));
		markersRef.current = [];

		ps.keywordSearch(
			searchKeyword,
			(data: any, status: any) => {
				if (status === window.kakao.maps.services.Status.OK) {
					const infowindow = new window.kakao.maps.InfoWindow({ removable: true });
					const newBounds = new window.kakao.maps.LatLngBounds();

					data.forEach((d: any) => {
						const lat = parseFloat(d.y);
						const lng = parseFloat(d.x);
						const position = new window.kakao.maps.LatLng(lat, lng);
						// only include results inside current bounds
						if (bounds.contain(position)) {
							const marker = new window.kakao.maps.Marker({ position });
							marker.setMap(map);
							window.kakao.maps.event.addListener(marker, "click", function () {
								infowindow.setContent(`<div style="padding:8px">${d.place_name}</div>`);
								infowindow.open(map, marker);
							});
							markersRef.current.push(marker);
							newBounds.extend(position);
						}
					});

					if (!newBounds.isEmpty()) {
						map.setBounds(newBounds);
					}
				} else {
					console.warn("Search returned no results or error:", status);
				}
			},
			{ bounds }
		);
	};

	return (
		<div ref={wrapperRef} style={{ position: "relative", width: "100%", height: "100%" }}>
			<div ref={mapDivRef} style={{ width: "100%", height: "100%", background: loaded ? undefined : "#f0f0f0" }} />

			{/* Map center coordinates */}
			<div style={{ position: "absolute", left: 12, bottom: 12, zIndex: 1000 }}>
				<div style={{ background: "rgba(0,0,0,0.7)", color: "white", padding: "6px 10px", borderRadius: 4, fontSize: 13, fontFamily: "monospace" }}>
					<div>위도: {mapCenter.lat.toFixed(6)}</div>
					<div>경도: {mapCenter.lng.toFixed(6)}</div>
				</div>
			</div>

			{/* 기상 정보 패널 */}
			<div style={{ position: "absolute", left: 12, top: 12, zIndex: 1000, maxWidth: 280 }}>
				{/* 은하수 관측 정보 */}
				<div style={{ background: "rgba(15, 23, 42, 0.95)", padding: 16, borderRadius: 12, fontSize: 13, color: "#e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
						<span style={{ fontSize: 16, fontWeight: 700 }}>🌌 은하수 관측</span>
						<button onClick={() => fetchWeather()} style={{ padding: "4px 8px", borderRadius: 4, border: "none", background: "rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>
							새로고침
						</button>
					</div>

					{!weather && !weatherError && <div style={{ color: "#94a3b8" }}>데이터 로딩 중...</div>}
					{weatherError && <div style={{ color: "#f87171" }}>⚠️ {weatherError}</div>}

					{weather && (
						<>
							{/* 달 정보 */}
							<div style={{ background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 8, marginBottom: 12 }}>
								<div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>🌙 달 상태</div>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<div>
										<div style={{ fontSize: 20, fontWeight: 700 }}>
											{weather.moonPhaseName === "New Moon" ? "🌑" : weather.moonPhaseName === "Full Moon" ? "🌕" : weather.moonPhaseName?.includes("Waxing") ? "🌒" : "🌘"}
											<span style={{ marginLeft: 8 }}>{weather.moonIlluminationPct ?? 0}%</span>
										</div>
										<div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{weather.moonPhaseName ?? "—"}</div>
									</div>
									<div style={{ textAlign: "right" }}>
										<div style={{ fontSize: 14, fontWeight: 600, color: weather.moonAltitudeDeg && weather.moonAltitudeDeg < 0 ? "#4ade80" : "#fbbf24" }}>{weather.moonAltitudeDeg ? `${weather.moonAltitudeDeg.toFixed(1)}°` : "—"}</div>
										<div style={{ fontSize: 11, color: "#94a3b8" }}>{weather.moonAltitudeDeg && weather.moonAltitudeDeg < 0 ? "지평선 아래 ✓" : "지평선 위 ⚠"}</div>
									</div>
								</div>
							</div>

							{/* 기상 정보 */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
								<div style={{ background: "rgba(255,255,255,0.05)", padding: 10, borderRadius: 8 }}>
									<div style={{ fontSize: 11, color: "#94a3b8" }}>🌡️ 기온</div>
									<div style={{ fontSize: 18, fontWeight: 700 }}>{weather.temperatureC ?? "—"}°C</div>
								</div>
								<div style={{ background: "rgba(255,255,255,0.05)", padding: 10, borderRadius: 8 }}>
									<div style={{ fontSize: 11, color: "#94a3b8" }}>💧 습도</div>
									<div style={{ fontSize: 18, fontWeight: 700, color: weather.humidityPct > 70 ? "#fbbf24" : "#4ade80" }}>{weather.humidityPct ?? "—"}%</div>
								</div>
								<div style={{ background: "rgba(255,255,255,0.05)", padding: 10, borderRadius: 8 }}>
									<div style={{ fontSize: 11, color: "#94a3b8" }}>💨 바람</div>
									<div style={{ fontSize: 18, fontWeight: 700 }}>
										{weather.windSpeedMs?.toFixed(1) ?? "—"}
										<span style={{ fontSize: 12, fontWeight: 400 }}> m/s</span>
									</div>
								</div>
								<div style={{ background: "rgba(255,255,255,0.05)", padding: 10, borderRadius: 8 }}>
									<div style={{ fontSize: 11, color: "#94a3b8" }}>🌧️ 강수</div>
									<div style={{ fontSize: 18, fontWeight: 700 }}>
										{weather.precipitationMm1h ?? 0}
										<span style={{ fontSize: 12, fontWeight: 400 }}> mm</span>
									</div>
								</div>
							</div>

							{/* 업데이트 시간 */}
							<div style={{ fontSize: 10, color: "#64748b", marginTop: 10, textAlign: "right" }}>{weather.timestamp ? new Date(weather.timestamp * 1000).toLocaleString("ko-KR") : ""}</div>
						</>
					)}
				</div>

				{/* 검색 (접힌 상태) */}
				<details style={{ marginTop: 8 }}>
					<summary style={{ background: "rgba(15, 23, 42, 0.9)", color: "#94a3b8", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>🔍 장소 검색</summary>
					<div style={{ background: "rgba(15, 23, 42, 0.95)", padding: 8, borderRadius: "0 0 8px 8px", display: "flex", gap: 6 }}>
						<input
							value={searchKeyword}
							onChange={(e) => setSearchKeyword(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && searchInMap()}
							placeholder="검색어 입력..."
							style={{ flex: 1, padding: 8, borderRadius: 4, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 13 }}
						/>
						<button onClick={searchInMap} style={{ padding: "8px 12px", borderRadius: 4, border: "none", background: "#3b82f6", color: "#fff", fontSize: 12, cursor: "pointer" }}>
							검색
						</button>
					</div>
				</details>
			</div>

			{/* 구름 히트맵 토글 */}
			<div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 1100 }}>
				<button
					onClick={() => setShowCloudHeatmap((prev) => !prev)}
					style={{
						padding: "10px 16px",
						background: showCloudHeatmap ? "rgba(59, 130, 246, 0.9)" : "rgba(30, 41, 59, 0.9)",
						color: "#fff",
						border: "none",
						borderRadius: 8,
						cursor: "pointer",
						fontSize: 13,
						fontWeight: 600,
						boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
						display: "flex",
						alignItems: "center",
						gap: 6,
					}}
				>
					☁️ 구름 히트맵 {showCloudHeatmap ? "ON" : "OFF"}
				</button>
			</div>

			{/* Cloud Heatmap Overlay (기상 표준 팔레트 적용) */}
			{/* 구름 히트맵: 지도 전체(뷰포트 기준)에 항상 표시 */}
			<CloudHeatmapOverlay map={mapRef.current} enabled={showCloudHeatmap} style="meteo" />
		</div>
	);
}
