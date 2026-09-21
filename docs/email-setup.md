# Email setup (Gmail SMTP)

Valley Science sends verification codes and parent welcome emails through SMTP.

## Why you saw `535 BadCredentials`

Gmail **rejects normal account passwords** for apps. You must use a Google **App Password**.

Your log:

```text
Invalid login: 535-5.7.8 Username and Password not accepted
```

means `SMTP_USER` / `SMTP_PASS` were rejected by Google — not that Valley Science skipped sending.

## Fix (about 3 minutes)

1. Sign into the Google account that matches `SMTP_USER` in `backend/.env`
   (for you this is likely `valley.science.as@gmail.com`).
2. Turn on **2-Step Verification** if it is not already on:
   [Google Account → Security → 2-Step Verification](https://myaccount.google.com/security)
3. Create an App Password:
   [Google Account → Security → App passwords](https://myaccount.google.com/apppasswords)
   - App: **Mail**
   - Device: **Other** → type `Valley Science`
4. Google shows a **16-character** password (sometimes with spaces). Copy it.
5. Put it in `backend/.env` **without spaces**:

```bash
SMTP_SERVICE=gmail
SMTP_USER=valley.science.as@gmail.com
SMTP_PASS=abcdefghijklmnop
# Optional when using service=gmail:
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_SECURE=false
```

6. **Restart the backend** (`npm run dev:backend`) so it reloads `.env`.
7. Sign up again (or click Resend). You should see:

```text
[EMAIL] SENT to ...
```

instead of `[EMAIL] FAILED`.

## Important

- `SMTP_USER` must be the **same Google account** that created the App Password.
- Do **not** use your everyday Gmail password.
- If you regenerate an App Password, the old one stops working immediately.
- Workspace / school Google accounts sometimes block App Passwords — use a personal Gmail or ask an admin to allow them.

## Dev fallback

If email still fails, the backend logs the verification code:

```text
[VERIFY:signup] Code for you@example.com: 123456
```

The signup screen will also warn you when delivery fails.
