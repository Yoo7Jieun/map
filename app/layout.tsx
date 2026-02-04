import type { Metadata } from "next";
import "../styles/globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
	title: "은하수 관측 가이드",
	description: "실시간 날씨와 달 위상으로 최적의 은하수 관측 조건을 찾아보세요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ko">
			<body style={{
				margin: 0,
				padding: 0,
				backgroundColor: "#0f172a",
				minHeight: "100vh",
			}}>
				<Navigation />
				<main style={{
					paddingTop: "60px", // 네비게이션 높이만큼
					minHeight: "calc(100vh - 60px)",
				}}>
					{children}
				</main>
			</body>
		</html>
	);
}
