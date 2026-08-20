import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourceRoot = fileURLToPath(new URL('../src', import.meta.url));
const ignoredPathParts = ['/test/', '/mocks/', '/fixtures/', '/i18n/locales/'];
const userFacingAttributes = new Set(['aria-label', 'title', 'placeholder', 'alt']);
const userFacingPropertyNames = new Set(['label', 'title', 'description', 'placeholder', 'message', 'errorMessage', 'helperText', 'emptyMessage', 'loadingMessage', 'successMessage', 'hint']);
const letterPattern = /[\p{L}]/u;

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    if (!/\.(tsx|ts)$/.test(entry.name) || /\.test\.(tsx|ts)$/.test(entry.name)) return [];
    const normalized = fullPath.replaceAll('\\', '/');
    return ignoredPathParts.some((part) => normalized.includes(part)) ? [] : [fullPath];
  });
}

function location(sourceFile, node) {
  const point = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: point.line + 1, column: point.character + 1 };
}

export function findHardTextViolations(source, fileName = 'source.tsx') {
  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind);
  const violations = [];
  const add = (node, text) => {
    const value = text.trim();
    if (value && letterPattern.test(value)) violations.push({ file: fileName, text: value, ...location(sourceFile, node) });
  };

  function visit(node) {
    if (ts.isJsxText(node)) add(node, node.text);
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && userFacingAttributes.has(node.name.text)) {
      if (node.initializer && ts.isStringLiteral(node.initializer)) add(node.initializer, node.initializer.text);
    }
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && userFacingPropertyNames.has(node.name.text) && ts.isStringLiteral(node.initializer)) {
      add(node.initializer, node.initializer.text);
    }
    if (ts.isJsxExpression(node) && node.expression && ts.isStringLiteral(node.expression)) add(node.expression, node.expression.text);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

export function scanSource(root = sourceRoot) {
  return collectSourceFiles(root).flatMap((fileName) => {
    const source = fs.readFileSync(fileName, 'utf8');
    return findHardTextViolations(source, path.relative(process.cwd(), fileName));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const violations = scanSource();
  for (const violation of violations) console.error(`${violation.file}:${violation.line}:${violation.column} ${violation.text}`);
  console.log(`${violations.length} hardcoded user-facing strings`);
  process.exitCode = violations.length ? 1 : 0;
}
