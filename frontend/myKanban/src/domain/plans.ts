import type { SubscriptionPlan } from "@/stores/types";

export type SubscriptionPlanDefinition = {
    id: SubscriptionPlan;
    name: string;
    description: string;
    descriptionStrong: string;
    maxBoards: number;
    maxMembers: number;
    pricePerMember: number;
}

export const subscriptionPlans: SubscriptionPlanDefinition[] = [
    {
        id: "free",
        name: "Free",
        maxBoards: 5,
        maxMembers: 10,
        pricePerMember: 0,
        description: "Organize your day and keep moving forward",
        descriptionStrong: "Start simple. Stay on track.",
    },
    {
        id: "pro",
        name: "Pro",
        maxBoards: 15,
        maxMembers: 15,
        pricePerMember: 10,
        description: "Bring your team together and get more done",
        descriptionStrong: "Add focus. Get more done.",
    },
    {
        id: "premium",
        name: "Premium",
        maxBoards: -1,
        maxMembers: -1,
        pricePerMember: 20,
        description: "Optimize your workflow with unlimited features and priority support",
        descriptionStrong: "Unlock your full potential.",
    },
];

const subscriptionPlansById = subscriptionPlans.reduce((acc, plan) => {
    acc[plan.id] = plan;
    return acc;
}, {} as Record<SubscriptionPlan, SubscriptionPlanDefinition>);

export function getSubscriptionPlanDefinition(plan: SubscriptionPlan): SubscriptionPlanDefinition {
    return subscriptionPlansById[plan] ?? subscriptionPlansById.free;
}

export function getSubscriptionMaxBoards(plan: SubscriptionPlan): number {
    return getSubscriptionPlanDefinition(plan).maxBoards;
}

export function getSubscriptionMaxMembers(plan: SubscriptionPlan): number {
    return getSubscriptionPlanDefinition(plan).maxMembers;
}

export function isUnlimitedPlanLimit(limit: number): boolean {
    return limit < 0;
}

export function calculateSubscriptionNextBillingAmount(plan: SubscriptionPlan, memberCount: number): number {
    const normalizedMemberCount = Math.max(memberCount, 0);
    const { pricePerMember } = getSubscriptionPlanDefinition(plan);
    return pricePerMember * normalizedMemberCount;
}