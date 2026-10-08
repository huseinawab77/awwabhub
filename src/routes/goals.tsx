import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Archive, ArchiveRestore, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { DOMAINS, isDomainId } from "@/lib/awwab/config";
import { domainName, useT } from "@/lib/awwab/i18n";
import { formatShort } from "@/lib/awwab/dates";
import { goalProgress, goalStatus, isOverdue, milestonesOf, projectProgress, projectStatus, projectsOf } from "@/lib/awwab/goals";
import { deleteMilestone, saveGoal, saveMilestone, saveProject, toggleMilestone, useAppState, type Goal, type Milestone, type Project } from "@/lib/awwab/store";
import { meta, useToday } from "@/lib/awwab/useToday";
import { Bar, EmptyState, PageHeader, Segmented } from "@/components/awwab/ui";

export const Route = createFileRoute("/goals")({
  head: () => meta("Goals — AWWAB", "Goals, projects and milestones — your life direction."),
  component: GoalsPage,
});

type Filter = "active" | "completed" | "archived";

function GoalsPage() {
  const state = useAppState();
  const t = useT();
  const [filter, setFilter] = useState<Filter>("active");
  const [creating, setCreating] = useState(false);
  const goals = state.goals.filter((g) => goalStatus(state, g) === filter);

  return (
    <div>
      <PageHeader eyebrow={t("nav.goals")} title={t("goals.title")} subtitle={t("goals.subtitle")} cat="curious">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented value={filter} onChange={setFilter} options={[{ value: "active", label: t("filter.active") }, { value: "completed", label: t("filter.completed") }, { value: "archived", label: t("filter.archived") }]} />
          <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {t("goals.new")}</button>
        </div>
      </PageHeader>

      {creating && <GoalForm onDone={() => setCreating(false)} />}

      <div className="mt-4 space-y-4">
        {goals.length === 0 && !creating && (
          <EmptyState cat="curious" title={t(`goals.empty.${filter}`)} body={t("goals.emptyBody")} />
        )}
        {goals.map((g) => <GoalCard key={g.id} goal={g} />)}
      </div>
    </div>
  );
}

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const t = useT();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [domainId, setDomainId] = useState<string>(goal?.domainId ?? "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    saveGoal({ ...(goal ? { id: goal.id } : {}), title: title.trim(), description, domainId: domainId || null, targetDate: targetDate || null });
    onDone();
  };
  return (
    <form onSubmit={submit} className="surface space-y-3 p-5">
      <input className="field" placeholder={t("goals.titlePh")} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <textarea className="field" rows={2} placeholder={t("goals.whyPh")} value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <select className="field" value={domainId} onChange={(e) => setDomainId(e.target.value)} aria-label={t("goals.domain")}>
          <option value="">{t("goals.noDomain")}</option>
          {DOMAINS.map((d) => <option key={d.id} value={d.id}>{domainName(d.id, t)}</option>)}
        </select>
        <input className="field" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} aria-label={t("goals.targetDate")} />
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" type="submit">{goal ? t("common.save") : t("goals.create")}</button>
        <button className="btn btn-ghost" type="button" onClick={onDone}>{t("common.cancel")}</button>
      </div>
    </form>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const state = useAppState();
  const today = useToday();
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const progress = goalProgress(state, goal);
  const status = goalStatus(state, goal);
  const projects = projectsOf(state, goal.id);
  const archived = goal.status === "archived";

  if (editing) return <GoalForm goal={goal} onDone={() => setEditing(false)} />;

  return (
    <article id={goal.id} className="surface p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="min-w-0">
          <h2 className="text-h2">{goal.title}</h2>
          <p className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {isDomainId(goal.domainId) && <span className="chip chip-flat">{domainName(goal.domainId, t)}</span>}
            {goal.targetDate && (
              <span className={`chip ${isOverdue(goal.targetDate, status === "completed", today) ? "chip-warn" : "chip-flat"}`}>
                {isOverdue(goal.targetDate, status === "completed", today) ? t("goals.overdue") : t("goals.target")}{formatShort(goal.targetDate)}
              </span>
            )}
            {status === "completed" && <span className="chip chip-up">{t("status.completed")}</span>}
          </p>
          {goal.description && <p className="mt-2 text-sm text-muted-foreground">{goal.description}</p>}
        </div>
        <div className="flex gap-1">
          <button className="btn btn-ghost !p-2" aria-label={t("goals.edit")} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></button>
          <button className="btn btn-ghost !p-2" aria-label={archived ? t("goals.restore") : t("goals.archive")} onClick={() => saveGoal({ ...goal, status: archived ? "active" : "archived" })}>
            {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        {progress === null ? <p className="text-sm text-muted-foreground">{projects.length ? t("goals.noMilestones") : t("goals.noProjects")}</p> : <Bar value={progress} />}
        {progress !== null && <span className="font-display text-lg font-semibold">{progress}%</span>}
      </div>

      <div className="mt-5 space-y-3">
        {projects.map((p) => <ProjectBlock key={p.id} project={p} />)}
        {adding ? (
          <ProjectForm goalId={goal.id} onDone={() => setAdding(false)} />
        ) : (
          !archived && <button className="btn btn-soft" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> {t("goals.addProject")}</button>
        )}
      </div>
    </article>
  );
}

