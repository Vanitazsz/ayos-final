import { prisma } from "../config/database.js";
import type { BookingStatus, Prisma, ServiceRequestStatus } from "../generated/prisma/client.js";
import { AuthorizationError, ConflictError, NotFoundError } from "../utils/errors.js";
import { pagination, paginationMeta } from "../utils/pagination.js";

const bookingInclude = { customer: { include: { profile: true } }, worker: { include: { profile: true, workerProfile: true } }, service: true, request: true, history: { orderBy: { createdAt: "asc" as const } }, cancellation: true, payments: true, reviews: true } satisfies Prisma.BookingInclude;
const requestInclude = { category: true, service: true, address: true, attachments: { include: { upload: true } }, analyses: { orderBy: { createdAt: "desc" as const }, take: 1 }, bids: true, matches: { include: { worker: { include: { user: { include: { profile: true } }, industry: true, skills: { include: { skill: true } } } } } }, booking: true } satisfies Prisma.ServiceRequestInclude;

function isAdmin(roles: string[]) { return roles.includes("super_admin") || roles.includes("admin"); }
function participant(booking: { customerId: string; workerId: string }, userId: string, roles: string[]) { return isAdmin(roles) || booking.customerId === userId || booking.workerId === userId; }

const defaultMatchingWeights = {
  distance: 0.30,
  availability: 0.20,
  rating: 0.20,
  completedJobs: 0.10,
  responseHistory: 0.10,
  cancellationHistory: 0.05,
  priority: 0.05,
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(lat2 - lat1);
  const longitudeDelta = radians(lng2 - lng1);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function numericWeight(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export class RequestBookingService {
  async requests(userId: string, roles: string[], query: { page: number; limit: number; status?: ServiceRequestStatus; urgency?: any; search?: string }) {
    const where: Prisma.ServiceRequestWhereInput = { deletedAt: null, ...(roles.includes("worker") ? { OR: [{ selectedWorkerId: userId }, { status: "POSTED" }] } : isAdmin(roles) ? {} : { customerId: userId }), ...(query.status ? { status: query.status } : {}), ...(query.urgency ? { urgency: query.urgency } : {}), ...(query.search ? { description: { contains: query.search, mode: "insensitive" } } : {}) };
    const [items, total] = await prisma.$transaction([prisma.serviceRequest.findMany({ where, ...pagination(query.page, query.limit), include: { category: true, service: true, booking: true }, orderBy: { createdAt: "desc" } }), prisma.serviceRequest.count({ where })]);
    return { items, meta: paginationMeta(query.page, query.limit, total) };
  }
  async create(userId: string, input: any) {
    const { location, attachmentIds, ...data } = input;
    const customerProfile = await prisma.profile.findUnique({ where: { userId }, select: { subdivisionId: true } });
    if (data.addressId && !await prisma.address.findFirst({ where: { id: data.addressId, userId, deletedAt: null } })) throw new NotFoundError("Address");
    if (attachmentIds.length) {
      const count = await prisma.upload.count({ where: { id: { in: attachmentIds }, ownerId: userId, purpose: "request", status: "ACTIVE", deletedAt: null } });
      if (count !== new Set(attachmentIds).size) throw new NotFoundError("One or more request uploads");
    }
    return prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.create({ data: { customerId: userId, subdivisionId: customerProfile?.subdivisionId, ...data, addressText: location?.addressText, latitude: location?.latitude, longitude: location?.longitude } });
      if (attachmentIds.length) {
        await tx.requestAttachment.createMany({ data: attachmentIds.map((uploadId: string) => ({ requestId: request.id, uploadId, type: "PHOTO" })) });
        await tx.upload.updateMany({ where: { id: { in: attachmentIds } }, data: { attachedAt: new Date() } });
      }
      return tx.serviceRequest.findUnique({ where: { id: request.id }, include: requestInclude });
    });
  }
  async detail(userId: string, roles: string[], id: string) {
    const item = await prisma.serviceRequest.findFirst({ where: { id, deletedAt: null }, include: requestInclude });
    if (!item) throw new NotFoundError("Request");
    const eligibleWorker = roles.includes("worker") && ["POSTED", "SEARCHING"].includes(item.status);
    if (!isAdmin(roles) && item.customerId !== userId && item.selectedWorkerId !== userId && !eligibleWorker) throw new AuthorizationError();
    return item;
  }
  async update(userId: string, id: string, input: any) {
    const current = await prisma.serviceRequest.findFirst({ where: { id, customerId: userId, deletedAt: null } });
    if (!current) throw new NotFoundError("Request");
    if (!['DRAFT','POSTED'].includes(current.status) || current.version !== input.version) throw new ConflictError("Request state or version changed", "invalid_request_state");
    const { version, location, attachmentIds: _attachmentIds, ...data } = input;
    const result = await prisma.serviceRequest.updateMany({ where: { id, version }, data: { ...data, ...(location ? { addressText: location.addressText, latitude: location.latitude, longitude: location.longitude } : {}), version: { increment: 1 } } });
    if (!result.count) throw new ConflictError("Request was modified concurrently", "version_conflict");
    return this.detail(userId, ["customer"], id);
  }
  async remove(userId: string, id: string) {
    const result = await prisma.serviceRequest.updateMany({ where: { id, customerId: userId, status: "DRAFT", deletedAt: null }, data: { deletedAt: new Date() } });
    if (!result.count) throw new ConflictError("Only an owned draft can be deleted", "invalid_request_state");
  }
  async analyze(userId: string, id: string) {
    const request = await prisma.serviceRequest.findFirst({ where: { id, customerId: userId, deletedAt: null }, include: { category: true, service: true } });
    if (!request) throw new NotFoundError("Request");
    const analysis = await prisma.requestAnalysis.create({ data: { requestId: id, provider: "local_rules_v1", issueSummary: request.description.slice(0, 500), recommendations: ["Confirm access and exact scope with the provider", "Keep photos and relevant details attached to the request"], confidenceScore: 60, estimatedMin: request.budgetMin, estimatedMax: request.budgetMax, rawSafe: { category: request.category.name, service: request.service?.name ?? null } } });
    return analysis;
  }
  async publish(userId: string, id: string, input: any) {
    const current = await prisma.serviceRequest.findFirst({ where: { id, customerId: userId, status: "DRAFT", deletedAt: null } });
    if (!current) throw new ConflictError("Only an owned draft can be published", "invalid_request_state");
    const status: ServiceRequestStatus = input.urgency === "OPEN_BIDDING" ? "POSTED" : input.scheduledAt ? "SCHEDULED" : "SEARCHING";
    return prisma.serviceRequest.update({ where: { id }, data: { urgency: input.urgency, scheduledAt: input.scheduledAt, status, publishedAt: new Date(), version: { increment: 1 } } });
  }
  async generateMatches(userId: string, roles: string[], id: string, limit: number) {
    const request = await this.detail(userId, roles, id);
    if (request.customerId !== userId && !isAdmin(roles)) throw new AuthorizationError();
    const setting = await prisma.platformSetting.findUnique({ where: { key: "matching.weights" } });
    const configured = setting?.value && typeof setting.value === "object" && !Array.isArray(setting.value)
      ? setting.value as Record<string, unknown>
      : {};
    const weights = {
      distance: numericWeight(configured.distance, defaultMatchingWeights.distance),
      availability: numericWeight(configured.availability, defaultMatchingWeights.availability),
      rating: numericWeight(configured.rating, defaultMatchingWeights.rating),
      completedJobs: numericWeight(configured.completedJobs ?? configured.completed_jobs, defaultMatchingWeights.completedJobs),
      responseHistory: numericWeight(configured.responseHistory ?? configured.response_history, defaultMatchingWeights.responseHistory),
      cancellationHistory: numericWeight(configured.cancellationHistory ?? configured.cancellation_history, defaultMatchingWeights.cancellationHistory),
      priority: numericWeight(configured.recommendationPriority ?? configured.priority, defaultMatchingWeights.priority),
    };
    const categoryTerms = [request.category.name, request.service?.name].filter((value): value is string => Boolean(value));
    const workers = await prisma.workerProfile.findMany({
      where: {
        verificationStatus: "APPROVED",
        deletedAt: null,
        ...(request.subdivisionId ? { subdivisionId: request.subdivisionId } : {}),
        OR: categoryTerms.flatMap((term) => [
          { industry: { name: { equals: term, mode: "insensitive" as const } } },
          { skills: { some: { skill: { name: { equals: term, mode: "insensitive" as const } } } } },
        ]),
      },
      include: {
        industry: true,
        skills: { include: { skill: true } },
        serviceAreas: true,
        user: { include: { workerBookings: { select: { status: true, createdAt: true, acceptedAt: true, history: { select: { toStatus: true } } } } } },
      },
    });
    const scored = workers.flatMap((worker) => {
      const areas = worker.serviceAreas.filter((area) => area.latitude !== null && area.longitude !== null);
      const distances = request.latitude !== null && request.longitude !== null
        ? areas.map((area) => ({
          area,
          distance: haversine(Number(request.latitude), Number(request.longitude), Number(area.latitude), Number(area.longitude)),
        }))
        : [];
      const nearest = distances.sort((left, right) => left.distance - right.distance)[0];
      if (!request.subdivisionId && nearest?.area.radiusKm !== null && nearest && nearest.distance > Number(nearest.area.radiusKm)) return [];
      const distanceKm = nearest?.distance ?? 20;
      const distanceScore = Math.max(0, 100 - distanceKm * 5);
      const availabilityScore = worker.availabilityStatus === "ONLINE" ? 100 : worker.availabilityStatus === "BUSY" ? 50 : 0;
      const ratingScore = Math.min(100, Number(worker.ratingAverage) / 5 * 100);
      const completedJobsScore = Math.min(100, worker.completedJobs * 5);
      const bookings = worker.user.workerBookings;
      const cancellationRate = bookings.length ? bookings.filter((booking) => booking.status === "CANCELLED" || booking.history.some((event) => event.toStatus === "CANCELLED")).length / bookings.length : 0;
      const cancellationScore = Math.max(0, 100 - cancellationRate * 200);
      const responseTimes = bookings.flatMap((booking) => booking.acceptedAt
        ? [(booking.acceptedAt.getTime() - booking.createdAt.getTime()) / 60000]
        : []);
      const averageResponseMinutes = responseTimes.length
        ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
        : 20;
      const responseScore = Math.max(0, 100 - averageResponseMinutes * 5);
      const priorityScore = worker.recommendationPriority ? 100 : 0;
      const score = distanceScore * weights.distance
        + availabilityScore * weights.availability
        + ratingScore * weights.rating
        + completedJobsScore * weights.completedJobs
        + responseScore * weights.responseHistory
        + cancellationScore * weights.cancellationHistory
        + priorityScore * weights.priority;
      return [{ worker, score, distanceKm, factors: { distanceScore, availabilityScore, ratingScore, completedJobsScore, responseScore, cancellationScore, priorityScore } }];
    }).sort((left, right) => right.score - left.score || left.distanceKm - right.distanceKm).slice(0, Math.min(5, limit));
    await prisma.$transaction([
      prisma.requestMatch.deleteMany({ where: { requestId: id, ...(scored.length ? { workerId: { notIn: scored.map(({ worker }) => worker.id) } } : {}) } }),
      ...scored.map(({ worker, score, distanceKm, factors }) => prisma.requestMatch.upsert({
        where: { requestId_workerId: { requestId: id, workerId: worker.id } },
        create: { requestId: id, workerId: worker.id, score, distanceKm, reasons: factors },
        update: { score, distanceKm, reasons: factors },
      })),
    ]);
    return prisma.requestMatch.findMany({ where: { requestId: id }, include: { worker: { include: { user: { include: { profile: true } }, industry: true, skills: { include: { skill: true } } } } }, orderBy: { score: "desc" } });
  }
  async bids(userId: string, roles: string[], id: string) {
    const request = await this.detail(userId, roles, id);
    if (request.customerId !== userId && !isAdmin(roles)) throw new AuthorizationError();
    return prisma.jobBid.findMany({ where: { requestId: id }, include: { worker: { include: { profile: true, workerProfile: true } } }, orderBy: { createdAt: "desc" } });
  }
  async bid(userId: string, id: string, input: any) {
    const [request, worker] = await Promise.all([prisma.serviceRequest.findFirst({ where: { id, status: "POSTED", urgency: "OPEN_BIDDING", deletedAt: null } }), prisma.workerProfile.findFirst({ where: { userId, verificationStatus: "APPROVED", deletedAt: null } })]);
    if (!request) throw new ConflictError("Request is not open for bidding", "invalid_request_state");
    if (!worker) throw new AuthorizationError("Only approved workers may bid");
    try { return await prisma.jobBid.create({ data: { requestId: id, workerId: userId, ...input } }); } catch { throw new ConflictError("A bid already exists for this request", "duplicate_bid"); }
  }
  async updateBid(userId:string,id:string,input:any){const bid=await prisma.jobBid.findFirst({where:{id,workerId:userId,status:"ACTIVE"}});if(!bid)throw new NotFoundError("Active bid");return prisma.jobBid.update({where:{id},data:input})}
  async withdrawBid(userId:string,id:string){const result=await prisma.jobBid.updateMany({where:{id,workerId:userId,status:"ACTIVE"},data:{status:"WITHDRAWN"}});if(!result.count)throw new NotFoundError("Active bid")}
  async selectWorker(userId: string, id: string, input: any) {
    const request = await prisma.serviceRequest.findFirst({ where: { id, customerId: userId, status: { in: ["POSTED", "SEARCHING", "SCHEDULED"] }, deletedAt: null }, include: { address: true } });
    if (!request) throw new ConflictError("Request cannot be assigned", "invalid_request_state");
    const worker = await prisma.workerProfile.findFirst({ where: { OR: [{ id: input.workerId }, { userId: input.workerId }], verificationStatus: "APPROVED" }, include: { serviceAreas: { where: { latitude: { not: null }, longitude: { not: null } }, orderBy: { label: "asc" }, take: 1 } } });
    if (!worker) throw new NotFoundError("Worker");
    const bid = input.bidId ? await prisma.jobBid.findFirst({ where: { id: input.bidId, requestId: id, workerId: worker.userId, status: "ACTIVE" } }) : null;
    if (input.bidId && !bid) throw new NotFoundError("Bid");
    const amount = bid?.maxAmount ?? request.budgetMax ?? worker.hourlyRate ?? 0;
    const addressText = request.addressText ?? [request.address?.streetNumber, request.address?.street, request.address?.city, request.address?.region].filter(Boolean).join(", ");
    if (!addressText) throw new ConflictError("A service address is required", "address_required");
    return prisma.$transaction(async (tx) => {
      const origin = worker.serviceAreas[0];
      const booking = await tx.booking.create({ data: { requestId: id, customerId: userId, workerId: worker.userId, serviceId: request.serviceId, scheduledAt: request.scheduledAt, addressText, latitude: request.latitude, longitude: request.longitude, workerStartLat: origin?.latitude, workerStartLng: origin?.longitude, notes: request.description, hasParts: request.hasParts, partsDescription: request.partsDescription, amount, currency: request.currency, history: { create: { actorId: userId, toStatus: "HIRED" } } }, include: bookingInclude });
      const conversation = await tx.conversation.create({ data: { requestId: id, bookingId: booking.id, participants: { createMany: { data: [{ userId }, { userId: worker.userId }] } } } });
      await tx.serviceRequest.update({ where: { id }, data: { selectedWorkerId: worker.userId, status: "ACCEPTED", version: { increment: 1 } } });
      if (bid) await tx.jobBid.update({ where: { id: bid.id }, data: { status: "ACCEPTED" } });
      await tx.jobBid.updateMany({ where: { requestId: id, id: { not: bid?.id }, status: "ACTIVE" }, data: { status: "REJECTED" } });
      return { booking, conversationId: conversation.id };
    });
  }
  async bookings(userId: string, roles: string[], query: { page: number; limit: number; status?: BookingStatus; search?: string }) {
    const where: Prisma.BookingWhereInput = { deletedAt: null, ...(isAdmin(roles) ? {} : { OR: [{ customerId: userId }, { workerId: userId }] }), ...(query.status ? { status: query.status } : {}), ...(query.search ? { OR: [{ addressText: { contains: query.search, mode: "insensitive" } }, { service: { name: { contains: query.search, mode: "insensitive" } } }] } : {}) };
    const [items,total] = await prisma.$transaction([prisma.booking.findMany({ where, ...pagination(query.page,query.limit), include: bookingInclude, orderBy: { createdAt: "desc" } }), prisma.booking.count({ where })]); return { items, meta: paginationMeta(query.page,query.limit,total) };
  }
  async booking(userId: string, roles: string[], id: string) { const item = await prisma.booking.findFirst({ where: { id, deletedAt: null }, include: bookingInclude }); if (!item) throw new NotFoundError("Booking"); if (!participant(item,userId,roles)) throw new AuthorizationError(); return item; }
  async directBooking(userId: string, input: any) {
    const worker = await prisma.workerProfile.findFirst({ where: { OR: [{ id: input.providerId }, { userId: input.providerId }], verificationStatus: "APPROVED", deletedAt: null }, include: { serviceAreas: { where: { latitude: { not: null }, longitude: { not: null } }, orderBy: { label: "asc" }, take: 1 } } }); if (!worker) throw new NotFoundError("Provider");
    const service = input.serviceId ? await prisma.service.findFirst({ where: { id: input.serviceId, status: "ACTIVE", deletedAt: null } }) : null; const amount = service?.basePrice ?? worker.hourlyRate ?? 0;
    const origin = worker.serviceAreas[0];
    return prisma.booking.create({ data: { customerId: userId, workerId: worker.userId, serviceId: service?.id, scheduledAt: input.scheduledAt, addressText: input.addressText, latitude: input.latitude, longitude: input.longitude, workerStartLat: origin?.latitude, workerStartLng: origin?.longitude, notes: input.notes, hasParts: input.hasParts, partsDescription: input.partsDescription, amount, history: { create: { actorId: userId, toStatus: "HIRED" } }, conversations: { create: { participants: { createMany: { data: [{ userId }, { userId: worker.userId }] } } } } }, include: bookingInclude });
  }
  async updateBooking(userId:string,roles:string[],id:string,input:any){const current=await this.booking(userId,roles,id);if(!isAdmin(roles)&&current.customerId!==userId)throw new AuthorizationError();if(!["HIRED","ACCEPTED"].includes(current.status)||current.version!==input.version)throw new ConflictError("Booking state or version changed","invalid_booking_state");const{version,...data}=input;const result=await prisma.booking.updateMany({where:{id,version},data:{...data,version:{increment:1}}});if(!result.count)throw new ConflictError("Booking was modified concurrently","version_conflict");return this.booking(userId,roles,id)}
  async transition(userId: string, roles: string[], id: string, input: any) {
    const current = await this.booking(userId,roles,id); if (input.version && current.version !== input.version) throw new ConflictError("Booking version changed", "version_conflict");
    const map: Record<string,{from:BookingStatus[];to:BookingStatus;actor:"worker"|"customer"|"either"}> = { accept:{from:["HIRED"],to:"ACCEPTED",actor:"worker"}, decline:{from:["HIRED"],to:"CANCELLED",actor:"worker"}, confirm_details:{from:["HIRED"],to:"ACCEPTED",actor:"customer"}, en_route:{from:["ACCEPTED"],to:"EN_ROUTE",actor:"worker"}, arrive:{from:["EN_ROUTE"],to:"ARRIVED",actor:"worker"}, start:{from:["ARRIVED"],to:"IN_PROGRESS",actor:"worker"}, complete:{from:["IN_PROGRESS"],to:"PENDING_CONFIRMATION",actor:"worker"}, confirm_completion:{from:["PENDING_CONFIRMATION"],to:"COMPLETED",actor:"customer"} };
    const rule=map[input.action]!; if (!rule.from.includes(current.status)) throw new ConflictError(`Cannot ${input.action} a ${current.status} booking`,"invalid_transition"); if (!isAdmin(roles) && ((rule.actor==="worker"&&current.workerId!==userId)||(rule.actor==="customer"&&current.customerId!==userId))) throw new AuthorizationError();
    const now=new Date(); const timestamps:any={}; if(rule.to==="ACCEPTED")timestamps.acceptedAt=now; if(rule.to==="EN_ROUTE")timestamps.enRouteAt=now; if(rule.to==="ARRIVED")timestamps.arrivedAt=now; if(rule.to==="IN_PROGRESS")timestamps.startedAt=now; if(rule.to==="PENDING_CONFIRMATION")timestamps.workerCompletedAt=now; if(rule.to==="COMPLETED")timestamps.completedAt=now; if(rule.to==="CANCELLED")timestamps.cancelledAt=now;
    await prisma.$transaction([prisma.booking.update({where:{id},data:{status:rule.to,...timestamps,version:{increment:1}}}),prisma.bookingStatusHistory.create({data:{bookingId:id,actorId:userId,fromStatus:current.status,toStatus:rule.to}})]); return this.booking(userId,roles,id);
  }
  async cancel(userId:string,roles:string[],id:string,input:any){const current=await this.booking(userId,roles,id);if(["COMPLETED","CANCELLED","REFUNDED"].includes(current.status))throw new ConflictError("Booking cannot be cancelled","invalid_transition");await prisma.$transaction([prisma.booking.update({where:{id},data:{status:"CANCELLED",cancelledAt:new Date(),version:{increment:1}}}),prisma.bookingCancellation.create({data:{bookingId:id,actorId:userId,...input,currency:current.currency}}),prisma.bookingStatusHistory.create({data:{bookingId:id,actorId:userId,fromStatus:current.status,toStatus:"CANCELLED",reason:input.customReason??input.reasonId}})]);return this.booking(userId,roles,id);}
}
export const requestBookingService = new RequestBookingService();
