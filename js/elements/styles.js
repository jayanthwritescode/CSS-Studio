/** Shared CSS representation for editor elements and native preset previews. */
export function elementStyles(styles, type) {
  const glowColor = type === 'text' ? styles.color : styles.backgroundColor;
  const turn = ` perspective(800px) rotateY(${styles.rotationY}deg)`;
  return {
    width: `${styles.width}px`, height: `${styles.height}px`,
    transform: `translate(${styles.x}px, ${styles.y}px) rotate(${styles.rotation}deg)${turn} scale(${styles.scaleX}, ${styles.scaleY})`,
    transformOrigin: styles.transformOrigin,
    opacity: styles.opacity,
    backgroundColor: styles.backgroundTransparent ? 'transparent' : styles.backgroundColor,
    color: styles.color, border: `${styles.borderWidth}px ${styles.borderStyle} ${styles.borderColor}`,
    borderTopColor: styles.spinnerEnabled ? 'transparent' : styles.borderColor,
    borderRadius: `${styles.borderRadius}px`, boxShadow: styles.boxShadow,
    fontFamily: styles.fontFamily, fontSize: `${styles.fontSize}px`, fontWeight: styles.fontWeight,
    clipPath: type === 'text' || styles.reveal >= 1 ? 'none' : `inset(0 ${(1 - styles.reveal) * 100}% 0 0)`,
    filter: styles.glow > 0 ? `drop-shadow(0 0 ${styles.glow}px ${glowColor}) drop-shadow(0 0 ${styles.glow / 2}px ${glowColor})` : 'none',
    backgroundImage: styles.shimmerEnabled ? 'linear-gradient(100deg, transparent 20%, #ffffff99 50%, transparent 80%)' : 'none',
    backgroundSize: styles.shimmerEnabled ? '200% 100%' : 'auto',
    backgroundPosition: `${styles.shimmer}% 0`,
  };
}

// A shape reveal uses a clipping box for the whole track, including its effects.
export const usesRevealClip = element => element.type !== 'text' && (element.styles.reveal < 1 || element.keyframes.some(frame => frame.properties.reveal < 1));
