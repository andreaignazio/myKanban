import { create } from "zustand";

type EventStore = {
    eventsTypesByCorrelationId: Record<string, string[]>
    addEvent: (correlationId: string, eventType: string) => void
    isAlreadyProcessed: (correlationId: string, eventType: string) => boolean
}

export const useEventStore = create<EventStore>((set, get) => ({
    eventsTypesByCorrelationId: {},
    addEvent: (correlationId, eventType) => {
        console.log("[EventStore] Adding event", { correlationId, eventType })
        set((state) => ({
            eventsTypesByCorrelationId: {
                ...state.eventsTypesByCorrelationId,
                [correlationId]: [...(state.eventsTypesByCorrelationId[correlationId] || []), eventType]
            }
        }))
    },
    isAlreadyProcessed: (correlationId, eventType) => {
        console.log("[EventStore] Checking if event is already processed", { correlationId, eventType })
        const eventsForCorrelation = get().eventsTypesByCorrelationId[correlationId] || [];
        return eventsForCorrelation.includes(eventType);
    },

}))