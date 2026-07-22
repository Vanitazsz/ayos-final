export interface SearchableService {
  label?: string;
  name?: string;
  slug?: string;
}

export function normalizeServiceQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function filterServiceCatalog<T extends SearchableService>(
  services: T[],
  query: string,
): T[] {
  const normalizedQuery = normalizeServiceQuery(query);
  if (!normalizedQuery) return services;

  return services.filter((service) =>
    [service.label, service.name, service.slug]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizeServiceQuery(value.replace(/-/g, ' ')).includes(normalizedQuery)),
  );
}
