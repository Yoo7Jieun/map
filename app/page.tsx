"use client";

import { useState } from "react";
import TabNavigation, { type ViewMode } from "../components/TabNavigation";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("../components/Map"), { ssr: false });
const SatelliteView = dynamic(() => import("../components/SatelliteView"), { ssr: false });
const MilkyWayView = dynamic(() => import("../components/MilkyWayView"), { ssr: false });

export default function HomePage() {
	const [view, setView] = useState<ViewMode>("map");

	return (
		<div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
			<TabNavigation activeView={view} onViewChange={setView} />

			<div style={{ flex: 1, position: "relative" }}>
				{view === "map" && <Map places={[]} center={{ lat: 37.1667, lng: 128.9889 }} />}
				{view === "satellite" && <SatelliteView />}
				{view === "milkyway" && <MilkyWayView />}
			</div>
		</div>
	);
}
