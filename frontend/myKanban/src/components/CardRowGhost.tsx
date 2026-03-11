import { useUiStore } from "@/stores/uiStore"
import { motion } from "framer-motion"
import { useShallow } from "zustand/shallow"
type CardRowProps = {
    active: boolean
}

export function CardRowGhost({ active }: CardRowProps) {
    // if (!active) return null
    // const [height, setHeight] = useState(100)
    const height = useUiStore(useShallow((state) => state.ghostHeight)) ?? 0
    // const height = 200
    return (
        <motion.div
            layout
            initial={false}
            animate={{
                opacity: active ? 1 : 0,
                height: active ? height : 0,
                marginTop: active ? 4 : 0,
                marginBottom: active ? 4 : 0,
            }}
            transition={{ duration: 0, ease: "easeOut" }}

        >
            <div className={`flex flex-col text-gray-100
        rounded-xl  h-full overflow-hidden shadow-sm animate-pulse ${active ? "" : "hidden"}`}>
                <div className="h-5 w-1/2 rounded-md m-2"></div>
                <div className="h-3 w-full rounded-md m-2"></div>
                <div className="h-3 w-full rounded-md m-2"></div>
            </div>
        </motion.div>
    )
}