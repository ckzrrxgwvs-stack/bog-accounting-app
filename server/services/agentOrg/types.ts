import type {
  AccountingEventSource,
  AccountingEventType,
  AgentRole,
} from '@prisma/client';

/** Normalized sale payload from Shopify or other connectors (subset — extend per source). */
export type SaleOrderPaidPayload = {
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  currency?: string;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  lineCount?: number;
  paidAt?: string;
};

export type IngestEventInput = {
  companyId: string;
  source: AccountingEventSource;
  eventType: AccountingEventType;
  externalId?: string | null;
  idempotencyKey?: string | null;
  payload: Record<string, unknown>;
};

export const BUILD_AGENT_ROLES: AgentRole[] = [
  'PM_ORCHESTRATOR',
  'SYSTEMS_ENGINEER',
  'BOOKKEEPER',
  'CONNECTOR',
  'CONTROLLER',
];
