# Bluecadet Drops

NodeJS tools to help building Drupal custom modules for Bluecadet.

## Usage

### `set-version`

Sets the module version across `package.json` and every `*.info.yml` file.

```
npx set-version -v <newversion>   # e.g. 1.2.0, or 1.2.0-alpha.1
npx set-version -v patch          # or major/minor/patch/premajor/preminor/prepatch/prerelease
npx set-version -v patch -c       # also commit and tag the change
```

### `drops-audit`

Runs `npm audit` and reports only the actual root-cause vulnerabilities
(collapsing pass-through packages that are only listed because they depend
on one), noting for each whether it's already pinned directly in this
project's `package.json` or purely transitive, and whether a fix is
available upstream. Exits non-zero if any vulnerability needs action.

```
npx drops-audit
```

Use this to decide whether a package needs to be added as a new pinned
dependency here (the same pattern `@bluecadet/bldr` and `brace-expansion`
already use) to force npm to dedupe to a patched version.
