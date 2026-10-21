import { Link } from "react-router";

export function meta() {
  return [{ title: "Terms of Service — Luhive" }];
}

const TOC_ITEMS = [
  { href: "#acceptance", label: "Acceptance of Terms" },
  { href: "#eligibility", label: "Eligibility" },
  { href: "#accounts", label: "Accounts" },
  { href: "#acceptable-use", label: "Acceptable Use" },
  { href: "#content", label: "User Content" },
  { href: "#communities", label: "Communities" },
  { href: "#paid-events", label: "Paid events" },
  { href: "#gamification", label: "Gamification" },
  { href: "#intellectual-property", label: "Intellectual Property" },
  { href: "#disclaimers", label: "Disclaimers" },
  { href: "#limitation", label: "Limitation of Liability" },
  { href: "#termination", label: "Termination" },
  { href: "#governing-law", label: "Governing Law" },
  { href: "#changes", label: "Changes to Terms" },
  { href: "#contact", label: "Contact Us" },
];

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-secondary">
      <nav className="sticky top-0 z-[100] border-b border-border bg-secondary/92 backdrop-blur-md px-5 flex items-center justify-between h-14">
        <Link to="/" className="text-lg font-semibold text-primary">
          Luhive
        </Link>
        <Link
          to="/privacy-policy"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Privacy Policy
        </Link>
      </nav>

      <div className="max-w-[860px] mx-auto px-5 py-12 md:py-16 border-b border-border">
        <span className="inline-block bg-primary/10 text-primary text-xs font-medium tracking-wider uppercase py-1.5 px-3 rounded-full mb-6">
          Legal
        </span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
          Terms of Service
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
          <section id="acceptance">
            <h2 className="text-xl font-semibold mb-4">
              Acceptance of Terms
            </h2>
            <p className="mb-3.5 text-foreground/90">
              Welcome to Luhive. These Terms of Service ("Terms") constitute a
              legally binding agreement between you and Luhive ("we," "us," or
              "our") governing your access to and use of the Luhive platform,
              including our website at <strong>luhive.com</strong>, mobile
              applications, and all related services (collectively, the
              "Service").
            </p>
            <p className="mb-3.5 text-foreground/90">
              By creating an account, accessing, or using the Service, you
              confirm that you have read, understood, and agree to be bound by
              these Terms and our{" "}
              <Link to="/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree, please do not use Luhive.
            </p>
          </section>

          <section id="eligibility">
            <h2 className="text-xl font-semibold mb-4">Eligibility</h2>
            <p className="mb-3.5 text-foreground/90">
              You may use Luhive only if you:
            </p>
            <ul className="list-none my-2 space-y-1">
              {[
                "Are at least 13 years of age (or the minimum age required in your country)",
                "Are not barred from using the Service under applicable law",
                "Have not had a Luhive account previously terminated for violations of these Terms",
              ].map((item) => (
                <li key={item} className="pl-6 relative text-foreground/90">
                  <span className="absolute left-0 text-primary text-sm">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-foreground/90">
              If you are using the Service on behalf of an organization, you
              represent that you have the authority to bind that organization to
              these Terms.
            </p>
          </section>

          <section id="accounts">
            <h2 className="text-xl font-semibold mb-4">Accounts</h2>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Registration
            </h3>
            <p className="mb-3.5 text-foreground/90">
              To access most features of Luhive, you must create an account. You
              may register using your email address or through a supported
              third-party authentication service (such as Google OAuth). You
              agree to provide accurate, current, and complete information during
              registration and to keep your account information up to date.
            </p>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Account security
            </h3>
            <p className="mb-3.5 text-foreground/90">
              You are responsible for maintaining the confidentiality of your
              login credentials and for all activity that occurs under your
              account. Notify us immediately at{" "}
              <a
                href="mailto:support@luhive.com"
                className="text-primary font-medium hover:underline"
              >
                support@luhive.com
              </a>{" "}
              if you suspect unauthorized access to your account.
            </p>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              One account per person
            </h3>
            <p className="text-foreground/90">
              You may not create multiple accounts for the same individual or use
              another person's account without their explicit permission.
            </p>
          </section>

          <section id="acceptable-use">
            <h2 className="text-xl font-semibold mb-4">Acceptable Use</h2>
            <p className="mb-3.5 text-foreground/90">
              You agree to use Luhive only for lawful purposes and in accordance
              with these Terms. You must not:
            </p>
            <ul className="list-none my-2 space-y-1">
              {[
                "Post, share, or transmit content that is illegal, harmful, threatening, abusive, defamatory, or harassing",
                "Impersonate any person or entity or misrepresent your affiliation",
                "Spam communities or users with unsolicited messages or promotions",
                "Attempt to gain unauthorized access to any part of the Service or another user's account",
                "Use automated scripts, bots, or scrapers to collect data from the platform without our written permission",
                "Interfere with or disrupt the integrity or performance of the Service",
                "Post content that infringes on any third party's intellectual property rights",
                "Engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service",
              ].map((item) => (
                <li key={item} className="pl-6 relative text-foreground/90">
                  <span className="absolute left-0 text-primary text-sm">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 rounded-r-lg py-4 px-5 my-5 text-sm text-amber-800 dark:text-amber-200">
              Violations of these rules may result in immediate account
              suspension or termination without notice.
            </div>
          </section>

          <section id="content">
            <h2 className="text-xl font-semibold mb-4">User Content</h2>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Your content
            </h3>
            <p className="mb-3.5 text-foreground/90">
              You retain ownership of any content you submit, post, or display
              on or through Luhive ("User Content"), including event
              descriptions, announcements, and profile information.
            </p>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              License to Luhive
            </h3>
            <p className="mb-3.5 text-foreground/90">
              By posting User Content on Luhive, you grant us a non-exclusive,
              worldwide, royalty-free, sublicensable license to use, reproduce,
              modify, display, and distribute your content solely for the purpose
              of operating and improving the Service. This license ends when you
              delete your content or close your account.
            </p>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Content standards
            </h3>
            <p className="text-foreground/90">
              You are solely responsible for your User Content. Content must not
              violate any applicable laws, these Terms, or community guidelines.
              We reserve the right (but are not obligated) to remove content that
              we determine, in our sole discretion, violates these standards.
            </p>
          </section>

          <section id="communities">
            <h2 className="text-xl font-semibold mb-4">Communities</h2>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Creating communities
            </h3>
            <p className="mb-3.5 text-foreground/90">
              Community organizers ("Admins") are responsible for the communities
              they create, including ensuring that all content and activities
              within their community comply with these Terms. Admins may set
              additional rules for their communities, provided those rules do not
              conflict with these Terms.
            </p>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Joining communities
            </h3>
            <p className="mb-3.5 text-foreground/90">
              By joining a community, you agree to abide by both these Terms and
              any additional rules set by that community's organizers. Admins may
              remove members from their communities at their discretion.
            </p>
            <h3 className="text-base font-medium mt-6 mb-2 text-primary">
              Community data
            </h3>
            <p className="text-foreground/90">
              Luhive provides Admins with analytics about their community members
              and events. This data is provided in accordance with our Privacy
              Policy and is intended solely for legitimate community management
              purposes.
            </p>
          </section>

          <section id="paid-events">
            <h2 className="text-xl font-semibold mb-4">Paid events</h2>
            <p className="mb-3.5 text-foreground/90">
              When a community collects ticket money itself, that community is the
              seller. It is responsible for taxes, refunds, and any receipt the
              law requires. Luhive does not receive, transfer, or check the
              payment. A receipt uploaded on Luhive is only a note for the
              organiser. Marking a registration as paid is the organiser's own
              confirmation, not a verification by Luhive.
            </p>
            <p className="text-foreground/90">
              This way of collecting payment is offered only to communities we
              enable. Other communities will use a payment provider.
            </p>
          </section>

          <section id="gamification">
            <h2 className="text-xl font-semibold mb-4">
              Gamification & Rewards
            </h2>
            <p className="text-foreground/90">
              Luhive may offer points, badges, streaks, and leaderboard rankings
              as part of our gamification system. These features are provided for
              engagement and community building purposes only. Points and badges
              have no monetary value, cannot be exchanged for cash or prizes, and
              may be adjusted, reset, or discontinued at our discretion.
            </p>
          </section>

          <section id="intellectual-property">
            <h2 className="text-xl font-semibold mb-4">
              Intellectual Property
            </h2>
            <p className="mb-3.5 text-foreground/90">
              The Luhive platform, including its design, code, trademarks,
              logos, and all associated content created by Luhive (excluding User
              Content), is and remains the exclusive property of Luhive and its
              licensors. Nothing in these Terms grants you any right to use our
              trademarks or branding without our prior written consent.
            </p>
            <div className="bg-primary/10 border-l-4 border-primary rounded-r-lg py-4 px-5 my-5 text-sm text-primary">
              If you believe content on Luhive infringes your intellectual
              property rights, please contact us at{" "}
              <strong>support@luhive.com</strong> with details of the claimed
              infringement.
            </div>
          </section>

          <section id="disclaimers">
            <h2 className="text-xl font-semibold mb-4">Disclaimers</h2>
            <p className="mb-3.5 text-foreground/90">
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis
              without warranties of any kind, either express or implied,
              including but not limited to warranties of merchantability, fitness
              for a particular purpose, or non-infringement.
            </p>
            <p className="text-foreground/90">
              We do not warrant that the Service will be uninterrupted,
              error-free, or completely secure. We are not responsible for the
              accuracy, reliability, or content of information posted by users or
              third-party services integrated with Luhive.
            </p>
          </section>

          <section id="limitation">
            <h2 className="text-xl font-semibold mb-4">
              Limitation of Liability
            </h2>
            <p className="mb-3.5 text-foreground/90">
              To the fullest extent permitted by applicable law, Luhive and its
              officers, directors, employees, and agents shall not be liable for
              any indirect, incidental, special, consequential, or punitive
              damages arising out of or relating to your use of (or inability to
              use) the Service, even if we have been advised of the possibility of
              such damages.
            </p>
            <p className="text-foreground/90">
              Our total liability to you for any claim arising out of or relating
              to these Terms or the Service shall not exceed the greater of (a)
              the amount you paid to Luhive in the twelve months preceding the
              claim, or (b) USD $50.
            </p>
          </section>

          <section id="termination">
            <h2 className="text-xl font-semibold mb-4">Termination</h2>
            <p className="mb-3.5 text-foreground/90">
              You may terminate your account at any time by contacting us or
              using the account deletion option in your settings. Upon
              termination, your right to use the Service will immediately cease.
            </p>
            <p className="mb-3.5 text-foreground/90">
              We reserve the right to suspend or terminate your account at any
              time, with or without notice, for conduct that we believe violates
              these Terms, is harmful to other users, to Luhive, or to third
              parties, or for any other reason at our discretion.
            </p>
            <p className="text-foreground/90">
              Sections on intellectual property, disclaimers, limitation of
              liability, and governing law shall survive termination.
            </p>
          </section>

          <section id="governing-law">
            <h2 className="text-xl font-semibold mb-4">
              Governing Law & Disputes
            </h2>
            <p className="text-foreground/90">
              These Terms shall be governed by and construed in accordance with
              the laws of the Republic of Azerbaijan, without regard to its
              conflict of law provisions. Any disputes arising under these Terms
              shall be subject to the exclusive jurisdiction of the courts
              located in Baku, Azerbaijan.
            </p>
          </section>

          <section id="changes">
            <h2 className="text-xl font-semibold mb-4">
              Changes to These Terms
            </h2>
            <p className="text-foreground/90">
              We may revise these Terms from time to time. When we make material
              changes, we will provide at least 14 days' notice by posting the
              new Terms on this page and sending an email notification. Your
              continued use of the Service after the effective date of the
              revised Terms constitutes your acceptance of the changes.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
            <p className="mb-3.5 text-foreground/90">
              For questions or concerns about these Terms of Service, please
              contact us:
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
