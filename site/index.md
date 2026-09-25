---
layout: page
title: Components for the HTML your server already sends
titleTemplate: Nemesia
---

<script setup>
const notes = [
	{
		line: 2,
		label: 'Global selectors',
		problem: 'A global selector grabs every tab on the page. Add a second tab group and the two switch each other.',
		fix: 'Nemesia: each instance sees only its own elements.'
	},
	{
		line: 3,
		label: 'Classes as hooks',
		problem: 'Styling classes double as JavaScript hooks. Rename one for CSS and the logic breaks.',
		fix: 'Nemesia: behavior hooks live in <code>data-</code> attributes.'
	},
	{
		line: 10,
		label: 'Missing panel',
		problem: 'One panel short? It throws on click, long after the page has loaded.',
		fix: 'Nemesia: a missing panel is reported on load.'
	},
	{
		line: 15,
		label: 'Markup loaded later',
		problem: 'Markup loaded later stays dead until the setup runs again, and listeners can double.',
		fix: 'Nemesia: new markup mounts itself.'
	},
]
</script>

<svg class="nm-sprite" aria-hidden="true">
	<symbol id="nemesia-flower" viewBox="0 0 256 256">
		<path d="M114.1 126.6C136.3 116.7 145.5 89.1 134.7 64.9C124 40.6 97.2 29 75 38.9C52.8 48.8 43.6 76.4 54.3 100.7C65.1 124.9 91.9 136.5 114.1 126.6Z" style="fill: color-mix(in srgb, var(--petal) 18%, #fff)" />
		<path d="M135.8 64.4C135.1 64.7 134.4 65 133.6 65.3C135.4 69.7 136.6 74.3 137.2 78.9C139.6 97.4 129.9 117.2 113 124.1C91.8 133.6 66 120.3 57.3 99.3C57.3 99.3 57.3 99.3 57.3 99.3C47.5 78.9 54.9 50.8 76.1 41.4C92.6 33.4 113.8 39.4 125.9 53.6C129 57.1 131.6 61.1 133.6 65.3C134.4 65 135.1 64.7 135.8 64.4C134 59.8 131.4 55.5 128.3 51.6C116.3 35.9 93.1 27.9 73.9 36.4C49.2 46.6 40.4 78.9 51.4 102C51.4 102 51.4 102 51.4 102C61.2 125.6 91.1 140.6 115.2 129.1C134.4 120.5 143.9 98 140.3 78.5C139.5 73.6 138 68.8 135.8 64.4ZM133.6 65.3L135.8 64.4L133.6 65.3Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M106.3 113.9C106.5 114 106.6 114 106.8 113.9C107 113.9 107.2 113.8 107.2 113.6C107.3 113.4 107.4 113.3 107.3 113.1C107.3 112.9 107.2 112.7 107 112.6C107 112.6 107 112.6 107 112.6C106.2 112.1 105.3 111.5 104.5 110.9C97 105.6 90 99.7 83.8 93C77.6 86.4 72.2 79.1 67.7 71.1C67.2 70.2 66.7 69.3 66.2 68.4C66.1 68.2 66 68.1 65.8 68C65.6 68 65.4 68 65.3 68.1C65.1 68.1 65 68.3 64.9 68.4C64.8 68.6 64.8 68.8 64.9 69C64.9 69 64.9 69 64.9 69C65.2 69.9 65.6 70.9 66 71.9C69.4 80.6 74.6 88.7 81 95.6C87.5 102.5 95.2 108.2 103.5 112.5C104.4 113 105.4 113.4 106.3 113.9Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M112 110C112.2 110.2 112.3 110.2 112.5 110.2C112.7 110.2 112.9 110.2 113 110.1C113.1 109.9 113.2 109.8 113.2 109.6C113.2 109.4 113.2 109.2 113.1 109.1C112.4 108.3 111.8 107.5 111.2 106.6C105.8 99.3 101.2 91.4 97.7 83C94.1 74.7 91.6 65.9 89.8 56.9C89.6 55.9 89.4 54.9 89.3 53.9C89.2 53.7 89.1 53.5 89 53.4C88.8 53.3 88.7 53.3 88.5 53.3C88.3 53.3 88.1 53.4 88 53.5C87.9 53.7 87.8 53.8 87.8 54C87.8 54 87.8 54 87.8 54C87.9 55.1 87.9 56.1 88 57.1C88.5 66.5 90.5 75.8 94.2 84.5C97.9 93.2 103.2 101.2 109.8 107.9C110.5 108.6 111.3 109.3 112 110Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M180.4 40C158.7 29 131.4 39.1 119.4 62.8C107.3 86.4 115.1 114.5 136.7 125.5C158.4 136.6 185.7 126.4 197.7 102.8C209.8 79.1 202 51 180.4 40Z" style="fill: color-mix(in srgb, var(--petal) 18%, #fff)" />
		<path d="M118.3 62.2C119 62.6 119.7 62.9 120.4 63.3C122.6 59.1 125.4 55.3 128.7 51.9C141.5 38.3 163.1 33.2 179.3 42.1C200.2 52.6 206.1 81.5 195.1 101.4C185.1 121.9 158.4 133.4 138.2 122.7C122 114.7 113.6 95.1 116.5 76.7C117.2 72.2 118.5 67.6 120.4 63.3C119.7 62.9 119 62.6 118.3 62.2C115.8 66.5 113.9 71.1 112.7 76C107.7 95.3 116.2 119 135.3 128.4C135.3 128.4 135.3 128.4 135.3 128.4C159.1 141 189.6 127.1 200.4 104.1C212.4 81.7 205.3 49.3 181.4 37.9C162.9 28.4 139.5 35 126.5 49.9C123.2 53.6 120.4 57.8 118.3 62.2ZM120.4 63.3L118.3 62.2L120.4 63.3Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M138 111.1C137.9 111.2 137.8 111.4 137.9 111.6C137.9 111.8 137.9 111.9 138.1 112.1C138.2 112.2 138.4 112.2 138.6 112.2C138.8 112.2 138.9 112.2 139.1 112C139.1 112 139.1 112 139.1 112C139.8 111.3 140.6 110.6 141.3 109.9C147.9 103.2 153.2 95.2 156.9 86.5C160.6 77.8 162.6 68.5 163.1 59.1C163.2 58.1 163.2 57.1 163.3 56C163.3 55.8 163.2 55.7 163.1 55.5C163 55.4 162.8 55.3 162.6 55.3C162.4 55.3 162.2 55.3 162.1 55.4C162 55.5 161.9 55.7 161.8 55.9C161.7 56.9 161.5 57.9 161.3 58.9C159.5 67.9 157 76.7 153.4 85C149.9 93.4 145.3 101.3 139.9 108.6C139.3 109.5 138.6 110.3 138 111.1Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M143.8 112.9C143.6 113 143.5 113.2 143.4 113.4C143.4 113.6 143.4 113.7 143.5 113.9C143.6 114.1 143.7 114.2 143.9 114.2C144.1 114.3 144.3 114.3 144.5 114.2C144.5 114.2 144.5 114.2 144.5 114.2C145.4 113.7 146.3 113.3 147.3 112.8C155.6 108.5 163.3 102.9 169.8 96C176.3 89.2 181.4 81 184.9 72.4C185.3 71.4 185.7 70.4 186 69.4C186.1 69.3 186.1 69.1 186 68.9C186 68.7 185.8 68.6 185.7 68.5C185.5 68.4 185.3 68.4 185.1 68.5C185 68.6 184.8 68.7 184.7 68.9C184.7 68.9 184.7 68.9 184.7 68.9C184.2 69.8 183.8 70.6 183.2 71.5C178.7 79.5 173.2 86.8 167 93.4C160.8 100 153.8 105.9 146.3 111.2C145.4 111.8 144.6 112.4 143.8 112.9Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M70.6 98C96.8 101.7 115.4 123.8 112.1 147.4C108.8 171.1 84.8 187.2 58.5 183.5C32.3 179.8 13.7 157.7 17 134.1C20.3 110.4 44.3 94.3 70.6 98Z" style="fill: color-mix(in srgb, var(--petal) 18%, #fff)" />
		<path d="M113.3 147.6C112.5 147.5 111.7 147.4 110.9 147.3C111.3 142.6 110.8 138 109.6 133.6C104.7 115.8 87.9 103.5 70.1 101.1C70.1 101.1 70.1 101.1 70.1 101.1C48 97.4 22.9 111.8 20 134.5C16.2 157 36.2 178.4 58.9 181.2C76.8 184.2 97 176.5 106.3 160.3C108.6 156.3 110.2 151.9 110.9 147.3C111.7 147.4 112.5 147.5 113.3 147.6C112.7 152.5 111.2 157.3 108.8 161.7C99.5 179.5 77.9 188.6 58.2 185.8C33.6 183.3 10.2 160.2 14.1 133.7C17.3 107 46.2 90.6 71 94.8C71 94.8 71 94.8 71 94.8C91 97.3 109.8 112.7 113.3 132.8C114.3 137.7 114.2 142.8 113.3 147.6ZM110.9 147.3L113.3 147.6L110.9 147.3Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M98.8 147.5C99 147.4 99.1 147.3 99.2 147.1C99.3 146.9 99.3 146.7 99.2 146.6C99.2 146.4 99 146.2 98.9 146.2C98.7 146.1 98.5 146.1 98.4 146.1C98.4 146.1 98.4 146.1 98.4 146.1C97.4 146.4 96.4 146.6 95.4 146.8C86.7 148.8 77.9 150.1 69.1 150.2C60.2 150.4 51.4 149.5 42.7 147.6C41.7 147.3 40.7 147.1 39.8 146.9C39.6 146.8 39.4 146.8 39.2 146.9C39.1 147 38.9 147.2 38.9 147.3C38.8 147.5 38.8 147.7 38.9 147.9C39 148 39.1 148.1 39.3 148.2C39.3 148.2 39.3 148.2 39.3 148.2C40.2 148.6 41.2 149 42.1 149.4C50.7 152.6 59.9 154.2 69.1 154C78.4 153.9 87.5 151.9 96 148.6C96.9 148.2 97.9 147.9 98.8 147.5Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M97.5 140.7C97.7 140.7 97.9 140.6 98 140.4C98.1 140.3 98.1 140.1 98.1 139.9C98.1 139.7 98 139.6 97.8 139.5C97.7 139.3 97.5 139.3 97.3 139.3C97.3 139.3 97.3 139.3 97.3 139.3C96.3 139.4 95.3 139.4 94.4 139.5C85.5 139.8 76.7 139.1 68.1 137.3C59.5 135.5 51.2 132.6 43 128.9C42.1 128.5 41.2 128.1 40.3 127.7C40.2 127.6 40 127.6 39.8 127.7C39.6 127.7 39.5 127.8 39.4 128C39.3 128.1 39.3 128.3 39.3 128.5C39.4 128.7 39.5 128.8 39.6 128.9C39.6 128.9 39.6 128.9 39.6 128.9C40.5 129.5 41.3 130.1 42.1 130.6C49.8 135.4 58.3 139.1 67.3 141C76.3 142.9 85.6 143 94.6 141.3C95.6 141.1 96.5 140.9 97.5 140.7Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M183.2 186.2C210.2 190.4 235.2 174 238.9 149.8C242.6 125.5 223.7 102.4 196.6 98.3C169.6 94.1 144.6 110.5 140.9 134.7C137.2 159 156.1 182.1 183.2 186.2Z" style="fill: color-mix(in srgb, var(--petal) 18%, #fff)" />
		<path d="M240.1 149.9C239.3 149.8 238.5 149.7 237.7 149.6C236.7 154.3 234.9 158.7 232.4 162.7C222.2 178.8 201.9 186 183.6 183.1C183.6 183.1 183.6 183.1 183.6 183.1C160.7 180.1 140.1 158.5 143.8 135.2C146.9 111.8 173 96.7 196.3 100.6C214.9 103 232.6 116.6 237 135.4C238.1 140 238.3 144.8 237.7 149.6C238.5 149.7 239.3 149.8 240.1 149.9C240.9 144.9 240.8 139.8 239.8 134.8C235.8 114.4 217.2 99.1 197 96C171.9 91.2 142 107 138 134.3C133.3 161.5 157 186.2 182.7 189.4C182.7 189.4 182.7 189.4 182.7 189.4C203.2 192.8 226.2 183.3 235.7 164.6C238.1 160 239.6 155 240.1 149.9ZM237.7 149.6L240.1 149.9L237.7 149.6Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M158 134.3C157.8 134.2 157.6 134.2 157.4 134.3C157.3 134.4 157.1 134.6 157.1 134.7C157 134.9 157 135.1 157.1 135.3C157.2 135.4 157.3 135.5 157.5 135.6C157.5 135.6 157.5 135.6 157.5 135.6C158.4 136 159.4 136.4 160.3 136.8C168.8 140 178 141.6 187.2 141.3C196.4 141 205.4 139 213.8 135.6C214.8 135.2 215.7 134.8 216.6 134.4C216.8 134.3 216.9 134.2 217 134C217.1 133.9 217.1 133.7 217 133.5C216.9 133.3 216.8 133.2 216.7 133.1C216.5 133 216.3 133 216.1 133.1C216.1 133.1 216.1 133.1 216.1 133.1C215.2 133.3 214.2 133.6 213.2 133.8C204.6 135.9 195.8 137.3 187.1 137.5C178.3 137.8 169.5 136.9 160.9 135C159.9 134.7 158.9 134.5 158 134.3Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M155.6 140.7C155.4 140.7 155.2 140.7 155 140.7C154.9 140.8 154.7 140.9 154.6 141C154.5 141.2 154.5 141.4 154.6 141.6C154.6 141.7 154.7 141.9 154.9 142C154.9 142 154.9 142 154.9 142C155.7 142.6 156.6 143.1 157.4 143.6C165.2 148.4 173.8 152 182.8 153.9C191.9 155.8 201.3 155.9 210.3 154.2C211.3 154.1 212.2 153.9 213.2 153.6C213.4 153.6 213.6 153.5 213.7 153.4C213.8 153.2 213.8 153 213.8 152.8C213.8 152.7 213.7 152.5 213.6 152.4C213.4 152.3 213.2 152.2 213 152.2C212 152.3 211 152.3 210.1 152.4C201.1 152.7 192.3 152 183.6 150.2C175 148.4 166.5 145.6 158.3 142C157.4 141.6 156.5 141.2 155.6 140.7Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M126.5 236C156.4 236 180.5 214.8 180.5 188.8C180.5 162.7 156.4 141.6 126.5 141.6C96.7 141.6 72.5 162.7 72.5 188.8C72.5 214.8 96.7 236 126.5 236Z" style="fill: color-mix(in srgb, var(--petal) 18%, #fff)" />
		<path d="M181.7 188.8C180.9 188.8 180.1 188.8 179.3 188.8C179.1 193.9 177.8 198.9 175.8 203.6C167.3 222.3 146.5 232.9 126.5 232.8C126.5 232.8 126.5 232.8 126.5 232.8C101.6 233.4 75.4 214.4 75.5 188.8C75 163.2 101.2 143.5 126.5 143.9C146.8 143.4 168.2 154.5 176.2 173.8C178.2 178.5 179.3 183.6 179.3 188.8C180.1 188.8 180.9 188.8 181.7 188.8C181.8 183.3 180.9 177.8 178.9 172.7C171 151.8 148.4 139.3 126.5 139.2C99.4 138.2 69.5 159 69.6 188.8C69.2 218.6 99 239.9 126.5 239.2C126.5 239.2 126.5 239.2 126.5 239.2C148.7 239.4 171.8 226.3 179.3 205C181.2 199.8 182 194.2 181.7 188.8ZM179.3 188.8H181.7H179.3Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M132.3 166.9C132.3 166.7 132.3 166.5 132.2 166.4C132.1 166.2 131.9 166.1 131.7 166.1C131.5 166.1 131.4 166.1 131.2 166.2C131.1 166.3 130.9 166.4 130.9 166.6C130.9 166.6 130.9 166.6 130.9 166.6C130.6 167.5 130.4 168.4 130.2 169.3C128.4 177.2 128.6 185.7 130.8 193.7C132.9 201.6 136.8 209 141.7 215.4C142.3 216.2 142.8 216.9 143.4 217.6C143.5 217.7 143.7 217.8 143.9 217.8C144 217.9 144.2 217.8 144.4 217.7C144.5 217.6 144.6 217.5 144.7 217.3C144.7 217.1 144.7 216.9 144.6 216.8C144.6 216.8 144.6 216.8 144.6 216.8C144.1 216 143.7 215.2 143.3 214.4C139.6 207.4 136.4 200.2 134.4 192.7C132.4 185.2 131.6 177.4 132.1 169.5C132.1 168.6 132.2 167.8 132.3 166.9Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M127.2 163.8C127.3 163.6 127.3 163.5 127.2 163.3C127.1 163.1 127 163 126.8 162.9C126.6 162.9 126.4 162.9 126.3 162.9C126.1 163 126 163.1 125.9 163.3C125.9 163.3 125.9 163.3 125.9 163.3C125.5 164.2 125 165.1 124.6 165.9C121.1 174 119 182.8 119 191.8C119 200.7 121 209.5 124.6 217.6C125 218.5 125.4 219.3 125.9 220.2C126 220.4 126.1 220.5 126.3 220.6C126.4 220.7 126.6 220.7 126.8 220.6C127 220.5 127.1 220.4 127.2 220.2C127.3 220.1 127.3 219.9 127.2 219.7C127.2 219.7 127.2 219.7 127.2 219.7C126.9 218.8 126.7 217.9 126.4 216.9C124.1 208.6 122.8 200.2 122.8 191.8C122.8 183.3 124.1 174.9 126.4 166.6C126.7 165.7 126.9 164.7 127.2 163.8Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M121.8 162.2C121.9 162 122 161.8 121.9 161.6C121.9 161.5 121.8 161.3 121.6 161.2C121.5 161.1 121.3 161.1 121.1 161.1C120.9 161.1 120.8 161.2 120.7 161.4C120.7 161.4 120.7 161.4 120.7 161.4C120.1 162.1 119.5 162.8 119 163.5C114.1 169.9 110.1 177.3 107.9 185.2C105.7 193.2 105.4 201.7 107.1 209.6C107.3 210.5 107.5 211.4 107.7 212.3C107.8 212.5 107.9 212.6 108 212.7C108.2 212.8 108.4 212.9 108.6 212.8C108.7 212.8 108.9 212.7 109 212.5C109.1 212.4 109.2 212.2 109.1 212C109.1 211.2 109 210.3 109 209.4C108.6 201.5 109.5 193.7 111.6 186.2C113.7 178.7 116.8 171.5 120.6 164.5C121 163.7 121.4 162.9 121.8 162.2Z" style="fill: color-mix(in srgb, var(--petal) 90%, #1b1040)" />
		<path d="M113 141C122.3 126.3 131.7 126.3 141 141C131.7 151.7 122.3 151.7 113 141Z" style="fill: #f2be22; stroke: color-mix(in srgb, var(--petal) 90%, #1b1040); stroke-width: 4; stroke-linejoin: round" />
	</symbol>
