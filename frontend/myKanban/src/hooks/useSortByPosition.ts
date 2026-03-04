export function useSortByPosition() {
    function compareLexoRank(a: string, b: string): number {
        if (a === b) return 0;
        return a < b ? -1 : 1;
    }

    function sortByPosition<T extends { Position: string }>(items: T[]): T[] {
        return [...items].sort((a, b) => compareLexoRank(a.Position, b.Position));
    }

    return {
        sortByPosition
    }
}