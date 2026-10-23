"use client";

import { useRegistrationLanguage } from "@/components/workflow/registration-language-provider";

type PolicySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  closing?: string;
};

// English strings double as dictionary keys, same as the registration form.
const SECTIONS: PolicySection[] = [
  {
    heading: "The Information We Collect",
    paragraphs: [
      "This notice applies to the information you submit through the Ghana Manganese Company (GMC) site-access registration form. The types of personal information we collect include:",
    ],
    bullets: [
      "Your name, date of birth, gender and nationality",
      "Passport or Ghana Card number, and copies of the identity, visa, permit and medical or training documents you upload",
      "Your email address and telephone numbers",
      "Emergency contact details",
      "Your employer or company details and the purpose of your visit",
      "Any additional information you choose to provide in the form",
    ],
  },
  {
    heading: "How We Use Your Information",
    paragraphs: ["We use the information you provide only to:"],
    bullets: [
      "Process your site-access request and decide whether access can be granted",
      "Arrange the medical, induction and security requirements for your visit",
      "Contact you, or your emergency contact, about your visit",
      "Keep records of who was on site, for safety and legal compliance",
    ],
    closing:
      "We do not use your information for marketing and we do not sell it.",
  },
  {
    heading: "Who Can See Your Information",
    paragraphs: [
      "Your submission is visible only to GMC staff who need it to process your request, such as the Department Head who invited you, Reception, and the departments that clear you for site access.",
      "We use service providers to host our systems, store uploaded documents and send email. They process data on our behalf. We do not share your personal information with anyone else unless the law requires it.",
    ],
  },
  {
    heading: "Cookies and Browser Storage",
    paragraphs: [
      "This form does not use cookies for analytics, advertising or marketing. If you click “Accept”, we store your language choice in your browser so the form opens in the same language next time. If you click “Deny”, the language you pick applies to this visit only and nothing is stored.",
    ],
  },
  {
    heading: "Our Commitment to Data Security",
    paragraphs: [
      "Sensitive information, including your personal details and submitted forms, is encrypted before it is stored. Access to it is limited to authorised GMC staff. No system is completely secure, but we take reasonable steps to protect your information from misuse, loss and unauthorised access.",
    ],
  },
  {
    heading: "How Long We Keep Your Information",
    paragraphs: [
      "We keep your information for as long as it is needed to manage your site access and to meet GMC's safety, security and legal record-keeping obligations.",
    ],
  },
  {
    heading: "Your Rights",
    paragraphs: [
      "GMC handles personal information in line with the Data Protection Act, 2012 (Act 843) of Ghana. You may ask to see the information we hold about you, to have it corrected, or to have it deleted where the law allows. To do so, contact the GMC Department Head who invited you, and we will verify your identity before acting on your request.",
    ],
  },
  {
    heading: "Changes to This Policy",
    paragraphs: [
      "We may update this policy from time to time. The version on this page is the current one.",
    ],
  },
];

export function PrivacyPolicyContent() {
  const { t } = useRegistrationLanguage();

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-foreground">
          {t("Our Commitment to Privacy")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "Your privacy is important to us. This policy explains how Ghana Manganese Company collects, uses and protects your personal information when you register for site access.",
          )}
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            {t(section.heading)}
          </h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="text-sm text-foreground">
              {t(paragraph)}
            </p>
          ))}
          {section.bullets ? (
            <ul className="list-disc space-y-1 pl-6 text-sm text-foreground">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{t(bullet)}</li>
              ))}
            </ul>
          ) : null}
          {section.closing ? (
            <p className="text-sm text-foreground">{t(section.closing)}</p>
          ) : null}
        </section>
      ))}
    </article>
  );
}
