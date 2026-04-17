import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Menu, X, Globe } from 'lucide-react';

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr');
  };

  return (
    <nav className="fixed w-full z-50 glass-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <span className="flex items-center gap-2 text-2xl font-bold text-white">
              <Sun className="h-8 w-8 text-soleil" />
              CoopÉnergie
            </span>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#probleme" className="hover:text-soleil-light px-3 py-2 rounded-md text-sm font-medium transition-colors">{t('nav_problem')}</a>
              <a href="#solution" className="hover:text-soleil-light px-3 py-2 rounded-md text-sm font-medium transition-colors">{t('nav_solution')}</a>
              <button 
                onClick={toggleLang}
                className="flex items-center gap-2 hover:bg-nuit border border-white/20 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer"
              >
                <Globe className="h-4 w-4" />
                {i18n.language === 'fr' ? 'EN' : 'FR'}
              </button>
            </div>
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-slate-300 hover:text-white focus:outline-none cursor-pointer">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden glass-dark border-t border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="#probleme" className="block hover:bg-nuit px-3 py-2 rounded-md text-base font-medium">{t('nav_problem')}</a>
            <a href="#solution" className="block hover:bg-nuit px-3 py-2 rounded-md text-base font-medium">{t('nav_solution')}</a>
            <button 
              onClick={toggleLang}
              className="w-full text-left flex items-center gap-2 hover:bg-nuit px-3 py-2 rounded-md text-base font-medium"
            >
              <Globe className="h-4 w-4" />
              {i18n.language === 'fr' ? 'Switch to English' : 'Passer en Français'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