</svg>

<div class="nm-landing">

<section class="nm-hero">
<div class="nm-hero__text">

<h1 class="nm-hero__title">Components for the HTML your server already sends.</h1>

<p class="nm-hero__lead">Nemesia finds components in your markup, checks the elements and options they need, and cleans up after them. No virtual DOM, no templates, no build step required.</p>

<CopyCommand command="npm install nemesia" />

<div class="nm-hero__actions">
	<a class="nm-button nm-button--primary" href="./guide/01-getting-started">Get started</a>
	<a class="nm-button" href="https://github.com/nikitekirsha/nemesia">GitHub</a>
</div>

<p class="nm-meta"><span>~5 KB gzip</span><span>No dependencies</span><span>TypeScript</span></p>

</div>
<div class="nm-hero__visual">

<HeroFlower />

<HeroCard>

```html
<div data-nemesia="counter" data-option-initial="10">
	<button data-ref="button">+</button>
	<span data-ref="value"></span>
</div>
```

<<< @/demo/counter.ts#class

</HeroCard>
</div>
</section>

<section class="nm-section">

<RevealTitle label="The problem" text="The tabs you've written a hundred times." />

<Reveal>

<NmTabs kind="compare" :tabs="{ before: 'Before', after: 'After' }">
<template v-slot:before>
<CodeMarkers class="vp-doc" :notes="notes">
<p class="nm-file">vanilla.js</p>

