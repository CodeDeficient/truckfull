/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { globSync } from 'glob';
import ts from 'typescript';

const SAFE_IMPORTS = new Set([
  '@/lib/utils/jsonUtils:safeJsonLdStringify',
  '@/lib/seo/jsonLd:jsonLdScriptContent',
  '@/lib/seo/cityJsonLd:cityJsonLdString',
  '@/lib/seo/layoutJsonLd:getSiteJsonLdMarkup',
]);

function readImports(source: ts.SourceFile): Map<string, string> {
  const imports = new Map<string, string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const binding of bindings.elements) {
      imports.set(
        binding.name.text,
        `${statement.moduleSpecifier.text}:${binding.propertyName?.text ?? binding.name.text}`,
      );
    }
  }
  return imports;
}

function scriptContent(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  source: ts.SourceFile,
): ts.Expression | undefined {
  const html = node.attributes.properties
    .filter(ts.isJsxAttribute)
    .find((attribute) => attribute.name.getText(source) === 'dangerouslySetInnerHTML')?.initializer;
  const object = html && ts.isJsxExpression(html) ? html.expression : undefined;
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined;
  const property = object.properties.find(
    (entry) => ts.isPropertyAssignment(entry) && entry.name.getText(source) === '__html',
  );
  return property && ts.isPropertyAssignment(property) ? property.initializer : undefined;
}

function inspectScripts(file: string): { file: string; line: number; safe: boolean }[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const imports = readImports(source);
  const scripts: { file: string; line: number; safe: boolean }[] = [];
  function visit(node: ts.Node): void {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(source) === 'script'
    ) {
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      const type = attributes.find(
        (attribute) => attribute.name.getText(source) === 'type',
      )?.initializer;
      if (type && ts.isStringLiteral(type) && type.text === 'application/ld+json') {
        const value = scriptContent(node, source);
        const imported =
          value && ts.isCallExpression(value) && ts.isIdentifier(value.expression)
            ? imports.get(value.expression.text)
            : undefined;
        scripts.push({
          file,
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          safe: Boolean(imported && SAFE_IMPORTS.has(imported)),
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return scripts;
}

const scripts = globSync('{app,components}/**/*.tsx').flatMap(inspectScripts);

describe('JSON-LD rendering boundaries', () => {
  it('finds the truck, event, city, blog, and root-layout renderers', () => {
    expect(scripts.map((script) => script.file)).toEqual(
      expect.arrayContaining([
        'app/[slug]/page.tsx',
        'app/events/[city-slug]/[event-slug]/page.tsx',
        'app/events/[city-slug]/page.tsx',
        'app/city/[slug]/page.tsx',
        'app/cuisine/[slug]/page.tsx',
        'app/blog/[slug]/page.tsx',
        'app/layout.tsx',
      ]),
    );
  });

  it.each(scripts)('$file:$line uses a tested script-safe serializer', ({ safe }) => {
    expect(safe).toBe(true);
  });
});
