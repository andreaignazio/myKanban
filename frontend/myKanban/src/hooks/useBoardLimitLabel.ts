import type { MenuItem, WorkspaceMenuItem } from "@/components/menuElements/CustomDropDown";

export function useBoardLimitLabel() {

    const resolveAvailableBoards = (item: MenuItem | WorkspaceMenuItem) => {
        if ("availableBoards" in item) {
            if (item.availableBoards.max === -1) {
                return "∞"
            }
            return `${item.availableBoards.current}/${item.availableBoards.max}`
        } return undefined;

    }
    return { resolveAvailableBoards };
}