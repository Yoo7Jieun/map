import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
	title: "태백시 은하수 관측 지도",
	description: "실시간 날씨와 위성 데이터로 최적의 은하수 관측지를 찾아보세요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ko">
			<body>{children}</body>
		</html>
	);
}
