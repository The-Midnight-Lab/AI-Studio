import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { AspectRatio, ArtDirectorSuggestion, ApparelCategory, AIModel, SceneSuggestion } from "../types";
import { BACKGROUNDS_LIBRARY, LIGHTING_PRESETS, SHOT_TYPES_LIBRARY, EXPRESSIONS, APERTURES_LIBRARY, FOCAL_LENGTHS_LIBRARY, CAMERA_ANGLES_LIBRARY, COLOR_GRADING_PRESETS } from "../constants";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Using mock service.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Helper to parse Data URL
const parseDataUrl = (dataUrl: string) => {
    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid data URL");
    }
    return {
        mimeType: match[1],
        data: match[2],
    };
};


// --- MOCK FUNCTIONS for development without API KEY ---
const mockGenerateImage = async (baseParts: any[], aspectRatio: AspectRatio['value'], numberOfImages: number, negativePrompt: string | undefined, onImageGenerated: (imageB64: string, index: number) => void): Promise<void> => {
    console.log("--- MOCK API CALL: generatePhotoshootImage ---");
    console.log("Parts:", baseParts);
    console.log("Aspect Ratio:", aspectRatio);
    console.log("Number of Images:", numberOfImages);
    if (negativePrompt) console.log("Negative Prompt:", negativePrompt);
    
    const textPart = baseParts.find(p => p.text)?.text || '';

    let width = 1024;
    let height = 1365; // default 3:4
    if (aspectRatio === '1:1') { width = 1024; height = 1024; }
    if (aspectRatio === '4:3') { width = 1024; height = 768; }
    if (aspectRatio === '16:9') { width = 1280; height = 720; }
    
    const generationPromises = Array.from({ length: numberOfImages }).map(async (_, i) => {
        // Simulate varying generation times
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
        
        const seed = (textPart.length % 100) + i;
        const imageUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            onImageGenerated(base64, i);
        } catch (error) {
            console.error("Error fetching mock image:", error);
            // In a real scenario, you might want to signal an error for this specific image
        }
    });
    
    await Promise.all(generationPromises);
};

