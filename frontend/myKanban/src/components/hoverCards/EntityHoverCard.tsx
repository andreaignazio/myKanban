import { forwardRef, useState } from "react";
import { EntityOverviewPanel } from "../common/EntityOverviewCard";
import { CommonMenuWrapper } from "../menuElements/menuWrapper";
import { ShowMoreArrow } from "../common/ShowMoreArrow";
import type { IconId } from "@/icons/iconCatalog";

type EntityHoverCardProps = {
    onClose?: () => void;
    entityCreatedAt?: string;
    iconId?: IconId;
    entityName?: string;
    description?: string;
    plan?: string;
    coverType?: "color" | "image";
    coverColor?: string;
    coverImage?: string;
    headerInRowChilden?: React.ReactNode;
    detailsChildren?: React.ReactNode;
    height?: number;
}

export const EntityHoverCard = forwardRef<HTMLDivElement, EntityHoverCardProps>(({
    onClose,
    entityCreatedAt,
    iconId,
    entityName,
    description,
    plan,
    coverType,
    coverColor,
    coverImage,
    headerInRowChilden,
    detailsChildren,
    height = 400,
}, ref) => {
    const [showDetails, setShowDetails] = useState(false)
    const radius = 32

    return (
        <CommonMenuWrapper ref={ref} onClose={onClose}
            className="relative !h-[400px]
			!bg-transparent !w-fit !shadow-none flex-row gap-4 overflow-visible">

            <div
                style={{ borderRadius: `${radius}px`, height: `${height}px` }}
                onClick={() => setShowDetails((prev) => !prev)}
                className=" cursor-pointer 
				w-fit h-fit flex flex-row gap-0 hover:gap-4 transition-all duration-300 ease-in-out
				backdrop-blur-md overflow-hidden
				bg-fuchsia-500/10
						shadow-md shadow-black/60 border-[1.5px] border-fuchsia-500/40
						 rounded-md p-0">

                <EntityOverviewPanel
                    entityCreatedAt={entityCreatedAt}
                    iconId={iconId}
                    height={height}
                    isOpen={showDetails}
                    onClick={() => { }}
                    onClose={() => { }}
                    entityName={entityName}
                    description={description}
                    plan={plan}
                    coverType={coverType}
                    coverColor={coverColor}
                    coverImage={coverImage}
                    headerInRowChilden={headerInRowChilden}
                />
                <div className={`${showDetails ? "w-[300px] opacity-100 px-4" : "w-0 opacity-0 px-0"}
				 transition-all duration-300 ease-in-out
					h-full py-4 flex flex-col gap-1`}>
                    {detailsChildren}
                </div>
            </div>

            <ShowMoreArrow
                show={!!showDetails}
                setShowMore={setShowDetails} showMore={showDetails} />
        </CommonMenuWrapper>
    )
})

export const EnitityHoverCard = EntityHoverCard