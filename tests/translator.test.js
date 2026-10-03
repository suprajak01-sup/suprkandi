const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseInstruction,
  escapeTemplateLiteral
} = require('../src/translator');

test('opens Chrome with URL', () => {
  const result = parseInstruction(
    'open browser to https://example.com in chrome'
  );

  assert.match(result, /openBrowser/);
  assert.match(result, /https:\/\/example\.com/);
  assert.match(result, /chrome/);
});

test('opens Firefox with alternate phrasing', () => {
  const result = parseInstruction(
    'open browser using firefox to https://example.com'
  );

  assert.match(result, /openBrowser/);
  assert.match(result, /firefox/);
});

test('translates CSS selector containing single quotes', () => {
  const result = parseInstruction(
    'click "input[name=\'q\']"'
  );

  assert.match(result, /kandi\.click/);
  assert.match(result, /input\[name='q'\]/);
});

test('translates typing into a CSS selector', () => {
  const result = parseInstruction(
    'type "SuprKandi" into "input[name=\'my-text\']"'
  );

  assert.match(result, /kandi\.type/);
  assert.match(result, /SuprKandi/);
  assert.match(result, /input\[name='my-text'\]/);
});

test('preserves the original human-readable instruction as first argument', () => {
  const instruction =
    'verify text "Received!" in "#message"';

  const result = parseInstruction(instruction);

  assert.ok(
    result.indexOf('verifyText') < result.indexOf('#message'),
    'Expected verifyText invocation before selector argument'
  );

  assert.match(result, /verify text "Received!" in "#message"/);
});

test('escapes backticks in generated template literals', () => {
  const escaped = escapeTemplateLiteral('div[data-x=`odd`]');

  assert.equal(
    escaped,
    'div[data-x=\\`odd\\`]'
  );
});

test('escapes template interpolation sequence', () => {
  const escaped = escapeTemplateLiteral(
    'div[data-value="${unsafe}"]'
  );

  assert.equal(
    escaped,
    'div[data-value="\\${unsafe}"]'
  );
});

test('translates desktop click coordinates', () => {
  const result = parseInstruction(
    'desktop click at 400, 300'
  );

  assert.match(result, /desktopClick/);
  assert.match(result, /400/);
  assert.match(result, /300/);
});

test('translates Windows application launch', () => {
  const result = parseInstruction(
    'launch app "mspaint.exe"'
  );

  assert.match(result, /launchApp/);
  assert.match(result, /mspaint\.exe/);
});

test('translates wait in seconds to milliseconds', () => {
  const result = parseInstruction(
    'wait 2 seconds'
  );

  assert.match(result, /kandi\.wait/);
  assert.match(result, /2000/);
});

test('translates PostgreSQL query', () => {
  const result = parseInstruction(
    'postgres query "SELECT * FROM users" using "postgresql://user:pass@localhost/testdb"'
  );

  assert.match(result, /postgresQuery/);
  assert.match(result, /SELECT \* FROM users/);
});

test('translates MySQL query', () => {
  const result = parseInstruction(
    'mysql query "SELECT * FROM users" using "mysql://user:pass@localhost/testdb"'
  );

  assert.match(result, /mysqlQuery/);
  assert.match(result, /SELECT \* FROM users/);
});

test('translates close browser', () => {
  const result = parseInstruction(
    'close browser'
  );

  assert.match(result, /closeBrowser/);
});

test('rejects unsupported instructions', () => {
  assert.throws(
    () => parseInstruction('do something magical'),
    /Unsupported instruction/
  );
});
