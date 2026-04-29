import { buildBrandedEmailHtml, escapeHtml } from "./brand.template";

export function buildInvitationHtml(
  cooperativeName: string,
  joinUrl: string,
  locale: string,
) {
  const isEnglish = locale.toLowerCase().startsWith("en");
  const heading = isEnglish
    ? "You are invited to join a solar cooperative"
    : "Vous etes invite(e) a rejoindre une cooperative solaire";
  const intro = isEnglish
    ? "You have been invited to join"
    : "Vous avez ete invite(e) a rejoindre";
  const buttonLabel = isEnglish ? "Join now" : "Rejoindre maintenant";
  const expiry = isEnglish
    ? "This link expires in 72 hours."
    : "Ce lien expire dans 72 heures.";
  const fallback = isEnglish
    ? "If the button does not work, copy and paste this link into your browser:"
    : "Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :";
  return buildBrandedEmailHtml({
    lang: isEnglish ? "en" : "fr",
    badge: isEnglish ? "Invitation" : "Invitation",
    title: heading,
    intro: `${intro} <strong>${escapeHtml(cooperativeName)}</strong>.`,
    detailsHtml: `${escapeHtml(expiry)}<br /><br /><span style="font-size:14px;">${escapeHtml(fallback)}</span><br /><a href="${escapeHtml(joinUrl)}" style="color:#166534;text-decoration:none;word-break:break-all;">${escapeHtml(joinUrl)}</a>`,
    cta: {
      label: buttonLabel,
      url: joinUrl,
    },
  });
}
