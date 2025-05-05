import type { LegiArticle } from "@tricoteuses/legifrance"
import { writable } from "svelte/store"

export const displayedArticle = writable<LegiArticle | null>(null)
