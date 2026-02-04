"use client";

import { useState, useMemo } from "react";

// ============ 달 위상 계산 ============

function getMoonPhase(date: Date): {
	phase: number; // 0-1 (0=신월, 0.5=보름)
	name: string;
	emoji: string;
	illumination: number; // 0-100%
	isGoodForStars: boolean;
} {
	// 알려진 신월 기준 (2000년 1월 6일)
	const knownNewMoon = new Date(2000, 0, 6).getTime();
	const lunarCycle = 29.53059; // 음력 주기 (일)
	const daysSinceNewMoon = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
	const phase = (daysSinceNewMoon % lunarCycle) / lunarCycle;
	
	// 음력 나이 (일)
	const lunarAge = daysSinceNewMoon % lunarCycle;
	
	// 조도 계산 (보름에 100%, 신월에 0%)
	const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);
	
	// 위상 이름과 이모지
	let name: string;
	let emoji: string;
	
	if (lunarAge < 1.85) {
		name = "신월"; emoji = "🌑";
	} else if (lunarAge < 5.53) {
		name = "초승달"; emoji = "🌒";
	} else if (lunarAge < 9.22) {
		name = "상현달"; emoji = "🌓";
	} else if (lunarAge < 12.91) {
		name = "상현망"; emoji = "🌔";
	} else if (lunarAge < 16.61) {
		name = "보름달"; emoji = "🌕";
	} else if (lunarAge < 20.30) {
		name = "하현망"; emoji = "🌖";
	} else if (lunarAge < 23.99) {
		name = "하현달"; emoji = "🌗";
	} else if (lunarAge < 27.68) {
		name = "그믐달"; emoji = "🌘";
	} else {
		name = "신월"; emoji = "🌑";
	}
	
	// 별 관측에 좋은지 (달이 어두울 때)
	const isGoodForStars = illumination < 30;
	
	return { phase, name, emoji, illumination, isGoodForStars };
}

// ============ 달력 생성 ============

function getCalendarDays(year: number, month: number): (Date | null)[] {
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const daysInMonth = lastDay.getDate();
	const startDayOfWeek = firstDay.getDay(); // 0 = 일요일
	
	const days: (Date | null)[] = [];
	
	// 이전 달 빈 칸
	for (let i = 0; i < startDayOfWeek; i++) {
		days.push(null);
	}
	
	// 이번 달 날짜
	for (let i = 1; i <= daysInMonth; i++) {
		days.push(new Date(year, month, i));
	}
	
	return days;
}

// ============ 스타일 ============

const styles = {
	container: {
		minHeight: "calc(100vh - 60px)",
		backgroundColor: "#0f172a",
		padding: "40px 24px",
	},
	header: {
		maxWidth: "900px",
		margin: "0 auto 40px",
		textAlign: "center" as const,
	},
	calendar: {
		maxWidth: "900px",
		margin: "0 auto",
		backgroundColor: "rgba(51, 65, 85, 0.4)",
		borderRadius: "20px",
		padding: "24px",
	},
	monthNav: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: "24px",
	},
	navButton: {
		padding: "12px 20px",
		borderRadius: "12px",
		border: "none",
		backgroundColor: "rgba(255,255,255,0.1)",
		color: "#fff",
		fontSize: "16px",
		fontWeight: 600,
		cursor: "pointer",
	},
	weekHeader: {
		display: "grid",
		gridTemplateColumns: "repeat(7, 1fr)",
		gap: "8px",
		marginBottom: "8px",
	},
	weekDay: {
		textAlign: "center" as const,
		padding: "12px",
		fontSize: "14px",
		fontWeight: 600,
		color: "#94a3b8",
	},
	daysGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(7, 1fr)",
		gap: "8px",
	},
	dayCell: {
		aspectRatio: "1",
		borderRadius: "12px",
		padding: "8px",
		display: "flex",
		flexDirection: "column" as const,
		alignItems: "center",
		justifyContent: "center",
		cursor: "pointer",
		transition: "all 0.2s",
	},
	legend: {
		maxWidth: "900px",
		margin: "24px auto 0",
		display: "flex",
		justifyContent: "center",
		gap: "24px",
		flexWrap: "wrap" as const,
	},
};

