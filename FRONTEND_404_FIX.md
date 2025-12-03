# 🔧 Frontend 404 Error Fix - Complete Solution

## ✅ Issues Fixed

1. **Removed problematic Vercel rewrite rule** that was intercepting `/api/*` requests
2. **Added 404 handler** to backend for better error messages
3. **Verified backend routes** are correctly registered

## 🚀 Required Actions

### Step 1: Set Frontend Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add/Update the following variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://lawgpt-production-1f1d.up.railway.app`
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**

### Step 2: Set Backend CORS in Railway

1. Go to your Railway project dashboard
2. Navigate to your backend service → **Variables** tab
3. Add/Update the following variable:
   - **Name**: `CORS_ORIGIN`
   - **Value**: Your Vercel frontend URL (e.g., `https://law-gpt-black.vercel.app`)
   - **Important**: Use your actual Vercel frontend URL, not a placeholder
4. Click **Save**

### Step 3: Redeploy Both Services

**Frontend (Vercel):**
- After adding `VITE_API_URL`, Vercel should auto-redeploy
- Or manually trigger a redeploy from the Vercel dashboard

**Backend (Railway):**
- After updating `CORS_ORIGIN`, Railway should auto-redeploy
- Or manually trigger a redeploy from the Railway dashboard

## 🔍 Verification Steps

1. **Test Backend Health:**
   ```bash
   curl https://lawgpt-production-1f1d.up.railway.app/api/health
   ```
   Should return: `{"ok":true,"service":"lawyer-zen-api"}`

2. **Test Backend Auth Route:**
   ```bash
   curl https://lawgpt-production-1f1d.up.railway.app/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}'
   ```
   Should return a JSON response (even if credentials are invalid, it should not be 404)

3. **Test Frontend:**
   - Open your Vercel frontend URL
   - Open browser DevTools → Network tab
   - Try to login
   - Check that requests go to `https://lawgpt-production-1f1d.up.railway.app/api/auth/login`
   - Should NOT see 404 errors

## 🐛 Troubleshooting

### Still Getting 404 Errors?

1. **Check Vercel Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Verify `VITE_API_URL` is set correctly
   - Make sure it's set for the correct environment (Production/Preview)

2. **Check Railway CORS:**
   - Go to Railway Dashboard → Your Service → Variables
   - Verify `CORS_ORIGIN` matches your Vercel frontend URL exactly
   - No trailing slash, include `https://`

3. **Check Browser Console:**
   - Open DevTools → Console
   - Look for any errors about API URL construction
   - Verify the URL being called is correct

4. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache completely

5. **Verify Backend Routes:**
   - Test directly: `https://lawgpt-production-1f1d.up.railway.app/api/auth/login`
   - Should return JSON (not 404)

### CORS Errors?

- Make sure `CORS_ORIGIN` in Railway matches your Vercel frontend URL exactly
- Include the protocol (`https://`)
- No trailing slash
- If using multiple domains, separate with commas: `https://domain1.com,https://domain2.com`

### Environment Variables Not Working?

- **Vercel**: After adding variables, you MUST redeploy
- **Railway**: Variables are applied on next deploy
- For Vite, variables must start with `VITE_` prefix

## 📝 Summary of Changes

1. ✅ **vercel.json**: Removed problematic rewrite rule
2. ✅ **backend/index.js**: Added 404 handler for better debugging
3. ✅ **Routes verified**: All backend routes are correctly registered

## 🎯 Next Steps

1. Set `VITE_API_URL` in Vercel (Step 1 above)
2. Set `CORS_ORIGIN` in Railway (Step 2 above)
3. Redeploy both services
4. Test login functionality
5. Verify all API calls work correctly

---

**If issues persist after following these steps, check:**
- Railway logs for backend errors
- Vercel build logs for frontend build issues
- Browser Network tab for actual request URLs


