# MappingStudio — Mascot and In-App Assets

This document describes the in-app character (mascot) and related assets used in MappingStudio, and confirms their suitability for enterprise use.

---

## In-App Mascot (“Train AI” Character)

### What It Is

MappingStudio uses a **small, human cartoon scholar** in the dashboard “Train AI” area. It is an original, geometric design: a **white background** inside a **black bold circle**, with a friendly scholar character—round face (light skin tone), eyes, smile, **black graduation cap** (mortarboard and tassel), and **black robe/dress**. All drawn with basic SVG shapes (circles, ellipses, paths, rects); no third-party artwork.

- **Design**: A scholar motif: black bold circular border, white fill, human cartoon face with black graduation cap and black dress/robe. Intentionally generic and geometric; no likeness to any known character or brand.
- **Purpose**: To mark the “Train AI from Excel” feature and signal a training/learning context without cluttering the main screen.
- **Placement**: Shown in the **top right corner** of the dashboard, next to the “Train AI” action button. On hover, the character moves up (comes out of the circle) and the label switches to “lets train”.

### Copyright and Licensing

- **Origin**: The mascot is an **original, custom-created graphic** for MappingStudio. It was designed in-house using only basic SVG shapes (e.g. `<circle>`, `<ellipse>`, `<path>`, `<rect>`). It is **not** derived from any third-party artwork, clip art, or licensed asset.
- **No third-party rights**: No external artist, stock asset, or character license was used. The design is a generic, geometric human scholar (white bg, black circle, black cap and dress) with no distinctive features, so it does not resemble any existing character or trademark.
- **Enterprise use**: You may use this mascot within the MappingStudio product (e.g. in the app UI, in documentation or marketing for MappingStudio) without additional clearance. It is suitable for enterprise deployment from a copyright perspective.
- **Trademark**: The graphic is used as a product UI element, not as a standalone logo or brand mark. MappingStudio’s main branding (e.g. name, logo) is separate.

### Technical Details

- **Format**: Inline SVG in the application code (no external image file).
- **Size**: Small (e.g. ~28×28 px display size) so it stays subtle.
- **Colors**: Uses a **white background** inside a **black bold circle**; the scholar’s cap and dress are **black**; the face uses a light skin-tone fill so it reads as a friendly human cartoon.
- **Accessibility**: The control is focusable and has an `aria-label`; the decorative graphic is marked with `aria-hidden` so screen readers are not burdened.

### If You Replace or Remove It

You may remove the mascot or replace it with your own graphic. If you use a **third-party** asset (e.g. from a stock site or another product), you are responsible for that asset’s license and any trademark/copyright restrictions. This document applies only to the **default** in-app character supplied with MappingStudio.

---

## Other In-App Icons and Symbols

- **Icons**: The app uses Ant Design (and similar) icon sets for UI actions. Those are governed by their respective licenses (e.g. Ant Design Icons).
- **Emoji**: Some UI text may use system or library emoji; those are generally considered safe for normal use but depend on your platform and distribution.

---

## Summary

| Item | Description | Enterprise / Copyright |
|------|-------------|-------------------------|
| **Dashboard “Train AI” mascot** | Original geometric SVG human cartoon scholar (black cap & dress, white bg, black bold circle), top right corner | Custom-created for MappingStudio; no third-party copyright; safe for enterprise use within the product. |
| **Other icons** | Ant Design and similar | Subject to their respective licenses. |
| **Replacement assets** | Any asset you add (e.g. another mascot or image) | You must ensure proper rights and licenses. |

For product licensing and compliance (e.g. HIPAA, external APIs), see [COMPLIANCE.md](COMPLIANCE.md) and [SAFETY.md](SAFETY.md).
