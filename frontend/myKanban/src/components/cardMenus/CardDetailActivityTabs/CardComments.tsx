import { MessageSquareText } from "lucide-react"
import { PADDING_L } from "../../modals/CardDetailMenu"
import { LabeledButtonPresetB } from "../../buttons/labeledButton"
import { useCardCommentsStore } from "@/stores/cardCommentsStore"
import { useShallow } from "zustand/shallow"
import { useParams } from "react-router"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry"
import CardDescriptionMdEditor from "../cardDescriptionMdEditor"
import { useUserStore } from "@/stores/userStore"
import { UserAvatar } from "../../badges/UserAvatar"
import { useDateTimeParser } from "@/hooks/useDateTimeParser"
import { SubmitFooter } from "../../menuElements/submitFooter"
import { useAuthStore } from "@/stores/auth"
import { extractMentionedUserIDs } from "@/hooks/commentMentions"
import type { RefObject } from "react";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { UserHoverCard } from "../../modals/UserHoverCard";
import type { MentionBadgeClickPayload } from "../cardDescriptionMdEditor";
import { C_PADDING_L, CardActivityWrapper } from "./CardActivityWrapper"




export type MainCommentEditorHandle = {
    handleReply: (draft: string) => void
}

export const CardComments = () => {
    const cardId = useParams().cardId as string
    const boardId = useParams().boardId as string
    const fetchCommentsForCard = useCardCommentsStore((state) => state.fetchCommentsForCard)
    const commentsIds = useCardCommentsStore(useShallow((state) => state.commentsIdsByCardId[cardId] || []))
    const mainEditorRef = useRef<MainCommentEditorHandle>(null)

    useEffect(() => {
        if (cardId && boardId) {
            fetchCommentsForCard(boardId, cardId)
        }
    }, [cardId, boardId, fetchCommentsForCard])

    const handleReplyFromComment = (draft: string) => {
        mainEditorRef.current?.handleReply(draft)
    }

    const openOverlay = useOverlayStore((state) => state.open);
    const mentionCardPanelRef = useRef<HTMLDivElement>(null);

    const handleMentionBadgeClick = useCallback(({ userID, anchorEl }: MentionBadgeClickPayload) => {
        const anchorRef = { current: anchorEl } as RefObject<HTMLElement | null>;
        // console.log("handleMentionBadgeClick called with userID:", userID, "anchorEl:", anchorEl);
        const descriptor: OverlayDescriptor = {
            id: `mention-user-card-${userID}`,
            type: "popover",
            renderType: "anchored",
            render: () => <UserHoverCard userID={userID} />,
            panelRef: mentionCardPanelRef,
            anchorRef,
            exclusiveGroup: "mention-user-card",
            opts: {
                closeOnClickOutside: true,
                closeOnEscape: true,
                closeOnMouseLeave: false,
                lockBackdrop: false,
            },
            position: {
                placement: "bottom-start",
                offset: [8, 0],
            },
        };

        openOverlay(descriptor);
    }, [openOverlay]);


    return (
        <CardActivityWrapper label="Comments">
            <div className="relative flex flex-col items-start gap-2 mt-4">
                <CommentEditor ref={mainEditorRef} onMentionBadgeClick={handleMentionBadgeClick} />
                {commentsIds.map((commentId) => (
                    <CommentItem key={commentId} commentId={commentId} handleReply={handleReplyFromComment}
                        onMentionBadgeClick={handleMentionBadgeClick} />
                ))}
            </div>
        </CardActivityWrapper>
    )
}

type CommentEditorProps = {
    onMentionBadgeClick: (payload: MentionBadgeClickPayload) => void;
}

const CommentEditor = forwardRef<MainCommentEditorHandle, CommentEditorProps>(({ onMentionBadgeClick }, ref) => {
    const boardId = useParams().boardId as string
    const cardId = useParams().cardId as string
    const [commentDraft, setCommentDraft] = useState("")
    const [isEditing, setIsEditing] = useState(false)

    const addCommentToCard = useCardActionRegistry().addCommentToCard

    const addComment = () => {
        const content = commentDraft
        if (content) {
            addCommentToCard(boardId, cardId, commentDraft);
            setCommentDraft("")
            setIsEditing(false)
        } else {
            setIsEditing(false)
        }
    }

    useImperativeHandle(ref, () => ({
        handleReply: (draft: string) => {
            setCommentDraft(draft)
            setIsEditing(true)
        }
    }), [])

    const handleCancel = () => {
        setCommentDraft("")
        setIsEditing(false)
    }

    const usersById = useUserStore((state) => state.usersById)

    const mentionedUserIDs = extractMentionedUserIDs(commentDraft, usersById);
    const payload = {
        Content: commentDraft,
        MentionedUserIDs: mentionedUserIDs.length ? mentionedUserIDs : undefined,
    };


    const searchUser = useUserStore((s) => s.searchUser);
    const mergeUsers = useUserStore((s) => s.mergeUsers);

    const searchMentionUsers = useCallback(async (query: string) => {
        const q = query.trim();
        if (!q) return [];
        const users = await searchUser(q);
        //const users = data.Users || [];
        // console.log("Search users for mention with query:", q, "Found users:", users);
        if (users.length) mergeUsers(users);
        return users.map((u) => ({
            ID: u.ID,
            Name: u.Name,
            Username: u.Username,
            AvatarUrl: u.AvatarUrl,
        }));
    }, [searchUser, mergeUsers]);

    const isEmpty = commentDraft.trim().length === 0;
    return (
        <>
            <div className=" relative w-full flex flex-col items-center justify-start">

                <CardDescriptionMdEditor
                    style={{ height: isEditing ? "min-content" : "38px" }}
                    key={cardId}
                    value={commentDraft}
                    onChangeMarkdown={setCommentDraft}
                    onMentionBadgeClick={onMentionBadgeClick}
                    onBlurSave={() => {
                        setIsEditing(false)
                    }}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    className={`md-editor-shell rounded-xl shadow-md shadow-black/20 relative overflow-hidden w-full transition-transform ${isEditing
                        ? 'border !bg-menusec' : " bg-menusec border-none"}`}
                    enableMentions
                    onMentionSearch={searchMentionUsers}
                    mentionMinLength={1}
                    mentionMaxResults={8}
                    placeholder="Write a comment..."
                    placeholdeClassName={`"font-inter text-neutral-500 font-bold tracking-normal" ${isEditing ? "absolute top-[60px] pl-5" : "absolute top-[18px] pl-3"}`}
                />
                {isEditing && <div className="flex flex-row  w-full mt-2 items-center justify-between">
                    <LabeledButtonPresetB label="Add comment" disabled={isEmpty}
                        className="px-3 font-inter text-neutral-300" onClick={() => { addComment() }} />
                    <LabeledButtonPresetB label="Cancel"
                        className="px-3 font-inter text-neutral-300" onClick={handleCancel} />
                </div>}

            </div>

        </>
    )
})

