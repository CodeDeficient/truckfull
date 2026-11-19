'use client';

import React from 'react';
import { MobileLegalPageLayout } from '@/components/mobile/MobileLegalPageLayout';

export default function TermsOfService() {
  return (
    <MobileLegalPageLayout title="Terms of Service" lastUpdated="May 27, 2026">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-100">Welcome to TruckFull!</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          By accessing or using our mobile application, you agree to be bound by these Terms of
          Service. Please read them carefully. If you do not agree to these terms, you may not use
          our services.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-100">
          <span className="text-red-500">1.</span> Acceptance of Terms
        </h3>
        <p className="text-sm leading-relaxed text-gray-300">
          By using TruckFull, you agree to comply with and be bound by these Terms of Service. These
          terms may be updated or modified from time to time without prior notice. Your continued
          use of the app after any changes constitutes your acceptance of the new terms.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-100">
          <span className="text-red-500">2.</span> Description of Service
        </h3>
        <p className="text-sm leading-relaxed text-gray-300">
          TruckFull is a mobile application that helps users discover and locate food trucks in
          their area. We provide information about food trucks, including their location, menu,
          hours of operation, and user reviews. We do not operate the food trucks and are not
          responsible for their products or services.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-100">
          <span className="text-red-500">3.</span> User Accounts
        </h3>
        <p className="text-sm leading-relaxed text-gray-300">
          To access certain features of the app, you may be required to create an account. You are
          responsible for maintaining the confidentiality of your account information and for all
          activities that occur under your account. You agree to notify us immediately of any
          unauthorized use of your account.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-100">
          <span className="text-red-500">4.</span> User Conduct
        </h3>
        <p className="text-sm leading-relaxed text-gray-300">
          You agree to use TruckFull only for lawful purposes and in a manner that does not infringe
          the rights of, restrict, or inhibit anyone else&apos;s use and enjoyment of the app.
          Prohibited conduct includes, but is not limited to, harassing or causing distress or
          inconvenience to any other user, transmitting obscene or offensive content, or disrupting
          the normal flow of dialogue within the app.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-100">
          <span className="text-red-500">5.</span> Intellectual Property
        </h3>
        <p className="text-sm leading-relaxed text-gray-300">
          The content, features, and functionality of TruckFull, including but not limited to text,
          graphics, logos, and software, are the exclusive property of TruckFull and are protected
          by copyright, trademark, and other intellectual property laws. You may not reproduce,
          distribute, or create derivative works from any part of the app without our express
          written permission.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-100">
          <span className="text-red-500">6.</span> Disclaimers
        </h3>
        <p className="text-sm leading-relaxed text-gray-300">
          TruckFull is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We make
          no warranties, express or implied, regarding the operation or availability of the app, or
          the accuracy, reliability, or content of any information provided. We disclaim all
          warranties, including but not limited to, implied warranties of merchantability and
          fitness for a particular purpose.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-100">
          <span className="text-red-500">7.</span> Limitation of Liability
        </h3>
        <p className="text-sm leading-relaxed text-gray-300">
          In no event shall TruckFull be liable for any direct, indirect, incidental, special, or
          consequential damages arising out of or in connection with your use of the app, including
          but not limited to damages for loss of profits, goodwill, use, data, or other intangible
          losses.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-100">
          <span className="text-red-500">8.</span> Indemnification
        </h3>
        <p className="text-sm leading-relaxed text-gray-300">
          You agree to indemnify, defend, and hold harmless TruckFull, its officers, directors,
          employees, and agents, from and against any and all claims, liabilities, damages, losses,
          or expenses, including reasonable attorneys&apos; fees, arising out of or in any way
          connected with your use of the app or your violation of these Terms of Service.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-100">
          <span className="text-red-500">9.</span> Governing Law
        </h3>
        <p className="text-sm leading-relaxed text-gray-300">
          These Terms of Service shall be governed by and construed in accordance with the laws of
          the jurisdiction in which TruckFull is based, without regard to its conflict of law
          principles.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-100">
          <span className="text-red-500">10.</span> Contact Information
        </h3>
        <p className="text-sm leading-relaxed text-gray-300">
          If you have any questions about these Terms of Service, please contact us at{' '}
          <a
            className="text-red-500 font-medium hover:underline"
            href="mailto:support@truckfull.food"
          >
            support@truckfull.food
          </a>
          .
        </p>
      </section>
    </MobileLegalPageLayout>
  );
}
