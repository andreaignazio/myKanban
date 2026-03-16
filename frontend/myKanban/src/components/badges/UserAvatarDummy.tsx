import { gradientColorTokens, flatColorTokens } from "@/domain/colorTokens";

import { ButtonHoverInset } from "../menuElements/buttonHoverInset";
import { Pencil } from "lucide-react";

import type { AnyUser } from "@/stores/usertypes";


function getStableIndexFromString(value: string, length: number): number {
    if (length <= 0) return 0;

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }

    return hash % length;
}

export type UserAvatarDummyProps = {
    user: AnyUser | undefined;
    className?: string;
    size?: number;
    overrideMode?: boolean;
    colorOverride?: string;
    imageOverride?: string;
    initialsOverride?: string;
    darkenOnHover?: boolean;
    showEditHover?: boolean;
    disableHoverEffect?: boolean;
    presence?: boolean;
    showPresence?: boolean;

}


export function UserAvatarDummy({ user, className, size, overrideMode, colorOverride, imageOverride, initialsOverride, darkenOnHover, showEditHover, disableHoverEffect, presence, showPresence }: UserAvatarDummyProps) {
    const hasImageOverride = imageOverride !== undefined;
    const hasColorOverride = colorOverride !== undefined;
    const userAvatarType = overrideMode ? undefined : user?.Props?.Avatar?.Type;

    const userAvatarUrl = overrideMode
        ? undefined
        : (userAvatarType === "image"
            ? user?.Props?.Avatar?.Url
            : (userAvatarType === "color" ? undefined : user?.Props?.Avatar?.Url));
    const userAvatarColor = overrideMode
        ? undefined
        : (userAvatarType === "color"
            ? user?.Props?.Avatar?.Color
            : (userAvatarType === "image" ? undefined : user?.Props?.Avatar?.Color));
    const userFallbackUrl = overrideMode ? undefined : user?.AvatarUrl;
    const userInitials = overrideMode ? undefined : user?.Props?.Initials?.trim();
    const userNameInitial = overrideMode ? undefined : user?.Name?.[0]?.toUpperCase();
    const avatarSeed = overrideMode ? "U" : (user?.ID ?? "U");

    const avatarUrl = hasImageOverride
        ? imageOverride
        : (hasColorOverride ? undefined : userAvatarUrl);

    const avatarColor = hasColorOverride ? colorOverride : userAvatarColor
    const fallBackUrl = userFallbackUrl

    const resolvedAvatarUrl = avatarUrl ? avatarUrl : (avatarColor ? null : fallBackUrl)
    const avatarOverlayClass = resolvedAvatarUrl || avatarColor ? "bg-transparent" : "bg-black/15"

    const initials = initialsOverride ?? userInitials;
    const avatarSize = size ?? 32;

    const textClassResolved = avatarSize >= 64 ? "text-3xl" : (avatarSize >= 40 ? "text-xl" : avatarSize >= 32 ? "text-md" : "text-xs");

    //console.log("Rendering UserAvatar with props:", { avatarUrl, avatarColor, fallBackUrl, resolvedAvatarUrl, initials, avatarSize });

    const gradientIndex = getStableIndexFromString(avatarSeed, gradientColorTokens.length);
    const fallbackGradient = gradientColorTokens[gradientIndex];
    const flatIndex = getStableIndexFromString(avatarSeed, flatColorTokens.length);
    const fallbackFlat = flatColorTokens[flatIndex];
    return (
        <div
            className={`relative isolate ${fallbackFlat.className} h-8 aspect-square group
                ${showPresence ? (presence ? " ring-2 ring-teal-400" : "ring-2 ring-amber-500") : ""}
                 rounded-full flex items-center justify-center ${resolvedAvatarUrl ? "!bg-transparent" : (avatarColor ? "!bg-transparent" : fallbackGradient.className)}
                 ${disableHoverEffect ? "cursor-default" : "hover:ring-2 hover:ring-white/80 cursor-pointer"} transition-all 
                  overflow-hidden ${className}`}
            style={{ width: avatarSize, height: avatarSize }}
        >
            {!disableHoverEffect && <ButtonHoverInset className={`z-20 ${darkenOnHover ? "hover:bg-black/30 " : "hover:bg-white/30"}`} onClick={() => { }} />}
            {resolvedAvatarUrl && (
                <img src={resolvedAvatarUrl}
                    alt={`${overrideMode ? "User" : (user?.Name ?? "User")}'s avatar`}
                    className=" absolute h-full w-full rounded-full object-cover" />)}
            {!resolvedAvatarUrl && avatarColor && (
                <div className={`absolute h-full w-full rounded-full ${avatarColor}`} />
            )}
            <div className={`z-10 h-full w-full flex items-center justify-center ${avatarOverlayClass}`}>
                <p className={`text-white font-normal ${textClassResolved} opacity-100 transition-opacity duration-200
                ${showEditHover ? "group-hover:opacity-0" : "group-hover:block"}
                `}>{initials || userNameInitial || "U"}</p>

            </div>
            <Pencil className={`absolute z-10 opacity-0 group-hover:opacity-100
                     transition-opacity duration-200
                      text-white h-6 w-6 ${showEditHover ? "block" : "hidden"}`} />
        </div>
    )
}