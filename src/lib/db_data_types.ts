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

export interface CitationsDataRow {
	legi_id_cite: string
	date_debut_cite: string | null
	date_fin_cite: string | null
	num_cite: string | null
	article_type_cite: string | null
	etat_cite: string | null
	legi_id_citant: string
	date_debut_citant: string | null
	date_fin_citant: string | null
	num_citant: string | null
	article_type_citant: string | null
	etat_citant: string | null
	legitext_id_citant: string | null
	titre_text_citant: string | null
	article_citant_texte_nature: string | null
	article_citant_texte_nature_id: number | null
}
export type CitationsData = CitationsDataRow[]

export type VersionArticle = {
	legi_id_lien: string
	debut: string
	fin: string
}

export type ArticleInfo = {
	article: Legiarti | undefined
	articlePreviousVersion: Legiarti | undefined
	historyLinks: HistoryData | undefined
	text: string | undefined
	textTitle: string | undefined
	sectionTitle: string | undefined
	versions: VersionArticle[] | undefined
	jorfTextDatePubli: string | undefined
}

export interface HistoryDataRow {
	cidtexte: string
	titre_texte: string
	article_jorf: string | null
	num: string | null
	typelien: string
	date_publi: Date | null
}
export type HistoryData = HistoryDataRow[]

export interface HistoryByTextRow {
	cidtexte: string
	titre_texte: string
	articles_jorf: Array<{ id: string; num: string }>
	typelien: string
	date_publi: Date | null
}
export type HistoryByText = HistoryByTextRow[]

export function historyDataToHistoryByText(
	historyData: HistoryData,
): HistoryByText {
	const grouped = historyData.reduce(
		(acc, row) => {
			const key = `${row.cidtexte}_${row.typelien}`

			if (!acc[key]) {
				acc[key] = {
					cidtexte: row.cidtexte,
					titre_texte: row.titre_texte,
					articles_jorf: [],
					typelien: row.typelien,
					date_publi: row.date_publi,
				}
			}

			if (row.article_jorf) {
				acc[key].articles_jorf.push({
					id: row.article_jorf || "",
					num: row.num || "",
				})
			}

			return acc
		},
		{} as Record<string, HistoryByTextRow>,
	)

	return Object.values(grouped)
}
