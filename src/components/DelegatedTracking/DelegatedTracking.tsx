"use client";

import Clarity from "@microsoft/clarity";
import { useEffect } from "react";

import { trackUntyped } from "@/lib/analytics";
import { mountedClarity } from "@/lib/clarity";
import { isClarityBlockedPath } from "@/lib/clarityGate";

const EVENT_ATTR = "data-mp-event";
const TRANSPORT_ATTR = "data-mp-transport";
const ATTR_PREFIX = "data-mp-";
const CLARITY_EVENT_ATTR = "data-clarity-event";
const CLARITY_TAG_PREFIX = "data-clarity-tag-";
const SURVIVES_PAGE_EXIT = { transport: "sendBeacon", send_immediately: true } as const;

function attributeSuffixAsKey(attrName: string, prefix: string): string {
  return attrName.slice(prefix.length).replace(/-/g, "_");
}

function collectProperties(element: Element): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const attr of element.attributes) {
    if (!attr.name.startsWith(ATTR_PREFIX)) continue;
    if (attr.name === EVENT_ATTR || attr.name === TRANSPORT_ATTR) continue;
    properties[attributeSuffixAsKey(attr.name, ATTR_PREFIX)] = attr.value;
  }
  return properties;
}

function sendClarityEvent(element: Element) {
  const eventName = element.getAttribute(CLARITY_EVENT_ATTR);
  if (!eventName || !mountedClarity() || isClarityBlockedPath(window.location.pathname)) return;
  Clarity.event(eventName);
  for (const attr of element.attributes) {
    if (attr.name.startsWith(CLARITY_TAG_PREFIX)) {
      Clarity.setTag(attributeSuffixAsKey(attr.name, CLARITY_TAG_PREFIX), attr.value);
    }
  }
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
      const leavesPage = tagged.getAttribute(TRANSPORT_ATTR) === SURVIVES_PAGE_EXIT.transport;
      trackUntyped(eventName, collectProperties(tagged), leavesPage ? SURVIVES_PAGE_EXIT : undefined);
      sendClarityEvent(tagged);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
