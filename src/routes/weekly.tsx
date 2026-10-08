import { createFileRoute } from "@tanstack/react-router";
import { PeriodPage } from "@/components/awwab/PeriodPage";
import { meta } from "@/lib/awwab/useToday";

export const Route = createFileRoute("/weekly")({
  head: () => meta("Weekly — AWWAB", "Your Monday-to-Sunday performance across seven life domains."),
  component: () => <PeriodPage kind="week" />,
});
