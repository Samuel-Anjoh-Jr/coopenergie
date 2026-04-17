import React from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import ProblemSection from './components/ProblemSection';
import SolutionSection from './components/SolutionSection';
import HowItWorksSection from './components/HowItWorksSection';
import VisionMissionSection from './components/VisionMissionSection';
import Footer from './components/Footer';

function App() {
  return (
    <div className="bg-nuit-dark min-h-screen text-slate-100 font-sans selection:bg-soleil/30 selection:text-soleil">
      <Navbar />
      <HeroSection />
      <VisionMissionSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <Footer />
    </div>
  );
}

export default App;
