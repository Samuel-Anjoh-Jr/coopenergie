import { buildBrandedEmailHtml, escapeHtml } from "./brand.template";

export function buildWithdrawalHtml(
  cooperativeName: string,
  amount: number,
  txHash: string,
) {
  const celoscanBase =
    process.env.NEXT_PUBLIC_CELOSCAN_BASE?.trim() || "https://celoscan.io";
  const txUrl = txHash
    ? `${celoscanBase.replace(/\/+$/, "")}/tx/${txHash}`
    : null;

  const detailsHtml = txUrl
    ? `Hash de transaction :<br /><a href="${escapeHtml(txUrl)}" style="color:#166534;text-decoration:none;word-break:break-all;">${escapeHtml(txHash)}</a>`
    : "Le hash de transaction n'est pas disponible pour le moment.";

  return buildBrandedEmailHtml({
    lang: "fr",
    badge: "Retrait execute",
    title: `Retrait confirme pour ${cooperativeName}`,
    intro: `Le decaissement de <strong>${amount.toLocaleString()} FCFA</strong> a ete execute avec succes.`,
    detailsHtml,
    cta: txUrl
      ? {
          label: "Voir sur Celoscan",
          url: txUrl,
        }
      : undefined,
  });
}
