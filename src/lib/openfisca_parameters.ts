import customizationsUnknown from "@leximpact/socio-fiscal-openfisca-json/custom/customizations.json"
import rootParameterUnknown from "@leximpact/socio-fiscal-openfisca-json/editable_processed_parameters.json"
import unitsUnknown from "@leximpact/socio-fiscal-openfisca-json/units.yaml?raw"
import YAML from "js-yaml"

import variablesSummariesUnknown from "@leximpact/socio-fiscal-openfisca-json/variables_summaries.json"
import {
	getUnitAtDate as getUnitAtDateOriginal,
	improveParameter,
	ParameterClass,
	scaleByInstantFromBrackets,
	type AmountBracketAtInstant,
	type ConstantUnit,
	type CustomizationByName,
	type LinearAverageRateScaleParameter,
	type NodeParameter,
	type Parameter,
	type RateBracketAtInstant,
	type Reference,
	type ReferencesByInstant,
	type ScaleAtInstant,
	type ScaleParameter,
	type SingleAmountScaleParameter,
	type Unit,
	type ValueAtInstant,
	type ValueParameter,
	type VariableByName,
} from "@openfisca/json-model"

import { ToWords } from "to-words"

const units = Object.values(
	YAML.load(unitsUnknown) as unknown as Record<string, unknown>,
) as Unit[]
const unitByName = Object.fromEntries(units.map((unit) => [unit.name, unit]))

improveParameter(rootParameterUnknown as NodeParameter)
export const rootParameter = rootParameterUnknown as NodeParameter
export const variablesSummaries =
	variablesSummariesUnknown as unknown as VariableByName
export const customizations =
	customizationsUnknown as unknown as CustomizationByName

function extractLegalIdentifiers(url: string): string[] {
	const identifierRegex = /(LEGIARTI\d+|JORFART\d+|LEGITEXT\d+|JORFTEXT\d+)/g
	return url.match(identifierRegex) || []
}

export function getUnitAtDate(
	name: string | undefined | null,
	date: string,
): Unit | undefined {
	return getUnitAtDateOriginal(
		unitByName as { [name: string]: Unit },
		name,
		date,
	)
}

function filterAfterDate(
	obj: { [instant: string]: unknown },
	afterDate: string,
): typeof obj {
	const result: { [instant: string]: unknown } = {}
	for (const instant in obj) {
		if (instant <= afterDate) {
			result[instant] = obj[instant]
		}
	}
	return result as typeof obj
}

function* iterParameterPjlNumberValuesWithUnits(
	parameter: ValueParameter | ScaleParameter | undefined | null,
	pjlDate: string,
): Generator<{ unit: ConstantUnit | undefined; value: number }, void, unknown> {
	if (parameter == null) {
		return
	}
	if (parameter.class === ParameterClass.Scale) {
		const scaleByInstant = scaleByInstantFromBrackets(parameter.brackets)
		let dateLimitForParameterValues = pjlDate
		if (
			parameter.file_path?.startsWith(
				"openfisca_france/parameters/impot_revenu/",
			)
		) {
			const pjlTsDate = new Date(pjlDate)
			pjlTsDate.setFullYear(pjlTsDate.getFullYear() - 1)
			dateLimitForParameterValues = pjlTsDate.toISOString().split("T")[0]
		}
		const latestInstantScaleCouple = Object.entries(
			filterAfterDate(scaleByInstant, dateLimitForParameterValues),
		).sort(([instant1], [instant2]) => instant2.localeCompare(instant1))[0]

		if (latestInstantScaleCouple === undefined) {
			return
		}

		const [latestInstant, latestScale] = latestInstantScaleCouple as [
			string,
			ScaleAtInstant,
		]
		const showScaleAsValue =
			latestScale.length === 1 &&
			(latestScale![0].threshold === "expected" ||
				latestScale![0].threshold.value === 0)
		const amountUnit = getUnitAtDate(
			(parameter as SingleAmountScaleParameter).amount_unit,
			latestInstant,
		)
		const rateUnit = getUnitAtDate(
			(parameter as LinearAverageRateScaleParameter).rate_unit,
			latestInstant,
		)
		const thresholdUnit = getUnitAtDate(parameter.threshold_unit, latestInstant)
		for (const bracket of latestScale) {
			const threshold = bracket.threshold
			if (
				threshold !== "expected" &&
				threshold.value !== null &&
				!showScaleAsValue
			) {
				yield {
					unit: thresholdUnit as ConstantUnit,
					value: threshold.value,
				}
			}

			const amount = (bracket as AmountBracketAtInstant).amount
			if (
				amount !== undefined &&
				amount !== "expected" &&
				amount.value !== null
			) {
				yield {
					unit: amountUnit as ConstantUnit,
					value: amount.value,
				}
			}

			const base = (bracket as RateBracketAtInstant).rate
			if (base !== undefined && base !== "expected" && base.value !== null) {
				yield {
					unit: thresholdUnit as ConstantUnit,
					value: base.value,
				}
			}

			const rate = (bracket as RateBracketAtInstant).rate
			if (rate !== undefined && rate !== "expected" && rate.value !== null) {
				yield {
					unit: rateUnit as ConstantUnit,
					value: rate.value,
				}
			}
		}
	} else if (parameter.class === ParameterClass.Value) {
		let dateLimitForParameterValues = pjlDate
		if (
			parameter.file_path?.startsWith(
				"openfisca_france/parameters/impot_revenu/",
			)
		) {
			const pjlTsDate = new Date(pjlDate)
			pjlTsDate.setFullYear(pjlTsDate.getFullYear() - 1)
			dateLimitForParameterValues = pjlTsDate.toISOString().split("T")[0]
		}
		const latestInstantValueCouple = Object.entries(
			filterAfterDate(parameter.values, dateLimitForParameterValues),
		).sort(([instant1], [instant2]) => instant2.localeCompare(instant1))[0]

		if (latestInstantValueCouple === undefined) {
			return
		}

		if (latestInstantValueCouple === undefined) {
			return
		}
		const [latestInstant, latestValue] = latestInstantValueCouple as [
			string,
			ValueAtInstant,
		]
		if (latestValue === "expected" || typeof latestValue.value !== "number") {
			return
		}
		yield {
			unit: getUnitAtDate(parameter.unit, latestInstant) as ConstantUnit,
			value: latestValue.value,
		}
	}
}

