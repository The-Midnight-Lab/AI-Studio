export interface ReimagineCreativeControls {
    newModelDescription: string;
    newBackgroundDescription: string;
    negativePrompt: string;
}

// Add to state, not controls
export interface ReimagineState {
  reimagineSourcePhoto: string | null;
  newModelPhoto: string | null;
  reimagineControls: ReimagineCreativeControls;
}
