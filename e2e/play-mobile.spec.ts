import { test, expect, type Page } from '@playwright/test';

/**
 * P1 — the crossword PLAY grid must be typable on a phone.
 *
 * The bug: letter entry used to flow only through a grid <div>'s onKeyDown,
 * and selecting a cell focused that non-editable div — which never raises the
 * mobile soft keyboard. The fix adds a real, focusable, visually-hidden
 * <input> inside the grid that owns text entry.
 *
 * What this spec CAN prove in headless Chromium:
 *   - tapping a cell moves focus to a real <input> (the keyboard's focus target)
 *   - a text-input event on that input routes a letter into the selected cell
 *   - physical-keyboard typing (desktop) still routes into the grid
 *
 * What it CANNOT prove (needs a real device): that the OS soft keyboard
 * actually appears. Headless browsers don't render one. That keyboard-raise is
 * the real-device confirmation step.
 *
 * Fixture: a shared-puzzle hash (the v1 URL format). Opening it drops straight
 * onto the Play tab with a crossword and cell (0,0) pre-selected — the most
 * reliable, generation-independent way to reach a playable crossword.
 *   Grid (5×5):  C A T . .  /  . R . . .  /  . E A R .  / ...
 *   Words: CAT (1-Across), ARE (1-Down), EAR (3-Across)
 */
const PUZZLE_HASH =
  '#puzzle=eJxNjk0KwjAQha9S3kohASu4yV7xDuJiaEIMhFSmtVZK7-40DaUD8_8-ZiYMMLXCF-ai8MrRw6ChXmvN4tpRTsUg2pZtB_OYFmpRyqyR6uZiSE6aEeak8MvRyoIwq1VM7Ir4Ooaurw7v-GGKxxWq95DdIHmgQHcpQ_JVy57Snjlvh57zH3q-N5g';

/** Navigate to the shared-puzzle fixture and wait for the play grid. */
async function openSharedPuzzle(page: Page) {
  await page.goto(`./${PUZZLE_HASH}`);
  // Shared links auto-route to the Play tab; the grid is the proof of arrival.
  await expect(page.getByRole('grid')).toBeVisible();
}

/** The gridcell at row/col (1-based, matching the cell's aria-label). */
function cell(page: Page, row: number, col: number) {
  return page.getByRole('gridcell', {
    name: new RegExp(`^Row ${row}, Column ${col}(,|$)`),
  });
}

test.describe('crossword play — mobile typing (P1)', () => {
  test('tapping a cell focuses a real input and typed text fills the cell', async ({ page }) => {
    await openSharedPuzzle(page);

    // Tap the top-left lettered cell (CAT's 'C', clue 1).
    await cell(page, 1, 1).click();

    // (a) Focus must land on a real editable <input> — the element a soft
    //     keyboard targets. A focused non-editable <div> would not raise it.
    const activeIsInput = await page.evaluate(() => {
      const el = document.activeElement;
      return !!el && el.tagName === 'INPUT';
    });
    expect(activeIsInput).toBe(true);

    // (b) Simulate a soft-keyboard keystroke the way mobile reports it: set the
    //     focused input's value and dispatch a native 'input' event with
    //     inputType 'insertText'. This drives the component's real onInput path.
    await page.evaluate(() => {
      const el = document.activeElement as HTMLInputElement;
      el.value = 'q';
      el.dispatchEvent(new InputEvent('input', {
        inputType: 'insertText',
        data: 'q',
        bubbles: true,
      }));
    });

    // The letter lands in the tapped cell (uppercased), proving the input
    // routes into the grid. Read it off the cell's accessible name.
    await expect(cell(page, 1, 1)).toHaveAccessibleName(/letter Q/i);

    // The field must be cleared after the keystroke so autocorrect can't
    // accumulate a word.
    const inputValue = await page.evaluate(() => {
      const el = document.querySelector('input[aria-label="Type a letter for the selected square"]') as HTMLInputElement | null;
      return el?.value ?? null;
    });
    expect(inputValue).toBe('');

    // A soft-keyboard backspace (reported as a delete inputType) clears the cell.
    // After the previous keystroke the cursor auto-advanced, so re-tap (1,1).
    await cell(page, 1, 1).click();
    await page.evaluate(() => {
      const el = document.activeElement as HTMLInputElement;
      el.value = '';
      el.dispatchEvent(new InputEvent('input', {
        inputType: 'deleteContentBackward',
        bubbles: true,
      }));
    });
    await expect(cell(page, 1, 1)).toHaveAccessibleName(/empty/i);
  });
});

test.describe('crossword play — desktop physical keyboard (no regression)', () => {
  test('physical-keyboard typing, single-entry, backspace and arrows still drive the grid', async ({ page }) => {
    await openSharedPuzzle(page);

    // Select a lettered cell. (Row 3, Column 2 = the 'E' of EAR / ARE — a real
    // crossing cell. The shared link pre-selects 1-Across, so we tap a fresh
    // cell rather than re-tapping the selected one, which would toggle direction.)
    await cell(page, 3, 2).click();

    // A physical key routes into the selected cell, and only ONCE — if onKeyDown
    // and onInput both handled it we'd get two letters / a double-advance.
    await page.keyboard.press('h');
    await expect(cell(page, 3, 2)).toHaveAccessibleName(/letter H/i);

    // Backspace reaches the grid and clears the letter (re-select first, since
    // typing auto-advanced the cursor off this cell).
    await cell(page, 3, 2).click();
    await page.keyboard.press('Backspace');
    await expect(cell(page, 3, 2)).toHaveAccessibleName(/empty/i);

    // Arrow keys still move the selection — the input rides to the new cell, so
    // its computed left/top offset changes. Read it before/after to prove it.
    const inputLeft = () => page.evaluate(() => {
      const el = document.querySelector('input[aria-label="Type a letter for the selected square"]') as HTMLElement | null;
      return el?.style.left ?? null;
    });
    const before = await inputLeft();
    await page.keyboard.press('ArrowRight');
    await expect.poll(inputLeft).not.toBe(before);

    // Space toggles Across/Down (a desktop-only affordance) — the indicator flips.
    const dirText = () => page.locator('text=/^Typing:/').textContent();
    const dirBefore = await dirText();
    await page.keyboard.press(' ');
    await expect.poll(dirText).not.toBe(dirBefore);
  });
});
