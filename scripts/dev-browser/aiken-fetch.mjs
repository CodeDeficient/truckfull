const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const now = new Date();
const months = [];
for (let i = 0; i < 3; i++) {
  const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
  months.push({
    name: MONTH_NAMES[d.getMonth()],
    exactDate: String(Math.floor(d.getTime() / 1000)),
  });
}

const BASE_URL =
  'https://www.cityofaikensc.gov/calendar-of-events/action~month/request_format~json/';

const page = await browser.getPage('aiken');
const allHtml = [];

for (const month of months) {
  const url = `${BASE_URL}exact_date~${month.exactDate}/`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  const monthView = await page.$('.ai1ec-month-view');
  if (!monthView) {
    await page.click('.ai1ec-views-dropdown .ai1ec-dropdown-toggle');
    await page.waitForTimeout(1000);
    await page.click('#ai1ec-view-month');
    await page.waitForTimeout(3000);
  }

  const html = await page.$eval('.ai1ec-calendar', (el) => el.innerHTML);
  await writeFile(`aiken-month-${month.name}.html`, html);
  allHtml.push(html.length);
  console.log(`${month.name}: ${(html.length / 1024).toFixed(0)}KB`);
}

await page.close();
console.log(JSON.stringify(allHtml));
