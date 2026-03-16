import { useEffect, useRef, useState } from "react"

export function useInlineTitleEditing(persistFunction: (title: string) => void, initialTitle: string) {
    const [titleFocused, setTitleFocused] = useState(false)
    const [title, setTitle] = useState(initialTitle)

    useEffect(() => {
        setTitle(initialTitle)
    }, [initialTitle])



    const titleInputRef = useRef<HTMLInputElement>(null)
    const skipNextBlurCommitRef = useRef(false)

    const resetInputViewportToStart = () => {
        const input = titleInputRef.current
        if (!input) return

        input.setSelectionRange(0, 0)
        input.scrollLeft = 0
    }

    const persistCurrentTitle = () => {
        const currentTitle = titleInputRef.current?.value || "Untitled List"
        if (currentTitle !== initialTitle) {
            persistFunction(currentTitle)
        }
    }

    const handleOnBlurTitle = () => {
        resetInputViewportToStart()
        setTitleFocused(false);

        if (skipNextBlurCommitRef.current) {
            skipNextBlurCommitRef.current = false
            return
        }

        persistCurrentTitle()
    }

    const commitTitleChange = () => {
        resetInputViewportToStart()
        persistCurrentTitle()
        skipNextBlurCommitRef.current = true
        titleInputRef.current?.blur()
        setTitleFocused(false)
    }

    const cancelTitleChange = () => {
        resetInputViewportToStart()
        skipNextBlurCommitRef.current = true
        titleInputRef.current?.blur()
        setTitleFocused(false)
        setTitle(initialTitle)
    }


    useEffect(() => {

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" && titleFocused) {
                commitTitleChange()
            }
            if (e.key === "Escape" && titleFocused) {
                cancelTitleChange()
            }

        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [titleFocused])


    return {
        title,
        setTitle,
        titleFocused,
        setTitleFocused,
        titleInputRef,
        handleOnBlurTitle,
    }
}