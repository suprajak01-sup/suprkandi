# SuprKandi

SuprKandi is an open-source hybrid testing and RPA platform for Node.js/Windows.

It allows QA engineers and automation teams to write test instructions in plain English and execute them across:

- Web browsers using Selenium WebDriver
- Native Windows applications using RobotJS
- PostgreSQL and MySQL databases
- Manual validation/audit workflows
- Automatic screenshot evidence and DOCX sign-off reporting

The primary CLI command is:

```bash
kandi
```

## Why SuprKandi?

Traditional automation frameworks usually focus on only one layer: browser automation, desktop automation, database validation, or manual testing evidence.

SuprKandi aims to combine these into one execution workflow.

Example:

```txt
open browser to https://www.selenium.dev/selenium/web/web-form.html in chrome
type "SuprKandi" into "input[name='my-text']"
click "button"
verify text "Received!" in "#message"
close browser
```

SuprKandi translates the plain-English instructions into executable JavaScript and runs them through its hybrid automation engine.

## Features

### Plain-English DSL

Write automation steps using readable instructions instead of JavaScript.

```txt
open browser to https://example.com
type "admin" into "#username"
type "password123" into "#password"
click "#login"
verify page contains "Welcome"
close browser
```

### Browser Automation

SuprKandi uses Selenium WebDriver.

Supported browser intent includes:

```txt
open browser to https://example.com
open browser to https://example.com in chrome
open browser to https://example.com in firefox
navigate to https://example.com/dashboard
click "#submit"
click button "Login"
type "hello" into "input[name='q']"
press browser key "ENTER" in "input[name='q']"
verify text "Success" in "#message"
verify page contains "Welcome"
close browser
```

### Windows Desktop Automation

SuprKandi can launch and interact with native Windows applications.

```txt
launch app "mspaint.exe"
wait 2 seconds
desktop click at 500, 300
desktop type "Hello from SuprKandi"
press key "enter"
```

Desktop automation is powered by RobotJS and native Node.js process execution.

### Database Validation

SuprKandi supports PostgreSQL and MySQL validation.

```txt
postgres query "SELECT * FROM users" using "postgresql://user:password@localhost/testdb"
mysql query "SELECT * FROM users" using "mysql://user:password@localhost/testdb"
```

Optional row-count validation can be added as the DSL evolves.

## Automatic Evidence

Every executed step is recorded by the SuprKandi engine.

For browser actions, SuprKandi captures browser screenshots.
For desktop actions, database validations, and manual audit steps, SuprKandi captures desktop screenshots.

Evidence is temporarily stored in:

```text
evidence/
```

At the end of execution, SuprKandi generates a DOCX sign-off report inside:

```text
reports/
```

The report includes:

- Test name
- Execution timestamp
- PASS/FAIL summary
- Original plain-English instruction
- Execution layer
- Execution duration
- Failure details
- Screenshot evidence

After the report is successfully generated, temporary evidence images are deleted automatically.

## Requirements

SuprKandi currently targets:

```text
Node.js >= 22.12.0
Windows
```

Check your version:

```bash
node --version
```

## Installation

Once published to npm:

```bash
npm install -g suprkandi
```

Then verify:

```bash
kandi --help
```

## Development Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/suprkandi.git
cd suprkandi
npm install
npm link
kandi --help
```

## CLI

### Translate

```bash
kandi translate workspaces/test.txt
```

Generated scripts are written to:

```text
scripts/
```

### Automate

```bash
kandi automate workspaces/test.txt
```

### Manual Audit

```bash
kandi audit "Release Validation"
```

The tester performs an action and then records the step. Use `:fail` to mark a failed validation and `:done` to finish the audit.

## Quote-Proof Selectors

SuprKandi safely generates selector arguments using JavaScript template literals. Selectors such as:

```txt
input[name='q']
```

can be used without breaking the generated JavaScript.

The translator also escapes backslashes, backticks, and `${` sequences inside generated template literals.

## Architecture

```text
Plain-English Test
        |
        v
src/translator.js
        |
        v
Generated JavaScript
        |
        v
src/engine.js
        |
        +----------------+
        |                |
        v                v
   Selenium           RobotJS
     Web                RPA
        |                |
        +--------+-------+
                 |
                 v
         Database Validation
         PostgreSQL / MySQL
                 |
                 v
          Evidence Capture
                 |
                 v
          DOCX Sign-Off Report
```

## Repository Structure

```text
suprkandi/
├── bin/
│   └── kandi.js
├── src/
│   ├── engine.js
│   └── translator.js
├── templates/
│   ├── kandi.config.js
│   └── sample.txt
├── workspaces/
├── scripts/
├── evidence/
├── reports/
├── README.md
├── LICENSE
└── package.json
```

## Roadmap

Planned capabilities include:

- `kandi init`
- `kandi run`
- `kandi doctor`
- Kandi Intermediate Representation
- Adapter/plugin architecture
- WebDriver BiDi events
- API testing
- REST and GraphQL support
- HTML reporting
- JSON/JUnit reporting
- Windows UI Automation
- Parallel execution
- Environment configuration
- Secrets management
- CI/CD integration
- AI-assisted test generation
- Agentic automation
- Optional Playwright adapter
- Mobile automation adapters

## Security

Do not place secrets directly inside plain-English workspace files.
Avoid committing database passwords, API keys, access tokens, production credentials, or `.env` files.

## Contributing

Contributions, issues, ideas, and pull requests are welcome.

## License

SuprKandi is licensed under the Apache License 2.0. See `LICENSE` for the full license text.
