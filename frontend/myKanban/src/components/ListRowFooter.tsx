import { useCardsStore } from "@/stores/cardsStore"
import { CardRowSentinel } from "./CardRowSentinel"
import { use, useEffect, useRef, useState } from "react"
import { CustomInput, type CustomInputHandle } from "./menuElements/CustomInput"
import { LabeledButtonPresetBSubmit } from "./buttons/labeledButton"
import { XIcon } from "lucide-react"
import { AddForm } from "./common/AddForm"

type ListRowFooterProps = {
    boardID: string
    listID: string
    isReadonly?: boolean
}

export function ListRowFooter({ boardID, listID, isReadonly = false }: ListRowFooterProps) {
    const [isAddingCard, setIsAddingCard] = useState(false)
    const cardsStore = useCardsStore()
    const handleAddCardToList = (title: string) => {
        if (isReadonly) {
            return
        }
        cardsStore.addCardToList(boardID, listID,
            { Title: title, InsertAt: "end", AfterID: null })
    }



    return (
        <>
            <AddForm
                onSubmit={(title) => handleAddCardToList(title)}
                isAdding={isAddingCard}
                setIsAdding={setIsAddingCard}
                disabled={isReadonly}
                openedHeight={30}
                onCancel={() => setIsAddingCard(false)} />


        </>
    )
}


