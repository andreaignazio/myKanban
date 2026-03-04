import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/stores/userStore";
import type { User } from "@/stores/types";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { SerchedResults } from "@/components/menuElements/SearchedResults";

type UseShareUserSearchOptions = {
    overlayId: string;
    debounceMs?: number;
}

export const useShareUserSearch = ({ overlayId, debounceMs = 500 }: UseShareUserSearchOptions) => {
    const searchUsers = useUserStore((state) => state.searchUser);

    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [isFocused, setIsFocused] = useState(false);

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const inputWrapperRef = useRef<HTMLDivElement>(null);

    const openOverlay = useOverlayStore((state) => state.open);
    const closeOverlay = useOverlayStore((state) => state.close);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            closeOverlay(overlayId);
        };
    }, [closeOverlay, overlayId]);

    useEffect(() => {
        if (searchResults.length > 0) {
            const descriptor: OverlayDescriptor = {
                id: overlayId,
                render: () => (
                    <SerchedResults
                        anchorRef={inputWrapperRef}
                        searchResults={searchResults}
                        ref={panelRef}
                        onSelect={handleSelectUser}
                    />
                ),
                panelRef,
                anchorRef: inputWrapperRef,
                type: "dropdown",
                opts: {
                    closeOnClickOutside: true,
                    closeOnEscape: true,
                    closeOnMouseLeave: false,
                    lockBackdrop: true,
                },
                position: {
                    placement: "bottom-start",
                    offset: [2, 2],
                },
                renderType: "anchored",
                exclusiveGroup: "dropdowns",
            };
            openOverlay(descriptor);
            return;
        }
        closeOverlay(overlayId);
    }, [searchResults, openOverlay, closeOverlay, overlayId]);

    const handleInputChange = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        const value = inputRef.current?.value ?? "";
        timeoutRef.current = setTimeout(() => {
            searchUsers(value).then((users) => {
                setSearchResults(users);
            });
        }, debounceMs);
    };

    const handleSelectUser = (user: User) => {
        setSearchResults([]);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
        setSelectedUsers((prev) => [...prev, user]);
    };

    const handleFocus = () => {
        setIsFocused(true);
        inputRef.current?.classList.add("outline-none");
    };

    const handleBlur = () => {
        setIsFocused(false);
        inputRef.current?.classList.remove("outline-none");
    };

    const removeSelectedUser = (userId: string) => {
        setSelectedUsers((prev) => prev.filter((user) => user.ID !== userId));
    };

    const reset = () => {
        setSearchResults([]);
        setSelectedUsers([]);
        setIsFocused(false);
        if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.classList.remove("outline-none");
        }
        closeOverlay(overlayId);
    };

    return {
        inputRef,
        inputWrapperRef,
        searchResults,
        selectedUsers,
        isFocused,
        handleInputChange,
        handleSelectUser,
        handleFocus,
        handleBlur,
        removeSelectedUser,
        reset,
    };
};
