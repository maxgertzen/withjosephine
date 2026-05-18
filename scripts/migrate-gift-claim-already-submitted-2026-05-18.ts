import { seedSingletonFields } from "./_lib/seedSingleton.mts";

seedSingletonFields({
  docType: "giftClaimPage",
  logPrefix: "migrate-gift-claim-already-submitted",
  fields: {
    alreadySubmittedHeading: "We have your answers — thank you.",
    alreadySubmittedBody:
      "Your reading is in my hands now. If something in what you sent needs a correction, just write to me at hello@withjosephine.com and I'll take care of it.",
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
