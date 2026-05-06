import { redirect } from "next/navigation";

export default async function FeedPostRedirectPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/club/${slug}`);
}
