import React from 'react';

interface TermsContentProps {
  SectionComponent?: React.ComponentType<{ title: string; children: React.ReactNode }>;
}

const DefaultSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6">
    <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
    <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
  </section>
);

export const TermsContent: React.FC<TermsContentProps> = ({ SectionComponent = DefaultSection }) => {
  const S = SectionComponent;
  return (
    <div className="space-y-6">
      <S title="1. Platform Description and Disclaimer">
        <p>
          Juriq is a <strong>legal practice management software-as-a-service (SaaS) platform</strong> designed to assist enrolled advocates, law firm staff, and legal professionals with organizing case files, scheduling hearings, managing client records, and storing documents.
        </p>
        <p className="font-semibold border-l-4 border-primary pl-4 py-1">
          IMPORTANT: Juriq is NOT a law firm, NOT a legal representative, NOT a legal advisor, and NOT a legal services marketplace. Use of this platform does not create an attorney-client relationship between Juriq and any user or their clients. All AI-generated research summaries, drafts, or insights are tools to assist legal professionals and do not constitute legal advice. Professional legal judgment must always be applied.
        </p>
      </S>

      <S title="2. Eligibility">
        <p>You may use Juriq only if you:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Are an enrolled advocate, law firm staff member, paralegal, or authorized legal professional;</li>
          <li>Are at least 18 years of age;</li>
          <li>Have the legal capacity to enter into a binding agreement under Indian law;</li>
          <li>Use the platform solely for lawful legal practice management purposes.</li>
        </ul>
        <p>By creating an account, you represent and warrant that you meet these eligibility criteria.</p>
      </S>

      <S title="3. Account Registration and Security">
        <ul className="list-disc pl-5 space-y-1">
          <li>You must provide accurate, complete, and current information during registration.</li>
          <li>You are solely responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You must notify us immediately at <strong>support@juriq.in</strong> if you suspect unauthorized access to your account.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>Sharing account credentials with unauthorized parties is prohibited.</li>
        </ul>
      </S>

      <S title="4. Acceptable Use">
        <p>You agree to use Juriq only for lawful legal practice management. You must not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Upload, store, or process any content that is illegal, infringing, defamatory, or fraudulent;</li>
          <li>Use the platform to harass, impersonate, or harm any person;</li>
          <li>Attempt to gain unauthorized access to any part of the platform or its infrastructure;</li>
          <li>Use automated scraping, bots, or data extraction tools on the platform;</li>
          <li>Resell, sublicense, or otherwise make the platform available to third parties not authorized under your account;</li>
          <li>Violate any applicable law, rule, or regulation, including the Bar Council of India Rules of Professional Conduct.</li>
        </ul>
      </S>

      <S title="5. Data Ownership">
        <p>
          You retain full ownership of all data you create, upload, or enter into Juriq (case records, client data, documents, notes). Juriq acts as a data processor for this content on your behalf.
        </p>
        <p>
          You grant Juriq a limited, non-exclusive, revocable licence to store and process your data solely to provide the platform services described in these Terms. Juriq does not claim intellectual property rights over your content.
        </p>
        <p>
          You are solely responsible for the accuracy, legality, and professional appropriateness of all data you enter into the platform.
        </p>
      </S>

      <S title="6. Subscription and Payment">
        <ul className="list-disc pl-5 space-y-1">
          <li>Subscriptions are billed monthly or annually as selected at the time of purchase, in Indian Rupees (INR) via Razorpay.</li>
          <li>Prices are inclusive of applicable taxes. GST-compliant invoices are generated automatically on payment.</li>
          <li>You may cancel your subscription at any time via Settings. Access continues until the end of the current billing period.</li>
          <li>Refunds are subject to our Refund Policy.</li>
          <li>We reserve the right to modify subscription pricing with at least <strong>30 days' written notice</strong> to registered users before the change takes effect.</li>
        </ul>
      </S>

      <S title="7. Intellectual Property">
        <p>
          The Juriq platform, including all software, design, UI components, brand assets, and proprietary algorithms, is owned by Juriq and protected by applicable intellectual property laws. Nothing in these Terms grants you any rights in or to the Juriq platform beyond the limited licence to use the platform as a subscriber.
        </p>
      </S>

      <S title="8. Service Availability and Modifications">
        <p>
          Juriq is provided on an ongoing basis. We strive for high availability but do not guarantee uninterrupted service. We reserve the right to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Temporarily suspend the service for maintenance, security patches, or infrastructure upgrades, with advance notice where possible;</li>
          <li>Modify, update, or discontinue any feature with reasonable notice to users;</li>
          <li>Suspend or terminate accounts that violate these Terms.</li>
        </ul>
      </S>

      <S title="9. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable Indian law:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Juriq is provided "as is" and "as available" without warranties of any kind, express or implied;</li>
          <li>Juriq shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of the platform;</li>
          <li>Our total cumulative liability to you for any claim arising from these Terms or your use of the platform shall not exceed the total subscription fees paid by you in the <strong>3 months</strong> preceding the claim.</li>
        </ul>
        <p>
          Juriq does not warrant the accuracy of any AI-generated research results, case summaries, or document drafts. You are solely responsible for verifying and applying such outputs using your own professional judgment.
        </p>
      </S>

      <S title="10. Policy Updates and Notification">
        <p>
          We may update these Terms from time to time. When we do:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>We will update the version number and effective date at the top of this page;</li>
          <li>We will send registered users an email notification at least <strong>14 days</strong> before material changes take effect;</li>
          <li>Continued use of the platform after the effective date constitutes acceptance of the updated Terms.</li>
        </ul>
      </S>

      <S title="11. Governing Law and Jurisdiction">
        <p>
          These Terms of Service are governed by and construed in accordance with the laws of the Republic of India. Any dispute arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in <strong>Mumbai, Maharashtra, India</strong>.
        </p>
      </S>

      <S title="12. Contact">
        <p>
          For questions about these Terms:<br />
          <strong>Email:</strong> support@juriq.in<br />
          <strong>Subject:</strong> Terms of Service — [Your Query]
        </p>
      </S>
    </div>
  );
};

export default TermsContent;
