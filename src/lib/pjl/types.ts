export type PjlPreviewMode = "single_action_diff"

export type PjlSourceBlock = {
	blockText: string
	blockHtml?: string
}

export type PjlArticleBlock = {
	pjlArticleLabel: string
	blockHtml: string
	blockText: string
}

export type PjlPreviewRequest = PjlSourceBlock & {
	articleId: string
	mode: PjlPreviewMode
	directiveId: string
}

export type PjlPreviewRequestEntry = PjlPreviewRequest & {
	href?: string
}
