const PALETTE = {
  canvas: "#F6FBF7",
  shellGradientA: "#EBF9F1",
  shellGradientB: "#F6FBF7",
  shellAccent: "#D3F2DF",
  cardBorder: "#D8EBDD",
  cardShadow: "0 16px 40px rgba(17, 24, 39, 0.10)",
  heroA: "#0D4B29",
  heroB: "#1F7A3A",
  heroC: "#34A853",
  title: "#0F5132",
  body: "#1F2937",
  muted: "#4B5563",
  chipBg: "rgba(255, 255, 255, 0.18)",
  chipText: "#E9F9EE",
  infoBg: "#F1F9F3",
  infoBorder: "#CBE8D3",
  infoTitle: "#166534",
  infoBody: "#14532D",
  ctaBg: "#166534",
  ctaText: "#FFFFFF",
  footerBg: "#EEF8F1",
  footerBorder: "#D8EBDD",
};

type BrandedEmailOptions = {
  lang: "en" | "fr";
  badge: string;
  title: string;
  intro: string;
  detailsHtml?: string;
  cta?: {
    label: string;
    url: string;
  };
  footnote?: string;
};

export function buildBrandedEmailHtml(options: BrandedEmailOptions) {
  const detailsBlock = options.detailsHtml
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0 0;background-color:${PALETTE.infoBg};border:1px solid ${PALETTE.infoBorder};border-radius:14px;">
         <tr>
           <td style="padding:14px 16px;font-size:15px;line-height:1.65;color:${PALETTE.infoBody};">
             ${options.detailsHtml}
           </td>
         </tr>
       </table>`
    : "";

  const ctaBlock = options.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;">
         <tr>
           <td align="center" bgcolor="${PALETTE.ctaBg}" style="border-radius:12px;box-shadow:0 10px 22px rgba(22,101,52,0.28);">
             <a href="${escapeHtml(options.cta.url)}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;letter-spacing:0.2px;color:${PALETTE.ctaText};text-decoration:none;">
               ${escapeHtml(options.cta.label)}
             </a>
           </td>
         </tr>
       </table>`
    : "";

  const footnoteBlock = options.footnote
    ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:${PALETTE.muted};">${escapeHtml(options.footnote)}</p>`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="${options.lang}">
      <body style="margin:0;padding:0;background-color:${PALETTE.canvas};font-family:'Segoe UI',Arial,sans-serif;color:${PALETTE.body};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:
          radial-gradient(circle at 0% -10%, ${PALETTE.shellAccent} 0%, transparent 35%),
          radial-gradient(circle at 100% -20%, #C8ECD6 0%, transparent 42%),
          linear-gradient(180deg, ${PALETTE.shellGradientA} 0%, ${PALETTE.shellGradientB} 62%);
          margin:0;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background-color:#FFFFFF;border:1px solid ${PALETTE.cardBorder};border-radius:22px;overflow:hidden;box-shadow:${PALETTE.cardShadow};">
                <tr>
                  <td style="background:linear-gradient(132deg,${PALETTE.heroA} 0%,${PALETTE.heroB} 55%,${PALETTE.heroC} 100%);padding:30px 32px 28px;text-align:left;">
                    <div style="font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:0.3px;line-height:1;">CoopEnergie</div>
                    <div style="margin-top:10px;display:inline-block;padding:5px 11px;border-radius:999px;background-color:${PALETTE.chipBg};font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${PALETTE.chipText};">
                      ${escapeHtml(options.badge)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px 32px 28px;">
                    <h1 style="margin:0 0 14px;font-size:27px;line-height:1.3;color:${PALETTE.title};">${escapeHtml(options.title)}</h1>
                    <p style="margin:0;font-size:16px;line-height:1.7;color:${PALETTE.body};">${options.intro}</p>
                    ${detailsBlock}
                    ${ctaBlock}
                    ${footnoteBlock}
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 24px;background-color:${PALETTE.footerBg};border-top:1px solid ${PALETTE.footerBorder};font-size:13px;line-height:1.6;color:${PALETTE.muted};text-align:center;">
                    CoopEnergie - Transparent Solar Cooperatives
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
