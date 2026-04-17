import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sun } from 'lucide-react';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-nuit-dark border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-6">
          <div className="flex items-center gap-2">
            <Sun className="h-8 w-8 text-soleil" />
            <span className="text-2xl font-bold text-white">CoopÉnergie</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-soleil transition-colors">Mentions Légales</a>
            <a href="#" className="hover:text-soleil transition-colors">Contact</a>
            <a href="#" className="hover:text-soleil transition-colors">Devenir Installateur Partenaire</a>
            <a href="#" className="hover:text-soleil transition-colors">ONG / Aide au Développement</a>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-slate-500">
          <p>{t('footer_text')} Construit pour l'avenir de l'énergie au Cameroun.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
