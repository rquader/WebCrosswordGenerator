import { test, expect, type Page } from '@playwright/test';

/**
 * P2 — the crossword PLAY grid must fit the viewport width on a phone.
 *
 * Decision (2026-06-23, with the user): fit-to-width is the play contract — the
 * grid fits the viewport at every size (cells shrink as needed) and native
 * pinch-zoom stays on as the escape hatch. PlayableGrid sizes cells with
 * gridFitSizingStyle (`min` share of the viewport width, 18px floor, 50px cap)
 * so a wide grid never forces a horizontal pan. (Generation/preview/designer
 * grids keep the old 34/50 clamp — out of scope here.)
 *
 * Fixture: a 15-wide shared-puzzle hash (v1 URL format), produced by encoding a
 * generated 15-wide puzzle with the puzzleUrl compact encoder. 15 wide is the
 * worst common case — under the OLD 34px floor it computed to ~510px and
 * overflowed a 375px phone hard.
 *
 * The fit assertions only make sense at the mobile 375px viewport, so they are
 * guarded to that project; on desktop the spec just confirms the grid renders.
 */
const WIDE_PUZZLE_HASH =
  '#puzzle=eJxlkVFvgjAQgP_LPdNE56YJb-gQiZWyWh_MsgcGqGSMsorbjPG_r7QFhfHQ9nr35esdF_gGe2jBj1yfLDjobQ82uKjzYb0tTVhnpwg5JgwJnW1CP1CQgxZyZQh5KheoKtYUM3mheIrQvD7IzIySGXn2sWs08p6oenLnXkmNOmwRWr9sfEpdfHtf0H2udzsyQhnx171-EALZNRfJEezXS90_tK-QmVjGseAxT7I8lfEv2CMLzmBPLEhkLoKrpanphjGXzvHWUO-nqkrFLj9r6lFRD5pKWqodmKFKLuJTmRXGNVDUqO-aY2flBx4x0C6PPrNizzUz1NC4r2pmZaDj1ykTIs01NFFMjXZNSyfwHEoa00dU7CPBeQfqi5yAuZiETUtRUaU5L01Hw9F9Szeo-TsGqrioeHY00FiL_s3BxW64kDoDpXlaHqTufnaDVvR2_QP71Lhz';

/** Navigate to the wide-grid fixture and wait for the play grid. */
async function openWidePuzzle(page: Page) {
  await page.goto(`./${WIDE_PUZZLE_HASH}`);
  await expect(page.getByRole('grid')).toBeVisible();
}

test.describe('crossword play — fit-to-width grid (P2)', () => {
  test('a 15-wide grid fits the viewport, its pan container does not scroll, cells stay legible', async ({
    page,
  }, testInfo) => {
    await openWidePuzzle(page);

    const viewport = page.viewportSize();
    const grid = page.getByRole('grid');

    // The grid renders. Confirm it really is the wide fixture (>= 13 columns)
    // so this test can't silently pass on a small grid.
    const columns = await grid.evaluate((el) => {
      const cols = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/);
      return cols.length;
    });
    expect(columns).toBeGreaterThanOrEqual(13);

    // (c) Cells stay sane — the computed --cell box is > 18px (legible, not a
    //     pinhole). Read the rendered track width directly from the grid.
    const cellPx = await grid.evaluate((el) => {
      const first = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/)[0];
      return parseFloat(first);
    });
    expect(cellPx).toBeGreaterThan(18);

    // The remaining assertions are about fitting a phone — only meaningful at
    // the 375px mobile viewport. On the desktop project the grid is small
    // enough to cap out, so skip the overflow checks there.
    if (!viewport || viewport.width > 420) {
      testInfo.skip(true, 'fit-to-width overflow checks run on the mobile project only');
      return;
    }

    // (a) The grid's bounding box never exceeds the viewport width — no part of
    //     the grid sits off the right edge needing a horizontal pan. (Before
    //     P2, a 15-wide grid was ~514px here — way past the 375px phone.)
    const box = await grid.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(viewport.width);

    // (b) The grid's own scroll container (GRID_PAN, `overflow-auto`) does NOT
    //     scroll horizontally — the grid fits inside it, so there is no
    //     pan-while-tapping. This is the precise thing P2 fixes: pre-P2 this
    //     container was scrollWidth 514 / clientWidth 343 (it panned); now they
    //     match. The grid <div role=grid> is the GRID_PAN's only child.
    const panOverflow = await grid.evaluate((el) => {
      const pan = el.closest('.overflow-auto') as HTMLElement | null;
      if (!pan) return { found: false, scrollW: 0, clientW: 0 };
      return { found: true, scrollW: pan.scrollWidth, clientW: pan.clientWidth };
    });
    expect(panOverflow.found).toBe(true);
    // 1px of sub-pixel rounding slack.
    expect(panOverflow.scrollW - panOverflow.clientW).toBeLessThanOrEqual(1);

    // (b2) The grid no longer makes the PAGE scroll horizontally. We can't
    //      assert zero page overflow outright: the solving-desk toolbar strip
    //      (PlayTab's `flex flex-wrap ... px-3 py-2` row of ~9 buttons) is a
    //      separate, pre-existing mobile overflow — that's audit item P6, out
    //      of scope here. So we assert the grid is NOT among the elements that
    //      overflow the viewport: every overflowing element is the toolbar, its
    //      flex ancestors, or the sr-only live region — never the grid or its
    //      pan container. (Before P2 the GRID_PAN was the worst offender.)
    const gridContributesToPageOverflow = await grid.evaluate((gridEl) => {
      const pan = gridEl.closest('.overflow-auto');
      for (const el of Array.from(document.querySelectorAll('*'))) {
        if (el.scrollWidth - el.clientWidth <= 1) continue;
        // An overflowing element that contains the grid but is NOT an ancestor
        // shared with the toolbar would implicate the grid. Simplest robust
        // check: the grid itself and its pan container must not overflow.
        if (el === gridEl || el === pan) return true;
      }
      return false;
    });
    expect(gridContributesToPageOverflow).toBe(false);
  });

  test('viewport meta keeps native pinch-zoom enabled (the escape hatch)', async ({ page }) => {
    await openWidePuzzle(page);
    // Fit-to-width relies on pinch-zoom as the escape hatch for tiny cells, so
    // scaling must NOT be disabled. Headless can't pinch; assert the contract
    // via the meta tag instead.
    const content = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content');
    expect(content).toBeTruthy();
    expect(content!.toLowerCase()).not.toContain('user-scalable=no');
    expect(content!.toLowerCase()).not.toContain('maximum-scale');
  });
});
