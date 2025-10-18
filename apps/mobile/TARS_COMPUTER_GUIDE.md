# 🖥️ **Tars's Computer** - Complete Guide

## **What is "Tars's Computer"?**

**"Tars's Computer"** is the **right panel** in the mobile app that displays **real-time tool execution** and **results** as the AI agent performs actions on your behalf.

Think of it as a **live dashboard** showing:
- 🌐 Browser actions (screenshots, navigation)
- 💻 Terminal commands (output & exit codes)
- 📁 File operations (read, write, delete)
- 🔗 Web scraping/searching results
- 🖼️ Image processing
- ✅ Task completion status

---

## **Visual Layout**

```
┌─────────────────────────────────────┐
│  🖥️  Tars's Computer        [Running] │ ← Header with status
├─────────────────────────────────────┤
│                                     │
│        [Tool View Content]          │
│                                     │
│  • Browser screenshots              │
│  • Terminal output                  │
│  • File previews                    │
│  • Search results                   │
│                                     │
├─────────────────────────────────────┤
│  [◀  2/5  ▶]                        │ ← Timeline slider
│  [Jump to latest]                   │
└─────────────────────────────────────┘
```

---

## **How It Works**

### **1. Tool Execution Flow**

```
AI Agent Says:
"Let me search for that..."
           ↓
    execute 'web-search' tool
           ↓
  Tool View appears in right panel
           ↓
  Displays search results in real-time
           ↓
  AI uses results to continue conversation
```

### **2. Message Flow**

```
MessageThread (center)          RightPanel (left panel)
       ↓                              ↓
   Tool call detected          Tool call snapshot created
       ↓                              ↓
   Tool button appears         Tool View displayed
  (user can tap)               (live or on-demand)
```

---

## **📋 All Available Tool Views**

### **🌐 Browser Tools**
**Component**: `BrowserToolView.tsx`

**What it shows**:
- **Screenshot** of current webpage
- **URL** being visited
- **Action** performed (Navigate, Click, Input, Scroll, etc.)
- **Status** (success/loading/error)

**Example**:
```
┌──────────────────────────────┐
│ 🌐 Browser: Navigate          │
│ https://example.com           │
├──────────────────────────────┤
│                              │
│  [Screenshot of webpage]     │
│  (rendered via WebView)      │
│                              │
│  ✓ Success                   │
└──────────────────────────────┘
```

**Supported Operations**:
- `browser-navigate-to` - Go to URL
- `browser-click-element` - Click elements
- `browser-input-text` - Type text
- `browser-scroll-down/up` - Scroll
- `browser-switch-tab` - Switch tabs
- `browser-wait` - Wait for content

---

### **💻 Command/Terminal Tools**
**Component**: `CommandToolView.tsx`

**What it shows**:
- **Command** executed
- **Terminal output** (formatted monospace)
- **Exit code** (0 = success)
- **Working directory**
- **Session name**

**Example**:
```
┌──────────────────────────────┐
│ 💻 Execute Command            │
├──────────────────────────────┤
│ $ npm install                │
│                              │
│ ✓ installed 125 packages     │
│   in 5.2s                    │
│                              │
│ Exit Code: 0 ✓               │
└──────────────────────────────┘
```

---

### **📁 File Operation Tools**
**Component**: `FileOperationToolView.tsx`

**What it shows**:
- **File path**
- **Operation** (Create, Read, Delete, Replace)
- **File content** (for read/create/replace)
- **Status** (success/error)

**Supported Operations**:
- `create-file` - Create new file
- `read-file` - Read file content
- `delete-file` - Delete file
- `full-file-rewrite` - Replace entire file

**Example**:
```
┌──────────────────────────────┐
│ 📄 Read File                  │
│ /src/main.py                 │
├──────────────────────────────┤
│                              │
│ def hello():                 │
│     print("Hello World")     │
│     return True              │
│                              │
└──────────────────────────────┘
```

---

### **📝 String Replace Tool**
**Component**: `StrReplaceToolView.tsx`

**What it shows**:
- **File path**
- **Before** (original text highlighted)
- **After** (replacement text highlighted)
- **Match count**

**Example**:
```
┌──────────────────────────────┐
│ ✏️  String Replace            │
│ /src/config.js               │
├──────────────────────────────┤
│                              │
│ BEFORE: color = "blue"       │
│ AFTER:  color = "red"        │
│                              │
│ ✓ Replaced 1 occurrence      │
└──────────────────────────────┘
```

---

### **🔍 Web Search Tools**
**Component**: `WebSearchToolView.tsx`

**What it shows**:
- **Search query**
- **Results list** with:
  - Title
  - URL
  - Snippet
- **Result count**

