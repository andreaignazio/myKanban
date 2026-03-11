import { useChecklistStore } from "@/stores/checklistStore";
import { useParams } from "react-router-dom";
import { useShallow } from "zustand/shallow";
import { LabeledButtonPresetA } from "../../buttons/labeledButton";
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { ChecklistHeader } from "./checklistHeader";
import { ChecklistProgress } from "./checklistProgress";
import { ChecklistEntry } from "./checklistEntry";
import { DragDropContext, Draggable, Droppable, type DragStart, type DropResult } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";
import { AddFormOnEdit } from "@/components/common/AddForm";
import { useState } from "react";



export const CardChecklists = () => {
    const boardID = useParams().boardId as string;
    const cardID = useParams().cardId as string;
    const checklistsIdsForCard = useChecklistStore(useShallow((state) => state.checklistIdsByCardId[boardID]?.[cardID] || []));
    const moveChecklistInCard = useCardActionRegistry().moveChecklistInCard;
    const moveChecklistEntry = useCardActionRegistry().moveChecklistEntry;
    const crossMoveChecklistEntry = useCardActionRegistry().crossMoveChecklistEntry;

    const setEntryDragHoverDisabled = (disabled: boolean) => {
        if (disabled) {
            document.body.classList.add("dragging-entry-cursor");
            return;
        }
        document.body.classList.remove("dragging-entry-cursor");
    }

    const handleDragStart = (start: DragStart) => {
        setEntryDragHoverDisabled(start.type === "entry");
    }

    function handleDragEnd(result: DropResult) {
        setEntryDragHoverDisabled(false);
        const { destination, source, draggableId, type } = result;
        const checklistsDroppableId = `checklists-${cardID}`;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        if (type === "checklist" || source.droppableId === checklistsDroppableId) {
            const currentChecklistIds = useChecklistStore.getState().checklistIdsByCardId[boardID]?.[cardID] || [];
            const nextChecklistIds = Array.from(currentChecklistIds);
            nextChecklistIds.splice(source.index, 1);
            const movedChecklistId = currentChecklistIds[source.index] ?? draggableId;
            nextChecklistIds.splice(destination.index, 0, movedChecklistId);

            useChecklistStore.setState((state) => ({
                checklistIdsByCardId: {
                    ...state.checklistIdsByCardId,
                    [boardID]: {
                        ...state.checklistIdsByCardId[boardID],
                        [cardID]: nextChecklistIds,
                    }
                }
            }));

            const beforeId = destination.index < nextChecklistIds.length - 1 ? nextChecklistIds[destination.index + 1] : null;
            moveChecklistInCard(boardID, cardID, movedChecklistId, beforeId, beforeId === null);
            return;
        }

        if (type === "entry") {
            const sourceChecklistId = source.droppableId;
            const destinationChecklistId = destination.droppableId;
            const movedEntryId = draggableId;

            const currentState = useChecklistStore.getState();
            const sourceEntryIds = Array.from(currentState.EntriesIdsByChecklistId[sourceChecklistId] || []);
            const destinationEntryIds = sourceChecklistId === destinationChecklistId
                ? sourceEntryIds
                : Array.from(currentState.EntriesIdsByChecklistId[destinationChecklistId] || []);

            if (sourceChecklistId === destinationChecklistId) {
                const reorderedEntryIds = Array.from(sourceEntryIds);
                reorderedEntryIds.splice(source.index, 1);
                reorderedEntryIds.splice(destination.index, 0, movedEntryId);

                useChecklistStore.setState((state) => ({
                    EntriesIdsByChecklistId: {
                        ...state.EntriesIdsByChecklistId,
                        [sourceChecklistId]: reorderedEntryIds,
                    }
                }));

                const beforeId = destination.index < reorderedEntryIds.length - 1 ? reorderedEntryIds[destination.index + 1] : null;
                moveChecklistEntry(boardID, cardID, sourceChecklistId, movedEntryId, beforeId, beforeId === null);
                return;
            }

            const nextSourceEntryIds = Array.from(sourceEntryIds);
            nextSourceEntryIds.splice(source.index, 1);

            const nextDestinationEntryIds = Array.from(destinationEntryIds);
            nextDestinationEntryIds.splice(destination.index, 0, movedEntryId);

            useChecklistStore.setState((state) => ({
                EntriesIdsByChecklistId: {
                    ...state.EntriesIdsByChecklistId,
                    [sourceChecklistId]: nextSourceEntryIds,
                    [destinationChecklistId]: nextDestinationEntryIds,
                }
            }));

            const beforeId = destination.index < nextDestinationEntryIds.length - 1 ? nextDestinationEntryIds[destination.index + 1] : null;
            crossMoveChecklistEntry(
                boardID,
                cardID,
                sourceChecklistId,
                movedEntryId,
                destinationChecklistId,
                beforeId ?? undefined,
                beforeId === null
            );
        }
    }

    return (
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Droppable droppableId={`checklists-${cardID}`} type="checklist" direction="vertical">
                {(provided) => (
                    <div
                        className=" col-start-2 flex flex-col gap-4"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        {checklistsIdsForCard.map((checklistId: string, index: number) => {
                            return <Checklist key={checklistId} checklistId={checklistId} index={index} />;
                        })}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    )
}

type ChecklistProps = {
    checklistId: string;
    index: number;
}

const Checklist = ({ checklistId, index }: ChecklistProps) => {
    const boardID = useParams().boardId as string;
    const cardID = useParams().cardId as string;
    const checklist = useChecklistStore((state) => state.checklistInCardById[checklistId]);
    const entriesIds = useChecklistStore(useShallow((state) => state.EntriesIdsByChecklistId[checklistId] || []));
    const addChecklistEntry = useCardActionRegistry().addChecklistEntry;
    const deleteChecklistFromCard = useCardActionRegistry().deleteChecklistFromCard;
    const editChecklistTitle = useCardActionRegistry().editChecklistTitle;

    const [isAddingEntry, setIsAddingEntry] = useState(false);
    const [pendingEntryTitle, setPendingEntryTitle] = useState("");
    const [hideCheckedItems, setHideCheckedItems] = useState(false);

    const doneEntries = useChecklistStore(useShallow((state) => state.getDoneEntriesForChecklist(checklistId)));
    const doneEntriesPercentage = entriesIds.length > 0 ? Math.round((doneEntries.length / entriesIds.length) * 100) : 0;

    const handleAddEntryAndClose = () => {
        setIsAddingEntry(false);
        handleAddEntry();
    }

    const handleAddEntry = () => {
        addChecklistEntry(boardID, cardID, checklistId, pendingEntryTitle)
        setPendingEntryTitle("");
    }

    const handleDeleteChecklist = () => {
        deleteChecklistFromCard(boardID, cardID, checklistId)
    }

    const handleSaveChecklistTitle = (title: string) => {
        editChecklistTitle(boardID, cardID, checklistId, title)
    }

    return (
        <Draggable draggableId={checklistId} index={index}>
            {(provided, snapshot) => {
                const checklistNode = (
                    <div ref={provided.innerRef} {...provided.draggableProps} style={provided.draggableProps.style}>
                        <div className="relative flex flex-col gap-2 text-neutral-300">

                            <ChecklistHeader
                                initialTitle={checklist.Checklist.Title}
                                onSaveTitle={handleSaveChecklistTitle}
                                onDeleteChecklist={handleDeleteChecklist}
                                onToggleHideCheckedItems={() => setHideCheckedItems((prev) => !prev)}
                                hideCheckedItems={hideCheckedItems}
                                dragHandleProps={provided.dragHandleProps}
                            />

                            <ChecklistProgress doneEntriesPercentage={doneEntriesPercentage} />

                            <Droppable droppableId={checklistId} type="entry" direction="vertical">
                                {(entryDropProvided) => (
                                    <div
                                        className="flex flex-col gap-0.5"
                                        ref={entryDropProvided.innerRef}
                                        {...entryDropProvided.droppableProps}
                                    >
                                        {entriesIds.length > 0 && entriesIds.map((entryId, entryIndex) => (
                                            <ChecklistEntry
                                                key={entryId}
                                                entryId={entryId}
                                                checklistId={checklistId}
                                                index={entryIndex}
                                                hideWhenDone={hideCheckedItems}
                                                addEntity={handleAddEntryAndClose}
                                            />
                                        ))}
                                        {entryDropProvided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                            <div className={`flex-shrink-0 ${isAddingEntry ? "ps-6" : "ps-10"}`} >
                                <AddFormOnEdit
                                    onCancel={() => setIsAddingEntry(false)}
                                    onBlurCancelEdit={() => setIsAddingEntry(false)}
                                    onSubmit={() => {
                                        handleAddEntry();

                                    }}
                                    onButtonSubmit={() => {
                                        handleAddEntryAndClose();
                                    }}
                                    isAdding={isAddingEntry}
                                    setIsAdding={setIsAddingEntry}
                                    label={"Add item"}
                                    textAreaClassName=""
                                    pendingTitle={pendingEntryTitle}
                                    setPendingTitle={setPendingEntryTitle}
                                />

                                <div className={` -mt-2 ${isAddingEntry ? "hidden" : "flex"} justify-start`}>
                                    <LabeledButtonPresetA label={"Add item"} onClick={() => setIsAddingEntry(true)}
                                        className="mt-4 w-fit rounded-[2.5px] font-inter font-light
                                  tracking-wide px-3.5" />
                                </div>
                            </div>

                        </div>
                    </div>
                );

                if (snapshot.isDragging && typeof document !== "undefined") {
                    return createPortal(checklistNode, document.body);
                }

                return checklistNode;
            }}
        </Draggable>
    )
}
