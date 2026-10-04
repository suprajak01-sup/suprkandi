# SuprKandi Test Project

This project was created with `kandi init`.

## Quick Start

### `kandi doctor`

Checks whether your machine is ready to run SuprKandi.

It validates the required runtime and core dependencies, such as Node.js, Selenium, RobotJS, desktop screenshot support, DOCX reporting, PostgreSQL, and MySQL drivers.

```bash
kandi doctor
```

Use this command first when setting up SuprKandi on a new machine or when troubleshooting environment issues.

---

### `kandi automate workspaces/sample.txt`

Translates the plain-English test file into JavaScript and immediately executes the generated automation.

```bash
kandi automate workspaces/sample.txt
```

During execution, SuprKandi can:

- Run browser automation
- Perform desktop/RPA actions
- Execute database validation
- Capture evidence after each step
- Generate the final DOCX report
- Clean temporary screenshot evidence after a successful report

Generated JavaScript is written to:

```text
scripts/
```

Final reports are written to:

```text
reports/
```

---

### `kandi run workspaces/sample.txt`

Shortcut/alias for `kandi automate`.

```bash
kandi run workspaces/sample.txt
```

Use this when you want a shorter command for normal test execution.

It performs the same translate-and-execute workflow as:

```bash
kandi automate workspaces/sample.txt
```

---

### `kandi translate workspaces/sample.txt`

Translates the plain-English workspace file into executable JavaScript without running the test.

```bash
kandi translate workspaces/sample.txt
```

Use this when you want to inspect the generated automation code before execution.

The generated file is written to:

```text
scripts/
```

Example:

```text
scripts/sample.generated.js
```

---

### `kandi audit "Manual Release Audit"`

Starts SuprKandi's interactive manual audit mode.

```bash
kandi audit "Manual Release Audit"
```

Use this when a tester is manually validating browser or desktop workflows but still wants structured evidence and a final sign-off report.

During the audit session:

- Perform the manual action
- Enter a plain-English description of the step
- SuprKandi captures desktop evidence
- Each step is recorded as PASS or FAIL
- A final DOCX report is generated

To manually record a failure:

```text
:fail Expected invoice status was not displayed
```

To finish the audit:

```text
:done
```

---

### `kandi --help`

Displays the available SuprKandi CLI commands and usage information.

```bash
kandi --help
```

Use this whenever you need a quick reminder of supported commands.

---

### `kandi --version`

Displays the installed SuprKandi version.

```bash
kandi --version
```

Example:

```text
0.1.0
```

This is useful when reporting an issue or confirming which release is installed.

---

### `kandi init`

Creates a new SuprKandi project in the current directory.

```bash
kandi init
```

It creates the standard project structure:

```text
.
├── README.md
├── kandi.config.js
├── workspaces/
│   └── sample.txt
├── scripts/
├── evidence/
└── reports/
```

Use this command when starting a new automation project.

You can also create a project in another directory:

```bash
kandi init my-tests
```

---

## Recommended First Run

For a newly created SuprKandi project, use:

```bash
kandi doctor
kandi automate workspaces/sample.txt
```

The first command checks the environment.

The second command runs the included sample automation and generates evidence/report output.

---

## Project Structure

```text
.
├── README.md
├── kandi.config.js
├── workspaces/
│   └── sample.txt
├── scripts/
├── evidence/
└── reports/
```

### `kandi.config.js`

Contains SuprKandi project configuration.

Typical settings include:

- Browser defaults
- Execution behavior
- Evidence settings
- Reporter settings
- Project paths
- Database connection configuration

---

### `workspaces/`

Contains plain-English test files.

Example:

```text
workspaces/sample.txt
```

---

### `scripts/`

Contains JavaScript files generated from plain-English SuprKandi test instructions.

Example:

```text
scripts/sample.generated.js
```

These files are generated automatically and normally should not be edited manually.

---

### `evidence/`

Temporary screenshot storage used during execution.

SuprKandi embeds this evidence into the final report and removes temporary screenshots after the report is saved successfully.

---

### `reports/`

Contains final test execution reports.

SuprKandi currently generates DOCX sign-off reports containing:

- Test name
- Execution time
- Overall status
- Step descriptions
- PASS/FAIL status
- Execution duration
- Failure information
- Screenshot evidence

---

## Example Plain-English Test

```text
open browser to https://www.selenium.dev/selenium/web/web-form.html in chrome
type "SuprKandi" into "input[name='my-text']"
click "button"
verify text "Received!" in "#message"
close browser
```

Run it using:

```bash
kandi automate workspaces/sample.txt
```

---

## Security

Treat SuprKandi workspace files as executable automation input.

Only run workspace files from trusted sources.

Do not place the following directly in workspace files or source control:

- Passwords
- API keys
- Access tokens
- Database passwords
- Production credentials
- Private connection strings

Prefer environment variables or an organization-approved secrets manager.

---

## Troubleshooting

Start with:

```bash
kandi doctor
```

Then confirm your installed version:

```bash
kandi --version
```

To see available commands:

```bash
kandi --help
```

If a plain-English instruction does not translate correctly, use:

```bash
kandi translate workspaces/sample.txt
```

and inspect the generated JavaScript inside:

```text
scripts/
```
