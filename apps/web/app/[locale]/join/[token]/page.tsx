import { JoinCooperative } from "@/components/coop/JoinCooperative";
import { normalizeInvitationLocale } from "@/lib/invitations";

type JoinInvitationPageProps = {
  params: Promise<{
    locale: string;
    token: string;
  }>;
};

export default async function JoinInvitationPage({
  params,
}: JoinInvitationPageProps) {
  const { locale, token } = await params;

  return (
    <JoinCooperative
      locale={normalizeInvitationLocale(locale)}
      token={token}
    />
  );
}
