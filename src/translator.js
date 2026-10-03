const fs = require('fs');
const path = require('path');

function escapeTemplateLiteral(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function bt(value) {
  return '`' + escapeTemplateLiteral(value) + '`';
}

function stripOuterQuotes(value) {
  const text = String(value).trim();

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('`') && text.endsWith('`'))
  ) {
    return text.slice(1, -1);
  }

  return text;
}

function parseInstruction(originalLine) {
  const line = originalLine.trim();
  let m;

  m = line.match(
    /^open\s+(?:the\s+)?browser(?:\s+(?:in|using)\s+(chrome|firefox|edge))?\s+(?:to|at|on)\s+(.+)$/i
  );

  if (m) {
    let url = stripOuterQuotes(m[2]);
    let browser = (m[1] || 'chrome').toLowerCase();

    const trailingBrowser = url.match(
      /^(.*)\s+(?:in|using)\s+(chrome|firefox|edge)$/i
    );

    if (trailingBrowser) {
      url = stripOuterQuotes(trailingBrowser[1]);
      browser = trailingBrowser[2].toLowerCase();
    }

    return `await kandi.openBrowser(${bt(line)}, ${bt(url)}, ${bt(browser)});`;
  }

  m = line.match(/^(?:go|navigate|browse)\s+(?:to\s+)?(.+)$/i);
  if (m) {
    return `await kandi.goto(${bt(line)}, ${bt(stripOuterQuotes(m[1]))});`;
  }

  m = line.match(
    /^click\s+(?:on\s+)?(?:the\s+)?(?:element|selector)\s+(.+)$/i
  );

  if (m) {
    return `await kandi.click(${bt(line)}, ${bt(stripOuterQuotes(m[1]))});`;
  }

  m = line.match(/^click\s+(.+)$/i);

  if (m) {
    const rawTarget = m[1].trim();
    const target = stripOuterQuotes(rawTarget);
    const explicitlyQuoted = /^["'`].*["'`]$/.test(rawTarget);

    const buttonOrLink = target.match(
      /^(?:on\s+)?(?:the\s+)?(?:button|link)\s+(.+)$/i
    );

    if (buttonOrLink) {
      return `await kandi.clickText(${bt(line)}, ${bt(stripOuterQuotes(buttonOrLink[1]))});`;
    }

    if (
      explicitlyQuoted ||
      /^[#.\[]|\s[>+~]|[a-z]+\[/i.test(target) ||
      target.includes('=')
    ) {
      return `await kandi.click(${bt(line)}, ${bt(target)});`;
    }

    return `await kandi.clickText(${bt(line)}, ${bt(target)});`;
  }

  m = line.match(
    /^type\s+(["'`].*?["'`]|\S+)\s+(?:into|in|inside)\s+(.+)$/i
  );

  if (m) {
    return `await kandi.type(${bt(line)}, ${bt(stripOuterQuotes(m[2]))}, ${bt(stripOuterQuotes(m[1]))});`;
  }

  m = line.match(
    /^enter\s+(["'`].*?["'`]|\S+)\s+(?:into|in|inside)\s+(.+)$/i
  );

  if (m) {
    return `await kandi.type(${bt(line)}, ${bt(stripOuterQuotes(m[2]))}, ${bt(stripOuterQuotes(m[1]))});`;
  }

  m = line.match(
    /^press\s+(?:browser\s+)?key\s+(["'`]?.+?["'`]?)\s+(?:in|on)\s+(.+)$/i
  );

  if (m) {
    return `await kandi.pressBrowserKey(${bt(line)}, ${bt(stripOuterQuotes(m[2]))}, ${bt(stripOuterQuotes(m[1]))});`;
  }

  m = line.match(
    /^verify\s+text\s+(["'`].*?["'`])\s+(?:in|inside|on)\s+(.+)$/i
  );

  if (m) {
    return `await kandi.verifyText(${bt(line)}, ${bt(stripOuterQuotes(m[2]))}, ${bt(stripOuterQuotes(m[1]))});`;
  }

  m = line.match(/^verify\s+(?:the\s+)?page\s+contains\s+(.+)$/i);

  if (m) {
    return `await kandi.verifyPageContains(${bt(line)}, ${bt(stripOuterQuotes(m[1].trim()))});`;
  }

  m = line.match(
    /^launch\s+(?:the\s+)?(?:app|application|program)\s+(.+)$/i
  );

  if (m) {
    return `await kandi.launchApp(${bt(line)}, ${bt(stripOuterQuotes(m[1]))});`;
  }

  m = line.match(
    /^(?:desktop\s+)?click\s+(?:at\s+)?\(?\s*(\d+)\s*[, ]\s*(\d+)\s*\)?$/i
  );

  if (m) {
    return `await kandi.desktopClick(${bt(line)}, ${Number(m[1])}, ${Number(m[2])});`;
  }

  m = line.match(
    /^(?:desktop\s+)?double\s*click\s+(?:at\s+)?\(?\s*(\d+)\s*[, ]\s*(\d+)\s*\)?$/i
  );

  if (m) {
    return `await kandi.desktopDoubleClick(${bt(line)}, ${Number(m[1])}, ${Number(m[2])});`;
  }

  m = line.match(/^(?:desktop\s+)?type\s+(.+)$/i);

  if (m) {
    return `await kandi.desktopType(${bt(line)}, ${bt(stripOuterQuotes(m[1]))});`;
  }

  m = line.match(/^press\s+(?:the\s+)?key\s+(.+)$/i);

  if (m) {
    return `await kandi.pressKey(${bt(line)}, ${bt(stripOuterQuotes(m[1]))});`;
  }

  m = line.match(
    /^wait\s+(\d+(?:\.\d+)?)\s*(milliseconds?|ms|seconds?|secs?|s)?$/i
  );

  if (m) {
    const unit = (m[2] || 'seconds').toLowerCase();

    const ms =
      unit.startsWith('ms') || unit.startsWith('millisecond')
        ? Number(m[1])
        : Number(m[1]) * 1000;

    return `await kandi.wait(${bt(line)}, ${Math.round(ms)});`;
  }

  m = line.match(
    /^postgres\s+query\s+(["'`].*?["'`])\s+using\s+(.+?)(?:\s+expect\s+(\d+)\s+rows?)?$/i
  );

  if (m) {
    const expected = m[3] == null ? 'null' : Number(m[3]);

    return `await kandi.postgresQuery(${bt(line)}, ${bt(stripOuterQuotes(m[2]))}, ${bt(stripOuterQuotes(m[1]))}, ${expected});`;
  }

  m = line.match(
    /^mysql\s+query\s+(["'`].*?["'`])\s+using\s+(.+?)(?:\s+expect\s+(\d+)\s+rows?)?$/i
  );

  if (m) {
    const expected = m[3] == null ? 'null' : Number(m[3]);

    return `await kandi.mysqlQuery(${bt(line)}, ${bt(stripOuterQuotes(m[2]))}, ${bt(stripOuterQuotes(m[1]))}, ${expected});`;
  }

  m = line.match(/^close\s+(?:the\s+)?browser$/i);

  if (m) {
    return `await kandi.closeBrowser(${bt(line)});`;
  }

  throw new Error(`Unsupported instruction: ${line}`);
}

function translateFile(inputPath, options = {}) {
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const absoluteInput = path.resolve(projectRoot, inputPath);

  if (!fs.existsSync(absoluteInput)) {
    throw new Error(`Workspace file not found: ${absoluteInput}`);
  }

  const raw = fs.readFileSync(absoluteInput, 'utf8');

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith('#') &&
        !line.startsWith('//')
    );

  if (lines.length === 0) {
    throw new Error('No executable instructions found.');
  }

  const statements = lines.map(parseInstruction);

  const scriptsDir = path.join(projectRoot, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });

  const baseName = path.basename(
    absoluteInput,
    path.extname(absoluteInput)
  );

  const outputPath = path.join(
    scriptsDir,
    `${baseName}.generated.js`
  );

  const testName = options.testName || baseName;

  /*
   * Use the actual installed engine path so generated scripts work
   * whether SuprKandi was installed globally or locally.
   */
  const enginePath = path.resolve(__dirname, 'engine.js');

  const generated =
`// Auto-generated by SuprKandi. Do not edit by hand.
const { SuprKandi } = require(${JSON.stringify(enginePath)});

(async () => {
  const kandi = new SuprKandi({
    testName: ${bt(testName)},
    rootDir: process.cwd()
  });

  let exitCode = 0;

  try {
${statements.map((s) => `    ${s}`).join('\n')}
  } catch (error) {
    exitCode = 1;
    console.error(error && error.stack ? error.stack : error);
  } finally {
    try {
      await kandi.finalize();
    } catch (reportError) {
      exitCode = 1;
      console.error('Report generation failed:', reportError);
    }

    process.exitCode = exitCode;
  }
})();
`;

  fs.writeFileSync(outputPath, generated, 'utf8');

  return {
    outputPath,
    statements,
    lines,
    projectRoot
  };
}

module.exports = {
  translateFile,
  parseInstruction,
  escapeTemplateLiteral
};
