"use client";

import React from "react";

export type ViewMode = "map" | "satellite" | "milkyway";

type TabNavigationProps = {
	activeView: ViewMode;
	onViewChange: (view: ViewMode) => void;
};

type TabConfig = {
	id: ViewMode;
	icon: string;
	label: string;
};

const tabs: TabConfig[] = [
	{ id: "map", icon: "🗺️", label: "지도 보기" },
	{ id: "satellite", icon: "📡", label: "위성 영상" },
	{ id: "milkyway", icon: "✨", label: "은하수 지수" },
];

export default function TabNavigation({ activeView, onViewChange }: TabNavigationProps) {
	return (
		<div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #e0e0e0" }}>
			{tabs.map((tab) => (
				<button
					key={tab.id}
					onClick={() => onViewChange(tab.id)}
					style={{
						padding: "12px 24px",
						border: "none",
						background: activeView === tab.id ? "#4285f4" : "transparent",
						color: activeView === tab.id ? "#fff" : "#666",
						fontWeight: activeView === tab.id ? "600" : "normal",
						cursor: "pointer",
						fontSize: "14px",
						borderBottom: activeView === tab.id ? "3px solid #4285f4" : "none",
						transition: "all 0.2s ease",
					}}
					onMouseEnter={(e) => {
						if (activeView !== tab.id) {
							e.currentTarget.style.background = "#f0f0f0";
						}
					}}
					onMouseLeave={(e) => {
						if (activeView !== tab.id) {
							e.currentTarget.style.background = "transparent";
						}
					}}
				>
					{tab.icon} {tab.label}
				</button>
			))}
		</div>
	);
}
