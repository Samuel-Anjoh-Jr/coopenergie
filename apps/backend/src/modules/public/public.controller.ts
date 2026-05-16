import { Controller, Get, Query } from "@nestjs/common";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";

@Controller("public")
export class PublicController {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  @Get("monetisation")
  getPublicMonetisationSettings() {
    return this.platformSettingsService.getMonetisationSettings();
  }

  @Get("mobile-stores")
  getPublicMobileStores() {
    return this.platformSettingsService.getPublicMobileStoreSettings();
  }

  @Get("legal")
  getPublicLegal(@Query("locale") locale?: string) {
    const isEnglish = (locale || "").toLowerCase().startsWith("en");

    if (isEnglish) {
      return {
        terms: {
          title: "Terms and Conditions",
          paragraphs: [
            "By using CoopEnergie, you agree to participate in cooperative governance in good faith and comply with applicable laws.",
            "Contributions, votes, and governance actions are recorded for transparency and accountability.",
            "Operational and platform fees may apply according to active cooperative and platform settings.",
          ],
        },
        privacy: {
          title: "Privacy Policy",
          paragraphs: [
            "CoopEnergie processes account and activity data to provide cooperative services securely and reliably.",
            "Your personal data is protected with role-based access controls and only used for platform operations.",
            "By continuing to use the app, you consent to this processing and to communications required for cooperative operations.",
          ],
        },
      };
    }

    return {
      terms: {
        title: "Conditions Generales",
        paragraphs: [
          "En utilisant CoopEnergie, vous acceptez de participer a la gouvernance cooperative de bonne foi et dans le respect de la loi.",
          "Les contributions, votes et actions de gouvernance sont journalises pour la transparence et la responsabilite.",
          "Des frais operationnels et de plateforme peuvent s'appliquer selon les parametres actifs de la cooperative et de la plateforme.",
        ],
      },
      privacy: {
        title: "Politique de Confidentialite",
        paragraphs: [
          "CoopEnergie traite les donnees de compte et d'activite pour fournir les services cooperatifs de maniere securisee et fiable.",
          "Vos donnees personnelles sont protegees par des controles d'acces bases sur les roles et utilisees uniquement pour les operations de la plateforme.",
          "En continuant d'utiliser l'application, vous acceptez ce traitement ainsi que les communications necessaires aux operations de la cooperative.",
        ],
      },
    };
  }
}