const numberFormatter = new Intl.NumberFormat("fr-FR").format
const numberToWords = new ToWords({ localeCode: "fr-FR" })

function escapeRegex(s: string): string {
	return s.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&")
}

export function getSimplifiedCoordOfValuesToHighlight(
	contenu: string,
	parameter: ValueParameter | ScaleParameter,
	pjlDate: string,
): { start: number; stop: number }[] {
	const result: { start: number; stop: number }[] = []
	for (const { unit, value } of iterParameterPjlNumberValuesWithUnits(
		parameter,
		pjlDate,
	)) {
		for (const stringValue of [
			...(unit === undefined || unit.ratio
				? [
						numberFormatter(value * 100).replace(" ", " "),
						numberToWords.convert(value * 100).toLowerCase(),
					]
				: []),
			...(unit?.ratio !== true
				? [
						numberFormatter(value).replace(" ", " "),
						numberToWords.convert(value).toLowerCase(),
					]
				: []),
		]) {
			if (stringValue === null) {
				continue
			}

			// if (
			// 	parameter.name ===
			// 	"impot_revenu.calcul_impot_revenu.plaf_qf.decote.taux"
			// )
			// 	console.log({ stringValue, unit })

			const stringValueToSearch = new RegExp(
				String.raw`(^|(?<!\d)\s+|[>\(\[])${escapeRegex(
					stringValue,
				)}(?!\s*\d)([\.<\)\]]|,\s+|\s+|$)`,
				"g",
			)

			let match: RegExpExecArray | null

			while ((match = stringValueToSearch.exec(contenu)) !== null) {
				// if (
				// 	parameter.name ===
				// 		"impot_revenu.calcul_revenus_imposables.abat_rni.enfant_marie" &&
				// 	linkCount === 16
				// )
				const start =
					match[0].startsWith("\n") || match[0].startsWith(" ")
						? match.index + 1
						: match.index
				const stop =
					match[0].endsWith("\n") || match[0].endsWith(" ")
						? match.index + match[0].length - 1
						: match.index + match[0].length
				result.push({
					start: start,
					stop: stop,
				})
			}

			// if (contenuHiglighted !== contenu) {
			// 	console.log("modified!", contenu)
			// 	contenu = contenuHiglighted
			// 	break
			// }
		}
	}

	return result
		.filter(
			(item, index, self) =>
				index ===
				self.findIndex((r) => r.start === item.start && r.stop === item.stop),
		)
		.sort((a, b) => a.start - b.start)
}

