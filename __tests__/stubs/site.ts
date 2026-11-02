// A fixed `site` for tests: the real content/site.ts is env-driven, so its values
// depend on whichever NEXT_PUBLIC_* happen to be set.
export const site = {
  name: "Community + Code",
  tagline: "A podcast about the people behind the commits",
  url: "https://communitycode.dev",
  feedUrl: "https://communitycode.dev/episodes/feed/episodes/",
  appleUrl: "https://podcasts.apple.com/us/podcast/community-+-code/id1813475905",
  nav: [
    { label: "Episodes", href: "/episodes" },
    { label: "Blog", href: "/blog" },
    { label: "About", href: "/about" },
    { label: "Be a guest", href: "/be-a-guest" },
    { label: "Subscribe", href: "/subscribe" },
  ],
};