```js
document.addEventListener('DOMContentLoaded', () => {
	const buttons = document.querySelectorAll('.tab')
	const panels = document.querySelectorAll('.panel')

	buttons.forEach((button, i) => {
		button.addEventListener('click', () => {
			buttons.forEach(b => b.classList.remove('is-active'))
			panels.forEach(p => p.classList.remove('is-active'))
			button.classList.add('is-active')
			panels[i].classList.add('is-active')
		})
	})
})

// More tabs arrived via AJAX? Copy this into initTabs()
// and call it again… hoping the listeners don't double.
```

</CodeMarkers>
</template>
<template v-slot:after>
<div class="vp-doc">
<p class="nm-file">tabs.ts</p>

```ts
class Tabs extends Component('tabs') {
	tabs = this.ref.many.button('tab')
	panels = this.ref.many.element('panel')

	onMount() {
		this.on(this.tabs, 'click', (_event, _tab, index) => {
			this.show(index)
		})
	}

	show(index: number) {
		this.tabs.forEach((tab, i) => {
			tab.classList.toggle('is-active', i === index)
		})
		this.panels.forEach((panel, i) => {
			panel.classList.toggle('is-active', i === index)
		})
	}
}
```

</div>
</template>
</NmTabs>

</Reveal>

</section>

