export function match(param) {
	const isoDateRegex = /^(\d{4})-(\d{2})-(\d{2})$/
	const match = param.match(isoDateRegex)

	if (!match) return false

	const [, yearStr, monthStr, dayStr] = match
	const year = parseInt(yearStr, 10)
	const month = parseInt(monthStr, 10)
	const day = parseInt(dayStr, 10)
	const date = new Date(year, month - 1, day)

	return (
		date.getFullYear() == year &&
		date.getMonth() == month - 1 &&
		date.getDate() == day
	)
}
