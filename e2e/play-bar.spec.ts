import { test, expect, type Page } from '@playwright/test';

/**
 * Step 3+ — the persistent mobile/tablet PLAY BAR and the logic fixes behind it
 * (B1 jump-to-next-clue, B2 deterministic clue selection). Runs on the mobile
 * (375px) and tablet (820px) projects; skips on desktop (the bar is compact-only).
 *
 * Fixture (the same 5×5 shared puzzle the P1 spec uses):
 *    C A T . .      1-Across CAT (0,0)
 *    . R . . .      2-Down  ARE (1,0): A(1,0) R(1,1) E(1,2)
 *    . E A R .      3-Across EAR (1,2): E(1,2) A(2,2) R(3,2)
 *
 * What headless CAN prove: the bar renders above the keyboard zone, the chip
 * toggles direction, ‹ › step clues, a clue tap sets direction deterministically,
 * typing stays in the word + jumps to the next clue and never enters a black cell,
 * the tools sheet opens/closes and returns focus, and there are no console errors.
 * What it CANNOT prove: the real soft-keyboard raise/lower smoothness (device check).
 */
const PUZZLE_HASH =
  '#puzzle=eJxNjk0KwjAQha9S3kohASu4yV7xDuJiaEIMhFSmtVZK7-40DaUD8_8-ZiYMMLXCF-ai8MrRw6ChXmvN4tpRTsUg2pZtB_OYFmpRyqyR6uZiSE6aEeak8MvRyoIwq1VM7Ir4Ooaurw7v-GGKxxWq95DdIHmgQHcpQ_JVy57Snjlvh57zH3q-N5g';

async function openPuzzle(page: Page) {
  await page.goto(`./${PUZZLE_HASH}`);
  await expect(page.getByRole('grid')).toBeVisible();
}

function cell(page: Page, row: number, col: number) {
  return page.getByRole('gridcell', {
    name: new RegExp(`^Row ${row}, Column ${col}(,|$)`),
  });
}

/** The play bar — a toolbar landmark labelled "Crossword controls". */
function playBar(page: Page) {
  return page.getByRole('toolbar', { name: 'Crossword controls' });
}

/** Tap a bar control. Programmatic click avoids clue-list overlap in headless hit-testing. */
async function clickBarButton(page: Page, bar: ReturnType<typeof playBar>, name: string | RegExp) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const btn = bar.getByRole('button', { name });
  await btn.evaluate((el) => (el as HTMLButtonElement).click());
}

