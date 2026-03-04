import { useDroppable } from "@dnd-kit/core"

type DroppableProps = {
    listID: string
    children: any
}

export function Droppable({ listID, children }: DroppableProps) {

    const { setNodeRef } = useDroppable({
        id: listID,
        data: {
            type: "droppable",
            listID: listID
        }
    })

    return (
        <div ref={setNodeRef}>
            {children}
        </div>
    )

}