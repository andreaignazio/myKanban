export function TextButton({ text, onClick }: { text: string; onClick: () => void }) {
    return (
        <div onClick={onClick} className="bg-surface h-full px-3 py-1 hover:bg-active
         rounded-md flex justify-center items-center text-white text-md">
            <p>{text}</p>
        </div>
    )
}