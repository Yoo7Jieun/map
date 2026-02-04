export default function AboutPage() {
	return (
		<div style={{
			minHeight: "calc(100vh - 60px)",
			backgroundColor: "#0f172a",
			padding: "60px 24px",
		}}>
			<div style={{
				maxWidth: "800px",
				margin: "0 auto",
			}}>
				{/* 헤더 */}
				<div style={{ textAlign: "center", marginBottom: "60px" }}>
					<div style={{ fontSize: "80px", marginBottom: "24px" }}>🌌</div>
					<h1 style={{
						fontSize: "36px",
						fontWeight: 800,
						color: "#fff",
						marginBottom: "16px",
					}}>
						은하수 관측 가이드
					</h1>
					<p style={{
						fontSize: "18px",
						color: "#94a3b8",
						lineHeight: 1.6,
					}}>
						누구나 쉽게 밤하늘의 은하수를 만날 수 있도록
					</p>
				</div>

				{/* 서비스 소개 */}
				<div style={{
					backgroundColor: "rgba(51, 65, 85, 0.4)",
					borderRadius: "20px",
					padding: "40px",
					marginBottom: "32px",
				}}>
					<h2 style={{
						fontSize: "24px",
						fontWeight: 700,
						color: "#fff",
						marginBottom: "20px",
					}}>
						🔭 이 서비스는요
					</h2>
					<p style={{
						fontSize: "17px",
						color: "#cbd5e1",
						lineHeight: 1.8,
					}}>
						은하수를 보고 싶지만 <strong style={{ color: "#60a5fa" }}>언제, 어디서</strong> 봐야 할지 
						모르는 분들을 위해 만들었어요.
						<br /><br />
						날씨 예보와 실시간 관측 데이터를 분석해서 
						<strong style={{ color: "#4ade80" }}> 별 보기 좋은 날과 장소</strong>를 
						쉽게 알려드립니다.
					</p>
				</div>

				{/* 기능 소개 */}
				<div style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "24px",
					marginBottom: "32px",
				}}>
					<div style={{
						backgroundColor: "rgba(51, 65, 85, 0.4)",
						borderRadius: "16px",
						padding: "28px",
					}}>
						<div style={{ fontSize: "40px", marginBottom: "16px" }}>📅</div>
						<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
							예보로 확인
						</h3>
						<p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6 }}>
							원하는 날짜와 장소의 관측 조건을 미리 확인하세요.
						</p>
					</div>

					<div style={{
						backgroundColor: "rgba(51, 65, 85, 0.4)",
						borderRadius: "16px",
						padding: "28px",
					}}>
						<div style={{ fontSize: "40px", marginBottom: "16px" }}>📡</div>
						<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
							실시간 확인
						</h3>
						<p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6 }}>
							지금 당장 주변에서 별을 볼 수 있는지 확인하세요.
						</p>
					</div>

					<div style={{
						backgroundColor: "rgba(51, 65, 85, 0.4)",
						borderRadius: "16px",
						padding: "28px",
					}}>
						<div style={{ fontSize: "40px", marginBottom: "16px" }}>🌙</div>
						<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
							달 위상 달력
						</h3>
						<p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6 }}>
							달이 없는 날을 찾아 관측 계획을 세우세요.
						</p>
					</div>

					<div style={{
						backgroundColor: "rgba(51, 65, 85, 0.4)",
						borderRadius: "16px",
						padding: "28px",
					}}>
						<div style={{ fontSize: "40px", marginBottom: "16px" }}>📖</div>
						<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
							관측 가이드
						</h3>
						<p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6 }}>
							은하수 관측과 촬영에 필요한 모든 정보를 담았어요.
						</p>
					</div>
				</div>

				{/* 등급 설명 */}
				<div style={{
					backgroundColor: "rgba(51, 65, 85, 0.4)",
					borderRadius: "20px",
					padding: "40px",
					marginBottom: "32px",
				}}>
					<h2 style={{
						fontSize: "24px",
						fontWeight: 700,
						color: "#fff",
						marginBottom: "24px",
					}}>
						⭐ 등급이 뭔가요?
					</h2>
					<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
						{[
							{ emoji: "🌟", level: 5, label: "최고", desc: "은하수가 선명하게 보여요", color: "#22c55e" },
							{ emoji: "✨", level: 4, label: "좋음", desc: "은하수를 볼 수 있어요", color: "#84cc16" },
							{ emoji: "🌙", level: 3, label: "보통", desc: "밝은 별들이 보여요", color: "#facc15" },
							{ emoji: "☁️", level: 2, label: "흐림", desc: "별 보기 어려워요", color: "#f97316" },
							{ emoji: "🚫", level: 1, label: "불가", desc: "별을 볼 수 없어요", color: "#ef4444" },
						].map((item) => (
							<div key={item.level} style={{
								display: "flex",
								alignItems: "center",
								gap: "16px",
								padding: "12px 16px",
								backgroundColor: "rgba(255,255,255,0.05)",
								borderRadius: "12px",
							}}>
								<span style={{ fontSize: "28px" }}>{item.emoji}</span>
								<span style={{
									fontSize: "18px",
									fontWeight: 700,
									color: item.color,
									width: "100px",
								}}>
									{item.level}등급 {item.label}
								</span>
								<span style={{ fontSize: "15px", color: "#94a3b8" }}>
									{item.desc}
								</span>
							</div>
						))}
					</div>
				</div>

				{/* 푸터 */}
				<div style={{
					textAlign: "center",
					padding: "40px 0",
					color: "#64748b",
					fontSize: "14px",
				}}>
					<p>날씨 데이터: 기상청 | 달 위상: astronomy-engine</p>
					<p style={{ marginTop: "8px" }}>© 2024 은하수 관측 가이드</p>
				</div>
			</div>
		</div>
	);
}
