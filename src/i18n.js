import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "hero_title": "The power of the sun, the strength of the collective.",
      "hero_subtitle": "Join a transparent solar cooperative on the blockchain and light up your future today.",
      "create_coop": "Start a Cooperative",
      "problem_title": "The Solar Challenge in Cameroon",
      "problem_desc": "While 45% of the population lacks electricity, individual solar kits are unaffordable (60k-250k FCFA). Collective purchasing is the answer, but lack of transparency creates conflicts.",
      "solution_title": "The Blockchain Solution",
      "solution_desc": "CoopEnergie uses blockchain technology to guarantee unforgeable transparency. Group your purchases to save up to 40% and track every contribution in real-time.",
      "how_it_works_title": "How it works in 4 easy steps",
      "step_1": "1. Create a local group",
      "step_2": "2. Contribute transparently",
      "step_3": "3. Vote on purchases collectively",
      "step_4": "4. Get equipped & installed",
      "footer_text": "© 2026 CoopEnergie. All rights reserved.",
      "transparency_title": "Absolute Transparency",
      "savings_title": "Grouped Savings",
      "independence_title": "Energy Independence",
      "lang_fr": "Français",
      "lang_en": "English",
      "nav_problem": "Problem",
      "nav_solution": "Solution",
      "nav_impact": "Impact",
      "vision_title": "Our Vision",
      "vision_desc": "Enable every community in Africa to access clean and affordable energy through solidarity and financial transparency.",
      "mission_title": "Our Mission",
      "mission_desc": "Enable communities to collectively finance solar equipment through a simple, transparent, and secure platform based on Mobile Money and blockchain."
    }
  },
  fr: {
    translation: {
      "hero_title": "La puissance du soleil, la force du collectif.",
      "hero_subtitle": "Rejoignez une coopérative solaire transparente sur la blockchain et illuminez votre avenir dès maintenant.",
      "create_coop": "Créer une coopérative",
      "problem_title": "Le défi solaire au Cameroun",
      "problem_desc": "Alors que 45% de la population n'a pas accès à l'électricité, les kits solaires individuels restent inaccessibles (60k à 250k FCFA). L'achat groupé est la clé, mais le manque de transparence bloque les initiatives collectives.",
      "solution_title": "La solution Blockchain",
      "solution_desc": "CoopEnergie utilise la blockchain pour garantir une transparence infalsifiable. Groupez vos achats pour économiser jusqu'à 40% et suivez chaque cotisation en temps réel.",
      "how_it_works_title": "Comment ça marche en 4 étapes",
      "step_1": "1. Créez un groupe local",
      "step_2": "2. Cotisez en transparence",
      "step_3": "3. Votez les achats",
      "step_4": "4. Faites-vous équiper",
      "footer_text": "© 2026 CoopEnergie. Tous droits réservés.",
      "transparency_title": "Transparence Absolue",
      "savings_title": "Économies Groupées (-40%)",
      "independence_title": "Indépendance Énergétique",
      "lang_fr": "Français",
      "lang_en": "English",
      "nav_problem": "Le Problème",
      "nav_solution": "La Solution",
      "nav_impact": "Notre Impact",
      "vision_title": "Notre Vision",
      "vision_desc": "Permettre à chaque communauté en Afrique d’accéder à une énergie propre et abordable grâce à la solidarité et à la transparence financière.",
      "mission_title": "Notre Mission",
      "mission_desc": "Permettre aux communautés de financer collectivement des équipements solaires grâce à une plateforme simple, transparente et sécurisée basée sur le Mobile Money et la blockchain."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "fr",
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
