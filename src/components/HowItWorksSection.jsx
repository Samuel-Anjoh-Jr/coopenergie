import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Banknote, Vote, Zap } from 'lucide-react';

const HowItWorksSection = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: <Users className="h-8 w-8 text-nuit-dark" />,
      title: t('step_1'),
      desc: "Rassemblez vos voisins ou membres d'associations pour former une coopérative locale."
    },
    {
      icon: <Banknote className="h-8 w-8 text-nuit-dark" />,
      title: t('step_2'),
      desc: "Chaque dépôt est enregistré sur la blockchain, créant un registre financier infalsifiable."
    },
    {
      icon: <Vote className="h-8 w-8 text-nuit-dark" />,
      title: t('step_3'),
      desc: "Dès l'objectif atteint, les membres votent numériquement pour valider la commande."
    },
    {
      icon: <Zap className="h-8 w-8 text-nuit-dark" />,
      title: t('step_4'),
      desc: "Recevez et installez les équipements avec nos partenaires locaux certifiés."
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-nuit to-nuit-dark relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-3xl font-extrabold sm:text-4xl text-white">
            {t('how_it_works_title')}
          </h2>
          <div className="mt-4 h-1 w-24 bg-soleil mx-auto rounded"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
          {/* Ligne connectrice pour desktop */}
          <div className="hidden md:block absolute top-[2.5rem] left-[12%] right-[12%] h-1 bg-gradient-to-r from-soleil/10 via-soleil to-soleil/10 -z-10 rounded"></div>
          
          {steps.map((step, index) => (
            <div key={index} className="relative flex flex-col items-center text-center group">
              <div className="w-20 h-20 bg-soleil rounded-full flex items-center justify-center shadow-lg shadow-soleil/20 mb-6 border-4 border-nuit-dark relative z-10 transform transition-transform group-hover:scale-110">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{step.title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
