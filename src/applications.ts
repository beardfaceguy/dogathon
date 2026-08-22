import { ORG } from "./dogs.js";

/** Fake adoption applications, shared by the seeder and the "Send demo email"
 *  button so there is exactly one copy of this text. */

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/** Applicants already mid-pipeline, so the Sheet isn't empty on a projector. */
export const EXISTING_ROWS = [
  ["Rosalind Ferreira", "r.ferreira.sf@example.com", "(415) 555-0182", "Olive", daysAgo(9), "Meet & greet done", "Dana", daysAgo(2)],
  ["Kwame Boateng", "kboateng.home@example.com", "(510) 555-0147", "Waffles", daysAgo(6), "Reference check", "Ivy", ""],
  ["Sofia Mendelsohn-Park", "sofia.mp@example.com", "(628) 555-0119", "Juniper", daysAgo(4), "Scheduled", "Dana", daysAgo(-1)],
  ["Terrence Whitlock", "twhitlock42@example.com", "(415) 555-0164", "Marigold", daysAgo(2), "New", "", ""],
];

export type DemoApplication = { name: string; dog: string; body: string };

/** Varied on purpose: fenced yard with kids, apartment, first-timer, existing
 *  dog, and one uselessly vague. The agent has to cope with all five. */
export const DEMO_APPLICATIONS: DemoApplication[] = [
  {
    name: "Priya Raghunathan",
    dog: "Biscuit",
    body: `Applicant: Priya Raghunathan
Email: priya.raghunathan@example.com
Phone: (415) 555-0198
Dog of interest: Biscuit

Housing: Single-family home in Bernal Heights, fully fenced back yard (6ft).
Household: Me, my husband, and two kids aged 7 and 10.
Other pets: None currently.
Experience: We had a beagle growing up, so we know about the nose.

Why this dog: My daughter saw Biscuit's tennis ball video about forty times.
We walk every morning and we have the yard for it. We are around all weekend
and can do a meet-and-greet any afternoon.`,
  },
  {
    name: "Devon Okafor",
    dog: "Tofu",
    body: `Applicant: Devon Okafor
Email: devon.okafor@example.com
Phone: (510) 555-0173
Dog of interest: Tofu

Housing: Two-bedroom apartment in Oakland, 4th floor, no yard. Building allows
dogs under 25lbs and I have written landlord approval already.
Household: Just me. I work from home three days a week.
Other pets: None.
Experience: Grew up with dogs, first time adopting on my own.

Why this dog: Tofu being small and loud is honestly the pitch. There is a dog
park two blocks away and I am home most of the day.`,
  },
  {
    name: "Hannah Lindqvist",
    dog: "Waffles",
    body: `Applicant: Hannah Lindqvist
Email: hannah.lindqvist@example.com
Phone: (628) 555-0155
Dog of interest: Waffles

Housing: Rented house in the Sunset with a small unfenced yard.
Household: Me and one roommate, both on board.
Other pets: None.
Experience: This would be my first dog. I want to be upfront about that.

Why this dog: Everything I have read says a young lab mix is a lot of work and
I would rather hear that from you now than find out later. I have signed up for
a training class starting next month either way. Happy to be told I am not
ready for Waffles specifically and pointed at a better fit.`,
  },
  {
    name: "Marcus Delacroix-Reyes",
    dog: "Juniper",
    body: `Applicant: Marcus Delacroix-Reyes
Email: m.delacroix.reyes@example.com
Phone: (415) 555-0121
Dog of interest: Juniper

Housing: House in Glen Park, fenced yard, and 40 acres at my parents' place in
Sonoma that we get to most weekends.
Household: Me and my partner, no kids.
Other pets: Ada, a 6-year-old spayed Australian shepherd. Good with other dogs,
a bit bossy about toys for the first ten minutes.
Experience: Third herding dog. I know what a border collie without a job does
to a house.

Why this dog: Juniper needs work and I have sheep-adjacent chaos to offer.
Would want to do a slow intro with Ada on neutral ground first.`,
  },
  {
    name: "T. Nakamura",
    dog: "Marigold",
    body: `hi is marigold still available? i saw her on instagram. i love pitties

thanks`,
  },
];

export const subjectFor = (app: DemoApplication) =>
  `New adoption application: ${app.dog} — ${app.name}`;

/** Form spam. The application form is public, so junk arrives through it with
 *  the same subject line as a real application — which is exactly why the agent
 *  has to judge rather than just execute. */
export const SPAM_APPLICATIONS: DemoApplication[] = [
  {
    name: "Digital Growth Partners",
    dog: "Biscuit",
    body: `Applicant: Marketing Team
Email: outreach@digitalgrowthpartners.example
Phone: n/a
Dog of interest: n/a

Hello Webmaster,

I was looking at your website and noticed your site is NOT RANKING for
"dog adoption near me". This is costing you adoptions every single day.

We offer: guaranteed page 1 placement, 500+ backlinks/mo, AI content at scale.
Special rate for non-profits this week only. Reply "INFO" for our deck.

Unsubscribe by ignoring this message.`,
  },
  {
    name: "(blank submission)",
    dog: "Marigold",
    body: `asdf

test test

aaaaaaaa`,
  },
];

/** A submission from the public form at /apply.
 *
 *  Rendered into the same shape as the canned applications above, because the
 *  agent must not be able to tell the difference — that's the whole claim being
 *  demonstrated. The form is neutral; whether this is an application or junk is
 *  decided downstream by reading it.
 *
 *  Every single-line field is stripped of CR/LF before it reaches a subject
 *  line, and everything is length-capped: the form is "public", so treat it
 *  like it is. */
export type FormSubmission = Record<string, unknown>;

const line = (v: unknown, max = 200) =>
  String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

const block = (v: unknown, max = 4000) =>
  String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);

export function formToEmail(f: FormSubmission): { subject: string; body: string } {
  const name = line(f.name, 120) || "(no name given)";
  const dog = line(f.dog, 60) || "unspecified";

  const body = `A new application was submitted through the ${ORG} website.

Applicant: ${name}
Email: ${line(f.email, 160) || "(none)"}
Phone: ${line(f.phone, 60) || "(none)"}
Dog of interest: ${dog}

Housing: ${line(f.home, 120) || "(not answered)"}
Outdoor space: ${line(f.yard, 120) || "(not answered)"}
Others at home: ${line(f.household, 300) || "(not answered)"}

In their own words:
${block(f.message) || "(left blank)"}

--
Sent automatically by the adoption application form.`;

  return { subject: `New adoption application: ${dog} — ${name}`, body };
}
