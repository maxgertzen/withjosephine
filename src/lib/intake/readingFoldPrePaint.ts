import { DRAFT_KEY_PREFIX, DRAFT_TTL_MS, DRAFT_VERSION } from "./localStorageDraft";

export const PRE_PAINT_FOLD_ATTRIBUTE = "data-reading-fold";

export function readingFoldPrePaintScript(slug: string): string {
  const draftKey = JSON.stringify(`${DRAFT_KEY_PREFIX}${slug}`);
  return [
    "try{",
    `var d=JSON.parse(localStorage.getItem(${draftKey})||"null");`,
    'if(d&&typeof d==="object"&&typeof d.savedAt==="string"&&typeof d.currentPage==="number"&&typeof d.values==="object"&&d.values!==null',
    `&&d.version===${DRAFT_VERSION}&&Date.now()-Date.parse(d.savedAt)<=${DRAFT_TTL_MS})`,
    `document.body.setAttribute("${PRE_PAINT_FOLD_ATTRIBUTE}","")`,
    "}catch(e){}",
  ].join("");
}
