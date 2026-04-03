import {
	buildDirectivePreviewId,
	buildDirectivesFromSourceBlock,
	type ActionDirectiveWithHtml,
	type BuildDirectivesResult,
} from "$lib/pjl/projection"
import type { PjlPreviewRequest, PjlSourceBlock } from "$lib/pjl/types"

export function buildDirectivesFromPjlBlock(
	block: PjlSourceBlock,
	articleNum: string | null | undefined,
): BuildDirectivesResult {
	return buildDirectivesFromSourceBlock(
		block.blockText,
		block.blockHtml,
		articleNum,
	)
}

export function findDirectiveForPreviewRequest(
	request: PjlPreviewRequest,
	articleNum: string | null | undefined,
): ActionDirectiveWithHtml | undefined {
	const { directives } = buildDirectivesFromPjlBlock(request, articleNum)
	return directives.find(
		(candidate) => buildDirectivePreviewId(candidate) === request.directiveId,
	)
}
