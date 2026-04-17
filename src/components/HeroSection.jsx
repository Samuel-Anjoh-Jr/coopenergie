import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';

const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background with abstract blocks representing blockchain + sun */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-nuit-dark via-nuit to-nuit-dark opacity-90"></div>
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-soleil rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-0 -left-20 w-80 h-80 bg-nuit-light rounded-full blur-[100px] opacity-30"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
          <div className="lg:col-span-6 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
              {t('hero_title').split(',')[0]},<br />
              <span className="text-gradient">
                {t('hero_title').split(',')[1] || ''}
              </span>
            </h1>
            <p className="mt-4 text-xl sm:text-2xl text-slate-300 mb-10 max-w-2xl mx-auto lg:mx-0">
              {t('hero_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <a href="#solution" className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-full text-nuit-dark bg-soleil hover:bg-soleil-light transition-all shadow-lg shadow-soleil/20 transform hover:-translate-y-1">
                {t('create_coop')}
                <ChevronRight className="ml-2 h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div className="mt-16 lg:mt-0 lg:col-span-6 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl glass-dark border border-white/10 p-2 transform transition duration-500 hover:scale-105">
              <img 
                src="/hero_image.png" 
                alt="Community with solar panels" 
                className="w-full rounded-xl object-cover"
                style={{minHeight: '400px'}}
              />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-soleil-light bg-nuit-dark flex items-center justify-center text-soleil text-xl font-bold">✓</div>
                    <div>
                      <p className="text-soleil-light font-medium text-sm">Blockchain Verified</p>
                      <p className="text-white font-bold">100% Transparent</p>
                    </div>
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

export default HeroSection;
