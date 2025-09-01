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
