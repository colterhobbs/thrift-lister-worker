import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const lastUpdated = "April 8, 2026";
  const appName = "ThriftLister";
  const appUrl = "https://app.salvaginghistory.com";
  const contactEmail = "support@salvaginghistory.com";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to {appName}
            </button>
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-bold uppercase tracking-wider">Privacy Policy</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="prose prose-sm max-w-none">
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">{appName} Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: {lastUpdated}</p>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">1. Introduction</h2>
            <p className="text-foreground leading-relaxed">
              Welcome to {appName} ("{appName}", "we", "us", or "our"), operated by Salvaging History. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web application located at{" "}
              <a href={appUrl} className="text-primary underline">{appUrl}</a> (the "Service"). Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">2. Information We Collect</h2>
            <p className="text-foreground leading-relaxed mb-3">We may collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li><strong>Account Information:</strong> When you sign in, we collect your name and email address via our authentication provider.</li>
              <li><strong>Item Data:</strong> Photos, descriptions, and details you upload about items you are researching or listing for sale.</li>
              <li><strong>Listing Data:</strong> Titles, descriptions, prices, and other information you create for marketplace listings.</li>
              <li><strong>Third-Party Platform Tokens:</strong> OAuth access tokens for eBay and Etsy that you authorize, stored securely to enable posting on your behalf.</li>
              <li><strong>Usage Data:</strong> Standard server logs including IP address, browser type, pages visited, and timestamps, collected automatically when you use the Service.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">3. How We Use Your Information</h2>
            <p className="text-foreground leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Provide, operate, and maintain the Service</li>
              <li>Identify and price items using AI-powered analysis</li>
              <li>Create and publish listings to third-party marketplaces (eBay, Etsy) on your behalf</li>
              <li>Track shipments and generate buyer-facing tracking pages</li>
              <li>Send notifications about price changes for items you monitor</li>
              <li>Improve and personalize your experience</li>
              <li>Respond to your comments and questions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">4. Sharing of Information</h2>
            <p className="text-foreground leading-relaxed mb-3">
              We do not sell, trade, or rent your personal information to third parties. We may share information in the following limited circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li><strong>Third-Party Marketplaces:</strong> When you authorize the Service to post listings, your listing content (title, description, photos, price) is transmitted to eBay and/or Etsy via their official APIs.</li>
              <li><strong>Service Providers:</strong> We may share data with trusted third-party vendors who assist in operating the Service (e.g., cloud storage, AI processing), subject to confidentiality agreements.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal process.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">5. Third-Party Marketplace Integrations</h2>
            <p className="text-foreground leading-relaxed mb-3">
              The Service integrates with third-party platforms including eBay and Etsy. When you connect your accounts:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>We store OAuth tokens securely in our database to act on your behalf</li>
              <li>You may revoke access at any time through the respective platform's account settings or through the Service's settings page</li>
              <li>Your use of those platforms is also subject to their own privacy policies: <a href="https://www.ebay.com/help/policies/member-behaviour-policies/user-privacy-notice-privacy-policy" className="text-primary underline" target="_blank" rel="noopener noreferrer">eBay Privacy Policy</a> and <a href="https://www.etsy.com/legal/privacy/" className="text-primary underline" target="_blank" rel="noopener noreferrer">Etsy Privacy Policy</a></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">6. Data Retention</h2>
            <p className="text-foreground leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting us at{" "}
              <a href={`mailto:${contactEmail}`} className="text-primary underline">{contactEmail}</a>. We will respond to deletion requests within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">7. Data Security</h2>
            <p className="text-foreground leading-relaxed">
              We implement commercially reasonable technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. This includes encrypted data transmission (HTTPS/TLS), secure token storage, and access controls. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">8. Cookies and Tracking</h2>
            <p className="text-foreground leading-relaxed">
              We use session cookies to maintain your authenticated session. These cookies are essential for the Service to function and do not track you across other websites. We do not use advertising cookies or third-party tracking pixels.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">9. Children's Privacy</h2>
            <p className="text-foreground leading-relaxed">
              The Service is not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">10. Your Rights</h2>
            <p className="text-foreground leading-relaxed mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing of your data</li>
              <li>Data portability (receive your data in a structured format)</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-3">
              To exercise any of these rights, please contact us at{" "}
              <a href={`mailto:${contactEmail}`} className="text-primary underline">{contactEmail}</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">11. Changes to This Policy</h2>
            <p className="text-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by updating the "Last updated" date at the top of this page. Your continued use of the Service after any changes constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">12. Contact Us</h2>
            <p className="text-foreground leading-relaxed">
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-3 p-4 bg-card border border-border rounded-lg">
              <p className="font-bold">{appName} / Salvaging History</p>
              <p className="text-muted-foreground">Email: <a href={`mailto:${contactEmail}`} className="text-primary underline">{contactEmail}</a></p>
              <p className="text-muted-foreground">Website: <a href={appUrl} className="text-primary underline">{appUrl}</a></p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Salvaging History. All rights reserved.</span>
          <Link href="/">
            <span className="font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors cursor-pointer">
              ThriftLister
            </span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
