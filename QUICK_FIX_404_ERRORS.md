# 🚨 Quick Fix: Frontend 404 Errors

## ✅ What I Fixed

1. **Removed Vercel rewrite rule** that was intercepting API requests
2. **Added 404 handler** to backend for better error messages  
3. **Updated Firebase check** to include base64 option

## 🎯 What YOU Need to Do (3 Steps)

### Step 1: Set VITE_API_URL in Vercel ⚡

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add/Update:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://lawgpt-production-1f1d.up.railway.app`
   - **Environments**: Select all (Production, Preview, Development)
3. Click **Save**
4. **Redeploy** your frontend (Vercel will auto-redeploy or trigger manually)

### Step 2: Set CORS_ORIGIN in Railway ⚡

1. Go to **Railway Dashboard** → Your Backend Service → **Variables** tab
2. Add/Update:
   - **Name**: `CORS_ORIGIN`
   - **Value**: Your Vercel frontend URL (e.g., `https://law-gpt-black.vercel.app`)
   - **Important**: Use your ACTUAL Vercel frontend URL (check your Vercel dashboard)
3. Click **Save**
4. Railway will auto-redeploy

### Step 3: Test It! ✅

1. Wait for both services to finish redeploying (2-3 minutes)
2. Open your Vercel frontend URL
3. Try to login
4. Check browser DevTools → Network tab
5. Should see requests going to `https://lawgpt-production-1f1d.up.railway.app/api/auth/login`
6. Should NOT see 404 errors anymore!

## 🔍 How to Find Your Vercel Frontend URL

1. Go to Vercel Dashboard
2. Click on your project
3. Look at the top - you'll see your domain (e.g., `https://law-gpt-black.vercel.app`)
4. Copy that exact URL (with `https://`)

## ⚠️ Common Mistakes

- ❌ Forgetting to include `https://` in URLs
- ❌ Adding trailing slashes (e.g., `https://url.com/`)
- ❌ Not redeploying after adding environment variables
- ❌ Using wrong Vercel URL in CORS_ORIGIN

## 🐛 Still Not Working?

1. **Check Vercel Environment Variables:**
   - Make sure `VITE_API_URL` is set for Production environment
   - Redeploy after adding variables

2. **Check Railway Variables:**
   - Verify `CORS_ORIGIN` matches your Vercel URL exactly
   - No typos, correct protocol (`https://`)

3. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

4. **Check Browser Console:**
   - Open DevTools → Console
   - Look for errors about API URL
   - Verify the URL being called

---

**After completing these 3 steps, your 404 errors should be resolved!** 🎉


