"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{ href: "/", label: "🗺️ 지도", title: "지도" },
	{ href: "/moon-calendar", label: "🌙 달력", title: "달 위상" },
	{ href: "/spots", label: "🏔️ 명소", title: "관측 명소" },
	{ href: "/guide", label: "📖 가이드", title: "관측 가이드" },
	{ href: "/about", label: "ℹ️ 소개", title: "소개" },
];

export default function Navigation() {
	const pathname = usePathname();

	return (
		<nav style={{
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			padding: "0 24px",
			height: "60px",
			backgroundColor: "rgba(15, 23, 42, 0.98)",
			borderBottom: "1px solid rgba(255,255,255,0.1)",
			position: "fixed",
			top: 0,
			left: 0,
			right: 0,
			zIndex: 1000,
		}}>
			{/* 로고 */}
			<Link href="/" style={{
				display: "flex",
				alignItems: "center",
				gap: "10px",
				textDecoration: "none",
			}}>
				<span style={{ fontSize: "28px" }}>🌌</span>
				<span style={{
					fontSize: "18px",
					fontWeight: 700,
					color: "#fff",
				}}>
					은하수 가이드
				</span>
			</Link>

			{/* 네비게이션 메뉴 */}
			<div style={{
				display: "flex",
				gap: "8px",
			}}>
				{navItems.map((item) => {
					const isActive = pathname === item.href;
					return (
						<Link
							key={item.href}
							href={item.href}
							style={{
								padding: "10px 16px",
								borderRadius: "10px",
								textDecoration: "none",
								fontSize: "15px",
								fontWeight: 600,
								backgroundColor: isActive ? "rgba(59, 130, 246, 0.2)" : "transparent",
								color: isActive ? "#60a5fa" : "#94a3b8",
								transition: "all 0.2s",
							}}
						>
							{item.label}
						</Link>
					);
				})}
			</div>

			{/* 우측 공간 (균형) */}
			<div style={{ width: "150px" }} />
		</nav>
	);
}
