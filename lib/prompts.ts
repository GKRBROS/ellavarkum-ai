export type GenderOption = 'neutral' | 'male' | 'female';

export const PROMPTS: Record<GenderOption, string> = {
  neutral: `You are a world-class editorial portrait photographer specializing in dramatic, colorful studio lighting. Your task is to create a powerful, dynamic portrait with a “heroic” feel.x

IDENTITY ANCHOR (CRITICAL – STRICT CONSTRAINT):
Source: Use the person from the attached reference photo.
Preserve: You must keep their exact facial features, skin tone, hairstyle, and natural likeness perfectly unchanged.

Any culturally, religiously, or personally significant garments or coverings (e.g., hijab, turban, dupatta, headscarf, veil, cap, or modest clothing) must retain equivalent coverage and meaning, with the suit intelligently adapted to integrate or accommodate them without removal or reinterpretation.if any such things exist in attatched image , it should be there without fail in output image .

Universal Application: Apply the lighting and angle to the subject regardless of gender.

1. SCENE & COMPOSITION

Background:
A vibrant, smooth orange-red gradient background.
No patterns, just a hot, intense atmosphere.

Camera Angle (CRITICAL):
Low-angle shot camera positioned slightly below the subject.
This should make the subject look powerful and dominant.

Framing:
Medium close-up from bottom chest up with a 35 mm sigma lens with f 2.8 at a distance of 6 feet

2. WARDROBE & STYLING

Attire:
A black, black ops type of costume , that doesn't cover the neck at all

Fit: Fitted and sharp.
Color: Deep matte black (to contrast with bright background).

Expression:
Serious, intense, focused.
Subject looking off-camera into the space at a 25 degree angle above (not directly at the lens).

3. LIGHTING (DRAMATIC & COLORFUL)

Palette:
Dominated by vibrant orange and deep red hues.

Key Light:
Strong directional lighting that casts light, shadows on the face (chiaroscuro effect), emphasizing facial structure.

Rim Light:
A strong dramatic edge light (or subtle color cast) that separates the shoulders and head from the intense background.

Mood:
Mysterious, intense, high-contrast studio aesthetic.

4. TECHNICAL QUALITY

Style:
Photorealistic, highly detailed.

Texture:
Sharp focus on the face, natural skin texture, visible pores retained.
Background remains smooth with gradient contrast`,

  male: `You are a world-class editorial portrait photographer specializing in dramatic, colorful studio lighting. Your task is to create a powerful, dynamic portrait with a “heroic” feel.x

IDENTITY ANCHOR (CRITICAL – STRICT CONSTRAINT):
Source: Use the man from the attached reference photo.
Preserve: You must keep their exact facial features, skin tone, hairstyle, and natural likeness perfectly unchanged.

Any culturally, religiously, or personally significant garments or coverings (e.g., hijab, turban, dupatta, headscarf, veil, cap, or modest clothing) must retain equivalent coverage and meaning, with the suit intelligently adapted to integrate or accommodate them without removal or reinterpretation.if any such things exist in attatched image , it should be there without fail in output image .

Universal Application: Apply the lighting and angle to the subject regardless of gender.

1. SCENE & COMPOSITION

Background:
A vibrant, smooth orange-red gradient background.
No patterns, just a hot, intense atmosphere.

Camera Angle (CRITICAL):
Low-angle shot camera positioned slightly below the subject.
This should make the subject look powerful and dominant.

Framing:
Medium close-up from bottom chest up with a 35 mm sigma lens with f 2.8 at a distance of 6 feet

2. WARDROBE & STYLING

Attire:
A black, black ops type of costume , that doesn't cover the neck at all

Fit: Fitted and sharp.
Color: Deep matte black (to contrast with bright background).

Expression:
Serious, intense, focused.
Subject looking off-camera into the space at a 25 degree angle above (not directly at the lens).

3. LIGHTING (DRAMATIC & COLORFUL)

Palette:
Dominated by vibrant orange and deep red hues.

Key Light:
Strong directional lighting that casts light, shadows on the face (chiaroscuro effect), emphasizing facial structure.

Rim Light:
A strong dramatic edge light (or subtle color cast) that separates the shoulders and head from the intense background.

Mood:
Mysterious, intense, high-contrast studio aesthetic.

4. TECHNICAL QUALITY

Style:
Photorealistic, highly detailed.

Texture:
Sharp focus on the face, natural skin texture, visible pores retained.
Background remains smooth with gradient contrast`,

  female: `You are a world-class editorial portrait photographer specializing in dramatic, colorful studio lighting. Your task is to create a powerful, dynamic portrait with a “heroic” feel.x

IDENTITY ANCHOR (CRITICAL – STRICT CONSTRAINT):
Source: Use the woman from the attached reference photo.
Preserve: You must keep their exact facial features, skin tone, hairstyle, and natural likeness perfectly unchanged.

Any culturally, religiously, or personally significant garments or coverings (e.g., hijab, turban, dupatta, headscarf, veil, cap, or modest clothing) must retain equivalent coverage and meaning, with the suit intelligently adapted to integrate or accommodate them without removal or reinterpretation.if any such things exist in attatched image , it should be there without fail in output image .

Universal Application: Apply the lighting and angle to the subject regardless of gender.

1. SCENE & COMPOSITION

Background:
A vibrant, smooth orange-red gradient background.
No patterns, just a hot, intense atmosphere.

Camera Angle (CRITICAL):
Low-angle shot camera positioned slightly below the subject.
This should make the subject look powerful and dominant.

Framing:
Medium close-up from bottom chest up with a 35 mm sigma lens with f 2.8 at a distance of 6 feet

2. WARDROBE & STYLING

Attire:
A black, black ops type of costume , that doesn't cover the neck at all

Fit: Fitted and sharp.
Color: Deep matte black (to contrast with bright background).

Expression:
Serious, intense, focused.
Subject looking off-camera into the space at a 25 degree angle above (not directly at the lens).

3. LIGHTING (DRAMATIC & COLORFUL)

Palette:
Dominated by vibrant orange and deep red hues.

Key Light:
Strong directional lighting that casts light, shadows on the face (chiaroscuro effect), emphasizing facial structure.

Rim Light:
A strong dramatic edge light (or subtle color cast) that separates the shoulders and head from the intense background.

Mood:
Mysterious, intense, high-contrast studio aesthetic.

4. TECHNICAL QUALITY

Style:
Photorealistic, highly detailed.

Texture:
Sharp focus on the face, natural skin texture, visible pores retained.
Background remains smooth with gradient contrast`,
};
