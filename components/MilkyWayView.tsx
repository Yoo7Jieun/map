"use client";

import React from "react";

export default function MilkyWayView() {
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "#0a0a1a",
			}}
		>
			<div style={{ textAlign: "center", color: "#fff" }}>
				<div style={{ fontSize: "48px", marginBottom: "16px" }}>✨</div>
				<div style={{ fontSize: "18px" }}>은하수 관측 지수</div>
				<div style={{ fontSize: "14px", color: "#aaa", marginTop: "8px" }}>구름량, 시정, 대기질 종합 분석</div>
			</div>
		</div>
	);
}
