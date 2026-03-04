export function useSortByDate() {

    function sortByDateAsc(items: any[], dateKey = "CreatedAt") {

        function _sortByDateAsc<T extends { [key: string]: string }>(items: T[]): T[] {
            return [...items].sort((a, b) => new Date(a[dateKey]).getTime() - new Date(b[dateKey]).getTime());
        }
        return _sortByDateAsc(items);
    }
    function sortByDateDesc(items: any[], dateKey = "CreatedAt") {
        function _sortByDateDesc<T extends { [key: string]: string }>(items: T[], dateKey = "CreatedAt"): T[] {
            return [...items].sort((a, b) => new Date(b[dateKey]).getTime() - new Date(a[dateKey]).getTime());
        }
        return _sortByDateDesc(items, dateKey);
    }

    return {
        sortByDateAsc,
        sortByDateDesc
    }
}