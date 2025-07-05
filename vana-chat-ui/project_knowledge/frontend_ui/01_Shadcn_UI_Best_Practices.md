# Shadcn UI Best Practices

## Core Philosophy
shadcn/ui is not a traditional component library. Instead, it provides a collection of re-usable components whose code is copied directly into your project. This approach gives developers full control over the components, allowing for easy customization, extension, and integration without being constrained by an external dependency. It's a "components you can own" philosophy.

## Theming
Theming in shadcn/ui is primarily achieved through CSS variables and Tailwind CSS utility classes.
- **CSS Variables**: Core styling properties like colors, borders, and radii are defined using CSS variables in a global stylesheet (e.g., `app/globals.css`). This allows for dynamic theme changes (like light/dark mode) by simply updating the variable values.
- **Tailwind CSS**: These CSS variables are then consumed by Tailwind CSS utility classes, enabling consistent application of the theme throughout the application using familiar Tailwind syntax (e.g., `bg-primary`, `text-foreground`).

## Composition
Complex components in shadcn/ui are built by composing smaller, single-purpose primitives. Many of these primitives are sourced from [Radix UI](https://www.radix-ui.com/), which provides unstyled, accessible component primitives. This composition approach ensures:
- **Modularity**: Components are broken down into manageable, re-usable parts.
- **Flexibility**: Developers can combine primitives in various ways to create unique UI elements.
- **Accessibility**: Leveraging Radix UI's accessible foundations ensures that the composed components inherit a high level of accessibility.

## AI Integration
When prompting an AI to build UI components using shadcn/ui, it is best practice to be explicit about the desired components and their structure. Due to shadcn/ui's unique approach of providing raw code, detailed instructions to the AI about the specific shadcn components (e.g., `Button`, `Input`), their variants, and how they should be composed will lead to more accurate and usable code generation. Avoid generic requests and instead provide clear, structured requirements.
