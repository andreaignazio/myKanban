import { forwardRef, useEffect, useRef, useState } from "react";
import { CustomInput, type CustomInputHandle } from "../menuElements/CustomInput";
import { LockClosedIcon, UsersIcon, GlobeAsiaAustraliaIcon } from "@heroicons/react/24/solid";
import { LabeledButtonPresetA } from "../buttons/labeledButton";

import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useBoardsStore, type CreateBoardPayload } from "@/stores/boardsStore";
import { CustomDropDown, type MenuItem, type WorkspaceMenuItem } from "@/components/menuElements/CustomDropDown";
import { BoardCardGhost } from "../workspaceView/boardCardGhost";

export type CreateBoardModalProps = {
    onClose?: () => void;
    onSubmit?: (payload: CreateBoardPayload) => void;
    workspaceId?: string;
    overlayId?: string;
}

import { gradientColorTokens, type ColorToken } from "@/domain/colorTokens";
import { useParams } from "react-router-dom";
import type { BoardBackgroundColorProps, BoardBackgroundImageProps, BoardBackgroundProps, BoardProps, CreateBoardRequest } from "@/stores/types";
import { ImageColorSelector } from "../menuElements/ImageColorSelector";
import { ActionMenuWrapper } from "./ActionMenuWrapper";
import { useAsyncRequest } from "@/hooks/useAsyncRequest";
import { useAsyncKey } from "@/stores/asyncRequestStore";
import { useOverlayStore } from "@/overlays/overlayStore";


