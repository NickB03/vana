# PRPs (Product Requirements Prompts)

This directory contains generated PRPs - comprehensive implementation blueprints created using Context Engineering methodology.

## What is a PRP?

A PRP is a detailed, context-rich document that:
- Provides complete implementation specifications
- Includes validation loops for quality assurance
- Contains anti-patterns to avoid
- Offers step-by-step implementation guidance

## Workflow

1. **Create Initial Request**: Edit `../INITIAL.md` with your feature requirements
2. **Generate PRP**: Run `/generate-prp INITIAL.md` in Claude Code
3. **Review PRP**: Check the generated PRP in this directory
4. **Execute PRP**: Run `/execute-prp PRPs/your-feature-name.md`

## Directory Structure

```
PRPs/
├── README.md           # This file
├── templates/          # PRP templates and examples
│   └── prp_template.md # Standard PRP template
└── [generated-prps]/   # Your generated PRPs will appear here
```

## Best Practices

- Keep PRPs focused on single features or coherent feature sets
- Include comprehensive context in your INITIAL.md
- Review generated PRPs before execution
- Update PRPs with learnings during implementation

## Example PRPs

See `templates/` directory for example PRPs and templates.