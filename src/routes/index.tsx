import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" }); // /auth forwards signed-in users to /home
  },
  head: () => ({
    meta: [
      { title: "AWWAB — Personal life feedback" },
      { name: "description", content: "Track, score and understand your life across seven domains." },
      { property: "og:title", content: "AWWAB — Personal life feedback" },
      { property: "og:description", content: "Track, score and understand your life across seven domains." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
