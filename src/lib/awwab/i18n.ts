// Centralized translations. Language is a presentation layer only — it never touches data.
import { useMemo, useSyncExternalStore } from "react";
import { SYSTEM_DEFAULTS, type Activity, type DomainId } from "./config";

export type Lang = "id" | "en";
export type Params = Record<string, string | number>;
export type T = (key: string, p?: Params) => string;

const en = {
  "nav.routines": "Routines", "type.routine": "Routine",
  "rt.f.dayDetails": "Details by day", "rt.f.dayTitle": "Day heading", "rt.f.dayDescription": "Day details", "rt.f.generalDescription": "General details", "rt.f.dayTitlePlaceholder": "Push day / Meal menu / Classes", "rt.f.dayDescriptionPlaceholder": "Exercises, dishes, subjects…", "rt.f.plannerOptional": "Include when adding to Planner",
  "rt.eyebrow": "Routines", "rt.title": "Your normal week", "rt.subtitle": "What does your life usually look like? Routines are structure, not scores — track what really happens in Daily.",
  "rt.add": "New routine", "rt.edit": "Edit routine", "rt.save": "Save routine", "rt.library": "Routine Library", "rt.week": "Weekly overview", "rt.today": "Today's Schedule",
  "rt.noToday": "No routines today.", "rt.noTodayBody": "A free day — or a routine to add.", "rt.empty": "No routines yet.", "rt.emptyBody": "Add the things that repeat in your life: classes, gym, meetings, meals.",
  "rt.search": "Search routines", "rt.all": "All", "rt.conflicts": "Overlapping times", "rt.conflictsBody": "These routines overlap this week. Just so you know — nothing is changed.",
  "rt.free": "{h} scheduled", "rt.f.title": "Routine name", "rt.f.type": "Type", "rt.f.freq": "Repeats", "rt.f.days": "Days", "rt.f.every": "Every … weeks", "rt.f.dom": "Day of month",
  "rt.f.startDate": "Starts", "rt.f.endDate": "Ends (optional)", "rt.f.location": "Location", "rt.f.planner": "Show in Planner", "rt.f.calendar": "Show in Calendar",
  "rt.f.weekdays": "Weekdays", "rt.f.weekend": "Weekend", "rt.f.needDays": "Pick at least one day.",
  "rt.freq.DAILY": "Every day", "rt.freq.WEEKLY": "Weekly", "rt.freq.MONTHLY": "Monthly", "rt.freq.CUSTOM": "Custom days", "rt.freq.ONCE": "Once",
  "rt.type.EVENT": "Event", "rt.type.HABIT": "Habit", "rt.type.SCHEDULE": "Schedule", "rt.type.MEAL": "Meal", "rt.type.STUDY": "Study", "rt.type.RESPONSIBILITY": "Responsibility", "rt.type.OTHER": "Other",
  "rt.st.ACTIVE": "Active", "rt.st.PAUSED": "Paused", "rt.st.ARCHIVED": "Archived",
  "rt.pause": "Pause", "rt.resume": "Resume", "rt.archive": "Archive", "rt.delete": "Delete", "rt.confirmDelete": "Delete this routine for good? Planner items already created stay.",
  "rt.skip": "Skip this time", "rt.reschedule": "Reschedule", "rt.cancelOcc": "Cancel", "rt.restore": "Restore", "rt.skipped": "Skipped", "rt.cancelled": "Cancelled", "rt.moved": "Moved from {d}",
  "rt.newDate": "New date", "rt.applyTo": "Apply this change to?", "rt.scope.one": "This occurrence only", "rt.scope.future": "This and future", "rt.scope.all": "Entire routine",
  "rt.toPlanner": "Add this week to Planner", "rt.addedPlanner": "{n} added to Planner", "rt.nothingNew": "Already in Planner", "rt.fromRoutine": "From routine",
  "rt.daily": "Every day", "rt.monthlyOn": "Monthly on day {d}", "rt.everyN": "Every {n} weeks", "rt.once": "Once on {d}",
  "rt.note": "Routines never record activity or change your Life Score.", "rt.open": "Open in Routines", "rt.routinesWeek": "Add routines to this week",
  "nav.planner": "Planner",
  "pl.eyebrow": "Planner", "pl.title": "This week", "pl.subtitle": "What are you going to do? Plans are intentions — track what actually happens in Daily.",
  "pl.add": "Add something", "pl.addInbox": "Add to Inbox", "pl.inbox": "Inbox", "pl.inboxWaiting": "{n} waiting to be planned",
  "pl.today": "Today's Plan", "pl.prevWeek": "Previous week", "pl.nextWeek": "Next week", "pl.thisWeek": "This week", "pl.planWeek": "Plan Your Week",
  "pl.type.EVENT": "Event", "pl.type.TASK": "Task", "pl.type.PLAN": "Plan", "pl.type.NOTE": "Note",
  "pl.cat.ACADEMIC": "Academic", "pl.cat.ORGANIZATION": "Organization", "pl.cat.CAREER": "Career", "pl.cat.HEALTH": "Health", "pl.cat.FINANCE": "Finance",
  "pl.cat.PERSONAL": "Personal", "pl.cat.SOCIAL": "Social", "pl.cat.LIFE_MANAGEMENT": "Life Management",
  "pl.st.PLANNED": "Planned", "pl.st.COMPLETED": "Completed", "pl.st.CANCELLED": "Cancelled",
  "pl.trackNow": "Track now", "pl.noToday": "No plans today.", "pl.noTodayBody": "Add one small thing you want to do.",
  "pl.noWeek": "This week is still empty.", "pl.noWeekBody": "Start with the one thing that matters most.",
  "pl.noInbox": "Your inbox is empty.", "pl.noInboxBody": "Nice. Everything has a place.", "pl.emptyDay": "Nothing planned",
  "pl.pvr": "Plan vs Reality", "pl.pvr.planned": "Planned", "pl.pvr.completed": "Completed", "pl.pvr.cancelled": "Cancelled", "pl.pvr.unfinished": "Unfinished", "pl.pvr.upcoming": "Still ahead",
  "pl.pvr.note": "Feedback only — plans never change your Life Score.", "pl.pvr.none": "Not enough data to see a pattern yet.",
  "pl.pvr.q1": "What got in the way?", "pl.pvr.q2": "What should I plan differently?",
  "pl.f.what": "What are you planning?", "pl.f.type": "Type", "pl.f.category": "Category", "pl.f.date": "Date", "pl.f.noDate": "No date (Inbox)",
  "pl.f.start": "Start time", "pl.f.end": "End time", "pl.f.desc": "Description", "pl.f.more": "More options", "pl.f.less": "Fewer options",
  "pl.f.activity": "Link to activity", "pl.f.goal": "Link to goal", "pl.f.project": "Link to project", "pl.f.milestone": "Link to milestone", "pl.f.none": "None",
  "pl.save": "Save plan", "pl.edit": "Edit", "pl.delete": "Delete", "pl.schedule": "Schedule this item", "pl.moveTo": "Move to date",
  "pl.markDone": "Mark completed", "pl.markPlanned": "Mark planned", "pl.cancelItem": "Cancel item", "pl.newTitle": "Add something", "pl.editTitle": "Edit item",
  "pl.important": "Important this week", "pl.goals": "Your active goals", "pl.addToWeek": "Add to this week", "pl.pickDay": "Pick a day",
  "pl.linked": "Linked: {x}", "pl.trackHint": "Completing a plan doesn't record the activity. Use Track now to log what really happened.",
  // navigation
  "nav.more": "More", "nav.mobile": "Main navigation",
  "nav.home": "Home", "nav.daily": "Daily", "nav.weekly": "Weekly", "nav.monthly": "Monthly", "nav.insights": "Insights",
  "nav.goals": "Goals", "nav.review": "Review", "nav.calendar": "Calendar", "nav.settings": "Settings",
  "app.tagline": "simple to use, deep underneath",
  "op.morning": "Good morning", "op.afternoon": "Good afternoon", "op.evening": "Good evening",
  "op.quran": "Qur'an", "op.hadith": "Hadith", "op.reflection": "AWWAB Reflection", "op.summary": "Meaning summary",
  "op.trEn": "Translation: Saheeh International", "op.trId": "Translation: Kemenag RI", "op.start": "Start my day", "op.openSource": "Open source",
  "op.fbTitle": "Welcome back.", "op.fbBody": "Take a breath. Begin where you are.", "common.loading": "Loading",
  // common
  "common.save": "Save", "common.cancel": "Cancel", "common.close": "Close", "common.saved": "Saved.", "common.prev": "Previous", "common.next": "Next",
  "common.notEnough": "Not enough data.", "common.notEnoughShort": "Not enough data", "common.overdue": "Overdue", "common.and": "and", "common.pts": "{n} pts",
  "cat.alt": "Cat illustration",
  // domains
  "domain.academic": "Academic", "domain.health": "Health & Fitness", "domain.finance": "Finance", "domain.career": "Career",
  "domain.personal": "Personal Development", "domain.social": "Social & Relationships", "domain.life": "Life Management",
  // activities
  "act.study_session": "Study Session", "act.deep_work": "Deep Work", "act.task_completion": "Task Completion", "act.gym": "Gym",
  "act.daily_steps": "Daily Steps", "act.protein": "Protein Intake", "act.fruit_veg": "Fruit & Vegetable", "act.expense_tracking": "Expense Tracking",
  "act.skill_dev": "Skill Development", "act.competition": "Competition", "act.project_completion": "Project Completion",
  "act.professional_event": "Professional Event", "act.networking": "Networking", "act.reading": "Reading", "act.journaling": "Journaling",
  "act.family_time": "Quality Time with Family", "act.helping_others": "Helping Others", "act.friendship_followup": "Friendship Follow-up",
  "act.relationship_followup": "Relationship Follow-up", "act.laundry": "Laundry", "act.meal_planning": "Weekly Meal Planning",
  // targets
  "target.study_session": "5× / week", "target.deep_work": "600 min / week", "target.task_completion": "100% on-time", "target.gym": "3× / week",
  "target.daily_steps": "6,000 / day", "target.protein": "120 g / day", "target.fruit_veg": "Every day", "target.expense_tracking": "100% recorded",
  "target.skill_dev": "30 min / day", "target.competition": "2× / month", "target.project_completion": "1 / month", "target.professional_event": "1× / month",
  "target.networking": "5 / week", "target.reading": "Every day", "target.journaling": "Every day", "target.family_time": "2× / month",
  "target.helping_others": "3 / week", "target.friendship_followup": "2× / month", "target.relationship_followup": "2× / month",
  "target.laundry": "1× / week", "target.meal_planning": "1× / week", "target.everyDay": "every day",
  "per.day": "day", "per.week": "week", "per.month": "month",
  "unit.min": "min", "unit.steps": "steps", "unit.g": "g", "unit.sessions": "sessions", "unit.times": "times", "unit.pages": "pages", "unit.projects": "projects",
  "unit.events": "events", "unit.connections": "connections", "unit.acts": "acts", "unit.day": "days",
  // periods
  "period.this.week": "this week", "period.this.month": "this month", "period.last.week": "last week", "period.last.month": "last month",
  "period.prev.week": "previous week", "period.prev.month": "previous month",
  "period.title.week": "This week", "period.title.month": "This month", "period.soFar": "{label} · only days so far are counted",
  "period.sub.week": "Monday-to-Sunday performance", "period.sub.month": "Calendar-month performance",
  "seg.week": "This Week", "seg.month": "This Month", "week.n": "Week {n}",
  "sec.domainsActs": "Domains & activities", "sec.domainsHint": "Tap a domain to see how each activity contributes.",
  // life score / performance
  "life.label": "Life Score", "life.noneBody": "Keep tracking your daily actions. Once there's enough data, your Life Score will appear here.",
  "life.vs": "vs {prev}", "life.noPrev": "Not enough previous data.", "life.basedOn": "Based on {n} of {total} activities with data.",
  "life.noData": "No data yet", "life.notComparable": "Not enough data to compare yet.", "life.building": "Your score is building. Keep tracking to make the picture clearer.", "life.coverage": "Data coverage: {n}%",
  "progress.title": "Life Score Progress", "progress.empty": "No progress to display yet.", "progress.vs7": "{n} from 7 days ago", "progress.noCompare": "No comparison yet",
  "progress.noNew": "No new data", "progress.range7": "7 days", "progress.range30": "30 days", "progress.range90": "90 days", "progress.current": "Current Life Score",
  "trend.improving": "Improving", "trend.declining": "Declining", "trend.stable": "Stable", "trend.none": "Not enough data to show a meaningful trend.",
  "detail.noData": "No data", "detail.daysRecorded": "{a} of {b} days done", "detail.daysOnTarget": "{a} of {b} days on target", "detail.target": "target {t}",
  "detail.weight": "weight",
  "hl.strongest": "Strongest area", "hl.attention": "Needs attention", "hl.improve": "Biggest improvement", "hl.decline": "Biggest decline",
  "hl.noImprove": "No major improvement yet", "hl.noDecline": "No major decline",
  // insights
  "ins.primary": "Primary", "ins.show": "Show evidence", "ins.hide": "Hide evidence",
  "ins.none.title": "Not enough data yet", "ins.none.desc": "Track a few activities {period} and AWWAB will start explaining what's happening.",
  "ins.domainDown": "{domain} declined {n} points {period}.", "ins.domainUp": "{domain} improved {n} points {period}.",
  "ins.contrib.one": "{names} was the largest contributor.", "ins.contrib.many": "{names} were the largest contributors.",
  "ins.compared": "Compared with {prev}.",
  "ins.weakest": "{domain} is your lowest area {period} at {n}.", "ins.weakest.desc": "{act} ({p}) carries the largest weighted gap in this area.",
  "ins.weakest.descNone": "Its tracked activities sit below the others.",
  "ins.recWeak": "{act} has remained below target for three consecutive {units}.", "ins.recStrong": "{act} has remained consistently on target for three {units}.",
  "ins.units.week": "weeks", "ins.units.month": "months", "ins.targetDesc": "Target: {target}.",
  "ins.ev.current": "Current: {p}", "ins.ev.ago1.week": "Last week: {p}", "ins.ev.ago2.week": "2 weeks ago: {p}",
  "ins.ev.ago1.month": "Last month: {p}", "ins.ev.ago2.month": "2 months ago: {p}",
  "ins.actDown": "{act} consistency dropped from {a} to {b}.", "ins.actUp": "{act} consistency rose from {a} to {b}.",
  "ins.strongest": "{domain} is your strongest area {period} at {n}.", "ins.strongest.desc": "Based on the activities you've recorded.",
  "ins.title": "Why things look this way", "ins.subtitle": "What happened, and which behaviours were associated with it. Every line traces back to your data.",
  // daily
  "daily.today": "Today", "daily.future": "This day hasn't happened yet. Entries here won't count until it does.",
  "daily.hint": "{n} of {total} recorded · tap once for done, twice for not done, three times to clear.",
  "check.done": "Done", "check.notDone": "Not done", "check.none": "No data", "daily.inUnit": "{act} in {unit}",
  "daily.empty": "No active habits. Add some in Settings.",
  // home
  "greet.morning": "Good morning", "greet.afternoon": "Good afternoon", "greet.evening": "Good evening", "greet.night": "Good night",
  "home.start": "Start tracking today. One to three minutes is enough.", "home.openTracker": "Open today's tracker", "home.domains": "Domains",
  "home.happening": "What's happening?", "home.allInsights": "All insights →", "home.monthTrend": "This month, week by week",
  "home.nextFocus": "Next focus", "home.chosenFocus": "Your chosen focus", "home.due": "Due {d}", "home.nothing": "Nothing scheduled.", "home.setGoal": "Set a goal",
  "type.goal": "Goal", "type.project": "Project", "type.milestone": "Milestone",
  // goals
  "goals.title": "Where you're heading", "goals.subtitle": "Goal progress comes from projects and milestones — it's separate from your Life Score.",
  "filter.active": "Active", "filter.completed": "Completed", "filter.archived": "Archived", "goals.new": "New goal",
  "goals.empty.active": "No active goals yet", "goals.empty.completed": "No completed goals", "goals.empty.archived": "No archived goals",
  "goals.emptyBody": "Goals hold projects, and projects hold milestones. Start with one thing that matters.",
  "goals.titlePh": "Goal title, e.g. Build portfolio", "goals.whyPh": "Why it matters (optional)", "goals.domain": "Domain", "goals.noDomain": "No domain",
  "goals.targetDate": "Target date", "goals.create": "Create goal", "goals.overdue": "Overdue · ", "goals.target": "Target ",
  "goals.edit": "Edit goal", "goals.archive": "Archive goal", "goals.restore": "Restore goal", "goals.noMilestones": "No milestones yet.",
  "goals.noProjects": "No projects yet.", "goals.addProject": "Add project",
  "proj.titlePh": "Project title", "proj.deadline": "Project deadline", "proj.due": " · due {d}", "proj.noMs": "No milestones yet",
  "proj.edit": "Edit project", "proj.archive": "Archive project", "proj.restore": "Restore project",
  "status.not_started": "Not started", "status.in_progress": "In progress", "status.completed": "Completed", "status.archived": "Archived",
  "status.pending": "Pending", "status.active": "Active",
  "ms.complete": "Complete {t}", "ms.edit": "Edit {t}", "ms.delete": "Delete {t}", "ms.confirmDelete": "Delete milestone \"{t}\"? This can't be undone.",
  "ms.add": "Add milestone", "ms.due": "Milestone due date", "ms.title": "Milestone title",
  // review
  "review.eyebrow": "Monthly Review", "review.subtitle": "Look back, understand, reflect, look forward.", "review.prevMonth": "Previous month",
  "review.noCompare": "No comparison", "review.strongest": "Strongest", "review.wentWell": "What went well", "review.strongestArea": "Strongest area:",
  "review.improved": "{d} improved +{n} pts", "review.completedProject": "Completed project:", "review.msCompleted": "{n} milestone(s) completed",
  "review.nothing": "Nothing recorded yet for this month.", "review.declined": "{d} declined {n} pts", "review.lowest": "Lowest area:",
  "review.overdueMs": "Overdue milestone: {t} ({d})", "review.dueSoon": "{t} is due {d}", "review.nothingFlagged": "Nothing flagged.",
  "review.goals": "Goals", "review.noGoals": "No goals yet.", "col.goal": "Goal", "col.prev": "Previous", "col.cur": "Current", "col.nextMs": "Next milestone",
  "review.reflection": "Reflection", "review.q.wentWell": "What went well?", "review.q.difficult": "What was difficult?",
  "review.q.change": "What should I change next month?", "review.q.stop": "What should I stop doing?", "review.q.continue": "What should I continue doing?",
  "review.focus": "My one focus for next month", "review.focusPh": "e.g. Academic, or Finish AWWAB MVP", "review.update": "Update review",
  "review.save": "Save review", "review.past": "Past reviews",
  // calendar
  "cal.subtitle": "Important dates from your goals, projects, milestones and planner.", "cal.in": " · in {p}", "cal.open": "Open in Goals",
  "cal.openPlanner": "Open in Planner", "type.planner": "Planner",
  "cal.upcoming": "Upcoming", "cal.nothing": "Nothing upcoming. Add dates to goals, projects or milestones to see them here.",
  "wd.0": "Mon", "wd.1": "Tue", "wd.2": "Wed", "wd.3": "Thu", "wd.4": "Fri", "wd.5": "Sat", "wd.6": "Sun",
  // settings / habits
  "settings.subtitle": "Language and the habits you track.", "settings.language": "Language",
  "settings.langHint": "Only the interface changes. Your data stays the same.",
  "habits.title": "Activities & Habits", "habits.add": "Add Habit", "habits.edit": "Edit Habit", "habits.archive": "Archive Habit", "habits.archiveShort": "Archive",
  "habits.delete": "Delete", "habits.reactivate": "Reactivate", "habits.name": "Habit Name", "habits.inputType": "Input Type",
  "input.checklist": "Checklist", "input.quantitative": "Quantitative", "habits.target": "Target", "habits.unit": "Unit", "habits.unitPh": "e.g. ml, min, pages",
  "habits.frequency": "Frequency", "freq.day": "Daily", "freq.week": "Weekly", "freq.month": "Monthly", "habits.weight": "Weight (%)",
  "habits.save": "Save Habit", "habits.active": "Active habits", "habits.archived": "Archived", "habits.archivedOn": "Archived {d}",
  "habits.noArchived": "No archived habits.", "habits.weightWarn": "Activity weights in {domain} total {n}%, not 100%.",
  "habits.rebalance": "Rebalance to 100%",
  "habits.historyWarn": "This habit has recorded history. Archive keeps it; Delete removes the habit for good.",
  "habits.confirmDelete": "Delete this habit permanently?", "habits.err.name": "Enter a habit name.",
  "habits.err.target": "Target must be a number above 0.", "habits.err.weight": "Weight must be between 0 and 100.",
  "habits.err.dup": "A habit with this name already exists in this domain.",
  "habits.historyNote": "Changes apply from today. Past periods keep their old settings.", "habits.custom": "Custom",
  "habits.checkHint": "With a daily target of 1, ticking the box means you did it that day. Set a higher target to count amounts (e.g. pages).",
  "auth.title": "Your account", "auth.sub": "Sign in so your progress is saved and available on any device.",
  "auth.login": "Log in", "auth.signup": "Sign up", "auth.logout": "Log out", "auth.email": "Email", "auth.password": "Password",
  "auth.google": "Continue with Google", "auth.or": "or", "auth.toSignup": "No account yet? Sign up", "auth.toLogin": "Already have an account? Log in",
  "auth.checkEmail": "Check your email to confirm your account, then log in.", "auth.signedInAs": "Signed in as {e}",
  "auth.synced": "Your progress is saved to your account.", "auth.guest": "You're not signed in. Progress is only saved on this device.",
  "auth.pwShort": "Password must be at least 6 characters.", "auth.busy": "Please wait…",
  "auth.welcome": "Build your personal life system.", "auth.welcomeSub": "Track what you do.\nUnderstand your progress.\nImprove your life, one step at a time.",
  "auth.withEmail": "Continue with Email", "auth.name": "Name", "auth.confirm": "Confirm password", "auth.pwMismatch": "Passwords don't match.",
  "auth.forgot": "Forgot password?", "auth.sendReset": "Send reset link", "auth.resetSent": "If that email has an account, a reset link is on its way.",
  "auth.resend": "Resend verification email", "auth.resent": "Verification email sent again.", "auth.back": "Back",
  "auth.err.invalid": "Email or password is incorrect.", "auth.err.unconfirmed": "Please confirm your email first. Check your inbox.",
  "auth.err.exists": "An account with this email already exists. Try logging in.", "auth.err.network": "Can't reach the server. Check your connection.",
  "auth.err.weak": "Choose a stronger password (at least 8 characters, not a common one).", "auth.err.email": "Please enter a valid email address.",
  "auth.err.generic": "Something went wrong. Please try again.",
  "auth.newPw": "New password", "auth.setPw": "Save new password", "auth.pwSaved": "Password updated.", "auth.resetTitle": "Set a new password",
  "auth.resetInvalid": "This reset link is invalid or expired. Request a new one.", "auth.changePw": "Change password", "auth.currentPw": "Current password",
  "auth.profile": "Profile", "auth.saveName": "Save", "auth.security": "Security", "auth.saved": "Saved.",
  "sync.offline": "Offline — changes will sync when you're back online.", "sync.synced": "Synced", "sync.syncing": "Syncing…", "sync.pending": "Not synced yet — will retry.",
  "mig.title": "AWWAB data was found on this device.", "mig.body": "Continue to save your existing data to your account and access it across devices.",
  "mig.import": "Import Data", "mig.fresh": "Start Fresh", "mig.working": "Moving your data…", "mig.done": "Your data has been successfully migrated.",
  "mig.error": "Migration failed. Your data is still on this device — please try again.", "mig.ok": "OK",
};