<section class="nm-section">

<RevealTitle label="Features" text="Structure, without a framework." />

<Reveal>

<Spotlight>
	<article>
		<h3>Behavior lives in the class</h3>
		<p>Components are found by <code>data-nemesia</code>. The elements and options they need are defined in the class.</p>
	</article>
	<article>
		<h3>Broken markup can't break the page</h3>
		<p>A missing, duplicated or mistyped element skips only that instance, with a warning pointing at the element.</p>
	</article>
	<article>
		<h3>Auto-typed</h3>
		<p><code>this.ref.button('save')</code> is an <code>HTMLButtonElement</code>. <code>this.option.number('delay')</code> is a number.</p>
	</article>
	<article>
		<h3>Dynamic DOM</h3>
		<p>With <code>observe: true</code>, markup added by AJAX, htmx or a CMS mounts itself, and removed markup cleans up.</p>
	</article>
	<article>
		<h3>Automatic cleanup</h3>
		<p>Listeners registered with <code>this.on</code> are removed when a component is destroyed.</p>
	</article>
	<article>
		<h3>Components that work together</h3>
		<p>Build a page from small parts that know about each other, instead of one script that knows everything.</p>
	</article>
</Spotlight>

</Reveal>

</section>

<section class="nm-section">

<RevealTitle label="Try it" text="A little flower shop." />

