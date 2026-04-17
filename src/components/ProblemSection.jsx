import React from 'react';
import { useTranslation } from 'react-i18next';
import { LightbulbOff, Wallet, AlertTriangle } from 'lucide-react';

const ProblemSection = () => {
  const { t } = useTranslation();

  return (
    <section id="probleme" className="py-24 bg-nuit">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold sm:text-4xl text-white">
            {t('problem_title')}
          </h2>
          <p className="mt-4 text-xl text-slate-300">
            {t('problem_desc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-dark p-8 rounded-2xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 border border-white/10 hover:border-soleil/50">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <LightbulbOff className="h-24 w-24 text-soleil" />
            </div>
            <LightbulbOff className="h-10 w-10 text-soleil mb-6" />
            <h3 className="text-xl font-bold mb-2 text-white">45% Sans Électricité</h3>
            <p className="text-slate-400">Une grande partie de la population rurale et périurbaine dépend de solutions coûteuses ou polluantes.</p>
          </div>

          <div className="glass-dark p-8 rounded-2xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 border border-white/10 hover:border-soleil/50">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet className="h-24 w-24 text-soleil" />
            </div>
            <Wallet className="h-10 w-10 text-soleil mb-6" />
            <h3 className="text-xl font-bold mb-2 text-white">60k - 250k FCFA</h3>
            <p className="text-slate-400">Le coût moyen d'un système individuel, le rendant inaccessible pour la plupart des foyers non connectés.</p>
          </div>

          <div className="glass-dark p-8 rounded-2xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 border border-red-500/20 hover:border-red-500/50">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertTriangle className="h-24 w-24 text-red-400" />
            </div>
            <AlertTriangle className="h-10 w-10 text-red-400 mb-6" />
            <h3 className="text-xl font-bold mb-2 text-red-100">Manque de Transparence</h3>
            <p className="text-slate-400">Les tentatives d'achats collectifs sont souvent bloquées par la méfiance et les risques de mauvaise gestion.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
