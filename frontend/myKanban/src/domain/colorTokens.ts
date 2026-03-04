export type ColorToken = {
    label: string;
    token: string;
    className: string;
};

export type BaseImage = {
    id: number;
    url: string;
};

export type CoverTheme = {
    bg: string;
    text: string;
};

export const cardCover = [
    "#297A54",
    "#8A6900",
    "#A75700",
    "#C2362A",
    "#7E45AA",
    "#2454A5",
    "#2D7E9A",
    "#567A24",
    "#984680",
    "#676B72",
] as const;

export const listCover: CoverTheme[] = [
    { bg: "#297A54", text: "#D7F0E4" },
    { bg: "#8A6900", text: "#F3E8BE" },
    { bg: "#A75700", text: "#F7DFC5" },
    { bg: "#C2362A", text: "#F9D8D2" },
    { bg: "#7E45AA", text: "#EEDFFD" },
    { bg: "#2454A5", text: "#DBE8FF" },
    { bg: "#2D7E9A", text: "#DBF2FA" },
    { bg: "#567A24", text: "#E7F4D4" },
    { bg: "#984680", text: "#F5DFF0" },
    { bg: "#676B72", text: "#F0F3F6" },
];

export const getListCoverTheme = (bg?: string | null): CoverTheme | undefined => {
    if (!bg) {
        return undefined;
    }

    return listCover.find((theme) => theme.bg.toLowerCase() === bg.toLowerCase());
};

export const gradientColorTokens: ColorToken[] = [
    {
        label: "Deep navy",
        token: "grad_deep_navy",
        className: "bg-gradient-to-br from-[#1f3f73] to-[#18325b]",
    },
    {
        label: "Ocean blue",
        token: "grad_ocean_blue",
        className: "bg-gradient-to-br from-[#1f80f0] to-[#30b9d4]",
    },
    {
        label: "Royal blue",
        token: "grad_royal_blue",
        className: "bg-gradient-to-br from-[#1b66d9] to-[#123f8f]",
    },
    {
        label: "Violet dusk",
        token: "grad_violet_dusk",
        className: "bg-gradient-to-br from-[#2d3f8f] to-[#7d3f92]",
    },
    {
        label: "Lavender",
        token: "grad_lavender",
        className: "bg-gradient-to-br from-[#7a6cd9] to-[#c06ebd]",
    },
    {
        label: "Sunset orange",
        token: "grad_sunset_orange",
        className: "bg-gradient-to-br from-[#f05a2e] to-[#f3a13a]",
    },
    {
        label: "Pink coral",
        token: "grad_pink_coral",
        className: "bg-gradient-to-br from-[#d96db7] to-[#f0818d]",
    },
    {
        label: "Sea green",
        token: "grad_sea_green",
        className: "bg-gradient-to-br from-[#2f9d78] to-[#58b7c1]",
    },
    {
        label: "Slate blue",
        token: "grad_slate_blue",
        className: "bg-gradient-to-br from-[#4a5f86] to-[#213a67]",
    },
    {
        label: "Ember",
        token: "grad_ember",
        className: "bg-gradient-to-br from-[#5d260f] to-[#9c1f10]",
    },
];

export const flatColorTokens: ColorToken[] = [
    {
        label: "Azure",
        token: "flat_azure",
        className: "bg-[#157fbc]",
    },
    {
        label: "Mustard",
        token: "flat_mustard",
        className: "bg-[#d59535]",
    },
    {
        label: "Leaf green",
        token: "flat_leaf_green",
        className: "bg-[#529d39]",
    },
    {
        label: "Brick",
        token: "flat_brick",
        className: "bg-[#b44732]",
    },
    {
        label: "Muted purple",
        token: "flat_muted_purple",
        className: "bg-[#8966a5]",
    },
    {
        label: "Rose",
        token: "flat_rose",
        className: "bg-[#c35a92]",
    },
    {
        label: "Mint",
        token: "flat_mint",
        className: "bg-[#50bc69]",
    },
    {
        label: "Cyan",
        token: "flat_cyan",
        className: "bg-[#1aa8c5]",
    },
    {
        label: "Cool gray",
        token: "flat_cool_gray",
        className: "bg-[#8a949a]",
    },
];

