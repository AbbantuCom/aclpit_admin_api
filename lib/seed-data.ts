import type {
  HeroContent,
  AboutContent,
  ServiceItem,
  PracticeArea,
  PublicationItem,
  DialogueItem,
  ContactContent,
  FooterContent,
} from '@/types';

export const defaultHero: HeroContent = {
  kicker: 'Independent. Africa Rooted. Public Interest First.',
  title: 'Where African law meets technology, we stand for the public interest.',
  titleHighlight: 'technology',
  description:
    "The African Centre for Law and Public Interest Technology researches, litigates, advises and convenes on the legal and regulatory dimensions of technology, so that Africa's digital transformation is grounded in the rule of law, respects fundamental rights and serves every community.",
  primaryCtaText: 'Work With Us',
  primaryCtaHref: '#contact',
  secondaryCtaText: 'Explore Our Focus',
  secondaryCtaHref: '/practice-areas',
  image:
    'https://images.pexels.com/photos/1367272/pexels-photo-1367272.jpeg',
  visionLabel: 'Our Vision',
  visionText:
    'An Africa where law and technology work together to advance justice, protect rights and drive inclusive development for all.',
};

export const defaultAbout: AboutContent = {
  eyebrow: 'About the Centre',
  title: 'An institution built for a defining challenge of this decade',
  paragraph1:
    "Africa's rapid digitalisation is reshaping economies and societies faster than the legal frameworks meant to govern them. ACLPIT was conceived to close that gap: an independent, Africa rooted centre that combines rigorous legal expertise with a genuine understanding of technology.",
  paragraph2:
    'We bridge the divide between policymakers, technologists, regulators and the communities affected by digital transformation, so that law becomes a tool not only for managing risk but for enabling responsible innovation and protecting fundamental rights, particularly for underserved and vulnerable communities.',
  image: 'https://images.pexels.com/photos/1181435/pexels-photo-1181435.jpeg',

  backgroundEyebrow: 'Background and Rationale',
  backgroundTitle: 'Born from a gap, built for an opportunity',
  backgroundParagraph1:
    'Mobile money, digital identity systems, artificial intelligence, blockchain and e governance platforms are reshaping African economies and societies at a pace that has outstripped the legal and regulatory frameworks meant to govern them.',
  backgroundParagraph2:
    'That gap creates real risks: unresolved data protection questions, weak consumer and digital rights protections, uneven access to justice, and regulation that struggles to keep pace with innovation. But it also presents an opportunity. Law can be a tool not only for managing risk, but for enabling responsible innovation, protecting the public interest and ensuring the benefits of technology are equitably distributed.',
  backgroundParagraph3:
    'Realising that opportunity requires an institution that combines rigorous legal expertise with a genuine understanding of technology. The African Centre for Law and Public Interest Technology is conceived as that institution.',
  backgroundImage:
    'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1000',

  visionText:
    'An Africa where law and technology work together to advance justice, protect rights and drive inclusive development for all.',
  missionText:
    'To research, litigate, advise and convene on the legal and regulatory dimensions of technology in Africa, so that digital transformation is grounded in the rule of law, respects fundamental rights and serves the public interest, particularly for underserved and vulnerable communities.',

  objectives: [
    {
      icon: 'bi-search',
      title: 'Independent research',
      description:
        'High quality research on the legal, regulatory and ethical dimensions of emerging technologies, with a specific focus on African contexts and challenges.',
    },
    {
      icon: 'bi-clipboard-check',
      title: 'Sound policy advice',
      description:
        'Advising governments, regulators and public institutions on frameworks that keep pace with technological change while safeguarding rights.',
    },
    {
      icon: 'bi-bank',
      title: 'Access to justice',
      description:
        'Promoting responsible legal technology, digital justice initiatives and innovations that reduce cost and delay in African justice systems.',
    },
    {
      icon: 'bi-shield-check',
      title: 'Digital rights protection',
      description:
        'Protecting privacy, data protection, freedom of expression and consumer rights through legal analysis, advocacy and, where appropriate, public interest litigation.',
    },
    {
      icon: 'bi-mortarboard',
      title: 'Capacity building',
      description:
        'Training lawyers, judges, regulators, technologists and policymakers on the intersection of law and technology.',
    },
    {
      icon: 'bi-people',
      title: 'Multi stakeholder dialogue',
      description:
        'Convening government, industry, civil society and academia to foster shared understanding and coordinated solutions.',
    },
    {
      icon: 'bi-lightbulb',
      title: 'Responsible innovation',
      description:
        'Working with technology developers and businesses to embed legal and ethical compliance into the design and deployment of new technologies.',
    },
  ],

  governanceEyebrow: 'Governance',
  governanceTitle: 'Independent by design',
  governanceParagraph1:
    'ACLPIT is an independent, non partisan institution governed by a board drawn from law, technology, academia and civil society, with a small core secretariat led by an Executive Director.',
  governanceParagraph2:
    'The Centre maintains independence from government and commercial interests to preserve the credibility of its research and advocacy, while actively partnering with governments, regulators, technology companies and civil society to achieve shared goals.',
  governanceValues: ['Independent', 'Non Partisan', 'Africa Rooted', 'Rights Centred'],
  governanceImage:
    'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1000',

  stakeholders: [
    {
      icon: 'bi-building',
      title: 'Governments and regulators',
      description: 'Seeking sound, implementable legal and policy frameworks for emerging technologies.',
    },
    {
      icon: 'bi-bank2',
      title: 'Judiciaries and justice institutions',
      description: 'Modernising service delivery and improving access to justice.',
    },
    {
      icon: 'bi-rocket-takeoff',
      title: 'Technology companies and innovators',
      description: 'Seeking legal clarity and support for responsible product development.',
    },
    {
      icon: 'bi-heart',
      title: 'Civil society and communities',
      description: 'Whose rights are affected by digital transformation.',
    },
    {
      icon: 'bi-journal-bookmark',
      title: 'Practitioners, academics and students',
      description: 'Working at the intersection of law and technology.',
    },
  ],
};

