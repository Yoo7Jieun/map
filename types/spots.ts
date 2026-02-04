/**
 * 관측 명소 관련 타입 정의
 */

export interface SpotData {
	id: string;
	name: string;
	name_en: string;
	latitude: number;
	longitude: number;
	best_season: string;
	features: string[];
	// 국내 전용
	province?: string;
	city?: string;
	district?: string;
	address?: string | null;
	full_address?: string;
	address_type?: string;
	// 해외 전용
	country?: string;
	region?: string;
}

export interface RegionData {
	region_name: string;
	region_code: string;
	spots: SpotData[];
}

export interface SpotsJsonData {
	south_korea: Record<string, RegionData>;
	world: Record<string, RegionData>;
}
