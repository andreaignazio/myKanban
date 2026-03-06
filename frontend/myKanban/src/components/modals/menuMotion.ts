export const menuMotionProps = {
    initial: { opacity: 0, scale: 0.95, y: -6 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -6 },
    transition: { duration: 0.15, ease: "easeOut" },
} as const;
