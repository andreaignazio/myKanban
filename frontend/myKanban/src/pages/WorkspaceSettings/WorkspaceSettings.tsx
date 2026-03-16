import { UserPagesWrapper } from "../User/userPagesWrapper"
import { useParams } from "react-router-dom"
import { useResolveSubscriptionPlan } from "@/hooks/useResolveSubscriptionPlan"
import { SubscriptionBadge } from "@/components/badges/subscriptionBadge"
import { EntityHeaderCard } from "@/components/headerCards/EntityHeaderCard"
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus"
import { ButtonHoverInset } from "@/components/menuElements/buttonHoverInset"
import { WorkspaceCoverEditor } from "./workspaceCoverEditor"
import { WorkspaceIconEditor } from "./workspaceIconEditor"
import { useEffect, useState } from "react"
import { CustomInput } from "@/components/menuElements/CustomInput"
import { LabeledButtonPresetBSubmit } from "@/components/buttons/labeledButton"
import { useWorkspaceActionRegistry } from "@/actionRegistry/workspaceActionRegistry"
import { CustomDropDown, type MenuItem } from "@/components/menuElements/CustomDropDown"
import { GlobeAsiaAustraliaIcon, LockClosedIcon, UsersIcon } from "@heroicons/react/24/solid"
import { WorkspaceAvatar } from "./WorkspaceAvatar"
import { useWorkspaceDerivedProps } from "@/hooks/useWorkspaceDerivedProps"
import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole"