const mockGenerateWithImagen = async (prompt: string, aspectRatio: AspectRatio['value']): Promise<string> => {
    console.log("--- MOCK API CALL: generateWithImagen ---");
    console.log("Prompt:", prompt);
    console.log("Aspect Ratio:", aspectRatio);
    await new Promise(resolve => setTimeout(resolve, 2000));
    let width = 1024;
    let height = 1365; // default 3:4
    if (aspectRatio === '1:1') { width = 1024; height = 1024; }
    if (aspectRatio === '4:3') { width = 1024; height = 768; }
    if (aspectRatio === '16:9') { width = 1280; height = 720; }
    if (aspectRatio === '9:16') { width = 720; height = 1280; }
    const seed = (prompt.length % 100);
    const imageUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const mockDescribeImageStyle = async (imageB64: string): Promise<string> => {
    console.log("--- MOCK API CALL: describeImageStyle ---");
    await new Promise(resolve => setTimeout(resolve, 800));
    return "A moody, cinematic style with high contrast, desaturated colors, a slight blue tint in the shadows, and a soft, diffused lighting effect from the side. The overall feeling is melancholic and dramatic.";
};

const mockGetArtDirectorSuggestions = async (garmentImageB64: string): Promise<ArtDirectorSuggestion[]> => {
    console.log("--- MOCK API CALL: getArtDirectorSuggestion ---");
    await new Promise(resolve => setTimeout(resolve, 1200));
    return [
        {
            id: 'concept-1',
            conceptName: "E-commerce Clean",
            shotTypeId: SHOT_TYPES_LIBRARY[0].id, // Full Body Front
            lightingId: LIGHTING_PRESETS[1].id, // Studio Softbox
            backgroundId: BACKGROUNDS_LIBRARY[1].id, // Studio Grey
            expressionId: EXPRESSIONS[1].id, // Soft Smile
            apertureId: APERTURES_LIBRARY[2].id, // Deep (f/8)
            focalLengthId: FOCAL_LENGTHS_LIBRARY[2].id, // 50mm
            cameraAngleId: CAMERA_ANGLES_LIBRARY[0].id, // Eye-Level
            colorGradeId: COLOR_GRADING_PRESETS[3].id, // Vibrant & Punchy
            reasoning: "A clean, bright, and approachable look perfect for e-commerce. Studio lighting and a simple background ensure the garment is the hero of the shot."
        },
        {
            id: 'concept-2',
            conceptName: "Urban Lifestyle",
            shotTypeId: SHOT_TYPES_LIBRARY[4].id, // Walking Motion
            lightingId: LIGHTING_PRESETS[8].id, // Overcast Day
            backgroundId: BACKGROUNDS_LIBRARY[3].id, // City Street
            expressionId: EXPRESSIONS[3].id, // Joyful
            apertureId: APERTURES_LIBRARY[1].id, // Mid-range
            focalLengthId: FOCAL_LENGTHS_LIBRARY[1].id, // 35mm
            cameraAngleId: CAMERA_ANGLES_LIBRARY[0].id, // Eye-Level
            colorGradeId: COLOR_GRADING_PRESETS[0].id, // None
            reasoning: "A dynamic, in-motion shot that feels authentic and relatable for social media. The overcast light provides soft, flattering shadows for a natural feel."
        },
        {
            id: 'concept-3',
            conceptName: "Dramatic Editorial",
            shotTypeId: SHOT_TYPES_LIBRARY[8].id, // Hero Pose
            lightingId: LIGHTING_PRESETS[2].id, // Dramatic Hard Light
            backgroundId: BACKGROUNDS_LIBRARY[7].id, // Brutalist Arch
            expressionId: EXPRESSIONS[4].id, // Serious
            apertureId: APERTURES_LIBRARY[0].id, // Shallow
            focalLengthId: FOCAL_LENGTHS_LIBRARY[3].id, // 85mm
            cameraAngleId: CAMERA_ANGLES_LIBRARY[1].id, // Low Angle
            colorGradeId: COLOR_GRADING_PRESETS[2].id, // High-Contrast B&W
            reasoning: "A powerful, high-fashion concept. The low-angle hero pose combined with dramatic hard light and a B&W grade creates a striking, artistic, and memorable image."
        },
        {
            id: 'concept-4',
            conceptName: "Golden Hour Natural",
            shotTypeId: SHOT_TYPES_LIBRARY[7].id, // Candid Look
            lightingId: LIGHTING_PRESETS[1].id, // Golden Hour
            backgroundId: BACKGROUNDS_LIBRARY[6].id, // Lush Forest
            expressionId: EXPRESSIONS[6].id, // Serene
            apertureId: APERTURES_LIBRARY[0].id, // Shallow
            focalLengthId: FOCAL_LENGTHS_LIBRARY[3].id, // 85mm
            cameraAngleId: CAMERA_ANGLES_LIBRARY[0].id, // Eye-Level
            colorGradeId: COLOR_GRADING_PRESETS[5].id, // Warm & Golden
            reasoning: "A warm and inviting outdoor concept. The golden hour light creates a beautiful, soft glow, and the shallow depth of field isolates the subject for a dreamy, aspirational feel."
        },
        {
            id: 'concept-5',
            conceptName: "Architectural Lookbook",
            shotTypeId: SHOT_TYPES_LIBRARY[5].id, // Elegant Lean
            lightingId: LIGHTING_PRESETS[14].id, // Window Light
            backgroundId: BACKGROUNDS_LIBRARY[4].id, // Modern Interior
            expressionId: EXPRESSIONS[0].id, // Neutral
            apertureId: APERTURES_LIBRARY[1].id, // Mid-range
            focalLengthId: FOCAL_LENGTHS_LIBRARY[1].id, // 35mm
            cameraAngleId: CAMERA_ANGLES_LIBRARY[0].id, // Eye-Level
            colorGradeId: COLOR_GRADING_PRESETS[6].id, // Cool & Crisp
            reasoning: "A sophisticated and clean concept that blends fashion with minimalist architecture. Soft window light provides a high-end feel, perfect for a modern lookbook."
        }
    ];
};

const mockGenerateVideo = async (prompt: string): Promise<any> => {
    console.log("--- MOCK API CALL: generatePhotoshootVideo ---");
    console.log("Prompt:", prompt);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate initial call
    return { mock: true, done: false, prompt };
};

const mockGetVideoStatus = async (operation: any): Promise<any> => {
    console.log("--- MOCK API CALL: getVideoOperationStatus ---");
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate polling
    console.log("--- MOCK VIDEO 'DONE' ---");
    const videoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    return { 
        done: true, 
        response: { 
            generatedVideos: [{ video: { uri: videoUrl } }] 
        } 
    };
};

const mockGenerativeEdit = async (params: { originalImageB64: string, maskImageB64: string, prompt: string, apparelImageB64?: string | null }): Promise<string> => {
    console.log("--- MOCK API CALL: generativeEdit ---");
    console.log("Prompt:", params.prompt);
    if(params.apparelImageB64) console.log("With Apparel Reference!");
    // Just return the original image for the mock
    await new Promise(resolve => setTimeout(resolve, 1500));
    return params.originalImageB64;
};

const mockRemoveBackground = async (imageB64: string): Promise<string> => {
    console.log("--- MOCK API CALL: removeBackground ---");
    // Just return the original image for the mock to simulate a "failed" or no-op cutout
    await new Promise(resolve => setTimeout(resolve, 1000));
    return imageB64;
};

const mockAnalyzeApparel = async (imageB64: string): Promise<{ description: string, category: ApparelCategory }> => {
    console.log("--- MOCK API CALL: analyzeApparel ---");
    await new Promise(resolve => setTimeout(resolve, 900));
    const categories: ApparelCategory[] = ['Top', 'Bottom', 'Full Body', 'Outerwear'];
    const hashCode = imageB64.split("").reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const index = Math.abs(hashCode) % categories.length;
    const category = categories[index];
    return {
        description: '',
        category: category,
    };
};


const mockGetSceneSuggestions = async (imageB64: string): Promise<SceneSuggestion[]> => {
    console.log("--- MOCK API CALL: getSceneSuggestions ---");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return [
        { 
            conceptName: "Luxe Minimalist", 
            sceneDescription: "The bracelets are displayed on a dark velvet cushion resting on a polished black marble slab. The scene is lit with soft, dramatic side-lighting creating long shadows. A single, small, out-of-focus sprig of eucalyptus is barely visible in the background.",
            previewPrompt: "Abstract photo of a dark velvet cushion on a polished black marble slab, soft dramatic lighting."
        },
        { 
            conceptName: "Natural Elements", 
            sceneDescription: "The bracelets are nestled among smooth, grey river stones and a piece of weathered driftwood. The surface is a light, textured sand. The lighting is bright and natural, as if from an overcast day, creating soft, minimal shadows.",
            previewPrompt: "Top-down photo of smooth grey river stones and weathered driftwood on a bed of light sand, bright natural lighting."
        },
        { 
            conceptName: "Architectural Concrete", 
            sceneDescription: "The bracelets are arranged on a rough, textured concrete block. The background is a smooth, out-of-focus concrete wall. A single, sharp beam of hard light cuts across the scene, highlighting the metallic texture of the bracelets and creating a strong shadow.",
            previewPrompt: "Minimalist photo of a rough textured concrete block against a smooth concrete wall, with a single sharp beam of hard light."
        },
        { 
            conceptName: "Sunlit Giftbox", 
            sceneDescription: "An open, minimalist white gift box with a delicate ribbon. The bracelets are placed inside on a soft linen fabric. The scene is bathed in warm, golden hour sunlight, creating a feeling of luxury and warmth.",
            previewPrompt: "An open, minimalist white gift box with a delicate ribbon, filled with soft linen fabric, bathed in warm golden hour sunlight."
        },
    ];
};

const mockDescribeModel = async (imageB64: string): Promise<Pick<AIModel, 'name' | 'description' | 'gender'>> => {
    console.log("--- MOCK API CALL: describeModel ---");
    await new Promise(resolve => setTimeout(resolve, 1200));
    return {
        name: "Alex",
        gender: "Female",
        description: "A professional female model in her mid-20s, with sharp, defined cheekbones, striking blue eyes, and wavy brown hair styled in a side part. She has a confident, neutral expression. Her build is slender and athletic. Caucasian ethnicity."
    };
};

const mockSuggestLayering = async (items: {id: string}[]): Promise<string[]> => {
    console.log("--- MOCK API CALL: suggestLayering ---");
    await new Promise(resolve => setTimeout(resolve, 900));
    // Simple mock: reverse the order
    return items.map(item => item.id).reverse();
};

// --- END MOCK FUNCTIONS ---


export const geminiService = {
  generateWithImagen: async (prompt: string, aspectRatio: AspectRatio['value']): Promise<string> => {
      if (!ai) return mockGenerateWithImagen(prompt, aspectRatio);
      try {
          const response = await ai.models.generateImages({
              model: 'imagen-4.0-generate-001',
              prompt: prompt,
              config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/png',
                  aspectRatio: aspectRatio,
              },
          });

          if (response.generatedImages && response.generatedImages.length > 0) {
              const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
              return `data:image/png;base64,${base64ImageBytes}`;
          }
          throw new Error("Imagen generation failed to return an image.");
      } catch (error) {
          console.error("Error generating with Imagen:", error);
          throw error;
      }
  },
  
  analyzeApparel: async (imageB64: string): Promise<{ description: string; category: ApparelCategory }> => {
    if (!ai) return mockAnalyzeApparel(imageB64);
    
    try {
        const { mimeType, data } = parseDataUrl(imageB64);
        const imagePart = { inlineData: { mimeType, data } };
        const textPart = { text: "You are a fashion expert. Analyze the image of the apparel item. Classify it into ONE of the following categories: Top, Bottom, Full Body, Outerwear, Accessory, Footwear. Return ONLY the JSON object." };
        
        const validCategories: ApparelCategory[] = ['Top', 'Bottom', 'Full Body', 'Outerwear', 'Accessory', 'Footwear'];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, enum: validCategories },
                    },
                    required: ["category"]
                }
            }
        });

        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString) as { category: ApparelCategory };
        return {
            category: parsed.category || 'Uncategorized',
            description: ''
        };

    } catch(error) {
        console.error("Error analyzing apparel with Gemini:", error);
        return { category: 'Uncategorized', description: '' };
    }
  },

  suggestLayering: async (items: {id: string, description: string, category: ApparelCategory}[]): Promise<string[]> => {
    if (!ai) return mockSuggestLayering(items);
    
    try {
        const itemsString = items.map(i => `ID: ${i.id}, CATEGORY: ${i.category}, DESCRIPTION: ${i.description}`).join('\n');
        const textPrompt = `You are an expert fashion stylist. I will provide you with a list of apparel items. Your task is to determine the correct layering order, from the innermost garment to the outermost. Consider the item's category and description.\n\nHere are the items:\n${itemsString}\n\nReturn ONLY a JSON object with a single key 'orderedIds' which is an array of the item IDs in the correct order.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: textPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        orderedIds: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["orderedIds"]
                }
            }
        });

        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString) as { orderedIds: string[] };
        return parsed.orderedIds || [];
    } catch(error) {
        console.error("Error suggesting layering from Gemini:", error);
        throw error;
    }
  },

  describeModel: async (imageB64: string): Promise<Pick<AIModel, 'name' | 'description' | 'gender'>> => {
    if (!ai) return mockDescribeModel(imageB64);

    try {
      const { mimeType, data } = parseDataUrl(imageB64);
      const imagePart = { inlineData: { mimeType, data } };
      const textPart = { text: "You are an expert model casting director. Analyze the image of the person. Generate a detailed, professional description suitable for recreating this person with an AI image generator. The description should include gender, estimated age, ethnicity, hair style and color, facial features (eyes, nose, jawline, etc.), and body type. Also suggest a plausible first name for the model. Return ONLY a JSON object with the required properties." };

      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: { parts: [imagePart, textPart] },
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      name: { type: Type.STRING, description: "A plausible first name for the person in the image." },
                      gender: { type: Type.STRING, enum: ['Male', 'Female'] },
                      description: { type: Type.STRING, description: "A detailed, professional description of the model's appearance, including ethnicity, age, hair, facial features, and body type." }
                  },
                  required: ["name", "gender", "description"]
              }
          }
      });
      
      const jsonString = response.text.trim();
      return JSON.parse(jsonString) as Pick<AIModel, 'name' | 'description' | 'gender'>;

    } catch (error) {
        console.error("Error describing model with Gemini:", error);
        throw error;
    }
  },

  getSceneSuggestions: async (imageB64: string): Promise<SceneSuggestion[]> => {
    if (!ai) return mockGetSceneSuggestions(imageB64);
    
    try {
        const { mimeType, data } = parseDataUrl(imageB64);
        const imagePart = { inlineData: { mimeType, data } };
        const textPart = { text: `You are an expert product photographer and prop stylist for luxury brands, specializing in jewelry. Analyze the provided product image. Generate 4 unique, professional, and distinct scene concepts suitable for high-end marketing.

For each concept, provide:
1. 'conceptName': A short, evocative name (e.g., "Luxe Minimalist", "Natural Elements").
2. 'sceneDescription': A detailed prompt for the final image generation. Describe the surface, any props, and the lighting style.
3. 'previewPrompt': A simple, abstract prompt to generate a visual preview of the scene's key elements and mood. Do NOT mention the product itself in the preview prompt.

Return ONLY the JSON object.` };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            conceptName: { type: Type.STRING, description: "A short, evocative name for the scene concept." },
                            sceneDescription: { type: Type.STRING, description: "A detailed description of the scene, props, and lighting for the final image generation." },
                            previewPrompt: { type: Type.STRING, description: "A simple, abstract prompt to generate a visual preview of the scene's elements and mood." }
                        },
                        required: ["conceptName", "sceneDescription", "previewPrompt"]
                    }
                }
            }
        });

        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString) as SceneSuggestion[];
        return parsed || [];

    } catch(error) {
        console.error("Error getting scene suggestions from Gemini:", error);
        throw error;
    }
  },

  removeBackground: async (imageB64: string): Promise<string> => {
    if (!ai) return mockRemoveBackground(imageB64);
    try {
      const { mimeType, data } = parseDataUrl(imageB64);
      const imagePart = { inlineData: { mimeType, data } };
      const textPart = { text: "Your task is to act as an expert photo editor. You will be given an image of a product. Your sole mission is to perfectly isolate the main product from its background. Return a new image where the isolated product is placed on a pure white background (#FFFFFF). The output image MUST have the exact same dimensions as the input image. Do not add any shadows or effects. The product itself must not be altered." };

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [textPart, imagePart] },
          config: {
              responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
      });

      if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const mimeType = part.inlineData.mimeType;
                return `data:${mimeType};base64,${base64ImageBytes}`;
            }
        }
      }
      throw new Error("Background removal failed to return an image.");
    } catch(error) {
        console.error("Error removing background with Gemini:", error);
        throw error;
    }
  },

  describeImageStyle: async (imageB64: string): Promise<string> => {
    if (!ai) return mockDescribeImageStyle(imageB64);

    try {
      const { mimeType, data } = parseDataUrl(imageB64);
      const imagePart = {
        inlineData: {
          mimeType,
          data,
        },
      };
      const textPart = {
        text: 'You are a professional photographer. Describe the lighting in this image in detail. Focus on the light quality (hard, soft), direction (front, side, back), color (warm, cool), and any specific characteristics like catchlights in the eyes or atmospheric effects. Be descriptive and evocative, as if explaining the setup to another photographer.'
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
      });
      
      return response.text;
    } catch (error) {
      console.error("Error describing image style with Gemini:", error);
      throw error;
    }
  },

  getArtDirectorSuggestions: async (garmentImageB64: string): Promise<ArtDirectorSuggestion[]> => {
    if (!ai) return mockGetArtDirectorSuggestions(garmentImageB64);

    const validShotTypeIds = SHOT_TYPES_LIBRARY.map(p => p.id);
    const validLightingIds = LIGHTING_PRESETS.map(l => l.id);
    const validBackgroundIds = BACKGROUNDS_LIBRARY.map(b => b.id);
    const validExpressionIds = EXPRESSIONS.map(e => e.id);
    const validApertureIds = APERTURES_LIBRARY.map(a => a.id);
    const validFocalLengthIds = FOCAL_LENGTHS_LIBRARY.map(f => f.id);
    const validCameraAngleIds = CAMERA_ANGLES_LIBRARY.map(c => c.id);
    const validColorGradeIds = COLOR_GRADING_PRESETS.map(c => c.id);

    try {
        const { mimeType, data } = parseDataUrl(garmentImageB64);
        const imagePart = { inlineData: { mimeType, data } };
        const textPart = { 
          text: `As an expert fashion Art Director, analyze the provided garment image. Based on its style, suggest FIVE distinct and varied photoshoot concepts.

          You MUST generate one concept for EACH of the following five categories:
          1.  **E-commerce Clean:** Bright, product-focused, on a minimal studio background.
          2.  **Urban Lifestyle:** Candid, relatable, in a modern city environment.
          3.  **Dramatic Editorial:** A moody, high-fashion, artistic concept.
          4.  **Golden Hour Natural:** A warm, inviting outdoor shot during golden hour.
          5.  **Architectural Lookbook:** A sophisticated shot in a modern architectural setting.

          For each concept, provide a unique 'conceptName' and a detailed 'reasoning' focusing ONLY on why the chosen artistic direction is a good creative match for the garment's style. Do NOT describe the garment itself. Return ONLY a JSON array containing exactly FIVE objects. Each object in the array must have all the required properties.

          Valid Shot Type IDs: ${validShotTypeIds.join(', ')}
          Valid Lighting IDs: ${validLightingIds.join(', ')}
          Valid Background IDs: ${validBackgroundIds.join(', ')}
          Valid Expression IDs: ${validExpressionIds.join(', ')}
          Valid Aperture IDs: ${validApertureIds.join(', ')}
          Valid Focal Length IDs: ${validFocalLengthIds.join(', ')}
          Valid Camera Angle IDs: ${validCameraAngleIds.join(', ')}
          Valid Color Grade IDs: ${validColorGradeIds.join(', ')}
          `
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                       type: Type.OBJECT,
                       properties: {
                            id: { type: Type.STRING, description: "A unique identifier for the concept, e.g., 'concept-1'."},
                            conceptName: { type: Type.STRING, description: "A short, catchy name for the creative concept, like 'Golden Hour Dream' or 'Urban Edge'." },
                            shotTypeId: { type: Type.STRING, description: `One of: ${validShotTypeIds.join(', ')}` },
                            lightingId: { type: Type.STRING, description: `One of: ${validLightingIds.join(', ')}` },
                            backgroundId: { type: Type.STRING, description: `One of: ${validBackgroundIds.join(', ')}` },
                            expressionId: { type: Type.STRING, description: `One of: ${validExpressionIds.join(', ')}` },
                            apertureId: { type: Type.STRING, description: `One of: ${validApertureIds.join(', ')}` },
                            focalLengthId: { type: Type.STRING, description: `One of: ${validFocalLengthIds.join(', ')}` },
                            cameraAngleId: { type: Type.STRING, description: `One of: ${validCameraAngleIds.join(', ')}` },
                            colorGradeId: { type: Type.STRING, description: `One of: ${validColorGradeIds.join(', ')}` },
                            reasoning: { type: Type.STRING, description: "A detailed, professional rationale for the creative choices." }
                       },
                       required: ["id", "conceptName", "shotTypeId", "lightingId", "backgroundId", "expressionId", "apertureId", "focalLengthId", "cameraAngleId", "colorGradeId", "reasoning"]
                   }
                },
            },
        });

        const jsonString = response.text.trim();
        const suggestions = JSON.parse(jsonString) as ArtDirectorSuggestion[];

        // Validate IDs to ensure Gemini didn't hallucinate
        for (const suggestion of suggestions) {
            if (!validShotTypeIds.includes(suggestion.shotTypeId) ||
                !validLightingIds.includes(suggestion.lightingId) ||
                !validBackgroundIds.includes(suggestion.backgroundId) ||
                !validExpressionIds.includes(suggestion.expressionId) ||
                !validApertureIds.includes(suggestion.apertureId) ||
                !validFocalLengthIds.includes(suggestion.focalLengthId) ||
                !validCameraAngleIds.includes(suggestion.cameraAngleId) ||
                !validColorGradeIds.includes(suggestion.colorGradeId)) {
                console.warn("Gemini returned invalid IDs in a suggestion, falling back to mock.", suggestion);
                return mockGetArtDirectorSuggestions(garmentImageB64); // fallback
            }
        }

        return suggestions;
    } catch (error) {
        console.error("Error getting art director suggestion:", error);
        // fallback to mock on error to avoid breaking the flow
        return mockGetArtDirectorSuggestions(garmentImageB64);
    }
  },

  generateDynamicPOVShots: async (): Promise<{ name: string; description: string }[]> => {
    if (!ai) { // Mock implementation for development
        console.log("--- MOCK API CALL: generateDynamicPOVShots ---");
        await new Promise(resolve => setTimeout(resolve, 1000));
        return [
            { name: "Morning Coffee POV", description: "A first-person view holding a warm mug of coffee, looking down at the outfit. The lighting is soft morning window light." },
            { name: "City Explorer", description: "A point-of-view shot looking down at feet wearing stylish sneakers, with interesting city pavement visible. The outfit is visible in the lower half of the frame." },
            { name: "Mirror Check", description: "A casual point-of-view shot taking a photo in a rustic, full-length mirror, phone partially visible." },
            { name: "Working Hands", description: "A top-down point-of-view of hands typing on a laptop, with the sleeves and torso of the outfit clearly in frame." },
        ];
    }
    
    try {
        const textPrompt = `You are a creative director for a trendy social media fashion brand. Your task is to generate 4 unique, creative, and distinct point-of-view (POV) photo concepts. These shots should feel authentic and be suitable for platforms like Instagram.

For each concept, provide a short, catchy 'name' and a detailed 'description'. The description should be written as an instruction for an AI image generator, clearly explaining the pose, action, and environment from a first-person perspective.

Return ONLY a JSON array of 4 objects.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: textPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "A short, catchy name for the POV concept." },
                            description: { type: Type.STRING, description: "A detailed prompt-style description of the POV shot." }
                        },
                        required: ["name", "description"]
                    }
                }
            }
        });
        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString) as { name: string; description: string }[];
        if (parsed.length !== 4) {
            throw new Error("AI did not return exactly 4 POV shot concepts.");
        }
        return parsed;

    } catch(error) {
        console.error("Error generating dynamic POV shots:", error);
        throw error; // Let the caller handle fallback
    }
  },

  generatePhotoshootImage: async (baseParts: any[], aspectRatio: AspectRatio['value'], numberOfImages: number, negativePrompt: string | undefined, onImageGenerated: (imageB64: string, index: number) => void): Promise<void> => {
    if (!ai) return mockGenerateImage(baseParts, aspectRatio, numberOfImages, negativePrompt, onImageGenerated);

    try {
      for (let i = 0; i < numberOfImages; i++) {
        // Deep copy parts to avoid mutation across loop iterations
        const parts = JSON.parse(JSON.stringify(baseParts));
        const textPart = parts.find((part: any) => 'text' in part);

        if (textPart) {
          let finalRequirements = `\n\n**Final Image Requirements:**`;
          if (negativePrompt && negativePrompt.trim() !== '') {
            finalRequirements += `\n- **AVOID:** Do not include the following elements: ${negativePrompt}.`;
          }
          // Add a unique seed for each image to ensure variety
          finalRequirements += `\n- Generation Seed: ${Math.random()}`;

          if (finalRequirements !== `\n\n**Final Image Requirements:**`) {
            textPart.text += finalRequirements;
          }
        }
        
        try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts },
              config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
              },
            });
            
            let imageFound = false;
            if (response.candidates && response.candidates.length > 0) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        const base64ImageBytes: string = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType;
                        const imageB64 = `data:${mimeType};base64,${base64ImageBytes}`;
                        onImageGenerated(imageB64, i);
                        imageFound = true;
                        break;
                    }
                }
            }
            if (!imageFound) {
                console.warn("No image found in a Gemini response for index " + i, response);
                // The UI will show a placeholder for the failed image.
            }
        } catch(error) {
            console.error(`Error generating image at index ${i}:`, error);
            // Continue to the next image even if one fails.
        }
      }
    } catch (error) {
      console.error("Error setting up image generation with Gemini:", error);
      throw error;
    }
  },

  generativeEdit: async (params: { originalImageB64: string, maskImageB64: string, prompt: string, apparelImageB64?: string | null }): Promise<string> => {
    if (!ai) return mockGenerativeEdit(params);

    try {
        const { originalImageB64, maskImageB64, prompt, apparelImageB64 } = params;

        const originalImageParts = parseDataUrl(originalImageB64);
        const maskImageParts = parseDataUrl(maskImageB64);

        const parts = [];

        // Common parts for both scenarios
        const originalImagePart = { inlineData: { mimeType: originalImageParts.mimeType, data: originalImageParts.data } };
        const maskImagePart = { inlineData: { mimeType: maskImageParts.mimeType, data: maskImageParts.data } };
        
        if (apparelImageB64) {
            // SCENARIO 1: Inpainting with Apparel Reference
            const apparelImageParts = parseDataUrl(apparelImageB64);
            const apparelReferencePart = { inlineData: { mimeType: apparelImageParts.mimeType, data: apparelImageParts.data } };

            const textPart = {
                text: `**INPAINTING WITH APPAREL REFERENCE TASK:**
You will receive THREE images and a text instruction.
1. The **SOURCE IMAGE** to be edited.
2. The **APPAREL REFERENCE IMAGE** containing a garment.
3. The **MASK IMAGE**, where the white area indicates the region to be modified.

**CRITICAL MISSION:** Your task is to take the garment from the APPAREL REFERENCE IMAGE and realistically paint it onto the SOURCE IMAGE, but ONLY within the masked area. The garment should fit the model's body naturally, with correct lighting, shadows, and wrinkles. Use the following text instruction for additional guidance: "${prompt}". Do NOT change any part of the image outside the masked area.`
            };
            
            parts.push(textPart, originalImagePart, apparelReferencePart, maskImagePart);

        } else {
            // SCENARIO 2: Standard Inpainting
            const textPart = {
                text: `**INPAINTING/GENERATIVE EDIT TASK:** 
You are given two images and a text instruction. 
The first image is the source image to be edited. 
The second image is a mask, where the white area indicates the region to be modified. 
Your task is to apply the following instruction ONLY within the masked area of the source image, blending the result seamlessly: "${prompt}". 
Do NOT change any part of the image outside the masked area.`
            };

            parts.push(textPart, originalImagePart, maskImagePart);
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        if (response.candidates && response.candidates.length > 0) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType;
                    return `data:${mimeType};base64,${base64ImageBytes}`;
                }
            }
        }

        const textFeedback = response?.text?.trim() || "No text feedback received.";
        throw new Error(`Generative edit failed. Feedback: ${textFeedback}`);

    } catch (error) {
        console.error("Error performing generative edit with Gemini:", error);
        throw error;
    }
  },

  generatePhotoshootVideo: async (prompt: string, referenceImageB64?: string): Promise<any> => {
      if (!ai) return mockGenerateVideo(prompt);
      try {
          const params: any = {
              model: 'veo-2.0-generate-001',
              prompt,
              config: {
                  numberOfVideos: 1,
              }
          };
          if (referenceImageB64) {
              const { mimeType, data } = parseDataUrl(referenceImageB64);
              params.image = {
                  imageBytes: data,
                  mimeType,
              };
          }
          return await ai.models.generateVideos(params);
      } catch (error) {
          console.error("Error generating video with Gemini:", error);
          throw error;
      }
  },

  getVideoOperationStatus: async (operation: any): Promise<any> => {
      if (!ai) return mockGetVideoStatus(operation);
      try {
          return await ai.operations.getVideosOperation({ operation });
      } catch (error) {
          console.error("Error getting video operation status:", error);
          throw error;
      }
  },

  fetchVideoAsBlobUrl: async (uri: string): Promise<string> => {
    try {
        // For mock, the URI is already a public URL. For real API, we need the key.
        const finalUri = uri.includes('googleapis.com/v1beta') ? `${uri}&key=${API_KEY}` : uri;
        const response = await fetch(finalUri);
        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.statusText}`);
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Error fetching video blob:", error);
        throw error;
    }
  },
  
  parseDataUrl, // Export for use in other services
};