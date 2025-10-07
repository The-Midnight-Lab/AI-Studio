import {
  StudioMode,
  Scene,
  AspectRatio,
  Animation,
  ColorGrade,
  Look,
  Background,
  User
} from '../types';
import {
  ASPECT_RATIOS_LIBRARY,
  BACKGROUNDS_LIBRARY,
  LIGHTING_PRESETS,
  ECOMMERCE_PACKS,
  SOCIAL_MEDIA_PACK_SHOT_IDS,
  MOCKUP_PACK_SHOTS_3,
  MOCKUP_PACK_SHOTS_4,
  PRODUCT_ECOMMERCE_PACKS,
  SHOT_TYPES_LIBRARY,
  EXPRESSIONS,
  CAMERA_ANGLES_LIBRARY,
  FOCAL_LENGTHS_LIBRARY,
  CAMERA_ANGLES_LIBRARY_PRODUCT,
} from '../constants';
import { promptService } from '../services/promptService';
import { geminiService } from '../services/geminiService';
import type { StudioStoreSlice } from './StudioContext';
import { withRetry } from '../utils/colorUtils';
import { PLAN_DETAILS } from '../services/permissionsService';

let generationController: AbortController | null = null;

const initialScene: Scene = {
    background: BACKGROUNDS_LIBRARY[0],
    lighting: LIGHTING_PRESETS[1], // Studio Softbox
    timeOfDay: null,
    sceneProps: '',
    environmentalEffects: '',
};

export interface SharedState {
  studioMode: StudioMode;
  scene: Scene;
  aspectRatio: AspectRatio;
  numberOfImages: number;
  isGenerating: boolean;
  loadingMessage: string;
  generatedImages: (string | null)[] | null;
  activeImageSources: { web: { uri: string; title: string; } }[] | null;
  generatedVideoUrl: string | null;
  videoSourceImage: string | null; // For video thumbnail
  activeImageIndex: number | null;
  error: string | null;
  generationCount: number;
  styleReferenceImage: string | null;
  isEditing: boolean;
  imageBeingEdited: { original: string; index: number } | null;
  isApplyingEdit: boolean;
  isApplyingPost: boolean;
  isGuideActive: boolean;
  isBestPracticesModalOpen: boolean;
  isGeneratingBackground: boolean;
  requestTimestamps: number[];
}

export interface SharedActions {
  setStudioMode: (mode: StudioMode) => void;
  updateScene: (updates: Partial<Scene>) => void;
  selectAspectRatio: (aspectRatio: AspectRatio) => void;
  setNumberOfImages: (count: number) => void;
  setActiveImageIndex: (index: number | null) => void;
  clearError: () => void;
  generateAsset: (user: User | null, onGenerationComplete: (count: number) => Promise<void>) => Promise<void>;
  cancelCurrentProcess: () => void;
  setStyleReferenceImage: (base64: string | null) => void;
  startEditing: (index: number) => void;
  cancelEditing: () => void;
  applyGenerativeEdit: (maskB64: string, prompt: string, apparelRefB64?: string | null) => Promise<void>;
  revertEdit: () => void;
  applyColorGrade: (grade: ColorGrade) => Promise<void>;
  applyRealismBoost: () => Promise<void>;
  applyFilmGrain: (strength: 'Subtle' | 'Medium') => Promise<void>;
  applyHologramEffect: () => Promise<void>;
  generateVideoFromImage: (animation: Animation, onGenerationComplete: (count: number) => Promise<void>) => Promise<void>;
  generatePackFromReference: (onGenerationComplete: (count: number) => Promise<void>) => Promise<void>;
  generateColorways: (colors: string[], onGenerationComplete: (count: number) => Promise<void>) => Promise<void>;
  generateAIBackground: (prompt: string) => Promise<void>;
  setGuideActive: (isActive: boolean) => void;
  setBestPracticesModalOpen: (isOpen: boolean) => void;
}

