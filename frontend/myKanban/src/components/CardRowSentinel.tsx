import { useState, type ReactNode } from "react"
import { CardRowGhost } from "./CardRowGhost"
import { useUiStore } from "@/stores/uiStore"

type CardRowSentinelProps = {
    children?: ReactNode
    className?: string
}

export function CardRowSentinel({ children, className }: CardRowSentinelProps) {
    const [isOver, setIsOver] = useState(false)
    const isListDragging = useUiStore((state) => state.isListDragging)

    function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
        if (isListDragging) { return }
        e.preventDefault()
        setIsOver(true)
    }

    function handleDragOver(e: React.DragEvent) {
        if (isListDragging) { return }
        e.preventDefault()
        //setIsOver(true)
    }
    function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
        if (isListDragging) { return }
        e.preventDefault()
        const current = e.currentTarget
        const related = e.relatedTarget as Node | null
        if (related && current.contains(related)) {
            // stai passando a un figlio: ignora
            return
        }
        setIsOver(false)
    }
    function handleOnDrop(e: React.DragEvent) {
        if (isListDragging) { return }
        e.preventDefault()
        setIsOver(false)
        // Handle drop logic here
    }
    return (
        <>

            <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleOnDrop}
                data-list-card-id="sentinel"
                className={className ?? ""}>
                <CardRowGhost active={isOver} />
                {children}
            </div>
        </>
    )
}