**Example**:
```
┌──────────────────────────────┐
│ 🔍 Web Search                │
│ "React Native best practices"│
├──────────────────────────────┤
│                              │
│ 1. Optimizing React Native   │
│    react.dev/...             │
│    "Best practices for..."   │
│                              │
│ 2. Performance Guide         │
│    facebook.github.io/...    │
│                              │
│ 5 results found              │
└──────────────────────────────┘
```

---

### **🕷️ Web Scraping Tools**
**Component**: `WebCrawlToolView.tsx` / `WebScrapeToolView.tsx`

**What it shows**:
- **URL** scraped
- **Extracted data** (formatted)
- **Status** (success/partial/error)
- **Data preview** (first N rows/items)

**Example**:
```
┌──────────────────────────────┐
│ 🕷️  Scrape Webpage            │
│ https://example.com/news     │
├──────────────────────────────┤
│                              │
│ Extracted 15 articles        │
│                              │
│ • Article 1: "Breaking..."  │
│ • Article 2: "New Study..."  │
│ • Article 3: "Report: ..."   │
│                              │
│ +12 more items               │
└──────────────────────────────┘
```

---

### **🖼️ Image Tools**
**Component**: `SeeImageToolView.tsx`

**What it shows**:
- **Image preview** (full-size)
- **Image metadata** (size, format, URL)
- **Analysis** (if AI analyzed the image)

---

### **✅ Complete/Ask Tools**
**Component**: `CompleteToolView.tsx` / `AskToolView.tsx`

**What it shows**:
- **Task completion** status
- **Reasoning** from AI
- **Confirmation** data

---

### **⚙️ Generic Tool**
**Component**: `GenericToolView.tsx`

Fallback for unknown tools - displays:
- **Tool name**
- **Raw tool call** (JSON)
- **Tool result** (formatted)

---

## **🎬 Timeline & Navigation**

The bottom of the panel shows:

```
[◀ Previous]  [=====●======]  [Next ▶]
     3 / 5  [Jump to Latest]
```

### **Features**:

| Feature | Purpose |
|---------|---------|
| **Previous/Next buttons** | Navigate between tool calls |
| **Slider** | Scrub through tool history |
| **Counter** | Show current position (e.g., "3/5") |
| **Status badge** | Shows "Live Updates", "Latest Tool", or "Jump to Live" |

**Status Meanings**:
- 🔴 **Live Updates** - Currently executing tools
- 🟢 **Latest Tool** - Viewing the most recent tool call
- 🔵 **Jump to Live** - Behind on history, can jump to current

---

## **🔄 Real-Time Features**

### **Streaming Tool Results**

When a tool is executing:
1. Panel shows "**Running**" badge with spinning icon
2. Content updates as results arrive
3. Status changes from "thinking..." → "executing" → "complete"

### **Auto-Update**

By default, the panel is in **"Live"** mode:
- Automatically shows latest tool execution
- Scrolls to new results
- Shows "Jump to Latest" if you manually navigate backwards

---

## **🛠️ Custom Tool Handler**

To add a new tool type:

1. Create a new component (e.g., `NewToolView.tsx`)
2. Implement `ToolViewProps` interface
3. Register in `ToolViewRegistry.tsx`:

```typescript
// In ToolViewRegistry.tsx
const defaultRegistry: Record<string, ToolViewComponent> = {
    'my-custom-tool': MyCustomToolView,
    // ...
};
```

---

## **📊 Data Flow**

```
RightPanel receives:
├── selectedToolCall (current tool being viewed)
├── toolCallSnapshots (array of all tool calls)
├── currentSnapshotIndex (which one we're viewing)
├── toolResult (formatted output)
├── browserState (for browser tools)
├── messages (chat history)
└── sandboxId (for file access)
        ↓
   ToolView selector
        ↓
   Appropriate component renders result
```

---

## **✨ Key Features**

✅ **Live streaming** - See results as they arrive
✅ **Timeline scrubbing** - Jump to any tool call
✅ **Rich previews** - Images, code, terminals
✅ **Error handling** - Shows errors clearly
✅ **Status indicators** - Running, complete, error
✅ **Responsive layout** - Works on all screen sizes
✅ **Dark/Light theme** - Full theme support

---

## **🚀 Example Workflow**

1. **User**: "Scrape the top 10 products from this website"
2. **AI**: Starts executing
   - Panel shows header: "🖥️ Tars's Computer [Running]"
3. **Tool 1**: Browser navigates to site
   - Shows screenshot
4. **Tool 2**: Scrapes data
   - Shows extracted products
5. **Tool 3**: Formats results
   - Shows JSON output
6. **Panel updates**: Timeline shows "1 / 3"
   - User can scrub through execution
7. **AI responds**: Uses data in chat message
   - Panel remains visible for reference

---