CommentEditor.displayName = "CommentEditor"

type CommentItemProps = {
    commentId: string;
    handleReply: (draft: string) => void;
    onMentionBadgeClick: (payload: MentionBadgeClickPayload) => void;
}

const CommentItem = ({ commentId, handleReply, onMentionBadgeClick }: CommentItemProps) => {
    const boardId = useParams().boardId as string
    const cardId = useParams().cardId as string
    const commitEditForCard = useCardActionRegistry().editCommentForCard
    const deleteCommentForCard = useCardActionRegistry().deleteCommentForCard

    const comment = useCardCommentsStore((state) => state.commentsById[commentId])
    const [isEditing, setIsEditing] = useState(false)
    const [commentDraft, setCommentDraft] = useState(comment?.Content || "")
    const [baseComment, setBaseComment] = useState(comment?.Content || "")
    const user = useUserStore((state) => state.usersById[comment?.CreatedByUserID || ""])
    const currentUserId = useAuthStore((state) => state.userID)

    const isOwnComment = comment?.CreatedByUserID === currentUserId

    const elapsedTime = comment ? Date.now() - new Date(comment.CreatedAt).getTime() : 0
    const commentDate = comment ? new Date(comment.CreatedAt) : new Date()
    const elapsedHours = Math.floor(elapsedTime / (1000 * 60 * 60))
    const elapseMinutes = Math.floor(elapsedTime / (1000 * 60))
    const readableDate = useDateTimeParser().stringifyDatePretty(commentDate)
    const resolvedElapsedTime = elapsedHours > 24 ? `${readableDate?.date + " " + readableDate?.time}` : elapsedHours > 0 ? `${elapsedHours} hours ago` : `${elapseMinutes} minutes ago`

    const isSavingDisabled = commentDraft === baseComment
    const handleSave = () => {
        if (comment) {
            commitEditForCard(boardId, cardId, comment.ID, commentDraft);
            setBaseComment(commentDraft)
            setIsEditing(false)
        }
    }
    const hadnleCancel = () => {
        setCommentDraft(baseComment)
        setIsEditing(false)
    }
    const handleDelete = () => {
        if (comment) {
            deleteCommentForCard(boardId, cardId, comment.ID);
        }
    }


    return (
        <div
            className="flex flex-row items-start gap-2 mt-3 w-full">
            <div className="absolute flex items-center justify-center w-[40px]">
                <UserAvatar size={32} user={user} />
            </div>
            <div style={{ paddingLeft: C_PADDING_L }}
                className=" relative w-full flex flex-col items-center justify-center">
                <div className="flex flex-row items-baseline text-[16px] text-neutral-300 mb-1 font-semibold  self-start">
                    <span className="">{user?.Name}</span>
                    <span className="ml-2 text-[12px] text-neutral-500 font-normal">{resolvedElapsedTime}</span>
                </div>
                <CardDescriptionMdEditor
                    key={commentId}
                    value={commentDraft}
                    onChangeMarkdown={setCommentDraft}
                    onBlurSave={() => {
                        setIsEditing(false)
                    }}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    onMentionBadgeClick={onMentionBadgeClick}
                    mode="display"
                    className={`md-editor-shell items-center rounded-xl shadow-md shadow-black/20 relative overflow-hidden
                         w-full transition-transform ${isEditing
                            ? 'border !bg-menusec'
                            : " bg-menusec border-none pt-2"}`}

                />
                <SubmitFooter className="!justify-start w-full"
                    onSubmit={handleSave} onCancel={hadnleCancel} show={isEditing}
                    disabled={isSavingDisabled} />
                <div className={`flex flex-row  gap-1 text-neutral-500  text-xs w-full mt-2 items-center justify-start ${isEditing ? "hidden" : ""}`}>
                    {isOwnComment && (<>
                        <span onClick={() => setIsEditing(true)}
                            className="underline cursor-pointer">Edit</span>
                        <span className=" cursor-default ">â€¢</span>
                        <span onClick={handleDelete}
                            className="underline cursor-pointer">Delete</span>
                    </>)}
                    {!isOwnComment && (<span
                        onClick={() => handleReply(`@${user?.Username ?? user?.Name ?? ""} `)}
                        className="underline cursor-pointer" >Reply</span>)}
                </div>

            </div>
        </div>
    )
}
