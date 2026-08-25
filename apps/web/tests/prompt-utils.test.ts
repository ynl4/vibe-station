import { describe, it, expect } from 'vitest';

// ── Test targets (pure functions extracted for testability) ──

const VAR_RE = /\{\{\s*([\w一-鿿]+)\s*\}\}/g;

function extractVariables(template: string): string[] {
  const vars = new Set<string>();
  let match;
  while ((match = VAR_RE.exec(template)) !== null) {
    vars.add(match[1].trim());
  }
  VAR_RE.lastIndex = 0; // reset for reuse
  return [...vars];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function render(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [k, v] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${escapeRegex(k)}\\s*\\}\\}`, 'g'), v);
  }
  return result;
}

function validateVariables(template: string, provided: Record<string, string>): {
  valid: boolean;
  missing: string[];
} {
  const vars = extractVariables(template);
  const missing = vars.filter(v => !provided[v]?.trim());
  return { valid: missing.length === 0, missing };
}

// ── Tests ────────────────────────────────────────────────────

describe('extractVariables', () => {
  it('extracts simple English variable names', () => {
    const vars = extractVariables('Hello {{name}}, welcome to {{place}}!');
    expect(vars).toEqual(['name', 'place']);
  });

  it('extracts Chinese variable names (Unicode range 一-鿿)', () => {
    const vars = extractVariables('请分析 {{函数名}} 的代码逻辑');
    expect(vars).toEqual(['函数名']);
  });

  it('handles mixed Chinese-English variable names', () => {
    const vars = extractVariables('{{userName}} and {{用户名}} are both valid');
    expect(vars).toEqual(['userName', '用户名']);
  });

  it('handles whitespace inside braces', () => {
    const vars = extractVariables('{{  name  }} and {{  age }}');
    expect(vars).toEqual(['name', 'age']);
  });

  it('returns empty array for template with no variables', () => {
    const vars = extractVariables('Hello world, no variables here!');
    expect(vars).toEqual([]);
  });

  it('deduplicates repeated variables', () => {
    const vars = extractVariables('{{x}} {{x}} {{x}}');
    expect(vars).toEqual(['x']);
  });

  it('extracts variable even with extra leading brace (triple brace degenerates to normal)', () => {
    // {{{ notAVariable }}} → regex finds {{ from position 1 → valid match
    const vars = extractVariables('{{{ notAVariable }}}');
    expect(vars).toEqual(['notAVariable']);
  });

  it('handles underscore and digits in variable names', () => {
    const vars = extractVariables('{{ user_name }} {{ var_1 }} {{ _private }}');
    expect(vars).toEqual(['user_name', 'var_1', '_private']);
  });

  it('handles empty template string', () => {
    const vars = extractVariables('');
    expect(vars).toEqual([]);
  });

  it('resets regex state between calls', () => {
    const vars1 = extractVariables('{{a}} {{b}}');
    const vars2 = extractVariables('{{c}}');
    expect(vars1).toEqual(['a', 'b']);
    expect(vars2).toEqual(['c']);
  });
});

describe('render', () => {
  it('replaces variables with provided values', () => {
    const result = render('Hello {{name}}, you are {{age}} years old.', {
      name: 'Alice',
      age: '30',
    });
    expect(result).toBe('Hello Alice, you are 30 years old.');
  });

  it('replaces Chinese-named variables', () => {
    const result = render('函数 {{函数名}} 的复杂度是 {{复杂度}}', {
      '函数名': 'quickSort',
      '复杂度': 'O(n log n)',
    });
    expect(result).toBe('函数 quickSort 的复杂度是 O(n log n)');
  });

  it('replaces all occurrences of repeated variables', () => {
    const result = render('{{x}} + {{x}} = {{y}}', { x: '1', y: '2' });
    expect(result).toBe('1 + 1 = 2');
  });

  it('handles variables with special regex characters', () => {
    const result = render('Price: {{price}}$', { price: '100' });
    expect(result).toBe('Price: 100$');
  });

  it('leaves unmatched variables untouched (caller should validate first)', () => {
    const result = render('Hello {{name}}', {});
    expect(result).toBe('Hello {{name}}');
  });

  it('handles whitespace in braces during replacement', () => {
    const result = render('Hello {{  name  }}', { name: 'Bob' });
    expect(result).toBe('Hello Bob');
  });
});

describe('validateVariables', () => {
  it('passes when all variables are provided', () => {
    const result = validateVariables('{{a}} {{b}}', { a: '1', b: '2' });
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('fails when a variable is missing', () => {
    const result = validateVariables('{{a}} {{b}}', { a: '1' });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['b']);
  });

  it('fails when a variable is empty string', () => {
    const result = validateVariables('{{a}}', { a: '' });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['a']);
  });

  it('fails when a variable is whitespace only', () => {
    const result = validateVariables('{{a}}', { a: '   ' });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['a']);
  });

  it('returns all missing variables', () => {
    const result = validateVariables('{{a}} {{b}} {{c}}', {});
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['a', 'b', 'c']);
  });

  it('passes for template with no variables', () => {
    const result = validateVariables('No vars here', {});
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });
});

describe('escapeRegex', () => {
  it('escapes regex special characters', () => {
    const escaped = escapeRegex('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o');
    expect(escaped).toBe('a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o');
  });

  it('returns normal strings unchanged', () => {
    expect(escapeRegex('helloWorld')).toBe('helloWorld');
  });
});
