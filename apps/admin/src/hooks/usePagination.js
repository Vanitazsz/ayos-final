import { useState, useMemo } from 'react';

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

  return { currentPage, setCurrentPage, totalPages, pageData };
}
