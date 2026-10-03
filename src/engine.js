const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const screenshotDesktop = require('screenshot-desktop');
const robot = require('robotjs');
const { Builder, By, Key, until } = require('selenium-webdriver');
const { Client: PgClient } = require('pg');
const mysql = require('mysql2/promise');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  PageBreak
} = require('docx');

class SuprKandi {
  constructor(options = {}) {
    this.rootDir = path.resolve(options.rootDir || process.cwd());
    this.testName = options.testName || 'SuprKandi Test';
    this.browserName = options.browser || 'chrome';
    this.driver = null;
    this.steps = [];
    this.startedAt = new Date();
    this.finishedAt = null;
    this.evidenceDir = path.join(this.rootDir, 'evidence');
    this.reportsDir = path.join(this.rootDir, 'reports');
    this.defaultTimeoutMs = options.timeoutMs || 15000;
    this.failFast = options.failFast !== false;
    this.finalized = false;
    fs.mkdirSync(this.evidenceDir, { recursive: true });
    fs.mkdirSync(this.reportsDir, { recursive: true });
  }

  _safeName(value) {
    return String(value || 'test')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'test';
  }

  _stamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async _captureBrowser(filename) {
    if (!this.driver) throw new Error('Browser driver is not active.');
    const base64 = await this.driver.takeScreenshot();
    fs.writeFileSync(filename, Buffer.from(base64, 'base64'));
    return filename;
  }

  async _captureDesktop(filename) {
    const buffer = await screenshotDesktop({ format: 'png' });
    fs.writeFileSync(filename, buffer);
    return filename;
  }

  async _captureEvidence(stepNumber, context = 'desktop') {
    const filename = path.join(
      this.evidenceDir,
      `${String(stepNumber).padStart(3, '0')}_${this._safeName(this.testName)}_${this._stamp()}.png`
    );

    try {
      if (context === 'browser' && this.driver) {
        return await this._captureBrowser(filename);
      }
      return await this._captureDesktop(filename);
    } catch (primaryError) {
      if (context === 'browser') {
        try {
          return await this._captureDesktop(filename);
        } catch (fallbackError) {
          return null;
        }
      }
      return null;
    }
  }

  async _runStep(description, context, action) {
    const stepNumber = this.steps.length + 1;
    const startedAt = new Date();
    let result = 'PASS';
    let error = '';
    let data;

    try {
      data = await action();
    } catch (err) {
      result = 'FAIL';
      error = err && err.stack ? err.stack : String(err);
    }

    const screenshot = await this._captureEvidence(stepNumber, context);
    const finishedAt = new Date();
    this.steps.push({
      stepNumber,
      description,
      context,
      result,
      error,
      screenshot,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      data
    });

    console.log(`[${result}] ${stepNumber}. ${description}`);
    if (error) console.error(error.split('\n')[0]);

    if (result === 'FAIL' && this.failFast) {
      const wrapped = new Error(`Step ${stepNumber} failed: ${description}`);
      wrapped.cause = error;
      throw wrapped;
    }
    return data;
  }

  async openBrowser(step, url, browserName = this.browserName) {
    return this._runStep(step, 'browser', async () => {
      if (this.driver) {
        await this.driver.quit().catch(() => {});
        this.driver = null;
      }
      this.browserName = String(browserName || 'chrome').toLowerCase();
      this.driver = await new Builder().forBrowser(this.browserName).build();
      await this.driver.manage().setTimeouts({ implicit: 0, pageLoad: 30000, script: 30000 });
      if (url) await this.driver.get(url);
    });
  }

  async goto(step, url) {
    return this._runStep(step, 'browser', async () => {
      if (!this.driver) throw new Error('Browser is not open.');
      await this.driver.get(url);
    });
  }

  async click(step, selector) {
    return this._runStep(step, 'browser', async () => {
      if (!this.driver) throw new Error('Browser is not open.');
      const element = await this.driver.wait(until.elementLocated(By.css(selector)), this.defaultTimeoutMs);
      await this.driver.wait(until.elementIsVisible(element), this.defaultTimeoutMs);
      await element.click();
    });
  }

  _xpathLiteral(value) {
    const text = String(value);
    if (!text.includes("'")) return `'${text}'`;
    if (!text.includes('\"')) return `\"${text}\"`;
    const parts = text.split("'");
    return `concat(${parts.map((part, index) => `${index ? `\"'\",` : ''}'${part}'`).join(',')})`;
  }

  async clickText(step, text) {
    return this._runStep(step, 'browser', async () => {
      if (!this.driver) throw new Error('Browser is not open.');
      const xpath = `//*[self::button or self::a or @role='button'][normalize-space(.)=${this._xpathLiteral(text)}]`;
      const element = await this.driver.wait(until.elementLocated(By.xpath(xpath)), this.defaultTimeoutMs);
      await this.driver.wait(until.elementIsVisible(element), this.defaultTimeoutMs);
      await element.click();
    });
  }

