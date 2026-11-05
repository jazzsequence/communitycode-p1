export function safeUrl(value: unknown): string {
  const url = (typeof value === "string" ? value : "").replace(/[\t\n\r]/g, "");
  return /^(https:\/\/|\/(?![/\\]))/.test(url) ? url : "";
}

/**
 * <form> attributes for an optional action URL. A safe action posts to it;
 * otherwise (empty, unsafe, or while editing) `method="dialog"` keeps the
 * browser's field checks but never navigates.
 */
export function formAttrs(
  actionHref: unknown,
  editing = false,
): { method: "post"; action: string } | { method: "dialog" } {
  const action = safeUrl(actionHref);
  return action && !editing ? { method: "post", action } : { method: "dialog" };
}
