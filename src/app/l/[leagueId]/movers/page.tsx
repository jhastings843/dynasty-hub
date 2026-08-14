import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Movers was folded into the broader Players page (which now also
// hosts waiver fits and full-league search). Keep this route as a
// permanent redirect so old bookmarks still resolve.
export default async function MoversRedirect({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  redirect(`/l/${leagueId}/players`);
}
