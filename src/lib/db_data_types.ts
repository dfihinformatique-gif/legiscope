export type Legiarti = {
	id: number
	bloc_textuel: string | null
	legi_id: string
	date_debut: string // ISO string (ex: "2025-09-01")
	date_fin: string // idem
	num: string | null
	article_type: number | null
	url: string | null
	nota: string | null
	etat: number | null
}

export interface DateRange {
	start: Date | null
	end: Date | null
	startInclusive: boolean // true si [ (inclus), false si ( (exclus)
	endInclusive: boolean // true si ] (inclus), false si ) (exclus)
}

export interface SctaRow {
	id: bigint
	chemin: string
	num: string | null
	date_debut: Date | null
	date_fin: Date | null
	titre: string | null
	etat: number | null
	url: string | null
	cid: string | null
	niveau: number | null
	origine: string | null
	type_objet: "scta" | "art"
	ordinalite: number | null
	tri_hierarchique: string | null
	parents_valid_period: string | null
	invalid_sections: string
	dernier_segment: string | null
}

export interface TocDataRow {
	id: bigint
	chemin: string
	num: string | null
	date_debut: Date | null
	date_fin: Date | null
	titre: string | null
	etat: number | null
	url: string | null
	cid: string | null
	niveau: number | null
	origine: string | null
	type_objet: "art" | "scta"
	ordinalite: number | null
	tri_hierarchique: string | null
	parents_valid_period: DateRange | null
	dernier_segment: string | null
	invalid_sections: string
}
export type TocData = TocDataRow[]

export type VersionArticle = {
	legi_id_lien: string
	debut: string
	fin: string
}

export type ArticleInfo = {
	article: Legiarti | undefined
	text: string | undefined
	textTitle: string | undefined
	versions: VersionArticle[] | undefined
	jorfTextDatePubli: string | undefined
}

export interface HistoryDataRow {
	cidtexte: string
	titre_texte: string
	article_jorf: string | null
	num: string | null
	typelien: string
	debut: Date | null
}
export type HistoryData = HistoryDataRow[]
