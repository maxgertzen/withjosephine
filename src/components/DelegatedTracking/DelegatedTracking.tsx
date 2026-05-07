"use client";

import { useEffect } from "react";

import { trackUntyped } from "@/lib/analytics";

const EVENT_ATTR = "data-mp-event";
const ATTR_PREFIX = "data-mp-";

function attrToPropertyKey(attrName: string): string {
  return attrName.slice(ATTR_PREFIX.length).replace(/-/g, "_");
}

function collectProperties(element: Element): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const attr of element.attributes) {
    if (!attr.name.startsWith(ATTR_PREFIX)) continue;
    if (attr.name === EVENT_ATTR) continue;
    properties[attrToPropertyKey(attr.name)] = attr.value;
  }
  return properties;
}

export function DelegatedTracking() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const tagged = target.closest(`[${EVENT_ATTR}]`);
      if (!tagged) return;
      const eventName = tagged.getAttribute(EVENT_ATTR);
      if (!eventName) return;
      trackUntyped(eventName, collectProperties(tagged));
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
