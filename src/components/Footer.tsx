export default function Footer() {
  return (
    <footer className="footer" id="main-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="footer-logo">✦</span>
          <span className="footer-title">TaskFlow</span>
        </div>
        <p className="footer-text">
          © {new Date().getFullYear()} TaskFlow. Built with Next.js, Prisma &
          Supabase.
        </p>
        <div className="footer-links">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            id="footer-github"
          >
            GitHub
          </a>
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            id="footer-vercel"
          >
            Vercel
          </a>
        </div>
      </div>
    </footer>
  );
}
