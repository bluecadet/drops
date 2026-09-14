#!/usr/bin/env node

const { execSync } = require('child_process');
const chalk = require('chalk');

// Load the current project's own package.json (cwd of whoever runs this,
// not this package's own package.json).
const pkg = require(process.cwd() + '/package.json');
const ownDeps = pkg.dependencies || {};

function runAudit() {
  try {
    return execSync('npm audit --json', { encoding: 'utf8' });
  }
  catch (err) {
    // npm audit exits non-zero when it finds vulnerabilities; the JSON is
    // still on stdout.
    if (err.stdout) {
      return err.stdout;
    }
    throw err;
  }
}

let auditJson;
try {
  auditJson = JSON.parse(runAudit());
}
catch (err) {
  console.error(chalk.red('Could not run/parse npm audit: ' + err.message));
  process.exit(1);
}

const vulns = auditJson.vulnerabilities || {};
const names = Object.keys(vulns);

if (names.length === 0) {
  console.log(chalk.green('No known vulnerabilities found.'));
  process.exit(0);
}

// A "leaf" is a package that is itself the direct source of a CVE (its
// `via` array contains at least one advisory object), as opposed to a
// package that is only listed because it depends on a vulnerable leaf
// (its `via` array contains only strings, i.e. other package names).
const leaves = names.filter((name) => {
  return vulns[name].via.some((v) => typeof v === 'object');
});

console.log(chalk.yellow(`Found ${leaves.length} vulnerable package(s) (root cause):\n`));

let actionNeeded = 0;

leaves.forEach((name) => {
  const v = vulns[name];
  const fix = v.fixAvailable;
  // fixAvailable.name is the package that actually needs the version bump,
  // which is NOT always the same as the vulnerability's own name -- e.g. a
  // vulnerable transitive postcss is often only fixable by bumping the
  // *direct* dependent (postcss-advanced-variables) to a new major, not by
  // pinning postcss itself. Check pinned-ness against whichever package
  // actually needs to move.
  const fixPackage = (fix && typeof fix === 'object') ? fix.name : null;
  const fixVersion = (fix && typeof fix === 'object') ? fix.version : null;
  const fixIsMajor = (fix && typeof fix === 'object') ? fix.isSemVerMajor : false;
  const target = fixPackage || name;
  const pinned = Object.prototype.hasOwnProperty.call(ownDeps, target);
  const advisories = v.via.filter((item) => typeof item === 'object');
  const affects = names.filter((other) => other !== name && vulns[other].via.includes(name));

  console.log(chalk.bold(name) + ` (${v.severity})`);

  advisories.forEach((advisory) => {
    console.log(`  ${advisory.title}`);
    console.log(chalk.gray(`    ${advisory.url}`));
  });

  if (affects.length) {
    console.log(`  Also drags down: ${affects.join(', ')}`);
  }

  if (fixVersion) {
    const majorNote = fixIsMajor ? ' (major version bump)' : '';
    if (pinned) {
      console.log(`  "${target}" is already pinned directly in package.json as "${ownDeps[target]}".`);
      console.log(chalk.red(`  Update that pin to ^${fixVersion}${majorNote}.`));
    }
    else {
      console.log(`  "${target}" is not directly declared in package.json.`);
      console.log(chalk.red(`  Consider adding "${target}": "^${fixVersion}"${majorNote} as a new pinned dependency so npm dedupes to the patched version.`));
    }
    actionNeeded++;
  }
  else if (fix === true) {
    console.log(chalk.red('  npm reports a fix is available -- run `npm audit` for the exact package/version, then pin it.'));
    actionNeeded++;
  }
  else {
    console.log(chalk.gray('  No fix available upstream yet -- nothing actionable here; track separately.'));
  }

  console.log('');
});

if (actionNeeded > 0) {
  console.log(chalk.red(`${actionNeeded} issue(s) need action.`));
  process.exit(1);
}

console.log(chalk.green('All current vulnerabilities are already covered or have no available fix yet.'));
process.exit(0);
