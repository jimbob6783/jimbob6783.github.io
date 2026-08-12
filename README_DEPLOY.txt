Chris Bridges Portfolio — Fixed GitHub Pages Replacement

This version embeds the two featured project preview images directly into index.html.
That means the project previews no longer depend on asset paths and should render
correctly even if GitHub Pages handles folder paths unexpectedly.

To deploy:
1. Replace the existing files in your GitHub Pages repository root with ALL files from this ZIP.
2. Preserve the included CNAME file if you are continuing to use the same custom domain.
3. Commit the changes and wait for GitHub Pages to rebuild.
4. Hard-refresh the site (Ctrl+Shift+R on Windows or Cmd+Shift+R on Mac).

The assets folder is still included for maintainability, but the featured preview images
will display even without those external image paths.
