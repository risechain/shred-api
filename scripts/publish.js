#!/usr/bin/env node

/**
 * Simple package publishing script
 * 
 * Usage:
 *   node scripts/publish.js [version] [tag]
 * 
 * Examples:
 *   node scripts/publish.js             # Publishes current version
 *   node scripts/publish.js patch       # Bumps patch version and publishes
 *   node scripts/publish.js minor       # Bumps minor version and publishes
 *   node scripts/publish.js major       # Bumps major version and publishes
 *   node scripts/publish.js 1.2.3       # Publishes specific version
 *   node scripts/publish.js 1.2.3 beta  # Publishes with beta tag
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Get command line arguments
const args = process.argv.slice(2);
const versionArg = args[0];
const tagArg = args[1];

// Verify the dist directory exists
if (!existsSync('./dist')) {
  console.error('Error: dist directory not found. Run "npm run build" first.');
  process.exit(1);
}

try {
  // Version the package if a version arg was provided
  if (versionArg) {
    // Check if it's a valid semver keyword
    if (['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'].includes(versionArg)) {
      console.log(`Bumping ${versionArg} version...`);
      execSync(`npm version ${versionArg} --no-git-tag-version`, { stdio: 'inherit' });
    } else {
      // Otherwise assume it's a specific version number
      console.log(`Setting version to ${versionArg}...`);
      execSync(`npm version ${versionArg} --no-git-tag-version --allow-same-version`, { stdio: 'inherit' });
    }
  }

  // Build the package (ensures latest changes are included)
  console.log('Building the package...');
  execSync('npm run build', { stdio: 'inherit' });

  // Publish the package with optional tag
  const publishCommand = tagArg 
    ? `npm publish --tag ${tagArg}` 
    : 'npm publish';
  
  console.log('Publishing the package...');
  execSync(publishCommand, { stdio: 'inherit' });

  console.log('Package published successfully!');
} catch (error) {
  console.error('Error publishing package:', error.message);
  process.exit(1);
}