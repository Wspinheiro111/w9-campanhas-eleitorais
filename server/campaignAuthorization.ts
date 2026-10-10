import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "./_core/trpc";
import * as db from "./campaignDb";
import { resolveCampaignRole, type CampaignRole } from "./campaignPolicy";

export type OrganizationRole = "admin" | "manager" | "operator" | "viewer";

export type OrganizationCapability =
  | "organization.read"
  | "organization.manage"
  | "organization.roles.manage"
  | "organization.invitations.manage"
  | "organization.audit.read"
  | "organization.performance.read";

export type CampaignCapability =
  | "campaign.read"
  | "campaign.manage"
  | "team.manage"
  | "records.read_own"
  | "records.read_all"
  | "contacts.import"
  | "finance.manage"
  | "compliance.review"
  | "storage.read"
  | "storage.write"
  | "content.manage"
  | "consent.write_own"
  | "consent.manage"
  | "field.write"
  | "volunteers.manage";

type CampaignAccess = NonNullable<Awaited<ReturnType<typeof db.getCampaignAccess>>>;
type OrganizationMembership = NonNullable<Awaited<ReturnType<typeof db.getOrganizationMembership>>>;

const ORGANIZATION_CAPABILITIES: Record<OrganizationRole, ReadonlySet<OrganizationCapability>> = {
  admin: new Set<OrganizationCapability>([
    "organization.read",
    "organization.manage",
    "organization.roles.manage",
    "organization.invitations.manage",
    "organization.audit.read",
    "organization.performance.read",
  ]),
  manager: new Set<OrganizationCapability>([
    "organization.read",
    "organization.manage",
    "organization.invitations.manage",
    "organization.audit.read",
    "organization.performance.read",
  ]),
  operator: new Set<OrganizationCapability>(["organization.read"]),
  viewer: new Set<OrganizationCapability>(["organization.read"]),
};

const CAMPAIGN_CAPABILITIES: Record<CampaignRole, ReadonlySet<CampaignCapability>> = {
  admin: new Set<CampaignCapability>([
    "campaign.read",
    "campaign.manage",
    "team.manage",
    "records.read_own",
    "records.read_all",
    "contacts.import",
    "finance.manage",
    "compliance.review",
    "storage.read",
    "storage.write",
    "content.manage",
    "consent.write_own",
    "consent.manage",
    "field.write",
    "volunteers.manage",
  ]),
  coordinator: new Set<CampaignCapability>([
    "campaign.read",
    "campaign.manage",
    "records.read_own",
    "records.read_all",
    "contacts.import",
    "finance.manage",
    "compliance.review",
    "storage.read",
    "storage.write",
    "content.manage",
    "consent.write_own",
    "consent.manage",
    "field.write",
    "volunteers.manage",
  ]),
  partner: new Set<CampaignCapability>([
    "campaign.read",
    "records.read_own",
    "contacts.import",
    "storage.read",
    "consent.write_own",
    "field.write",
  ]),
};

export type CampaignAuthorization = {
  access: CampaignAccess;
  campaignRole: CampaignRole;
  organizationRole: OrganizationRole;
  currentMemberId: number | null;
  campaignCapabilities: ReadonlySet<CampaignCapability>;
  organizationCapabilities: ReadonlySet<OrganizationCapability>;
};

export type OrganizationAuthorization = {
  membership: OrganizationMembership;
  organizationRole: OrganizationRole;
  organizationCapabilities: ReadonlySet<OrganizationCapability>;
};

