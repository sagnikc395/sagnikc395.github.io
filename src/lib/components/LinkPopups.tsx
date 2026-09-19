/**
 * Gwern-style link previews.
 *
 * Every link inside the article gets a card describing where it goes: the title,
 * author and abstract for an annotated paper or repo, the excerpt for another
 * post here, the section text for a same-page anchor. With a mouse the card
 * hovers beside the link and stays open while the pointer is inside it; on a
 * touch screen the first tap opens it as a bar pinned to the bottom of the
 * screen instead of navigating, and the title inside the bar is the real link.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { annotationFor, type Annotation } from "../annotations";

const OPEN_DELAY = 200;
const CLOSE_DELAY = 250;
const CARD_WIDTH = 24; /* rem, kept in sync with .link-popup in app.css */
const MARGIN = 12; /* px of breathing room against the viewport edges */

type Placement = { left: number; top: number };

type Preview = {
  link: HTMLAnchorElement;
  annotation: Annotation;
  /** Pinned previews are the touch-screen bar: no hover, explicit dismissal. */
  pinned: boolean;
};

/** Below the link when there is room, above it when there is not, and always
    clamped inside the viewport. */
function place(link: HTMLAnchorElement, card: HTMLElement): Placement {
  const rect = link.getBoundingClientRect();
  const height = card.offsetHeight;
  const width = card.offsetWidth;

  const below = rect.bottom + 6;
  const above = rect.top - height - 6;
  const useAbove =
    below + height > window.innerHeight - MARGIN && above > MARGIN;

  const left = Math.min(
    Math.max(MARGIN, rect.left),
    Math.max(MARGIN, window.innerWidth - width - MARGIN),
  );

  return { left, top: useAbove ? above : below };
}

