import { motion } from "framer-motion"
import { CheckIcon } from "@heroicons/react/24/solid"
import { LabeledButtonPresetA } from "../buttons/labeledButton"

const PARTICLES = [
    { top: "14%", left: "26%", size: 6, delay: 0.1 },
    { top: "10%", left: "54%", size: 4, delay: 0.25 },
    { top: "18%", left: "74%", size: 5, delay: 0.15 },
    { top: "44%", left: "84%", size: 3, delay: 0.35 },
    { top: "68%", left: "76%", size: 5, delay: 0.2 },
    { top: "72%", left: "20%", size: 4, delay: 0.3 },
    { top: "48%", left: "12%", size: 6, delay: 0.05 },
    { top: "28%", left: "16%", size: 3, delay: 0.4 },
]

type SubscriptionSuccessModalProps = {
    onClose?: () => void
}

export const SubscriptionSuccessModal = ({ onClose }: SubscriptionSuccessModalProps) => {
    return (
        <div className="relative flex flex-col items-center justify-center w-[340px] px-8 pt-12 pb-8 gap-6 overflow-hidden">

            {/* Particles */}
            {PARTICLES.map((p, i) => (
                <motion.span
                    key={i}
                    className="absolute rounded-full bg-emerald-400"
                    style={{ top: p.top, left: p.left, width: p.size, height: p.size }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0.6], scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5, delay: p.delay, ease: "backOut" }}
                />
            ))}

            {/* Checkmark circle */}
            <div className="relative flex items-center justify-center">
                {/* Outer ping ring */}
                <motion.span
                    className="absolute rounded-full border-2 border-emerald-400"
                    style={{ width: 90, height: 90 }}
                    initial={{ scale: 0.8, opacity: 0.6 }}
                    animate={{ scale: [0.8, 1.5, 1.5], opacity: [0.6, 0, 0] }}
                    transition={{ duration: 1.4, delay: 0.4, ease: "easeOut", repeat: Infinity, repeatDelay: 0.8 }}
                />
                {/* Circle */}
                <motion.div
                    className="relative z-10 flex items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-400/10"
                    style={{ width: 80, height: 80 }}
                    initial={{ scale: 0.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
                >
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                    >
                        <CheckIcon className="w-9 h-9 text-emerald-400" />
                    </motion.div>
                </motion.div>
            </div>

            {/* Text */}
            <motion.div
                className="flex flex-col items-center gap-2 text-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }}
            >
                <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">Successfully!</h2>
                <p className="text-sm text-neutral-400 leading-relaxed">
                    Your subscription has been updated.<br />You can now enjoy the benefits of your new plan.
                </p>
            </motion.div>

            {/* Done button */}
            <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6, ease: "easeOut" }}
            >
                <LabeledButtonPresetA
                    label="Done"
                    onClick={() => onClose?.()}
                    className="w-full !h-11 !rounded-full !bg-emerald-500 hover:!bg-emerald-400 !text-neutral-900 !font-bold text-base"
                />
            </motion.div>
        </div>
    )
}