export type SharedSlice = SharedState & SharedActions;

const initialSharedState: SharedState = {
    studioMode: 'apparel',
    scene: initialScene,
    aspectRatio: ASPECT_RATIOS_LIBRARY[0],
    numberOfImages: 1,
    isGenerating: false,
    loadingMessage: 'Generating your vision...',
    generatedImages: null,
    activeImageSources: null,
    generatedVideoUrl: null,
    videoSourceImage: null,
    activeImageIndex: null,
    error: null,
    generationCount: 0,
    styleReferenceImage: null,
    isEditing: false,
    imageBeingEdited: null,
    isApplyingEdit: false,
    isApplyingPost: false,
    isGuideActive: false,
    isBestPracticesModalOpen: false,
    isGeneratingBackground: false,
    requestTimestamps: [],
};


export const createSharedSlice: StudioStoreSlice<SharedSlice> = (set, get) => ({
  ...initialSharedState,

  setStudioMode: (mode) => set({ studioMode: mode }),

  updateScene: (updates) => {
    set(state => ({ scene: { ...state.scene, ...updates } }));
  },

  selectAspectRatio: (aspectRatio) => set({ aspectRatio }),

  setNumberOfImages: (count) => set({ numberOfImages: count }),

  setActiveImageIndex: (index) => set({ activeImageIndex: index, generatedVideoUrl: null }),

  clearError: () => set({ error: null }),
  
  setStyleReferenceImage: (base64) => set({ styleReferenceImage: base64 }),

  cancelCurrentProcess: () => {
    if (generationController) {
      generationController.abort();
    }
    set({ isGenerating: false, loadingMessage: '' });
  },

  generateAsset: async (user, onGenerationComplete) => {
    // --- RATE LIMIT TRACKING ---
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentTimestamps = get().requestTimestamps.filter(ts => ts > oneMinuteAgo);
    set({ requestTimestamps: [...recentTimestamps, now] });
    // --- END RATE LIMIT TRACKING ---

    set({
      isGenerating: true,
      error: null,
      generatedImages: null,
      generatedVideoUrl: null,
      activeImageIndex: 0,
      loadingMessage: 'Preparing your vision...',
    });

    const { studioMode } = get();
    
    const onRetry = (attempt: number, delay: number) => {
        set({ loadingMessage: `API is busy. Retrying in ${Math.ceil(delay / 1000)}s... (Attempt ${attempt})` });
    };

    try {
      const state = get();
      if (studioMode === 'apparel') {
        const { parts } = promptService.generatePrompt({ 
            studioMode: 'apparel',
            generationMode: 'image',
            styleDescription: state.styleReferenceImage ? 'User provided style reference' : undefined,
            aspectRatio: state.aspectRatio.value,
            uploadedModelImage: state.uploadedModelImage,
            selectedModels: state.selectedModels,
            apparel: state.apparel,
            scene: state.scene,
            promptedModelDescription: state.promptedModelDescription,
            modelLightingDescription: state.modelLightingDescription,
            apparelControls: state.apparelControls,
        });
        const { numberOfImages, apparelControls } = state;
        await withRetry(() => geminiService.generatePhotoshootImage(parts, state.aspectRatio.value, numberOfImages, apparelControls.negativePrompt, (imageB64, index) => {
          set(currentState => {
            const newImages = [...(currentState.generatedImages || Array(numberOfImages).fill(null))];
            newImages[index] = imageB64;
            return { generatedImages: newImages };
          });
        }), { onRetry });
        await onGenerationComplete(numberOfImages);

      } else if (studioMode === 'product') {
        const { productEcommercePack, ecommercePack, selectedModels, uploadedModelImage } = state;
        const isModelSelected = !!uploadedModelImage || (selectedModels && selectedModels.length > 0);
    
        if (isModelSelected && ecommercePack !== 'none') {
            const pack = ECOMMERCE_PACKS[ecommercePack];
            const packShots = pack.shots;
            set({ generatedImages: Array(packShots.length).fill(null), activeImageIndex: 0, loadingMessage: `Generating ${pack.name}... (1/${packShots.length})` });
    
            for (const [index, shot] of packShots.entries()) {
                set({ loadingMessage: `Generating ${pack.name}... (${index + 1}/${packShots.length})` });
                const currentState = get();
                const shotType = SHOT_TYPES_LIBRARY.find(s => s.id === shot.shotId) || currentState.productControls.shotType;
                const expression = EXPRESSIONS.find(e => e.id === shot.expressionId) || currentState.productControls.expression;
                const cameraAngle = CAMERA_ANGLES_LIBRARY.find(c => c.id === shot.cameraAngleId) || currentState.productControls.cameraAngle;
    
                const overriddenControls = { ...currentState.productControls, shotType, expression, cameraAngle };
                
                const { parts } = promptService.generatePrompt({
                    studioMode: 'product',
                    generationMode: 'image',
                    styleDescription: currentState.styleReferenceImage ? 'User provided style reference' : undefined,
                    aspectRatio: currentState.aspectRatio.value,
                    productImage: currentState.productImage,
                    stagedAssets: currentState.stagedAssets,
                    scene: currentState.scene,
                    productControls: overriddenControls,
                    uploadedModelImage: currentState.uploadedModelImage,
                    selectedModels: currentState.selectedModels,
                    promptedModelDescription: currentState.promptedModelDescription,
                });
    
                await withRetry(() => geminiService.generatePhotoshootImage(parts, currentState.aspectRatio.value, 1, overriddenControls.negativePrompt, (imageB64) => {
                    set(s => {
                        const newImages = [...(s.generatedImages || [])];
                        if (newImages.length > index) newImages[index] = imageB64;
                        return { generatedImages: newImages };
                    });
                }), { onRetry });
            }
    
            await onGenerationComplete(packShots.length);
    
        } else if (!isModelSelected && productEcommercePack !== 'none') {
            const pack = PRODUCT_ECOMMERCE_PACKS[productEcommercePack];
            const packShots = pack.shots;
            set({ generatedImages: Array(packShots.length).fill(null), activeImageIndex: 0, loadingMessage: `Generating ${pack.name}... (1/${packShots.length})` });
    
            for (const [index, shot] of packShots.entries()) {
                set({ loadingMessage: `Generating ${pack.name}... (${index + 1}/${packShots.length})` });
                const currentState = get();
                
                const cameraAngle = CAMERA_ANGLES_LIBRARY_PRODUCT.find(c => c.id === shot.cameraAngleId) || currentState.productControls.cameraAngle;
                const focalLength = FOCAL_LENGTHS_LIBRARY.find(f => f.id === shot.focalLengthId) || currentState.productControls.focalLength;
    
                const overriddenControls = { ...currentState.productControls, cameraAngle, focalLength };
                
                const { parts } = promptService.generatePrompt({
                    studioMode: 'product',
                    generationMode: 'image',
                    styleDescription: currentState.styleReferenceImage ? 'User provided style reference' : undefined,
                    aspectRatio: currentState.aspectRatio.value,
                    productImage: currentState.productImage,
                    stagedAssets: currentState.stagedAssets,
                    scene: currentState.scene,
                    productControls: overriddenControls,
                    uploadedModelImage: currentState.uploadedModelImage,
                    selectedModels: currentState.selectedModels,
                    promptedModelDescription: currentState.promptedModelDescription,
                });
    
                await withRetry(() => geminiService.generatePhotoshootImage(parts, currentState.aspectRatio.value, 1, overriddenControls.negativePrompt, (imageB64) => {
                    set(s => {
                        const newImages = [...(s.generatedImages || [])];
                        if (newImages.length > index) newImages[index] = imageB64;
                        return { generatedImages: newImages };
                    });
                }), { onRetry });
            }
    
            await onGenerationComplete(packShots.length);
    
        } else {
            const { parts } = promptService.generatePrompt({
                studioMode: 'product',
                generationMode: 'image',
                styleDescription: state.styleReferenceImage ? 'User provided style reference' : undefined,
                aspectRatio: state.aspectRatio.value,
                productImage: state.productImage,
                stagedAssets: state.stagedAssets,
                scene: state.scene,
                productControls: state.productControls,
                uploadedModelImage: state.uploadedModelImage,
                selectedModels: state.selectedModels,
                promptedModelDescription: state.promptedModelDescription,
            });
            const { numberOfImages, productControls } = state;
            await withRetry(() => geminiService.generatePhotoshootImage(parts, state.aspectRatio.value, numberOfImages, productControls.negativePrompt, (imageB64, index) => {
                set(s => {
                    const newImages = [...(s.generatedImages || Array(numberOfImages).fill(null))];
                    newImages[index] = imageB64;
                    return { generatedImages: newImages };
                });
            }), { onRetry });
            await onGenerationComplete(numberOfImages);
        }
      } else if (studioMode === 'design') {
          const { parts } = promptService.generatePrompt({
              studioMode: 'design',
              shotView: 'front',
              styleDescription: state.styleReferenceImage ? 'User provided style reference' : undefined,
              aspectRatio: state.aspectRatio.value,
              mockupImage: state.mockupImage!,
              designImage: state.designImage!,
              backDesignImage: state.backDesignImage,
              designPlacementControls: state.designPlacementControls,
              scene: state.scene,
          });
          const { numberOfImages } = state;
          await withRetry(() => geminiService.generatePhotoshootImage(parts, state.aspectRatio.value, numberOfImages, undefined, (imageB64, index) => {
             set(s => {
                const newImages = [...(s.generatedImages || Array(numberOfImages).fill(null))];
                newImages[index] = imageB64;
                return { generatedImages: newImages };
            });
          }), { onRetry });
          await onGenerationComplete(numberOfImages);
      } else if (studioMode === 'reimagine') {
        const { parts } = promptService.generatePrompt({
            studioMode: 'reimagine',
            styleDescription: state.styleReferenceImage ? 'User provided style reference' : undefined,
            aspectRatio: state.aspectRatio.value,
            reimagineSourcePhoto: state.reimagineSourcePhoto!,
            newModelPhoto: state.newModelPhoto,
            reimagineControls: state.reimagineControls,
        });
        const { numberOfImages, reimagineControls } = state;
        await withRetry(() => geminiService.generatePhotoshootImage(parts, state.aspectRatio.value, numberOfImages, reimagineControls.negativePrompt, (imageB64, index) => {
            set(s => {
                const newImages = [...(s.generatedImages || Array(numberOfImages).fill(null))];
                newImages[index] = imageB64;
                return { generatedImages: newImages };
            });
        }), { onRetry });
        await onGenerationComplete(numberOfImages);
      }
    } catch (e: any) {
      console.error(e);
      set({ error: e.message || 'An unknown error occurred during generation.' });
    } finally {
      set({ isGenerating: false, generationCount: get().generationCount + 1 });
    }
  },

  startEditing: (index) => {
    const original = get().generatedImages?.[index];
    if (original) {
      set({ isEditing: true, imageBeingEdited: { original, index }, error: null });
    }
  },

  cancelEditing: () => {
    const { imageBeingEdited } = get();
    if(imageBeingEdited) {
       set(state => {
         const newImages = [...(state.generatedImages || [])];
         newImages[imageBeingEdited.index] = imageBeingEdited.original;
         return {
           isEditing: false,
           imageBeingEdited: null,
           generatedImages: newImages,
         }
       })
    } else {
        set({ isEditing: false, imageBeingEdited: null });
    }
  },
  
  revertEdit: () => {
      const { imageBeingEdited } = get();
      if(imageBeingEdited) {
          set(state => {
             const newImages = [...(state.generatedImages || [])];
             newImages[imageBeingEdited.index] = imageBeingEdited.original;
             return { generatedImages: newImages, generationCount: state.generationCount + 1 };
          });
      }
  },
  
  applyGenerativeEdit: async (maskB64, prompt, apparelRefB64) => {
    const { activeImageIndex, generatedImages } = get();
    if (activeImageIndex === null || !generatedImages?.[activeImageIndex]) return;

    set({ isApplyingEdit: true, error: null, loadingMessage: 'Applying generative edit...' });
    const onRetry = (attempt: number, delay: number) => {
        set({ loadingMessage: `API is busy. Retrying in ${Math.ceil(delay / 1000)}s... (Attempt ${attempt})` });
    };

    try {
      const originalImageB64 = generatedImages[activeImageIndex]!;
      const result = await withRetry(() => geminiService.generativeEdit({
        originalImageB64,
        maskImageB64: maskB64,
        prompt,
        apparelImageB64: apparelRefB64
      }), { onRetry });
      set(state => {
        const newImages = [...(state.generatedImages || [])];
        newImages[activeImageIndex] = result;
        return {
          generatedImages: newImages,
          generationCount: state.generationCount + 1,
        };
      });
    } catch (e: any) {
      set({ error: e.message || "Generative edit failed." });
    } finally {
      set({ isApplyingEdit: false });
    }
  },
  
  applyColorGrade: async(grade) => {},
  applyRealismBoost: async() => {},
  applyFilmGrain: async(strength) => {},
  applyHologramEffect: async() => {},
  generateVideoFromImage: async (animation, onGenerationComplete) => {
    const { studioMode, activeImageIndex, generatedImages } = get();
    if (activeImageIndex === null || !generatedImages || !generatedImages[activeImageIndex]) {
        set({ error: "No reference image selected to generate a video from." });
        return;
    }
    const referenceImageB64 = generatedImages[activeImageIndex];

    set({
        isGenerating: true,
        error: null,
        generatedVideoUrl: null,
        videoSourceImage: referenceImageB64,
        loadingMessage: `Animating your image...`,
        activeImageIndex: null, // Switch view to video player
    });
    
    const onRetry = (attempt: number, delay: number) => {
        set({ loadingMessage: `API is busy. Retrying in ${Math.ceil(delay / 1000)}s... (Attempt ${attempt})` });
    };

    generationController = new AbortController();
    const signal = generationController.signal;

    try {
        let promptParams: any;
        const state = get();

        if (studioMode === 'apparel') {
            promptParams = {
                studioMode: 'apparel',
                generationMode: 'video',
                animation,
                styleDescription: state.styleReferenceImage ? 'User provided style reference' : undefined,
                aspectRatio: state.aspectRatio.value,
                uploadedModelImage: state.uploadedModelImage,
                selectedModels: state.selectedModels,
                apparel: state.apparel,
                scene: state.scene,
                promptedModelDescription: state.promptedModelDescription,
                modelLightingDescription: state.modelLightingDescription,
                apparelControls: state.apparelControls,
            };
        } else if (studioMode === 'product') {
            promptParams = {
                studioMode: 'product',
                generationMode: 'video',
                animation,
                styleDescription: state.styleReferenceImage ? 'User provided style reference' : undefined,
                aspectRatio: state.aspectRatio.value,
                productImage: state.productImage,
                stagedAssets: state.stagedAssets,
                scene: state.scene,
                productControls: state.productControls,
                uploadedModelImage: state.uploadedModelImage,
                selectedModels: state.selectedModels,
                promptedModelDescription: state.promptedModelDescription,
            };
        } else {
            throw new Error("Video generation is not supported in this mode.");
        }

        const { parts } = promptService.generatePrompt(promptParams);
        const textPrompt = parts.find(p => 'text' in p)?.text || '';
        if (!textPrompt) throw new Error("Could not generate a valid prompt for video generation.");

        set({ loadingMessage: 'Sending to video model...' });
        let operation = await withRetry(() => geminiService.generatePhotoshootVideo(textPrompt, referenceImageB64), { onRetry });
        
        if (signal.aborted) return;
        
        set({ loadingMessage: 'Video is processing... This may take a few minutes.' });
        
        while (!operation.done) {
            if (signal.aborted) {
                // TODO: Add cancellation logic on the backend if available
                console.log('Video generation cancelled by user.');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            if (signal.aborted) return;
            operation = await geminiService.getVideoOperationStatus(operation);
        }

        if (signal.aborted) return;
        
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            set({ loadingMessage: 'Fetching final video...' });
            const blobUrl = await geminiService.fetchVideoAsBlobUrl(downloadLink);
            if (signal.aborted) {
                URL.revokeObjectURL(blobUrl);
                return;
            }
            set({ generatedVideoUrl: blobUrl });
            await onGenerationComplete(1); // Consumes 1 generation credit
        } else {
            throw new Error("Video generation completed but no video URL was returned.");
        }

    } catch (e: any) {
        if (e.name === 'AbortError' || signal.aborted) {
            console.log('Video generation cancelled by user.');
            return;
        }
        console.error("Failed to generate video:", e);
        set({ error: e.message || "An unknown error occurred during video generation." });
    } finally {
        set({ isGenerating: false, loadingMessage: '' });
        generationController = null;
    }
},
  generatePackFromReference: async (onGenerationComplete) => {
    const { studioMode, activeImageIndex, generatedImages } = get();
    if (activeImageIndex === null || !generatedImages || !generatedImages[activeImageIndex]) {
      set({ error: "No reference image selected to generate a pack." });
      return;
    }

    const referenceImageB64 = generatedImages[activeImageIndex];

    set({
      isGenerating: true,
      error: null,
      generatedVideoUrl: null,
      videoSourceImage: null,
      loadingMessage: `Generating asset pack...`,
    });
    
    const onRetry = (attempt: number, delay: number) => {
        set({ loadingMessage: `API is busy. Retrying in ${Math.ceil(delay / 1000)}s... (Attempt ${attempt})` });
    };

    try {
      if (studioMode === 'apparel') {
        const { ecommercePack } = get();
        if (ecommercePack === 'none') throw new Error("No e-commerce pack is selected in the settings.");
        
        const pack = ECOMMERCE_PACKS[ecommercePack];
        const packShots = pack.shots;

        set({ generatedImages: Array(packShots.length).fill(null), activeImageIndex: 0 });

        for (const [index, shot] of packShots.entries()) {
            const state = get();
            const shotType = SHOT_TYPES_LIBRARY.find(s => s.id === shot.shotId) || state.apparelControls.shotType;
            const expression = EXPRESSIONS.find(e => e.id === shot.expressionId) || state.apparelControls.expression;
            const cameraAngle = CAMERA_ANGLES_LIBRARY.find(c => c.id === shot.cameraAngleId) || state.apparelControls.cameraAngle;

            const overriddenControls = { ...state.apparelControls, shotType, expression, cameraAngle };

            const { parts } = promptService.generatePrompt({
                studioMode: 'apparel',
                generationMode: 'image',
                apparelControls: overriddenControls,
                baseLookImageB64: referenceImageB64,
                styleDescription: state.styleReferenceImage ? 'User provided style reference' : undefined,
                aspectRatio: state.aspectRatio.value,
                uploadedModelImage: state.uploadedModelImage,
                selectedModels: state.selectedModels,
                apparel: state.apparel,
                scene: state.scene,
                promptedModelDescription: state.promptedModelDescription,
                modelLightingDescription: state.modelLightingDescription,
            });

            await withRetry(() => geminiService.generatePhotoshootImage(parts, state.aspectRatio.value, 1, overriddenControls.negativePrompt, (imageB64) => {
                set(currentState => {
                    const newImages = [...(currentState.generatedImages || [])];
                    if (newImages.length > index) newImages[index] = imageB64;
                    return { generatedImages: newImages };
                });
            }), { onRetry });
        }
        await onGenerationComplete(packShots.length);

      } else if (studioMode === 'product') {
        const { ecommercePack, productEcommercePack } = get();

        // This function only supports on-model pack generation, which uses `ecommercePack`.
        if (ecommercePack === 'none') {
            if (productEcommercePack !== 'none') {
                // If the user selected a product-only pack, guide them with a specific error.
                throw new Error("Generating a pack from a reference image is for on-model shots. Please select a model and choose a pack from the 'E-commerce Pack' options.");
            } else {
                throw new Error("Select an E-commerce Pack in Settings for on-model pack generation.");
            }
        }
        
        const pack = ECOMMERCE_PACKS[ecommercePack];
        const packShots = pack.shots;

        set({ generatedImages: Array(packShots.length).fill(null), activeImageIndex: 0 });
        
        for (const [index, shot] of packShots.entries()) {
            const state = get();
            const shotType = SHOT_TYPES_LIBRARY.find(s => s.id === shot.shotId) || state.productControls.shotType;
            const expression = EXPRESSIONS.find(e => e.id === shot.expressionId) || state.productControls.expression;
            const cameraAngle = CAMERA_ANGLES_LIBRARY.find(c => c.id === shot.cameraAngleId) || state.productControls.cameraAngle;
            
            const overriddenControls = { ...state.productControls, shotType, expression, cameraAngle };

            const { parts } = promptService.generatePrompt({
                studioMode: 'product',
                generationMode: 'image',
                productControls: overriddenControls,
                modelReferenceImage: referenceImageB64, 
                styleDescription: state.styleReferenceImage ? 'User provided style reference' : undefined,
                aspectRatio: state.aspectRatio.value,
                productImage: state.productImage,
                stagedAssets: state.stagedAssets,
                scene: state.scene,
                uploadedModelImage: state.uploadedModelImage,
                selectedModels: state.selectedModels,
                promptedModelDescription: state.promptedModelDescription,
            });

            await withRetry(() => geminiService.generatePhotoshootImage(parts, state.aspectRatio.value, 1, overriddenControls.negativePrompt, (imageB64) => {
                set(currentState => {
                    const newImages = [...(currentState.generatedImages || [])];
                    if (newImages.length > index) newImages[index] = imageB64;
                    return { generatedImages: newImages };
                });
            }), { onRetry });
        }

        await onGenerationComplete(packShots.length);
      } else {
        throw new Error("Pack generation is not available in this mode.");
      }
    } catch (e: any) {
      console.error(e);
      set({ error: e.message || 'An unknown error occurred during pack generation.' });
    } finally {
      set({ isGenerating: false, generationCount: get().generationCount + 1 });
    }
  },
  generateColorways: async(colors, onGenerationComplete) => {},
  
  generateAIBackground: async (prompt) => {
    set({ isGeneratingBackground: true, error: null });
    try {
      const imageB64 = await withRetry(() => geminiService.generateWithImagen(prompt, '16:9'));
      const newBg: Background = {
        id: 'custom',
        name: 'AI: ' + prompt.substring(0, 20) + '...',
        type: 'image',
        value: imageB64,
        category: 'Custom'
      };
      get().updateScene({ background: newBg });
    } catch(e: any) {
      set({ error: "Failed to generate AI background. " + e.message });
    } finally {
      set({ isGeneratingBackground: false });
    }
  },

  setGuideActive: (isActive) => set({ isGuideActive: isActive }),
  setBestPracticesModalOpen: (isOpen) => set({ isBestPracticesModalOpen: isOpen }),
});