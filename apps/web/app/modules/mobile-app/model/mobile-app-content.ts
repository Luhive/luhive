/**
 * Indexable copy for /app. One source for the visible section and the JSON-LD, so the
 * structured data always matches what people (and crawlers) read on the page.
 */

export const FEATURES = [
  {
    key: "notifications",
    title: "Personalized notifications",
    body: "Get told about the events that fit you, based on the events you have been to before and the interests you have, with a reminder before they start.",
  },
  {
    key: "tickets",
    title: "QR tickets",
    body: "Your ticket lives in the app. Show the QR code at the door and you are checked in, no email search, no screenshots.",
  },
  {
    key: "discover",
    title: "Discover new events",
    body: "See what is on across the communities on Luhive in one place, and find the meetups, workshops and talks worth your evening.",
  },
] as const;

export const FAQ = [
  {
    question: "When will the Luhive app be available?",
    answer:
      "We are building it now and do not have a date yet. Join the waitlist and you will hear first, with a short progress update every week along the way.",
  },
  {
    question: "Which phones will the Luhive app work on?",
    answer: "iPhone (iOS) and Android.",
  },
  {
    question: "Do I need a Luhive account to join the waitlist?",
    answer:
      "No. An email address is enough. If you already have a Luhive account, sign in and your account email is filled in for you.",
  },
  {
    question: "How often will you email me?",
    answer:
      "About once a week, with what we built and what is coming next. Every email has an unsubscribe link.",
  },
  {
    question: "Can I add a friend to the waitlist?",
    answer:
      "Yes. After you join, choose \"Add another email\" and enter their address. They get their own welcome email.",
  },
] as const;