export const workspaceGradientColorTokens: ColorToken[] = [
    {
        label: "Slate graphite",
        token: "ws_grad_slate_graphite",
        className: "bg-gradient-to-br from-[#3b4657] to-[#252f3d]",
    },
    {
        label: "Steel blue",
        token: "ws_grad_steel_blue",
        className: "bg-gradient-to-br from-[#3f566f] to-[#2c3f57]",
    },
    {
        label: "Indigo smoke",
        token: "ws_grad_indigo_smoke",
        className: "bg-gradient-to-br from-[#495470] to-[#323a4d]",
    },
    {
        label: "Forest slate",
        token: "ws_grad_forest_slate",
        className: "bg-gradient-to-br from-[#3f5a54] to-[#2a403c]",
    },
    {
        label: "Charcoal plum",
        token: "ws_grad_charcoal_plum",
        className: "bg-gradient-to-br from-[#4f4658] to-[#342f3b]",
    },
    {
        label: "Deep teal gray",
        token: "ws_grad_teal_gray",
        className: "bg-gradient-to-br from-[#3d5960] to-[#2b4046]",
    },
];

export const workspaceFlatColorTokens: ColorToken[] = [
    {
        label: "Slate",
        token: "ws_flat_slate",
        className: "bg-[#4b5563]",
    },
    {
        label: "Blue gray",
        token: "ws_flat_blue_gray",
        className: "bg-[#475569]",
    },
    {
        label: "Gunmetal",
        token: "ws_flat_gunmetal",
        className: "bg-[#3f4a5a]",
    },
    {
        label: "Moss gray",
        token: "ws_flat_moss_gray",
        className: "bg-[#4b5d52]",
    },
    {
        label: "Muted navy",
        token: "ws_flat_muted_navy",
        className: "bg-[#3c4f66]",
    },
    {
        label: "Stone",
        token: "ws_flat_stone",
        className: "bg-[#57534e]",
    },
];

export const workspaceBorderColorTokens: ColorToken[] = [
    {
        label: "No border",
        token: "ws_border_none",
        className: "bg-transparent border border-dashed border-neutral-500/60",
    },
    {
        label: "Cool steel",
        token: "ws_border_cool_steel",
        className: "bg-[#94a3b8]",
    },
    {
        label: "Fog gray",
        token: "ws_border_fog_gray",
        className: "bg-[#9ca3af]",
    },
    {
        label: "Muted slate",
        token: "ws_border_muted_slate",
        className: "bg-[#8b95a7]",
    },
    {
        label: "Soft bronze",
        token: "ws_border_soft_bronze",
        className: "bg-[#a78b6d]",
    },
    {
        label: "Pine gray",
        token: "ws_border_pine_gray",
        className: "bg-[#8ba096]",
    },
    {
        label: "Dusty indigo",
        token: "ws_border_dusty_indigo",
        className: "bg-[#8b92b3]",
    },
];

export const baseImages: BaseImage[] = [
    {
        id: 1,
        url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 2,
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 3,
        url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 4,
        url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 5,
        url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 6,
        url: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 7,
        url: "https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 8,
        url: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 9,
        url: "https://images.unsplash.com/photo-1431794062232-2a99a5431c6c?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 10,
        url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 11,
        url: "https://images.unsplash.com/photo-1493244040629-496f6d136cc3?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 12,
        url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 13,
        url: "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 14,
        url: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 15,
        url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2000&q=80",
    },
    {
        id: 16,
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 17,
        url: "https://images.unsplash.com/photo-1431794062232-2a99a5431c6c?auto=format&fit=crop&w=2000&q=80",
    },
    {
        id: 18,
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 19,
        url: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 20,
        url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 21,
        url: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 22,
        url: "https://images.unsplash.com/photo-1493244040629-496f6d136cc3?auto=format&fit=crop&w=2000&q=80",
    },
    {
        id: 23,
        url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=2000&q=80",
    },
    {
        id: 24,
        url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 25,
        url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2000&q=80",
    },
    {
        id: 26,
        url: "https://images.unsplash.com/photo-1482192505345-5655af888cc4?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 27,
        url: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 28,
        url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1400&q=80",
    },
    {
        id: 29,
        url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2400&q=80",
    },
    {
        id: 30,
        url: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1400&q=80",
    },
];

export const getClassNamesForColorToken = (token: string) => {

    const className = flatColorTokens.find((color) => color.token === token)?.className ||
        gradientColorTokens.find((color) => color.token === token)?.className ||
        workspaceFlatColorTokens.find((color) => color.token === token)?.className ||
        workspaceGradientColorTokens.find((color) => color.token === token)?.className ||
        workspaceBorderColorTokens.find((color) => color.token === token)?.className ||
        "";
    return className;

}

export const getClassNamesForWorkspaceColorToken = (token: string) => {
    const className = workspaceFlatColorTokens.find((color) => color.token === token)?.className ||
        workspaceGradientColorTokens.find((color) => color.token === token)?.className ||
        workspaceBorderColorTokens.find((color) => color.token === token)?.className ||
        "";
    return className;
}