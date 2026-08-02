import { prisma } from "../config/database.js";
import type { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../utils/errors.js";
import { pagination, paginationMeta } from "../utils/pagination.js";
import { isUuid } from "../utils/identifiers.js";

export class CatalogService {
  async categories(query: { page: number; limit: number; search?: string; status?: "ACTIVE" | "INACTIVE" }) {
    const where: Prisma.ServiceCategoryWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : { status: "ACTIVE" }),
      ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {})
    };
    const [items, total] = await prisma.$transaction([
      prisma.serviceCategory.findMany({ where, ...pagination(query.page, query.limit), orderBy: { name: "asc" }, include: { _count: { select: { services: true } } } }),
      prisma.serviceCategory.count({ where })
    ]);
    return { items, meta: paginationMeta(query.page, query.limit, total) };
  }

  async services(query: { page: number; limit: number; search?: string; category?: string; status?: "ACTIVE" | "INACTIVE"; sort: string }) {
    const where: Prisma.ServiceWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : { status: "ACTIVE" }),
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { description: { contains: query.search, mode: "insensitive" } }] } : {}),
      ...(query.category ? { category: { OR: [...(isUuid(query.category) ? [{ id: query.category }] : []), { slug: query.category }] } } : {})
    };
    const orderBy: Prisma.ServiceOrderByWithRelationInput = query.sort === "price_asc" ? { basePrice: "asc" } : query.sort === "price_desc" ? { basePrice: "desc" } : query.sort === "newest" ? { createdAt: "desc" } : { name: "asc" };
    const [items, total] = await prisma.$transaction([
      prisma.service.findMany({ where, ...pagination(query.page, query.limit), orderBy, include: { category: true } }),
      prisma.service.count({ where })
    ]);
    return { items, meta: paginationMeta(query.page, query.limit, total) };
  }

  async service(id: string) {
    const item = await prisma.service.findFirst({ where: { deletedAt: null, OR: [...(isUuid(id) ? [{ id }] : []), { slug: id }] }, include: { category: true } });
    if (!item) throw new NotFoundError("Service");
    return item;
  }

  industries() {
    return prisma.industry.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  }

  skills(industry?: string) {
    return prisma.skill.findMany({
      where: { isActive: true, ...(industry ? { industry: { OR: [...(isUuid(industry) ? [{ id: industry }] : []), { code: industry }] } } : {}) },
      include: { industry: true }, orderBy: [{ industry: { name: "asc" } }, { name: "asc" }]
    });
  }
}

export const catalogService = new CatalogService();
