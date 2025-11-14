# Codecov Badges & Integration

## Coverage Badge

Add to your README.md to display current coverage:

```markdown
[![codecov](https://codecov.io/gh/NickB03/llm-chat-site/branch/main/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/NickB03/llm-chat-site)
```

**Replace `YOUR_TOKEN`** with the badge token from Codecov settings.

---

## Alternative Badge Styles

### Flat Style
```markdown
[![codecov](https://codecov.io/gh/NickB03/llm-chat-site/branch/main/graph/badge.svg?token=YOUR_TOKEN&style=flat)](https://codecov.io/gh/NickB03/llm-chat-site)
```

### Flat-Square Style
```markdown
[![codecov](https://codecov.io/gh/NickB03/llm-chat-site/branch/main/graph/badge.svg?token=YOUR_TOKEN&style=flat-square)](https://codecov.io/gh/NickB03/llm-chat-site)
```

### For-the-Badge Style
```markdown
[![codecov](https://codecov.io/gh/NickB03/llm-chat-site/branch/main/graph/badge.svg?token=YOUR_TOKEN&style=for-the-badge)](https://codecov.io/gh/NickB03/llm-chat-site)
```

---

## GitHub Actions Status Badge

Add workflow status badge:

```markdown
[![Frontend Quality](https://github.com/NickB03/llm-chat-site/actions/workflows/frontend-quality.yml/badge.svg)](https://github.com/NickB03/llm-chat-site/actions/workflows/frontend-quality.yml)
```

---

## Combined Badges

Recommended badge layout for README:

```markdown
# LLM Chat Site

[![Frontend Quality](https://github.com/NickB03/llm-chat-site/actions/workflows/frontend-quality.yml/badge.svg)](https://github.com/NickB03/llm-chat-site/actions/workflows/frontend-quality.yml)
[![codecov](https://codecov.io/gh/NickB03/llm-chat-site/branch/main/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/NickB03/llm-chat-site)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

---

## Codecov Graphs

### Sunburst Graph
Embed interactive sunburst chart:

```markdown
[![Codecov Sunburst](https://codecov.io/gh/NickB03/llm-chat-site/branch/main/graphs/sunburst.svg?token=YOUR_TOKEN)](https://codecov.io/gh/NickB03/llm-chat-site)
```

### Icicle Graph
```markdown
[![Codecov Icicle](https://codecov.io/gh/NickB03/llm-chat-site/branch/main/graphs/icicle.svg?token=YOUR_TOKEN)](https://codecov.io/gh/NickB03/llm-chat-site)
```

### Tree Graph
```markdown
[![Codecov Tree](https://codecov.io/gh/NickB03/llm-chat-site/branch/main/graphs/tree.svg?token=YOUR_TOKEN)](https://codecov.io/gh/NickB03/llm-chat-site)
```

---

## Getting the Badge Token

1. Go to: https://codecov.io/gh/NickB03/llm-chat-site/settings/badge
2. Copy the markdown snippet (includes token)
3. Paste into README.md

Or use the general badge without token (public repos):

```markdown
[![codecov](https://codecov.io/gh/NickB03/llm-chat-site/graph/badge.svg)](https://codecov.io/gh/NickB03/llm-chat-site)
```

---

## Customization Options

### Show Specific Branch
```markdown
[![codecov](https://codecov.io/gh/NickB03/llm-chat-site/branch/develop/graph/badge.svg)](https://codecov.io/gh/NickB03/llm-chat-site/branch/develop)
```

### Show Flag Coverage
```markdown
[![codecov](https://codecov.io/gh/NickB03/llm-chat-site/graph/badge.svg?flag=frontend)](https://codecov.io/gh/NickB03/llm-chat-site)
```

---

## Example README Section

```markdown
## Quality & Coverage

| Metric | Status |
|--------|--------|
| Build | [![Frontend Quality](https://github.com/NickB03/llm-chat-site/actions/workflows/frontend-quality.yml/badge.svg)](https://github.com/NickB03/llm-chat-site/actions/workflows/frontend-quality.yml) |
| Coverage | [![codecov](https://codecov.io/gh/NickB03/llm-chat-site/graph/badge.svg)](https://codecov.io/gh/NickB03/llm-chat-site) |
| License | [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) |

### Coverage Details

- **Overall**: 74% (exceeds 55% threshold)
- **Frontend**: 74% statements, 69% branches
- **Test Suite**: 293 tests passing in 2.4s

See [Testing Documentation](docs/testing-ci.md) for details.
```

---

*Note: Replace `YOUR_TOKEN` with your actual Codecov badge token from repository settings.*
