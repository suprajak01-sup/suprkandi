#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const readline = require('readline');
const { Command } = require('commander');
const pkg = require('../package.json');
const { translateFile } = require('../src/translator');
const { SuprKandi } = require('../src/engine');

const program = new Command();

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileSafe(source, destination, force = false) {
  if (fs.existsSync(destination) && !force) {
    return false;
  }

  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
  return true;
}

function writeFileSafe(destination, content, force = false) {
  if (fs.existsSync(destination) && !force) {
    return false;
  }

  ensureDir(path.dirname(destination));
  fs.writeFileSync(destination, content, 'utf8');
  return true;
}

program
  .name('kandi')
  .description('SuprKandi hybrid testing + RPA CLI')
  .version(pkg.version);

program
  .command('init')
  .argument('[directory]', 'project directory', '.')
  .option('-f, --force', 'overwrite existing SuprKandi starter files', false)
  .description('Create a new SuprKandi automation workspace')
  .action((directory, options) => {
    const targetDir = path.resolve(process.cwd(), directory);
    const templateDir = path.resolve(__dirname, '..', 'templates');

    ensureDir(targetDir);

    const directories = [
      'workspaces',
      'scripts',
      'evidence',
      'reports'
    ];

    for (const dir of directories) {
      ensureDir(path.join(targetDir, dir));
    }

    const created = [];
    const skipped = [];

    const files = [
      {
        source: path.join(templateDir, 'kandi.config.js'),
        destination: path.join(targetDir, 'kandi.config.js')
      },
      {
        source: path.join(templateDir, 'sample.txt'),
        destination: path.join(targetDir, 'workspaces', 'sample.txt')
      }
    ];

    for (const item of files) {
      if (!fs.existsSync(item.source)) {
        throw new Error(`Required template is missing: ${item.source}`);
      }

      if (copyFileSafe(item.source, item.destination, options.force)) {
        created.push(path.relative(targetDir, item.destination));
      } else {
        skipped.push(path.relative(targetDir, item.destination));
      }
    }

    const gitignore = [
      '# SuprKandi transient runtime output',
      'evidence/*',
      '!evidence/.gitkeep',
      'reports/*',
      '!reports/.gitkeep',
      'scripts/*.generated.js',
      '',
      '# Local configuration / secrets',
      '.env',
      '.env.*',
      '',
      '# Node',
      'node_modules/',
      'npm-debug.log*',
      ''
    ].join('\n');

    const gitignorePath = path.join(targetDir, '.gitignore');
    if (writeFileSafe(gitignorePath, gitignore, options.force)) {
      created.push('.gitignore');
    } else {
      skipped.push('.gitignore');
    }

    for (const dir of directories) {
      const keep = path.join(targetDir, dir, '.gitkeep');
      if (writeFileSafe(keep, '', false)) {
        created.push(path.relative(targetDir, keep));
      }
    }

    console.log('');
    console.log('SuprKandi project initialized.');
    console.log(`Project: ${targetDir}`);

    if (created.length) {
      console.log('');
      console.log('Created:');
      for (const file of created) console.log(`  + ${file}`);
    }

    if (skipped.length) {
      console.log('');
      console.log('Already existed (not overwritten):');
      for (const file of skipped) console.log(`  = ${file}`);
    }

    console.log('');
    console.log('Next:');
    console.log(`  cd "${targetDir}"`);
    console.log('  kandi automate workspaces/sample.txt');
    console.log('');
  });


program
  .command('doctor')
  .description('Check whether the local machine is ready to run SuprKandi')
  .action(() => {
    const checks = [];

    function addCheck(name, ok, detail = '') {
      checks.push({ name, ok, detail });
    }

    const [major, minor] = process.versions.node
      .split('.')
      .map((value) => Number(value));

    const nodeOk =
      major > 22 ||
      (major === 22 && minor >= 12);

    addCheck('Node.js', nodeOk, process.versions.node);

    addCheck(
      'Operating system',
      process.platform === 'win32',
      `${process.platform} ${process.arch}`
    );

    const dependencies = [
      ['commander', 'CLI'],
      ['selenium-webdriver', 'Selenium'],
      ['robotjs', 'RobotJS'],
      ['screenshot-desktop', 'Desktop screenshots'],
      ['docx', 'DOCX reporter'],
      ['pg', 'PostgreSQL driver'],
      ['mysql2', 'MySQL driver']
    ];

    for (const [moduleName, label] of dependencies) {
      try {
        require.resolve(moduleName);
        addCheck(label, true, moduleName);
      } catch (error) {
        addCheck(label, false, `${moduleName} not found`);
      }
    }

    console.log('');
    console.log('SuprKandi Doctor');
    console.log('-----------------');

    for (const check of checks) {
      const symbol = check.ok ? 'PASS' : 'FAIL';
      const detail = check.detail ? ` (${check.detail})` : '';
      console.log(`[${symbol}] ${check.name}${detail}`);
    }

    const failures = checks.filter((check) => !check.ok);

    console.log('');

    if (failures.length === 0) {
      console.log('SuprKandi environment is ready.');
      return;
    }

    console.log(`${failures.length} environment check(s) failed.`);
    console.log('Fix the failed items and run: kandi doctor');
    process.exitCode = 1;
  });

program
  .command('translate')
  .argument('<workspace>', 'plain-English .txt file')
  .option('-n, --name <name>', 'test name')
  .description('Translate a workspace into scripts/*.generated.js without executing it')
  .action((workspace, options) => {
    const result = translateFile(workspace, {
      testName: options.name,
      projectRoot: process.cwd()
    });
    console.log(`Generated: ${result.outputPath}`);
  });

program
  .command('automate')
  .alias('run')
  .argument('<workspace>', 'plain-English .txt file')
  .option('-n, --name <name>', 'test name')
  .description('Translate and immediately execute a plain-English workspace')
  .action((workspace, options) => {
    const projectRoot = process.cwd();

    const result = translateFile(workspace, {
      testName: options.name,
      projectRoot
    });

    console.log(`Generated: ${result.outputPath}`);

    const child = spawnSync(process.execPath, [result.outputPath], {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    if (child.error) throw child.error;

    process.exitCode =
      typeof child.status === 'number'
        ? child.status
        : 1;
  });

program
  .command('audit')
  .argument('[name]', 'audit/test name', 'Manual Audit')
  .description('Start an interactive manual audit session with desktop evidence after every recorded step')
  .action(async (name) => {
    const kandi = new SuprKandi({
      testName: name,
      failFast: false,
      rootDir: process.cwd()
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const ask = (q) =>
      new Promise((resolve) => rl.question(q, resolve));

    console.log('\nManual Audit Mode');
    console.log('Perform an action, then describe it and press Enter.');
    console.log('Commands: :fail <description>  |  :done\n');

    try {
      while (true) {
        const input = (await ask('step> ')).trim();

        if (!input) continue;

        if (input.toLowerCase() === ':done') {
          break;
        }

        if (input.toLowerCase().startsWith(':fail ')) {
          await kandi.recordManualStep(
            input.slice(6).trim(),
            'FAIL',
            'Marked failed by tester.'
          );
        } else {
          await kandi.recordManualStep(input, 'PASS');
        }
      }
    } finally {
      rl.close();
      await kandi.finalize();
    }
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
