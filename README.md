# CalcSpace

CalcSpace is a local calculator workspace with 105 tools across eight categories. The Age Calculator appears in both Date & Time and Daily Life and uses one route.

## Run on Windows

Use Node.js 22.12 or later on an active LTS release. The project was verified with Node.js 24 and npm 11. Use `npm.cmd` in PowerShell to run npm without relying on PowerShell script execution settings.

If you downloaded the source archive, run these commands in the folder that contains it. Extract into a location without an existing `calcspace` folder.

```powershell
# Create the calcspace project folder from the delivered source
Expand-Archive -LiteralPath '.\CalcSpace-source.zip' -DestinationPath '.'
Set-Location -LiteralPath '.\calcspace'

# Install dependencies using the lockfile
npm.cmd ci

# Start the local development server
npm.cmd run dev
```

If you are using the existing `calcspace` folder, change into that folder and start from `npm.cmd ci`. Open [CalcSpace on localhost](http://localhost:5173/) when Vite reports that it is ready. Press **Ctrl+C** in the server terminal to stop it.

Use a separate PowerShell window in the `calcspace` folder to test and build.

```powershell
# Run the calculation engine tests
npm.cmd test

# Run browser checks with installed Chrome, Edge or Chromium
npm.cmd run test:browser

# Type-check and build the production files into dist
npm.cmd run build

# Optional local preview of the production build
npm.cmd run preview -- --host localhost --port 4173 --strictPort
```

The browser suite starts its own loopback server by default. Set `$env:CALCSPACE_BROWSER` to a browser executable path if your installation is in a custom location. Set `$env:CALCSPACE_TEST_URL` to an existing local server, for example `http://localhost:4173`, to test the built preview.

## Use CalcSpace

- Press **Ctrl+K** or **Cmd+K** to focus quick search. Use the arrow keys to select a suggestion, or press **Enter** to search the full directory. The directory has category filters and sorting.
- Choose **Calculate** for a result. On the standard and scientific tools, you can type an expression or use the keypad. **Enter** evaluates and **Escape** clears the expression. **Reset** restores the example inputs on forms and clears the expression on keypads.
- Use **Save** or the star icon for favorites. **History** shows up to 40 calculation results and 12 recent calculators. Preferences, favorites and history are stored in the current browser and origin. **Clear history** removes the saved results and recents.
- **Copy result** copies the labeled values. **Share link** copies the route alone. Localhost links work on the machine serving the site.
- All calculations and fonts run locally once the dependencies are installed. Password, hash, JSON and regex results are excluded from history. The regex tester runs in a worker with a time limit.

## Calculation scope

- Ordinary calculations use double-precision arithmetic and results generally display up to 12 significant digits. Rupee amounts normally display two decimal places. Integer base conversion, fraction arithmetic, GCD, LCM and ratio simplification use exact integers. Domain and range checks reject invalid input and nonfinite results.
- Loans use a fixed rate and monthly reducing balances. SIP, SWP and bank deposit projections use the assumptions shown on their pages. PPF uses a constant editable rate and assumes a single annual deposit eligible for April interest. [India Post PPF scheme](https://www.indiapost.gov.in/documents/offerings/schemesandservices/posb/PublicProvidentFundScheme2019English.pdf)
- The India tax tool compares resident old and new regimes for FY 2025–26 and FY 2026–27 on ordinary slab-rate income. It includes the standard deduction, eligible user-entered deductions, rebate, marginal relief, surcharge and cess. For filing, verify the estimate with the government calculator. [FY 2025–26 slabs](https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1) · [Finance Act 2026](https://egazette.gov.in/WriteReadData/2026/271439.pdf) · [Section 156 rebate](https://wmstatic-prd.incometaxindia.gov.in/documents/20117/42998/Section-156_2026-04-01_05-11-58_344893_en.pdf/415b0f0e-8826-feaa-b374-481e54d4b98e) · [Official calculator guide](https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/income-tax-calculator-um)
- Health tools provide reference estimates. BMI and reference weight use adult CDC categories. Energy estimates use Mifflin–St Jeor, body fat uses Deurenberg, and body surface area uses Mosteller. [CDC adult BMI](https://www.cdc.gov/bmi/adult-calculator/index.html) · [Mifflin–St Jeor](https://pubmed.ncbi.nlm.nih.gov/2305711/) · [Deurenberg](https://pubmed.ncbi.nlm.nih.gov/2043597/) · [Mosteller](https://pubmed.ncbi.nlm.nih.gov/3657876/)
- Water intake includes water in food and drinks. Sleep timing models estimated cycles. The pregnancy due date uses the last menstrual period with a cycle-length adjustment. [National Academies water reference](https://www.nationalacademies.org/read/10925/chapter/6) · [NIH sleep stages](https://www.nhlbi.nih.gov/health/sleep/stages-of-sleep) · [ACOG due-date method](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date)
- The land converters use the Maharashtra convention of 40 guntha per acre. Storage separates decimal units from binary units. The subnet calculators support IPv4, including /31 point-to-point networks and /32 host routes. [Maharashtra Land Records](https://bhumiabhilekh.maharashtra.gov.in/Pages/AboutUsDetail?pageId=58)
- Time zones come from the browser’s IANA data. The converter reports skipped local times and offers a choice for repeated times. Calendar dates use month-end clipping where applicable.

## Source and verification

| Path | Contents |
|---|---|
| `src/calculators/` | Typed engine, validation, category modules, FAQ content, search catalog and Vitest coverage |
| `src/ui/` | Navigation, search, forms, results, favorites, history and browser persistence |
| `src/seo.ts`, `vite.config.ts` | Route metadata, structured data, sitemap, robots and built route HTML |
| `scripts/browser-test.mjs` | Full route and calculation smoke test plus search, copy, persistence and responsive checks |
| `TODO.md` | Implementation and verification checklist |

## Production

CalcSpace is deployed at <https://calcspace.blueflutex.in>. GitHub Actions
builds and publishes to an Oracle Cloud VM, and Cloudflare provides DNS, TLS and
the tunnel in front of the origin. See `deploy/oracle/README.md` for the
architecture, secrets and rollback steps.

## Local SEO output

The production build writes entry HTML with route-specific titles and descriptions, calculator JSON-LD, `robots.txt` and `sitemap.xml`. With the default local configuration, pages use `noindex` and the sitemap uses localhost. Canonical URLs and an indexable sitemap are generated when a future build sets `VITE_SITE_URL` to the intended public origin. CalcSpace currently runs on localhost.
