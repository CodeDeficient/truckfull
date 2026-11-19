import { test, expect } from '@playwright/test';

test.describe('EventFull Lifecycle - Organizer → Owner', () => {
  test('Complete flow: Create event → Apply → Accept → Verify status', async ({ browser }) => {
    const testData = {
      organizer: {
        email: `organizer-${Date.now()}@test.com`,
        password: 'TestPass123!',
        businessName: 'Test Events Co',
      },
      owner: {
        email: `owner-${Date.now()}@test.com`,
        password: 'TestPass123!',
        truckName: 'Taco Delight',
        cuisineType: ['Mexican'],
      },
      event: {
        name: `Taco Fest ${Date.now()}`,
        description: 'A delicious taco festival featuring the best local trucks',
        location: {
          lat: 37.7749,
          lng: -122.4194,
          address: '123 Market St',
          city: 'San Francisco',
          state: 'CA',
        },
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        vendorFee: 0,
        maxVendors: 10,
      },
    };

    let eventId: string | undefined;
    let applicationId: string | undefined;
    let truckId: string | undefined;

    test.step('Step 1: Sign up as Organizer', async () => {
      const organizerContext = await browser.newContext();
      const organizerPage = await organizerContext.newPage();

      await organizerPage.goto('/signup');
      await organizerPage.fill('input[name="email"]', testData.organizer.email);
      await organizerPage.fill('input[name="password"]', testData.organizer.password);
      await organizerPage.fill('input[name="confirmPassword"]', testData.organizer.password);
      await organizerPage.fill('input[name="fullName"]', 'Test Organizer');
      await organizerPage.click('button[type="submit"]');

      await expect(organizerPage).toHaveURL(/.*owner-dashboard/, { timeout: 10000 });
      await organizerContext.close();
    });

    test.step('Step 2: Register as Organizer', async () => {
      const organizerContext = await browser.newContext();
      const organizerPage = await organizerContext.newPage();

      await organizerPage.goto('/login');
      await organizerPage.fill('input[name="email"]', testData.organizer.email);
      await organizerPage.fill('input[name="password"]', testData.organizer.password);
      await organizerPage.click('button[type="submit"]');

      await organizerPage.goto('/organizer');

      await expect(organizerPage.locator('text=Become an Event Organizer')).toBeVisible();

      await organizerPage.fill('input[name="businessName"]', testData.organizer.businessName);
      await organizerPage.fill('input[name="contactEmail"]', testData.organizer.email);
      await organizerPage.click('button[type="submit"]');

      await expect(organizerPage.locator(`text=${testData.organizer.businessName}`)).toBeVisible({
        timeout: 10000,
      });

      await organizerContext.close();
    });

    test.step('Step 3: Create and Publish Event', async () => {
      const organizerContext = await browser.newContext();
      const organizerPage = await organizerContext.newPage();

      await organizerPage.goto('/login');
      await organizerPage.fill('input[name="email"]', testData.organizer.email);
      await organizerPage.fill('input[name="password"]', testData.organizer.password);
      await organizerPage.click('button[type="submit"]');

      await organizerPage.goto('/organizer');
      await organizerPage.click('button:has-text("Create Event")');

      await organizerPage.fill('input[name="name"]', testData.event.name);
      await organizerPage.fill('textarea[name="description"]', testData.event.description);
      await organizerPage.fill('input[name="address"]', testData.event.location.address);
      await organizerPage.fill('input[name="city"]', testData.event.location.city);
      await organizerPage.fill('input[name="state"]', testData.event.location.state);

      await organizerPage.fill('input[name="startDate"]', testData.event.startDate.split('T')[0]);
      await organizerPage.fill(
        'input[name="startTime"]',
        testData.event.startDate.split('T')[1].slice(0, 5),
      );
      await organizerPage.fill('input[name="endDate"]', testData.event.endDate.split('T')[0]);
      await organizerPage.fill(
        'input[name="endTime"]',
        testData.event.endDate.split('T')[1].slice(0, 5),
      );

      if (testData.event.vendorFee !== null) {
        await organizerPage.fill('input[name="vendorFee"]', testData.event.vendorFee.toString());
      }

      if (testData.event.maxVendors !== null) {
        await organizerPage.fill('input[name="maxVendors"]', testData.event.maxVendors.toString());
      }

      await organizerPage.click('button[type="submit"]');

      await expect(organizerPage.locator('text=Event created successfully')).toBeVisible({
        timeout: 10000,
      });

      await organizerPage.goto('/organizer');
      await expect(organizerPage.locator(`text=${testData.event.name}`)).toBeVisible({
        timeout: 10000,
      });

      await organizerContext.close();
    });

    test.step('Step 4: Sign up as Truck Owner', async () => {
      const ownerContext = await browser.newContext();
      const ownerPage = await ownerContext.newPage();

      await ownerPage.goto('/signup');
      await ownerPage.fill('input[name="email"]', testData.owner.email);
      await ownerPage.fill('input[name="password"]', testData.owner.password);
      await ownerPage.fill('input[name="confirmPassword"]', testData.owner.password);
      await ownerPage.fill('input[name="fullName"]', 'Test Owner');
      await ownerPage.click('button[type="submit"]');

      await expect(ownerPage).toHaveURL(/.*owner-dashboard/, { timeout: 10000 });

      await ownerPage.goto('/owner-dashboard/register');
      await ownerPage.fill('input[name="name"]', testData.owner.truckName);
      await ownerPage.selectOption('select[name="cuisineType"]', {
        label: testData.owner.cuisineType[0],
      });
      await ownerPage.fill('input[name="address"]', '456 Food St');
      await ownerPage.fill('input[name="city"]', 'San Francisco');
      await ownerPage.fill('input[name="state"]', 'CA');
      await ownerPage.fill('input[name="zipCode"]', '94102');
      await ownerPage.click('button[type="submit"]');

      await expect(ownerPage.locator('text=Truck registered successfully')).toBeVisible({
        timeout: 10000,
      });

      await ownerContext.close();
    });

    test.step('Step 5: Discover Event', async () => {
      const ownerContext = await browser.newContext();
      const ownerPage = await ownerContext.newPage();

      await ownerPage.goto('/login');
      await ownerPage.fill('input[name="email"]', testData.owner.email);
      await ownerPage.fill('input[name="password"]', testData.owner.password);
      await ownerPage.click('button[type="submit"]');

      await ownerPage.goto('/owner-dashboard');

      await ownerPage.click('text=Events');
      await ownerPage.click('text=Discover');

      await expect(ownerPage.locator(`text=${testData.event.name}`)).toBeVisible({
        timeout: 10000,
      });

      await ownerContext.close();
    });

    test.step('Step 6: Apply to Event', async () => {
      const ownerContext = await browser.newContext();
      const ownerPage = await ownerContext.newPage();

      await ownerPage.goto('/login');
      await ownerPage.fill('input[name="email"]', testData.owner.email);
      await ownerPage.fill('input[name="password"]', testData.owner.password);
      await ownerPage.click('button[type="submit"]');

      await ownerPage.goto('/owner-dashboard');
      await ownerPage.click('text=Events');
      await ownerPage.click('text=Discover');

      await ownerPage.click(`text=${testData.event.name}`);
      await expect(ownerPage.locator('text=Apply to Event')).toBeVisible();

      await ownerPage.click('button:has-text("Apply to Event")');
      await ownerPage.fill(
        'textarea[name="coverLetter"]',
        'We would love to participate in your event!',
      );
      await ownerPage.click('button:has-text("Submit Application")');

      await expect(ownerPage.locator('text=Application submitted successfully')).toBeVisible({
        timeout: 10000,
      });

      await ownerContext.close();
    });

    test.step('Step 7: Organizer Reviews Applications', async () => {
      const organizerContext = await browser.newContext();
      const organizerPage = await organizerContext.newPage();

      await organizerPage.goto('/login');
      await organizerPage.fill('input[name="email"]', testData.organizer.email);
      await organizerPage.fill('input[name="password"]', testData.organizer.password);
      await organizerPage.click('button[type="submit"]');

      await organizerPage.goto('/organizer');
      await organizerPage.click(`text=${testData.event.name}`);

      await organizerPage.click('text=Applications');

      await expect(organizerPage.locator('text=Pending Applications')).toBeVisible({
        timeout: 10000,
      });

      await organizerContext.close();
    });

    test.step('Step 8: Organizer Accepts Application', async () => {
      const organizerContext = await browser.newContext();
      const organizerPage = await organizerContext.newPage();

      await organizerPage.goto('/login');
      await organizerPage.fill('input[name="email"]', testData.organizer.email);
      await organizerPage.fill('input[name="password"]', testData.organizer.password);
      await organizerPage.click('button[type="submit"]');

      await organizerPage.goto('/organizer');
      await organizerPage.click(`text=${testData.event.name}`);
      await organizerPage.click('text=Applications');

      await expect(organizerPage.locator(`text=${testData.owner.truckName}`)).toBeVisible({
        timeout: 10000,
      });

      await organizerPage.click(`button:has-text("Accept")`);

      await expect(organizerPage.locator('text=Application accepted')).toBeVisible({
        timeout: 10000,
      });

      await organizerContext.close();
    });

    test.step('Step 9: Owner Verifies Accepted Status', async () => {
      const ownerContext = await browser.newContext();
      const ownerPage = await ownerContext.newPage();

      await ownerPage.goto('/login');
      await ownerPage.fill('input[name="email"]', testData.owner.email);
      await ownerPage.fill('input[name="password"]', testData.owner.password);
      await ownerPage.click('button[type="submit"]');

      await ownerPage.goto('/owner-dashboard');
      await ownerPage.click('text=Events');
      await ownerPage.click('text=My Applications');

      await expect(ownerPage.locator('text=Accepted')).toBeVisible({
        timeout: 10000,
      });

      await expect(ownerPage.locator(`text=${testData.event.name}`)).toBeVisible();

      const applicationCard = ownerPage
        .locator(`text=${testData.event.name}`)
        .locator('..')
        .locator('..');
      await expect(applicationCard.locator('text=Accepted')).toBeVisible();

      await ownerContext.close();
    });
  });

  test('Max vendors limit enforcement', async ({ browser }) => {
    const testData = {
      organizer: {
        email: `organizer-limit-${Date.now()}@test.com`,
        password: 'TestPass123!',
        businessName: 'Small Events Co',
      },
      owners: Array.from({ length: 4 }, (_, i) => ({
        email: `owner-limit-${i}-${Date.now()}@test.com`,
        password: 'TestPass123!',
        truckName: `Truck ${i + 1}`,
        cuisineType: ['American'],
      })),
      event: {
        name: `Small Fest ${Date.now()}`,
        description: 'A small food festival',
        location: {
          lat: 37.7749,
          lng: -122.4194,
          address: '789 Event Ave',
          city: 'San Francisco',
          state: 'CA',
        },
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        vendorFee: 0,
        maxVendors: 2,
      },
    };

    test.step('Set up Organizer and Event', async () => {
      const organizerContext = await browser.newContext();
      const organizerPage = await organizerContext.newPage();

      await organizerPage.goto('/signup');
      await organizerPage.fill('input[name="email"]', testData.organizer.email);
      await organizerPage.fill('input[name="password"]', testData.organizer.password);
      await organizerPage.fill('input[name="confirmPassword"]', testData.organizer.password);
      await organizerPage.fill('input[name="fullName"]', 'Test Organizer Limit');
      await organizerPage.click('button[type="submit"]');

      await organizerPage.goto('/organizer');
      await organizerPage.fill('input[name="businessName"]', testData.organizer.businessName);
      await organizerPage.fill('input[name="contactEmail"]', testData.organizer.email);
      await organizerPage.click('button[type="submit"]');

      await organizerPage.click('button:has-text("Create Event")');
      await organizerPage.fill('input[name="name"]', testData.event.name);
      await organizerPage.fill('textarea[name="description"]', testData.event.description);
      await organizerPage.fill('input[name="address"]', testData.event.location.address);
      await organizerPage.fill('input[name="city"]', testData.event.location.city);
      await organizerPage.fill('input[name="state"]', testData.event.location.state);
      await organizerPage.fill('input[name="startDate"]', testData.event.startDate.split('T')[0]);
      await organizerPage.fill(
        'input[name="startTime"]',
        testData.event.startDate.split('T')[1].slice(0, 5),
      );
      await organizerPage.fill('input[name="endDate"]', testData.event.endDate.split('T')[0]);
      await organizerPage.fill(
        'input[name="endTime"]',
        testData.event.endDate.split('T')[1].slice(0, 5),
      );
      await organizerPage.fill('input[name="maxVendors"]', testData.event.maxVendors.toString());
      await organizerPage.click('button[type="submit"]');

      await organizerContext.close();
    });

    test.step('Create multiple owners and trucks', async () => {
      for (const ownerData of testData.owners) {
        const ownerContext = await browser.newContext();
        const ownerPage = await ownerContext.newPage();

        await ownerPage.goto('/signup');
        await ownerPage.fill('input[name="email"]', ownerData.email);
        await ownerPage.fill('input[name="password"]', ownerData.password);
        await ownerPage.fill('input[name="confirmPassword"]', ownerData.password);
        await ownerPage.fill('input[name="fullName"]', `Test Owner ${ownerData.truckName}`);
        await ownerPage.click('button[type="submit"]');

        await ownerPage.goto('/owner-dashboard/register');
        await ownerPage.fill('input[name="name"]', ownerData.truckName);
        await ownerPage.selectOption('select[name="cuisineType"]', {
          label: ownerData.cuisineType[0],
        });
        await ownerPage.fill('input[name="address"]', '456 Food St');
        await ownerPage.fill('input[name="city"]', 'San Francisco');
        await ownerPage.fill('input[name="state"]', 'CA');
        await ownerPage.fill('input[name="zipCode"]', '94102');
        await ownerPage.click('button[type="submit"]');

        await ownerContext.close();
      }
    });

    test.step('First two owners apply and get accepted', async () => {
      for (let i = 0; i < 2; i++) {
        const ownerContext = await browser.newContext();
        const ownerPage = await ownerContext.newPage();

        await ownerPage.goto('/login');
        await ownerPage.fill('input[name="email"]', testData.owners[i].email);
        await ownerPage.fill('input[name="password"]', testData.owners[i].password);
        await ownerPage.click('button[type="submit"]');

        await ownerPage.goto('/owner-dashboard');
        await ownerPage.click('text=Events');
        await ownerPage.click('text=Discover');

        await ownerPage.click(`text=${testData.event.name}`);
        await ownerPage.click('button:has-text("Apply to Event")');
        await ownerPage.fill('textarea[name="coverLetter"]', 'We want to join!');
        await ownerPage.click('button:has-text("Submit Application")');

        await ownerContext.close();
      }

      const organizerContext = await browser.newContext();
      const organizerPage = await organizerContext.newPage();

      await organizerPage.goto('/login');
      await organizerPage.fill('input[name="email"]', testData.organizer.email);
      await organizerPage.fill('input[name="password"]', testData.organizer.password);
      await organizerPage.click('button[type="submit"]');

      await organizerPage.goto('/organizer');
      await organizerPage.click(`text=${testData.event.name}`);
      await organizerPage.click('text=Applications');

      for (let i = 0; i < 2; i++) {
        await expect(organizerPage.locator(`text=${testData.owners[i].truckName}`)).toBeVisible();
        await organizerPage
          .locator(`text=${testData.owners[i].truckName}`)
          .locator('..')
          .locator('..')
          .locator('button:has-text("Accept")')
          .click();
      }

      await organizerContext.close();
    });

    test.step('Third owner applies but cannot be accepted', async () => {
      const ownerContext = await browser.newContext();
      const ownerPage = await ownerContext.newPage();

      await ownerPage.goto('/login');
      await ownerPage.fill('input[name="email"]', testData.owners[2].email);
      await ownerPage.fill('input[name="password"]', testData.owners[2].password);
      await ownerPage.click('button[type="submit"]');

      await ownerPage.goto('/owner-dashboard');
      await ownerPage.click('text=Events');
      await ownerPage.click('text=Discover');

      await ownerPage.click(`text=${testData.event.name}`);
      await ownerPage.click('button:has-text("Apply to Event")');
      await ownerPage.fill('textarea[name="coverLetter"]', 'Please let us join!');
      await ownerPage.click('button:has-text("Submit Application")');

      await ownerContext.close();

      const organizerContext = await browser.newContext();
      const organizerPage = await organizerContext.newPage();

      await organizerPage.goto('/login');
      await organizerPage.fill('input[name="email"]', testData.organizer.email);
      await organizerPage.fill('input[name="password"]', testData.organizer.password);
      await organizerPage.click('button[type="submit"]');

      await organizerPage.goto('/organizer');
      await organizerPage.click(`text=${testData.event.name}`);
      await organizerPage.click('text=Applications');

      await expect(organizerPage.locator(`text=${testData.owners[2].truckName}`)).toBeVisible();

      const acceptButton = organizerPage
        .locator(`text=${testData.owners[2].truckName}`)
        .locator('..')
        .locator('..')
        .locator('button:has-text("Accept")');

      await acceptButton.click();

      await expect(organizerPage.locator('text=Maximum vendors reached')).toBeVisible({
        timeout: 10000,
      });

      await organizerContext.close();
    });
  });
});