/** Pulls readable text out of the section a same-page anchor points at. */
function sectionPreview(hash: string): Annotation | null {
  const id = decodeURIComponent(hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (!target) return null;

  const words: string[] = [];
  let node = target.nextElementSibling;
  while (node && !/^H[1-6]$/.test(node.tagName) && words.length < 60) {
    const text = node.textContent?.trim();
    if (text) words.push(...text.split(/\s+/));
    node = node.nextElementSibling;
  }

  return {
    kind: "section",
    href: hash,
    title: target.textContent?.trim() || id,
    source: "This page",
    body: words.length
      ? words.slice(0, 60).join(" ") + (words.length > 60 ? "…" : "")
      : undefined,
  };
}

/** The links worth previewing: text links inside the article, skipping image
    links and anything opted out with data-nopopup. */
function previewable(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  // The card itself sits inside the article; its own links are not previewable.
  if (target.closest(".link-popup")) return null;
  const link = target.closest("a");
  if (!link || !(link instanceof HTMLAnchorElement)) return null;
  if (link.querySelector("img, picture")) return null;
  if (link.dataset.nopopup !== undefined) return null;
  return link;
}

function annotate(link: HTMLAnchorElement): Annotation | null {
  const href = link.getAttribute("href") ?? "";
  if (href.startsWith("#")) return sectionPreview(href);
  return annotationFor(href);
}

interface LinkPopupsProps {
  /** The article whose links get previews. */
  containerRef: React.RefObject<HTMLElement | null>;
}

const LinkPopups: React.FC<LinkPopupsProps> = ({ containerRef }) => {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const marked = useRef(new WeakSet<HTMLAnchorElement>());

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const close = useCallback(() => {
    cancel();
    setPreview(null);
    setPlacement(null);
  }, [cancel]);

  const open = useCallback(
    (link: HTMLAnchorElement, pinned: boolean) => {
      const annotation = annotate(link);
      if (!annotation) return;
      cancel();
      setPlacement(null);
      setPreview({ link, annotation, pinned });
    },
    [cancel],
  );

  // Mark the links that have something to show, so a reader can tell which ones
  // are worth hovering. The article arrives asynchronously, so this runs after
  // every render; each link is only looked up once.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    for (const link of root.querySelectorAll("a")) {
      if (marked.current.has(link) || link.closest(".link-popup")) continue;
      marked.current.add(link);
      const annotation = annotate(link);
      if (annotation && annotation.kind !== "bare") link.dataset.preview = "";
    }
  });

  // Pointer, keyboard and tap handling, delegated from the article element.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const touch = !window.matchMedia("(hover: hover)").matches;

    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const link = previewable(event.target);
      if (!link) return;
      // Back onto the link the card belongs to: keep it open.
      if (link === preview?.link) {
        cancel();
        return;
      }
      cancel();
      timer.current = setTimeout(() => open(link, false), OPEN_DELAY);
    };

    const onOut = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (!previewable(event.target)) return;
      cancel();
      timer.current = setTimeout(close, CLOSE_DELAY);
    };

    const onFocus = (event: FocusEvent) => {
      const link = previewable(event.target);
      if (link) open(link, false);
      else if (!cardRef.current?.contains(event.target as Node)) close();
    };

    // On a touch screen the first tap opens the card rather than following the
    // link; the card's own title is how you actually go there.
    const onClick = (event: MouseEvent) => {
      if (!touch || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = previewable(event.target);
      if (!link || link === preview?.link) return;
      if (!annotate(link)) return;
      event.preventDefault();
      open(link, true);
    };

    root.addEventListener("pointerover", onOver);
    root.addEventListener("pointerout", onOut);
    root.addEventListener("focusin", onFocus);
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerout", onOut);
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("click", onClick);
    };
  }, [containerRef, preview, open, close, cancel]);

  // Escape always dismisses; a tap elsewhere dismisses the pinned bar.
  useEffect(() => {
    if (!preview) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!preview.pinned) return;
      if (cardRef.current?.contains(event.target as Node)) return;
      if (preview.link.contains(event.target as Node)) return;
      close();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [preview, close]);

  // Measure once the card is in the DOM, then keep it pinned to its link.
  useEffect(() => {
    if (!preview || preview.pinned) return;
    const card = cardRef.current;
    if (!card) return;

    let frame = 0;
    const reposition = () => {
      frame = 0;
      setPlacement(place(preview.link, card));
    };
    reposition();

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(reposition);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [preview]);

  if (!preview) return null;

  const { annotation, pinned } = preview;
  const external = /^https?:\/\//i.test(annotation.href);
  const meta = [annotation.author, annotation.date, annotation.source].filter(
    Boolean,
  );

  return (
    <div
      ref={cardRef}
      className={`link-popup${pinned ? " link-popup--pinned" : ""}`}
      style={
        pinned
          ? undefined
          : {
              left: placement ? `${placement.left}px` : "0",
              top: placement ? `${placement.top}px` : "0",
              maxWidth: `min(${CARD_WIDTH}rem, calc(100vw - ${2 * MARGIN}px))`,
              // Hidden until measured, so it never flashes in the wrong corner.
              visibility: placement ? "visible" : "hidden",
            }
      }
      onPointerEnter={cancel}
      onPointerLeave={() => {
        if (!pinned) timer.current = setTimeout(close, CLOSE_DELAY);
      }}
    >
      <a
        className="link-popup-title"
        href={annotation.href}
        {...(external ? { rel: "external noopener", target: "_blank" } : {})}
      >
        {annotation.title}
      </a>

      {meta.length > 0 && (
        <p className="link-popup-meta small muted">{meta.join(" · ")}</p>
      )}

      {annotation.body && <p className="link-popup-body">{annotation.body}</p>}

      {annotation.kind !== "bare" && external && (
        <p className="link-popup-url small faint">{annotation.href}</p>
      )}

      {pinned && (
        <button type="button" className="link-popup-close" onClick={close}>
          Close
        </button>
      )}
    </div>
  );
};

export default LinkPopups;