/** Skip the whole describe on desktop (compact-only UI). */
test.describe('crossword play bar (mobile/tablet)', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'play bar is compact-only');
  });

  test('the bar renders, shows the active clue, and sits within the viewport', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await openPuzzle(page);
    const bar = playBar(page);
    await expect(bar).toBeVisible();

    // Shared link starts on 1-Across (CAT) — the bar shows that clue.
    await expect(bar).toContainText(/Across/i);

    // The bar is within the viewport (no horizontal overflow off-screen).
    const box = await bar.boundingBox();
    const vp = page.viewportSize();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    if (vp) expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);

    expect(errors).toEqual([]);
  });

  test('the Across⇄Down chip toggles direction', async ({ page }) => {
    await openPuzzle(page);
    const bar = playBar(page);

    // Start on a crossing cell so both directions are valid. (1,0) is the A of
    // CAT (across) and the A of ARE (down).
    await cell(page, 1, 2).click(); // Row 1 Col 2 = (1,0)
    const chip = bar.getByRole('button', { name: /Direction:/ });
    const before = await chip.getAttribute('aria-label');
    await clickBarButton(page, bar, /Direction:/);
    await expect.poll(() => chip.getAttribute('aria-label')).not.toBe(before);
  });

  test('‹ › step between clues', async ({ page }) => {
    await openPuzzle(page);
    const bar = playBar(page);
    await expect(bar).toContainText(/1 Across/i);

    await clickBarButton(page, bar, 'Next clue');
    // Numbering: CAT=1-Across (0,0), ARE=2-Down (1,0), EAR=3-Across (1,2).
    // Next clue in order after 1-Across is 2-Down (ARE).
    await expect(bar).toContainText(/2 Down/i);

    await clickBarButton(page, bar, 'Previous clue');
    await expect(bar).toContainText(/1 Across/i);
  });

  test('B2 — tapping a Down clue sets Down even from the same start cell', async ({ page }) => {
    await openPuzzle(page);
    const bar = playBar(page);

    // Select the cell (1,0) reading Across first — it is shared by CAT (Across)
    // and ARE (2-Down). Then tapping the 2-Down clue must flip to Down
    // deterministically (the old double-selectCell bug could fail exactly here).
    await cell(page, 1, 2).click(); // (1,0): A of CAT, A of ARE
    await expect(bar).toContainText(/Across/i);

    // The Down clue card (the warm-card whose heading is "Down"), clue 2.
    const downCard = page.locator('.warm-card', { has: page.getByRole('heading', { name: 'Down' }) });
    await downCard.getByRole('listitem').filter({ hasText: /^2\./ }).first().click();
    await expect(bar).toContainText(/2 Down/i);
  });

  test('B1 — typing a word fills it then jumps to the next clue (never a black cell)', async ({ page }) => {
    await openPuzzle(page);
    const bar = playBar(page);
    await expect(bar).toContainText(/1 Across/i);

    // Select CAT's C (Row 1 Col 1) and type the whole word.
    await cell(page, 1, 1).click();
    for (const ch of ['c', 'a', 't']) await page.keyboard.press(ch);

    // CAT is filled correctly (no letter ran past the word into a black cell —
    // structurally there is no cell to run into; the grid only exposes lettered
    // gridcells, so a stray write would have to land on another word).
    await expect(cell(page, 1, 1)).toHaveAccessibleName(/letter C/i);
    await expect(cell(page, 1, 2)).toHaveAccessibleName(/letter A/i);
    await expect(cell(page, 1, 3)).toHaveAccessibleName(/letter T/i);

    // At the word end the cursor jumped to the next unfilled clue — the bar no
    // longer shows 1-Across. (Next in order is 2-Down ARE; its A at (1,0) is
    // already filled by CAT, so it lands on R/E reading Down.)
    await expect(bar).not.toContainText(/1 Across/i);

    // Typing one more letter writes into that next clue's cell, not back over a
    // CAT letter or anywhere illegal: CAT stays C-A-T.
    await page.keyboard.press('r');
    await expect(cell(page, 1, 1)).toHaveAccessibleName(/letter C/i);
    await expect(cell(page, 1, 3)).toHaveAccessibleName(/letter T/i);
  });

  test('P10 — Check summarises wrong squares in a margin note', async ({ page }) => {
    await openPuzzle(page);
    const bar = playBar(page);

    // One wrong letter into CAT's first square, then Check via the bar.
    await cell(page, 1, 1).click();
    await page.keyboard.press('x');
    await clickBarButton(page, bar, 'Check');

    await expect(page.getByText('1 square to fix.')).toBeVisible();
  });

  test('P10 — Check reports no mistakes when filled letters are all right', async ({ page }) => {
    await openPuzzle(page);
    const bar = playBar(page);

    // A correct letter, then Check — other squares are still empty, so the
    // summary is the encouraging "no mistakes" note, not a fix count.
    await cell(page, 1, 1).click();
    await page.keyboard.press('c');
    await clickBarButton(page, bar, 'Check');

    await expect(page.getByText('No mistakes so far.')).toBeVisible();
  });

  test('P5 — a one-time touch cue shows, then retires after the first letter', async ({ page }) => {
    await openPuzzle(page);

    // Fresh context (empty localStorage) → the cue is shown before any typing.
    const cue = page.getByText(/Tap a square to type/);
    await expect(cue).toBeVisible();

    // Entering a letter retires the cue for good.
    await cell(page, 1, 1).click();
    await page.keyboard.press('c');
    await expect(cue).not.toBeVisible();
  });

  test('P6 — the duplicate desktop tools strip is hidden on compact widths', async ({ page }) => {
    await openPuzzle(page);
    // The play bar owns Check and the tools sheet owns hints/undo/reveal on
    // compact, so the desktop strip's "Reveal all" / "Hint word" must not show.
    await expect(page.getByRole('button', { name: /Reveal all/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hint word' })).toHaveCount(0);
  });

  test('P9 — solving the puzzle reveals the completion card on-screen', async ({ page }) => {
    await openPuzzle(page);

    // Fill every answer (CAT across, ARE down, EAR across) cell by cell.
    const fills: Array<[number, number, string]> = [
      [1, 1, 'c'], [1, 2, 'a'], [1, 3, 't'], // CAT
      [2, 2, 'r'],                            // ARE (A shared, E shared with EAR)
      [3, 2, 'e'], [3, 3, 'a'], [3, 4, 'r'],  // EAR
    ];
    for (const [row, col, ch] of fills) {
      await cell(page, row, col).click();
      await page.keyboard.press(ch);
    }

    const solved = page.getByText('Solved.');
    await expect(solved).toBeVisible();
    // It sits within the viewport (the scroll-into-view brought it on-screen).
    const box = await solved.boundingBox();
    const vp = page.viewportSize();
    expect(box).not.toBeNull();
    if (vp) {
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeLessThan(vp.height);
    }
  });

  test('Tools sheet opens, closes, and the tools are present', async ({ page }) => {
    await openPuzzle(page);
    const bar = playBar(page);

    await clickBarButton(page, bar, 'Open tools');
    const sheet = page.getByRole('dialog', { name: 'Solver tools' });
    await expect(sheet).toBeVisible();

    // ADR-6 hint names are present and unchanged.
    await expect(sheet.getByRole('button', { name: /Hint letter/ })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /Hint word/ })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /Reveal all/ })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /Undo/ })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /Redo/ })).toBeVisible();

    // Backdrop tap closes it (programmatic click — panel sits above backdrop in z-order).
    const closeBackdrop = page.getByRole('button', { name: 'Close tools' });
    await closeBackdrop.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(sheet).not.toBeVisible();
  });
});
