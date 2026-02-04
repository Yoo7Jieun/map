"use client";

import { useRouter } from "next/navigation";

// 위치 마커 아이콘 (물방울 모양)
function LocationIcon({ color }: { color: string }) {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill={color}
			style={{ flexShrink: 0 }}
		>
			<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
		</svg>
	);
}

// 지도 아이콘
function MapIcon({ color }: { color: string }) {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill={color}
			style={{ flexShrink: 0 }}
		>
			<path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
		</svg>
	);
}

interface MapNavigationButtonsProps {
	name: string;
	latitude: number;
	longitude: number;
	address?: string | null;
	size?: "small" | "medium";
	isDomestic?: boolean; // 국내 여부 (해외면 구글지도 표시)
	showMapLink?: boolean; // 지도 페이지 링크 표시 여부
	onClickCapture?: (e: React.MouseEvent) => void;
}

const styles = {
	container: {
		display: "flex",
		gap: "6px",
	},
	button: {
		flex: 1,
		border: "none",
		borderRadius: "6px",
		fontWeight: 600,
		cursor: "pointer",
		textAlign: "center" as const,
		textDecoration: "none",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	kakao: {
		backgroundColor: "#fee500",
		color: "#191919",
	},
	naver: {
		backgroundColor: "#03c75a",
		color: "#fff",
	},
	google: {
		backgroundColor: "#4285f4",
		color: "#fff",
	},
	mapLink: {
		backgroundColor: "#6366f1",
		color: "#fff",
	},
};

const sizeStyles = {
	small: {
		padding: "6px 10px",
		fontSize: "11px",
		borderRadius: "6px",
	},
	medium: {
		padding: "8px 12px",
		fontSize: "12px",
		borderRadius: "8px",
	},
};

export default function MapNavigationButtons({
	name,
	latitude,
	longitude,
	address,
	size = "medium",
	isDomestic = true,
	showMapLink = false,
	onClickCapture,
}: MapNavigationButtonsProps) {
	const router = useRouter();

	// URL 생성
	const kakaoMapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${latitude},${longitude}`;
	const searchQuery = address || name;
	const naverMapUrl = `https://map.naver.com/p/search/${encodeURIComponent(searchQuery)}`;
	const googleMapUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodeURIComponent(name)}`;

	const handleClick = (e: React.MouseEvent, url: string) => {
		if (onClickCapture) {
			onClickCapture(e);
		}
		e.stopPropagation();
		window.open(url, "_blank", "noopener,noreferrer");
	};

	const handleMapLinkClick = (e: React.MouseEvent) => {
		if (onClickCapture) {
			onClickCapture(e);
		}
		e.stopPropagation();
		// 좌표와 이름을 쿼리 파라미터로 전달하며 지도 페이지로 이동
		router.push(`/?lat=${latitude}&lng=${longitude}&name=${encodeURIComponent(name)}`);
	};

	const buttonStyle = {
		...styles.button,
		...sizeStyles[size],
	};

	// 지도에서 보기 버튼
	const mapLinkButton = showMapLink && (
		<button
			onClick={handleMapLinkClick}
			style={{ ...buttonStyle, ...styles.mapLink, gap: "4px", width: "100%" }}
		>
			<MapIcon color="#ffffff" />
			지도에서 보기
		</button>
	);

	// 국내: 카카오맵 + 네이버지도 + 구글지도
	// 해외: 구글지도만
	if (isDomestic) {
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
				{mapLinkButton}
				<div style={styles.container}>
					<button
						onClick={(e) => handleClick(e, kakaoMapUrl)}
						style={{ ...buttonStyle, ...styles.kakao, gap: "4px" }}
					>
						<LocationIcon color="#191919" />
						카카오맵
					</button>
					<button
						onClick={(e) => handleClick(e, naverMapUrl)}
						style={{ ...buttonStyle, ...styles.naver, gap: "4px" }}
					>
						<LocationIcon color="#ffffff" />
						네이버지도
					</button>
				</div>
				<button
					onClick={(e) => handleClick(e, googleMapUrl)}
					style={{ ...buttonStyle, ...styles.google, gap: "4px", width: "100%" }}
				>
					<LocationIcon color="#ffffff" />
					구글지도
				</button>
			</div>
		);
	}

	// 해외
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
			{mapLinkButton}
			<button
				onClick={(e) => handleClick(e, googleMapUrl)}
				style={{ ...buttonStyle, ...styles.google, gap: "4px", width: "100%" }}
			>
				<LocationIcon color="#ffffff" />
				구글지도
			</button>
		</div>
	);
}
