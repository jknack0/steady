/**
 * Monorepo workaround: expo-router lives in apps/mobile/node_modules (not hoisted)
 * but babel-preset-expo needs to resolve it from the root to enable the router
 * babel plugin. This script creates a junction link after install.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootModules = path.join(__dirname, "..", "node_modules");
const mobileModules = path.join(__dirname, "..", "apps", "mobile", "node_modules");

const routerRoot = path.join(rootModules, "expo-router");
const routerMobile = path.join(mobileModules, "expo-router");

if (fs.existsSync(routerMobile) && !fs.existsSync(routerRoot)) {
  if (process.platform === "win32") {
    execSync(`mklink /J "${routerRoot}" "${routerMobile}"`);
  } else {
    fs.symlinkSync(routerMobile, routerRoot, "junction");
  }
  console.log("Linked expo-router to root node_modules for babel-preset-expo");
}
