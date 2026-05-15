import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log('=== Screenshot API Called ===');
  console.log('Method:', req.method);

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication - extract token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // Verify the token and get user (Supabase v1: auth.api.getUser)
    let userPayload = null;
    try {
      const { user, error: authError } = await supabaseAdmin.auth.api.getUser(token);
      if (user && !authError) {
        userPayload = user;
      } else {
        // Fallback: decode JWT payload
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          if (payload && payload.sub) {
            userPayload = { id: payload.sub, email: payload.email };
          }
        } catch (decodeErr) {
          console.error('JWT decode failure:', decodeErr);
        }
      }
    } catch (verifyErr) {
      console.error('Auth verification error:', verifyErr);
    }

    if (!userPayload) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    console.log('Authenticated user:', userPayload.id);

    // Check if user is super_admin using service role (bypasses RLS)
    const { data: metadata, error } = await supabaseAdmin
      .from('user_metadata')
      .select('*')
      .eq('user_id', userPayload.id)
      .single();

    if (error || !metadata || metadata.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Super admin only' });
    }

    const { url, actions = [], viewport = { width: 1920, height: 1080 }, fullPage = true, sessionData = null } = req.body;

    console.log('Screenshot request:', { url, viewport, fullPage, actionsCount: actions.length, hasSession: !!sessionData });

    // Validate URL
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Basic URL validation
    const urlObj = new URL(url);
    const allowedHosts = ['localhost', '127.0.0.1'];
    const isAllowed = allowedHosts.some(host => urlObj.hostname.includes(host)) ||
                      urlObj.hostname === process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '');

    if (!isAllowed && !urlObj.hostname.includes('localhost') && !urlObj.hostname.includes('127.0.0.1')) {
      return res.status(400).json({ error: 'URL must be from localhost or allowed domains' });
    }

    console.log('Launching browser...');
    // Launch browser
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log('Browser launched successfully');

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
      locale: 'ar',
      timezoneId: 'Asia/Baghdad'
    });

    const page = await context.newPage();

    try {
      // If session data is provided, inject it into localStorage for authenticated pages
      if (sessionData) {
        const origin = urlObj.origin;
        console.log('Injecting auth session for origin:', origin);

        // Navigate to the origin first to set localStorage
        await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Inject the Supabase v1 session into localStorage
        await page.evaluate((session) => {
          localStorage.setItem('supabase.auth.token', JSON.stringify(session));
        }, sessionData);

        console.log('Auth session injected into localStorage');
      }

      console.log('Navigating to URL:', url);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait for page content to fully render (JS hydration, data fetching)
      await page.waitForTimeout(3000);
      console.log('Navigation successful');

      // Execute actions sequentially
      for (const action of actions) {
        switch (action.type) {
          case 'click':
            await page.click(action.selector, { timeout: 10000 });
            await page.waitForTimeout(500);
            break;
          case 'fill':
            await page.fill(action.selector, action.value, { timeout: 10000 });
            await page.waitForTimeout(300);
            break;
          case 'wait':
            await page.waitForTimeout(action.ms || 1000);
            break;
          case 'scroll':
            if (action.selector) {
              await page.locator(action.selector).scrollIntoViewIfNeeded();
            } else {
              await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            }
            await page.waitForTimeout(500);
            break;
          case 'waitForSelector':
            await page.waitForSelector(action.selector, { timeout: 10000 });
            break;
          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `screenshot-${timestamp}.png`;
      const filepath = path.join(process.cwd(), 'public', 'screenshots', filename);

      console.log('Taking screenshot...');
      await page.screenshot({
        path: filepath,
        fullPage: fullPage,
        type: 'png'
      });

      console.log('Screenshot saved successfully');

      await browser.close();

      res.json({
        success: true,
        screenshotUrl: `/screenshots/${filename}`,
        filename: filename,
        message: 'Screenshot generated successfully'
      });

    } catch (actionError) {
      await browser.close();
      console.error('Action execution error:', actionError);
      return res.status(500).json({
        error: 'Failed to execute actions',
        details: actionError.message
      });
    }

  } catch (error) {
    console.error('Screenshot generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate screenshot',
      details: error.message
    });
  }
}
