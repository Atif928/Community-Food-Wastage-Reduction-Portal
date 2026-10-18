/**
 * LandingPage - the public homepage.
 *
 * Explains the "why" and "how" behind the portal, lists the key benefits and
 * points visitors towards login/register.
 */
import { Link } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl" aria-hidden="true">🍲</span>
          <h1 className="text-2xl font-bold text-slate-900">
            Food<span className="text-brand-600">Portal</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to="/login" className="btn-secondary">Log in</Link>
          <Link to="/register" className="btn-primary">Get started</Link>
        </div>
      </header>

      <section className="mt-10 rounded-3xl bg-gradient-to-b from-brand-50 to-white px-6 py-10 text-center shadow-card sm:px-10">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
          Rescue surplus food. Feed people. Cut waste.
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600">
          The Community Food Wastage Reduction Portal connects restaurants, hotels and
          individuals with NGOs, shelters and volunteers so good food never goes to landfill.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary">Sign up as donor or recipient</Link>
          <Link to="/login" className="btn-secondary">I already have an account</Link>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { icon: '🍽️', title: 'Save meals', body: 'Divert edible surplus to people who need it, instead of throwing it away.' },
          { icon: '📍', title: 'Find nearby', body: 'Location-aware matching helps donors and recipients connect faster and cut travel.' },
          { icon: '🛡️', title: 'Verified NGOs', body: 'NGO/shelter accounts are reviewed by admins before they can claim food, keeping everything safe.' },
        ].map((feature) => (
          <div key={feature.title} className="card card-body text-center">
            <div className="text-4xl">{feature.icon}</div>
            <h3 className="mt-2 text-lg font-semibold">{feature.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 card card-body">
        <PageHeader title="How it works" subtitle="Three simple steps to keep food out of waste." />
        <ol className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { number: '1', title: 'Post surplus', body: 'Donors add a listing with photos, quantity, best-before and pickup location. Nearby recipients are notified instantly.' },
            { number: '2', title: 'Claim & collect', body: 'Verified recipients claim the listing, coordinate pickup, then confirm delivery with an optional proof photo.' },
            { number: '3', title: 'Track impact', body: 'Both sides see meals saved, waste diverted and feedback - building a trusted community.' },
          ].map((step) => (
            <li key={step.number} className="flex flex-col items-center text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white font-bold">{step.number}</span>
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-10 text-center text-xs text-slate-500">
        Community Food Wastage Reduction Portal · Every meal matters
      </footer>
    </div>
  );
}
