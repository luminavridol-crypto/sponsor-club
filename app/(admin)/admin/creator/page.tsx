import { CreatorStudioPanel } from "@/components/admin/creator-studio-panel";
import { PrivateShell } from "@/components/layout/private-shell";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminCreatorStudioPage() {
  const profile = await requireAdmin();

  return (
    <PrivateShell profile={profile} admin>
      <CreatorStudioPanel />
    </PrivateShell>
  );
}