function forbidden(message: string): never {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

function normalizeOrganizationRole(value: string): OrganizationRole {
  if (value === "admin" || value === "manager" || value === "operator" || value === "viewer") return value;
  return forbidden("Papel organizacional inválido.");
}

export function buildCampaignAuthorization(access: CampaignAccess, userId: number): CampaignAuthorization {
  const campaignRole = resolveCampaignRole({
    memberRole: access.member?.role as CampaignRole | null | undefined,
    campaignOwnerId: access.campaign.ownerId,
    userId,
  });
  if (!campaignRole) return forbidden("Vínculo da campanha não encontrado.");
  const organizationRole = normalizeOrganizationRole(access.organizationMember.role);
  return {
    access,
    campaignRole,
    organizationRole,
    currentMemberId: access.member?.id ?? null,
    campaignCapabilities: CAMPAIGN_CAPABILITIES[campaignRole],
    organizationCapabilities: ORGANIZATION_CAPABILITIES[organizationRole],
  };
}

export function buildOrganizationAuthorization(membership: OrganizationMembership): OrganizationAuthorization {
  const organizationRole = normalizeOrganizationRole(membership.role);
  return {
    membership,
    organizationRole,
    organizationCapabilities: ORGANIZATION_CAPABILITIES[organizationRole],
  };
}

export function hasCampaignCapability(authorization: CampaignAuthorization, capability: CampaignCapability) {
  return authorization.campaignCapabilities.has(capability);
}

export function hasOrganizationCapability(authorization: CampaignAuthorization | OrganizationAuthorization, capability: OrganizationCapability) {
  return authorization.organizationCapabilities.has(capability);
}

export function requireCampaignCapability(authorization: CampaignAuthorization, capability: CampaignCapability) {
  if (!hasCampaignCapability(authorization, capability)) {
    return forbidden("Seu perfil não possui permissão para esta ação na campanha.");
  }
  return authorization;
}

export function requireOrganizationCapability(authorization: CampaignAuthorization | OrganizationAuthorization, capability: OrganizationCapability) {
  if (!hasOrganizationCapability(authorization, capability)) {
    return forbidden("Seu perfil não possui permissão para esta ação na organização.");
  }
  return authorization;
}

export function assertOwnedCampaignRecord(authorization: CampaignAuthorization, recordOwnerMemberId: number | null | undefined) {
  if (authorization.campaignRole !== "partner") return authorization;
  if (recordOwnerMemberId !== null && recordOwnerMemberId !== undefined && recordOwnerMemberId === authorization.currentMemberId) return authorization;
  return forbidden("Seu perfil possui acesso restrito aos próprios registros.");
}

export async function requireCampaignAuthorization(userId: number, campaignId: number) {
  const access = await db.getCampaignAccess(campaignId, userId);
  if (!access) return forbidden("Você não possui acesso a esta campanha.");
  return buildCampaignAuthorization(access, userId);
}

export async function requireOrganizationAuthorization(userId: number, organizationId: number) {
  const membership = await db.getOrganizationMembership(userId, organizationId);
  if (!membership) return forbidden("Organização não disponível para este usuário.");
  return buildOrganizationAuthorization(membership);
}

function campaignIdFromRawInput(rawInput: unknown) {
  if (!rawInput || typeof rawInput !== "object" || !("campaignId" in rawInput)) return null;
  const campaignId = (rawInput as { campaignId?: unknown }).campaignId;
  return typeof campaignId === "number" && Number.isInteger(campaignId) && campaignId > 0 ? campaignId : null;
}

export function campaignCapabilityProcedure(capability: CampaignCapability) {
  return protectedProcedure.use(async ({ ctx, getRawInput, next }) => {
    const campaignId = campaignIdFromRawInput(await getRawInput());
    if (!campaignId) throw new TRPCError({ code: "BAD_REQUEST", message: "campaignId válido é obrigatório para autorização." });
    const campaignAuthorization = requireCampaignCapability(
      await requireCampaignAuthorization(ctx.user.id, campaignId),
      capability,
    );
    return next({ ctx: { ...ctx, campaignAuthorization } });
  });
}

export function organizationCapabilityProcedure(capability: OrganizationCapability) {
  return protectedProcedure.use(async ({ ctx, getRawInput, next }) => {
    const rawInput = await getRawInput();
    const organizationId = rawInput && typeof rawInput === "object" && "organizationId" in rawInput
      ? (rawInput as { organizationId?: unknown }).organizationId
      : null;
    if (typeof organizationId !== "number" || !Number.isInteger(organizationId) || organizationId <= 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "organizationId válido é obrigatório para autorização." });
    }
    const organizationAuthorization = requireOrganizationCapability(
      await requireOrganizationAuthorization(ctx.user.id, organizationId),
      capability,
    );
    return next({ ctx: { ...ctx, organizationAuthorization } });
  });
}
