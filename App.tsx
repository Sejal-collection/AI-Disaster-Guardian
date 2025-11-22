import React, { useState } from 'react';
import { ShieldAlert, Globe, LayoutDashboard, Menu, X, Activity } from 'lucide-react';
import EarlyWarning from './views/EarlyWarning';
import RecoveryOps from './views/RecoveryOps';
import GlobalMonitor from './views/GlobalMonitor';

enum View {
  DASHBOARD = 'DASHBOARD',
  GLOBAL = 'GLOBAL',
  RECOVERY = 'RECOVERY'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Header - Fixed at the top */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 h-16 flex-none flex items-center px-4 md:px-6 justify-between z-50 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            AI-Disaster-<span className="text-blue-500">Guardian</span>
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setCurrentView(View.DASHBOARD)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentView === View.DASHBOARD ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Local Warning
          </button>
          <button 
            onClick={() => setCurrentView(View.GLOBAL)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentView === View.GLOBAL ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Globe className="w-4 h-4" />
            Global Map
          </button>
          <button 
            onClick={() => setCurrentView(View.RECOVERY)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentView === View.RECOVERY ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Activity className="w-4 h-4" />
            Recovery Ops
          </button>
        </nav>

        {/* Mobile Menu Toggle */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-slate-900 border-b border-slate-800 p-4 flex flex-col gap-2 z-40 shadow-2xl">
           <button 
            onClick={() => { setCurrentView(View.DASHBOARD); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-md text-sm font-medium text-left ${currentView === View.DASHBOARD ? 'bg-blue-900/30 text-blue-400' : 'text-slate-400'}`}
          >
            Local Warning
          </button>
          <button 
            onClick={() => { setCurrentView(View.GLOBAL); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-md text-sm font-medium text-left ${currentView === View.GLOBAL ? 'bg-blue-900/30 text-blue-400' : 'text-slate-400'}`}
          >
            Global Map
          </button>
          <button 
            onClick={() => { setCurrentView(View.RECOVERY); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-md text-sm font-medium text-left ${currentView === View.RECOVERY ? 'bg-blue-900/30 text-blue-400' : 'text-slate-400'}`}
          >
            Recovery Operations
          </button>
        </div>
      )}

      {/* Main Content - Scrollable Area with Smooth Scroll - Force Scrollbar */}
      <main className="flex-1 overflow-y-scroll custom-scrollbar scroll-smooth relative">
        <div className="max-w-7xl mx-auto p-4 md:p-6 pb-20">
          {currentView === View.DASHBOARD ? (
            <EarlyWarning />
          ) : currentView === View.GLOBAL ? (
            <GlobalMonitor />
          ) : (
            <RecoveryOps />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;