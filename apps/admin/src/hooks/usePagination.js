import { useState, useMemo } from 'react';

export function getPageWindow(currentPage, totalPages, windowSize = 2) {
  if (totalPages <= 1) return [1];
  let start = Math.max(1, currentPage - windowSize);
  let end = Math.min(totalPages, currentPage + windowSize);
  if (currentPage - windowSize < 1) {
    end = Math.min(totalPages, end + (1 - (currentPage - windowSize)));
  }
  if (currentPage + windowSize > totalPages) {
    start = Math.max(1, start - (currentPage + windowSize - totalPages));
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function usePagination(data, pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.length ?? 0) / pageSize)),
    [data, pageSize],
  );

  const pageData = useMemo(
    () => (data ?? []).slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [data, currentPage, pageSize],
  );

  const pageWindow = useMemo(
    () => getPageWindow(currentPage, totalPages),
    [currentPage, totalPages],
  );

  return { currentPage, setCurrentPage, totalPages, pageData, pageWindow };
}
