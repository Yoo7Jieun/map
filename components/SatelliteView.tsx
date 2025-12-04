"use client";

import React, { useState, useEffect, useRef } from "react";
import CloudHeatmapOverlay from "./CloudHeatmapOverlay";

type SatelliteType = "cld" | "ir105" | "vi006";
type ViewMode = "image" | "heatmap";

const satelliteOptions: { id: SatelliteType; label: string; description: string }[] = [
	{ id: "cld", label: "구름탐지", description: "구름 유무 확인" },
	{ id: "ir105", label: "적외영상", description: "24시간 관측 가능" },
	{ id: "vi006", label: "가시영상", description: "낮 시간대만" },
];

export default function SatelliteView() {
	const [selectedType, setSelectedType] = useState<SatelliteType>("cld");
	const [viewMode, setViewMode] = useState<ViewMode>("heatmap"); // 기본값 히트맵
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (viewMode !== "image") return;

		const loadImage = async () => {
			setLoading(true);
			setError(null);
			try {
				const url = `/api/satellite/image?type=${selectedType}`;
				console.log("[SatelliteView] Loading:", url);

				const res = await fetch(url);
				if (!res.ok) {
					const data = await res.json().catch(() => ({ error: "Unknown error" }));
					throw new Error(data.error || `HTTP ${res.status}`);
				}

				// Create object URL for the image
				const blob = await res.blob();
				const objectUrl = URL.createObjectURL(blob);

				// Clean up previous URL
				if (imageUrl) {
					URL.revokeObjectURL(imageUrl);
				}

				setImageUrl(objectUrl);
			} catch (err: any) {
				console.error("[SatelliteView] Error:", err);
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		loadImage();

		// Cleanup function
		return () => {
			if (imageUrl) {
				URL.revokeObjectURL(imageUrl);
			}
		};
	}, [selectedType, viewMode]);

	return (
		<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#1a1a1a" }}>
			{/* Satellite Type Selector */}
			<div style={{ padding: "12px", background: "#2a2a2a", borderBottom: "1px solid #3a3a3a", display: "flex", gap: "8px", alignItems: "center" }}>
				{satelliteOptions.map((option) => (
					<button
						key={option.id}
						onClick={() => setSelectedType(option.id)}
						style={{
							padding: "8px 16px",
							background: selectedType === option.id ? "#4285f4" : "#3a3a3a",
							color: "#fff",
							border: "none",
							borderRadius: "4px",
							cursor: "pointer",
							fontSize: "13px",
							transition: "background 0.2s",
						}}
					>
						<div style={{ fontWeight: selectedType === option.id ? "600" : "normal" }}>{option.label}</div>
						<div style={{ fontSize: "11px", opacity: 0.7, marginTop: "2px" }}>{option.description}</div>
					</button>
				))}

				{/* View Mode Toggle */}
				<div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
					<button
						onClick={() => setViewMode("heatmap")}
						style={{
							padding: "6px 12px",
							background: viewMode === "heatmap" ? "#00d4aa" : "#3a3a3a",
							color: "#fff",
							border: "none",
							borderRadius: "4px",
							cursor: "pointer",
							fontSize: "12px",
						}}
					>
						🌈 히트맵
					</button>
					<button
						onClick={() => setViewMode("image")}
						style={{
							padding: "6px 12px",
							background: viewMode === "image" ? "#00d4aa" : "#3a3a3a",
							color: "#fff",
							border: "none",
							borderRadius: "4px",
							cursor: "pointer",
							fontSize: "12px",
						}}
					>
						🖼️ 이미지
					</button>
				</div>
			</div>

			{/* Content Area */}
			<div style={{ flex: 1, position: "relative" }}>
				{viewMode === "heatmap" && <HeatmapView />}{" "}
				{viewMode === "image" && (
					<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
						{!imageUrl && !loading && !error && (
							<div style={{ textAlign: "center", color: "#888" }}>
								<div style={{ fontSize: "64px", marginBottom: "16px" }}>📡</div>
								<div style={{ fontSize: "20px", marginBottom: "8px" }}>위성 영상</div>
								<div style={{ fontSize: "14px", opacity: 0.7 }}>천리안 2A호 실시간 이미지</div>
							</div>
						)}
						{loading && <div style={{ color: "#fff" }}>로딩 중...</div>}
						{error && <div style={{ color: "#ff6b6b" }}>에러: {error}</div>}
						{imageUrl && <img src={imageUrl} alt="Satellite" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
					</div>
				)}
			</div>

			{/* Info Footer */}
			<div style={{ padding: "8px 12px", background: "#2a2a2a", borderTop: "1px solid #3a3a3a", fontSize: "11px", color: "#888" }}>{viewMode === "heatmap" ? "갱신: 10분 | 해상도: 2km | 스타일: 기상" : "갱신 주기: 10분 | 해상도: 2km | 영역: 한반도"}</div>
		</div>
	);
}

// 히트맵 뷰 컴포넌트
function HeatmapView() {
	const mapRef = useRef<any>(null);
	const mapDivRef = useRef<HTMLDivElement>(null);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!window.kakao || !window.kakao.maps) return;

		const container = mapDivRef.current;
		if (!container) return;

		const options = {
			center: new window.kakao.maps.LatLng(37.1667, 128.9889), // 태백시청
			level: 7,
		};

		const map = new window.kakao.maps.Map(container, options);
		mapRef.current = map;
		setLoaded(true);
	}, []);

	return (
		<div style={{ width: "100%", height: "100%", position: "relative" }}>
			<div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
			{loaded && <CloudHeatmapOverlay map={mapRef.current} enabled={true} style="meteo" />}
		</div>
	);
}