//const inputStyle = " bg-menusec rounded-[3px] h-11 border border-neutral-500 border-opacity-85"
export const CreateBoardModal = forwardRef<HTMLDivElement, CreateBoardModalProps>((props, ref) => {
    const getMaxBoardsByWorkspaceId = useWorkspaceStore((state) => state.getMaxBoardsByWorkspaceId);
    const createBoardInWorkspace = useBoardsStore((state) => state.createBoardInWorkspace);
    const titleInputRef = useRef<CustomInputHandle>(null);
    const [title, setTitle] = useState("");
    const [background, setBackground] = useState<ColorToken | null>(gradientColorTokens[0]);
    const [canSubmit, setCanSubmit] = useState(false);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedVisibility, setSelectedVisibility] = useState<"private" | "public" | "workspace" | null>("workspace");

    const workspaces = useWorkspaceStore((state) => state.workspaceIds);
    const workspacesItemsDynamic: WorkspaceMenuItem[] = workspaces.map((ws) => {
        const wsData = useWorkspaceStore((state) => state.workspacesById[ws]);
        const [currentBoards, maxBoards] = getMaxBoardsByWorkspaceId(ws);
        return {
            id: wsData.ID,
            label: wsData.Name,
            onClick: () => { setSelectedWorkspace(wsData.ID); },
            availableBoards: { current: currentBoards, max: maxBoards }
        }
    })

    const currentWorkspaceId = useParams().workspaceId as string | undefined
    useEffect(() => {
        const t = setTimeout(() => titleInputRef.current?.focus(), 50);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (props.workspaceId) {
            setSelectedWorkspace(props.workspaceId);
        } else if (currentWorkspaceId) {
            setSelectedWorkspace(currentWorkspaceId);
        }
    }, [props.workspaceId, currentWorkspaceId]);

    useEffect(() => {
        let wsFlag = false;
        let bgFlag = false;
        if (selectedWorkspace) {
            const workspaceLimit = getMaxBoardsByWorkspaceId(selectedWorkspace)[1];
            const currentBoards = getMaxBoardsByWorkspaceId(selectedWorkspace)[0];
            if (currentBoards < workspaceLimit) {
                wsFlag = true;
            }
        }
        if (background || selectedImage) {
            bgFlag = true;
        }
        setCanSubmit(wsFlag && bgFlag && !!selectedVisibility && title.trim().length > 0);
    }, [selectedWorkspace, selectedVisibility, title, getMaxBoardsByWorkspaceId, background, selectedImage])


    const visibilityItems: MenuItem[] = [
        {
            id: "private", label: "Private", description: "Only members of this board can see and edit", onClick: () => { setSelectedVisibility("private"); },
            icon: <LockClosedIcon className="h-6 aspect-square" />
        },
        {
            id: "workspace", label: "Workspace", description: "All the members of this workspace can see this board, full access still require authorization",
            onClick: () => { setSelectedVisibility("workspace"); }, icon: <UsersIcon className="h-12 aspect-square" />
        },
        { id: "public", label: "Public", description: "Anyone can see this board, full access still require authorization", onClick: () => { setSelectedVisibility("public"); }, icon: <GlobeAsiaAustraliaIcon className="h-9 aspect-square" /> },
    ]


    const subTitleStyle = "text-[12px] font-medium tracking-wide mb-0"

    const visibleColorTokens = gradientColorTokens.filter((token, idx) => idx < 5)

    const asyncKey = useAsyncKey("workspace:board:create", selectedWorkspace ?? "");
    const { isSuccessful } = useAsyncRequest(asyncKey);

    useEffect(() => {
        if (isSuccessful) {
            const t = setTimeout(() => props.onClose?.(), 1200);
            return () => clearTimeout(t);
        }
    }, [isSuccessful]);

    async function handleCreateBoard() {
        if (!selectedWorkspace || !selectedVisibility) {
            return;
        }

        const imageProp: BoardBackgroundImageProps = {
            Url: selectedImage || "",
        }
        const colorProp: BoardBackgroundColorProps = {
            Token: background?.token || "",
        }

        const bg: BoardBackgroundProps | undefined = {
            Type: selectedImage ? "image" : "color",
            Image: imageProp,
            Color: colorProp,
        }
        const boardProps: BoardProps = {
            Background: bg,
            Description: "",
        }
        const payload: CreateBoardRequest = {
            Name: title,
            Visibility: selectedVisibility,
            Props: boardProps
        }
        if (props.overlayId) useOverlayStore.getState().freezeAnchor(props.overlayId);
        await createBoardInWorkspace(selectedWorkspace, payload);
    }


    const handleSetColor = (color: ColorToken) => {
        setBackground(color);
        setSelectedImage(null);
    }
    const handleSetImage = (url: string) => {
        setSelectedImage(url);
        setBackground(null);
    }



    return (

        <ActionMenuWrapper ref={ref} Title="Create new board" onClose={props.onClose ?? (() => { })} width={300}
            requestKey={asyncKey}
            minLoadingMs={200}

        >
            <div className="flex flex-col px-3 pb-1 pt-2as text-neutral-300">
                <div className="flex justify-center items-center px-8">
                    <BoardCardGhost
                        className="transition-all transition-duration-200"
                        backgroundClassName={background?.className || ""}
                        backgroundImageUrl={selectedImage || undefined}
                    />
                </div>
                <div className="flex flex-col gap-1.5 mt-6">
                    <span className={subTitleStyle}>Background</span>
                    <ImageColorSelector
                        selectedColor={background}
                        selectedImage={selectedImage}
                        handleSetColor={handleSetColor}
                        handleSetImage={handleSetImage}
                        colorArray={visibleColorTokens}
                    />
                </div>
                <div className="w-full flex flex-col gap-1 mt-4">
                    <span className={subTitleStyle}>Board title</span>
                    <CustomInput
                        ref={titleInputRef}
                        value={title}
                        danger={title.trim().length === 0}
                        className="h-[38px]"
                        onInputChange={(inputRef) => {
                            inputRef?.current && setTitle(inputRef.current.value)
                        }}
                        placeholder="Enter board title"

                    />
                </div>
                <div className="w-full flex flex-col gap-1 mt-4">
                    <span className={subTitleStyle}>Workspace</span>
                    <CustomDropDown disableGlobalState={true}
                        style={{ height: 42 }}
                        className="!text-neutral-300 text-sm"
                        showChevron={true}
                        chevronClassName="h-4 text-neutral-400"
                        activeId={selectedWorkspace}
                        btnId="workspace-dropdown" items={workspacesItemsDynamic} />
                </div>
                <div className="w-full flex flex-col gap-1 mt-2">
                    <span className={subTitleStyle}>Visibility</span>
                    <CustomDropDown disableGlobalState={true}
                        style={{ height: 42 }}
                        className="!text-neutral-300 text-sm"
                        showChevron={true}
                        chevronClassName="h-4 text-neutral-400"
                        activeId={selectedVisibility}
                        btnId="visibility-dropdown" items={visibilityItems} />
                </div>
                <div className="w-full flex flex-col gap-1 mt-4">

                    <LabeledButtonPresetA label="Create Board" onClick={handleCreateBoard}
                        disabled={!canSubmit}
                        className="bg-menubtn rounded-md !h-8 justify-center
                    font-medium tracking-wide" />
                </div>
            </div>

        </ActionMenuWrapper>

    )
})


