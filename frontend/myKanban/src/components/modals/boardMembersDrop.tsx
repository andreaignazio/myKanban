import { forwardRef } from "react";
import { MembersList } from "../common/MemberList"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"

import type { UserBoard, UserWorkspace } from "@/stores/types";
type BoardMembersDropProps = {
    onClose: () => void;
    members?: UserWorkspace[] | UserBoard[];
    presenceByUserId?: Record<string, boolean>;

}

export const BoardMembersDrop = forwardRef<HTMLDivElement, BoardMembersDropProps>(({ onClose, members, presenceByUserId }, ref) => {


    return (
        <CommonMenuWrapper ref={ref}
            style={{ borderRadius: 30 }}
            className=" !p-[2px]"
        >
            <MembersList members={members} showPresence={true} presenceByUserId={presenceByUserId} />
        </CommonMenuWrapper>
    )
})