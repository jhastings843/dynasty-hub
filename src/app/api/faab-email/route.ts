import { getMyLeagues } from "@/lib/league/discover";
import { buildWeeklyReport } from "@/lib/guillotine/report";
import { emailSubject, renderEmail } from "@/lib/guillotine/email";
import { sendEmail } from "@/lib/guillotine/send";
import { alreadySent, clearSent, recordSent } from "@/lib/guillotine/sent-log";

export const dynamic = "force-dynamic";

// GET /api/faab-email - the Tuesday guide, in Jack's inbox.
//
// Vercel Hobby runs one cron a day, so this runs daily and decides for itself
// whether today is the day. Tuesday is the target: Monday night football is
// played, the chop is known, the commissioner has dropped the roster, and there
// is a full day before bids process. Running daily also means a missed Tuesday
// is not a missed week, since ?force=1 sends on demand.
//
// Preview it without sending with ?dry=1, which returns the HTML.
//
// The send day is configurable because the one thing nobody can tell us yet is
// when the commissioner actually drops the chopped roster. Tuesday is the
// default and the right guess, but when that time is confirmed the fix should
// be one environment variable, not a deploy.
const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const DEFAULT_SEND_DAY = 2; // Tuesday, in America/New_York.

function configuredSendDay(): number {
  const raw = (process.env.FAAB_EMAIL_DAY ?? "").trim();
  if (!raw) return DEFAULT_SEND_DAY;

  const asNumber = Number(raw);
  if (Number.isInteger(asNumber) && asNumber >= 0 && asNumber <= 6) return asNumber;

  const byName = DAYS.findIndex((d) => d.toLowerCase().startsWith(raw.slice(0, 3).toLowerCase()));
  return byName >= 0 ? byName : DEFAULT_SEND_DAY;
}

function dayInNewYork(now: Date): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  }).format(now);
  return DAYS.indexOf(weekday);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const force = params.get("force") === "1";
  const dry = params.get("dry") === "1";
  // Deliberately separate from force. Force means "ignore the schedule"; resend
  // means "yes, send this week's guide a second time", which is a rarer and
  // more annoying thing to do by accident.
  const resend = params.get("resend") === "1";
  const check = params.get("check") === "1";
  const requested = (params.get("league") ?? "").trim();

  const sendDay = configuredSendDay();
  const today = dayInNewYork(new Date());

  // ?check=1 answers "is this actually going to work on Tuesday" without
  // sending anything. Worth having: every failure mode here is silent by
  // design, so the only alternative to a check is a missing email nobody
  // notices until the week is over. Reports presence, never values.
  if (check) {
    const from = process.env.FAAB_EMAIL_FROM ?? null;
    const to = process.env.FAAB_EMAIL_TO ?? null;
    return Response.json({
      ok: true,
      willSend: Boolean(process.env.RESEND_API_KEY && to),
      config: {
        resendKey: process.env.RESEND_API_KEY ? "set" : "MISSING",
        // The recipient and sender are Jack's own addresses and the whole
        // point of the check is confirming they are the right ones, so these
        // are shown. The API key never is.
        to: to ?? "MISSING",
        from: from ?? "onboarding@resend.dev (fallback)",
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "(default)",
        cronSecret: process.env.CRON_SECRET ? "set" : "open",
      },
      schedule: { sendDay: DAYS[sendDay], today: DAYS[today] },
    });
  }
  if (!force && !dry && today !== sendDay) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: `The guide goes out on ${DAYS[sendDay]} and today is ${DAYS[today]}. Add ?force=1 to send anyway.`,
    });
  }

  // Find the guillotine league rather than being told which one it is: the
  // league id changes every season and a hardcoded one would quietly send last
  // season's report forever.
  let leagueId = requested;
  if (!leagueId) {
    try {
      const leagues = await getMyLeagues();
      const guillotine = leagues.filter((l) => l.type === "guillotine");
      if (guillotine.length === 0) {
        return Response.json({
          ok: true,
          skipped: true,
          reason: "No guillotine league on this account for the current season.",
        });
      }
      leagueId = guillotine[0].id;
    } catch (e) {
      return Response.json(
        { ok: false, error: `Could not list leagues: ${(e as Error).message}` },
        { status: 502 },
      );
    }
  }

  let report;
  try {
    report = await buildWeeklyReport(leagueId);
  } catch (e) {
    return Response.json(
      { ok: false, error: `Could not build the report: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  // A report with nothing to say is not worth an email on a schedule. Before the
  // draft and on a week with no projections there is no advice, only an apology.
  // A forced run is different: someone asked for it by hand, usually to prove
  // the plumbing works, and silence is the wrong answer to that.
  if (report.state !== "ok" && !dry && !force) {
    return Response.json({
      ok: true,
      skipped: true,
      state: report.state,
      reason: report.message,
    });
  }

  const subject = emailSubject(report);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://fantasy-hub-tan.vercel.app";
  const html = renderEmail(report, appUrl);

  if (dry) {
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const season = report.league.season;

  if (resend) {
    await clearSent(leagueId, season, report.week);
  } else {
    const previous = await alreadySent(leagueId, season, report.week);
    if (previous) {
      return Response.json({
        ok: true,
        skipped: true,
        reason: `Week ${report.week} already went out at ${previous.sentAt} ("${previous.subject}"). Add ?resend=1 to send it again.`,
      });
    }
  }

  const result = await sendEmail(subject, html);

  if (result.sent) {
    await recordSent(leagueId, season, report.week, {
      sentAt: new Date().toISOString(),
      subject,
      messageId: result.id,
    });
  }

  return Response.json({
    ok: result.sent,
    league: report.league.name,
    week: report.week,
    subject,
    posture: report.posture.posture,
    spend: Math.round(report.card.maxPossibleSpend),
    ...(result.sent ? { id: result.id } : { error: result.reason }),
  });
}
