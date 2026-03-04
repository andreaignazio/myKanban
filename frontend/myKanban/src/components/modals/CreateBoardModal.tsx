import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { CustomInput } from "../menuElements/CustomInput";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { LockClosedIcon, UsersIcon, GlobeAsiaAustraliaIcon } from "@heroicons/react/24/solid";
import { LabeledButtonCustom, LabeledButtonPresetA } from "../buttons/labeledButton";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";

import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useBoardsStore, type CreateBoardPayload } from "@/stores/boardsStore";
import LoadingIcons from "react-loading-icons";
import { CustomDropDown, type MenuItem, type WorkspaceMenuItem } from "@/components/menuElements/CustomDropDown";
import { BoardCardGhost } from "../workspaceView/boardCardGhost";

export type CreateBoardModalProps = {
    onClose?: () => void;
    onSubmit?: (payload: CreateBoardPayload) => void;
    workspaceId?: string;
}

import { gradientColorTokens, type ColorToken } from "@/domain/colorTokens";
import { Ellipsis } from "lucide-react";
import { ButtonHoverInset } from "../menuElements/buttonHoverInset";
import { useParams } from "react-router-dom";
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus";
import { BoardColorSelector } from "../workspaceView/boardColorSelector";
import type { BoardBackgroundColorProps, BoardBackgroundImageProps, BoardBackgroundProps, BoardProps, CreateBoardRequest } from "@/stores/types";
import { ImageColorSelector } from "../menuElements/ImageColorSelector";


//const inputStyle = " bg-menusec rounded-[3px] h-11 border border-neutral-500 border-opacity-85"
export const CreateBoardModal = forwardRef<HTMLDivElement, CreateBoardModalProps>((props, ref) => {
    const getMaxBoardsByWorkspaceId = useWorkspaceStore((state) => state.getMaxBoardsByWorkspaceId);
    const createBoardInWorkspace = useBoardsStore((state) => state.createBoardInWorkspace);
    const [title, setTitle] = useState("");
    const [background, setBackground] = useState<ColorToken | null>(gradientColorTokens[0]);
    const [canSubmit, setCanSubmit] = useState(false);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedVisibility, setSelectedVisibility] = useState<"private" | "public" | "workspace" | null>("workspace");



    const dropdownActiveIdMap = useOverlayStore((state) => state.dropdownActiveIdMap);
    const wsMenuId = "workspace-dropdown";
    const visibilityMenuId = "visibility-dropdown";

    const getIsSuccess = useBoardsStore((state) => state.getIsSuccess);
    const requestHandlerRef = useRef<ChildHandle>(null);

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


    const bIds = Array.from({ length: 5 }, () => Math.floor(Math.random() * 1000));
    const subTitleStyle = "text-[12px] font-medium tracking-wide mb-0"
    const imgGap = "gap-1.5"

    const visibleColorTokens = gradientColorTokens.filter((token, idx) => idx < 5)

    const requestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        const props: BoardProps = {
            Background: bg,
            Description: "",
        }
        const payload: CreateBoardRequest = {
            Name: title,
            Visibility: selectedVisibility,
            Props: props
        }
        requestHandlerRef.current?.setIsSent(true);
        requestHandlerRef.current?.setIsLoading(true);
        requestTimerRef.current = setTimeout(() => {
            requestHandlerRef.current?.handleRequestResult();
        }, 1000);
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

        <div ref={ref} className="theme-dark w-[300px] text-neutral-300 flex flex-col bg-menu rounded-lg p-3">
            <ModalRequestHandler ref={requestHandlerRef}
                getIsSuccess={getIsSuccess}
                handleClose={props.onClose || (() => { })} />
            <div className="flex flex-row justify-center text-center">
                <span className="text-mb font-semibold mb-4 text-center">Create new board</span>
                <div className="absolute right-4  h-8 aspect-square
                rounded-md
                 flex items-center justify-center ml-auto cursor-pointer 
                  hover:bg-neutral-700" onClick={props.onClose}>
                    <XMarkIcon className="h-5 w-5" />
                </div>
            </div>
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


                {false && <div className={`grid grid-cols-6 ${imgGap}`}>
                    {bIds.map((id) => (
                        <img
                            key={id}
                            src={`https://picsum.photos/600/400?random=${id}`}
                            alt="Board placeholder"
                            className="h-full w-full object-cover rounded-sm"
                        />
                    ))}
                </div>}
            </div>
            <div className="w-full flex flex-col gap-1 mt-4">
                <span className={subTitleStyle}>Board title</span>
                <CustomInput
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

    )
})

type ModalRequestHandlerProps = {

    getIsSuccess: () => boolean;
    handleClose: () => void;
}

export type ChildHandle = {
    handleRequestResult: () => void;
    setIsSent: (value: boolean) => void;
    setIsLoading: (value: boolean) => void;
    resetState: () => void;
}

export const ModalRequestHandler = forwardRef<ChildHandle, ModalRequestHandlerProps>(({ getIsSuccess, handleClose }, ref) => {

    const [isSent, setIsSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isUnsuccessful, setIsUnsuccessful] = useState(false);

    useImperativeHandle(ref, () => ({
        handleRequestResult,
        resetState,
        setIsSent,
        setIsLoading,
    }))

    function handleRequestResult() {
        // console.log("Handling request result. isRequestSuccessful:", getIsSuccess());
        if (getIsSuccess()) {
            setIsSuccess(true);
            setIsLoading(false);
            setTimeout(() => {
                handleClose();
            }, 1500);
        } else {
            setIsUnsuccessful(true);
            setIsSuccess(false);
            setIsLoading(false);
            setTimeout(() => {
                setIsSent(false);
                setIsUnsuccessful(false);

            }, 1000);

        }
    }

    function resetState() {
        setIsSent(false);
        setIsLoading(false);
        setIsSuccess(false);
        setIsUnsuccessful(false);

    }

    return (
        <>
            {(isSent) && (
                <div className={`absolute inset-0  ${isUnsuccessful ? 'bg-red-500' : 'bg-black'} bg-opacity-50 flex items-center justify-center z-50 rounded-2xl`}>

                    {isLoading && (
                        <>
                            <LoadingIcons.SpinningCircles className="text-white" />
                            <span className="text-lg font-mono">Sending share offer...</span>
                        </>
                    )}
                    {isSuccess && (
                        <span className="text-lg font-mono">Share offer sent successfully!</span>
                    )}
                    {isUnsuccessful && (
                        <span className="text-lg font-mono">Share offer sent failed!</span>
                    )}

                </div>
            )}
        </>
    )
})


