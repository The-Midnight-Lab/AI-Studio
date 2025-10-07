import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useStudio } from './context/StudioContext';
import { InputPanel } from './components/shared/InputPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { StudioView } from './components/studio/StudioView';
import { StudioModeSwitcher } from './components/shared/StudioModeSwitcher';
import { GenerateButton } from './components/shared/GenerateButton';
import { InteractiveGuide } from './components/shared/InteractiveGuide';
import { BestPracticesModal } from './components/shared/BestPracticesModal';
import { PricingModal } from './components/shared/PricingModal';
import { Wand2, User, PanelLeft, PanelRight, ChevronDown } from 'lucide-react';

const UserMenu: React.FC = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!user) return null;

    const dailyLimit = 100;
    const dailyGenerationsPercentage = Math.min(100, (user.dailyGenerationsUsed / dailyLimit) * 100);

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <User size={18} />
                <span className="hidden sm:inline text-sm font-medium">Usage Limits</span>
                <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute left-0 lg:left-auto lg:right-0 mt-2 w-72 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl z-50 p-4 animate-fade-in duration-150">
                    <div className="space-y-4 text-xs text-zinc-400">
                        <div className="flex justify-between items-center">
                            <span>Per-Minute Limit</span>
                            <span className="font-semibold text-zinc-200">10 images / min</span>
                        </div>
                        <div>
                            <div className="flex justify-between">
                                <span>Daily Limit</span>
                                <span>{user.dailyGenerationsUsed} / {dailyLimit} images</span>
                            </div>
                            <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-1">
                                <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${dailyGenerationsPercentage}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AppHeader: React.FC<{
    onInputsClick: () => void;
    onSettingsClick: () => void;
}> = ({ onInputsClick, onSettingsClick }) => {
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

    return (
        <>
            <header className="relative flex-shrink-0 p-2 border-b border-white/10 flex items-center justify-between gap-4 bg-zinc-925/70 backdrop-blur-xl z-40 shadow-lg shadow-black/20">
                {/* --- LEFT GROUP --- */}
                <div className="flex items-center justify-start gap-2 lg:flex-1">
                    {/* Mobile Inputs Button */}
                    <button onClick={onInputsClick} className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 lg:hidden" aria-label="Open inputs panel">
                        <PanelLeft size={20} />
                        <span className="font-medium text-sm hidden sm:inline">Inputs</span>
                    </button>
                    
                    {/* Moved Mobile Icons */}
                    <div className="flex items-center gap-1 sm:gap-2 lg:hidden">
                        <UserMenu />
                        <button onClick={onSettingsClick} className="p-2 rounded-lg hover:bg-zinc-800 flex items-center gap-2" aria-label="Open settings panel">
                            <span className="font-medium text-sm hidden sm:inline">Settings</span>
                            <PanelRight size={20} />
                        </button>
                    </div>

                    {/* Desktop Logo */}
                    <a href="/" className="hidden lg:flex items-center gap-2" aria-label="Go to dashboard home">
                        <Wand2 size={24} className="text-violet-400" />
                        <h1 className="hidden md:block text-lg font-bold text-zinc-100">Virtual Studio</h1>
                    </a>
                </div>

                {/* --- CENTER GROUP (Absolutely positioned on mobile) --- */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:static lg:left-auto lg:top-auto lg:translate-x-0 lg:translate-y-0 flex items-center gap-4">
                    {/* Desktop Switcher */}
                    <div className="hidden lg:flex justify-center items-center">
                        <StudioModeSwitcher />
                    </div>
                    <div id="generate-button-container">
                        <GenerateButton />
                    </div>
                </div>

                {/* --- RIGHT GROUP --- */}
                <div className="flex items-center justify-end gap-1 sm:gap-2 lg:flex-1">
                    {/* Desktop-only User Menu */}
                    <div className="hidden lg:flex">
                        <UserMenu />
                    </div>
                </div>
            </header>
            <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
        </>
    );
};


const AppContent: React.FC = () => {
    const { isGuideActive, isBestPracticesModalOpen, setBestPracticesModalOpen } = useStudio();
    const [activeMobilePanel, setActiveMobilePanel] = useState<'inputs' | 'settings' | null>(null);
    const [isLgSettingsPanelOpen, setLgSettingsPanelOpen] = useState(false);

    useEffect(() => {
        const isPanelOpen = activeMobilePanel !== null;
        if (isPanelOpen) {
            document.documentElement.classList.add('no-scroll');
            document.body.classList.add('no-scroll');
        } else {
            document.documentElement.classList.remove('no-scroll');
            document.body.classList.remove('no-scroll');
        }
        return () => {
             document.documentElement.classList.remove('no-scroll');
             document.body.classList.remove('no-scroll');
        }
    }, [activeMobilePanel]);

    return (
        <div className="bg-zinc-950 text-zinc-300 font-sans antialiased h-screen flex flex-col overflow-hidden">
            <AppHeader
                onInputsClick={() => setActiveMobilePanel('inputs')}
                onSettingsClick={() => setActiveMobilePanel('settings')}
            />
            <main className="flex-grow flex-1 flex overflow-hidden relative">
                {/* --- DESKTOP INPUTS PANEL --- */}
                <aside className="w-[380px] flex-shrink-0 hidden lg:flex flex-col border-r border-white/10">
                    <InputPanel onClose={() => {}} />
                </aside>
                
                <section className="min-w-0 flex-1 flex flex-col p-3">
                    <StudioView />
                </section>
                
                {/* --- XL+ DESKTOP SETTINGS PANEL (PERMANENT) --- */}
                <aside className="w-[420px] flex-shrink-0 hidden xl:flex flex-col border-l border-white/10">
                    <SettingsPanel onClose={() => {}} />
                </aside>

                {/* --- NEW: LG-ONLY SLIDEOUT PANEL --- */}
                {/* Handle to open panel */}
                <div className="hidden lg:block xl:hidden absolute top-1/2 right-0 -translate-y-1/2 z-30 animate-peek-in">
                    <button
                        onClick={() => setLgSettingsPanelOpen(true)}
                        className="group w-8 h-28 flex flex-col items-center justify-center gap-1.5 py-2
                                   bg-zinc-850 hover:bg-zinc-700
                                   border-y border-l border-white/10
                                   rounded-l-lg shadow-lg
                                   transition-colors duration-200
                                   focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        aria-label="Open settings panel"
                    >
                        <PanelLeft size={16} className="text-zinc-400 group-hover:text-violet-300 transition-colors duration-200"/>
                        <span
                            className="text-xs font-bold uppercase text-zinc-400 group-hover:text-violet-300 transition-colors duration-200"
                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        >
                            Settings
                        </span>
                    </button>
                </div>

                {/* The Panel */}
                <div 
                    className={`
                        absolute top-0 right-0 h-full w-[420px] bg-zinc-925/90 backdrop-blur-xl border-l border-white/10 z-20 
                        transform transition-transform duration-300 ease-in-out 
                        lg:flex xl:hidden flex-col
                        ${isLgSettingsPanelOpen ? 'translate-x-0' : 'translate-x-full'}
                    `}
                >
                    <SettingsPanel onClose={() => setLgSettingsPanelOpen(false)} isMobileView={true} />
                </div>
            </main>

            {/* --- MOBILE FULL-SCREEN PANELS --- */}
            <div className={`fixed inset-0 z-50 bg-zinc-950 transform transition-transform duration-300 ease-in-out lg:hidden ${activeMobilePanel === 'inputs' ? 'translate-x-0' : '-translate-x-full'}`}>
                <InputPanel onClose={() => setActiveMobilePanel(null)} isMobileView={true} />
            </div>

            <div className={`fixed inset-0 z-50 bg-zinc-950 transform transition-transform duration-300 ease-in-out lg:hidden ${activeMobilePanel === 'settings' ? 'translate-x-0' : 'translate-x-full'}`}>
                 <SettingsPanel onClose={() => setActiveMobilePanel(null)} isMobileView={true} />
            </div>

            {isGuideActive && <InteractiveGuide />}
            <BestPracticesModal isOpen={isBestPracticesModalOpen} onClose={() => setBestPracticesModalOpen(false)} />
        </div>
    );
};

const App: React.FC = () => (
    <AuthProvider>
        <AppContent />
    </AuthProvider>
);

export default App;