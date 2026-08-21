import type { components as CanonicalComponents, paths as CanonicalPaths } from './generated/schema';

type CanonicalSchemas = CanonicalComponents['schemas'];

type LegacyCandidate = Omit<CanonicalSchemas['Candidate'], 'readinessStatus' | 'contactabilityStatus'> & {
  readinessStatus: CanonicalSchemas['Candidate']['readinessStatus'] | 'READY_FOR_REVIEW' | 'READY_FOR_INTERVIEW' | 'NOT_READY';
  contactabilityStatus: CanonicalSchemas['Candidate']['contactabilityStatus'] | 'UNKNOWN';
};

type LegacyCandidateMatch = Omit<CanonicalSchemas['CandidateMatch'], 'readinessStatus'> & {
  readinessStatus?: CanonicalSchemas['CandidateMatch']['readinessStatus'] | 'READY_FOR_REVIEW' | 'READY_FOR_INTERVIEW' | 'NOT_READY';
  readiness: string;
};

type LegacyCreateCandidateRequest = Omit<CanonicalSchemas['CreateCandidateRequest'], 'readinessStatus' | 'contactabilityStatus'> & {
  readinessStatus?: CanonicalSchemas['CreateCandidateRequest']['readinessStatus'] | 'READY_FOR_REVIEW' | 'READY_FOR_INTERVIEW' | 'NOT_READY';
  contactabilityStatus?: CanonicalSchemas['CreateCandidateRequest']['contactabilityStatus'] | 'UNKNOWN';
};

type LegacyWorkItem = Omit<CanonicalSchemas['WorkItem'], 'status' | 'waitingOn'> & {
  status: CanonicalSchemas['WorkItem']['status'] | 'TODO' | 'WAITING_REPLY';
  waitingOn?: string;
};

type LegacyJobOrder = Omit<CanonicalSchemas['JobOrder'], 'status'> & {
  status: CanonicalSchemas['JobOrder']['status'] | 'RECRUITING' | 'PAUSED';
};

type LegacyOrderStatusUpdate = Omit<CanonicalSchemas['OrderStatusUpdate'], 'status'> & {
  status: CanonicalSchemas['OrderStatusUpdate']['status'] | 'RECRUITING' | 'PAUSED';
};

type LegacyEmailMessage = Omit<CanonicalSchemas['EmailMessage'], 'status'> & {
  status: CanonicalSchemas['EmailMessage']['status'] | 'RECEIVED';
};

type LegacyCandidateDetail = Omit<CanonicalSchemas['CandidateDetail'], 'readinessStatus' | 'contactabilityStatus'> & LegacyCandidate;

type LegacyCandidateSearchResponse = { items: LegacyCandidateMatch[] };
type LegacyCandidatesResponse = { items: LegacyCandidate[] };
type LegacyWorkItemsResponse = { items: LegacyWorkItem[] };
type LegacyOrdersResponse = { items: LegacyJobOrder[] };
type LegacyConversationDetail = Omit<CanonicalSchemas['ConversationDetail'], 'messages'> & { messages: LegacyEmailMessage[] };
type LegacyEntitySchema<Schema> = Schema extends CanonicalSchemas['CandidateDetail']
  ? LegacyCandidateDetail
  : Schema extends CanonicalSchemas['CandidateSearchResponse']
    ? LegacyCandidateSearchResponse
    : Schema extends CanonicalSchemas['CandidatesResponse']
      ? LegacyCandidatesResponse
      : Schema extends CanonicalSchemas['WorkItemsResponse']
        ? LegacyWorkItemsResponse
        : Schema extends CanonicalSchemas['OrdersResponse']
          ? LegacyOrdersResponse
          : Schema extends CanonicalSchemas['ConversationDetail']
            ? LegacyConversationDetail
            : Schema extends CanonicalSchemas['Candidate']
              ? LegacyCandidate
              : Schema extends CanonicalSchemas['CandidateMatch']
                ? LegacyCandidateMatch
                : Schema extends CanonicalSchemas['WorkItem']
                  ? LegacyWorkItem
                  : Schema extends CanonicalSchemas['JobOrder']
                    ? LegacyJobOrder
                    : Schema extends CanonicalSchemas['EmailMessage']
                      ? LegacyEmailMessage
                      : Schema;

type LegacyRequestSchema<Schema> = Schema extends CanonicalSchemas['CreateCandidateRequest']
  ? LegacyCreateCandidateRequest
  : Schema extends CanonicalSchemas['OrderStatusUpdate']
    ? LegacyOrderStatusUpdate
    : Schema;

