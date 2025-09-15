export function copyToClipboard(
	text: string,
	successCallback?: () => void,
	failCallback?: () => void,
) {
	navigator.permissions
		.query({ name: "clipboard-write" as PermissionName })
		.then((result) => {
			if (result.state === "granted" || result.state === "prompt") {
				navigator.clipboard.writeText(text).then(successCallback, failCallback)
			}
		})
		.catch(() => {
			// Firefox & Safari don't support "clipboard-write" permission.
			navigator?.clipboard
				?.writeText?.(text)
				.then(successCallback, failCallback)
		})
}
