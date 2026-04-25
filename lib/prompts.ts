export type GenderOption = 'neutral' | 'male' | 'female';

export const PROMPTS: Record<GenderOption, string> = {
  neutral: `Reimagine the uploaded person as a cinematic, high-end professional portrait with a refined corporate aesthetic and subtle heroic presence. Use the attached image as the sole identity reference. Preserve exact facial identity, bone structure, proportions, skin tone, natural texture, and hairstyle with high fidelity. Do not alter defining features. Ignore original pose.
Render as an upper-body shot in a 2:3 vertical aspect ratio, true 4K resolution. Pose: body facing forward, head naturally aligned, eyes looking directly at the camera (no flipping or mirroring). Posture upright, composed, confident, with relaxed shoulders.
Expression & Smile:
 Strictly preserve the original expression. Do not exaggerate or enhance the smile. Do not increase teeth visibility.
Age Adjustment:
 Subtle, realistic slight youthfulness (no artificial smoothing).
Hair:
 Preserve original hairstyle exactly.
Facial Hair:
If present, preserve exactly
If clean-shaven, do not add any
Makeup / Natural Look:
 Preserve as-is. Do not add artificial or heavy makeup.
Restrictions:
No tattoos
No ornaments or accessories
Clothing:
 Maintain same outfit with realistic fabric texture and natural folds.

💡 Lighting (Fixed & Optimized)
Soft, warm editorial studio lighting with balanced exposure:
Gentle natural warm tone
Even face lighting
Soft shadows (no harsh contrast)
No blown highlights or hotspots
No glare or shine
Natural skin tone preservation

Skin & Realism:
 Natural skin texture only. No smoothing or filters.
Color Accuracy:
 Neutral + slightly warm skin tones. No color spill.
Image Quality:
 Sharp, clean, realistic. No artifacts or distortion.
Background:
 Transparent PNG, clean alpha.

🚫 Negative Prompt (Neutral)
overexposed face, harsh lighting, blown highlights, hotspots, glare, shiny skin, uneven lighting, neon lighting, color cast, exaggerated smile, teeth enhancement, artificial expression, heavy makeup, skin smoothing, plastic skin, face distortion, asymmetry, blur, low detail, over-sharpening, halos, noise, artifacts, glitch, unrealistic rendering
`,

  male: `A chest up studio portrait of this man looking directly into the camera with a calm natural expression and both arms crossed . Maintain the facial features and clothing and any other accessories as is from the image. The background is non existent to be made as png. The lighting is even and flat, without harsh shadows, resembling a natural flash photograph that captures realistic skin texture.`,
  female: `A chest up studio portrait of this woman looking directly into the camera with a calm natural expression and both arms crossed . Maintain the facial features and clothing and any other accessories as is from the image. The background is non existent to be made as png. The lighting is even and flat, without harsh shadows, resembling a natural flash photograph that captures realistic skin texture.`,
};
