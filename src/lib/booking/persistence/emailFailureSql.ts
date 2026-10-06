import type { CustomerEmailType, EmailFailureEntry } from "../../page-previews/types";

export type EmailFailuresTable = "submissions" | "gift_codes";

export type NewEmailFailure<
  TEmailType extends string = CustomerEmailType,
  TRecipient extends string = string,
> = Omit<EmailFailureEntry<TEmailType, TRecipient>, "attemptNumber" | "resolvedAt">;

type SetClause = { sql: string; params: string[] };

export function resolveOpenFailures(
  emailType: string,
  resolvedAt: string,
  table: EmailFailuresTable,
): SetClause {
  return {
    sql: `email_failures_json = (
       SELECT json_group_array(
         CASE WHEN json_extract(value, '$.emailType') = ? AND json_extract(value, '$.resolvedAt') IS NULL
           THEN json_set(value, '$.resolvedAt', ?)
           ELSE json(value)
         END
       )
       FROM (SELECT value FROM json_each(${table}.email_failures_json) ORDER BY key)
     )`,
    params: [emailType, resolvedAt],
  };
}

export function appendOpenFailure(
  failure: NewEmailFailure<string, string>,
  table: EmailFailuresTable,
): SetClause {
  return {
    sql: `email_failures_json = json_insert(
       email_failures_json, '$[#]',
       json_set(json(?), '$.attemptNumber', (
         SELECT count(*) FROM json_each(${table}.email_failures_json)
         WHERE json_extract(value, '$.emailType') = ? AND json_extract(value, '$.resolvedAt') IS NULL
       ) + 1)
     )`,
    params: [JSON.stringify({ ...failure, resolvedAt: null }), failure.emailType],
  };
}
