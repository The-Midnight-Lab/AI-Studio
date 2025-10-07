import React, { useState, useRef, useEffect } from 'react';
import { Download, Edit, Lock, Video, Save, Loader2, Bot, Package } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { useAuth } from '../../context/AuthContext';
import { ANIMATION_STYLES_LIBRARY, PRODUCT_ANIMATION_STYLES_LIBRARY } from '../../constants';
import type { Animation } from '../../types';

export const ImageToolbar: React.FC = () => {
    const { 
        generatedImages, 
        activeImageIndex, 
        startEditing, 
        generatedVideoUrl, 
        studioMode, 
        generateVideoFromImage, 
        isGenerating,
        isApplyingPost,
        saveModel,
        isSavingModel,
        applyHologramEffect,
        apparelControls,
        updateApparelControl,
        productControls,
        updateProductControl,
        generatePackFromReference,
        ecommercePack,
        productEcommercePack,
        selectedModels,
        uploadedModelImage,
    } = useStudio();
    const { hasPermission, incrementGenerationsUsed } = useAuth();
    const [isAnimateMenuOpen, setAnimateMenuOpen] = useState(false);
    const animateButtonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (animateButtonRef.current && !animateButtonRef.current.contains(event.target as Node)) {
                setAnimateMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeImage = activeImageIndex !== null && generatedImages ? generatedImages[activeImageIndex] : null;
    const canUseGenerativeEdit = hasPermission('generativeEdit');
    const canUseVideoGeneration = hasPermission('videoGeneration');

    const handleEdit = () => {
        if (activeImageIndex !== null && canUseGenerativeEdit) {
            startEditing(activeImageIndex);
        }
    };
    
    const handleSaveModel = () => {
        if (activeImage) {
            saveModel(activeImage);
        }
    };

    const handleHologram = () => {
        if(activeImage) {
            applyHologramEffect();
        }
    };
    
    const handleGeneratePack = () => {
        generatePackFromReference(incrementGenerationsUsed);
    };

    const isModelSelected = !!uploadedModelImage || (selectedModels && selectedModels.length > 0);
    const animationLibrary = studioMode === 'product' && !isModelSelected ? PRODUCT_ANIMATION_STYLES_LIBRARY : ANIMATION_STYLES_LIBRARY;
    const controls = studioMode === 'apparel' ? apparelControls : productControls;
    const updateControl = (studioMode === 'apparel' ? updateApparelControl : updateProductControl) as any;
    const customAnimationPrompt = controls.customAnimationPrompt;

    const handleCustomAnimate = () => {
        if (customAnimationPrompt && customAnimationPrompt.trim()) {
            const customAnimation: Animation = {
                id: 'custom',
                name: 'Custom Animation',
                description: customAnimationPrompt.trim(),
            };
            generateVideoFromImage(customAnimation, incrementGenerationsUsed);
            setAnimateMenuOpen(false);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        if (activeImage) {
            link.href = activeImage;
            link.download = `virtual-photoshoot-${activeImageIndex + 1}.jpg`;
        } else if (generatedVideoUrl) {
            link.href = generatedVideoUrl;
            link.download = `virtual-photoshoot.mp4`;
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Shared classes for secondary buttons for consistency
    const secondaryButtonClass = "w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold text-zinc-100 bg-zinc-800 hover:bg-zinc-700 h-10 px-4 rounded-lg transition-colors border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed";
    
    // In product mode, either the on-model pack ('ecommercePack') or the product-only pack ('productEcommercePack') might be selected.
    // The button should be enabled if either is active to reflect the user's selection, even if the generation function only supports one type.
    const isPackSelected =
      studioMode === 'apparel'
        ? ecommercePack !== 'none'
        : studioMode === 'product'
        ? ecommercePack !== 'none' || productEcommercePack !== 'none'
        : false;

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center sm:justify-end gap-2 w-full">
            {activeImage && (studioMode === 'apparel' || studioMode === 'product') && (
                <div ref={animateButtonRef} className="relative w-full sm:w-auto">
                    <button
                        onClick={() => setAnimateMenuOpen(prev => !prev)}
                        disabled={!canUseVideoGeneration || isGenerating}
                        title={!canUseVideoGeneration ? 'Video generation is available on Studio and Brand plans' : 'Animate this image'}
                        className={`${secondaryButtonClass} w-full`}
                    >
                        <Video size={16} />
                        <span className="hidden lg:inline">Animate</span>
                        {!canUseVideoGeneration && <Lock size={12} className="ml-1 text-violet-400" />}
                    </button>
                    {isAnimateMenuOpen && canUseVideoGeneration && (
                        <div className="absolute bottom-full right-0 sm:right-auto sm:left-0 mb-2 w-64 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl z-20 p-2 animate-fade-in" style={{ animationDuration: '150ms' }}>
                            <p className="text-xs text-zinc-400 px-2 pb-2 border-b border-white/10 mb-1">Animation Presets</p>
                            <div className="max-h-48 overflow-y-auto pr-1">
                                {animationLibrary.map(anim => (
                                    <button
                                        key={anim.id}
                                        onClick={() => {
                                            generateVideoFromImage(anim, incrementGenerationsUsed);
                                            setAnimateMenuOpen(false);
                                        }}
                                        className="w-full text-left p-2 text-sm rounded-md hover:bg-zinc-800 transition-colors text-zinc-300"
                                    >
                                        {anim.name}
                                    </button>
                                ))}
                            </div>
                             <div className="mt-2 pt-2 border-t border-white/10">
                                <p className="text-xs text-zinc-400 px-2 mb-2">Custom Animation Prompt</p>
                                <textarea
                                    value={customAnimationPrompt || ''}
                                    onChange={(e) => updateControl('customAnimationPrompt', e.target.value)}
                                    placeholder={studioMode === 'apparel' ? "e.g., The model winks at the camera." : "e.g., A slow 360 spin."}
                                    rows={3}
                                    className="w-full p-2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 focus:ring-1 focus:ring-violet-500 text-xs transition-colors shadow-inner"
                                />
                                <button
                                    onClick={handleCustomAnimate}
                                    disabled={!customAnimationPrompt || !customAnimationPrompt.trim()}
                                    className="w-full mt-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-1.5 px-3 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Animate with Prompt
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {activeImage && studioMode === 'apparel' && (
                <button
                    onClick={handleSaveModel}
                    disabled={isSavingModel}
                    title={'Save this model to "My Agency" for consistent reuse'}
                    className={secondaryButtonClass}
                >
                    {isSavingModel ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span className="hidden lg:inline">Save Model</span>
                </button>
            )}
            {activeImage && (studioMode === 'apparel' || studioMode === 'product') && (
                <button
                    onClick={handleGeneratePack}
                    disabled={isGenerating || !isPackSelected}
                    title={!isPackSelected ? 'Select an E-commerce Pack in Settings to enable' : 'Generate pack with this model'}
                    className={secondaryButtonClass}
                >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                    <span className="hidden lg:inline">Generate Pack</span>
                </button>
            )}
            {activeImage && studioMode === 'product' && (
                 <button
                    onClick={handleHologram}
                    disabled={!canUseGenerativeEdit || isApplyingPost}
                    title={!canUseGenerativeEdit ? 'This feature is available on Studio and Brand plans' : 'Hologram Effect'}
                    className={secondaryButtonClass}
                >
                    <Bot size={16} />
                    <span className="hidden lg:inline">Hologram FX</span>
                    {!canUseGenerativeEdit && <Lock size={12} className="ml-1 text-violet-400" />}
                </button>
            )}
             {activeImage && (
                <button
                    onClick={handleEdit}
                    disabled={!canUseGenerativeEdit}
                    title={!canUseGenerativeEdit ? 'Generative Edit is available on Studio and Brand plans' : 'Edit Image'}
                    className={secondaryButtonClass}
                >
                    <Edit size={16} />
                    <span className="hidden lg:inline">Edit</span>
                    {!canUseGenerativeEdit && <Lock size={12} className="ml-1 text-violet-400" />}
                </button>
            )}

            {/* Primary Action */}
            <button
                onClick={handleDownload}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-hover h-10 px-5 rounded-lg transition-all duration-300 shadow-lg shadow-brand-glow/40 hover:shadow-xl hover:shadow-brand-glow/60"
            >
                <Download size={16} />
                <span>Download</span>
            </button>
        </div>
    );
};