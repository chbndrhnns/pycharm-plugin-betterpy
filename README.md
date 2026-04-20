# BetterPy

![Build](https://github.com/chbndrhnns/intellij-platform-plugin-copy/workflows/Build/badge.svg)
[![Version](https://img.shields.io/jetbrains/plugin/v/29896.svg)](https://plugins.jetbrains.com/plugin/29896)
[![Downloads](https://img.shields.io/jetbrains/plugin/d/29896.svg)](https://plugins.jetbrains.com/plugin/29896)

<!-- Plugin description -->
**BetterPy** supercharges your Python development in PyCharm and IntelliJ-based IDEs — so you can spend less time on boilerplate and more time building.

📖 **Documentation:** [chbndrhnns.github.io/pycharm-plugin-betterpy](https://chbndrhnns.github.io/pycharm-plugin-betterpy/)

---

### Highlights

#### Parameter Refactoring
- **Make parameter optional / mandatory** — toggle `Optional[...]` type hints on function parameters with a single intention.
- **Introduce Parameter Object** — extract groups of parameters into a dataclass, with a gutter icon for quick access and MCP tool support for AI-assisted workflows.

#### Typing Inspections & Quick Fixes *(Incubating)*
- **Missing `| None` annotation** — reports parameters with a `None` default whose annotation is missing `| None`.
- **Overridden method missing type annotations** — reports overrides missing type annotations present in parent methods.
- **Type annotation usage filtering** — filters out type annotation usages from Find Usages results.
- **Copy method annotations from parent** — copies type annotations from a parent method to an overriding method.
- **Strip signature type annotations** — removes all type annotations from a function signature in one action.
- **NewType / TypeVar / ParamSpec reference & rename** — adds reference support for name string literals, enabling
  navigation from the string to its usage sites.

---

### Coming Soon

I'm actively working on the next wave of BetterPy. Without spoiling the surprise:

- More intentions around **typing and annotations** — less ceremony, more signal.
- Smarter **Protocol and custom-type workflows** — extracting, introducing, and reshaping types without the usual back-and-forth.
- Better handling of **unions, generics, and type aliases** — because typing shouldn't feel like a second job.
- Tighter feedback loops for **type-checker findings** — fewer detours between "problem spotted" and "problem fixed".
- New tools for **test authoring and maintenance**.
- Expanded **AI / MCP integrations** for workflows that go beyond a single file.
- Quality-of-life upgrades to features already available.

---

### Configuration

Every feature can be individually toggled in **Settings → Tools → BetterPy**.

### Contributing

I welcome contributions from the community! 
If you have any ideas, bug reports, or feature requests, please open an issue or submit a pull request on the [GitHub repository](https://github.com/chbndrhnns/pycharm-plugin-betterpy/issues).

### Pricing

BetterPy is **free during an extended beta** period. 

I plan to offer a paid version in the future, probably using a freemium approach. 
The details are yet to be determined and also shaped by feedback I am able to collect.

### Personal Motivation

I created BetterPy out of a personal need to improve my daily workflow. My main goals are to:
- **Automate repeated actions** that otherwise take too much clicking around.
- **Fix annoying behavior** and smooth out workflow friction.
- **Extend PyCharm** based on personal and practical development needs.
<!-- Plugin description end -->

---

### Getting Started

1. **Install** from the [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/29896) or via **Settings → Plugins → Marketplace** → search "BetterPy".
2. **Restart** your IDE.
3. **Explore** — open **Settings → Tools → BetterPy** to see all available features and customize them.

For detailed documentation, visit the [BetterPy docs](https://chbndrhnns.github.io/pycharm-plugin-betterpy/).

---

### Contributing & Feedback

Found a bug or have a feature request? [Open an issue](https://github.com/chbndrhnns/pycharm-plugin-betterpy/issues) — feedback is always welcome!

---

Plugin based on the [IntelliJ Platform Plugin Template][template].

[template]: https://github.com/JetBrains/intellij-platform-plugin-template
[docs:plugin-description]: https://plugins.jetbrains.com/docs/intellij/plugin-user-experience.html#plugin-description-and-presentation
