const fs = require("node:fs");
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

// Icon base path (no extension). Forge resolves platform-specific files:
//   .icns on macOS, .ico on Windows. Linux makers want a concrete .png.
// Generate the whole set from ./assets/icon.png via `npm run icons`,
// which writes ./assets/icons/{icon.icns, icon.ico, 16x16.png … 1024x1024.png}.
const ICON_BASE = "./assets/icons/icon";
const ICON_PNG  = "./assets/icons/512x512.png";

const has = (p) => fs.existsSync(p);
const ifExists = (p) => (has(p) ? p : undefined);

module.exports = {
  packagerConfig: {
    name: "coagent",
    executableName: "coagent",
    appBundleId: "com.vincent.coagent",
    appCategoryType: "public.app-category.developer-tools",
    appCopyright: `Copyright © ${new Date().getFullYear()} Vincent Jang`,
    // packagerConfig.icon takes a base path; only set if any platform icon
    // actually exists, otherwise Forge complains.
    ...(has(`${ICON_BASE}.icns`) || has(`${ICON_BASE}.ico`)
      ? { icon: ICON_BASE }
      : {}),
    asar: true,
    // We build with electron-vite (npm run build) before forge packages,
    // so exclude source/config so the .asar only ships compiled output.
    ignore: [
      /^\/src($|\/)/,
      /^\/scripts($|\/)/,
      /^\/\.github($|\/)/,
      /^\/\.vscode($|\/)/,
      /^\/electron\.vite\.config\.ts$/,
      /^\/tsconfig.*\.json$/,
      /^\/forge\.config\.cjs$/,
      /^\/plan\.md$/,
      /^\/README\.md$/,
      /^\/\.gitignore$/,
      /^\/assets\/icon\.src\.png$/,
    ],
    // The agent-runtime (dist/agent-runtime/entry.cjs) is shipped INSIDE the
    // asar alongside dist/main, so that its require()s for the externals
    // (@anthropic-ai/claude-agent-sdk, ws, zod) resolve via the sibling
    // node_modules. See src/main/agent-manager.ts agentEntryPath().
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "coagent",
        setupIcon: ifExists(`${ICON_BASE}.ico`),
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin", "linux"],
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        format: "ULFO",
        icon: ifExists(`${ICON_BASE}.icns`),
      },
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          // Must match packagerConfig.executableName above; otherwise the
          // maker defaults to package.json `name` and can't find the binary.
          bin: "coagent",
          ...(has(ICON_PNG) ? { icon: ICON_PNG } : {}),
          categories: ["Development", "Utility"],
          section: "devel",
          maintainer: "Vincent Jang",
          homepage: "https://github.com/JangVincent/coagent-desktop",
        },
      },
    },
    {
      // AppImage — distro-agnostic single-file executable. Works on Arch,
      // Fedora, NixOS, and anything else with FUSE.
      name: "@reforged/maker-appimage",
      config: {
        options: {
          // Must match packagerConfig.executableName above; otherwise the
          // maker defaults to package.json `name` and can't find the binary.
          bin: "coagent",
          ...(has(ICON_PNG) ? { icon: ICON_PNG } : {}),
          categories: ["Development", "Utility"],
        },
      },
    },
  ],
  plugins: [
    // NOTE: we intentionally do NOT use @electron-forge/plugin-vite.
    // It expects a vanilla vite config, but ours is the electron-vite
    // shape (main/preload/renderer keys). Build is handled upstream by
    // `npm run build` (electron-vite); forge only packages out/.
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
