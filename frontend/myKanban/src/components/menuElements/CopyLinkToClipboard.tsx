type CopyLinkTextProps = {
    link: string;
    label?: string;
}



export const CopyLinkText = ({ link, label }: CopyLinkTextProps) => {
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            // opzionale: toast/snackbar
            // console.log("Link copiato");
        } catch (err) {
            // console.error("Errore copia:", err);
        }
    };

    return (
        <span
            onClick={handleCopy}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCopy()}
            style={{ cursor: "pointer", textDecoration: "underline" }}
        >
            {label ?? "Copia link"}
        </span>
    );
};
