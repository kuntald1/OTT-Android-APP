// Nothing is sold inside the app.
//
// Google Play requires its own billing system for anything bought and
// then used inside the app — a subscription, or a ticket to a show that
// streams in the app. theomy takes payment through Razorpay, which Play
// does not allow for those, so the app shows what is on offer and
// people buy on the website instead.
//
// These are plain sentences on purpose: no button, no link, nothing
// that opens a browser. Sending someone from the app to an outside
// payment page is its own category under the policy, and naming the
// website without linking to it is the most conservative reading.
//
// Tickets to a show people physically attend are different — those are
// a real-world service and may be sold in the app with Razorpay.
export const WEB_PURCHASE_NOTICE =
  "Plans are purchased on theomy.com. Open theomy.com in your browser to subscribe or change your plan — this app picks it up automatically once you do.";

export const WEB_TICKET_NOTICE =
  "Tickets for this show are sold on theomy.com. Open theomy.com in your browser to buy one — the show unlocks here automatically once you do.";

export const WEB_PURCHASE_NOTICE_VIDEO =
  "This title is sold on theomy.com. Open theomy.com in your browser to buy it — it unlocks here automatically once you do.";