function ProjectForm({ goalId, project, onDone }: { goalId: string; project?: Project; onDone: () => void }) {
  const t = useT();
  const [title, setTitle] = useState(project?.title ?? "");
  const [targetDate, setTargetDate] = useState(project?.targetDate ?? "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    saveProject({ ...(project ? { id: project.id } : {}), goalId, title: title.trim(), targetDate: targetDate || null });
    onDone();
  };
  return (
    <form onSubmit={submit} className="grid gap-2 rounded-md bg-background p-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
      <input className="field" placeholder={t("proj.titlePh")} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <input className="field" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} aria-label={t("proj.deadline")} />
      <div className="flex gap-1">
        <button className="btn btn-primary" type="submit">{t("common.save")}</button>
        <button className="btn btn-ghost" type="button" onClick={onDone}>{t("common.cancel")}</button>
      </div>
    </form>
  );
}


function ProjectBlock({ project }: { project: Project }) {
  const state = useAppState();
  const today = useToday();
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [msTitle, setMsTitle] = useState("");
  const [msDate, setMsDate] = useState("");
  const [editingMs, setEditingMs] = useState<string | null>(null);
  const progress = projectProgress(state, project);
  const status = projectStatus(state, project);
  const ms = milestonesOf(state, project.id);
  const archived = project.status === "archived";

  if (editing) return <ProjectForm goalId={project.goalId} project={project} onDone={() => setEditing(false)} />;

  const addMs = (e: FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim()) return;
    saveMilestone({ projectId: project.id, title: msTitle.trim(), dueDate: msDate || null });
    setMsTitle("");
    setMsDate("");
  };

  return (
    <div className={`rounded-md border bg-background p-4 ${archived ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 truncate">{project.title}</h3>
          <p className="text-xs text-muted-foreground">
            {t(`status.${status}`)}
            {project.targetDate && t("proj.due", { d: formatShort(project.targetDate) })}
            {isOverdue(project.targetDate, status === "completed", today) && ` · ${t("common.overdue")}`}
            {" · "}{progress === null ? t("proj.noMs") : `${progress}%`}
          </p>
        </div>
        <div className="flex gap-1">
          <button className="btn btn-ghost !p-1.5" aria-label={t("proj.edit")} onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></button>
          <button className="btn btn-ghost !p-1.5" aria-label={archived ? t("proj.restore") : t("proj.archive")} onClick={() => saveProject({ ...project, status: archived ? "not_started" : "archived" })}>
            {archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {progress !== null && <div className="mt-2"><Bar value={progress} /></div>}
      <ul className="mt-3 space-y-1">
        {ms.map((m) => {
          const done = m.status === "completed";
          const overdue = isOverdue(m.dueDate, done, today);
          if (editingMs === m.id) return <MilestoneEdit key={m.id} m={m} onDone={() => setEditingMs(null)} />;
          return (
            <li key={m.id} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm px-1 py-1 hover:bg-cream">
              <button
                role="checkbox"
                aria-checked={done}
                aria-label={t("ms.complete", { t: m.title })}
                onClick={() => toggleMilestone(m.id)}
                className={`grid h-5 w-5 place-items-center rounded-sm border ${done ? "border-sage bg-sage text-cream" : "border-muted bg-cream"}`}
              >
                {done && <Check className="h-3.5 w-3.5" />}
              </button>
              <span className={`truncate text-sm ${done ? "text-muted-foreground line-through" : ""}`}>{m.title}</span>
              <span className="flex items-center gap-2 text-xs">
                {m.dueDate && <span className={overdue ? "chip chip-warn" : "text-muted-foreground"}>{overdue ? t("goals.overdue") : ""}{formatShort(m.dueDate)}</span>}
                <button
                  className="text-muted-foreground transition-opacity hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                  aria-label={t("ms.edit", { t: m.title })}
                  onClick={() => setEditingMs(m.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="text-muted-foreground transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                  aria-label={t("ms.delete", { t: m.title })}
                  onClick={() => window.confirm(t("ms.confirmDelete", { t: m.title })) && deleteMilestone(m.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {!archived && (
        <form onSubmit={addMs} className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
          <input className="field col-span-2 !py-1.5 text-sm sm:col-span-1" placeholder={t("ms.add")} value={msTitle} onChange={(e) => setMsTitle(e.target.value)} />
          <input className="field !py-1.5 text-sm" type="date" value={msDate} onChange={(e) => setMsDate(e.target.value)} aria-label={t("ms.due")} />
          <button className="btn btn-soft !py-1.5" type="submit" aria-label={t("ms.add")}><Plus className="h-4 w-4" /></button>
        </form>
      )}
    </div>
  );
}

function MilestoneEdit({ m, onDone }: { m: Milestone; onDone: () => void }) {
  const t = useT();
  const [title, setTitle] = useState(m.title);
  const [due, setDue] = useState(m.dueDate ?? "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    saveMilestone({ id: m.id, projectId: m.projectId, title: title.trim(), dueDate: due || null });
    onDone();
  };
  return (
    <li>
      <form onSubmit={submit} className="grid grid-cols-2 gap-2 py-1 sm:grid-cols-[minmax(0,1fr)_150px_auto_auto]">
        <input className="field col-span-2 !py-1.5 text-sm sm:col-span-1" value={title} onChange={(e) => setTitle(e.target.value)} aria-label={t("ms.title")} autoFocus />
        <input className="field col-span-2 !py-1.5 text-sm sm:col-span-1" type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label={t("ms.due")} />
        <button className="btn btn-primary !py-1.5" type="submit">{t("common.save")}</button>
        <button className="btn btn-ghost !py-1.5" type="button" onClick={onDone}>{t("common.cancel")}</button>
      </form>
    </li>
  );
}
