const { isSafeUrl } = require('../src/utils/urlSafety');
const { extractText } = require('../src/services/retrieval/extractPage');
const { discoverLinks } = require('../src/services/retrieval/discoverLinks');
const { rankLinks, categorizePage } = require('../src/services/retrieval/rankLinks');

describe('Retrieval Modules', () => {
  describe('urlSafety', () => {
    it('valid URL accepted', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
      expect(isSafeUrl('http://github.com/path?q=1')).toBe(true);
    });

    it('invalid URL rejected', () => {
      expect(isSafeUrl('not-a-url')).toBe(false);
      expect(isSafeUrl('ftp://example.com')).toBe(false);
    });

    it('localhost/private URL rejected', () => {
      expect(isSafeUrl('http://localhost')).toBe(false);
      expect(isSafeUrl('http://127.0.0.1')).toBe(false);
      expect(isSafeUrl('http://10.0.0.1')).toBe(false);
      expect(isSafeUrl('http://192.168.1.1')).toBe(false);
      expect(isSafeUrl('http://172.16.0.1')).toBe(false);
      expect(isSafeUrl('http://169.254.169.254')).toBe(false); // Link-local/Metadata
    });
  });

  describe('extractPage', () => {
    it('HTML text extraction removes script/style noise', () => {
      const html = `
        <html>
          <head><style>.hidden { display: none; }</style><script>alert('noise')</script></head>
          <body>
            <nav>Menu</nav>
            <h1>Company Info</h1>
            <p>We are a tech company.</p>
            <footer>Copyright 2026</footer>
          </body>
        </html>
      `;
      const text = extractText(html);
      expect(text).not.toContain('alert');
      expect(text).not.toContain('display: none');
      expect(text).not.toContain('Menu');
      expect(text).not.toContain('Copyright');
      expect(text).toContain('Company Info');
      expect(text).toContain('We are a tech company.');
    });
  });

  describe('discoverLinks', () => {
    it('relative links resolve correctly', () => {
      const html = `<a href="/careers">Careers</a><a href="../jobs">Jobs</a>`;
      const links = discoverLinks(html, 'https://example.com/about/us');
      expect(links.find(l => l.anchorText === 'careers').absoluteUrl).toBe('https://example.com/careers');
      expect(links.find(l => l.anchorText === 'jobs').absoluteUrl).toBe('https://example.com/jobs');
    });

    it('duplicate URLs are removed', () => {
      const html = `<a href="/jobs">Jobs 1</a><a href="https://example.com/jobs">Jobs 2</a>`;
      const links = discoverLinks(html, 'https://example.com/');
      expect(links.length).toBe(1); // Deduped
    });
  });

  describe('rankLinks', () => {
    it('only same-origin links are preferred, irrelevant down-ranked', () => {
      const links = [
        { absoluteUrl: 'https://other.com/careers', anchorText: 'careers', path: '/careers', sameOrigin: false },
        { absoluteUrl: 'https://example.com/login', anchorText: 'login', path: '/login', sameOrigin: true },
        { absoluteUrl: 'https://example.com/careers', anchorText: 'careers', path: '/careers', sameOrigin: true }
      ];
      
      const ranked = rankLinks(links);
      expect(ranked[0].absoluteUrl).toBe('https://example.com/careers'); // Best
      expect(ranked[2].absoluteUrl).toBe('https://other.com/careers'); // Worst (not same origin)
    });
  });

  describe('categorizePage', () => {
    it('hiring/career-related links receive higher ranking/categorization', () => {
      expect(categorizePage('Join our team', 'https://example.com/careers')).toBe('hiring');
    });
  });
});
