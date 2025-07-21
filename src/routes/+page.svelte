<script lang="ts">
	import {
		activePanelMobile,
		isMobilePhone,
		showBillDesktop,
		showLawDesktop,
	} from "$lib/navStore"
</script>

{#if !$isMobilePhone}
	<div class="fixed flex min-h-full w-full flex-row overflow-hidden">
		<div
			class={`z-10 origin-right overflow-y-auto shadow-xl transition-all duration-300 ${
				$showBillDesktop && $showLawDesktop
					? "w-1/2"
					: $showBillDesktop
						? "w-full"
						: "pointer-events-none w-0 opacity-0"
			}`}
		>
			Choisir un projet de loi
		</div>

		<div
			class={`overflow-y-auto bg-blue-100 transition-all duration-300 ${
				$showLawDesktop && $showBillDesktop
					? "w-1/2"
					: $showLawDesktop
						? "w-full"
						: "pointer-events-none w-0 opacity-0"
			}`}
		>
			&#x3C;-----
		</div>
	</div>
{:else}
	<div class="fixed flex min-h-full w-full flex-row overflow-hidden">
		{#if $activePanelMobile === "bill"}
			<div class="z-10 h-screen w-full overflow-y-auto shadow-md">
				Choisir un projet de loi
			</div>
		{:else if $activePanelMobile === "law"}
			<div class="h-screen w-full overflow-y-auto bg-blue-100">&#x3C;-----</div>
		{/if}
	</div>
{/if}