type Key = keyof typeof en;

const id: Record<Key, string> = {
  "nav.routines": "Rutinitas", "type.routine": "Rutinitas",
  "rt.f.dayDetails": "Rincian per hari", "rt.f.dayTitle": "Judul hari", "rt.f.dayDescription": "Keterangan hari", "rt.f.generalDescription": "Keterangan umum", "rt.f.dayTitlePlaceholder": "Push day / Menu makan / Kuliah", "rt.f.dayDescriptionPlaceholder": "Daftar latihan, menu, mata kuliah…", "rt.f.plannerOptional": "Sertakan saat ditambahkan ke Planner",
  "rt.eyebrow": "Rutinitas", "rt.title": "Minggu normalmu", "rt.subtitle": "Seperti apa hidupmu biasanya? Rutinitas adalah struktur, bukan skor — catat yang benar-benar terjadi di Harian.",
  "rt.add": "Rutinitas baru", "rt.edit": "Ubah rutinitas", "rt.save": "Simpan rutinitas", "rt.library": "Pustaka Rutinitas", "rt.week": "Ringkasan mingguan", "rt.today": "Jadwal Hari Ini",
  "rt.noToday": "Tidak ada rutinitas hari ini.", "rt.noTodayBody": "Hari yang lapang — atau ada rutinitas yang bisa ditambahkan.", "rt.empty": "Belum ada rutinitas.", "rt.emptyBody": "Tambahkan hal yang berulang dalam hidupmu: kuliah, gym, rapat, jadwal makan.",
  "rt.search": "Cari rutinitas", "rt.all": "Semua", "rt.conflicts": "Waktu bertabrakan", "rt.conflictsBody": "Rutinitas ini bertabrakan minggu ini. Sekadar info — tidak ada yang diubah.",
  "rt.free": "{h} terjadwal", "rt.f.title": "Nama rutinitas", "rt.f.type": "Jenis", "rt.f.freq": "Berulang", "rt.f.days": "Hari", "rt.f.every": "Setiap … minggu", "rt.f.dom": "Tanggal",
  "rt.f.startDate": "Mulai", "rt.f.endDate": "Berakhir (opsional)", "rt.f.location": "Lokasi", "rt.f.planner": "Tampilkan di Planner", "rt.f.calendar": "Tampilkan di Kalender",
  "rt.f.weekdays": "Hari kerja", "rt.f.weekend": "Akhir pekan", "rt.f.needDays": "Pilih minimal satu hari.",
  "rt.freq.DAILY": "Setiap hari", "rt.freq.WEEKLY": "Mingguan", "rt.freq.MONTHLY": "Bulanan", "rt.freq.CUSTOM": "Hari tertentu", "rt.freq.ONCE": "Sekali",
  "rt.type.EVENT": "Acara", "rt.type.HABIT": "Kebiasaan", "rt.type.SCHEDULE": "Jadwal", "rt.type.MEAL": "Makan", "rt.type.STUDY": "Belajar", "rt.type.RESPONSIBILITY": "Tanggung jawab", "rt.type.OTHER": "Lainnya",
  "rt.st.ACTIVE": "Aktif", "rt.st.PAUSED": "Dijeda", "rt.st.ARCHIVED": "Diarsipkan",
  "rt.pause": "Jeda", "rt.resume": "Lanjutkan", "rt.archive": "Arsipkan", "rt.delete": "Hapus", "rt.confirmDelete": "Hapus rutinitas ini selamanya? Item Planner yang sudah dibuat tetap ada.",
  "rt.skip": "Lewati kali ini", "rt.reschedule": "Jadwalkan ulang", "rt.cancelOcc": "Batalkan", "rt.restore": "Pulihkan", "rt.skipped": "Dilewati", "rt.cancelled": "Dibatalkan", "rt.moved": "Dipindah dari {d}",
  "rt.newDate": "Tanggal baru", "rt.applyTo": "Terapkan perubahan ke?", "rt.scope.one": "Hanya kali ini", "rt.scope.future": "Ini dan seterusnya", "rt.scope.all": "Seluruh rutinitas",
  "rt.toPlanner": "Tambahkan minggu ini ke Planner", "rt.addedPlanner": "{n} ditambahkan ke Planner", "rt.nothingNew": "Sudah ada di Planner", "rt.fromRoutine": "Dari rutinitas",
  "rt.daily": "Setiap hari", "rt.monthlyOn": "Setiap bulan tanggal {d}", "rt.everyN": "Setiap {n} minggu", "rt.once": "Sekali pada {d}",
  "rt.note": "Rutinitas tidak pernah mencatat aktivitas atau mengubah Life Score.", "rt.open": "Buka di Rutinitas", "rt.routinesWeek": "Tambahkan rutinitas ke minggu ini",
  "nav.planner": "Planner",
  "pl.eyebrow": "Planner", "pl.title": "Minggu ini", "pl.subtitle": "Apa yang akan kamu lakukan? Rencana adalah niat — catat yang benar-benar terjadi di Daily.",
  "pl.add": "Tambah sesuatu", "pl.addInbox": "Tambah ke Inbox", "pl.inbox": "Inbox", "pl.inboxWaiting": "{n} menunggu dijadwalkan",
  "pl.today": "Rencana Hari Ini", "pl.prevWeek": "Minggu sebelumnya", "pl.nextWeek": "Minggu berikutnya", "pl.thisWeek": "Minggu ini", "pl.planWeek": "Rencanakan Minggumu",
  "pl.type.EVENT": "Acara", "pl.type.TASK": "Tugas", "pl.type.PLAN": "Rencana", "pl.type.NOTE": "Catatan",
  "pl.cat.ACADEMIC": "Akademik", "pl.cat.ORGANIZATION": "Organisasi", "pl.cat.CAREER": "Karier", "pl.cat.HEALTH": "Kesehatan", "pl.cat.FINANCE": "Keuangan",
  "pl.cat.PERSONAL": "Pribadi", "pl.cat.SOCIAL": "Sosial", "pl.cat.LIFE_MANAGEMENT": "Manajemen Hidup",
  "pl.st.PLANNED": "Direncanakan", "pl.st.COMPLETED": "Selesai", "pl.st.CANCELLED": "Dibatalkan",
  "pl.trackNow": "Catat sekarang", "pl.noToday": "Belum ada rencana hari ini.", "pl.noTodayBody": "Tambahkan satu hal kecil yang ingin kamu lakukan.",
  "pl.noWeek": "Minggu ini masih kosong.", "pl.noWeekBody": "Mulai dengan satu hal yang paling penting.",
  "pl.noInbox": "Inbox kamu kosong.", "pl.noInboxBody": "Bagus. Semua sudah punya tempat.", "pl.emptyDay": "Belum ada rencana",
  "pl.pvr": "Rencana vs Kenyataan", "pl.pvr.planned": "Direncanakan", "pl.pvr.completed": "Selesai", "pl.pvr.cancelled": "Dibatalkan", "pl.pvr.unfinished": "Belum selesai", "pl.pvr.upcoming": "Masih akan datang",
  "pl.pvr.note": "Hanya sebagai umpan balik — rencana tidak pernah mengubah Life Score.", "pl.pvr.none": "Belum cukup data untuk melihat pola.",
  "pl.pvr.q1": "Apa yang menghambat?", "pl.pvr.q2": "Apa yang perlu direncanakan berbeda?",
  "pl.f.what": "Apa yang kamu rencanakan?", "pl.f.type": "Jenis", "pl.f.category": "Kategori", "pl.f.date": "Tanggal", "pl.f.noDate": "Tanpa tanggal (Inbox)",
  "pl.f.start": "Jam mulai", "pl.f.end": "Jam selesai", "pl.f.desc": "Deskripsi", "pl.f.more": "Opsi lainnya", "pl.f.less": "Lebih sedikit opsi",
  "pl.f.activity": "Tautkan ke aktivitas", "pl.f.goal": "Tautkan ke tujuan", "pl.f.project": "Tautkan ke proyek", "pl.f.milestone": "Tautkan ke milestone", "pl.f.none": "Tidak ada",
  "pl.save": "Simpan rencana", "pl.edit": "Ubah", "pl.delete": "Hapus", "pl.schedule": "Jadwalkan", "pl.moveTo": "Pindahkan ke tanggal",
  "pl.markDone": "Tandai selesai", "pl.markPlanned": "Tandai direncanakan", "pl.cancelItem": "Batalkan", "pl.newTitle": "Tambah sesuatu", "pl.editTitle": "Ubah item",
  "pl.important": "Penting minggu ini", "pl.goals": "Tujuan aktifmu", "pl.addToWeek": "Tambahkan ke minggu ini", "pl.pickDay": "Pilih hari",
  "pl.linked": "Tertaut: {x}", "pl.trackHint": "Menyelesaikan rencana tidak mencatat aktivitas. Pakai Catat sekarang untuk mencatat yang benar-benar terjadi.",
  "nav.home": "Beranda", "nav.daily": "Harian", "nav.weekly": "Mingguan", "nav.monthly": "Bulanan", "nav.insights": "Wawasan",
  "nav.more": "Lainnya", "nav.mobile": "Navigasi utama",
  "nav.goals": "Tujuan", "nav.review": "Review", "nav.calendar": "Kalender", "nav.settings": "Pengaturan",
  "app.tagline": "sederhana dipakai, dalam di baliknya",
  "op.morning": "Selamat pagi", "op.afternoon": "Selamat siang", "op.evening": "Selamat malam",
  "op.quran": "Al-Qur'an", "op.hadith": "Hadis", "op.reflection": "Refleksi AWWAB", "op.summary": "Ringkasan makna",
  "op.trId": "Terjemahan: Kemenag RI", "op.trEn": "Terjemahan: Saheeh International", "op.start": "Mulai hari ini", "op.openSource": "Buka sumber",
  "op.fbTitle": "Selamat datang kembali.", "op.fbBody": "Tarik napas. Mulailah dari tempatmu sekarang.", "common.loading": "Memuat",
  "common.save": "Simpan", "common.cancel": "Batal", "common.close": "Tutup", "common.saved": "Tersimpan.", "common.prev": "Sebelumnya", "common.next": "Berikutnya",
  "common.notEnough": "Belum cukup data.", "common.notEnoughShort": "Belum cukup data", "common.overdue": "Terlambat", "common.and": "dan", "common.pts": "{n} poin",
  "cat.alt": "Ilustrasi kucing",
  "domain.academic": "Akademik", "domain.health": "Kesehatan & Kebugaran", "domain.finance": "Keuangan", "domain.career": "Karier",
  "domain.personal": "Pengembangan Diri", "domain.social": "Sosial & Hubungan", "domain.life": "Manajemen Kehidupan",
  "act.study_session": "Study Session", "act.deep_work": "Deep Work", "act.task_completion": "Penyelesaian Tugas", "act.gym": "Gym",
  "act.daily_steps": "Langkah Harian", "act.protein": "Asupan Protein", "act.fruit_veg": "Buah & Sayur", "act.expense_tracking": "Pencatatan Pengeluaran",
  "act.skill_dev": "Pengembangan Skill", "act.competition": "Kompetisi", "act.project_completion": "Penyelesaian Project",
  "act.professional_event": "Acara Profesional", "act.networking": "Networking", "act.reading": "Membaca", "act.journaling": "Journaling",
  "act.family_time": "Quality Time dengan Keluarga", "act.helping_others": "Membantu Orang Lain", "act.friendship_followup": "Follow-up Pertemanan",
  "act.relationship_followup": "Follow-up Relationship", "act.laundry": "Mencuci Pakaian", "act.meal_planning": "Perencanaan Makan Mingguan",
  "target.study_session": "5× / minggu", "target.deep_work": "600 menit / minggu", "target.task_completion": "100% tepat waktu", "target.gym": "3× / minggu",
  "target.daily_steps": "6.000 / hari", "target.protein": "120 g / hari", "target.fruit_veg": "Setiap hari", "target.expense_tracking": "100% tercatat",
  "target.skill_dev": "30 menit / hari", "target.competition": "2× / bulan", "target.project_completion": "1 / bulan", "target.professional_event": "1× / bulan",
  "target.networking": "5 / minggu", "target.reading": "Setiap hari", "target.journaling": "Setiap hari", "target.family_time": "2× / bulan",
  "target.helping_others": "3 / minggu", "target.friendship_followup": "2× / bulan", "target.relationship_followup": "2× / bulan",
  "target.laundry": "1× / minggu", "target.meal_planning": "1× / minggu", "target.everyDay": "setiap hari",
  "per.day": "hari", "per.week": "minggu", "per.month": "bulan",
  "unit.min": "menit", "unit.steps": "langkah", "unit.g": "g", "unit.sessions": "sesi", "unit.times": "kali", "unit.pages": "halaman", "unit.projects": "proyek",
  "unit.events": "acara", "unit.connections": "koneksi", "unit.acts": "aksi", "unit.day": "hari",
  "period.this.week": "minggu ini", "period.this.month": "bulan ini", "period.last.week": "minggu lalu", "period.last.month": "bulan lalu",
  "period.prev.week": "minggu sebelumnya", "period.prev.month": "bulan sebelumnya",
  "period.title.week": "Minggu ini", "period.title.month": "Bulan ini", "period.soFar": "{label} · hanya hari yang sudah lewat yang dihitung",
  "period.sub.week": "Performa Senin sampai Minggu", "period.sub.month": "Performa satu bulan kalender",
  "seg.week": "Minggu Ini", "seg.month": "Bulan Ini", "week.n": "Minggu {n}",
  "sec.domainsActs": "Domain & aktivitas", "sec.domainsHint": "Ketuk domain untuk melihat kontribusi tiap aktivitas.",
  "life.label": "Life Score", "life.noneBody": "Terus catat aktivitas harianmu. Begitu datanya cukup, Life Score akan muncul di sini.",
  "life.vs": "vs {prev}", "life.noPrev": "Belum cukup data sebelumnya.", "life.basedOn": "Berdasarkan {n} dari {total} aktivitas yang punya data.",
  "life.noData": "Belum ada data", "life.notComparable": "Belum cukup data untuk membandingkan.", "life.building": "Skormu sedang terbangun. Terus catat agar gambarannya makin jelas.", "life.coverage": "Data tercatat: {n}%",
  "progress.title": "Progres Life Score", "progress.empty": "Belum ada progres untuk ditampilkan.", "progress.vs7": "{n} dari 7 hari lalu", "progress.noCompare": "Belum ada perbandingan",
  "progress.noNew": "Tidak ada data baru", "progress.range7": "7 hari", "progress.range30": "30 hari", "progress.range90": "90 hari", "progress.current": "Life Score saat ini",
  "trend.improving": "Membaik", "trend.declining": "Menurun", "trend.stable": "Stabil", "trend.none": "Belum cukup data untuk menampilkan tren.",
  "detail.noData": "Belum ada data", "detail.daysRecorded": "{a} dari {b} hari terlaksana", "detail.daysOnTarget": "{a} dari {b} hari mencapai target", "detail.target": "target {t}",
  "detail.weight": "bobot",
  "hl.strongest": "Area terkuat", "hl.attention": "Perlu perhatian", "hl.improve": "Peningkatan terbesar", "hl.decline": "Penurunan terbesar",
  "hl.noImprove": "Belum ada peningkatan besar", "hl.noDecline": "Tidak ada penurunan besar",
  "ins.primary": "Utama", "ins.show": "Lihat bukti", "ins.hide": "Sembunyikan bukti",
  "ins.none.title": "Belum cukup data", "ins.none.desc": "Catat beberapa aktivitas {period}, lalu AWWAB akan mulai menjelaskan apa yang terjadi.",
  "ins.domainDown": "{domain} turun {n} poin {period}.", "ins.domainUp": "{domain} naik {n} poin {period}.",
  "ins.contrib.one": "{names} paling berpengaruh.", "ins.contrib.many": "{names} paling berpengaruh.",
  "ins.compared": "Dibandingkan {prev}.",
  "ins.weakest": "{domain} adalah area terendahmu {period}, di angka {n}.", "ins.weakest.desc": "{act} ({p}) punya selisih berbobot terbesar di area ini.",
  "ins.weakest.descNone": "Aktivitas yang tercatat di area ini berada di bawah area lain.",
  "ins.recWeak": "{act} berada di bawah target selama tiga {units} berturut-turut.", "ins.recStrong": "{act} konsisten mencapai target selama tiga {units}.",
  "ins.units.week": "minggu", "ins.units.month": "bulan", "ins.targetDesc": "Target: {target}.",
  "ins.ev.current": "Sekarang: {p}", "ins.ev.ago1.week": "Minggu lalu: {p}", "ins.ev.ago2.week": "2 minggu lalu: {p}",
  "ins.ev.ago1.month": "Bulan lalu: {p}", "ins.ev.ago2.month": "2 bulan lalu: {p}",
  "ins.actDown": "Konsistensi {act} turun dari {a} ke {b}.", "ins.actUp": "Konsistensi {act} naik dari {a} ke {b}.",
  "ins.strongest": "{domain} adalah area terkuatmu {period}, di angka {n}.", "ins.strongest.desc": "Berdasarkan aktivitas yang kamu catat.",
  "ins.title": "Mengapa hasilnya seperti ini", "ins.subtitle": "Apa yang terjadi dan perilaku apa yang berkaitan. Setiap baris berasal dari datamu.",
  "daily.today": "Hari ini", "daily.future": "Hari ini belum terjadi. Catatan di sini belum dihitung sampai harinya tiba.",
  "daily.hint": "{n} dari {total} tercatat · ketuk sekali untuk selesai, dua kali untuk tidak, tiga kali untuk mengosongkan.",
  "check.done": "Selesai", "check.notDone": "Tidak", "check.none": "Kosong", "daily.inUnit": "{act} dalam {unit}",
  "daily.empty": "Belum ada kebiasaan aktif. Tambahkan di Pengaturan.",
  "greet.morning": "Selamat pagi", "greet.afternoon": "Selamat siang", "greet.evening": "Selamat sore", "greet.night": "Selamat malam",
  "home.start": "Mulai mencatat hari ini. Cukup satu sampai tiga menit.", "home.openTracker": "Buka pencatatan hari ini", "home.domains": "Domain",
  "home.happening": "Apa yang terjadi?", "home.allInsights": "Semua wawasan →", "home.monthTrend": "Bulan ini, per minggu",
  "home.nextFocus": "Fokus berikutnya", "home.chosenFocus": "Fokus pilihanmu", "home.due": "Tenggat {d}", "home.nothing": "Belum ada jadwal.", "home.setGoal": "Buat tujuan",
  "type.goal": "Tujuan", "type.project": "Proyek", "type.milestone": "Milestone",
  "goals.title": "Ke mana kamu menuju", "goals.subtitle": "Progres tujuan berasal dari proyek dan milestone — terpisah dari Life Score.",
  "filter.active": "Aktif", "filter.completed": "Selesai", "filter.archived": "Diarsipkan", "goals.new": "Tujuan baru",
  "goals.empty.active": "Belum ada tujuan aktif", "goals.empty.completed": "Belum ada tujuan yang selesai", "goals.empty.archived": "Tidak ada tujuan yang diarsipkan",
  "goals.emptyBody": "Tujuan berisi proyek, dan proyek berisi milestone. Mulailah dari satu hal yang penting.",
  "goals.titlePh": "Judul tujuan, mis. Bangun portofolio", "goals.whyPh": "Mengapa ini penting (opsional)", "goals.domain": "Domain", "goals.noDomain": "Tanpa domain",
  "goals.targetDate": "Tanggal target", "goals.create": "Buat tujuan", "goals.overdue": "Terlambat · ", "goals.target": "Target ",
  "goals.edit": "Ubah tujuan", "goals.archive": "Arsipkan tujuan", "goals.restore": "Pulihkan tujuan", "goals.noMilestones": "Belum ada milestone.",
  "goals.noProjects": "Belum ada proyek.", "goals.addProject": "Tambah proyek",
  "proj.titlePh": "Judul proyek", "proj.deadline": "Tenggat proyek", "proj.due": " · tenggat {d}", "proj.noMs": "Belum ada milestone",
  "proj.edit": "Ubah proyek", "proj.archive": "Arsipkan proyek", "proj.restore": "Pulihkan proyek",
  "status.not_started": "Belum dimulai", "status.in_progress": "Berjalan", "status.completed": "Selesai", "status.archived": "Diarsipkan",
  "status.pending": "Belum selesai", "status.active": "Aktif",
  "ms.complete": "Selesaikan {t}", "ms.edit": "Ubah {t}", "ms.delete": "Hapus {t}", "ms.confirmDelete": "Hapus milestone \"{t}\"? Ini tidak bisa dibatalkan.",
  "ms.add": "Tambah milestone", "ms.due": "Tenggat milestone", "ms.title": "Judul milestone",
  "review.eyebrow": "Review Bulanan", "review.subtitle": "Lihat ke belakang, pahami, renungkan, lalu melangkah.", "review.prevMonth": "Bulan sebelumnya",
  "review.noCompare": "Belum ada pembanding", "review.strongest": "Terkuat", "review.wentWell": "Yang berjalan baik", "review.strongestArea": "Area terkuat:",
  "review.improved": "{d} naik +{n} poin", "review.completedProject": "Proyek selesai:", "review.msCompleted": "{n} milestone selesai",
  "review.nothing": "Belum ada catatan untuk bulan ini.", "review.declined": "{d} turun {n} poin", "review.lowest": "Area terendah:",
  "review.overdueMs": "Milestone terlambat: {t} ({d})", "review.dueSoon": "{t} tenggat {d}", "review.nothingFlagged": "Tidak ada yang perlu ditandai.",
  "review.goals": "Tujuan", "review.noGoals": "Belum ada tujuan.", "col.goal": "Tujuan", "col.prev": "Sebelumnya", "col.cur": "Sekarang", "col.nextMs": "Milestone berikutnya",
  "review.reflection": "Refleksi", "review.q.wentWell": "Apa yang berjalan baik?", "review.q.difficult": "Apa yang sulit?",
  "review.q.change": "Apa yang perlu diubah bulan depan?", "review.q.stop": "Apa yang perlu dihentikan?", "review.q.continue": "Apa yang perlu dilanjutkan?",
  "review.focus": "Satu fokus saya bulan depan", "review.focusPh": "mis. Akademik, atau Selesaikan MVP AWWAB", "review.update": "Perbarui review",
  "review.save": "Simpan review", "review.past": "Review sebelumnya",
  "cal.subtitle": "Tanggal penting dari tujuan, proyek, milestone, dan planner.", "cal.in": " · di {p}", "cal.open": "Buka di Tujuan",
  "cal.openPlanner": "Buka di Planner", "type.planner": "Planner",
  "cal.upcoming": "Akan datang", "cal.nothing": "Belum ada yang akan datang. Tambahkan tanggal pada tujuan, proyek, atau milestone.",
  "wd.0": "Sen", "wd.1": "Sel", "wd.2": "Rab", "wd.3": "Kam", "wd.4": "Jum", "wd.5": "Sab", "wd.6": "Min",
  "settings.subtitle": "Bahasa dan kebiasaan yang kamu catat.", "settings.language": "Bahasa",
  "settings.langHint": "Hanya tampilan yang berubah. Datamu tetap sama.",
  "habits.title": "Aktivitas & Kebiasaan", "habits.add": "Tambah Kebiasaan", "habits.edit": "Edit Kebiasaan", "habits.archive": "Arsipkan Kebiasaan", "habits.archiveShort": "Arsipkan",
  "habits.delete": "Hapus", "habits.reactivate": "Aktifkan Kembali", "habits.name": "Nama Kebiasaan", "habits.inputType": "Jenis Input",
  "input.checklist": "Checklist", "input.quantitative": "Angka", "habits.target": "Target", "habits.unit": "Satuan", "habits.unitPh": "mis. ml, menit, halaman",
  "habits.frequency": "Frekuensi", "freq.day": "Harian", "freq.week": "Mingguan", "freq.month": "Bulanan", "habits.weight": "Bobot (%)",
  "habits.save": "Simpan Kebiasaan", "habits.active": "Kebiasaan aktif", "habits.archived": "Diarsipkan", "habits.archivedOn": "Diarsipkan {d}",
  "habits.noArchived": "Belum ada kebiasaan yang diarsipkan.", "habits.weightWarn": "Total bobot aktivitas di {domain} adalah {n}%, bukan 100%.",
  "habits.rebalance": "Seimbangkan ke 100%",
  "habits.historyWarn": "Kebiasaan ini punya riwayat. Arsipkan untuk menyimpannya, atau Hapus untuk menghilangkannya selamanya.",
  "habits.confirmDelete": "Hapus kebiasaan ini secara permanen?", "habits.err.name": "Isi nama kebiasaan.",
  "habits.err.target": "Target harus angka lebih dari 0.", "habits.err.weight": "Bobot harus antara 0 dan 100.",
  "habits.err.dup": "Kebiasaan dengan nama ini sudah ada di domain ini.",
  "habits.historyNote": "Perubahan berlaku mulai hari ini. Periode sebelumnya tetap memakai pengaturan lama.", "habits.custom": "Buatan sendiri",
  "habits.checkHint": "Dengan target harian 1, mencentang berarti sudah dilakukan hari itu. Isi target lebih besar untuk menghitung jumlah (mis. halaman).",
  "auth.title": "Akun kamu", "auth.sub": "Masuk agar progres kamu tersimpan dan bisa dibuka di perangkat mana pun.",
  "auth.login": "Masuk", "auth.signup": "Daftar", "auth.logout": "Keluar", "auth.email": "Email", "auth.password": "Kata sandi",
  "auth.google": "Lanjutkan dengan Google", "auth.or": "atau", "auth.toSignup": "Belum punya akun? Daftar", "auth.toLogin": "Sudah punya akun? Masuk",
  "auth.checkEmail": "Cek email kamu untuk konfirmasi akun, lalu masuk.", "auth.signedInAs": "Masuk sebagai {e}",
  "auth.synced": "Progres kamu tersimpan di akun.", "auth.guest": "Kamu belum masuk. Progres hanya tersimpan di perangkat ini.",
  "auth.pwShort": "Kata sandi minimal 6 karakter.", "auth.busy": "Tunggu sebentar…",
  "auth.welcome": "Bangun sistem hidupmu.", "auth.welcomeSub": "Pantau apa yang kamu lakukan.\nPahami progresmu.\nPerbaiki hidupmu sedikit demi sedikit.",
  "auth.withEmail": "Lanjutkan dengan Email", "auth.name": "Nama", "auth.confirm": "Ulangi kata sandi", "auth.pwMismatch": "Kata sandi tidak sama.",
  "auth.forgot": "Lupa kata sandi?", "auth.sendReset": "Kirim tautan reset", "auth.resetSent": "Jika email itu terdaftar, tautan reset sedang dikirim.",
  "auth.resend": "Kirim ulang email verifikasi", "auth.resent": "Email verifikasi sudah dikirim ulang.", "auth.back": "Kembali",
  "auth.err.invalid": "Email atau kata sandi salah.", "auth.err.unconfirmed": "Konfirmasi email kamu dulu. Cek kotak masuk.",
  "auth.err.exists": "Email ini sudah punya akun. Coba masuk.", "auth.err.network": "Tidak bisa terhubung ke server. Cek koneksi kamu.",
  "auth.err.weak": "Pilih kata sandi yang lebih kuat (minimal 8 karakter, bukan yang umum).", "auth.err.email": "Masukkan alamat email yang valid.",
  "auth.err.generic": "Ada yang salah. Coba lagi.",
  "auth.newPw": "Kata sandi baru", "auth.setPw": "Simpan kata sandi baru", "auth.pwSaved": "Kata sandi diperbarui.", "auth.resetTitle": "Buat kata sandi baru",
  "auth.resetInvalid": "Tautan reset tidak valid atau kedaluwarsa. Minta tautan baru.", "auth.changePw": "Ganti kata sandi", "auth.currentPw": "Kata sandi saat ini",
  "auth.profile": "Profil", "auth.saveName": "Simpan", "auth.security": "Keamanan", "auth.saved": "Tersimpan.",
  "sync.offline": "Offline — perubahan akan disinkronkan saat kamu online lagi.", "sync.synced": "Tersinkron", "sync.syncing": "Menyinkronkan…", "sync.pending": "Belum tersinkron — akan dicoba lagi.",
  "mig.title": "Data AWWAB ditemukan di perangkat ini.", "mig.body": "Kalau kamu lanjut, data yang sudah ada bisa disimpan ke akunmu dan digunakan di perangkat lain.",
  "mig.import": "Import Data", "mig.fresh": "Mulai Baru", "mig.working": "Memindahkan data…", "mig.done": "Data berhasil dipindahkan.",
  "mig.error": "Pemindahan gagal. Data masih ada di perangkat ini — coba lagi.", "mig.ok": "Oke",
};