type LegacySchemas = {
  [K in keyof CanonicalSchemas]: K extends 'Candidate'
      ? LegacyCandidate
      : K extends 'CandidateMatch'
        ? LegacyCandidateMatch
        : K extends 'CandidateDetail'
          ? LegacyCandidateDetail
          : K extends 'CandidateSearchResponse'
            ? LegacyCandidateSearchResponse
            : K extends 'CandidatesResponse'
              ? LegacyCandidatesResponse
              : K extends 'WorkItemsResponse'
                ? LegacyWorkItemsResponse
                : K extends 'OrdersResponse'
                  ? LegacyOrdersResponse
                  : K extends 'ConversationDetail'
                    ? LegacyConversationDetail
        : K extends 'CreateCandidateRequest' | 'CandidateUpdateRequest'
          ? LegacyCreateCandidateRequest
        : K extends 'WorkItem'
          ? LegacyWorkItem
              : K extends 'JobOrder'
                ? LegacyJobOrder
                : K extends 'OrderStatusUpdate'
                  ? LegacyOrderStatusUpdate
                : K extends 'EmailMessage'
              ? LegacyEmailMessage
              : CanonicalSchemas[K];
};

/**
 * Compatibility view for the existing web/MSW consumer during the contract migration.
 * Backend code must import `canonicalComponents` and `canonicalPaths` instead.
 */
export type components = Omit<CanonicalComponents, 'schemas'> & { schemas: LegacySchemas };

type LegacySuccessSchema<Schema> = Schema extends { data: infer Data; page: infer Page }
  ? LegacyEntitySchema<Data> extends infer LegacyData
    ? LegacyData extends object
      ? LegacyData & (Page extends { nextCursor: infer Cursor } ? { nextCursor: Cursor } : Record<never, never>)
      : LegacyData
    : never
  : Schema extends { data: infer Data; requestId: string }
    ? LegacyEntitySchema<Data>
    : Schema extends { error: infer Error; requestId: infer RequestId }
      ? Error extends object
        ? Error & { message: Error extends { messageKey: infer MessageKey } ? MessageKey : string; traceId: RequestId }
        : Schema
      : Schema;

type LegacyContent<Content> = Content extends Record<string, unknown>
  ? { [K in keyof Content]: K extends 'application/json' ? LegacySuccessSchema<Content[K]> : Content[K] }
  : Content;

type LegacyRequestContent<Content> = Content extends Record<string, unknown>
  ? { [K in keyof Content]: K extends 'application/json' ? LegacyRequestSchema<Content[K]> : Content[K] }
  : Content;

type LegacyResponse<Response> = Response extends { content: infer Content }
  ? Omit<Response, 'content'> & { content: LegacyContent<Content> }
  : Response;

type LegacyQueryAliases = {
  industry?: string;
  occupation?: string;
  readiness?: string;
  contactability?: string;
};

type LegacyParameters<Parameters> = Parameters extends { query: infer Query }
  ? Omit<Parameters, 'query'> & { query: Query extends Record<string, unknown> ? Query & LegacyQueryAliases : Query }
  : Parameters extends { query?: infer Query }
    ? Omit<Parameters, 'query'> & { query?: Query extends Record<string, unknown> ? Query & LegacyQueryAliases : Query }
    : Parameters;

type LegacyOperation<Operation> = Operation extends { responses: infer Responses }
  ? Omit<Operation, 'responses' | 'requestBody' | 'parameters'> & {
      responses: { [K in keyof Responses]: LegacyResponse<Responses[K]> };
    }
    & (Operation extends { requestBody: infer RequestBody }
      ? RequestBody extends { content: infer Content }
        ? { requestBody: Omit<RequestBody, 'content'> & { content: LegacyRequestContent<Content> } }
        : { requestBody: RequestBody }
      : Record<never, never>)
    & (Operation extends { parameters: infer Parameters }
      ? { parameters: LegacyParameters<Parameters> }
      : Record<never, never>)
  : Operation;

type LegacyPathItem<PathItem> = PathItem extends Record<string, unknown>
  ? { [K in keyof PathItem]: PathItem[K] extends { responses: unknown } ? LegacyOperation<PathItem[K]> : PathItem[K] }
  : PathItem;

type LegacyLoginPath = {
  parameters: never;
  get?: never;
  put?: never;
  post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': {
          email: string;
          password: string;
        };
      };
    };
    responses: {
      200: { content: { 'application/json': CanonicalSchemas['Session'] } };
      401: { content: { 'application/json': { code: string; message: string } } };
    };
  };
  delete?: never;
  options?: never;
  head?: never;
  patch?: never;
  trace?: never;
};

/**
 * Web compatibility paths: production paths are envelope-based, while the web
 * adapter exposes the unwrapped response shape until each feature migrates.
 */
export type paths = {
  [K in keyof CanonicalPaths]: LegacyPathItem<CanonicalPaths[K]>;
} & { '/auth/login': LegacyLoginPath };
