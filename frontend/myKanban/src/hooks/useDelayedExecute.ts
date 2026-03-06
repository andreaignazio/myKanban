export function useDelayedExecute(callback: () => void) {

    const delayedExecute = (action: () => Promise<void>, delay: number) => {
        callback();
        setTimeout(() => {
            void action();
        }, delay);
    }

    return { delayedExecute };
}
