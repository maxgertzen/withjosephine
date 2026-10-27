import { getPublishedId } from "@sanity/client/csm";

export type ReadingReferrer = {
  _id: string;
  _type: string;
  title?: string | null;
  detailOverride?: string | null;
  appliesToServices?: string[] | null;
  overrideKeys?: string[] | null;
};

type ReadingPatch = { id: string; set?: Record<string, string>; unset: string[] };

export type ReadingDeletionPlan = { blocked: string[]; patches: ReadingPatch[]; summary: string[] };

export const READING_RELEASE_VERSIONS_QUERY = `count(*[_id in path($versionsPath)])`;

export function releaseVersionsPath(readingId: string) {
  return `versions.*.${readingId}`;
}

export const READING_REFERRERS_QUERY = `*[references($id)]{
  _id,
  _type,
  "title": coalesce(title, label, sectionTitle, name, _id),
  detailOverride,
  "appliesToServices": appliesToServices[]._ref,
  "overrideKeys": overrides[reading._ref == $id]._key
}`;

function countLine(count: number, one: string, many: string) {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function uniqueCount(referrers: ReadingReferrer[]) {
  return new Set(referrers.map((referrer) => getPublishedId(referrer._id))).size;
}

export function planReadingDeletion(
  readingId: string,
  readingLabel: string,
  referrers: ReadingReferrer[],
  releaseVersions = 0,
): ReadingDeletionPlan {
  const blocked = new Set<string>();
  if (releaseVersions > 0) {
    blocked.add("This reading has changes waiting in a release. Remove it from the release first.");
  }
  const patches: ReadingPatch[] = [];
  const byType = (type: string) => referrers.filter((referrer) => referrer._type === type);

  const orders = byType("submission");
  if (orders.length > 0) {
    blocked.add(`${countLine(uniqueCount(orders), "order is", "orders are")} linked to this reading.`);
  }

  for (const referrer of referrers) {
    switch (referrer._type) {
      case "submission":
        break;
      case "article":
        patches.push({ id: referrer._id, unset: ["relatedReading"] });
        break;
      case "testimonial":
        patches.push({
          id: referrer._id,
          unset: ["readingType"],
          set: referrer.detailOverride ? undefined : { detailOverride: readingLabel },
        });
        break;
      case "formField":
      case "formSection":
        if ((referrer.appliesToServices ?? []).every((ref) => ref === readingId)) {
          blocked.add(
            `"${referrer.title}" is set to show only for this reading. Link it to another reading or remove it first, or it would start showing for every reading.`,
          );
        } else {
          patches.push({ id: referrer._id, unset: [`appliesToServices[_ref=="${readingId}"]`] });
        }
        break;
      case "thankYouPage":
        patches.push({
          id: referrer._id,
          unset: (referrer.overrideKeys ?? []).map((key) => `overrides[_key=="${key}"]`),
        });
        break;
      default:
        blocked.add(`"${referrer.title}" (${referrer._type}) links to this reading.`);
    }
  }

  const summary: string[] = [];
  const notes = uniqueCount(byType("article"));
  if (notes > 0) summary.push(countLine(notes, "note loses its reading box.", "notes lose their reading box."));
  const formParts = uniqueCount([...byType("formField"), ...byType("formSection")]);
  if (formParts > 0) {
    summary.push(countLine(formParts, "form part stops listing this reading.", "form parts stop listing this reading."));
  }
  const testimonials = uniqueCount(byType("testimonial"));
  if (testimonials > 0) {
    summary.push(
      countLine(
        testimonials,
        `testimonial keeps "${readingLabel}" under the quote.`,
        `testimonials keep "${readingLabel}" under the quote.`,
      ),
    );
  }
  if (byType("thankYouPage").length > 0) summary.push("The thank-you page drops this reading's own wording.");

  return { blocked: [...blocked], patches, summary };
}
