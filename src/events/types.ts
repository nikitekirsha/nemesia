type EventMapFor<TTarget> = TTarget extends Window
	? WindowEventMap
	: TTarget extends Document
		? DocumentEventMap
		: TTarget extends HTMLMediaElement
			? HTMLMediaElementEventMap
			: TTarget extends HTMLElement
				? HTMLElementEventMap
				: TTarget extends SVGElement
					? SVGElementEventMap
					: TTarget extends MathMLElement
						? MathMLElementEventMap
						: TTarget extends Element
							? ElementEventMap
							: TTarget extends Node
								? GlobalEventHandlersEventMap
								: TTarget extends MediaQueryList
									? MediaQueryListEventMap
									: TTarget extends VisualViewport
										? VisualViewportEventMap
										: {}

/** Event name accepted by `on(...)`: a known DOM event for the target or any custom event name. */
export type EventName<TTarget> = (keyof EventMapFor<TTarget> & string) | (string & {})

/** Event type for a listener: the DOM event type for known names, otherwise `TEvent` (plain `Event` by default). */
export type TargetEvent<TTarget, TName extends string, TEvent extends Event> = TName extends keyof EventMapFor<TTarget>
	? EventMapFor<TTarget>[TName]
	: TEvent
