import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-luxe py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-4xl font-semibold">This page has left the runway</h1>
      <p className="mt-3 text-ink/60">The page you’re looking for doesn’t exist.</p>
      <Link to="/shop" className="btn-primary mt-8">Continue shopping</Link>
    </div>
  );
}
