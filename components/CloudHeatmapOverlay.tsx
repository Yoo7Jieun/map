"use client";

import React, { useEffect, useRef, useState } from "react";

// 간단한 debounce 함수
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
	let timer: any;
	return (...args: Parameters<T>) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), delay);
	};
}
import type { CloudGridData } from "@/lib/cloudHeatmap";
import { createCloudHeatmap, canvasToDataURL, auroraColorScale, meteoCloudColorScale } from "@/lib/cloudHeatmap";

interface CloudHeatmapOverlayProps {
	map: any; // Kakao Map instance
	enabled?: boolean;
	style?: "default" | "aurora" | "meteo"; // 색상 스타일 (default/meteo 동일)
}

export default function CloudHeatmapOverlay({ map, enabled = true, style = "default" }: CloudHeatmapOverlayProps) {
	const [gridData, setGridData] = useState<CloudGridData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [mapLevel, setMapLevel] = useState(9);
	const overlayRef = useRef<any>(null);

	// 구름 격자 데이터 로드
	useEffect(() => {
		if (!enabled) return;

		const loadGridData = async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch("/api/satellite/cloud-grid");
				if (!res.ok) {
					const data = await res.json().catch(() => ({ error: "Unknown error" }));
					throw new Error(data.error || `HTTP ${res.status}`);
				}

				const data: CloudGridData = await res.json();
				console.log("[CloudHeatmap] Loaded grid data:", {
					dateTime: data.dateTime,
					xdim: data.xdim,
					ydim: data.ydim,
					gridKm: data.gridKm,
				});
				setGridData(data);
			} catch (err: any) {
				console.error("[CloudHeatmap] Load error:", err);
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		loadGridData();

		// 10분마다 갱신
		const interval = setInterval(loadGridData, 10 * 60 * 1000);
		return () => clearInterval(interval);
	}, [enabled]);

	// 지도 줌 레벨 변화 감지
	useEffect(() => {
		if (!map || !window.kakao) return;

		const updateLevel = () => {
			const level = map.getLevel();
			setMapLevel(level);
		};

		// 초기 레벨 설정
		updateLevel();

		// zoom_changed 이벤트 리스너 등록
		window.kakao.maps.event.addListener(map, "zoom_changed", updateLevel);

		return () => {
			window.kakao.maps.event.removeListener(map, "zoom_changed", updateLevel);
		};
	}, [map]);

	// 히트맵을 카카오맵 오버레이로 표시
	useEffect(() => {
		if (!map || !gridData || !enabled) {
			if (overlayRef.current) {
				overlayRef.current.setMap(null);
				overlayRef.current = null;
			}
			return;
		}

		// debounce로 오버레이 생성/제거 묶기
		const renderOverlay = debounce(() => {
			try {
				const bounds = map.getBounds();
				const sw = bounds.getSouthWest();
				const ne = bounds.getNorthEast();
				const proj = map.getProjection();
				const swPixel = proj.containerPointFromCoords(sw);
				const nePixel = proj.containerPointFromCoords(ne);
				const width = Math.abs(nePixel.x - swPixel.x);
				const height = Math.abs(nePixel.y - swPixel.y);
				const canvas = createCloudHeatmap(gridData, {
					width: Math.round(width),
					height: Math.round(height),
					colorScale: style === "aurora" ? auroraColorScale : meteoCloudColorScale,
					opacity: 0.6,
				});
				const imageUrl = canvasToDataURL(canvas);
				if (overlayRef.current) {
					overlayRef.current.setMap(null);
				}
				const overlayContent = document.createElement("div");
				overlayContent.style.position = "relative";
				overlayContent.style.left = `0px`;
				overlayContent.style.top = `0px`;
				overlayContent.style.width = `${width}px`;
				overlayContent.style.height = `${height}px`;
				overlayContent.style.pointerEvents = "none";
				overlayContent.style.zIndex = "1";
				const img = document.createElement("img");
				img.src = imageUrl;
				img.style.width = "100%";
				img.style.height = "100%";
				img.style.opacity = "0.6";
				overlayContent.appendChild(img);
				const overlay = new kakao.maps.CustomOverlay({
					content: overlayContent,
					position: sw,
					xAnchor: 0,
					yAnchor: 1,
					map: map,
				});
				overlayRef.current = overlay;
				// console.log("[CloudHeatmap] Overlay created, viewport size:", width, height, "level:", mapLevel);
			} catch (err: any) {
				console.error("[CloudHeatmap] Overlay error:", err);
				setError(err.message);
			}
		}, 150); // 150ms 지연

		renderOverlay();

		return () => {
			if (overlayRef.current) {
				overlayRef.current.setMap(null);
				overlayRef.current = null;
			}
		};
	}, [map, gridData, enabled, style, mapLevel]);

	if (!enabled) return null;

	// 간단한 범례 (기상 표준형 팔레트)
	const legendStops = [
		{ label: "맑음", v: 0.05 },
		{ label: "얇은", v: 0.2 },
		{ label: "부분적", v: 0.5 },
		{ label: "덮임", v: 0.8 },
		{ label: "짙음", v: 0.95 },
	];

	return (
		<div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", color: "#fff", zIndex: 10, minWidth: 140 }}>
			{loading && <div>구름 데이터 로딩 중...</div>}
			{error && <div style={{ color: "#ff6b6b" }}>오류: {error}</div>}
			{gridData && !loading && (
				<>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<span>🌥️ 구름 히트맵</span>
						<span style={{ fontSize: 10, opacity: 0.7 }}>{mapLevel}</span>
					</div>
					<div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{gridData.dateTime}</div>
					{style !== "aurora" && (
						<div style={{ marginTop: 6 }}>
							<div style={{ fontSize: 10, marginBottom: 2, opacity: 0.8 }}>기상 색상 범례</div>
							<div style={{ display: "flex", gap: 4 }}>
								{legendStops.map((s) => {
									const c = meteoCloudColorScale(s.v);
									return (
										<div key={s.label} style={{ textAlign: "center" }}>
											<div style={{ width: 22, height: 22, borderRadius: 4, background: c }} />
											<div style={{ fontSize: 9, marginTop: 2 }}>{s.label}</div>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
