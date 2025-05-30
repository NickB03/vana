# Contributing to VANA

First off, thank you for considering contributing to VANA! Your help is appreciated.

This document provides guidelines for contributing to the project. Please read it carefully to ensure a smooth collaboration process.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Git Commit Messages](#git-commit-messages)

## Code of Conduct

This project and everyone participating in it is governed by a [Code of Conduct](CODE_OF_CONDUCT.md) (to be created). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

-   Ensure the bug was not already reported by searching on GitHub under [Issues](https://github.com/NickB03/vana/issues).
-   If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/NickB03/vana/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample or an executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

-   Open a new issue to discuss your enhancement idea. Clearly describe the proposed enhancement, its potential benefits, and any implementation ideas.
-   This allows for discussion and feedback before significant development work begins.

### Pull Requests

-   Pull requests are the primary way to contribute code, documentation, or other changes.
-   Ensure your PR addresses an existing issue or a discussed enhancement.
-   Follow the [Pull Request Process](#pull-request-process) detailed below.

## Development Setup

Please refer to the main [README.md](./README.md) for instructions on setting up your development environment, including prerequisites, installation, and configuration.

## Coding Standards

(To be defined. This section will include guidelines on code style, formatting, linting tools (e.g., Black, Flake8, Pylint), and any project-specific conventions.)

-   **Python:** Follow PEP 8 guidelines.
-   **Docstrings:** Use clear and comprehensive docstrings for all modules, classes, functions, and methods (e.g., Google style or NumPy style).
-   **Type Hinting:** Use Python type hints for function signatures and variables where appropriate.

## Testing

(To be defined. This section will detail the project's testing strategy.)

-   New features should include unit tests.
-   Bug fixes should ideally include a test case that demonstrates the bug and verifies the fix.
-   Ensure all tests pass before submitting a pull request (`scripts/run_tests.sh` or similar).

## Documentation

**Up-to-date documentation is critical for VANA.**

-   If you are adding a new feature, ensure you also add corresponding documentation (e.g., in `docs/implementation/`, `docs/guides/`, or `docs/reference/`).
-   If you are changing existing functionality, update the relevant documentation to reflect the changes.
-   For user-facing changes, ensure the `README.md` or relevant user guides are updated.
-   API changes must be documented in `docs/api/`.
-   **Documentation changes should be part of the same pull request as the code changes.**

## Pull Request Process

1.  Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2.  Update the `README.md` and other relevant documentation with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters.
3.  Increase the version numbers in any examples files and the `README.md` to the new version that this Pull Request would represent. The versioning scheme we use is [SemVer](http://semver.org/).
4.  You may merge the Pull Request in once you have the sign-off of other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

## Git Commit Messages

-   Use clear and descriptive commit messages.
-   Start with an imperative verb (e.g., "Add feature", "Fix bug", "Update documentation").
-   Reference relevant issue numbers if applicable (e.g., "Fix #123: Handle null input").
-   Keep commit messages concise but informative.

Thank you for contributing to VANA!
