"use client";

import React, { useEffect, useRef, useState } from "react";
import { TAEBEAK_BOUNDARY, isPointInPolygon } from "@/data/taebaekBoundary";
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
	const polygonRef = useRef<any>(null);
	const outsideMsgRef = useRef<HTMLDivElement | null>(null);
	const [loaded, setLoaded] = useState(false);
	const [searchKeyword, setSearchKeyword] = useState("");
	const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
	const [weatherError, setWeatherError] = useState<string | null>(null);
	const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(center);
	const [showCloudHeatmap, setShowCloudHeatmap] = useState(true);

	useEffect(() => {
		let mounted = true;
		const key = process.env.NEXT_PUBLIC_KAKAO_KEY || "";

		loadKakao(key)
			.then((kakao) => {
				if (!mounted) return;
				if (!mapRef.current) {
					const options = {
						center: new kakao.maps.LatLng(center.lat, center.lng),
						level: 9, // 태백시 전체가 보이도록 줌 레벨 조정
					};
					mapRef.current = new kakao.maps.Map(mapDivRef.current, options);

					// 태백시 행정 경계 폴리곤 표시
					const path = TAEBEAK_BOUNDARY.map((p) => new kakao.maps.LatLng(p.lat, p.lng));
					const polygon = new kakao.maps.Polygon({
						path,
						strokeWeight: 2,
						strokeColor: "#00d4aa",
						strokeOpacity: 0.9,
						strokeStyle: "solid",
						fillColor: "#00d4aa",
						fillOpacity: 0.15,
					});
					polygon.setMap(mapRef.current);
					polygonRef.current = polygon;

					// 서비스 지역 외 메시지 엘리먼트 (초기 숨김)
					outsideMsgRef.current = document.createElement("div");
					outsideMsgRef.current.style.position = "absolute";
					outsideMsgRef.current.style.top = "12px";
					outsideMsgRef.current.style.left = "50%";
					outsideMsgRef.current.style.transform = "translateX(-50%)";
					outsideMsgRef.current.style.background = "rgba(200,0,0,0.85)";
					outsideMsgRef.current.style.color = "#fff";
					outsideMsgRef.current.style.padding = "10px 18px";
					outsideMsgRef.current.style.borderRadius = "6px";
					outsideMsgRef.current.style.fontSize = "14px";
					outsideMsgRef.current.style.fontWeight = "600";
					outsideMsgRef.current.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
					outsideMsgRef.current.style.pointerEvents = "none";
					outsideMsgRef.current.style.zIndex = "1001";
					outsideMsgRef.current.style.display = "none";
					outsideMsgRef.current.textContent = "서비스 지역이 아닙니다";
					wrapperRef.current?.appendChild(outsideMsgRef.current);

					// 중심 이동 시 서비스 지역 판별 (폴리곤 기반)
					kakao.maps.event.addListener(mapRef.current, "center_changed", function () {
						const c = mapRef.current.getCenter();
						const lat = c.getLat();
						const lng = c.getLng();
						setMapCenter({ lat, lng });
						const inside = isPointInPolygon(lat, lng, TAEBEAK_BOUNDARY);
						if (outsideMsgRef.current) {
							outsideMsgRef.current.style.display = inside ? "none" : "block";
						}
					});
				}
				setLoaded(true);
			})
			.catch((err) => {
				console.error("Kakao load failed", err);
			});

		// Fetch weather snapshot initially
		const fetchWeather = () => {
			fetch("/api/weather/current")
				.then((r) => {
					if (r.status === 404) {
						// No data yet, trigger auto-refresh to create initial snapshot
						console.log("[Weather] No data found, triggering auto-refresh...");
						return fetch("/api/weather/auto-refresh", { method: "POST" }).then((refreshRes) => {
							if (refreshRes.ok) {
								// Retry fetching current weather
								return fetch("/api/weather/current").then((retryRes) => (retryRes.ok ? retryRes.json() : Promise.reject(new Error("Retry failed"))));
							}
							return Promise.reject(new Error("Auto-refresh failed"));
						});
					}
					if (!r.ok) {
						return Promise.reject(new Error("weather http " + r.status));
					}
					return r.json();
				})
				.then((data) => {
					setWeather(data.snapshot);
					setWeatherError(null);
				})
				.catch((e) => {
					console.error("[Weather] Error:", e);
					setWeatherError(e.message);
				});
		};

		fetchWeather();

		// Auto-refresh weather every 5 minutes
		const weatherInterval = setInterval(fetchWeather, 5 * 60 * 1000);

		return () => {
			mounted = false;
			clearInterval(weatherInterval);
		};

		return () => {
			mounted = false;
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

			{/* Search overlay */}
			<div style={{ position: "absolute", left: 12, top: 12, zIndex: 1000 }}>
				<div style={{ background: "rgba(255,255,255,0.95)", padding: 8, borderRadius: 6, display: "flex", gap: 6 }}>
					<input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="Search in map..." style={{ padding: 6 }} />
					<button onClick={searchInMap}>Search</button>
				</div>
				{/* Weather overlay */}
				<div style={{ marginTop: 8, background: "rgba(255,255,255,0.95)", padding: 8, borderRadius: 6, fontSize: 12, maxWidth: 240 }}>
					<strong>Weather</strong>
					<br />
					{!weather && !weatherError && <span>Loading...</span>}
					{weatherError && <span style={{ color: "red" }}>Err: {weatherError}</span>}
					{weather && (
						<div>
							<div style={{ opacity: 0.7 }}>
								{weather.source.toUpperCase()} • {new Date(weather.timestamp * 1000).toLocaleTimeString()}
							</div>
							<div>Cloud: {weather.cloudCoverPct}%</div>
							<div>
								Wind: {weather.windSpeedMs.toFixed(1)} m/s {weather.windDirectionDeg ? "(" + weather.windDirectionDeg + "°)" : ""}
							</div>
							<div>
								Temp: {weather.temperatureC ?? "—"}°C Hum: {weather.humidityPct}%
							</div>
							{weather.dewPointC != null && <div>DewPt: {weather.dewPointC}°C</div>}
							{weather.precipitationProbabilityPct != null && <div>POP: {weather.precipitationProbabilityPct}%</div>}
							{weather.precipitationMm1h != null && <div>Rain1h: {weather.precipitationMm1h}mm</div>}
							{weather.sunAltitudeDeg != null && <div>SunAlt: {weather.sunAltitudeDeg.toFixed(1)}°</div>}
							{weather.moonAltitudeDeg != null && <div>MoonAlt: {weather.moonAltitudeDeg.toFixed(1)}°</div>}
							{weather.moonIlluminationPct != null && <div>MoonIllum: {weather.moonIlluminationPct}%</div>}
							{weather.threeHourTrend && weather.threeHourTrend.length > 0 && (
								<div style={{ marginTop: 4 }}>
									<div style={{ fontWeight: 600 }}>3h Trend</div>
									<div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
										{weather.threeHourTrend.slice(0, 5).map((p) => (
											<div key={p.dt} style={{ border: "1px solid #ccc", padding: "2px 4px", borderRadius: 3 }}>
												{new Date(p.dt * 1000).getHours()}h{p.cloudCoverPct != null && <span> ☁{p.cloudCoverPct}</span>}
												{p.windSpeedMs != null && <span> 🌀{p.windSpeedMs}</span>}
												{p.precipitationProbabilityPct != null && <span> ☂{p.precipitationProbabilityPct}</span>}
											</div>
										))}
									</div>
								</div>
							)}
							{weather.fineTrend10m && weather.fineTrend10m.length > 0 && (
								<div style={{ marginTop: 4 }}>
									<div style={{ fontWeight: 600 }}>Fine Trend</div>
									<div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
										{weather.fineTrend10m.slice(0, 6).map((p) => (
											<div key={p.dt} style={{ border: "1px solid #ddd", padding: "2px 4px", borderRadius: 3 }}>
												{new Date(p.dt * 1000).getHours()}:{new Date(p.dt * 1000).getMinutes().toString().padStart(2, "0")}
												{p.cloudCoverLevel != null && <span> ☁L{p.cloudCoverLevel}</span>}
												{p.precipitationMm1h != null && <span> ☂{p.precipitationMm1h}</span>}
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Cloud Heatmap Toggle */}
			<div style={{ position: "absolute", top: 12, right: 12, zIndex: 1100 }}>
				<button
					onClick={() => setShowCloudHeatmap((prev) => !prev)}
					style={{
						padding: "8px 14px",
						background: showCloudHeatmap ? "#00b887" : "#444",
						color: "#fff",
						border: "none",
						borderRadius: 6,
						cursor: "pointer",
						fontSize: 13,
						fontWeight: 600,
						boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
						transition: "background .2s",
					}}
				>
					{showCloudHeatmap ? "구름 히트맵 끄기" : "구름 히트맵 켜기"}
				</button>
			</div>

			{/* Cloud Heatmap Overlay (기상 표준 팔레트 적용) */}
			<CloudHeatmapOverlay map={mapRef.current} enabled={showCloudHeatmap} style="meteo" />
		</div>
	);
}
