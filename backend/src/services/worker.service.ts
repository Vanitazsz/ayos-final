import { prisma } from "../config/database.js";
import type { Prisma } from "../generated/prisma/client.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";
import { paginationMeta } from "../utils/pagination.js";
import { normalizePhone } from "../utils/security.js";
import { isUuid } from "../utils/identifiers.js";

type ProviderQuery = {
  page: number; limit: number; search?: string; category?: string; skill?: string; verified?: boolean;
  availability?: "ONLINE" | "OFFLINE" | "BUSY"; lat?: number; lng?: number; radiusKm?: number; sort: string;
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const providerInclude = {
  user: { include: { profile: { include: { avatar: true } } } },
  industry: true,
  skills: { include: { skill: true } },
  serviceAreas: true,
  portfolio: { include: { upload: true }, orderBy: { sortOrder: "asc" as const } }
} satisfies Prisma.WorkerProfileInclude;

function providerView(worker: any, distanceKm?: number) {
  const name = [worker.user.profile?.firstName, worker.user.profile?.middleName, worker.user.profile?.lastName].filter(Boolean).join(" ");
  const price = worker.hourlyRate === null ? null : worker.hourlyRate / 100;
  return {
    id: worker.userId,
    workerProfileId: worker.id,
    name,
    category: `${worker.industry.name} · ${worker.yearsExperience} yrs exp`,
    industry: worker.industry,
    avatarUri: worker.user.profile?.avatar?.visibility === "PUBLIC" ? `/api/v1/uploads/${worker.user.profile.avatar.id}` : null,
    rating: Number(worker.ratingAverage),
    reviewCount: worker.ratingCount,
    distance: distanceKm === undefined ? null : `${distanceKm.toFixed(1)} km away`,
    distanceKm: distanceKm ?? null,
    eta: distanceKm === undefined ? null : `~${Math.max(10, Math.round(distanceKm * 4))} min`,
    verified: worker.verificationStatus === "APPROVED",
    price: price === null ? null : `₱${price.toLocaleString("en-PH")}/hr`,
    hourlyRate: worker.hourlyRate,
    currency: worker.currency,
    availability: worker.availabilityStatus,
    bio: worker.bio,
    yearsExperience: worker.yearsExperience,
    completedJobs: worker.completedJobs,
    skills: worker.skills.map((entry: any) => entry.skill),
    serviceAreas: worker.serviceAreas,
    portfolioImages: worker.portfolio.filter((entry: any) => entry.upload.visibility === "PUBLIC").map((entry: any) => `/api/v1/uploads/${entry.upload.id}`)
  };
}

export class WorkerService {
  async providers(query: ProviderQuery) {
    const workers = await prisma.workerProfile.findMany({
      where: {
        deletedAt: null,
        verificationStatus: query.verified === false ? { not: "APPROVED" } : "APPROVED",
        ...(query.availability ? { availabilityStatus: query.availability } : {}),
        ...(query.category ? {
          industry: {
            OR: [
              ...(isUuid(query.category) ? [{ id: query.category }] : []),
              { code: query.category },
              { name: { equals: query.category, mode: "insensitive" } }
            ]
          }
        } : {}),
        ...(query.skill ? {
          skills: {
            some: {
              skill: {
                OR: [
                  ...(isUuid(query.skill) ? [{ id: query.skill }] : []),
                  { code: query.skill },
                  { name: { equals: query.skill, mode: "insensitive" } }
                ]
              }
            }
          }
        } : {}),
        ...(query.search ? {
          OR: [
            {
              user: {
                profile: {
                  is: {
                    OR: [
                      { firstName: { contains: query.search, mode: "insensitive" } },
                      { lastName: { contains: query.search, mode: "insensitive" } }
                    ]
                  }
                }
              }
            },
            { industry: { name: { contains: query.search, mode: "insensitive" } } },
            { skills: { some: { skill: { name: { contains: query.search, mode: "insensitive" } } } } }
          ]
        } : {})
      },
      include: providerInclude
    });
    let views = workers.map((worker) => {
      const area = worker.serviceAreas.find((item) => item.latitude !== null && item.longitude !== null);
      const distance = query.lat !== undefined && query.lng !== undefined && area ? haversine(query.lat, query.lng, Number(area.latitude), Number(area.longitude)) : undefined;
      return providerView(worker, distance);
    });
    if (query.radiusKm !== undefined) views = views.filter((view) => view.distanceKm !== null && view.distanceKm <= query.radiusKm!);
    views.sort((a, b) => query.sort === "distance" ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
      : query.sort === "price_asc" ? (a.hourlyRate ?? Infinity) - (b.hourlyRate ?? Infinity)
      : query.sort === "price_desc" ? (b.hourlyRate ?? -1) - (a.hourlyRate ?? -1)
      : query.sort === "experience" ? b.yearsExperience - a.yearsExperience
      : b.rating - a.rating);
    const total = views.length;
    const items = views.slice((query.page - 1) * query.limit, query.page * query.limit);
    return { items, meta: paginationMeta(query.page, query.limit, total) };
  }

  async provider(id: string) {
    const worker = await prisma.workerProfile.findFirst({ where: { OR: isUuid(id) ? [{ id }, { userId: id }] : [], deletedAt: null, verificationStatus: "APPROVED" }, include: providerInclude });
    if (!worker) throw new NotFoundError("Provider");
    const reviews = await prisma.review.findMany({ where: { subjectId: worker.userId, status: "PUBLISHED", deletedAt: null }, include: { author: { include: { profile: true } } }, orderBy: { createdAt: "desc" }, take: 20 });
    return { ...providerView(worker), reviews };
  }

  async availability(id: string, from: Date, to: Date) {
    const worker = await prisma.workerProfile.findFirst({ where: { OR: isUuid(id) ? [{ id }, { userId: id }] : [], verificationStatus: "APPROVED" } });
    if (!worker) throw new NotFoundError("Provider");
    const bookings = await prisma.booking.findMany({ where: { workerId: worker.userId, scheduledAt: { gte: from, lte: to }, status: { notIn: ["CANCELLED", "REFUNDED"] } }, select: { scheduledAt: true } });
    return { from, to, unavailable: bookings.map((booking) => booking.scheduledAt), slotMinutes: 60 };
  }

  async me(userId: string) {
    const worker = await prisma.workerProfile.findUnique({ where: { userId }, include: providerInclude });
    if (!worker) throw new NotFoundError("Worker profile");
    return providerView(worker);
  }

  async update(userId: string, data: Prisma.WorkerProfileUpdateInput) {
    if (typeof data.contactPhone === "string") data.contactPhone = normalizePhone(data.contactPhone);
    return prisma.workerProfile.update({ where: { userId }, data });
  }

  async replaceSkills(userId: string, skillValues: string[]) {
    const worker = await prisma.workerProfile.findUnique({ where: { userId } });
    if (!worker) throw new NotFoundError("Worker profile");
    const skills = await prisma.skill.findMany({ where: { OR: [{ id: { in: skillValues.filter(isUuid) } }, { code: { in: skillValues } }] } });
    if (skills.length !== new Set(skillValues).size) throw new NotFoundError("One or more skills");
    await prisma.$transaction(async (transaction) => {
      await transaction.workerSkill.deleteMany({ where: { workerId: worker.id } });
      await transaction.workerSkill.createMany({ data: skills.map((skill) => ({ workerId: worker.id, skillId: skill.id })) });
    });
    return prisma.workerSkill.findMany({ where: { workerId: worker.id }, include: { skill: true } });
  }

  async replaceAreas(userId: string, areas: Array<{ label: string; latitude?: number; longitude?: number; radiusKm?: number }>) {
    const worker = await prisma.workerProfile.findUnique({ where: { userId } });
    if (!worker) throw new NotFoundError("Worker profile");
    await prisma.$transaction(async (transaction) => {
      await transaction.workerServiceArea.deleteMany({ where: { workerId: worker.id } });
      if (areas.length) await transaction.workerServiceArea.createMany({ data: areas.map((area) => ({ workerId: worker.id, ...area })) });
    });
    return prisma.workerServiceArea.findMany({ where: { workerId: worker.id } });
  }

  async submit(userId: string) {
    const worker = await prisma.workerProfile.findUnique({ where: { userId }, include: { skills: true, documents: true } });
    if (!worker) throw new NotFoundError("Worker profile");
    if (!["DRAFT", "NEEDS_DOCUMENTS", "REJECTED"].includes(worker.verificationStatus)) throw new ConflictError("Worker application is already under review or approved", "invalid_worker_state");
    const documentTypes = new Set(worker.documents.filter((document) => document.status !== "REJECTED").map((document) => `${document.type}:${document.side ?? ""}`));
    if (!documentTypes.has("government_id:front") || !documentTypes.has("government_id:back")) throw new ConflictError("Front and back government ID documents are required", "documents_required");
    if (!worker.skills.length) throw new ConflictError("At least one skill is required", "skills_required");
    return prisma.workerProfile.update({ where: { id: worker.id }, data: { verificationStatus: "PENDING", submittedAt: new Date(), rejectionReason: null } });
  }

  async verification(userId: string) {
    const worker = await prisma.workerProfile.findUnique({ where: { userId }, include: { documents: { include: { upload: { select: { id: true, originalName: true, createdAt: true } } }, orderBy: { createdAt: "desc" } } } });
    if (!worker) throw new NotFoundError("Worker profile");
    return { status: worker.verificationStatus, submittedAt: worker.submittedAt, approvedAt: worker.approvedAt, rejectedAt: worker.rejectedAt, rejectionReason: worker.rejectionReason, activationFeePaidAt: worker.activationFeePaidAt, documents: worker.documents };
  }

  async dashboard(userId: string) {
    const worker = await prisma.workerProfile.findUnique({ where: { userId }, include: { wallet: true } });
    if (!worker) throw new NotFoundError("Worker profile");
    const [active, pending, completed, upcoming] = await Promise.all([
      prisma.booking.count({ where: { workerId: userId, status: { in: ["EN_ROUTE", "ARRIVED", "IN_PROGRESS"] } } }),
      prisma.booking.count({ where: { workerId: userId, status: { in: ["HIRED", "ACCEPTED"] } } }),
      prisma.booking.count({ where: { workerId: userId, status: "COMPLETED" } }),
      prisma.booking.findMany({ where: { workerId: userId, status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } }, include: { customer: { include: { profile: true } }, service: true }, orderBy: { scheduledAt: "asc" }, take: 5 })
    ]);
    return { stats: { active, pending, completed, earnings: worker.wallet?.balance ?? 0, currency: worker.wallet?.currency ?? "PHP" }, performance: { completionRate: null, onTimeArrival: null, repeatClients: null }, activeBookings: upcoming };
  }

  async addDocument(userId:string,input:{uploadId:string;type:string;side?:string}){const worker=await prisma.workerProfile.findUnique({where:{userId}});if(!worker)throw new NotFoundError("Worker profile");const upload=await prisma.upload.findFirst({where:{id:input.uploadId,ownerId:userId,purpose:"worker_document",status:"ACTIVE",deletedAt:null}});if(!upload)throw new NotFoundError("Worker document upload");return prisma.$transaction(async tx=>{const document=await tx.verificationDocument.create({data:{workerId:worker.id,uploadId:input.uploadId,type:input.type,side:input.side}});await tx.upload.update({where:{id:input.uploadId},data:{attachedAt:new Date()}});return document})}
  async wallet(userId:string){const worker=await prisma.workerProfile.findUnique({where:{userId},include:{wallet:true}});if(!worker)throw new NotFoundError("Worker profile");const wallet=worker.wallet??await prisma.wallet.create({data:{workerId:worker.id,currency:worker.currency}});const totals=await prisma.walletTransaction.groupBy({by:["direction"],where:{walletId:wallet.id,status:"COMPLETED"},_sum:{amount:true}});return{...wallet,totals:Object.fromEntries(totals.map(x=>[x.direction,x._sum.amount??0]))}}
  async walletTransactions(userId:string,page:number,limit:number){const worker=await prisma.workerProfile.findUnique({where:{userId},include:{wallet:true}});if(!worker)throw new NotFoundError("Worker profile");if(!worker.wallet)return{items:[],meta:paginationMeta(page,limit,0)};const where={walletId:worker.wallet.id};const[items,total]=await prisma.$transaction([prisma.walletTransaction.findMany({where,skip:(page-1)*limit,take:limit,orderBy:{createdAt:"desc"}}),prisma.walletTransaction.count({where})]);return{items,meta:paginationMeta(page,limit,total)}}
  async payoutMethods(userId:string){const worker=await prisma.workerProfile.findUnique({where:{userId}});if(!worker)throw new NotFoundError("Worker profile");const rows=await prisma.payoutMethod.findMany({where:{workerId:worker.id,deletedAt:null},orderBy:[{isDefault:"desc"},{createdAt:"desc"}]});return rows.map(({providerToken:_,...row})=>row)}
  async createPayoutMethod(userId:string,input:any){const worker=await prisma.workerProfile.findUnique({where:{userId}});if(!worker)throw new NotFoundError("Worker profile");const{setDefault,...data}=input;return prisma.$transaction(async tx=>{if(setDefault)await tx.payoutMethod.updateMany({where:{workerId:worker.id,isDefault:true},data:{isDefault:false}});const row=await tx.payoutMethod.create({data:{workerId:worker.id,...data,isDefault:setDefault}});const{providerToken:_,...safe}=row;return safe})}
  async payouts(userId:string,page:number,limit:number){const worker=await prisma.workerProfile.findUnique({where:{userId}});if(!worker)throw new NotFoundError("Worker profile");const where={workerId:worker.id};const[items,total]=await prisma.$transaction([prisma.payout.findMany({where,skip:(page-1)*limit,take:limit,include:{payoutMethod:{select:{id:true,type:true,provider:true,label:true,accountMask:true}}},orderBy:{createdAt:"desc"}}),prisma.payout.count({where})]);return{items,meta:paginationMeta(page,limit,total)}}
  async createPayout(userId:string,input:any){const worker=await prisma.workerProfile.findUnique({where:{userId},include:{wallet:true}});if(!worker?.wallet)throw new ConflictError("Wallet is not available","wallet_unavailable");if(worker.wallet.currency!==input.currency)throw new ConflictError("Payout currency does not match wallet","currency_mismatch");const method=await prisma.payoutMethod.findFirst({where:{id:input.payoutMethodId,workerId:worker.id,deletedAt:null}});if(!method)throw new NotFoundError("Payout method");const existing=await prisma.payout.findUnique({where:{idempotencyKey:input.idempotencyKey}});if(existing)return existing;return prisma.$transaction(async tx=>{const changed=await tx.wallet.updateMany({where:{id:worker.wallet!.id,balance:{gte:input.amount}},data:{balance:{decrement:input.amount},version:{increment:1}}});if(!changed.count)throw new ConflictError("Insufficient wallet balance","insufficient_balance");const payout=await tx.payout.create({data:{workerId:worker.id,payoutMethodId:method.id,amount:input.amount,currency:input.currency,idempotencyKey:input.idempotencyKey}});await tx.walletTransaction.create({data:{walletId:worker.wallet!.id,type:"PAYOUT",direction:"DEBIT",amount:input.amount,currency:input.currency,status:"PENDING",description:`Payout ${payout.id}`,externalRef:payout.id}});return payout})}
}

export const workerService = new WorkerService();
