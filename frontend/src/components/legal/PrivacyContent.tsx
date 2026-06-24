import React from 'react';

interface PrivacyContentProps {
  SectionComponent?: React.ComponentType<{ title: string; children: React.ReactNode }>;
}

const DefaultSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6">
    <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
    <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
  </section>
);

export const PrivacyContent: React.FC<PrivacyContentProps> = ({ SectionComponent = DefaultSection }) => {
  const S = SectionComponent;
  return (
    <div className="space-y-6">
      <S title="1. Data Controller">
        <p>
          Juriq ("<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>") operates the Juriq legal practice management platform accessible at <strong>juriq.app</strong>. Juriq is the data controller for personal data processed through this platform.
        </p>
        <p>
          Contact: <strong>support@juriq.in</strong>
        </p>
        <p>
          This Privacy Policy is versioned and dated. When we make material changes, we will update the version number, notify registered users by email, and require renewed consent where required by applicable law.
        </p>
      </S>

      <S title="2. What Data We Collect">
        <p>We collect only the data necessary to provide the Juriq platform. Categories include:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account Data:</strong> Full name, professional email address, authentication credentials (hashed), role (advocate/assistant), and registration timestamp.</li>
          <li><strong>Professional Profile:</strong> Bar Council enrolment number, law firm name, practice areas, court levels, city, state, and contact phone number (entered voluntarily during onboarding).</li>
          <li><strong>Case & Matter Data:</strong> Case names, parties, court details, case notes, hearing dates, and matter status records created by you.</li>
          <li><strong>Client Data:</strong> Names, contact details, and identification information of your clients, entered by you as the data controller for your client records.</li>
          <li><strong>Uploaded Documents:</strong> Legal filings, orders, evidence, and drafts uploaded to the Document Vault, stored encrypted.</li>
          <li><strong>Payment Metadata:</strong> Subscription plan type, billing cycle, Razorpay Customer ID, and invoice reference numbers. <strong>We do not store raw card, bank, or UPI details.</strong></li>
          <li><strong>Usage Data:</strong> Login timestamps, IP addresses, browser user-agent, and platform activity logs for security and audit purposes.</li>
          <li><strong>Consent Records:</strong> The version of our Terms and Privacy Policy you accepted, the date and time of acceptance, and the IP address from which consent was given.</li>
        </ul>
      </S>

      <S title="3. Lawful Bases for Processing">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Contract Performance:</strong> Processing your account data to provide the platform you subscribed to.</li>
          <li><strong>Legitimate Interests:</strong> Security monitoring, fraud prevention, abuse detection, and platform performance analytics.</li>
          <li><strong>Consent:</strong> Where you explicitly provide consent at account creation for processing described in this policy. You may withdraw consent by deleting your account.</li>
          <li><strong>Legal Obligation:</strong> Retaining payment records and audit logs as required by applicable Indian law.</li>
        </ul>
      </S>

      <S title="4. How We Use Your Data">
        <ul className="list-disc pl-5 space-y-1">
          <li>Providing and operating the Juriq platform (case management, document vault, calendar, legal research).</li>
          <li>Processing subscription payments via Razorpay and generating GST-compliant invoices.</li>
          <li>Sending transactional emails (verification, password reset, payment confirmation, hearing reminders).</li>
          <li>Security: detecting unauthorized access, abuse, and platform misuse.</li>
          <li>Audit logging for platform integrity and regulatory compliance.</li>
          <li>Improving platform features based on aggregated, anonymised usage analytics.</li>
        </ul>
        <p className="mt-2 font-semibold text-foreground">We do not use your data for advertising or sell it to any third party.</p>
      </S>

      <S title="5. Third-Party Processors">
        <p>We share data only with the following processors, strictly to deliver platform functionality:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Razorpay Financial Solutions Pvt. Ltd. (India):</strong> Payment processing and subscription management. Subject to Razorpay's own PCI-DSS compliant privacy terms.</li>
          <li><strong>MongoDB Atlas (MongoDB, Inc.) — India-region cluster:</strong> Encrypted database hosting for all application data.</li>
          <li><strong>Cloud Storage Provider (India region):</strong> Encrypted object storage for uploaded documents.</li>
          <li><strong>Email Service Provider:</strong> Transactional email delivery only (no marketing emails without separate consent).</li>
        </ul>
        <p>We do not transfer your personal data outside India for storage or primary processing.</p>
      </S>

      <S title="6. Data Retention">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Active accounts:</strong> Data retained for the lifetime of the active account.</li>
          <li><strong>Deleted accounts:</strong> All personal data, case records, client data, and documents are permanently purged within <strong>30 days</strong> of account deletion. Payment and invoice records required for statutory compliance are retained for <strong>7 years</strong> in anonymised form as required by Indian accounting law.</li>
          <li><strong>Audit logs:</strong> Retained for <strong>2 years</strong> for security and compliance purposes.</li>
        </ul>
      </S>

      <S title="7. Your Rights Under the DPDP Act 2023 (India)">
        <p>As a Data Principal under the Digital Personal Data Protection Act, 2023, you have the following rights:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you.</li>
          <li><strong>Right to Correction:</strong> Request correction of inaccurate or outdated personal data.</li>
          <li><strong>Right to Erasure:</strong> Request deletion of your personal data by deleting your account (available in Settings → Account → Delete Account).</li>
          <li><strong>Right to Data Portability:</strong> Request an export of your data in a machine-readable format via Settings → Privacy & Legal → Request Data Export.</li>
          <li><strong>Right to Withdraw Consent:</strong> Delete your account to withdraw consent. This does not affect the lawfulness of prior processing.</li>
          <li><strong>Right to Grievance Redressal:</strong> Contact <strong>support@juriq.in</strong> with subject line "Privacy Grievance". We will respond within <strong>72 hours</strong>.</li>
        </ul>
      </S>

      <S title="8. Security">
        <ul className="list-disc pl-5 space-y-1">
          <li>All data in transit is encrypted using TLS 1.2+.</li>
          <li>All data at rest is encrypted using AES-256.</li>
          <li>Passwords are hashed using bcrypt (cost factor 12) — we never store plaintext passwords.</li>
          <li>JWT-based authentication with session versioning for all-device logout.</li>
          <li>CSRF protection, rate limiting, and abuse detection on all API endpoints.</li>
          <li>Regular security reviews and infrastructure monitoring.</li>
        </ul>
        <p className="mt-2 font-semibold text-foreground">In the event of a data breach affecting your personal data, we will notify you within <strong>72 hours</strong> of becoming aware of the breach, as required by applicable law.</p>
      </S>

      <S title="9. Cookies">
        <p>
          Juriq uses only strictly necessary and functional cookies. We do not use advertising or third-party tracking cookies. See our Cookie Policy for full details.
        </p>
      </S>

      <S title="10. Changes to This Policy">
        <p>
          When we update this Privacy Policy, we will increment the version number and post the new version at <strong>/privacy</strong>. We will notify registered users by email at least <strong>14 days</strong> before material changes take effect. Continued use of the platform after the effective date constitutes acceptance.
        </p>
      </S>

      <S title="11. Contact">
        <p>
          For any privacy-related queries, rights requests, or grievances:<br />
          <strong>Email:</strong> support@juriq.in<br />
          <strong>Subject:</strong> Privacy Policy — [Your Query]
        </p>
      </S>
    </div>
  );
};

export default PrivacyContent;
