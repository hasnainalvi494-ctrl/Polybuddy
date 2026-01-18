# 🎨 Royal Indigo Color Scheme - PolyBuddy Premium Redesign

## Design Philosophy
Inspired by Linear, Discord, and premium fintech apps - a sophisticated dark navy palette with Royal Indigo accents that's easy on the eyes for extended trading sessions.

---

## Color Palette

### Backgrounds (Dark Navy)
- **Primary**: `#0f0f1a` - Deep navy black (main background)
- **Secondary**: `#14142b` - Rich navy (cards, navigation)
- **Tertiary**: `#1a1a3e` - Elevated navy (hover states, elevated cards)

### Borders
- **Primary**: `#252545` - Subtle navy border
- **Secondary**: `#2d2d52` - Elevated border

### Primary Accent (Royal Indigo)
Full 50-950 scale for maximum flexibility:
- **50**: `#eef2ff` - Lightest tint
- **100**: `#e0e7ff`
- **200**: `#c7d2fe`
- **300**: `#a5b4fc`
- **400**: `#818cf8` - Light states
- **500**: `#6366f1` - **Main brand color**
- **600**: `#4f46e5` - Hover states
- **700**: `#4338ca` - Active states
- **800**: `#3730a3`
- **900**: `#312e81`
- **950**: `#1e1b4b` - Darkest for backgrounds

### Text Colors (WCAG AA Compliant)
- **Primary**: `#f9fafb` - Off-white (main text, reduced eye strain)
- **Secondary**: `#d1d5db` - Light gray (secondary text)
- **Tertiary**: `#9ca3af` - Medium gray (labels)
- **Muted**: `#6b7280` - Muted gray (disabled states)

### Complementary Accents
- **Blue** (`#3b82f6`): Info states
- **Purple** (`#8b5cf6`): Secondary highlights
- **Rose** (`#f43f5e`): Danger/sell actions
- **Emerald** (`#10b981`): Success/buy actions

---

## Visual Effects

### Glow Shadows
```css
--glow-sm: 0 0 10px 0 rgba(99, 102, 241, 0.2)
--glow-md: 0 0 20px 0 rgba(99, 102, 241, 0.3)
--glow-lg: 0 0 30px 0 rgba(99, 102, 241, 0.4)
--glow-xl: 0 0 40px 0 rgba(99, 102, 241, 0.5)
```

### Card Shadows
- **Default**: Subtle depth with `rgba(0, 0, 0, 0.2)`
- **Hover**: Royal indigo glow + elevated shadow
- **Interactive**: Smooth transitions with `translateY`

### Gradients
- **Primary**: `linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)`
- **Background Mesh**: Subtle radial gradients for depth

---

## Component Updates

### Buttons
✅ **Primary**: Royal indigo with glow on hover
✅ **Secondary**: Dark navy with indigo border glow
✅ **Success**: Emerald green (for buy actions)
✅ **Danger**: Rose red (for sell actions)

### Cards
✅ **Interactive**: Hover lifts card with indigo glow
✅ **Elevated**: Pre-elevated with less hover effect
✅ **Glass**: Frosted glass with indigo tint

### Inputs
✅ Focus states with indigo ring and glow
✅ Dark navy backgrounds for reduced glare

### Navigation
✅ Dark navy background with subtle gradient mesh
✅ Royal indigo logo with gradient
✅ Active states with indigo glow
✅ Smooth hover transitions

---

## Accessibility

### WCAG AA Compliance
✅ All text colors pass WCAG AA on dark navy backgrounds
✅ Off-white (`#f9fafb`) instead of pure white for reduced eye strain
✅ Sufficient contrast ratios for all interactive elements

### Eye Comfort
✅ Rich dark navy instead of pure black
✅ Muted accent color (not overly bright)
✅ Subtle gradients and glows (not distracting)
✅ Reduced blue light compared to pure blue accents

---

## Usage Examples

### Tailwind Classes
```tsx
// Backgrounds
className="bg-bg-primary"      // #0f0f1a
className="bg-bg-secondary"    // #14142b
className="bg-bg-tertiary"     // #1a1a3e

// Text
className="text-text-primary"   // #f9fafb
className="text-text-secondary" // #d1d5db
className="text-text-tertiary"  // #9ca3af

// Primary Accent
className="bg-primary-500"      // Royal indigo
className="text-primary-400"    // Light indigo
className="border-primary-500"  // Indigo border

// Effects
className="shadow-glow-md"      // Indigo glow
className="hover:shadow-card-hover" // Elevated glow
```

### CSS Variables
```css
background: var(--bg-primary);
color: var(--text-primary);
border-color: var(--border-primary);
box-shadow: 0 0 20px 0 var(--glow-primary);
```

---

## Files Modified

1. ✅ `apps/web/tailwind.config.ts` - Full color scale, shadows, animations
2. ✅ `apps/web/src/app/globals.css` - CSS variables, component styles
3. ✅ `apps/web/src/components/Navigation.tsx` - Updated to use new colors

---

## Benefits

### For Users
- 🎯 **Reduced Eye Strain**: Dark navy is easier on eyes than pure black
- 🎨 **Premium Aesthetic**: Professional, trustworthy fintech look
- ⚡ **Clear Hierarchy**: Distinct color roles (buy=emerald, sell=rose)
- 💡 **Better Focus**: Subtle glows guide attention without distraction

### For Developers
- 🛠️ **Flexible System**: Full 50-950 color scales
- 📦 **Reusable Components**: Pre-built component classes
- 🎭 **Consistent**: Centralized color variables
- ♿ **Accessible**: WCAG AA compliant out of the box

---

## Next Steps

To see the new design:
1. Clear Next.js cache: `Remove-Item -Recurse -Force apps\web\.next`
2. Restart dev server
3. Hard refresh browser (Ctrl+Shift+R)

The design will automatically apply to all pages using Tailwind utility classes!

---

**Design Status**: ✅ Complete  
**Theme**: Royal Indigo Premium  
**Accessibility**: WCAG AA Compliant  
**Updated**: 2026-01-18
