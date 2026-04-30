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
    // The agent-runtime is built separately by esbuild → out/agent-runtime/entry.cjs.
    // Ship it as an extraResource so app.isPackaged path resolves to
    // process.resourcesPath/agent-runtime/entry.cjs (see src/main/agent-manager.ts).
    extraResource: ["./out/agent-runtime"],
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
          ...(has(ICON_PNG) ? { icon: ICON_PNG } : {}),
          categories: ["Development", "Utility"],
          section: "devel",
          maintainer: "Vincent Jang",
          homepage: "https://github.com/VincentJang/coagent-desktop",
        },
      },
    },
    {
      // AppImage — distro-agnostic single-file executable. Works on Arch,
      // Fedora, NixOS, and anything else with FUSE.
      name: "@reforged/maker-appimage",
      config: {
        options: {
          ...(has(ICON_PNG) ? { icon: ICON_PNG } : {}),
          categories: ["Development", "Utility"],
        },
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-vite",
      config: {
        build: [
          { entry: "src/main/main.ts", config: "electron.vite.config.ts", target: "main" },
          { entry: "src/main/preload.ts", config: "electron.vite.config.ts", target: "preload" },
        ],
        renderer: [
          { name: "main_window", config: "electron.vite.config.ts", target: "renderer" },
        ],
      },
    },
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
