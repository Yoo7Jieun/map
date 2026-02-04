export default function GuidePage() {
	return (
		<div style={{
			minHeight: "calc(100vh - 60px)",
			backgroundColor: "#0f172a",
			padding: "40px 24px 80px",
		}}>
			<div style={{ maxWidth: "900px", margin: "0 auto" }}>
				{/* 헤더 */}
				<div style={{ textAlign: "center", marginBottom: "60px" }}>
					<div style={{ fontSize: "64px", marginBottom: "20px" }}>🌌</div>
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
						처음 은하수를 보러 가시는 분들을 위한 완벽 가이드
					</p>
				</div>

				{/* 목차 */}
				<div style={{
					backgroundColor: "rgba(59, 130, 246, 0.1)",
					borderRadius: "16px",
					padding: "24px",
					marginBottom: "40px",
				}}>
					<h2 style={{ fontSize: "18px", fontWeight: 700, color: "#60a5fa", marginBottom: "16px" }}>
						📋 목차
					</h2>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
						{["은하수란?", "계절별 은하수", "관측 조건", "관측 장소", "촬영 팁"].map((item, idx) => (
							<a
								key={item}
								href={`#section-${idx}`}
								style={{
									padding: "8px 16px",
									backgroundColor: "rgba(255,255,255,0.1)",
									borderRadius: "8px",
									color: "#e2e8f0",
									textDecoration: "none",
									fontSize: "14px",
								}}
							>
								{idx + 1}. {item}
							</a>
						))}
					</div>
				</div>

				{/* Section 1: 은하수란? */}
				<section id="section-0" style={{ marginBottom: "48px" }}>
					<div style={{
						backgroundColor: "rgba(51, 65, 85, 0.4)",
						borderRadius: "20px",
						padding: "32px",
					}}>
						<h2 style={{
							fontSize: "28px",
							fontWeight: 700,
							color: "#fff",
							marginBottom: "20px",
							display: "flex",
							alignItems: "center",
							gap: "12px",
						}}>
							<span>🌟</span> 은하수란 무엇인가요?
						</h2>
						
						<div style={{ fontSize: "17px", color: "#cbd5e1", lineHeight: 1.9 }}>
							<p style={{ marginBottom: "16px" }}>
								<strong style={{ color: "#60a5fa" }}>은하수(Milky Way)</strong>는 
								우리가 살고 있는 은하계를 지구에서 바라본 모습이에요.
							</p>
							<p style={{ marginBottom: "16px" }}>
								밤하늘을 가로지르는 <strong style={{ color: "#fbbf24" }}>흐릿한 띠 모양의 빛</strong>으로 보이는데,
								이것은 수천억 개의 별들이 모여 있는 우리 은하의 원반을 옆에서 보는 것이에요.
							</p>
							<p>
								옛날 사람들은 이 모습이 마치 하늘에 우유를 쏟은 것 같다고 해서 
								&apos;Milky Way(우유의 길)&apos;라고 불렀어요. 🥛✨
							</p>
						</div>

						<div style={{
							marginTop: "24px",
							padding: "20px",
							backgroundColor: "rgba(255,255,255,0.05)",
							borderRadius: "12px",
						}}>
							<div style={{ fontSize: "15px", color: "#94a3b8" }}>
								💡 <strong>알고 계셨나요?</strong>
							</div>
							<div style={{ fontSize: "16px", color: "#e2e8f0", marginTop: "8px" }}>
								우리 은하에는 약 <strong style={{ color: "#4ade80" }}>1,000억~4,000억 개</strong>의 별이 있어요!
							</div>
						</div>
					</div>
				</section>

				{/* Section 2: 계절별 은하수 */}
				<section id="section-1" style={{ marginBottom: "48px" }}>
					<div style={{
						backgroundColor: "rgba(51, 65, 85, 0.4)",
						borderRadius: "20px",
						padding: "32px",
					}}>
						<h2 style={{
							fontSize: "28px",
							fontWeight: 700,
							color: "#fff",
							marginBottom: "20px",
							display: "flex",
							alignItems: "center",
							gap: "12px",
						}}>
							<span>🗓️</span> 계절별 은하수
						</h2>

						<p style={{ fontSize: "17px", color: "#cbd5e1", marginBottom: "24px", lineHeight: 1.8 }}>
							은하수는 <strong style={{ color: "#fbbf24" }}>계절과 시간</strong>에 따라 
							보이는 위치와 각도가 달라져요.
						</p>

						<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
							{[
								{
									season: "🌸 봄 (3-5월)",
									time: "새벽 2-4시",
									position: "동쪽 지평선에서 떠오름",
									angle: "지평선과 거의 수평",
									tip: "새벽에 일찍 일어나야 해요",
									color: "#f472b6",
								},
								{
									season: "☀️ 여름 (6-8월)",
									time: "밤 10시 - 새벽 2시",
									position: "남쪽 하늘 높이",
									angle: "수직으로 서서 가장 화려함",
									tip: "⭐ 은하수 관측의 최적기!",
									color: "#fbbf24",
								},
								{
									season: "🍂 가을 (9-11월)",
									time: "해진 직후 - 밤 10시",
									position: "서쪽으로 기울어짐",
									angle: "서서히 지평선으로 내려감",
									tip: "해가 지면 바로 관측 시작",
									color: "#f97316",
								},
								{
									season: "❄️ 겨울 (12-2월)",
									time: "관측 어려움",
									position: "낮 시간대에 위치",
									angle: "해와 같은 방향",
									tip: "은하수 중심부 관측 불가",
									color: "#60a5fa",
								},
							].map((item) => (
								<div key={item.season} style={{
									padding: "20px",
									backgroundColor: "rgba(255,255,255,0.05)",
									borderRadius: "16px",
									borderLeft: `4px solid ${item.color}`,
								}}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
										<div style={{ fontSize: "20px", fontWeight: 700, color: "#fff" }}>
											{item.season}
										</div>
										<div style={{
											padding: "4px 12px",
											backgroundColor: `${item.color}20`,
											borderRadius: "8px",
											fontSize: "13px",
											color: item.color,
											fontWeight: 600,
										}}>
											{item.time}
										</div>
									</div>
									<div style={{ fontSize: "15px", color: "#94a3b8", marginBottom: "8px" }}>
										📍 위치: {item.position}
									</div>
									<div style={{ fontSize: "15px", color: "#94a3b8", marginBottom: "8px" }}>
										📐 각도: {item.angle}
									</div>
									<div style={{ fontSize: "15px", color: "#4ade80", fontWeight: 600 }}>
										💡 {item.tip}
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Section 3: 관측 조건 */}
				<section id="section-2" style={{ marginBottom: "48px" }}>
					<div style={{
						backgroundColor: "rgba(51, 65, 85, 0.4)",
						borderRadius: "20px",
						padding: "32px",
					}}>
						<h2 style={{
							fontSize: "28px",
							fontWeight: 700,
							color: "#fff",
							marginBottom: "20px",
							display: "flex",
							alignItems: "center",
							gap: "12px",
						}}>
							<span>✅</span> 은하수 보기 좋은 조건
						</h2>

						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
							{[
								{
									icon: "🌙",
									title: "달이 없는 날",
									desc: "신월(삭) 전후 5일이 최적",
									good: "달 밝기 30% 미만",
									bad: "보름달 전후는 피하세요",
								},
								{
									icon: "☁️",
									title: "맑은 하늘",
									desc: "구름이 없어야 해요",
									good: "청명한 날씨",
									bad: "흐리거나 비오는 날 ❌",
								},
								{
									icon: "🌃",
									title: "어두운 장소",
									desc: "도시 불빛이 없는 곳",
									good: "시골, 산, 바다",
									bad: "도심 근처는 어려워요",
								},
								{
									icon: "💨",
									title: "깨끗한 공기",
									desc: "습도가 낮고 맑은 날",
									good: "습도 60% 이하",
									bad: "미세먼지, 안개 ❌",
								},
							].map((item) => (
								<div key={item.title} style={{
									padding: "20px",
									backgroundColor: "rgba(255,255,255,0.05)",
									borderRadius: "16px",
								}}>
									<div style={{ fontSize: "36px", marginBottom: "12px" }}>{item.icon}</div>
									<div style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>
										{item.title}
									</div>
									<div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "12px" }}>
										{item.desc}
									</div>
									<div style={{ fontSize: "13px", color: "#4ade80", marginBottom: "4px" }}>
										✓ {item.good}
									</div>
									<div style={{ fontSize: "13px", color: "#f87171" }}>
										✗ {item.bad}
									</div>
								</div>
							))}
						</div>

						<div style={{
							marginTop: "24px",
							padding: "20px",
							backgroundColor: "rgba(34, 197, 94, 0.1)",
							borderRadius: "12px",
							border: "1px solid rgba(34, 197, 94, 0.3)",
						}}>
							<div style={{ fontSize: "16px", fontWeight: 700, color: "#4ade80", marginBottom: "8px" }}>
								🎯 최적의 조건 요약
							</div>
							<div style={{ fontSize: "15px", color: "#e2e8f0" }}>
								<strong>여름철 + 신월 + 맑은 날 + 어두운 장소</strong> = 완벽한 은하수! 🌌
							</div>
						</div>
					</div>
				</section>

				{/* Section 4: 관측 장소 */}
				<section id="section-3" style={{ marginBottom: "48px" }}>
					<div style={{
						backgroundColor: "rgba(51, 65, 85, 0.4)",
						borderRadius: "20px",
						padding: "32px",
					}}>
						<h2 style={{
							fontSize: "28px",
							fontWeight: 700,
							color: "#fff",
							marginBottom: "20px",
							display: "flex",
							alignItems: "center",
							gap: "12px",
						}}>
							<span>📍</span> 추천 관측 장소
						</h2>

						<p style={{ fontSize: "17px", color: "#cbd5e1", marginBottom: "24px", lineHeight: 1.8 }}>
							광공해가 적은 곳일수록 은하수가 잘 보여요. 
							<strong style={{ color: "#60a5fa" }}> 도심에서 1시간 이상</strong> 떨어진 곳을 추천해요.
						</p>

						<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
							{[
								{ type: "🏔️ 산간 지역", places: "태백산, 소백산, 지리산, 덕유산", tip: "고도가 높을수록 좋아요" },
								{ type: "🌊 해안 지역", places: "영덕 해변, 강릉 정동진, 제주 동부", tip: "바다 쪽은 불빛이 없어요" },
								{ type: "🏝️ 섬 지역", places: "울릉도, 흑산도, 거문도", tip: "최고의 밤하늘을 볼 수 있어요" },
								{ type: "🔭 천문대 주변", places: "영양 반딧불이천문대, 무주 반디별천문과학관", tip: "어두운 환경이 보장되어 있어요" },
							].map((item) => (
								<div key={item.type} style={{
									padding: "16px 20px",
									backgroundColor: "rgba(255,255,255,0.05)",
									borderRadius: "12px",
									display: "flex",
									alignItems: "center",
									gap: "16px",
								}}>
									<div style={{ fontSize: "24px", minWidth: "120px" }}>{item.type}</div>
									<div style={{ flex: 1 }}>
										<div style={{ fontSize: "15px", color: "#e2e8f0" }}>{item.places}</div>
										<div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>💡 {item.tip}</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Section 5: 촬영 팁 */}
				<section id="section-4" style={{ marginBottom: "48px" }}>
					<div style={{
						backgroundColor: "rgba(51, 65, 85, 0.4)",
						borderRadius: "20px",
						padding: "32px",
					}}>
						<h2 style={{
							fontSize: "28px",
							fontWeight: 700,
							color: "#fff",
							marginBottom: "20px",
							display: "flex",
							alignItems: "center",
							gap: "12px",
						}}>
							<span>📷</span> 은하수 촬영 팁
						</h2>

						<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
							{/* 필수 장비 */}
							<div>
								<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fbbf24", marginBottom: "12px" }}>
									🎒 필수 장비
								</h3>
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
									{[
										{ item: "카메라", desc: "수동 설정 가능한 DSLR/미러리스" },
										{ item: "삼각대", desc: "튼튼하고 안정적인 것" },
										{ item: "광각 렌즈", desc: "14-24mm 추천" },
										{ item: "리모컨/타이머", desc: "흔들림 방지용" },
									].map((equip) => (
										<div key={equip.item} style={{
											padding: "12px 16px",
											backgroundColor: "rgba(255,255,255,0.05)",
											borderRadius: "10px",
										}}>
											<div style={{ fontSize: "15px", fontWeight: 600, color: "#e2e8f0" }}>{equip.item}</div>
											<div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>{equip.desc}</div>
										</div>
									))}
								</div>
							</div>

							{/* 카메라 설정 */}
							<div>
								<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fbbf24", marginBottom: "12px" }}>
									⚙️ 추천 카메라 설정
								</h3>
								<div style={{
									padding: "20px",
									backgroundColor: "rgba(255,255,255,0.05)",
									borderRadius: "12px",
								}}>
									<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", textAlign: "center" }}>
										<div>
											<div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "8px" }}>조리개</div>
											<div style={{ fontSize: "24px", fontWeight: 700, color: "#60a5fa" }}>f/2.8</div>
											<div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>가능한 밝게</div>
										</div>
										<div>
											<div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "8px" }}>ISO</div>
											<div style={{ fontSize: "24px", fontWeight: 700, color: "#4ade80" }}>3200-6400</div>
											<div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>노이즈와 타협</div>
										</div>
										<div>
											<div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "8px" }}>셔터 속도</div>
											<div style={{ fontSize: "24px", fontWeight: 700, color: "#f472b6" }}>15-25초</div>
											<div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>500 법칙 참고</div>
										</div>
									</div>
								</div>
							</div>

							{/* 500 법칙 */}
							<div style={{
								padding: "20px",
								backgroundColor: "rgba(59, 130, 246, 0.1)",
								borderRadius: "12px",
								border: "1px solid rgba(59, 130, 246, 0.3)",
							}}>
								<div style={{ fontSize: "16px", fontWeight: 700, color: "#60a5fa", marginBottom: "8px" }}>
									📐 500 법칙이란?
								</div>
								<div style={{ fontSize: "15px", color: "#e2e8f0", marginBottom: "8px" }}>
									별이 점으로 찍히는 최대 노출 시간을 계산하는 공식이에요.
								</div>
								<div style={{
									padding: "12px",
									backgroundColor: "rgba(0,0,0,0.2)",
									borderRadius: "8px",
									fontFamily: "monospace",
									fontSize: "16px",
									color: "#fbbf24",
									textAlign: "center",
								}}>
									최대 노출 시간(초) = 500 ÷ 렌즈 초점거리(mm)
								</div>
								<div style={{ fontSize: "14px", color: "#94a3b8", marginTop: "12px" }}>
									예: 24mm 렌즈 → 500 ÷ 24 = <strong style={{ color: "#4ade80" }}>약 20초</strong>
								</div>
							</div>

							{/* 촬영 팁 */}
							<div>
								<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fbbf24", marginBottom: "12px" }}>
									💡 촬영 팁
								</h3>
								<ul style={{
									margin: 0,
									paddingLeft: "24px",
									fontSize: "15px",
									color: "#cbd5e1",
									lineHeight: 2,
								}}>
									<li>현장 도착 후 <strong style={{ color: "#60a5fa" }}>30분 정도</strong> 눈을 어둠에 적응시키세요</li>
									<li><strong style={{ color: "#60a5fa" }}>수동 초점</strong>으로 무한대에 맞추세요 (라이브뷰로 밝은 별 확대)</li>
									<li><strong style={{ color: "#60a5fa" }}>RAW 포맷</strong>으로 촬영하면 후보정이 쉬워요</li>
									<li>지상 풍경을 함께 넣으면 더 멋진 사진이 돼요 🏔️</li>
									<li>여분의 <strong style={{ color: "#60a5fa" }}>배터리와 메모리카드</strong>를 꼭 챙기세요</li>
								</ul>
							</div>
						</div>
					</div>
				</section>

				{/* 마무리 */}
				<div style={{
					textAlign: "center",
					padding: "40px",
					backgroundColor: "rgba(51, 65, 85, 0.4)",
					borderRadius: "20px",
				}}>
					<div style={{ fontSize: "48px", marginBottom: "16px" }}>🌟</div>
					<div style={{ fontSize: "22px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
						이제 은하수를 만나러 떠나보세요!
					</div>
					<div style={{ fontSize: "16px", color: "#94a3b8" }}>
						지도 페이지에서 최적의 관측 조건을 확인하세요 ✨
					</div>
				</div>
			</div>
		</div>
	);
}
