"use client";

import dynamic from "next/dynamic";

// SSR 비활성화 - Leaflet은 클라이언트에서만 동작
const LeafletMap = dynamic(() => import("./LeafletMap"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
			<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
			<div className="text-white text-xl font-medium">지도 로딩 중...</div>
			<div className="text-gray-400 text-sm">잠시만 기다려주세요</div>
		</div>
	),
});

export default function MapWrapper() {
	return <LeafletMap />;
}
