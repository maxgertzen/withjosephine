/**
 * Safely seed FAQ items in Sanity.
 *
 * Uses createIfNotExists with stable IDs so:
 *   - Running this again is a no-op for anything already created
 *   - Edits made later in Studio are NEVER overwritten
 *   - It will NOT delete or touch any FAQ the script didn't create
 *
 * Run:
 *   set -a && source .env.local && set +a && pnpm tsx scripts/seed-faqs.ts
 */
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2025-01-01',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const FAQS = [
  {
    _id: 'faq-delivery',
    question: 'How will I receive my reading?',
    answer:
      'Every reading is delivered as a detailed voice note plus a supporting PDF, sent to the email you used at checkout. Nothing is live — you can listen back to your reading whenever you need to.',
    order: 10,
  },
  {
    _id: 'faq-turnaround',
    question: 'How long does it take?',
    answer:
      'Within 7 days of payment. If I\u2019m travelling or your booking lands in a particularly full week, I\u2019ll let you know by email — but the 7-day window is the rule, not the exception.',
    order: 20,
  },
  {
    _id: 'faq-what-i-need',
    question: 'What do you need from me after I book?',
    answer:
      'After payment you\u2019ll receive an intake form. For chart readings I need your full name, date of birth, and time and place of birth (as exact as you can). For Akashic readings I need a recent photo with your eyes open, and your three chosen questions. I\u2019ll send you a personalised question menu to help you choose.',
    order: 30,
  },
  {
    _id: 'faq-birth-time',
    question: 'What if I don\u2019t know my exact birth time?',
    answer:
      'Get as close as you can — ask a parent, or request your birth certificate from the country you were born in. A rough time still produces a useful reading; without one, certain parts of the chart (your rising sign, house placements) are less reliable. I\u2019ll work with whatever you have and tell you honestly what\u2019s certain and what isn\u2019t.',
    order: 40,
  },
  {
    _id: 'faq-which-reading',
    question: 'Which reading is right for me?',
    answer:
      'The Soul Blueprint is the fullest picture — birth chart, Akashic Records and card pulls woven together. Choose the Birth Chart Reading if you want to understand yourself through astrology alone. Choose the Akashic Record Reading if you have three specific questions and want direct answers from your soul\u2019s records. If you\u2019re not sure, write to me and I\u2019ll help you choose.',
    order: 50,
  },
  {
    _id: 'faq-refunds',
    question: 'Can I get a refund?',
    answer:
      'Yes, as long as you haven\u2019t submitted the intake form yet — request within 14 days of payment and you\u2019ll receive a full refund. Once you\u2019ve sent me your details the reading has effectively started, and at that point it\u2019s no longer refundable. Full details on the Refund Policy page.',
    order: 60,
  },
  {
    _id: 'faq-privacy',
    question: 'Is what I share kept private?',
    answer:
      'Always. Your details are used only to prepare and deliver your reading and are never sold or shared for marketing. The intake-form answers and photo are deleted within 30 days of delivery. Full details on the Privacy Policy page.',
    order: 70,
  },
  {
    _id: 'faq-not-advice',
    question: 'Is a reading a replacement for therapy or professional advice?',
    answer:
      'No. Readings are for personal insight and reflection. They\u2019re not medical, legal, financial or psychological advice — for anything in those areas, please speak to a qualified professional. Readings are for adults aged 18 and over.',
    order: 80,
  },
];

async function main() {
  // Double-check we\u2019re not stomping on anything we don\u2019t own.
  const existing = await client.fetch(
    '*[_type == "faqItem"]{ _id, question }'
  );
  console.log(`Existing faqItem docs on server: ${existing.length}`);
  for (const row of existing) console.log(`  - ${row._id}: ${row.question}`);

  let created = 0;
  let skipped = 0;
  for (const faq of FAQS) {
    const res = await client.createIfNotExists({
      _id: faq._id,
      _type: 'faqItem',
      question: faq.question,
      answer: faq.answer,
      order: faq.order,
    });
    // createIfNotExists returns the full doc either way; check _createdAt
    // against now to guess whether it actually created. Simplest: check if
    // the doc was in `existing`.
    const wasThere = existing.some((r) => r._id === faq._id);
    if (wasThere) {
      skipped += 1;
      console.log(`SKIP   ${faq._id} (already exists — left untouched)`);
    } else {
      created += 1;
      console.log(`CREATE ${faq._id}`);
    }
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
