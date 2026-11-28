const { chromium: pw } = require(
  process.env.KAVIR_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
(async () => {
  const server = require("node:child_process").spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5182"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (d.toString().includes("ready")) resolve();
    });
    server.on("exit", reject);
  });
  let launch = { headless: true };
  if (process.env.KAVIR_CHROMIUM_MODULE) {
    const { default: c } = await import(process.env.KAVIR_CHROMIUM_MODULE);
    launch = {
      ...launch,
      executablePath: await c.executablePath(),
      args: c.args,
    };
  } else if (process.env.KAVIR_CHROMIUM_PATH)
    launch.executablePath = process.env.KAVIR_CHROMIUM_PATH;
  const browser = await pw.launch(launch);
  const errors = [],
    failed = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 844, height: 390 },
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) failed.push(r.url() + ":" + r.status());
    });
    await page.goto("http://127.0.0.1:5182");
    await page.locator(".loading-screen").waitFor({ state: "hidden" });
    const ready = async () => {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map((i) => i.decode().catch(() => {})),
        );
      });
      await page.waitForTimeout(150);
    };
    const audit = async (label) => {
      await ready();
      const problems = await page.evaluate(() => {
        const out = [];
        const metric = document.createElement("canvas").getContext("2d");
        for (const copy of document.querySelectorAll(".control-copy")) {
          const r = copy.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          let owner = copy.parentElement;
          while (owner && !owner.querySelector(":scope > .bitmap-surface"))
            owner = owner.parentElement;
          if (!owner) continue;
          const box = owner.getBoundingClientRect();
          const style = getComputedStyle(copy);
          const scale = r.height / parseFloat(style.lineHeight);
          metric.font =
            style.fontWeight + " " + style.fontSize + " " + style.fontFamily;
          const m = metric.measureText(copy.textContent);
          const delta =
            (m.fontBoundingBoxAscent -
              m.fontBoundingBoxDescent -
              (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent)) /
            2;
          const inkY = r.y + r.height / 2 + delta * scale,
            inkH =
              (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) * scale;
          if (
            r.left < box.left + 1 ||
            r.right > box.right - 1 ||
            inkY - inkH / 2 < box.top + 1 ||
            inkY + inkH / 2 > box.bottom - 1
          )
            out.push(
              "text outside " + owner.className + ": " + copy.textContent,
            );
          const group = copy.closest(".control-content");
          if (group) {
            const g = group.getBoundingClientRect();
            if (
              Math.abs(g.left + g.width / 2 - (box.left + box.width / 2)) > 1.5
            )
              out.push("group not horizontally centered " + copy.textContent);
            if (Math.abs(inkY - (box.top + box.height / 2)) > 2)
              out.push(
                "ink not vertically centered " +
                  copy.textContent +
                  " " +
                  (inkY - (box.top + box.height / 2)),
              );
          }
        }
        for (const canvas of document.querySelectorAll(
          "canvas.bitmap-surface",
        )) {
          const r = canvas.getBoundingClientRect();
          if (
            r.width &&
            r.height &&
            (canvas.width < r.width * devicePixelRatio - 2 ||
              canvas.height < r.height * devicePixelRatio - 2)
          )
            out.push("insufficient raster resolution");
        }
        const stage = document
          .querySelector(".menu-layout")
          ?.getBoundingClientRect();
        if (
          stage &&
          (stage.left < -0.5 ||
            stage.top < -0.5 ||
            stage.right > innerWidth + 0.5 ||
            stage.bottom > innerHeight + 0.5)
        )
          out.push("stage outside viewport");
        const bike = document
            .querySelector(".garage-vehicle-display")
            ?.getBoundingClientRect(),
          cards = document
            .querySelector(".vehicle-carousel")
            ?.getBoundingClientRect();
        if (bike && cards && bike.bottom > cards.top + 1)
          out.push("vehicle display overlaps cards");
        return out;
      });
      assert.deepEqual(problems, [], label + ": " + problems.join(" | "));
      console.log(
        "PASS text containment, optical centering, raster density and bounds: " +
          label,
      );
    };
    for (const [width, height] of [
      [640, 320],
      [780, 360],
      [844, 390],
      [960, 432],
      [1280, 720],
      [1536, 691],
    ]) {
      await page.setViewportSize({ width, height });
      await audit("home " + width);
      await page
        .getByRole("button", { name: "حالت بازی", exact: true })
        .click();
      await audit("modes " + width);
      await page
        .getByRole("button", { name: "گاراژ و فروشگاه", exact: true })
        .click();
      await audit("garage " + width);
      await page
        .getByRole("button", { name: "وسیله بعدی", exact: true })
        .click();
      await audit("jeep " + width);
      await page
        .locator(".menu-header-actions")
        .getByRole("button", { name: "بازگشت به خانه", exact: true })
        .click();
      await page.getByRole("button", { name: "رکورد من", exact: true }).click();
      await audit("records " + width);
      await page.getByRole("button", { name: "خانه", exact: true }).click();
    }
    const button = page.getByRole("button", { name: "شروع بازی", exact: true });
    await ready();
    const box = await button.boundingBox();
    const normal = await button
      .locator("canvas")
      .evaluate((c) => c.toDataURL());
    await button.hover();
    await page.mouse.down();
    await page.waitForTimeout(150);
    const pressed = await button
      .locator("canvas")
      .evaluate((c) => c.toDataURL());
    assert.notEqual(
      normal,
      pressed,
      "pressed texture must change actual raster pixels",
    );
    assert.deepEqual(await button.boundingBox(), box);
    await audit("pressed primary");
    await page.mouse.up();
    await page.getByRole("button", { name: "شروع مسیر", exact: true }).click();
    await page.locator(".painted-hud").waitFor();
    await ready();
    await page.getByRole("button", { name: "توقف", exact: true }).click();
    await audit("pause");
    await page.getByRole("button", { name: "تنظیمات", exact: true }).click();
    await audit("settings");
    assert.equal(errors.length, 0, errors.join(" | "));
    assert.equal(failed.length, 0, failed.join(" | "));
    console.log("PASS browser errors and assets");
  } finally {
    await browser.close();
    server.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
