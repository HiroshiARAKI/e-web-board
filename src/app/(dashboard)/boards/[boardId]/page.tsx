import BoardEditClient from "@/components/dashboard/BoardEditClient";

export default async function BoardEditPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  return <BoardEditClient boardId={boardId} />;
}