export function collectParameterReferences(
	rootParameter: NodeParameter,
): Map<string, Array<ValueParameter | ScaleParameter>> {
	const referenceMap = new Map<string, Array<ValueParameter | ScaleParameter>>()

	/**
	 * Ajoute une référence au dictionnaire avec le paramètre associé
	 */
	function addReferenceToMap(reference: Reference, parameter: Parameter): void {
		// Extrait les identifiants légaux de l'URL si elle existe
		const urlField = "href" in reference ? reference.href : undefined
		if (urlField && typeof urlField === "string") {
			const identifiers = extractLegalIdentifiers(urlField)
			identifiers.forEach((identifier) => {
				if (!referenceMap.has(identifier)) {
					referenceMap.set(identifier, [])
				}
				if (
					parameter.class !== "Node" &&
					!referenceMap.get(identifier)!.includes(parameter)
				)
					referenceMap.get(identifier)!.push(parameter)
			})
		}
	}

	/**
	 * Traite les références d'un objet ReferencesByInstant
	 */
	function processReferencesByInstant(
		referencesByInstant: ReferencesByInstant,
		parameter: Parameter,
	): void {
		Object.values(referencesByInstant).forEach((instantReferences) => {
			if (Array.isArray(instantReferences)) {
				instantReferences.forEach((ref) => addReferenceToMap(ref, parameter))
			}
		})
	}

	/**
	 * Traite les références dans une valeur qui peut contenir des références
	 */
	function processValueWithReferences(
		value: unknown,
		parameter: Parameter,
	): void {
		if (
			value &&
			typeof value === "object" &&
			value !== null &&
			"reference" in value
		) {
			const valueObj = value as { reference?: Reference[] }
			if (Array.isArray(valueObj.reference)) {
				valueObj.reference.forEach((ref) => addReferenceToMap(ref, parameter))
			}
		}
	}

	/**
	 * Parcourt récursivement un paramètre et collecte ses références
	 */
	function walkParameter(parameter: Parameter): void {
		// Traite les différents types de références du paramètre

		// Références principales
		if (parameter.reference) {
			processReferencesByInstant(parameter.reference, parameter)
		}

		// Références d'inflateur
		if (parameter.inflator_reference) {
			processReferencesByInstant(parameter.inflator_reference, parameter)
		}

		// Références de réévaluation
		if (parameter.revaluation_reference) {
			processReferencesByInstant(parameter.revaluation_reference, parameter)
		}

		// Notes (qui sont aussi des références)
		if (parameter.notes) {
			processReferencesByInstant(parameter.notes, parameter)
		}

		// Pour les paramètres de valeur, traite les références dans les valeurs
		if ("values" in parameter && parameter.values) {
			Object.values(parameter.values).forEach((valueAtInstant) => {
				processValueWithReferences(valueAtInstant, parameter)
			})
		}

		// Pour les paramètres d'échelle, traite les références dans les brackets
		if ("brackets" in parameter && parameter.brackets) {
			parameter.brackets.forEach((bracket) => {
				// Traite les références dans les seuils (threshold)
				if (bracket.threshold) {
					Object.values(bracket.threshold).forEach((thresholdValue) => {
						processValueWithReferences(thresholdValue, parameter)
					})
				}

				// Traite les références dans les montants (amount)
				if ("amount" in bracket && bracket.amount) {
					Object.values(bracket.amount).forEach((amountValue) => {
						processValueWithReferences(amountValue, parameter)
					})
				}

				// Traite les références dans les taux (rate)
				if ("rate" in bracket && bracket.rate) {
					Object.values(bracket.rate).forEach((rateValue) => {
						processValueWithReferences(rateValue, parameter)
					})
				}

				// Traite les références dans la base (base)
				if ("base" in bracket && bracket.base) {
					Object.values(bracket.base).forEach((baseValue) => {
						processValueWithReferences(baseValue, parameter)
					})
				}
			})
		}

		// Si c'est un NodeParameter, parcourt récursivement ses enfants
		if (
			parameter.class === "Node" &&
			"children" in parameter &&
			parameter.children
		) {
			Object.values(parameter.children).forEach((child) => {
				walkParameter(child)
			})
		}
	}

	// Commence le parcours avec le paramètre racine
	walkParameter(rootParameter)

	return referenceMap
}

export function getParameter(
	rootParameter: Parameter,
	name: string,
): Parameter | undefined {
	let parameter = rootParameter
	for (const id of name.split(".")) {
		const children =
			parameter.class === ParameterClass.Node ? parameter.children : undefined
		if (children === undefined) {
			return undefined
		}
		parameter = children[id]
		if (parameter === undefined) {
			return undefined
		}
	}
	return parameter
}

export const parameterReferences = collectParameterReferences(rootParameter)

export function findVariablesByParameter(parameterName: string): string[] {
	const result: string[] = []
	for (const [varName, variable] of Object.entries(variablesSummaries)) {
		if (!variable.formulas) {
			continue
		}

		for (const formula of Object.values(variable.formulas)) {
			if (formula?.parameters?.includes(parameterName)) {
				result.push(varName)
				break
			}
		}
	}

	const variablesToExclude = new Set<string>()
	for (const varName of result) {
		const variable = variablesSummaries[varName]
		if (variable.formulas) {
			for (const formula of Object.values(variable.formulas)) {
				if (formula?.variables) {
					formula.variables.forEach((v) => variablesToExclude.add(v))
				}
			}
		}
	}

	return result
		.filter((varName) => !variablesToExclude.has(varName))
		.sort((a, b) => {
			const aInCustomization = a in customizations
			const bInCustomization = b in customizations

			if (aInCustomization && !bInCustomization) return -1
			if (!aInCustomization && bInCustomization) return 1
			return 0
		})
}

export function encodeParametersToVariables(
	params: Record<string, string[]>,
): string {
	const json = JSON.stringify(params)
	const bytes = new TextEncoder().encode(json)
	const binString = Array.from(bytes, (byte) =>
		String.fromCodePoint(byte),
	).join("")
	return btoa(binString)
}

export function decodeParametersToVariables(
	encoded: string,
): Record<string, string[]> | null {
	try {
		const binString = atob(encoded)
		const bytes = Uint8Array.from(binString, (char) => char.codePointAt(0)!)
		const json = new TextDecoder().decode(bytes)

		return JSON.parse(json) as Record<string, string[]>
	} catch (error) {
		console.error("Erreur décodage:", error)
		return null
	}
}
