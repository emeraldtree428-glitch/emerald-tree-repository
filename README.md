# Emerald Tree — Netlify Hotel Manager

This version combines:
- Public Emerald Tree landing page
- Guest feedback submission
- Staff approval/rejection/removal of reviews
- Private room-price management for Standard, Deluxe and Executive rooms

Normal workflow:
1. Guest submits feedback.
2. It stays pending until staff approval.
3. Staff changes prices or approves reviews from `/admin.html`.
4. The public website automatically displays current prices and approved reviews.

## Netlify setup

1. Deploy this folder to your Netlify site.
2. Add an environment variable named `REVIEWS_ADMIN_TOKEN` with a long random secret.
3. Redeploy after adding the variable.
4. Open `https://YOUR-DOMAIN/admin.html` and enter that secret.
5. Never publish the secret in HTML/JS or share it with guests.

The project uses Netlify Functions and Netlify Blobs.
