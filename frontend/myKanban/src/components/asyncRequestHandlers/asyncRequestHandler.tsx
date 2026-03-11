import { CircleAlert, CircleCheck } from "lucide-react";
import { useImperativeHandle, useState, type Ref } from "react";

type AsyncRequestHandlerProps = {

    onSuccess?: () => void;
    onError?: (error: Error) => void;
    //request?: () => Promise<void>;
    ref: Ref<AsyncRequestHandle>
    isLoading?: boolean;
    setIsLoading?: (isLoading: boolean) => void;
    isError?: boolean;
    setIsError?: (isError: boolean) => void;
}

export type AsyncRequestHandle = {
    execute: ((request: () => Promise<void>) => Promise<void>);
}


export const AsyncRequestHandler = ({ onSuccess, onError, ref, isLoading: externalIsLoading, setIsLoading: setExternalIsLoading, isError: externalIsError, setIsError: setExternalIsError }: AsyncRequestHandlerProps) => {
    const [, setIsLoading] = useState(false);
    const [isError, setIsError] = useState<Error | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);




    useImperativeHandle(ref, () => ({
        execute: async (request) => {
            try {
                console.log("Executing async request...");
                handleSetIsLoading(true);

                if (request) {
                    await request();
                }
                handleSuccess();
            } catch (error) {
                handleOnError(error instanceof Error ? error : new Error("An unknown error occurred"));
            } finally {
                handleSetIsLoading(false);
            }
        }
    }));

    const handleSuccess = () => {
        setIsSuccess(true);
        setTimeout(() => {
            setIsSuccess(false);
            onSuccess && onSuccess();
        }, 2000);
    }

    const handleOnError = (error: Error) => {
        handleSetIsError(error);
        setTimeout(() => {
            handleSetIsError(null);
            onError && onError(error);
        }, 4000);
    }



    const handleSetIsLoading = (loading: boolean) => {
        if (setExternalIsLoading && externalIsLoading !== undefined) {
            setExternalIsLoading(loading);
        } else {
            setIsLoading(loading);
        }
    }

    const handleSetIsError = (error: Error | null) => {
        if (setExternalIsError && externalIsError !== undefined) {
            setExternalIsError(!!error);
        } else {
            setIsError(error);
        }
    }

    const effectiveSuccess = externalIsLoading !== undefined && externalIsError !== undefined
        ? !externalIsLoading && !externalIsError
        : isSuccess;

    return (
        <>
            <div className={`absolute inset-0 flex items-center justify-center bg-menusec z-10 ${effectiveSuccess ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity`}>
                <CircleCheck className="h-12 w-12 text-green-500 animate-pulse" />
            </div>
            <div className={`absolute inset-0 flex flex-col gap-8 items-center justify-center bg-menusec z-10 ${isError ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity`}>
                <CircleAlert className="h-24 w-24 text-red-500 animate-pulse" />
                <div className="text-red-500 text-sm font-semibold">
                    {isError instanceof Error ? isError.message : "An error occurred"}
                </div>
            </div>
        </>
    )

}