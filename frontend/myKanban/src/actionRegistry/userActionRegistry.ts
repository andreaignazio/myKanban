import { useUserStore } from "@/stores/userStore";
import type { PatchMeDetailRequest, PatchMePropsRequest } from "@/stores/types";

export function useUserActionRegistry() {
    const userStore = useUserStore();

    function patchMyProps(payload: PatchMePropsRequest) {
        return userStore.patchMeProps(payload);
    }

    function patchMyDetails(payload: PatchMeDetailRequest) {
        return userStore.patchMeDetail(payload);
    }

    function updateMyAvatarProps(props: PatchMePropsRequest["Props"]) {
        return patchMyProps({ Props: props });
    }

    function updateMyProfileDetails(payload: PatchMeDetailRequest) {
        return patchMyDetails(payload);
    }

    return {
        patchMyProps,
        patchMyDetails,
        updateMyAvatarProps,
        updateMyProfileDetails,
    };
}