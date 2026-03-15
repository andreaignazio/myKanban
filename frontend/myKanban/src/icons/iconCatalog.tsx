import { Cog6ToothIcon, Squares2X2Icon, UsersIcon, CreditCardIcon, } from "@heroicons/react/24/solid";
import { CircleUser, ListTodo, Eye, LayoutList, Building2, BriefcaseBusiness, MailOpen, Link2 } from "lucide-react";
import type { ComponentProps } from "react";

export const iconCatalog = {
    boards: Squares2X2Icon,
    members: UsersIcon,
    settings: Cog6ToothIcon,
    profile: CircleUser,
    activities: ListTodo,
    cards: CreditCardIcon,
    watched: Eye,
    subscriptions: CreditCardIcon,
    lists: LayoutList,
    workspaces: Building2,
    briefCase: BriefcaseBusiness,
    eye: Eye,
    default: Squares2X2Icon,
    letterSent: MailOpen,
    letterReceived: MailOpen,
    link: Link2


} as const;

export type IconId = keyof typeof iconCatalog;

type CatalogIconProps = {
    id: IconId;
} & Omit<ComponentProps<"svg">, "ref">;

export function CatalogIcon({ id, className, ...props }: CatalogIconProps) {
    const Icon = iconCatalog[id];
    return <Icon className={className} {...props} />;
}