<Reveal>

<p class="nm-lead">Plain server HTML, four small components. Add a few flowers, then load more from the “server”.</p>

<NmTabs kind="demo" :tabs="{ result: 'Result', html: 'HTML', components: 'Components' }">
<template v-slot:bar>
<span class="nm-demo__dots" aria-hidden="true"><i></i><i></i><i></i></span>
</template>
<template v-slot:result>
<NemesiaDemo>

<!--@include: ./demo/shop.html-->

</NemesiaDemo>
</template>
<template v-slot:html>
<div class="vp-doc">

<<< @/demo/shop.html

</div>
</template>
<template v-slot:components>
<div class="vp-doc">

::: code-group

<<< @/demo/shop.ts

<<< @/demo/product-card.ts

<<< @/demo/cart.ts

<<< @/demo/toast.ts

:::

</div>
</template>
</NmTabs>

</Reveal>

</section>

<section class="nm-section">

<RevealTitle label="Size" text="Small enough to forget about." />

<Reveal>

<SizeBars :rows="[{ name: 'nemesia', size: 5.4, self: true }, { name: 'petite-vue', size: 7.3 }, { name: 'Stimulus', size: 11.3 }, { name: 'Alpine', size: 19.9 }]" />

<p class="nm-note">Published browser builds, minified and gzipped.</p>

