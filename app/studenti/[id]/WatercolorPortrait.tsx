"use client";

import Image from "next/image";
import { useId } from "react";
import styles from "./cover.module.css";

/** A local, deterministic pigment wash. Geometry and facial features stay intact. */
export default function WatercolorPortrait({ src, alt, onError }: {
  src: string;
  alt: string;
  onError: () => void;
}) {
  const filterId = `watercolor-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return <>
    <svg className={styles.portraitFilter} aria-hidden="true" focusable="false" width="0" height="0">
      <defs>
        <filter id={filterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          {/* Smooth fine photographic detail without moving the face or its edges. */}
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.65" result="soft" />
          <feComposite in="soft" in2="SourceGraphic" operator="arithmetic" k2="0.78" k3="0.22" result="base" />
          {/* Broad pigment values, softened and mixed back to avoid cartoon contours. */}
          <feComponentTransfer in="base">
            <feFuncR type="discrete" tableValues="0.03 0.12 0.21 0.30 0.39 0.48 0.57 0.66 0.75 0.84 0.93 1" />
            <feFuncG type="discrete" tableValues="0.03 0.12 0.21 0.30 0.39 0.48 0.57 0.66 0.75 0.84 0.93 1" />
            <feFuncB type="discrete" tableValues="0.03 0.12 0.21 0.30 0.39 0.48 0.57 0.66 0.75 0.84 0.93 1" />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="0.3" result="pigmentValues" />
          <feComposite in="pigmentValues" in2="base" operator="arithmetic" k2="0.7" k3="0.3" />
          <feColorMatrix type="saturate" values="0.78" />
          {/* Lift dark tones into warm paper, preserving skin-tone differences. */}
          <feComponentTransfer result="paint">
            <feFuncR type="linear" slope="0.93" intercept="0.065" />
            <feFuncG type="linear" slope="0.91" intercept="0.055" />
            <feFuncB type="linear" slope="0.87" intercept="0.045" />
          </feComponentTransfer>
          {/* Fixed seeds give still, repeatable pigment and paper grain. */}
          <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="2" seed="12" result="pigment" />
          <feColorMatrix in="pigment" type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.16" intercept="0.84" />
            <feFuncG type="linear" slope="0.16" intercept="0.84" />
            <feFuncB type="linear" slope="0.16" intercept="0.84" />
          </feComponentTransfer>
          <feBlend in2="paint" mode="multiply" result="wash" />
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="7" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.13" />
          </feComponentTransfer>
          <feBlend in2="wash" mode="soft-light" result="paper" />
          <feComposite in="paper" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
    <Image src={src} alt={alt} fill unoptimized onError={onError} sizes="170px"
      className={styles.portrait} style={{ filter: `url(#${filterId})` }} />
    <span className={styles.portraitWash} aria-hidden="true" />
  </>;
}
