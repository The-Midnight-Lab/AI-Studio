import type { ReimagineCreativeControls, ReimagineState } from '../types';
import type { StudioStoreSlice } from './StudioContext';

export interface ReimagineActions {
  setReimagineSourcePhoto: (base64: string | null) => void;
  setNewModelPhoto: (base64: string | null) => void;
  updateReimagineControl: <K extends keyof ReimagineCreativeControls>(key: K, value: ReimagineCreativeControls[K]) => void;
}

export type ReimagineSlice = ReimagineState & ReimagineActions;

const initialReimagineState: ReimagineState = {
  reimagineSourcePhoto: null,
  newModelPhoto: null,
  reimagineControls: {
    newModelDescription: '',
    newBackgroundDescription: '',
    negativePrompt: 'deformed, disfigured, poor quality, bad anatomy, extra limbs, blurry, text, watermark, logo',
  },
};

export const createReimagineSlice: StudioStoreSlice<ReimagineSlice> = (set, get) => ({
  ...initialReimagineState,

  setReimagineSourcePhoto: (base64) => {
    set({ reimagineSourcePhoto: base64, generatedImages: null, activeImageIndex: null, error: null });
    if (base64) {
      // Clear other mode inputs when a source photo is uploaded
      set({
        uploadedModelImage: null,
        selectedModels: [],
        apparel: [],
        productImage: null,
        mockupImage: null,
        designImage: null,
      });
    }
  },

  setNewModelPhoto: (base64) => {
    set({ newModelPhoto: base64 });
    // Using a photo for the model is a strong intent, we can clear the text description
    // to avoid potential conflicts in the prompt. The user can still type a new one.
    if (base64) {
      get().updateReimagineControl('newModelDescription', '');
    }
  },

  updateReimagineControl: (key, value) => {
    set(state => ({
      reimagineControls: { ...state.reimagineControls, [key]: value }
    }));
  },
});