const DICT: Record<Lang, Record<string, string>> = { en, id };

// ---------- language store ----------
const KEY = "awwab:lang";
let lang: Lang = "id";
let loaded = false;
const listeners = new Set<() => void>();
const langListeners = new Set<(l: Lang) => void>();
/** Fires only on explicit language changes (used to persist the preference to the account). */
export const onLangChange = (f: (l: Lang) => void) => { langListeners.add(f); return () => { langListeners.delete(f); }; };

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "en" || v === "id") lang = v;
  } catch {
    /* storage unavailable */
  }
  document.documentElement.lang = lang;
}

export const getLang = (): Lang => {
  load();
  return lang;
};

export function setLang(l: Lang) {
  lang = l;
  try {
    window.localStorage.setItem(KEY, l);
  } catch {
    /* storage unavailable */
  }
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
  langListeners.forEach((f) => f(l));
}

export const locale = () => (getLang() === "id" ? "id-ID" : "en-US");

export function useLang(): Lang {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getLang,
    () => "id" as Lang,
  );
}

export function translate(l: Lang, key: string, p?: Params): string {
  let s = DICT[l][key] ?? DICT.en[key] ?? key;
  if (p) for (const [k, v] of Object.entries(p)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export const hasKey = (key: string) => key in en;

export function useT(): T {
  const l = useLang();
  return useMemo(() => (k: string, p?: Params) => translate(l, k, p), [l]);
}

// ---------- display helpers (presentation only) ----------
export const domainName = (id: DomainId, t: T) => t(`domain.${id}`);

export const actName = (a: { id: string; isSystem: boolean; customName: string | null }, t: T) =>
  a.customName ?? (a.isSystem ? t(`act.${a.id}`) : a.id);

export const unitText = (u: string, t: T) => (hasKey(`unit.${u}`) ? t(`unit.${u}`) : u);

const num = (n: number) => n.toLocaleString(locale());

export function targetText(a: Activity, t: T): string {
  const d = SYSTEM_DEFAULTS[a.id];
  if (a.isSystem && d && d.target === a.target && d.frequency === a.frequency && d.inputType === a.inputType && d.unit === a.unit)
    return t(`target.${a.id}`);
  const per = t(`per.${a.frequency}`);
  if (a.inputType === "checklist") return a.frequency === "day" ? t("target.everyDay") : `${num(a.target)}× / ${per}`;
  return `${num(a.target)} ${unitText(a.unit, t)} / ${per}`;
}

export const joinNames = (names: string[], t: T) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} ${t("common.and")} ${names[names.length - 1]}`;
