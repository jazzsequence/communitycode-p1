/**
 * The document around every route. The site and the editor are separate root
 * layouts, and both render through this.
 */

export function HtmlShell({
  lang,
  children,
}: {
  lang: string;
  children: React.ReactNode;
}) {
  return (
    <html lang={lang}>
      {/* Puck's canvas-preview iframe copies this document's <body> attributes
          onto its own iframe <body> (@puckeditor/core's CopyHostStyles
          syncAttributes()), so a class/attribute placed directly on <body>
          cannot be used to keep a rule out of the iframe. `.p1-app-shell` is
          a child of <body> instead — Puck's canvas iframe never contains it
          (the iframe only ever renders the Puck root/block tree into its own
          #frame-root, not this layout). See styles.css for the scoped reset
          this enables. */}
      <body data-rm-theme="light">
        <div className="p1-app-shell">{children}</div>
      </body>
    </html>
  );
}
