/**
 * InfoTip — a small, opt-in "i" affordance that reveals a one-sentence blurb.
 *
 * Designed to sit next to a control's label and explain it for a teacher who
 * isn't technical. Deliberately non-invasive: it never pops on its own, never
 * covers the control, and causes no layout shift (the popover is absolutely
 * positioned). It opens on hover, on keyboard focus, and on click/tap (touch
 * toggles it), and closes on pointer-leave, blur, Escape, or an outside click.
 *
 * Usage:
 *   <InfoTip label="Optimized mode">
 *     One short, plain sentence about what this does.
 *   </InfoTip>
 *
 * Tokens only (works across dark / light / sepia); no new dependencies. The
 * open/close transitions live in infoTipState.ts so they can be unit-tested.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  infoTipAria,
  openOnReveal,
  toggleOnPress,
  closeOnDismiss,
  type InfoTipPlacement,
} from './infoTipState';

interface InfoTipProps {
  /** Short accessible name for the control this explains (sentence case). */
  label: string;
  /** The blurb itself — one plain sentence. */
  children: ReactNode;
  /** Sit the popover above (default) or below the icon. */
  placement?: InfoTipPlacement;
  /** Extra classes for the wrapping inline span (e.g. nudge alignment). */
  className?: string;
}

export function InfoTip({ label, children, placement = 'top', className = '' }: InfoTipProps) {
  const [isOpen, setIsOpen] = useState(false);
  // useId gives a stable, collision-free id per instance (React 18) — wired
  // from the trigger's aria-describedby to the popover's id while open.
  const popoverId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const aria = infoTipAria(popoverId, isOpen);

  // Close on Escape (matches the app's modal idiom) and on any click outside
  // the wrapper. Only listen while open — no idle global handlers.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(closeOnDismiss());
      }
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(closeOnDismiss());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      // Hover intent: the whole affordance opens on enter, closes on leave.
      onMouseEnter={() => setIsOpen(openOnReveal())}
      onMouseLeave={() => setIsOpen(closeOnDismiss())}
    >
      <button
        type={aria.trigger.type}
        aria-label={`${aria.trigger['aria-label']}: ${label}`}
        aria-expanded={aria.trigger['aria-expanded']}
        aria-describedby={aria.trigger['aria-describedby']}
        // Click/tap toggles (the touch path, where there's no hover). Stop the
        // event here so a tip living inside a clickable container (a <summary>,
        // a <label>) toggles only itself, never its parent.
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(toggleOnPress(isOpen)); }}
        // Keyboard focus reveals; blur (leaving the trigger) hides.
        onFocus={() => setIsOpen(openOnReveal())}
        onBlur={() => setIsOpen(closeOnDismiss())}
        className="flex h-4 w-4 items-center justify-center rounded-full
                   text-ink-3 transition-colors duration-150
                   hover:text-rubric focus-visible:text-rubric"
      >
        {/* Editorial "i" in a hairline ring — quiet until hovered. */}
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="8" cy="5.25" r="0.85" fill="currentColor" />
          <path
            d="M8 7.4v3.6"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {isOpen && (
        <span
          id={aria.popover.id}
          role={aria.popover.role}
          // Absolutely positioned so the popover never shifts surrounding
          // layout; centered on the icon and offset so it never covers it.
          className={`absolute left-1/2 z-30 w-max max-w-[15rem] -translate-x-1/2
                      rounded-md border border-line bg-card px-3 py-2
                      text-xs leading-relaxed text-ink-2 shadow-float
                      motion-safe:animate-fade-in
                      ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
