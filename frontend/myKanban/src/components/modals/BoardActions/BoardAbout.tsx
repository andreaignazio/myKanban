import { EntityDescriptionEditor } from "@/components/common/EntityDescriptionEditor";
import { MemberRow } from "@/components/common/MemberRow";
import { useBoardActionRegistry } from "@/actionRegistry/boardActionRegistry";
import { useBoardMembersStore } from "@/stores/boardMembersStore";
import { boardMemberKey } from "@/stores/boardMembersStore";
import { useBoardsStore } from "@/stores/boardsStore";
import type { User } from "@/stores/types";
import { useUserStore } from "@/stores/userStore";
import { TextAlignEndIcon, UserIcon } from "lucide-react";
import { useShallow } from "zustand/shallow";

export type BoardAboutProps = {
    boardId: string;
}

export const BoardAbout = ({ boardId }: BoardAboutProps) => {
    const boardActions = useBoardActionRegistry();
    const board = useBoardsStore((state) => state.boardsById[boardId]);

    const memberIds = useBoardMembersStore(useShallow((state) => state.membersIdsByBoardId[boardId] ?? []))
    const userById = useUserStore(state => state.usersById)

    const memberById = useBoardMembersStore(state => state.membersById)
    const filterFn = (id: string) => {
        const member = memberById[boardMemberKey(boardId, id)]
        if (!member) return false
        return member.Role === "admin" || member.Role === "owner"
    }

    const filterdMemberIds = memberIds.filter((id) => filterFn(id))

    return (
        <div className="p-4">
            <Header title="Board Admins"  >
                <UserIcon className="w-6 h-6 text-neutral-300" />
            </Header>

            <div className="flex flex-col gap-3 ps-2">
                {filterdMemberIds.map((memberId) => {
                    const user = userById[memberId] as User;
                    return (
                        <MemberRow
                            useDummyAvatar={false}
                            key={memberId} user={user}
                            rowClassName="bg-transparent hover:bg-neutral-500/20"
                        />
                    )

                })}
            </div>
            <div className="h-px bg-neutral-500/20 my-4 mt-6" />
            <Header title="Description" >
                <TextAlignEndIcon className="w-6 h-6 text-neutral-300" />
            </Header>
            <EntityDescriptionEditor
                entityKey={boardId}
                value={board?.Props?.Description}
                onSave={(nextValue) => boardActions.setBoardDescription(boardId, nextValue)}
                showHeading={false}
                compactTopbar={true}
                closedContainerClassName="!bg-neutral-500/20 min-h-[120px]"
                paddingLeft="0"
                emptyPlaceholderText="Add a description to your board to let your team know what it's about."
            />

        </div>
    )
}

type HeaderProps = {
    title: string;
    headerStyle?: React.CSSProperties;
    children?: React.ReactNode;
}
const Header = ({ title, headerStyle, children }: HeaderProps) => {
    return (
        <div className="flex flex-row items-start gap-3 mb-4" style={headerStyle}>
            {children}
            <h2 className="text-md font-bold">{title}</h2>
        </div>
    )
}