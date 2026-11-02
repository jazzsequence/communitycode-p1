import "../styles.css";
import { HtmlShell } from "../../components/html-shell";

/** Root layout for the editor and its auth and API routes. */
export default function EditorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HtmlShell lang="en">{children}</HtmlShell>;
}
