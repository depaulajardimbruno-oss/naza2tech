/** /lider/[id] redireciona para a aba Membros. */
import { redirect } from "next/navigation";

export default async function LeaderIndex({ params }: PageProps<"/lider/[ministryId]">) {
  const { ministryId } = await params;
  redirect(`/lider/${ministryId}/membros`);
}