  async type(step, selector, text) {
    return this._runStep(step, 'browser', async () => {
      if (!this.driver) throw new Error('Browser is not open.');
      const element = await this.driver.wait(until.elementLocated(By.css(selector)), this.defaultTimeoutMs);
      await this.driver.wait(until.elementIsVisible(element), this.defaultTimeoutMs);
      await element.clear().catch(() => {});
      await element.sendKeys(text);
    });
  }

  _seleniumKey(key) {
    const normalized = String(key).trim().toUpperCase();
    const map = {
      ENTER: Key.ENTER,
      TAB: Key.TAB,
      ESC: Key.ESCAPE,
      ESCAPE: Key.ESCAPE,
      BACKSPACE: Key.BACK_SPACE,
      DELETE: Key.DELETE,
      SPACE: Key.SPACE,
      ARROWUP: Key.ARROW_UP,
      ARROWDOWN: Key.ARROW_DOWN,
      ARROWLEFT: Key.ARROW_LEFT,
      ARROWRIGHT: Key.ARROW_RIGHT,
      HOME: Key.HOME,
      END: Key.END,
      PAGEUP: Key.PAGE_UP,
      PAGEDOWN: Key.PAGE_DOWN,
      F1: Key.F1,
      F2: Key.F2,
      F3: Key.F3,
      F4: Key.F4,
      F5: Key.F5,
      F6: Key.F6,
      F7: Key.F7,
      F8: Key.F8,
      F9: Key.F9,
      F10: Key.F10,
      F11: Key.F11,
      F12: Key.F12
    };
    return map[normalized] || key;
  }

  async pressBrowserKey(step, selector, key) {
    return this._runStep(step, 'browser', async () => {
      if (!this.driver) throw new Error('Browser is not open.');
      const element = await this.driver.wait(until.elementLocated(By.css(selector)), this.defaultTimeoutMs);
      await element.sendKeys(this._seleniumKey(key));
    });
  }

  async verifyText(step, selector, expected) {
    return this._runStep(step, 'browser', async () => {
      if (!this.driver) throw new Error('Browser is not open.');
      const element = await this.driver.wait(until.elementLocated(By.css(selector)), this.defaultTimeoutMs);
      const actual = await element.getText();
      if (!actual.includes(expected)) {
        throw new Error(`Expected text ${JSON.stringify(expected)} in ${JSON.stringify(actual)}.`);
      }
      return actual;
    });
  }

  async verifyPageContains(step, expected) {
    return this._runStep(step, 'browser', async () => {
      if (!this.driver) throw new Error('Browser is not open.');
      const source = await this.driver.getPageSource();
      if (!source.includes(expected)) {
        throw new Error(`Page does not contain ${JSON.stringify(expected)}.`);
      }
    });
  }

  async wait(step, milliseconds) {
    const context = this.driver ? 'browser' : 'desktop';
    return this._runStep(step, context, async () => this._sleep(Number(milliseconds)));
  }

