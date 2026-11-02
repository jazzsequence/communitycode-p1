import { initialsOf } from "@/lib/guests";
import "./chrome-blocks.css";

/**
 * A person's photo, or an initials tile when there is none. With no `alt` the
 * photo is decorative (the name sits right next to it); initials are always
 * aria-hidden because the name is the accessible text.
 */
export function GuestAvatar({ name, photoUrl, alt = "" }: { name: string; photoUrl: string | null; alt?: string }) {
  if (photoUrl) {
    // Photos come from WordPress/show.fm or the media picker on arbitrary hosts.
    return <img className="cc-avatar-img" src={photoUrl} alt={alt} loading="lazy" decoding="async" />;
  }
  return (
    <div className="cc-avatar" aria-hidden="true">
      {initialsOf(name)}
    </div>
  );
}
