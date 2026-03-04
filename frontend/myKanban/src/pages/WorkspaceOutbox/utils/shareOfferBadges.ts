import type { ShareOffer } from "@/stores/shareOffersStore";

export function getStatusBadgeClass(status: ShareOffer["Status"]) {
    switch (status) {
        case "accepted":
            return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
        case "pending":
            return "border-amber-500/40 bg-amber-500/15 text-amber-200";
        case "rejected":
            return "border-rose-500/40 bg-rose-500/15 text-rose-200";
        default:
            return "border-border/40 bg-surface/40 text-text";
    }
}

export function getRoleBadgeClass(role: ShareOffer["OfferedRole"]) {
    switch (role) {
        case "owner":
            return "border-amber-500/40 bg-amber-500/15 text-amber-200";
        case "admin":
            return "border-sky-500/40 bg-sky-500/15 text-sky-200";
        case "member":
            return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
        case "viewer":
            return "border-slate-500/40 bg-slate-500/15 text-slate-200";
        default:
            return "border-border/40 bg-surface/40 text-text";
    }
}
