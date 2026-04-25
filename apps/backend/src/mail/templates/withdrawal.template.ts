const PRIMARY_COLOR = "#1B5E20";
const TEXT_COLOR = "#1F2937";

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

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <body style="margin:0;padding:0;background-color:#F4F7F4;font-family:Arial,sans-serif;color:${TEXT_COLOR};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F4F7F4;margin:0;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="background-color:${PRIMARY_COLOR};padding:24px 32px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#FFFFFF;">CoopEnergie</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:${PRIMARY_COLOR};">
                      Retrait confirme pour ${escapeHtml(cooperativeName)}
                    </h1>
                    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                      Le decaissement de <strong>${amount.toLocaleString()} FCFA</strong> a ete execute avec succes.
                    </p>
                    ${
                      txUrl
                        ? `<p style="margin:0 0 24px;font-size:15px;line-height:1.7;">
                            Hash de transaction :
                            <a href="${txUrl}" style="color:${PRIMARY_COLOR};text-decoration:none;word-break:break-all;">${txHash}</a>
                          </p>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" bgcolor="${PRIMARY_COLOR}" style="border-radius:10px;">
                                <a href="${txUrl}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">
                                  Voir sur Celoscan
                                </a>
                              </td>
                            </tr>
                          </table>`
                        : `<p style="margin:0;font-size:15px;line-height:1.7;">
                            Le hash de transaction n'est pas disponible pour le moment.
                          </p>`
                    }
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px;background-color:#F0FDF4;font-size:13px;line-height:1.6;color:#4B5563;text-align:center;">
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
