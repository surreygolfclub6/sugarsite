import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, SITE_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Safety" };

export default function SafetyPage() {
  return (
    <>
      <h1>Staying safe</h1>
      <p>
        Most people on {SITE_NAME} are who they say they are, but not everyone is. These tips help you enjoy meeting
        people while keeping yourself safe.
      </p>

      <h2>Age checks and the badge</h2>
      <ul>
        <li>
          Every new member has to pass an age check, run by AgeVerif, before their profile goes live. Members who pass
          show an <strong>Age verified</strong> badge.
        </li>
        <li>
          The badge means a check confirmed the person is an adult. It does <strong>not</strong> confirm who they are
          or that what they tell you is true, so keep taking the usual care.
        </li>
        <li>Members who joined before age checks were introduced may not have the badge yet.</li>
      </ul>

      <h2>Before you meet</h2>
      <ul>
        <li>Take your time. Chat on {SITE_NAME} for a while before sharing your number or social media.</li>
        <li>Be careful with personal details such as your home or work address, financial information and your full name.</li>
        <li>Check that their photos and what they say add up. A video call before you meet can help.</li>
      </ul>

      <h2>When you meet</h2>
      <ul>
        <li>Meet somewhere public, and stay in public for the first few dates.</li>
        <li>Tell a friend or family member who you’re meeting, where, and when you’ll be home.</li>
        <li>Make your own way there and back, and keep control of your drinks.</li>
        <li>Trust your instincts. You can leave at any time, for any reason.</li>
      </ul>

      <h2>Watch out for scams</h2>
      <ul>
        <li>Never send money, gift cards or bank details to someone you haven’t met, whatever the story.</li>
        <li>Be suspicious if someone declares strong feelings very quickly, or quickly asks to move off {SITE_NAME}.</li>
        <li>Be wary of anyone who won’t video call, or whose photos look too perfect.</li>
        <li>Anyone offering or asking for sexual services for payment breaks our rules. Report them.</li>
      </ul>

      <h2>Blocking and reporting</h2>
      <ul>
        <li>
          On any profile or conversation, tap the three dots to <strong>block</strong> or <strong>report</strong>. Blocking is
          silent: they aren’t told, and you won’t see each other or be able to message. You can undo it under More,
          Blocked members.
        </li>
        <li>
          Reports go to our moderators. If you report from a conversation, moderators can read that conversation. We
          don’t tell the person you reported who reported them.
        </li>
        <li>
          Tell us straight away if someone seems to be under 18. Choose “Appears to be under 18” when you report, and
          we’ll look at it first.
        </li>
      </ul>

      <h2>If you’re in danger</h2>
      <p>
        If you or someone else is in immediate danger, call <strong>999</strong>. For non-urgent police matters in
        England, Wales and Scotland, call <strong>101</strong>. If you’ve been the victim of fraud, report it to Action
        Fraud (or its successor, Report Fraud). If intimate images of you have been shared without your consent, the
        Revenge Porn Helpline can help. Please check these organisations’ websites for current contact details.
      </p>

      <h2>Talk to us</h2>
      <p>
        Questions about safety on {SITE_NAME}: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. See also our <Link href="/terms">Terms</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </>
  );
}
