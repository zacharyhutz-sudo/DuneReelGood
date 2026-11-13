# DuneReelGood

A website for the beach house at 135 Sand Pine Drive in Barrier Dunes, Cape San Blas, Florida. The public calendar, estimates, and owner dashboard are custom. Rates and blocked dates live in Netlify Blobs. Guest inquiries go to Netlify Forms.

## 1. Upload to GitHub

1. Unzip the download. Create a repository named `dunereelgood` at [github.com/new](https://github.com/new). Initialize it with a README so GitHub creates the `main` branch. A private repository is fine if Netlify will host your site.
2. In the repository, choose **Add file → Upload files**. Open the extracted folder and drag its contents into GitHub, including the `docs/` and `netlify/` folders. The repo root should contain `netlify.toml`, `package.json`, `package-lock.json`, `README.md`, `docs/`, and `netlify/`. Commit to `main`. If you prefer GitHub Desktop, clone the empty starter repository, copy the extracted contents into it, commit, and push.
3. If you also want a static GitHub Pages copy, go to **Settings → Pages → Deploy from a branch**, choose **main** and **/docs**, and save. The design, gallery, and guide work there. Use the Netlify address for availability, inquiries, and the owner dashboard. The Netlify deploy connects directly to your GitHub repository.

[GitHub upload instructions](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository) · [GitHub Pages settings](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 2. Connect Netlify

1. At [app.netlify.com/start](https://app.netlify.com/start), select **Add new project → Import an existing project → GitHub**. Authorize access to the new repository and select it. If your repo is missing, update the Netlify GitHub App’s repository permissions.
2. Use these settings. The included `netlify.toml` supplies the publish and functions paths.

   | Setting | Value |
   | --- | --- |
   | Production branch | `main` |
   | Base directory | Leave blank (repository root) |
   | Build command | Leave blank |
   | Publish directory | `docs` |
   | Functions directory | `netlify/functions` (set in `netlify.toml`) |

3. Select **Deploy**. Netlify gives you a `netlify.app` address. New commits to `main` redeploy the site automatically. To change the subdomain, open **Project Overview → Customize → Manage project name and cover image** and change the project name.

[Netlify repository deployment](https://docs.netlify.com/start/quickstarts/deploy-from-repository/) · [Netlify project name](https://docs.netlify.com/manage/projects/customize-project-name-and-cover-image/)

## 3. Set up owner access and inquiries

1. Choose a password for the owner dashboard and save it in your password manager. The password field requires a value and has no minimum length.
2. In Netlify, open **Project configuration → Environment variables** and add `DUNE_ADMIN_KEY` with that value. Mark it as secret if the option is shown. Choose **Production** as the deploy context and **Functions** if scope selection is available. Store the key only in Netlify and your password manager.
3. In **Forms**, select **Enable form detection** if needed. Under **Deploys**, trigger a new production deploy so Netlify picks up the key and scans the form.
4. In **Forms → Submission notifications**, add an email notification for `booking-inquiry`. Use the email address your dad wants to receive inquiries at. Complete the confirmation if Netlify sends one.
5. Submit a test inquiry from the public Netlify booking page. Check the success screen, the `booking-inquiry` entry in Netlify Forms, and the email inbox. The guest gets an on-site confirmation. Reply to their email directly.

[Netlify environment variables](https://docs.netlify.com/build/functions/environment-variables/) · [Form detection](https://docs.netlify.com/manage/forms/setup/) · [Form notifications](https://docs.netlify.com/manage/forms/notifications/)

## 4. Load the calendar before sharing the site

1. Visit `/admin/` on the production Netlify address and enter the owner key.
2. Add every existing reservation and owner hold under **Blocked dates**. Set the first occupied night and checkout date. Checkout remains available to the next guest unless another block covers that night. Private notes are visible only after owner sign-in.
3. Enter the usual nightly amount under **Calendar settings**. Add any seasonal overrides under **Seasonal rates**. A seasonal date range includes the last night entered. A new rate replaces overlapping nights and preserves the rest of the earlier rate. Leave the default blank to quote stays by email when they include a night without a seasonal rate.
4. Turn on **Show available dates publicly**, then save. Open `/book/` in a private window. Test an open stay, a stay ending on the first blocked night, and a stay crossing that block. Check a stay spanning two nightly rates. Estimates cover lodging only. Confirm taxes, fees, rules, and the final total by email.
5. When a booking becomes firm, enter the date block. Copy new reservations or changes from Cape Escape and any other booking channel into this calendar so the two stay in sync. The inquiry form sends a request and leaves the dates open until you block them.

The dashboard stores changes as you save. Netlify uses site-wide Blobs that persist across deploys. When two dashboards edit the same version, the first save succeeds and the second editor is asked to reload.

## Photos, reviews, and edits

- Photos and property facts are from the [Cape Escape Dune Reel Good listing](https://www.thecapeescape.com/cape-san-blas-vacation-rentals/dune-reel-good/). Confirm reuse permission with the property manager or photographer before publishing the packaged photos.
- The guest review carousel appears after you add approved DuneReelGood reviews to `docs/assets/reviews.json`. Use an array of objects with the fields `name` and `text`. The uploaded reference site’s reviews are for a different property.
- Pages and photo captions are in `docs/`. Colors and typography are in `docs/assets/site.css`. Update the repository to redeploy edits. The live calendar and form submissions are managed through Netlify.
- For a quick static local preview, run `python3 -m http.server --directory docs` from the repository root. Forms, Netlify Blobs, and the owner dashboard should be checked on the production Netlify URL.
