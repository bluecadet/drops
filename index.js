#!/usr/bin/env node

var path = require('path');
const fs = require('fs');
const date = require('date-and-time');
var commandExists = require('command-exists');
const chalk = require('chalk');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv))
  .version(false)
  .option('v', {
    alias: 'version',
    type: 'string',
    demandOption: true,
    description: 'Version of the module. [<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease]'
  })
  .option('incCommit', {
    alias: 'c',
    type: 'boolean',
    default: false,
    description: 'Make the commit.'
  })
  .help()
  .argv;

const semver = require('semver');
const { exec } = require("child_process");

// Create new text.
let package_path = process.cwd() + "/package.json";
var pjson = require(package_path);
const project = pjson.name;
const now = new Date();
let current_version = pjson.version;
let new_version = "";

switch (argv['v']) {
  case 'major':
  case 'minor':
  case 'patch':
  case 'premajor':
  case 'preminor':
  case 'prepatch':
  case 'prerelease':
    new_version = semver.inc(current_version, argv['v']);
    break;

  default:
      new_version = argv['v'];
}

if (!semver.valid(new_version)) {
  console.error(chalk.red("Version is not semantically correct: " + new_version));
  process.exit(1);
}

console.log(chalk.yellow("Setting new Version: " + new_version));

let bldMsg = "# Information added by packaging script on " + date.format(now, 'YYYY-MM-DD') + "\r\n";
bldMsg += "version: " + new_version + "\r\n";
bldMsg += "project: " + project + "\r\n";
bldMsg += "datestamp: " + Date.now();

let infoFiles = [];
fromDir('./', /\.info.yml$/, function(filename) {
  infoFiles.push(filename);
});

let writes = [];

infoFiles.forEach((filename) => {
  let p = fs.readFile(filename, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    const index = data.indexOf("# Information added by packaging script on ");

    if (index == -1) {
      data += "\r\n\r\n" + bldMsg;
    }
    else {
      data = data.substring(0, index) + bldMsg;
    }

    console.log(chalk.yellow("Updating " + filename + "  ..."));
    fs.writeFile(filename, data, { flag: 'w+' }, err => {
      if (err) console.log(err);
    });
  });
  writes.push(p);
});

Promise.all(writes).then(() => {
  console.log(chalk.yellow("Updating package.json ..."));

  exec("npm version --allow-same-version --no-commit-hooks --no-git-tag-version " + new_version, (error, stdout, stderr) => {


    if (error) {
      console.log(chalk.red("Error updating package.json"));
      console.log(`\r\nerror:\r\n${error.message}`);
      return;
    }

    if (stderr) {
      console.log(chalk.red("StError updating package.json"));
      console.log(`\r\nstderr:\r\n${stderr}`);
      return;
    }

    console.log(`\r\nstdout: \r\n${stdout}`);
    console.log(chalk.blue("Finished updating package.json"));

    if (argv['c']) {
      console.log(chalk.yellow("Attempting to commit changes..."));

      commandExists('git', function (err, commandExists) {
        if (commandExists) {
          // git tag new_version
          exec("git add . && git commit -m \"Changing version to " + new_version + "\" && git tag  " + new_version, (error, stdout, stderr) => {
            if (error) {
              console.log(`\r\nerror:\r\n${error.message}`);
              return;
            }
            if (stderr) {
              console.log(`\r\nstderr:\r\n${stderr}`);
              return;
            }
            console.log(`\r\nstdout:\r\n${stdout}`);

            console.log(chalk.blue("Finished commiting changes"));
            console.log(chalk.green("\r\nSUCCESS"));
          });
        }
        if (err) {
          console.error(chalk.red(err));
        }
      });
    }
    else {
      console.log(chalk.green("\r\nSUCCESS"));
    }
  });
});


function fromDir(startPath, filter, callback) {
    if (!fs.existsSync(startPath)) {
        console.log("no dir ", startPath);
        return;
    }

    var files = fs.readdirSync(startPath);
    for (var i = 0; i < files.length; i++) {
        var filename = path.join(startPath, files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            fromDir(filename, filter, callback); //recurse
        } else if (filter.test(filename)) callback(filename);
    }
}
