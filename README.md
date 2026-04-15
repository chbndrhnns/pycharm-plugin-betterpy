# BetterPy

![Build](https://github.com/chbndrhnns/intellij-platform-plugin-copy/workflows/Build/badge.svg)
[![Version](https://img.shields.io/jetbrains/plugin/v/29896.svg)](https://plugins.jetbrains.com/plugin/29896)
[![Downloads](https://img.shields.io/jetbrains/plugin/d/29896.svg)](https://plugins.jetbrains.com/plugin/29896)

<!-- Plugin description -->
Python DDD Toolkit is a productivity plugin for Python codebases (especially DDD-style projects) in PyCharm / IntelliJ-based IDEs.

Key features:

- **Intentions / quick-fixes** for common refactorings:
  - Populate missing arguments.
  - Introduce a *parameter object*.
  - Change visibility.
  - Make parameters optional (type-hint helper).
- **Type-mismatch helpers**: wrap/unwrap expressions to the expected type.
- **Connexion / OpenAPI assistance**:
  - Inspections for unresolved Connexion references (JSON).
  - Gutter markers and navigation between Python/JSON references and OpenAPI operations.
- **Protocol-oriented navigation**: custom protocol definition search/caching and an improved Python structure view.

This section is used as the plugin description for the built `plugin.xml` during the Gradle build.

### Pricing
BetterPy is **free during the beta** period.

### Personal Motivation
I created BetterPy out of a personal need to improve my daily workflow. My main goals are to:
- **Automate repeated actions** that otherwise take too much clicking around.
- **Fix annoying behavior** and smooth out workflow friction.
- **Extend PyCharm** based on personal and practical development needs.
<!-- Plugin description end -->

## Installation

- Using the IDE built-in plugin system:
  
  <kbd>Settings/Preferences</kbd> > <kbd>Plugins</kbd> > <kbd>Marketplace</kbd> > <kbd>Search for "intellij-platform-plugin-copy"</kbd> >
  <kbd>Install</kbd>
  
- Using JetBrains Marketplace:

  Go to [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/MARKETPLACE_ID) and install it by clicking the <kbd>Install to ...</kbd> button in case your IDE is running.

  You can also download the [latest release](https://plugins.jetbrains.com/plugin/MARKETPLACE_ID/versions) from JetBrains Marketplace and install it manually using
  <kbd>Settings/Preferences</kbd> > <kbd>Plugins</kbd> > <kbd>⚙️</kbd> > <kbd>Install plugin from disk...</kbd>

- Manually:

  Download the [latest release](https://github.com/chbndrhnns/intellij-platform-plugin-copy/releases/latest) and install it manually using
  <kbd>Settings/Preferences</kbd> > <kbd>Plugins</kbd> > <kbd>⚙️</kbd> > <kbd>Install plugin from disk...</kbd>


## Documentation

This project's documentation is built with [Zensical](https://zensical.org/).

To serve the documentation locally:

1. Install [uv](https://docs.astral.sh/uv/) if you haven't already.
2. Validate documentation: `uv run python scripts/validate_docs.py`
3. Run `PYTHONPATH=. uv run zensical serve`

To build the static site:

```bash
PYTHONPATH=. uv run zensical build
```


---
Plugin based on the [IntelliJ Platform Plugin Template][template].

[template]: https://github.com/JetBrains/intellij-platform-plugin-template
[docs:plugin-description]: https://plugins.jetbrains.com/docs/intellij/plugin-user-experience.html#plugin-description-and-presentation
