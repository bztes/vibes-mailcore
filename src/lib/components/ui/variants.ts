import { tv, type VariantProps } from 'tailwind-variants';

export const button = tv({
	base: [
		'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors',
		'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
		'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0'
	],
	variants: {
		variant: {
			primary: 'bg-zinc-900 text-white shadow-sm hover:bg-zinc-700',
			secondary: 'border border-zinc-200 bg-white text-zinc-800 shadow-xs hover:bg-zinc-50',
			ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
			danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-500'
		},
		size: {
			sm: 'h-8 px-2.5 text-sm',
			md: 'h-9 px-3.5 text-sm',
			icon: 'size-8'
		}
	},
	defaultVariants: { variant: 'primary', size: 'md' }
});
export type ButtonVariants = VariantProps<typeof button>;

export const input = tv({
	base: [
		'block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs',
		'placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 focus:outline-none',
		'aria-invalid:border-rose-400 aria-invalid:focus:ring-rose-500/15',
		'disabled:bg-zinc-50 disabled:text-zinc-500'
	]
});

export const field = tv({
	slots: {
		root: 'grid gap-1.5',
		label: 'text-sm font-medium text-zinc-800',
		hint: 'text-xs text-zinc-500',
		issue: 'text-xs font-medium text-rose-600'
	}
});

export const card = tv({
	slots: {
		root: 'overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs',
		header: 'flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4',
		title: 'text-base font-semibold text-zinc-900',
		description: 'mt-0.5 text-sm text-zinc-500',
		body: 'p-5'
	},
	variants: {
		flush: { true: { body: 'p-0' } }
	}
});

export const badge = tv({
	base: 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset [&_svg]:size-3',
	variants: {
		tone: {
			neutral: 'bg-zinc-50 text-zinc-600 ring-zinc-200',
			ok: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
			warn: 'bg-amber-50 text-amber-700 ring-amber-600/25',
			bad: 'bg-rose-50 text-rose-700 ring-rose-600/20',
			info: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
		}
	},
	defaultVariants: { tone: 'neutral' }
});
export type BadgeVariants = VariantProps<typeof badge>;

export const table = tv({
	slots: {
		wrap: 'overflow-x-auto',
		root: 'w-full text-left text-sm',
		th: 'px-5 py-2.5 text-xs font-medium tracking-wide text-zinc-500 uppercase',
		tr: 'border-t border-zinc-100',
		td: 'px-5 py-3 align-middle text-zinc-700'
	}
});

export const alert = tv({
	base: 'rounded-lg px-3.5 py-2.5 text-sm',
	variants: {
		tone: {
			error: 'bg-rose-50 text-rose-800',
			success: 'bg-emerald-50 text-emerald-800',
			info: 'bg-zinc-100 text-zinc-700'
		}
	},
	defaultVariants: { tone: 'info' }
});
