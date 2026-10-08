import { createFileRoute } from "@tanstack/react-router";
import { PeriodPage } from "@/components/awwab/PeriodPage";
import { meta } from "@/lib/awwab/useToday";

export const Route = createFileRoute("/monthly")({
  head: () => meta("Monthly — AWWAB", "Your calendar-month performance across seven life domains."),
  component: () => <PeriodPage kind="month" />,
});