export const WorkspaceSettings = () => {
    const workspaceId = useParams().workspaceId
    const { workspace, workspaceName, headerProps } = useWorkspaceDerivedProps(workspaceId)
    const workspaceActions = useWorkspaceActionRegistry()
    const [editedName, setEditedName] = useState(workspace?.Name ?? "")
    const [editedDescription, setEditedDescription] = useState((workspace?.Props?.Description as string | undefined) ?? "")
    const [selectedVisibility, setSelectedVisibility] = useState<"private" | "workspace" | "public">((workspace?.Visibility as "private" | "workspace" | "public") ?? "private")
    const { coverType, coverImage, coverColor, footerBackgroundColorOverride } = headerProps

    const { isAdminOrOwner } = useCurrentWorkspaceRole(workspaceId)
    const { subscription } = useResolveSubscriptionPlan();

    useEffect(() => {
        setEditedName(workspace?.Name ?? "")
        setEditedDescription((workspace?.Props?.Description as string | undefined) ?? "")
        setSelectedVisibility((workspace?.Visibility as "private" | "workspace" | "public") ?? "private")
    }, [workspace?.Name, workspace?.Props?.Description, workspace?.Visibility])

    const hasChanges = editedName.trim() !== (workspace?.Name ?? "").trim()
        || editedDescription !== ((workspace?.Props?.Description as string | undefined) ?? "")

    const canSave = isAdminOrOwner && !!workspaceId && editedName.trim().length > 0 && hasChanges
    const visibilityChanged = selectedVisibility !== ((workspace?.Visibility as "private" | "workspace" | "public") ?? "private")
    const canSaveVisibility = isAdminOrOwner && !!workspaceId && visibilityChanged

    const visibilityItems: MenuItem[] = [
        {
            id: "private", label: "Private", description: "Only invited members can access this workspace",
            icon: <LockClosedIcon className="h-5 aspect-square" />,
            onClick: () => setSelectedVisibility("private")
        },
        {
            id: "workspace", label: "Workspace", description: "Visible to users already in related workspace contexts",
            icon: <UsersIcon className="h-5 aspect-square" />,
            onClick: () => setSelectedVisibility("workspace")
        },
        {
            id: "public", label: "Public", description: "Anyone can discover this workspace",
            icon: <GlobeAsiaAustraliaIcon className="h-5 aspect-square" />,
            onClick: () => setSelectedVisibility("public")
        },
    ]

    const handleSaveWorkspaceDetails = async () => {
        if (!workspaceId || editedName.trim().length === 0) return

        await workspaceActions.patchWorkspaceProps(workspaceId, {
            Name: editedName.trim(),
            Props: {
                Description: editedDescription,
            }
        })
    }

    const handleSaveVisibility = async () => {
        if (!workspaceId) return
        await workspaceActions.patchWorkspaceProps(workspaceId, {
            Visibility: selectedVisibility,
            Props: {}
        })
    }

    return (
        <UserPagesWrapper Title="Workspace Settings">
            <div className="flex flex-col gap-2 min-h-0 pb-8 pr-1">
                <EntityHeaderCard
                    type="workspace"
                    coverType={coverType as "color" | "image" | undefined}
                    coverImage={coverImage}
                    coverColor={coverColor}
                    footerBackgroundColorOverride={footerBackgroundColorOverride}
                    coverAction={
                        <CardRowMenuBtn
                            customId="workspace-cover-editor"
                            disableClick={!workspaceId}
                            menuComponent={({ ref, onClose }) => (
                                <WorkspaceCoverEditor ref={ref} workspaceID={workspaceId ?? ""} onClose={onClose} />
                            )}
                        >
                            <ButtonHoverInset onClick={() => { }} />
                        </CardRowMenuBtn>
                    }
                    footer={
                        <div className="flex h-full w-full items-center justify-start pl-40">
                            <div className="flex flex-col items-start">
                                <h2 className="text-lg font-semibold text-neutral-300">{workspaceName}</h2>
                                <SubscriptionBadge plan={subscription} />
                            </div>
                        </div>
                    }
                >
                    <CardRowMenuBtn
                        customId="workspace-icon-editor"
                        disableClick={!workspaceId}
                        placement="bottom-start"
                        menuComponent={({ ref, onClose }) => (
                            <WorkspaceIconEditor ref={ref} workspaceID={workspaceId ?? ""} onClose={onClose} />
                        )}
                    >
                        <WorkspaceAvatar workspaceID={workspaceId ?? ""} />


                    </CardRowMenuBtn>
                </EntityHeaderCard>
                <div className="h-px bg-neutral-400/20 w-full mt-4" />
                <div className="overflow-y-auto flex flex-col">
                    <div className="text-lg font-bold mt-6 mb-2">Workspace details</div>
                    <div className="flex flex-col w-full mt-4">
                        <div className="flex flex-row items-center mb-2">
                            <span className="text-sm text-neutral-400 font-bold">Workspace name</span>
                        </div>
                        <CustomInput
                            value={editedName}
                            danger={editedName.trim().length === 0}
                            className="h-[38px]"
                            onInputChange={(inputRef) => {
                                inputRef?.current && setEditedName(inputRef.current.value)
                            }}
                            placeholder="Enter workspace name"
                        />
                    </div>

                    <div className="flex flex-col w-full mt-6">
                        <div className="flex flex-row items-center mb-2">
                            <span className="text-sm text-neutral-400 font-bold">Workspace description</span>
                        </div>
                        <CustomInput
                            value={editedDescription}
                            className="min-h-[90px] max-h-[220px] h-auto"
                            onInputChange={(inputRef) => {
                                inputRef?.current && setEditedDescription(inputRef.current.value)
                            }}
                            placeholder="Describe this workspace"
                            useTextArea={true}
                        />
                    </div>

                    <div className="flex flex-row justify-end w-full mt-4">
                        <LabeledButtonPresetBSubmit
                            className="!w-32"
                            label="Save"
                            disabled={!canSave}
                            onClick={handleSaveWorkspaceDetails}
                        />
                    </div>

                    <div className="h-px bg-neutral-400/20 w-full mt-8" />

                    <div className="text-lg font-bold mt-6 mb-2">Visibility</div>
                    <div className="w-full flex flex-col gap-1 mt-2">
                        <span className="text-sm text-neutral-400 font-bold">Workspace visibility</span>
                        <CustomDropDown
                            disableGlobalState={true}
                            style={{ height: 42 }}
                            className="!text-neutral-300 text-sm"
                            showChevron={true}
                            chevronClassName="h-4 text-neutral-400"
                            activeId={selectedVisibility}
                            onClick={(id) => setSelectedVisibility(id as "private" | "workspace" | "public")}
                            btnId={`workspace-settings-visibility-${workspaceId ?? "unknown"}`}
                            items={visibilityItems}
                        />
                    </div>

                    <div className="flex flex-row justify-end w-full mt-4">
                        <LabeledButtonPresetBSubmit
                            className="!w-32"
                            label="Save"
                            disabled={!canSaveVisibility}
                            onClick={handleSaveVisibility}
                        />
                    </div>

                </div>
                <div className="bg-zinc-900/50 flex flex-col h-fit gap-6 px-2 py-2 rounded-2xl w-full mt-4">
                    <div className="flex flex-col items-start justify-start gap-2 mt-4 px-2 ">
                        <div className="text-lg font-bold font-grotesk text-red-500">Danger zone</div>
                        <div className="text-sm text-neutral-400">Permanently delete this workspace and all of its contents. This action cannot be undone.</div>
                    </div>
                    <button disabled={!isAdminOrOwner} className="w-64 bg-rose-800/20
                    hover:bg-red-800/40 transition-colors duration-200
                    rounded-xl h-12 flex items-center justify-center
                    py-3 px-4 text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none" onClick={() => { }}>
                        <span className="text-sm text-red-500 text-center w-full font-bold">Delete workspace</span>
                    </button>
                </div>
            </div>
        </UserPagesWrapper>
    )
}