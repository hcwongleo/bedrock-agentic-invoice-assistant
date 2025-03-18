// WizardAtoms.ts
import { atomWithReset } from "jotai/utils";
import { DocumentType } from "../utils/types";

export const documentsAtom = atomWithReset<[DocumentType] | []>([]);

// Update the selection type and initial state
export interface DocumentSelectionType {
    selectedDocs: DocumentType[];
}

export const selectionAtom = atomWithReset<DocumentSelectionType>({
    selectedDocs: []  // Initialize with an empty array
});