// ============ 컴포넌트 ============

export default function MoonCalendarPage() {
	const today = new Date();
	const [currentYear, setCurrentYear] = useState(today.getFullYear());
	const [currentMonth, setCurrentMonth] = useState(today.getMonth());
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	
	const calendarDays = useMemo(() => getCalendarDays(currentYear, currentMonth), [currentYear, currentMonth]);
	
	const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
	const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
	
	const goToPrevMonth = () => {
		if (currentMonth === 0) {
			setCurrentYear(currentYear - 1);
			setCurrentMonth(11);
		} else {
			setCurrentMonth(currentMonth - 1);
		}
	};
	
	const goToNextMonth = () => {
		if (currentMonth === 11) {
			setCurrentYear(currentYear + 1);
			setCurrentMonth(0);
		} else {
			setCurrentMonth(currentMonth + 1);
		}
	};
	
	const goToToday = () => {
		setCurrentYear(today.getFullYear());
		setCurrentMonth(today.getMonth());
	};
	
	const selectedMoonInfo = selectedDate ? getMoonPhase(selectedDate) : null;
	
	return (
		<div style={styles.container}>
			{/* 헤더 */}
			<div style={styles.header}>
				<div style={{ fontSize: "48px", marginBottom: "16px" }}>🌙</div>
				<h1 style={{
					fontSize: "32px",
					fontWeight: 800,
					color: "#fff",
					marginBottom: "12px",
				}}>
					달 위상 달력
				</h1>
				<p style={{
					fontSize: "17px",
					color: "#94a3b8",
					lineHeight: 1.6,
				}}>
					달이 없는 날에 은하수가 더 잘 보여요 ✨
				</p>
			</div>
			
			{/* 선택된 날짜 정보 */}
			{selectedMoonInfo && selectedDate && (
				<div style={{
					maxWidth: "900px",
					margin: "0 auto 24px",
					padding: "20px 24px",
					backgroundColor: selectedMoonInfo.isGoodForStars 
						? "rgba(34, 197, 94, 0.15)" 
						: "rgba(251, 191, 36, 0.15)",
					borderRadius: "16px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}>
					<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
						<span style={{ fontSize: "48px" }}>{selectedMoonInfo.emoji}</span>
						<div>
							<div style={{ fontSize: "18px", fontWeight: 700, color: "#fff" }}>
								{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 - {selectedMoonInfo.name}
							</div>
							<div style={{ fontSize: "15px", color: "#94a3b8", marginTop: "4px" }}>
								밝기: {selectedMoonInfo.illumination}%
							</div>
						</div>
					</div>
					<div style={{
						padding: "10px 20px",
						borderRadius: "20px",
						backgroundColor: selectedMoonInfo.isGoodForStars ? "#22c55e" : "#f59e0b",
						color: "#fff",
						fontSize: "15px",
						fontWeight: 700,
					}}>
						{selectedMoonInfo.isGoodForStars ? "⭐ 별 보기 좋아요!" : "🌙 달이 밝아요"}
					</div>
				</div>
			)}
			
			{/* 달력 */}
			<div style={styles.calendar}>
				{/* 월 네비게이션 */}
				<div style={styles.monthNav}>
					<button style={styles.navButton} onClick={goToPrevMonth}>
						← 이전
					</button>
					<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
						<h2 style={{
							fontSize: "24px",
							fontWeight: 700,
							color: "#fff",
							margin: 0,
						}}>
							{currentYear}년 {monthNames[currentMonth]}
						</h2>
						<button 
							style={{ ...styles.navButton, padding: "8px 16px", fontSize: "14px" }}
							onClick={goToToday}
						>
							오늘
						</button>
					</div>
					<button style={styles.navButton} onClick={goToNextMonth}>
						다음 →
					</button>
				</div>
				
				{/* 요일 헤더 */}
				<div style={styles.weekHeader}>
					{weekDays.map((day, idx) => (
						<div 
							key={day} 
							style={{
								...styles.weekDay,
								color: idx === 0 ? "#f87171" : idx === 6 ? "#60a5fa" : "#94a3b8",
							}}
						>
							{day}
						</div>
					))}
				</div>
				
				{/* 날짜 그리드 */}
				<div style={styles.daysGrid}>
					{calendarDays.map((date, idx) => {
						if (!date) {
							return <div key={`empty-${idx}`} style={{ aspectRatio: "1" }} />;
						}
						
						const moonInfo = getMoonPhase(date);
						const isToday = date.toDateString() === today.toDateString();
						const isSelected = selectedDate?.toDateString() === date.toDateString();
						const dayOfWeek = date.getDay();
						
						return (
							<div
								key={date.toISOString()}
								style={{
									...styles.dayCell,
									backgroundColor: isSelected 
										? "rgba(59, 130, 246, 0.3)" 
										: moonInfo.isGoodForStars 
											? "rgba(34, 197, 94, 0.1)" 
											: "rgba(255,255,255,0.03)",
									border: isToday ? "2px solid #60a5fa" : "2px solid transparent",
								}}
								onClick={() => setSelectedDate(date)}
							>
								<div style={{
									fontSize: "14px",
									fontWeight: isToday ? 700 : 500,
									color: dayOfWeek === 0 ? "#f87171" : dayOfWeek === 6 ? "#60a5fa" : "#e2e8f0",
									marginBottom: "4px",
								}}>
									{date.getDate()}
								</div>
								<div style={{ fontSize: "24px" }}>
									{moonInfo.emoji}
								</div>
								<div style={{
									fontSize: "10px",
									color: moonInfo.isGoodForStars ? "#4ade80" : "#94a3b8",
									marginTop: "2px",
								}}>
									{moonInfo.illumination}%
								</div>
							</div>
						);
					})}
				</div>
			</div>
			
			{/* 범례 */}
			<div style={styles.legend}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<div style={{
						width: "24px",
						height: "24px",
						borderRadius: "6px",
						backgroundColor: "rgba(34, 197, 94, 0.3)",
					}} />
					<span style={{ fontSize: "14px", color: "#94a3b8" }}>별 보기 좋음 (달 30% 미만)</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<div style={{
						width: "24px",
						height: "24px",
						borderRadius: "6px",
						border: "2px solid #60a5fa",
					}} />
					<span style={{ fontSize: "14px", color: "#94a3b8" }}>오늘</span>
				</div>
			</div>
			
			{/* 달 위상 설명 */}
			<div style={{
				maxWidth: "900px",
				margin: "40px auto 0",
				backgroundColor: "rgba(51, 65, 85, 0.4)",
				borderRadius: "16px",
				padding: "24px",
			}}>
				<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
					🌙 달의 위상
				</h3>
				<div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "16px" }}>
					{[
						{ emoji: "🌑", name: "신월", desc: "달이 안 보여요" },
						{ emoji: "🌒", name: "초승달", desc: "오른쪽이 조금 보여요" },
						{ emoji: "🌓", name: "상현달", desc: "오른쪽 반이 보여요" },
						{ emoji: "🌕", name: "보름달", desc: "달이 가장 밝아요" },
						{ emoji: "🌗", name: "하현달", desc: "왼쪽 반이 보여요" },
						{ emoji: "🌘", name: "그믐달", desc: "왼쪽이 조금 보여요" },
					].map((item) => (
						<div key={item.name} style={{ textAlign: "center", minWidth: "100px" }}>
							<div style={{ fontSize: "32px", marginBottom: "8px" }}>{item.emoji}</div>
							<div style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>{item.name}</div>
							<div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{item.desc}</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
