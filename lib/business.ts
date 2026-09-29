export type Language = "fr" | "en";
export const business = {
  name: "Bill Badran",
  domain: "https://www.billbadran.com",
  phone: "514 357-2666",
  tel: "+15143572666",
  email: "contact@billbadran.com",
  address: {
    fr: "4150, boul. Saint-Martin Ouest, bureau 204, Laval, Québec H7T 1C1",
    en: "4150 Saint-Martin Blvd West, Suite 204, Laval, Quebec H7T 1C1",
  },
  experienceYears: 15,
  portrait: "/assets/bill-portrait.jpg",
  bookingUrl: "https://calendly.com/bbadran",
  bookingVerified: true,
  socials: {
    LinkedIn:
      "https://www.linkedin.com/in/bill-badran-pl-fin-cim%C2%AE-b6305b72/",
    Facebook: "https://www.facebook.com/profile.php?id=100092753622484",
    Instagram: "https://www.instagram.com/billbadranfp/",
  },
  suppliedCredentials: [
    "Pl.Fin.",
    "CIM",
    "B.A.A.",
    "Représentant en épargne collective",
  ],
  approvals: {
    businessDetails: false,
    serviceScope: false,
    qualificationsAndAffiliation: false,
    portraitRights: false,
    websiteCopy: false,
    privacyPolicy: false,
    legalNotices: false,
    contactOperations: false,
  },
  /**
   * The small printed guide, « Avant la retraite » / "Before You Retire".
   * Its chapters are the Ask Bill questions (lib/ask.ts), so it can always
   * be read on the site. A PDF appears only once the file is in public/ and
   * approved; the offer of a printed copy only once copies exist.
   */
  guide: {
    pdf: {
      fr: null as null | { path: string; approved: boolean },
      en: null as null | { path: string; approved: boolean },
    },
    printedCopies: false,
  },
  testimonials: [] as { quote: string; name: string; approved: boolean }[],
  newsletterEnabled: false,
  analyticsEnabled: false,
} as const;
export function launchApproved() {
  return (
    process.env.PUBLIC_LAUNCH === "true" &&
    Object.values(business.approvals).every(Boolean)
  );
}
export function localReview() {
  return (
    !process.env.VERCEL &&
    (process.env.NODE_ENV === "development" ||
      process.env.LOCAL_REVIEW === "true")
  );
}
export function reviewEnabled() {
  return (
    localReview() ||
    (process.env.REVIEW_ENABLED === "true" &&
      !!process.env.REVIEW_USER &&
      !!process.env.REVIEW_PASSWORD)
  );
}
