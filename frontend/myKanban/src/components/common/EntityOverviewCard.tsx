import { forwardRef, useEffect, useRef, useState } from "react";
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { useShareOffersStore } from "@/stores/shareOffersStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useCacheStore } from "@/stores/cacheStore";
import { useWorkspaceDerivedProps } from "@/hooks/useWorkspaceDerivedProps";
import { CatalogIcon } from "@/icons/iconCatalog"
import { ChevronRight, Grid2X2Plus, XCircle } from "lucide-react";
import { SubscriptionBadge } from "../badges/subscriptionBadge";
import { ImageColorRenderer } from "../menuElements/ImageColorRenderer";
import type { User, UserWorkspace } from "@/stores/types";
import { useUserStore } from "@/stores/userStore";
import { UserRoleBadge, type Role } from "../badges/UserRoleBadge";
import { UserAvatarDummy } from "../badges/UserAvatarDummy";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { useUiStore, type DomainModalData } from "@/stores/uiStore";

import { MemberRow } from "../common/MemberRow";

type ShareOfferDetailsProps = {
    onClose: () => void;
    workspaceId?: string;

}

type WorkspaceOverviewPanelProps = {
    onClose: () => void;
    onClick: () => void;
    wrapperRef?: React.Ref<HTMLDivElement>;
    iconId?: "members" | "boards" | "settings" | "profile" | "activities" | "cards" | "watched" | "subscriptions";
    coverType?: "color" | "image";
    coverImage?: string;
    coverColor?: string;
    entityName?: string;
    entityCreatedAt?: string;
    description?: string;
    plan?: string;

    isOffered?: boolean;


    isOpen?: boolean;
    headerInRowChilden?: React.ReactNode;
    headerChildren?: React.ReactNode;
    bodyChildren?: React.ReactNode;
    height?: number;
}

export const EntityOverviewPanel = ({ onClick, onClose, wrapperRef, iconId, coverType, coverImage, coverColor,
    entityName, description, height = 400, entityCreatedAt,
    plan, isOffered,
    isOpen, headerChildren, bodyChildren, headerInRowChilden }: WorkspaceOverviewPanelProps) => {

    const size = 32
    const padding = 20
    const radius = 32

    return (
        <CommonMenuWrapper ref={wrapperRef} onClose={onClose}
            style={{ borderRadius: `${radius}px`, padding: `${padding}px`, height: `${height}px` }}
            className=" rounded-none
        w-fit !bg-neutral-300 !flex !flex-row">

            <div
                onClick={onClick}
                className=" w-[280px] flex flex-col h-full justify-between gap-2 pb-1 z-10">
                <div className="flex flex-row gap-4 items-start justify-between">
                    <div className="flex flex-row gap-2 items-start justify-start">
                        <div
                            style={{ borderRadius: `${radius - padding}px`, padding: `${10}px` }}
                            className="flex items-center justify-center border-[1.5px] border-neutral-900 ">
                            {iconId ? (
                                <CatalogIcon id={iconId} className="text-neutral-900" width={size} height={size} />
                            ) : (
                                <Grid2X2Plus className="text-neutral-900" size={size} strokeWidth={0.8} />
                            )}
                        </div>
                        {headerInRowChilden}
                        {plan && <SubscriptionBadge overrideSubscriptionClass="border-neutral-900
                    !max-h-max
                    text-neutral-900 border-[1.5px] !items-center !py-2"
                            style={{ borderRadius: `${8}px`, padding: `${10}px`, height: 28 }}
                            plan={plan} />}
                    </div>
                    {headerChildren}
                </div>
                {bodyChildren}
                <ImageColorRenderer
                    style={{ borderRadius: `${radius - padding}px` }}
                    className={`relative w-full  shadow-sm shadow-black/20
                    hover:ring-[3px] ${isOffered ? "ring-yellow-700/50" : "ring-fuchsia-800/30"}
                    transition-all duration-300 ease-in-out cursor-pointer`}
                    bgColor={coverColor}
                    bgImage={coverImage}
                    backgroundType={coverType}

                >

                    <div className={`${isOpen ? 'opacity-0' : 'opacity-100'} absolute inset-0 bg-gradient-to-t from-neutral-900/80 to-transparent rounded-lg transition-opacity duration-300 ease-in-out`} />
                    <div className={`${isOpen ? 'opacity-0' : 'opacity-100'} absolute bottom-6 left-4 text-xl z-10 font-normal transition-opacity duration-300 ease-in-out`}>{entityName}</div>
                </ImageColorRenderer>
                <div className={`${isOpen ? 'h-[200px] opacity-100' : 'h-0 opacity-0'} transition-all ease-in-out duration-600 flex flex-col gap-1 text-neutral-900 cursor-default`}>
                    <div className="flex flex-row gap-2 items-baseline">
                        <div className="text-xl font-normal">{entityName}</div>
                        {entityCreatedAt && <span className="text-xs text-neutral-400/80">{entityCreatedAt}</span>}
                    </div>

                    <div className="h-px w-full bg-neutral-800/10" />

                    <div className="text-xs text-neutral-900/80 ">{description}</div>
                </div>
            </div>
        </CommonMenuWrapper>
    )
}