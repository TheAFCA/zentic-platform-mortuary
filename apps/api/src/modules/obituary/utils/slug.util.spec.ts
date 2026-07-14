import { generateObituarySlug } from './slug.util';

describe('generateObituarySlug', () => {
  it('generates a lowercase kebab-case slug with a random suffix', () => {
    const slug = generateObituarySlug('María', 'López');
    expect(slug).toMatch(/^maria-lopez-[0-9a-f]{4}$/);
  });

  it('strips accents and replaces non-alphanumeric characters with dashes', () => {
    const slug = generateObituarySlug('José Ñoño', "O'Connor");
    expect(slug).toMatch(/^[a-z0-9-]+-[0-9a-f]{4}$/);
    expect(slug.startsWith('jose-nono-o-connor-')).toBe(true);
  });

  it('truncates the base to 60 characters before appending the suffix', () => {
    const longFirstName = 'a'.repeat(80);
    const slug = generateObituarySlug(longFirstName, 'lopez');
    const [base, suffix] = [slug.slice(0, -5), slug.slice(-4)];

    expect(base.length).toBeLessThanOrEqual(61); // 60 chars + trailing '-'
    expect(suffix).toMatch(/^[0-9a-f]{4}$/);
  });

  it('generates different slugs for the same name (unique suffix)', () => {
    const first = generateObituarySlug('Ana', 'Ruiz');
    const second = generateObituarySlug('Ana', 'Ruiz');
    expect(first).not.toBe(second);
  });
});
