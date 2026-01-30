/**
 * Version utility - Single source of truth from package.json
 *
 * This module provides the application version by reading from package.json,
 * ensuring consistency across the entire codebase.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface PackageJson {
  version: string;
  name: string;
  description: string;
}

/**
 * Read and parse package.json
 * Uses import.meta.url to find the package.json relative to this file
 */
function loadPackageJson(): PackageJson {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // Navigate from src/ or dist/ to project root
  const packagePath = join(__dirname, '..', 'package.json');
  const content = readFileSync(packagePath, 'utf-8');
  return JSON.parse(content) as PackageJson;
}

// Cache the package.json data
let cachedPackageJson: PackageJson | null = null;

function getPackageJson(): PackageJson {
  cachedPackageJson ??= loadPackageJson();
  return cachedPackageJson;
}

/** Application version from package.json */
export const VERSION: string = getPackageJson().version;

/** Application name from package.json */
export const NAME: string = getPackageJson().name;

/** Application description from package.json */
export const DESCRIPTION: string = getPackageJson().description;
