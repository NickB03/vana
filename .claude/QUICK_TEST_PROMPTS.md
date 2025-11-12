# Quick Test Prompts - Copy & Paste

**Purpose:** Fast testing of all artifact types after WebPreview integration  
**Instructions:** Copy each prompt, paste into chat, verify result

---

## ✅ Critical Tests (Must Pass)

### 1. HTML Artifact (WebPreview Expected)
```
Create a simple HTML page with a blue button that says "Hello World" and shows an alert when clicked
```

### 2. React Artifact (WebPreview Expected)
```
Create a React counter component with increment and decrement buttons styled with Tailwind CSS
```

### 3. SVG Artifact (No WebPreview)
```
Create an SVG circle with a radius of 50 pixels, filled with red color
```

### 4. Mermaid Diagram (No WebPreview)
```
Create a mermaid flowchart showing a simple login process: Start -> Enter credentials -> Validate -> Success or Failure
```

---

## 🔍 Regression Tests (Should Still Work)

### 5. Markdown Artifact
```
Create a markdown document with a title "My Project", a bulleted list of 3 features, and a code block showing a JavaScript function
```

### 6. Code Artifact
```
Show me a Python function that calculates the fibonacci sequence
```

### 7. Image Artifact
```
Generate an image of a sunset over mountains
```

---

## 🚀 Advanced Tests (Optional)

### 8. HTML with D3.js
```
Create an HTML page with a D3.js bar chart showing data for 5 products with random sales values
```

### 9. React with Recharts
```
Create a React component with a line chart using Recharts showing temperature data over 7 days
```

### 10. HTML with Animation
```
Create an HTML page with a bouncing ball animation using CSS animations
```

---

## 📋 Quick Checklist

After each test, verify:
- [ ] Artifact renders correctly
- [ ] WebPreview navigation appears (HTML/React only)
- [ ] No console errors (F12)
- [ ] Refresh button works (HTML/React only)
- [ ] Full-screen button works (HTML/React only)

---

## 🎯 Expected Results Summary

| Test | Type | WebPreview? | Key Feature |
|------|------|-------------|-------------|
| 1 | HTML | ✅ Yes | Navigation bar with 3 controls |
| 2 | React | ✅ Yes | Navigation bar + counter works |
| 3 | SVG | ❌ No | Direct SVG rendering |
| 4 | Mermaid | ❌ No | Diagram renders in div |
| 5 | Markdown | ❌ No | Formatted text with syntax highlighting |
| 6 | Code | ❌ No | Syntax highlighted code block |
| 7 | Image | ❌ No | Image display with download |
| 8 | HTML+D3 | ✅ Yes | Bar chart renders |
| 9 | React+Recharts | ✅ Yes | Line chart renders |
| 10 | HTML+Animation | ✅ Yes | Ball bounces smoothly |

---

## 🐛 If Issues Occur

1. **Open Console:** Press F12
2. **Check Errors:** Look for red errors (warnings OK)
3. **Take Screenshot:** Capture full page + console
4. **Report:** Note which test failed and error message

---

**Testing URL:** http://localhost:8081  
**Documentation:** See `.claude/ARTIFACT_TYPE_TEST_PROMPTS.md` for detailed expectations

