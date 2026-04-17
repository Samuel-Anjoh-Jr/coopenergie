import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Target } from 'lucide-react';

const VisionMissionSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-nuit-dark relative overflow-hidden border-t border-white/5">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-soleil/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          <div className="glass-dark p-10 rounded-3xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 border border-white/10 hover:border-soleil/30 shadow-2xl shadow-black/50">
            <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-500 blur-sm">
              <Eye className="h-48 w-48 text-soleil" />
            </div>
            <div className="relative z-10">
              <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-soleil/10 transition-colors duration-300">
                <Eye className="h-8 w-8 text-soleil" />
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-6 tracking-tight">
                {t('vision_title')}
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed font-light">
                {t('vision_desc')}
              </p>
            </div>
          </div>

          <div className="glass-dark p-10 rounded-3xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 border border-white/10 hover:border-soleil/30 shadow-2xl shadow-black/50">
            <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-500 blur-sm">
              <Target className="h-48 w-48 text-soleil" />
            </div>
            <div className="relative z-10">
              <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-soleil/10 transition-colors duration-300">
                <Target className="h-8 w-8 text-soleil" />
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-6 tracking-tight">
                {t('mission_title')}
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed font-light">
                {t('mission_desc')}
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default VisionMissionSection;
