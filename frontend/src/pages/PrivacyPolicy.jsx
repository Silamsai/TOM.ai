import React from 'react';
import { Link } from 'react-router-dom';
import InteractiveLogo from '../components/InteractiveLogo';
import '../styles/pages.css';

const LAST_UPDATED = 'August 5, 2026';

const PrivacyPolicy = () => (
  <div className="legal-page">
    <header className="legal-header">
      <Link to="/" className="legal-brand">
        <InteractiveLogo width={28} height={28} />
        <span>tom.ai</span>
      </Link>
      <nav className="legal-nav">
        <Link to="/terms">Terms of Service</Link>
        <Link to="/login">Sign In</Link>
      </nav>
    </header>

    <article className="legal-card">
      <p className="legal-eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

      <p className="legal-lead">
        This Privacy Policy explains how tom.ai (“we”, “us”) collects, uses, and protects
        information when you use our personal AI assistant. We built tom.ai to help you get things
        done — not to sell your data.
      </p>

      <section>
        <h2>1. Information we collect</h2>
        <h3>Account information</h3>
        <p>
          When you create an account or sign in, we may collect your name, email address, and
          authentication details (including tokens from Google sign-in when you choose that option).
        </p>
        <h3>Content you provide</h3>
        <p>
          This includes chat messages, tasks and reminders, uploaded personal documents used for
          retrieval (RAG), image-generation prompts, and settings you configure in the app.
        </p>
        <h3>Connected services</h3>
        <p>
          If you connect Gmail, Google Calendar, or Google Tasks, we receive only the access you
          authorize so we can show relevant information and help manage those items inside tom.ai.
          You can revoke access at any time from Settings or your Google account.
        </p>
        <h3>Technical data</h3>
        <p>
          We automatically collect limited technical information such as IP address, browser type,
          device information, and basic usage logs needed to operate, secure, and debug the Service.
        </p>
      </section>

      <section>
        <h2>2. How we use information</h2>
        <p>We use the information above to:</p>
        <ul>
          <li>Provide, personalize, and improve the Service</li>
          <li>Authenticate you and protect accounts from abuse</li>
          <li>Power chat, task reminders, document search, and image features</li>
          <li>Send transactional emails (verification codes, password resets, reminders)</li>
          <li>Monitor reliability, prevent fraud, and comply with legal obligations</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal information. We do not use your private
          documents or connected mailbox content to train public third-party foundation models.
        </p>
      </section>

      <section>
        <h2>3. AI processing</h2>
        <p>
          To generate replies and embeddings, your prompts and relevant retrieved context may be
          sent to AI providers we configure (for example Google Gemini, and optionally other
          providers when enabled by an administrator). Those providers process data under their
          own terms and privacy policies, and only as needed to return results to you.
        </p>
      </section>

      <section>
        <h2>4. How we share information</h2>
        <p>We may share information only in these cases:</p>
        <ul>
          <li>
            <strong>Service providers</strong> — hosting, email delivery, databases, and AI APIs
            that help us run tom.ai under appropriate confidentiality obligations
          </li>
          <li>
            <strong>Legal requirements</strong> — when we believe disclosure is required by law,
            regulation, or valid legal process
          </li>
          <li>
            <strong>Safety</strong> — to protect the rights, security, or property of users or the
            public
          </li>
          <li>
            <strong>With your direction</strong> — for example when you connect a Google account or
            export your data
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Cookies &amp; local storage</h2>
        <p>
          We use browser storage (such as local storage) to keep you signed in, remember guest
          preferences, and improve session reliability. We do not use third-party advertising
          cookies to track you across other sites.
        </p>
      </section>

      <section>
        <h2>6. Data retention</h2>
        <p>
          We keep account and content data for as long as your account is active or as needed to
          provide the Service. Completed or cancelled tasks may be cleaned up after a period of
          inactivity. You may request deletion of your account and associated personal data by
          contacting us; we will process requests subject to legal retention requirements.
        </p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          We use industry-standard measures such as encrypted transport (HTTPS), access controls,
          and token-based authentication. No method of transmission or storage is 100% secure, so
          we cannot guarantee absolute security — please use a strong unique password and protect
          your devices.
        </p>
      </section>

      <section>
        <h2>8. Children’s privacy</h2>
        <p>
          tom.ai is not directed to children under 13. We do not knowingly collect personal
          information from children under 13. If you believe a child has provided us data, contact
          us and we will take appropriate steps to delete it.
        </p>
      </section>

      <section>
        <h2>9. International users</h2>
        <p>
          The Service may be operated from servers in locations different from where you live.
          By using tom.ai, you understand that your information may be processed in countries that
          may have different data-protection laws than your own.
        </p>
      </section>

      <section>
        <h2>10. Your choices</h2>
        <ul>
          <li>Update profile and settings inside the app</li>
          <li>Disconnect Google integrations at any time</li>
          <li>Delete uploaded documents you no longer want stored</li>
          <li>Request access, correction, or deletion of personal data where applicable law allows</li>
        </ul>
      </section>

      <section>
        <h2>11. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will revise the “Last updated”
          date at the top of this page. Continued use of the Service after an update means you
          acknowledge the revised policy.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          For privacy questions or data requests, contact us through the in-app support options or
          the channels listed on our website. Related terms of use are in our{' '}
          <Link to="/terms">Terms of Service</Link>.
        </p>
      </section>
    </article>

    <footer className="legal-footer">
      <Link to="/">← Back to tom.ai</Link>
    </footer>
  </div>
);

export default PrivacyPolicy;
