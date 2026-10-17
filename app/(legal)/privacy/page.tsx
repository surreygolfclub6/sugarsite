import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, SITE_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p>
        {COMPANY.name} (“we”, “us”) runs {SITE_NAME} and is the controller of your personal data. This policy explains
        what we collect, why, who sees it and what your rights are. Contact us about your data at{" "}
        <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your email address and password (stored securely by our sign-in provider; we never see it).</li>
        <li>
          <strong>Profile:</strong> first name or nickname, date of birth, gender, who you’d like to meet, your town or
          city, relationship status and goals, height, body type, hair colour, ethnicity, and the headline and text you write.
        </li>
        <li>
          <strong>Photos:</strong> the photos you upload. We re-encode them in your browser, which removes hidden data
          such as GPS location, before they leave your device.
        </li>
        <li>
          <strong>Age check:</strong> the result of your age check with AgeVerif: that you passed, the age threshold and
          assurance level it reached, your country, a reference for the check, and when it was done and when it expires.
          We do not receive or keep your face image or identity documents.
        </li>
        <li>
          <strong>Invites:</strong> a personal invite code for each member. If you join through someone’s link, we record who
          invited you so they can be credited. They see only counts, never who joined; our moderators can see who invited whom.
        </li>
        <li><strong>Activity:</strong> your likes, the people you block, reports you make, your messages, and when you were last active.</li>
        <li>
          <strong>Technical:</strong> basic information needed to run and secure the service, such as your IP address
          and device details in server logs.
        </li>
      </ul>

      <h2>Sensitive information</h2>
      <p>
        Some of what you tell us is “special category” data under UK data protection law: your gender together with who
        you’d like to meet (which can reveal your sexual orientation), your relationship goals (which can relate to your
        sex life), and your ethnicity. We only use this because you give your explicit consent when you sign up, and it
        is essential to a dating service.
      </p>
      <ul>
        <li>It is shown on your profile to other members, and other members can use some of it to search.</li>
        <li>
          Ethnicity is optional in the sense that you can choose “Prefer not to say”. You can change any of it at any
          time under More, Edit profile.
        </li>
        <li>
          You can withdraw your consent by deleting your account. If you withdraw consent we can’t keep providing a
          profile that depends on this information.
        </li>
      </ul>

      <h2>Where you are</h2>
      <p>
        We store the town or city you choose, not your precise location, and we don’t track your device’s location.
        Other members see your town and a distance rounded up to the nearest 5 miles, never an exact position.
      </p>

      <h2>Why we use it, and our legal basis</h2>
      <ul>
        <li>To provide the service you asked for: creating your profile, showing you to and finding other members, and messaging (contract).</li>
        <li>To keep members safe: reviewing photos, handling reports and preventing fraud (our legitimate interests, and legal duties).</li>
        <li>To check that members are adults, and keep under-18s off the service, using an age check (our legal obligations under the Online Safety Act, and our legitimate interests).</li>
        <li>
          To set your level and limits: we count whether you have an approved photo and a complete profile, how many people
          you have had conversations with, whether you answer people who write to you first, and how many people you invited
          have become real members. This uses counts, not the content of your messages (our legitimate interests in keeping the
          community genuine). We also record likes so we can show you your matches.
        </li>
        <li>To meet legal obligations, and to deal with legal claims (legal obligation, legitimate interests).</li>
        <li>For special category data, your explicit consent.</li>
      </ul>
      <p>We don’t use your data for advertising and we don’t sell it. We don’t make automated decisions that have legal or similarly significant effects on you.</p>

      <h2>Who sees your data</h2>
      <ul>
        <li>
          <strong>Other members</strong> see your profile and photos once photos are approved, and an “Age verified”
          badge if you passed the age check. Your messages are visible only to you and the person you’re writing to.
        </li>
        <li>
          <strong>Our moderators</strong> see photos before they’re approved, and may read the conversation attached to a
          report when you or someone else reports it.
        </li>
        <li>
          <strong>Our service providers</strong> process data for us under contract: our database, authentication and
          file storage provider (Supabase, with data held in the EU), and our hosting and email providers
          ([hosting provider] and [email provider]).
        </li>
        <li>
          <strong>AgeVerif</strong>, our age-checking provider. When you choose to verify your age you are sent to
          AgeVerif, which carries out the check (for example by estimating your age from a photo or checking a document)
          under its own privacy notice, and tells us the result. We don’t see or keep the image or document.
          [Solicitor to confirm whether AgeVerif acts as our processor or as an independent controller for the check, and
          whether facial age estimation involves special category (biometric) data.]
        </li>
        <li>
          <strong>Authorities</strong>, where the law requires it or to protect someone from serious harm.
        </li>
      </ul>
      <p>[International transfers: describe any transfers outside the UK and EEA and the safeguards used, once providers are confirmed.]</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while you have an account, including the result of your age check. When you delete your account
        we delete your profile, photos, messages, likes, blocks and age-check result straight away, along with any reports
        you made or that were made about you. How long AgeVerif keeps data is set out in its own privacy notice. Backups
        and logs are removed on a rolling basis. [A solicitor may advise keeping reports for a limited period for safety
        and legal reasons.]
      </p>

      <h2>Cookies</h2>
      <p>
        We use only the cookies needed to keep you signed in and to secure the service. We don’t use advertising or
        analytics cookies.
      </p>

      <h2>Your rights</h2>
      <p>You can ask us to:</p>
      <ul>
        <li>give you a copy of your data: use More, Account and security, Download my data;</li>
        <li>correct it: use More, Edit profile (contact us to correct your date of birth);</li>
        <li>delete it: use More, Account and security, Delete account;</li>
        <li>restrict or object to how we use it, or move it to another service: contact <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.</li>
      </ul>
      <p>
        If you’re unhappy with how we handle your data, please tell us first. You can also complain to the Information
        Commissioner’s Office (ico.org.uk).
      </p>

      <h2>Children</h2>
      <p>
        {SITE_NAME} is only for people aged 18 or over, and every member must pass an age check before their profile goes
        live. If we learn that someone under 18 has an account we will delete it. See our <Link href="/terms">Terms</Link> and <Link href="/safety">Safety guidance</Link>.
      </p>
    </>
  );
}
