import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, TrendingDown, SunDim } from 'lucide-react';

const SolutionSection = () => {
  const { t } = useTranslation();

  return (
    <section id="solution" className="py-24 relative overflow-hidden bg-nuit-dark">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-nuit-light/10 via-nuit-dark to-nuit-dark"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl mb-6 text-white">
              {t('solution_title')}
            </h2>
            <p className="text-xl text-slate-300 mb-8 border-l-4 border-soleil pl-4">
              {t('solution_desc')}
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-nuit-light/30 text-soleil border border-soleil/30">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-white">{t('transparency_title')}</h3>
                  <p className="mt-1 text-slate-400 text-sm leading-relaxed">Chaque cotisation est scellée de manière immuable sur la blockchain. L'historique et les réserves sont consultables par tous les membres à tout moment.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-nuit-light/30 text-soleil border border-soleil/30">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-white">{t('savings_title')}</h3>
                  <p className="mt-1 text-slate-400 text-sm leading-relaxed">En unissant vos forces financières, vous négociez des commandes de gros auprès des installateurs, de 25 à 40% moins chers.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-nuit-light/30 text-soleil border border-soleil/30">
                    <SunDim className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-white">{t('independence_title')}</h3>
                  <p className="mt-1 text-slate-400 text-sm leading-relaxed">Libérez-vous des délestages interminables. Rejoignez les 80 000 foyers camerounais déjà autonomes grâce à l'énergie solaire.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-16 lg:mt-0 relative flex justify-center w-full">
            <div className="w-full max-w-sm relative">
              {/* Effet lumineux de fond */}
              <div className="absolute inset-0 bg-soleil/20 rounded-full blur-[80px]"></div>
              
              <div className="relative glass-dark border border-white/20 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white">Coopérative Yaoundé Sud</span>
                  <span className="text-xs bg-slate-800 text-soleil px-2 py-1 rounded">Blockchain Status</span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between glass p-4 border-l-4 border-emerald-400 rounded-lg shadow">
                    <div>
                      <span className="text-slate-400 font-mono text-[10px] block">Tx: 0x4f...9a2</span>
                      <span className="text-white text-sm font-semibold">Membre #012</span>
                    </div>
                    <span className="text-emerald-400 font-bold">+ 10 000 FCFA</span>
                  </div>
                  
                  <div className="flex items-center justify-between glass p-4 border-l-4 border-emerald-400 rounded-lg shadow">
                    <div>
                      <span className="text-slate-400 font-mono text-[10px] block">Tx: 0x8c...3b1</span>
                      <span className="text-white text-sm font-semibold">Membre #045</span>
                    </div>
                    <span className="text-emerald-400 font-bold">+ 25 000 FCFA</span>
                  </div>
                </div>

                <div className="my-2 border-t border-white/10 pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Progression objectif (Achat groupé)</span>
                    <span className="text-soleil font-bold">85%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700">
                    <div className="bg-gradient-to-r from-soleil-dark to-soleil h-full rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>

                <div className="flex items-center justify-center mt-2">
                  <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-xs font-semibold border border-emerald-500/30 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Smart Contract Actif
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
