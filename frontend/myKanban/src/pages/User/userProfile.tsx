import { CustomInput } from "@/components/menuElements/CustomInput"
import { UserPagesWrapper } from "./userPagesWrapper"
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { Asterisk, Globe } from "lucide-react";
import { LabeledButtonPresetBSubmit } from "@/components/buttons/labeledButton";
import type { UserProps } from "@/stores/usertypes";
import { useUserActionRegistry } from "@/actionRegistry/userActionRegistry";
import type { PatchMeDetailRequest } from "@/stores/types";
import { UserHeaderCard } from "./UserHeaderCard";

export const UserProfilePage = () => {
    const fetchUserData = useAuthStore((state) => state.fetchUser);
    const user = useAuthStore((state) => state.user || undefined);
    const [username, setUsername] = useState(user?.Username || "");
    const [bio, setBio] = useState("bio");
    const userActions = useUserActionRegistry();
    useEffect(() => {

        fetchUserData();

    }, [fetchUserData]);

    useEffect(() => {
        if (user) {
            setUsername(user.Username);
            setBio(user.Props?.Bio ?? "");
        }
    }, [user]);

    const handleSubmit = () => {
        const payload: PatchMeDetailRequest = {
            Username: username,
        }
        const bioPayload: UserProps = {
            Bio: bio,
        }
        userActions.updateMyAvatarProps(bioPayload);
        userActions.updateMyProfileDetails(payload);
    }

    const description = "Manage your profile information, such as your username and bio. This information is visible to others and helps personalize your experience on the platform."
    return (
        <UserPagesWrapper Title="Profile"
            iconId="profile"
            description={description}
        >


            <UserHeaderCard user={user} />
            <div className="text-lg font-bold mt-10 mb-2">About</div>
            <div className="flex flex-row w-full items-start gap-0 mt-2">
                <div className="min-w-0 text-sm text-neutral-500 leading-5 break-words">
                    <span className="text-neutral-400 font-bold">Your personal info. </span>
                    <span>Required fields are marked with an asterisk</span>

                </div>
                <Asterisk className="text-red-500/80 mb-2 ms-1" size={12} />
            </div>

            <InputAndDescription input={username} setInput={setUsername} isMandatory={true} />
            <InputAndDescription input={bio ?? ""} setInput={setBio}
                label="Bio" useTextarea={true}
                inputClassName="min-h-[80px] max-h-[200px] h-auto"
            />
            <div className="flex flex-row justify-end w-full">
                <LabeledButtonPresetBSubmit className="mt-6 !w-32" label="Save changes" onClick={handleSubmit} />
            </div>

        </UserPagesWrapper>
    )
}


type InputAndDescriptionProps = {
    input: string;
    setInput: (input: string) => void;
    description?: string;
    label?: string;
    useTextarea?: boolean;
    isMandatory?: boolean;
    inputClassName?: string;

}

const InputAndDescription = ({ input, setInput, description, label, useTextarea, isMandatory, inputClassName }: InputAndDescriptionProps) => {

    const resolvedDescription = description || "This information is visible to anyone on the internet, including those that find you through search engines like Google."
    return (
        <div className="flex flex-col w-full mt-8">
            <div className="flex flex-row items-center mb-2">
                <span className="text-sm text-neutral-400 font-bold">{label || "Username"}</span>
                {isMandatory && <Asterisk className="text-red-500/80 mb-2 ms-1" size={12} />}
            </div>
            <CustomInput
                value={input}
                danger={isMandatory ? input.trim().length === 0 : false}
                className={`h-[38px] ${inputClassName}`}
                onInputChange={(inputRef) => {
                    inputRef?.current && setInput(inputRef.current.value)
                }}
                placeholder="Enter username"
                useTextArea={useTextarea}

            />
            <div className="flex w-full items-start gap-2 mt-2">
                <Globe className="text-neutral-400 shrink-0 mt-1" size={12} />
                <div className="min-w-0 text-sm text-neutral-500 leading-5 break-words">
                    <span className="text-neutral-400 font-bold">Always public. </span>
                    <span>{resolvedDescription}</span>
                </div>
            </div>
        </div>
    )
}