</Reveal>

</section>

<section class="nm-section">

<RevealTitle label="FAQ" text="Why not just…?" />

<Reveal stagger>

<dl class="nm-faq">
	<div>
		<dt>Vue or React?</dt>
		<dd>They render the page. Nemesia does not: your server already did. If you need client-side templates, routing or reactive state, use them instead.</dd>
	</div>
	<div>
		<dt>Alpine?</dt>
		<dd>Alpine puts behavior into HTML attributes. Nemesia keeps it in JavaScript; your markup only defines the structure.</dd>
	</div>
	<div>
		<dt>Stimulus?</dt>
		<dd>The closest in spirit. Nemesia checks refs and options on mount, infers their types without extra declarations, and weighs about half as much.</dd>
	</div>
	<div>
		<dt>jQuery?</dt>
		<dd>It belongs to another era of the web: selectors, but no structure, no lifecycle, no cleanup.</dd>
	</div>
	<div>
		<dt>When is Nemesia the wrong choice?</dt>
		<dd>Single-page apps, or interfaces where most of the DOM is rendered on the client.</dd>
	</div>
	<div>
		<dt>Does it need a build step?</dt>
		<dd>No. A bundler works, and so does a single <code>&lt;script&gt;</code> tag.</dd>
	</div>
</dl>

</Reveal>

</section>

<footer class="nm-footer">
	<p class="nm-footer__checks">✓ TypeScript <span>✓ MIT</span> <span>✓ ESM + UMD</span> <span>✓ No dependencies</span></p>
	<p class="nm-footer__links">
		<a href="./guide/01-getting-started">Guide</a>
		<a href="./guide/11-recipes">Recipes</a>
		<a href="./changelog">Changelog</a>
		<a href="https://github.com/nikitekirsha/nemesia">GitHub</a>
		<a href="https://www.npmjs.com/package/nemesia">npm</a>
	</p>
	<p class="nm-footer__copy">MIT © nikitekirsha</p>
</footer>

</div>
