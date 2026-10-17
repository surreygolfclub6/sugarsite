import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, SITE_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of use</h1>
      <p>
        These terms are an agreement between you and {COMPANY.name} (“we”, “us”), who run {SITE_NAME}. By creating an
        account you agree to them. Please also read our <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/safety">Safety guidance</Link>.
      </p>

      <h2>Who can use {SITE_NAME}</h2>
      <ul>
        <li>You must be 18 or over, and you must pass our age check before your profile goes live (see “Age checks” below). We remove any profile we believe belongs to someone under 18.</li>
        <li>You can have one account, and you must give accurate information about yourself, including your age. Each age check can be used for one account only.</li>
        <li>You are responsible for keeping your password safe and for what happens on your account.</li>
      </ul>

      <h2>Age checks</h2>
      <ul>
        <li>
          Before your profile is visible, and before you can see other members, you must complete an age check. It is
          carried out by AgeVerif, an independent age-checking service, using methods such as facial age estimation or
          an identity document. You will be sent to AgeVerif to complete it, and you may be asked to repeat it.
        </li>
        <li>
          You must not give false information, use someone else’s face, document or check, or try to avoid or bypass
          the check. We may suspend or delete accounts that do.
        </li>
        <li>
          If a check can’t confirm that you’re 18 or over, we can’t make your profile live. If you think the result is
          wrong, contact us at <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </li>
        <li>
          Members who pass the check show an “Age verified” badge. The badge means a check confirmed that the person is
          an adult. It does not confirm who they are, and it is not a guarantee about their identity, intentions or
          behaviour.
        </li>
        <li>
          We keep only the result of your check, not your face image or documents. See our{" "}
          <Link href="/privacy">Privacy Policy</Link> for details.
        </li>
      </ul>

      <h2>Levels and limits</h2>
      <ul>
        <li>
          To keep {SITE_NAME} genuine, how many new conversations you can start each day depends on your level: Newcomer,
          Member, Trusted or Champion. Replying to someone who has messaged you is never limited, and neither is messaging a
          match, which is when you and another member have both liked each other.
        </li>
        <li>
          Your level rises as you add a photo, complete your profile, have conversations (chats where you have both written)
          and invite friends who become real members, and it can fall if those things stop being true. An upheld report about you holds your level at Member for
          90 days. See <Link href="/levels">How levels work</Link>.
        </li>
        <li>
          You can invite friends with your personal link. Only invite people who would like to be here. Don’t pay, pressure,
          threaten or push anyone to join, and don’t invite people who have asked you not to. We can remove a level or limit
          you gained through fake or duplicate accounts, or through invites that break these terms.
        </li>
      </ul>

      <h2>What you can post</h2>
      <p>
        You own what you post, but you give us permission to show it to other members and to store and process it to
        run the service. You must have the right to post everything you upload.
      </p>
      <h3>Photos</h3>
      <ul>
        <li>Photos must show you. No one else’s photos, and no images that aren’t of a person.</li>
        <li>No nudity, explicit or sexual images, or content that’s offensive or hateful.</li>
        <li>Every photo is checked by a person before other members can see it. We can reject or remove any photo.</li>
      </ul>

      <h2>How to behave</h2>
      <p>You must not:</p>
      <ul>
        <li>harass, threaten, abuse or discriminate against anyone, or send unwanted sexual content;</li>
        <li>pretend to be someone else, or create a fake or misleading profile;</li>
        <li>ask for money, gifts or financial details, or run any kind of scam;</li>
        <li>
          offer or ask for sexual services in exchange for payment, or advertise escort, adult or other commercial
          services;
        </li>
        <li>use the service for commercial purposes, advertising or recruitment;</li>
        <li>share other people’s private information or images without their permission;</li>
        <li>post anything illegal, or try to interfere with or gain unauthorised access to the service.</li>
      </ul>

      <h2>Moderation</h2>
      <p>
        Members can block and report each other. We review reports and may look at the profile, photos and any
        conversation attached to a report. We may warn you, remove content, suspend or delete your account, and where
        the law requires or allows, tell the authorities. We don’t have to give a reason where doing so would put
        someone at risk.
      </p>

      <h2>Meeting people</h2>
      <p>
        We can’t check everything people tell us about themselves, and our age check doesn’t confirm anyone’s identity. We don’t
        guarantee anyone’s identity, intentions or behaviour. You are responsible for your own safety when you chat with or meet other members. See our{" "}
        <Link href="/safety">Safety guidance</Link>.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can delete your account at any time from More, Account and security. We can suspend or end your account if
        you break these terms or we have to for legal reasons.
      </p>

      <h2>Our responsibility</h2>
      <p>
        We provide the service “as is” and work to keep it available and safe, but we can’t promise it will always be
        uninterrupted or error free. Nothing in these terms limits liability that can’t legally be limited, including
        for death or personal injury caused by negligence or for fraud. Subject to that, we aren’t responsible for what
        members say or do, or for losses we couldn’t reasonably have foreseen.
      </p>

      <h2>Changes and the law</h2>
      <p>
        We may update these terms and will tell you about important changes. These terms are governed by the law of
        England and Wales, and the courts of England and Wales can hear any dispute, although if you live elsewhere in
        the UK you may also have rights to bring a claim where you live.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p>
    </>
  );
}
