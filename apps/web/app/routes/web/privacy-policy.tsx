import { Link } from "react-router";

export function meta() {
  return [{ title: "Privacy Policy — Luhive" }];
}

const TOC_ITEMS = [
  { href: "#overview", label: "Overview" },
  { href: "#information-we-collect", label: "Information We Collect" },
  { href: "#google-oauth", label: "Google OAuth Data" },
  { href: "#how-we-use", label: "How We Use Data" },
  { href: "#sharing", label: "Data Sharing" },
  { href: "#storage", label: "Data Storage & Security" },
  { href: "#your-rights", label: "Your Rights" },
  { href: "#cookies", label: "Cookies" },
  { href: "#children", label: "Children's Privacy" },
  { href: "#changes", label: "Changes to Policy" },
  { href: "#contact", label: "Contact Us" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-secondary">
      <nav className="sticky top-0 z-[100] border-b border-border bg-secondary/92 backdrop-blur-md px-5 flex items-center justify-between h-14">
        <Link to="/" className="text-lg font-semibold text-primary">
          Luhive
        </Link>
        <Link
          to="/terms-of-service"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Terms of Service
        </Link>
      </nav>

      <div className="max-w-[860px] mx-auto px-5 py-12 md:py-16 border-b border-border">
        <span className="inline-block bg-primary/10 text-primary text-xs font-medium tracking-wider uppercase py-1.5 px-3 rounded-full mb-6">
          Legal
        </span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Effective date: <strong>February 1, 2025</strong> · Last updated:{" "}
          <strong>October 21, 2026</strong>
        </p>
      </div>

      <div className="max-w-[860px] mx-auto px-5 py-12 md:py-16 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 md:gap-16">
        <aside className="hidden md:block sticky top-24">
          <div className="text-[11px] font-medium tracking-wider uppercase text-muted-foreground mb-4">
            On this page
          </div>
          <nav className="flex flex-col gap-1">
            {TOC_ITEMS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-sm text-muted-foreground hover:text-primary border-l-2 border-border pl-4 py-1.5 hover:border-primary transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="space-y-12 text-foreground">
          <section id="overview">
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <p className="mb-3.5 text-foreground/90">
              Luhive ("we," "us," or "our") is a community management platform
              that helps organizers and members connect, coordinate events, and
              build meaningful communities. We are committed to protecting your
              personal information and your right to privacy.
            </p>
            <p className="mb-3.5 text-foreground/90">
              This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our platform at{" "}
              <strong>luhive.com</strong> and any related services. By using
              Luhive, you agree to the terms described here.
            </p>
            <div className="bg-primary/10 border-l-4 border-primary rounded-r-lg py-4 px-5 my-5 text-sm text-primary">
              We do not sell your personal data. Ever. Your data exists to power
              your experience on Luhive — nothing else.
            </div>
          </section>

          <section id="information-we-collect">
            <h2 className="text-xl font-semibold mb-4">
              Information We Collect
            </h2>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Information you provide directly
            </h3>
            <ul className="list-none my-2 space-y-1">
              {[
                "Full name and display name",
                "Email address",
                "Profile avatar and biography",
                "Community details you create (name, description, logo)",
                "Event and announcement content you publish",
                "Messages and communications within the platform",
                "Payment receipts you upload for an event, stored privately for that community's organisers and deleted if you cancel before paying",
              ].map((item) => (
                <li key={item} className="pl-6 relative text-foreground/90">
                  <span className="absolute left-0 text-primary text-sm">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Information collected automatically
            </h3>
            <ul className="list-none my-2 space-y-1">
              {[
                "Device type, operating system, and browser information",
                "IP address and approximate location",
                "Pages visited, features used, and time spent on the platform",
                "Event registration and attendance history",
                "Gamification activity (points, badges, streaks)",
              ].map((item) => (
                <li key={item} className="pl-6 relative text-foreground/90">
                  <span className="absolute left-0 text-primary text-sm">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Information from third parties
            </h3>
            <p className="text-foreground/90">
              When you sign in using a third-party service (such as Google), we
              receive basic profile information as permitted by that service and
              your privacy settings there.
            </p>
          </section>

          <section id="google-oauth">
            <h2 className="text-xl font-semibold mb-4">Google OAuth Data</h2>
            <p className="mb-3.5 text-foreground/90">
              Luhive uses Google OAuth 2.0 to allow you to sign in quickly and
              securely using your Google account. When you choose to authenticate
              via Google, we request only the minimum permissions necessary to
              create and maintain your Luhive account.
            </p>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Data we receive from Google
            </h3>
            <ul className="list-none my-2 space-y-1">
              {[
                "Your name (as registered with Google)",
                "Your email address associated with your Google account",
                "Your Google profile picture URL (optional)",
                "A unique Google user identifier",
              ].map((item) => (
                <li key={item} className="pl-6 relative text-foreground/90">
                  <span className="absolute left-0 text-primary text-sm">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              What we do NOT access
            </h3>
            <ul className="list-none my-2 space-y-1">
              {[
                "Your Google contacts or address book",
                "Your Google Drive, Docs, or any files",
                "Your Gmail messages",
                "Your Google Calendar events",
                "Any other Google service data beyond the basic profile",
              ].map((item) => (
                <li key={item} className="pl-6 relative text-foreground/90">
                  <span className="absolute left-0 text-primary text-sm">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="bg-primary/10 border-l-4 border-primary rounded-r-lg py-4 px-5 my-5 text-sm text-primary">
              Luhive's use of information received from Google APIs adheres to the{" "}
              <strong>Google API Services User Data Policy</strong>, including the
              Limited Use requirements.
            </div>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Revoking Google access
            </h3>
            <p className="text-foreground/90">
              You can revoke Luhive's access to your Google account at any time
              by visiting{" "}
              <strong>myaccount.google.com/permissions</strong>. Revoking access
              will not delete your Luhive account or data; you may still log in
              with email and password if configured.
            </p>
          </section>

          <section id="how-we-use">
            <h2 className="text-xl font-semibold mb-4">
              How We Use Your Data
            </h2>
            <p className="mb-3.5 text-foreground/90">
              We use the information we collect to:
            </p>
            <ul className="list-none my-2 space-y-1">
              {[
                "Create and manage your Luhive account and profile",
                "Enable community creation, membership, and event management",
                "Send you relevant notifications about communities and events you follow",
                "Personalize your feed and recommendations using AI",
                "Power gamification features (points, badges, leaderboards)",
                "Provide organizers with anonymized analytics about their communities",
                "Improve, debug, and develop new platform features",
                "Comply with legal obligations and enforce our Terms of Service",
              ].map((item) => (
                <li key={item} className="pl-6 relative text-foreground/90">
                  <span className="absolute left-0 text-primary text-sm">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              AI and personalization
            </h3>
            <p className="text-foreground/90">
              Luhive uses artificial intelligence to match users with relevant
              communities and events, generate content suggestions for
              organizers, and surface personalized notifications. AI models are
              trained on aggregated and anonymized platform data and are never
              used to make automated decisions that significantly affect your
              legal rights.
            </p>
          </section>

          <section id="sharing">
            <h2 className="text-xl font-semibold mb-4">
              Data Sharing & Disclosure
            </h2>
            <p className="mb-3.5 text-foreground/90">
              We do not sell, rent, or trade your personal information. We may
              share data only in the following limited circumstances:
            </p>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Service providers
            </h3>
            <p className="mb-3.5 text-foreground/90">
              We work with carefully selected third-party providers (hosting,
              authentication, analytics) who process data strictly on our behalf
              and under confidentiality agreements. These include:
            </p>
            <ul className="list-none my-2 space-y-1">
              {[
                "Supabase — database hosting and authentication",
                "Google — authentication (OAuth 2.0)",
                "Email delivery and notification services",
              ].map((item) => (
                <li key={item} className="pl-6 relative text-foreground/90">
                  <span className="absolute left-0 text-primary text-sm">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Community organizers
            </h3>
            <p className="text-foreground/90">
              When you join a community, basic profile information (name, avatar)
              is visible to community admins and other members as part of normal
              platform functionality.
            </p>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Legal requirements
            </h3>
            <p className="text-foreground/90">
              We may disclose information if required by law, court order, or to
              protect the rights, safety, and security of Luhive, its users, or
              the public.
            </p>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Business transfers
            </h3>
            <p className="text-foreground/90">
              In the event of a merger, acquisition, or sale of assets, your data
              may be transferred as part of that transaction. You will be
              notified via email before your data becomes subject to a different
              privacy policy.
            </p>
          </section>

          <section id="storage">
            <h2 className="text-xl font-semibold mb-4">
              Data Storage & Security
            </h2>
            <p className="mb-3.5 text-foreground/90">
              Your data is stored on secure servers provided by Supabase, with
              data centers operating under strict security and compliance
              standards. We implement technical and organizational measures
              including encryption in transit (TLS), encryption at rest,
              role-based access controls, and regular security reviews.
            </p>
            <p className="text-foreground/90">
              We retain your personal data for as long as your account is active
              or as needed to provide services. You may request deletion of your
              account and associated data at any time (see Your Rights below).
            </p>
          </section>

          <section id="your-rights">
            <h2 className="text-xl font-semibold mb-4">Your Rights</h2>
            <p className="mb-3.5 text-foreground/90">
              Depending on your location, you may have the following rights
              regarding your personal data:
            </p>
            <ul className="list-none my-2 space-y-1">
              {[
                "Access — Request a copy of the personal data we hold about you",
                "Correction — Request correction of inaccurate or incomplete data",
                "Deletion — Request that we delete your account and personal data",
                "Portability — Request your data in a structured, machine-readable format",
                "Objection — Object to certain processing activities",
                "Restriction — Request that we restrict processing of your data",
              ].map((item) => (
                <li key={item} className="pl-6 relative text-foreground/90">
                  <span className="absolute left-0 text-primary text-sm">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-foreground/90">
              To exercise any of these rights, contact us at the email below. We
              will respond within 30 days.
            </p>
          </section>

          <section id="cookies">
            <h2 className="text-xl font-semibold mb-4">Cookies & Tracking</h2>
            <p className="text-foreground/90">
              Luhive uses essential cookies to maintain your session and
              authentication state. We may also use analytics cookies to
              understand platform usage in aggregate. You can control cookie
              preferences through your browser settings; however, disabling
              essential cookies may affect platform functionality.
            </p>
          </section>

          <section id="children">
            <h2 className="text-xl font-semibold mb-4">Children's Privacy</h2>
            <p className="text-foreground/90">
              Luhive is not intended for children under the age of 13. We do not
              knowingly collect personal information from children under 13. If
              you believe a child has provided us with personal information,
              please contact us immediately and we will delete that information.
            </p>
          </section>

          <section id="changes">
            <h2 className="text-xl font-semibold mb-4">
              Changes to This Policy
            </h2>
            <p className="text-foreground/90">
              We may update this Privacy Policy from time to time. When we make
              significant changes, we will notify you by email and/or by
              displaying a prominent notice on the platform. The updated policy
              will take effect 14 days after posting, unless you object before
              that date.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
            <p className="mb-3.5 text-foreground/90">
              If you have questions, concerns, or requests regarding this
              Privacy Policy or your personal data, please reach out:
            </p>
            <div className="bg-card border border-border rounded-xl p-6 mt-4">
              <p className="font-semibold">Luhive</p>
              <p className="mt-1">
                Email:{" "}
                <a
                  href="mailto:support@luhive.com"
                  className="text-primary font-medium hover:underline"
                >
                  support@luhive.com
                </a>
              </p>
              <p className="mt-1">
                Website:{" "}
                <a
                  href="https://luhive.com"
                  className="text-primary font-medium hover:underline"
                >
                  luhive.com
                </a>
              </p>
              <p className="mt-1">Location: Baku, Azerbaijan</p>
            </div>
          </section>
        </main>
      </div>

      <footer className="border-t border-border text-center py-8 text-muted-foreground text-sm">
        <p>
          © 2025 Luhive. All rights reserved. ·{" "}
          <Link to="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link to="/terms-of-service" className="text-primary hover:underline">
            Terms of Service
          </Link>
        </p>
      </footer>
    </div>
  );
}
