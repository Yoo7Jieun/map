import SunCalc from "suncalc";

export type Astro = {
	moonAltitudeDeg: number | null;
	moonIlluminationPct: number | null;
	moonPhaseName: string | null;
};

function phaseName(fraction: number, angle: number): string {
	// fraction: illuminated fraction (0 new, 0.5 full), angle: phase angle (radians)
	// Rough classification
	if (fraction < 0.03) return "New Moon";
	if (fraction < 0.23) return angle < 0 ? "Waxing Crescent" : "Waning Crescent";
	if (fraction < 0.27) return "First Quarter";
	if (fraction < 0.48) return angle < 0 ? "Waxing Gibbous" : "Waning Gibbous";
	if (fraction < 0.52) return "Full Moon";
	if (fraction < 0.73) return angle < 0 ? "Waning Gibbous" : "Waxing Gibbous";
	if (fraction < 0.77) return "Last Quarter";
	return angle < 0 ? "Waning Crescent" : "Waxing Crescent";
}

export function computeAstro(lat: number, lon: number, date = new Date()): Astro {
	try {
		const moonPos = SunCalc.getMoonPosition(date, lat, lon);
		const illum = SunCalc.getMoonIllumination(date);
		const moonAltitudeDeg = moonPos.altitude * (180 / Math.PI);
		const moonIlluminationPct = +(illum.fraction * 100).toFixed(1);
		const moonPhaseName = phaseName(illum.fraction, illum.angle);
		return { moonAltitudeDeg, moonIlluminationPct, moonPhaseName };
	} catch (e) {
		return { moonAltitudeDeg: null, moonIlluminationPct: null, moonPhaseName: null };
	}
}
