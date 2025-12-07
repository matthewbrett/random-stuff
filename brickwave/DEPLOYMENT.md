# BRICKWAVE Deployment Guide

This guide covers how to share BRICKWAVE and play it on different devices.

## Automated Deployment (GitHub Actions - Recommended for this repo)

**This repo uses GitHub Actions for automatic deployment to GitHub Pages.**

Every push to the `main` branch automatically:
1. Builds BRICKWAVE
2. Deploys the portfolio landing page to `https://matthewbrett.github.io/random-stuff/`
3. Deploys BRICKWAVE to `https://matthewbrett.github.io/random-stuff/brickwave/`

### How it works:
- The workflow is defined in `.github/workflows/deploy.yml`
- Builds run on every push to main or manually via "Actions" tab
- No manual deployment needed!

### To deploy:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Wait 1-2 minutes and your changes will be live.

### Manual trigger:
Go to the "Actions" tab on GitHub → "Deploy to GitHub Pages" → "Run workflow"

---

## Quick Deploy (Production Build)

### 1. Build for Production

```bash
cd brickwave
npm run build
```

This creates an optimized `dist/` folder ready for deployment.

### 2. Preview Production Build Locally

```bash
npm run preview
```

## Deployment Options

### Option A: Netlify (Recommended)

**Easy, free hosting with automatic HTTPS**

```bash
# Install Netlify CLI (one-time setup)
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

Follow the prompts to create a new site or link to an existing one. You'll get a URL like `https://brickwave-123.netlify.app`

### Option B: Vercel

**Fast deployment with edge network**

```bash
# Install Vercel CLI (one-time setup)
npm install -g vercel

# Build and deploy
npm run build
vercel --prod
```

### Option C: GitHub Pages

**Host directly from your GitHub repository**

1. Add to `package.json`:
```json
{
  "homepage": "https://yourusername.github.io/random-stuff/brickwave",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

2. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

3. Deploy:
```bash
npm run deploy
```

### Option D: Other Static Hosts

The `dist/` folder can be uploaded to any static hosting service:
- **AWS S3 + CloudFront**
- **Cloudflare Pages**
- **Firebase Hosting**
- **Surge.sh**

All these services support drag-and-drop deployment of the `dist/` folder.

## Mobile Play

### Playing on Mobile Browsers

Once deployed, BRICKWAVE works on mobile devices:
- ✅ Touch controls (configurable in Settings)
- ✅ Responsive scaling with letterboxing
- ✅ Optimized for 60fps on mid-tier devices
- ✅ Works offline after first load (PWA-ready)

**Supported Mobile Browsers:**
- Safari (iOS 12+)
- Chrome (Android 7+)
- Firefox Mobile
- Samsung Internet

### Local Mobile Testing

Test on your phone before deploying:

```bash
npm run dev -- --host
```

This shows a network URL (e.g., `http://192.168.1.100:3001`) that you can access from any device on the same WiFi network.

**Steps:**
1. Run the command above
2. Note the network IP address shown in the terminal
3. Open that URL on your phone's browser
4. Test touch controls and gameplay

### Progressive Web App (PWA)

BRICKWAVE is PWA-ready. Once deployed, users can:
- Add to home screen (appears like a native app)
- Play offline after first load
- Get automatic updates

**Enable PWA features:**
The game already includes:
- Service worker for offline support
- App manifest for "Add to Home Screen"
- Icons optimized for mobile devices

### Native App (Advanced)

To create native iOS/Android apps:

**Using Capacitor:**
```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init

# Add platforms
npx cap add ios
npx cap add android

# Build and sync
npm run build
npx cap sync

# Open in Xcode/Android Studio
npx cap open ios
npx cap open android
```

## Performance Optimization

For the best mobile experience:

### 1. Enable Production Mode
Always deploy with `npm run build` (not `npm run dev`)

### 2. Check Settings
Recommend these settings for mobile:
- **Resolution**: Retro (320×180) for older devices
- **Screen Shake**: Off (saves battery)
- **Touch Controls**: Auto or On

### 3. Test on Target Devices
- iPhone X / Galaxy S9 or newer recommended
- Test on 4G connection (not just WiFi)
- Verify 60fps performance

## Sharing Your Game

### Share the URL
Once deployed, simply share the URL:
```
https://your-site.netlify.app
```

### Embed in Website
Add to any webpage:
```html
<iframe
  src="https://your-site.netlify.app"
  width="640"
  height="360"
  frameborder="0"
  allowfullscreen>
</iframe>
```

### QR Code
Generate a QR code for easy mobile access:
- Use [qr-code-generator.com](https://www.qr-code-generator.com/)
- Players can scan and play instantly

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Mobile Performance Issues
1. Check Settings → Resolution (try Retro mode)
2. Close other browser tabs
3. Disable Screen Shake
4. Use Chrome/Safari (better WebGL support)

### Touch Controls Not Working
1. Go to Settings → Touch Controls
2. Set to "On" instead of "Auto"
3. Refresh the page

### Game Won't Load
1. Check browser console (F12) for errors
2. Ensure all assets are in `dist/assets/`
3. Verify HTTPS is enabled (required for some features)

## Production Checklist

Before deploying:
- [ ] Run `npm run build` successfully
- [ ] Test `npm run preview` locally
- [ ] Test on desktop browser
- [ ] Test on mobile browser (using `--host`)
- [ ] Verify all 3 levels load
- [ ] Check Settings menu works
- [ ] Test save/load functionality
- [ ] Confirm touch controls work (mobile)
- [ ] Verify 60fps performance
- [ ] Test with slow 4G connection

## Support

For deployment issues:
- Check Vite docs: https://vitejs.dev/guide/static-deploy.html
- Phaser deployment: https://phaser.io/tutorials/getting-started-phaser3/part5

---

**Game Info:**
- Engine: Phaser 3
- Build Tool: Vite
- Target: 60fps on mid-tier mobile devices
- Resolution: 320×180 (retro) or 640×360 (polished)