export const defaultServices: ServiceItem[] = [
  {
    id: 'svc-research',
    anchor: 'research',
    icon: 'bi-journal-text',
    title: 'Research and Publications',
    description:
      'Independent, high quality research on the legal, regulatory and ethical dimensions of emerging technologies, from artificial intelligence and blockchain to digital identity, data protection and fintech.',
    bullets: [
      'Research reports, policy briefs and commentary',
      'Evidence built for African contexts and challenges',
      'Analysis that policymakers can act on',
    ],
    image: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1000',
    imageAlt: 'Library shelves filled with legal texts',
    order: 1,
  },
  {
    id: 'svc-advisory',
    anchor: 'advisory',
    icon: 'bi-clipboard-check',
    title: 'Technical Advisory',
    description:
      'Trusted advice to governments, regulators and public institutions on developing and strengthening legal and policy frameworks that keep pace with technological change while safeguarding rights.',
    bullets: [
      'Legislative and regulatory drafting support',
      'Institutional strengthening for regulators',
      'Implementation guidance for new frameworks',
    ],
    image: 'https://images.pexels.com/photos/3183183/pexels-photo-3183183.jpeg?auto=compress&cs=tinysrgb&w=1000',
    imageAlt: 'Advisors in discussion with public officials',
    order: 2,
  },
  {
    id: 'svc-training',
    anchor: 'training',
    icon: 'bi-mortarboard',
    title: 'Training and Capacity Building',
    description:
      'Programmes that equip lawyers, judges, regulators, technologists and policymakers to work confidently at the intersection of law and technology.',
    bullets: [
      'Judicial and regulatory training programmes',
      'Professional development for legal practitioners',
      'Knowledge sharing platforms and dialogue',
    ],
    image: 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1000',
    imageAlt: 'Professional presenting during a training session',
    order: 3,
  },
  {
    id: 'svc-convening',
    anchor: 'convening',
    icon: 'bi-people',
    title: 'Convenings and Dialogues',
    description:
      'Multi stakeholder platforms where government, industry, civil society and academia meet to address emerging legal and policy questions in technology.',
    bullets: [
      'Policy roundtables and expert convenings',
      'Cross sector dialogue on emerging questions',
      'Coordinated solutions built on shared understanding',
    ],
    image: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1000',
    imageAlt: 'Diverse group of professionals in dialogue',
    order: 4,
  },
  {
    id: 'svc-litigation',
    anchor: 'litigation',
    icon: 'bi-megaphone',
    title: 'Public Interest Litigation and Advocacy',
    description:
      'Where rights are at stake, the Centre pursues accountability through the courts, backed by rigorous legal analysis and principled advocacy.',
    bullets: [
      'Strategic public interest litigation',
      'Legal analysis and amicus support',
      'Advocacy for digital rights protection',
    ],
    image: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1000',
    imageAlt: 'Legal team preparing case materials together',
    order: 5,
  },
];

