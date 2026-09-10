export const TRANSLEND_ROLES = ['owner','operations_manager','dispatcher','fleet_manager','finance','driver','viewer'] as const
export type TranslendRole = (typeof TRANSLEND_ROLES)[number]

export const TRANSLEND_CAPABILITIES = [
  'organization.manage','users.manage','operations.read','operations.manage',
  'dispatch.manage','fleet.read','fleet.manage','finance.read','finance.manage',
  'documents.read','documents.manage','reports.read',
] as const
export type TranslendCapability = (typeof TRANSLEND_CAPABILITIES)[number]

const ROLE_CAPABILITIES: Record<TranslendRole, readonly TranslendCapability[]> = {
  owner: TRANSLEND_CAPABILITIES,
  operations_manager: ['operations.read','operations.manage','dispatch.manage','fleet.read','documents.read','documents.manage','reports.read'],
  dispatcher: ['operations.read','operations.manage','dispatch.manage','fleet.read','documents.read','documents.manage'],
  fleet_manager: ['operations.read','fleet.read','fleet.manage','documents.read','documents.manage','reports.read'],
  finance: ['operations.read','finance.read','finance.manage','documents.read','documents.manage','reports.read'],
  driver: ['operations.read','documents.read'],
  viewer: ['operations.read','fleet.read','finance.read','documents.read','reports.read'],
}

export function roleHasCapability(role: TranslendRole, capability: TranslendCapability) {
  return ROLE_CAPABILITIES[role].includes(capability)
}

export function capabilitiesForRole(role: TranslendRole) {
  return ROLE_CAPABILITIES[role]
}
