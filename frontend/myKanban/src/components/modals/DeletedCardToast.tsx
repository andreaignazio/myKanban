import { forwardRef } from "react"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"

type DeletedCardModalProps = {
    onClose: () => void
}

export const DeletedCardModal = forwardRef<HTMLDivElement, DeletedCardModalProps>((_props, _ref) => {
    return (
        <CommonMenuWrapper style={{ width: "360px", height: "180px" }}>
            <div className="flex flex-col justify-start items-start w-full h-full p-4 gap-3">
                <h2 className="text-lg font-bold">Card eliminata</h2>
                <p className="text-sm opacity-90">
                    Questa card non è più disponibile. Verrai reindirizzato alla board.
                </p>
            </div>
        </CommonMenuWrapper>
    )
})