export const defaultPracticeAreas: PracticeArea[] = [
  {
    id: 'pa-data',
    anchor: 'data',
    icon: 'bi-shield-lock',
    title: 'Data Protection and Privacy',
    description:
      'Supporting the development and enforcement of data protection laws across the continent, and advising public and private actors on responsible data governance.',
    bullets: [
      'Data protection law development and enforcement support',
      'Responsible data governance frameworks',
      'Privacy impact assessment and compliance guidance',
    ],
    order: 1,
  },
  {
    id: 'pa-ai',
    anchor: 'ai',
    icon: 'bi-cpu',
    title: 'Artificial Intelligence and Algorithmic Accountability',
    description:
      'Examining the legal and ethical implications of AI deployment in both public and private sectors, so that algorithmic systems remain accountable to the people they affect.',
    bullets: [
      'Legal and ethical analysis of AI systems',
      'Algorithmic accountability in public sector deployment',
      'AI governance frameworks for African contexts',
    ],
    order: 2,
  },
  {
    id: 'pa-justice',
    anchor: 'justice',
    icon: 'bi-bank',
    title: 'Digital Justice and Legal Technology',
    description:
      'Advancing the use of technology to improve access to justice, court efficiency and legal service delivery across African justice systems.',
    bullets: [
      'Digital justice initiatives and court modernisation',
      'Legal technology that reduces cost and delay',
      'Responsible innovation in legal service delivery',
    ],
    order: 3,
  },
  {
    id: 'pa-fintech',
    anchor: 'fintech',
    icon: 'bi-phone',
    title: 'Fintech, Digital Finance and Consumer Protection',
    description:
      'Supporting sound regulation of mobile money, digital lending and other financial technologies that millions of Africans rely on every day.',
    bullets: [
      'Mobile money and digital finance regulation',
      'Digital lending oversight and fair practice',
      'Consumer protection in financial technology',
    ],
    order: 4,
  },
  {
    id: 'pa-blockchain',
    anchor: 'blockchain',
    icon: 'bi-diagram-3',
    title: 'Blockchain and Public Registries',
    description:
      'Exploring the application of blockchain and distributed ledger technology to land administration, business registration and other public records.',
    bullets: [
      'Distributed ledger applications for land administration',
      'Business registration and public record systems',
      'Legal frameworks for blockchain adoption',
    ],
    order: 5,
  },
  {
    id: 'pa-rights',
    anchor: 'rights',
    icon: 'bi-globe-europe-africa',
    title: 'Digital Rights and Internet Governance',
    description:
      'Protecting freedom of expression, association and access to information in digital spaces, and shaping internet governance that serves the public.',
    bullets: [
      'Freedom of expression and association online',
      'Access to information in digital spaces',
      'Public interest participation in internet governance',
    ],
    order: 6,
  },
];

export const defaultPublications: PublicationItem[] = [
  {
    id: 'pub-borderless-identity',
    title: 'Borderless Identity',
    description:
      'This document examines the AfCFTA Digital Trade Protocol, focusing on implementation gaps in cross-border digital identity systems. It highlights challenges regarding mutual recognition, technical standardization, and KYC baselines, recommending mandatory continental assurance standards, trusted identity list criteria, and unified security incident management response frameworks.',
    category: 'Policy Brief',
    fileUrl: 'https://drive.google.com/file/d/1IdFuBI1SRZb353gPZqOJB_tWNexyC11c/view',
    coverImage: 'https://drive.google.com/thumbnail?id=1IdFuBI1SRZb353gPZqOJB_tWNexyC11c&sz=w800',
    date: '',
    order: 1,
  },
  {
    id: 'pub-e-discovery',
    title: 'E-Discovery and Litigation',
    description:
      'This overview explores electronic discovery and evidence in litigation, explaining electronically stored information, admissibility, and judicial reliability factors. It outlines the seven-stage EDRM framework, addresses data protection balancing under Ugandan law, and emphasizes proportional application to prevent disproportionate financial burdens on smaller individual court litigants.',
    category: 'Research Note',
    fileUrl: 'https://drive.google.com/file/d/1G0d0dGr_KJR81e9esAwN46S3sedbsGse/view',
    coverImage: 'https://drive.google.com/thumbnail?id=1G0d0dGr_KJR81e9esAwN46S3sedbsGse&sz=w800',
    date: '',
    order: 2,
  },
  {
    id: 'pub-ip-financial-innovators',
    title: 'Intellectual Property Protection for Financial Innovators',
    description:
      "Analyzing Kenya's landmark copyright judgment against Safaricom, this article discusses intellectual property protection for African fintech innovators. It outlines core IP categories, demonstrates how copyright protects specific product expressions rather than raw ideas, and urges Ugandan founders to thoroughly document and legalise software innovations early.",
    category: 'Case Analysis',
    fileUrl: 'https://drive.google.com/file/d/1LJa9TnOPMjBNVwkjAYZLJ47k4pp9m1Oe/view',
    coverImage: 'https://drive.google.com/thumbnail?id=1LJa9TnOPMjBNVwkjAYZLJ47k4pp9m1Oe&sz=w800',
    date: '',
    order: 3,
  },
];

