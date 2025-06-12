---
description: 
globs: 
alwaysApply: true
---
---
description: Guidelines and best practices for creating .mdc (Markdown Configuration) files in Cursor, including structure, metadata annotations, and formatting rules
globs: ["**/*.mdc"]
---

# Cursor MDC File Guidelines

@context {
    "type": "documentation",
    "purpose": "cursor_rules",
    "format_version": "1.0.0",
    "supported_content_types": [
        "guidelines",
        "api_docs",
        "examples",
        "implementations"
    ]
}

@structure {
    "required_sections": [
        "frontmatter",
        "title",
        "context",
        "content_sections"
    ],
    "optional_sections": [
        "version",
        "last_updated",
        "examples",
        "implementations",
        "related_files"
    ],
    "recommended_sections": [
        "practical_examples",
        "common_patterns",
        "type_definitions"
    ]
}

## File Structure

### 1. Frontmatter

@frontmatter_rules [
    {
        "id": "position",
        "rule": "Must be at the very top of the file",
        "severity": "error"
    },
    {
        "id": "description",
        "rule": "Single sentence, clear purpose",
        "severity": "error"
    },
    {
        "id": "globs",
        "rule": "Array of relevant file patterns",
        "severity": "error"
    },
    {
        "id": "related_docs",
        "rule": "Optional array of related documentation files - MUST only reference existing files",
        "severity": "error"
    },
    {
        "id": "file_validation",
        "rule": "All referenced files must exist in the workspace",
        "severity": "error"
    }
]

Example frontmatter:
```yaml
---
description: Guidelines for implementing feature X
globs: ["**/*.{ts,tsx}"]
related_docs: ["docs/architecture/feature-x.md"]
---
```

### 2. Metadata Annotations

@annotations {
    "syntax": "@annotation_name JSON_content",
    "placement": "Before relevant sections",
    "format": "Valid JSON with proper indentation",
    "types": {
        "context": "Project and document context",
        "rules": "List of rules or requirements",
        "format": "Format specifications",
        "options": "Available options",
        "examples": "Implementation examples",
        "implementations": "Full implementation details",
        "related": "Related documentation or code"
    }
}

### 3. Content Structure

@content_rules {
    "headings": {
        "h1": "Single main title",
        "h2": "Major sections",
        "h3": "Subsections",
        "h4": "Detailed points"
    },
    "code_blocks": {
        "syntax": "Always specify language",
        "examples": "Include practical examples",
        "formatting": "Use proper indentation",
        "context": "Add explanatory comments"
    },
    "implementation_blocks": {
        "structure": "Group related implementations",
        "documentation": "Include inline documentation",
        "types": "Specify type information",
        "validation": "Include validation rules"
    }
}

## Best Practices

@best_practices {
    "organization": {
        "sections": "Use clear hierarchical structure",
        "annotations": "Place before relevant content",
        "examples": "Include practical examples"
    },
    "formatting": {
        "json": "Properly formatted, valid JSON",
        "markdown": "Clean, consistent spacing",
        "code": "Language-specific syntax highlighting"
    },
    "metadata": {
        "annotations": "Use semantic names",
        "context": "Provide clear scope",
        "versioning": "Include version information"
    },
    "implementation": {
        "examples": "Provide complete, working examples",
        "types": "Include type definitions",
        "validation": "Specify validation rules",
        "error_handling": "Document error cases"
    }
}

## Implementation Guidelines

@implementation_rules {
    "code_examples": {
        "completeness": "Must be fully functional",
        "types": "Include all necessary type information",
        "imports": "Show all required imports",
        "context": "Provide setup and usage context"
    },
    "documentation": {
        "inline": "Add explanatory comments",
        "types": "Document type constraints",
        "errors": "Document error conditions",
        "usage": "Show usage patterns"
    }
}

## Example Structure

### Basic Example
```markdown
---
description: Example implementation of feature X
globs: ["src/features/**/*.ts"]
---

# Feature X Implementation

@context {
    "type": "implementation",
    "feature": "X",
    "version": "1.0.0"
}

## Overview
[Feature description]

## Implementation

@implementation {
    "language": "typescript",
    "dependencies": ["dep1", "dep2"],
    "types": {
        "TypeX": "Description of TypeX"
    }
}

```typescript
// Implementation code with types and validation
```

## Usage Examples
[Usage examples with code]
```

### Full Implementation Example
See the `examples` section in related .mdc files for complete implementation examples.

## Common Patterns

@patterns {
    "rules_section": {
        "format": "array of objects",
        "properties": ["id", "severity", "description"],
        "example": [
            {
                "id": "rule_name",
                "severity": "error",
                "description": "Clear description"
            }
        ]
    },
    "implementation_section": {
        "format": "object with implementation details",
        "required": [
            "language",
            "types",
            "validation"
        ],
        "example": {
            "language": "typescript",
            "types": {
                "Type1": "Description"
            },
            "validation": {
                "rule1": "Description"
            }
        }
    }
}

## Examples

### Minimal Valid MDC File
```markdown
---
description: A simple example MDC file
globs: ["**/*.example"]
---

# Example Rules

@context {
    "type": "example",
    "version": "1.0.0"
}

## Section One

@rules [
    {
        "id": "rule_one",
        "severity": "error",
        "description": "Description of rule one"
    }
]
```

### Common Section Examples

#### Rules Section
```markdown
@rules [
    {
        "id": "unique_identifier",
        "severity": "error|warning|info",
        "description": "Clear description of the rule"
    }
]
```

#### Options Section
```markdown
@options {
    "option_name": "What this option does",
    "another_option": "Description of another option"
}
```

#### Format Section
```markdown
@format {
    "base": "Template with {placeholders}",
    "options": ["array", "of", "options"],
    "paths": {
        "key": "value"
    }
}
```

### Common Mistakes to Avoid

@mistakes [
    {
        "id": "missing_frontmatter",
        "wrong": "Starting directly with content",
        "correct": "Include frontmatter at top",
        "reason": "Frontmatter is required for Cursor to properly parse the file"
    },
    {
        "id": "invalid_json",
        "wrong": "Malformed JSON in annotations",
        "correct": "Properly formatted JSON with quotes around keys",
        "reason": "Annotations must contain valid JSON for proper parsing"
    },
    {
        "id": "inconsistent_structure",
        "wrong": "Mixed levels of headings",
        "correct": "Clear hierarchical structure",
        "reason": "Consistent structure helps with readability and parsing"
    },
    {
        "id": "nonexistent_files",
        "wrong": "Referencing files that don't exist in the workspace",
        "correct": "Only reference files that exist and have been verified",
        "reason": "Prevents broken links and maintains documentation integrity"
    }
]

## Validation

@validation {
    "required": [
        "Frontmatter must be present and valid",
        "All JSON must be properly formatted",
        "Main title must be present",
        "At least one content section",
        "Complete implementation examples when relevant",
        "All referenced files must exist in the workspace"
    ],
    "recommended": [
        "Version information",
        "Last updated date",
        "Clear examples",
        "Proper code formatting",
        "Type definitions",
        "Validation rules",
        "Verify file existence before referencing"
    ]
}

@version "1.1.0"
@last_updated "2024-03-19"