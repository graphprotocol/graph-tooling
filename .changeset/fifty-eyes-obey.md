---
'@graphprotocol/graph-cli': minor
---

Changing code generation so we reduce the non-null assertions for primitive types. This way we can return null for primitive types and still have the generated code compile. 