export const defaultDialogues: DialogueItem[] = [
  {
    id: 'dlg-unit-trusts',
    youtubeUrl: 'https://www.youtube.com/watch?v=NZZkLlvyX1A',
    title: 'Rethinking Unit Trusts, T-Bills & Bonds',
    description:
      "Hosted by Tony Kira Galandi on Legal Tech Dialogues, this video explores Uganda's capital markets. Featuring legal expert Luis Kisto, it demystifies unit trusts, treasury bills, and government bonds, encouraging lawyers and bankers to move beyond traditional loan disputes toward modern financial market investment opportunities.",
    category: 'Legal Tech',
    order: 1,
  },
  {
    id: 'dlg-courts-cybersecurity',
    youtubeUrl: 'https://www.youtube.com/watch?v=iOCYecdRklY',
    title: 'Courts, Counsel & Cybersecurity: Navigating the Paperless Frontier',
    description:
      "A conversation on the intersection of courts, legal counsel and cybersecurity as Uganda's justice sector transitions toward paperless systems.",
    category: 'Legal Tech',
    order: 2,
  },
  {
    id: 'dlg-mental-health-ai',
    youtubeUrl: 'https://www.youtube.com/watch?v=3XE7fpZ5RUk',
    title: 'Mental Health in the Age of Legal AI: Opportunities, Ethics and Safeguards',
    description:
      'Exploring the opportunities, ethical questions and safeguards raised by artificial intelligence for mental health and wellbeing in the legal profession.',
    category: 'Legal Tech',
    order: 3,
  },
  {
    id: 'dlg-digital-justice-uganda',
    youtubeUrl: 'https://www.youtube.com/watch?v=J8pOvS33LZw',
    title: 'Digital Justice in Uganda: AI & ICT Opportunities, Barriers, and Policies',
    description:
      "A discussion on the opportunities, barriers and policy questions shaping AI and ICT adoption within Uganda's justice sector.",
    category: 'Legal Tech',
    order: 4,
  },
  {
    id: 'dlg-digital-justice-constitutionalism',
    youtubeUrl: 'https://www.youtube.com/watch?v=dy_bb3UsRLg',
    title: 'Digital Justice and Constitutionalism in the Contemporary Era',
    description: 'Examining how digital justice initiatives intersect with constitutionalism in the contemporary era.',
    category: 'Legal Tech',
    order: 5,
  },
  {
    id: 'dlg-digital-revolution-left-behind',
    youtubeUrl: 'https://www.youtube.com/watch?v=zlCjAkwA92k',
    title: "Who Is Being Left Behind in Uganda's Digital Revolution? | Simon Kaggwa Njala",
    description: "Simon Kaggwa Njala joins Legal Tech Dialogues to discuss who is being left behind in Uganda's digital revolution.",
    category: 'Legal Tech',
    order: 6,
  },
  {
    id: 'dlg-competition-law-fintech',
    youtubeUrl: 'https://www.youtube.com/watch?v=6wlrKHCiEmI',
    title: 'Competition Law Compliance Training for Fintech Service Providers in Uganda',
    description: 'A capacity building training session on competition law compliance for fintech service providers in Uganda.',
    category: 'Capacity Building Initiatives',
    order: 7,
  },
];

export const defaultContact: ContactContent = {
  title: "Let us shape Africa's digital future together",
  subtitle: 'Contact Us',
  description:
    'Whether you are a government, regulator, technology company, civil society organisation or researcher, we would like to hear from you.',
  email: 'info@aclpit.org',
  phone: '+256 414 671 838',
  address: 'Plot 1 Lourdel Road, Lourdel Towers, 5th Floor',
  postalAddress: 'P.O. BOX 133174 Kampala–Uganda',
  officeHours: 'Monday to Friday, 8:30 am to 5:30 pm EAT',
  mapEmbedUrl: 'https://maps.google.com/maps?q=Plot%201%20Lourdel%20Road%2C%20Kampala%2C%20Uganda&z=15&output=embed',
  socials: {
    linkedin: 'https://www.linkedin.com/company/african-centre-for-law-and-public-interest-technology/about/',
    twitter: '',
    youtube: 'https://www.youtube.com/@LegalTechDialogues',
    facebook: '',
  },
  topics: [
    'General Enquiry',
    'Research and Publications',
    'Technical Advisory',
    'Training and Capacity Building',
    'Convenings and Dialogues',
    'Public Interest Litigation',
    'Partnerships and Media',
  ],
};

export const defaultFooter: FooterContent = {
  description:
    'An independent, Africa rooted centre shaping the legal, regulatory and policy environment for technology in the public interest.',
  copyrightName: 'African Centre for Law and Public Interest Technology',
};
