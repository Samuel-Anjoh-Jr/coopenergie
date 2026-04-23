const PRIMARY_COLOR = "#1B5E20";
const ACCENT_COLOR = "#E8F5E9";
const TEXT_COLOR = "#1F2937";

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
  const footer = "CoopEnergie - Transparent Solar Cooperatives";

  return `
    <!DOCTYPE html>
    <html lang="${isEnglish ? "en" : "fr"}">
      <body style="margin:0;padding:0;background-color:#F4F7F4;font-family:Arial,sans-serif;color:${TEXT_COLOR};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F4F7F4;margin:0;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="background-color:${PRIMARY_COLOR};padding:24px 32px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#FFFFFF;letter-spacing:0.5px;">CoopEnergie</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:${PRIMARY_COLOR};">${heading}</h1>
                    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                      ${intro}
                      <span style="display:inline-block;background-color:${ACCENT_COLOR};color:${PRIMARY_COLOR};padding:4px 10px;border-radius:999px;font-weight:700;">
                        ${escapeHtml(cooperativeName)}
                      </span>
                    </p>
                    <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:${TEXT_COLOR};">
                      ${expiry}
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                      <tr>
                        <td align="center" bgcolor="${PRIMARY_COLOR}" style="border-radius:10px;">
                          <a href="${joinUrl}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">
                            ${buttonLabel}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#4B5563;">
                      ${fallback}
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.6;word-break:break-all;">
                      <a href="${joinUrl}" style="color:${PRIMARY_COLOR};text-decoration:none;">${joinUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px;background-color:#F0FDF4;font-size:13px;line-height:1.6;color:#4B5563;text-align:center;">
                    ${footer}
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