  async launchApp(step, executable, args = []) {
    return this._runStep(step, 'desktop', async () => {
      const child = spawn(executable, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
      child.unref();
      await this._sleep(1200);
      return child.pid;
    });
  }

  async desktopClick(step, x, y) {
    return this._runStep(step, 'desktop', async () => {
      robot.moveMouse(Number(x), Number(y));
      robot.mouseClick();
      await this._sleep(150);
    });
  }

  async desktopDoubleClick(step, x, y) {
    return this._runStep(step, 'desktop', async () => {
      robot.moveMouse(Number(x), Number(y));
      robot.mouseClick('left', true);
      await this._sleep(150);
    });
  }

  async desktopType(step, text) {
    return this._runStep(step, 'desktop', async () => {
      robot.typeString(String(text));
      await this._sleep(100);
    });
  }

  async pressKey(step, key) {
    return this._runStep(step, 'desktop', async () => {
      const normalized = String(key).trim().toLowerCase();
      const map = {
        enter: 'enter',
        tab: 'tab',
        escape: 'escape',
        esc: 'escape',
        backspace: 'backspace',
        delete: 'delete',
        space: 'space',
        up: 'up',
        down: 'down',
        left: 'left',
        right: 'right',
        home: 'home',
        end: 'end',
        pageup: 'pageup',
        pagedown: 'pagedown'
      };
      robot.keyTap(map[normalized] || normalized);
      await this._sleep(100);
    });
  }

  async postgresQuery(step, connectionString, sql, expectedRowCount = null) {
    return this._runStep(step, 'desktop', async () => {
      const client = new PgClient({ connectionString });
      await client.connect();
      try {
        const result = await client.query(sql);
        if (expectedRowCount !== null && result.rowCount !== Number(expectedRowCount)) {
          throw new Error(`Expected ${expectedRowCount} rows but received ${result.rowCount}.`);
        }
        return { rowCount: result.rowCount, rows: result.rows };
      } finally {
        await client.end();
      }
    });
  }

  async mysqlQuery(step, connectionUri, sql, expectedRowCount = null) {
    return this._runStep(step, 'desktop', async () => {
      const connection = await mysql.createConnection(connectionUri);
      try {
        const [rows] = await connection.query(sql);
        const rowCount = Array.isArray(rows) ? rows.length : (rows.affectedRows ?? 0);
        if (expectedRowCount !== null && rowCount !== Number(expectedRowCount)) {
          throw new Error(`Expected ${expectedRowCount} rows but received ${rowCount}.`);
        }
        return { rowCount, rows };
      } finally {
        await connection.end();
      }
    });
  }

  async recordManualStep(description, result = 'PASS', error = '') {
    const stepNumber = this.steps.length + 1;
    const startedAt = new Date();
    const screenshot = await this._captureEvidence(stepNumber, 'desktop');
    const finishedAt = new Date();
    this.steps.push({
      stepNumber,
      description,
      context: 'manual',
      result: String(result).toUpperCase() === 'FAIL' ? 'FAIL' : 'PASS',
      error: error || '',
      screenshot,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt
    });
    console.log(`[${result}] ${stepNumber}. ${description}`);
  }

  async closeBrowser(step = 'Close browser') {
    if (!this.driver) return;
    await this._runStep(step, 'browser', async () => {
      await this.driver.quit();
      this.driver = null;
    });
  }

  _summary() {
    const passed = this.steps.filter((s) => s.result === 'PASS').length;
    const failed = this.steps.filter((s) => s.result === 'FAIL').length;
    return {
      total: this.steps.length,
      passed,
      failed,
      status: failed === 0 ? 'PASS' : 'FAIL'
    };
  }

  _reportParagraph(label, value, bold = true) {
    return new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold }),
        new TextRun({ text: String(value) })
      ]
    });
  }

  async generateReport() {
    this.finishedAt = this.finishedAt || new Date();
    const summary = this._summary();
    const children = [
      new Paragraph({
        text: 'SuprKandi Test Sign-Off Report',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER
      }),
      new Paragraph({
        text: this.testName,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER
      }),
      this._reportParagraph('Started', this.startedAt.toLocaleString()),
      this._reportParagraph('Finished', this.finishedAt.toLocaleString()),
      this._reportParagraph('Overall Result', summary.status),
      this._reportParagraph('Summary', `${summary.passed} passed / ${summary.failed} failed / ${summary.total} total`),
      new Paragraph({ text: 'Execution Evidence', heading: HeadingLevel.HEADING_1 })
    ];

    for (const step of this.steps) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Step ${step.stepNumber} — ${step.result}`, bold: true, size: 28 })]
        }),
        this._reportParagraph('Instruction', step.description),
        this._reportParagraph('Layer', step.context),
        this._reportParagraph('Duration', `${step.durationMs} ms`)
      );

      if (step.error) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Failure: ', bold: true }),
              new TextRun({ text: step.error.split('\n')[0] })
            ]
          })
        );
      }

      if (step.screenshot && fs.existsSync(step.screenshot)) {
        const data = fs.readFileSync(step.screenshot);
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data,
                transformation: { width: 620, height: 349 },
                type: 'png'
              })
            ]
          })
        );
      } else {
        children.push(new Paragraph({ text: 'Screenshot unavailable.' }));
      }
      children.push(new Paragraph({ text: '' }));
    }

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const buffer = await Packer.toBuffer(doc);
    const filename = path.join(
      this.reportsDir,
      `${this._safeName(this.testName)}_${this._stamp()}.docx`
    );
    fs.writeFileSync(filename, buffer);
    return filename;
  }

  cleanupEvidence() {
    if (!fs.existsSync(this.evidenceDir)) return;
    for (const entry of fs.readdirSync(this.evidenceDir)) {
      if (/\.(png|jpe?g)$/i.test(entry)) {
        try {
          fs.unlinkSync(path.join(this.evidenceDir, entry));
        } catch (_) {}
      }
    }
  }

  async finalize() {
    if (this.finalized) return null;
    this.finalized = true;
    this.finishedAt = new Date();

    if (this.driver) {
      try {
        await this.driver.quit();
      } catch (_) {}
      this.driver = null;
    }

    const reportPath = await this.generateReport();
    console.log(`Report: ${reportPath}`);
    this.cleanupEvidence();
    return reportPath;
  }
}

module.exports = { SuprKandi };
