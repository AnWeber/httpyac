// a pathLike could be a string (CLI + node:fs) or a vscode.URI (vscode + vscode.workspace.fs)
// needed to support Virtual Documents in VSCode (https://code.visualstudio.com/api/extension-guides/virtual-documents)
export type PathLike = string | { toString(): string };
