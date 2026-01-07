"use client";

interface ControlPanelProps {
	showLightPollution: boolean;
	onToggleLightPollution: () => void;
}

export default function ControlPanel({ showLightPollution, onToggleLightPollution }: ControlPanelProps) {
	return (
		<div
			style={{
				position: "absolute",
				top: "16px",
				right: "16px",
				zIndex: 1000,
				display: "flex",
				flexDirection: "column",
				gap: "8px",
			}}
		>
			{/* 광공해 토글 */}
			<button
				onClick={onToggleLightPollution}
				style={{
					padding: "12px 20px",
					borderRadius: "8px",
					fontWeight: 600,
					fontSize: "14px",
					border: "none",
					cursor: "pointer",
					backgroundColor: showLightPollution ? "#eab308" : "#374151",
					color: showLightPollution ? "#000" : "#fff",
					boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
					transition: "all 0.2s ease",
				}}
			>
				🌃 광공해 {showLightPollution ? "ON" : "OFF"}
			</button>
		</div>
	);
}
