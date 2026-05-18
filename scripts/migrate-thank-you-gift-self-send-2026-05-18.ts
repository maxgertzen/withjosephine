import { seedSingletonFields } from "./_lib/seedSingleton.mts";

seedSingletonFields({
  docType: "thankYouPage",
  logPrefix: "migrate-thank-you-gift-self-send",
  fields: {
    giftPurchaserSelfSendSubheading:
      "Your gift link is ready in the email I just sent — share it with them whenever feels right.",
    giftPurchaserSelfSendBody:
      "A confirmation is on its way to your inbox with the share link inside. Forward it to the recipient when you're ready — they'll claim from there.",
    giftPurchaserReadingLabel: "Your gift",
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
