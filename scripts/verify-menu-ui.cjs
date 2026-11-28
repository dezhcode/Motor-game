const { chromium: pw } = require(
  process.env.KAVIR_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
(async () => {
  let server;
  let testUrl = process.env.KAVIR_TEST_URL;
  if (!testUrl) {
    const http = require("node:http");
    const fs = require("node:fs");
    const path = require("node:path");
    const root = path.resolve(process.env.KAVIR_DIST_DIR || "dist");
    assert.ok(
      fs.existsSync(path.join(root, "index.html")),
      "Run npm run build before the production UI audit",
    );
    const prefix = "/Motor-game/";
    const types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".webp": "image/webp",
      ".png": "image/png",
      ".woff2": "font/woff2",
      ".svg": "image/svg+xml",
    };
    server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname.endsWith("/favicon.ico")) {
        res.writeHead(204).end();
        return;
      }
      if (!pathname.startsWith(prefix)) {
        res.writeHead(404).end();
        return;
      }
      const file = path.resolve(
        root,
        pathname.slice(prefix.length) || "index.html",
      );
      if (
        !file.startsWith(root + path.sep) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile()
      ) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
      });
      fs.createReadStream(file).pipe(res);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    testUrl = `http://127.0.0.1:${server.address().port}${prefix}`;
  }
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
  if (process.env.KAVIR_BROWSER_PROXY)
    launch.proxy = { server: process.env.KAVIR_BROWSER_PROXY };
  const browser = await pw.launch(launch);
  const errors = [],
    failed = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 844, height: 390 },
      hasTouch: true,
      deviceScaleFactor: 2,
      ignoreHTTPSErrors: !!process.env.KAVIR_BROWSER_PROXY,
    });
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) failed.push(r.url() + ":" + r.status());
    });
    await page.goto(testUrl);
    await page.locator(".loading-screen").waitFor({ state: "hidden" });
    const ready = async () => {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map((i) => i.decode().catch(() => {})),
        );
      });
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("canvas.bitmap-surface")]
            .filter((c) => c.getBoundingClientRect().width)
            .every(
              (c) =>
                c.dataset.imageState === "ready" ||
                c.dataset.imageState === "error",
            ),
        null,
        { timeout: 20000 },
      );
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
          if (r.width && r.height) {
            if (canvas.dataset.sliceRegions !== "9")
              out.push("surface is not nine-sliced");
            if (canvas.dataset.imageState !== "ready")
              out.push(
                "unpainted artwork: " +
                  getComputedStyle(canvas).backgroundImage,
              );
            else if (
              !canvas
                .getContext("2d")
                .getImageData(
                  Math.floor(canvas.width / 2),
                  Math.floor(canvas.height / 2),
                  1,
                  1,
                ).data[3]
            )
              out.push("blank artwork pixels");
          }
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
        .getByRole("button", { name: "شروع بازی", exact: true })
        .click();
      await audit("modes " + width);
      await page
        .getByRole("button", { name: "گاراژ و فروشگاه", exact: true })
        .click();
      await page
        .getByRole("button", { name: "نمایش موتور کویری", exact: true })
        .click();
      await audit("garage " + width);
      await page.getByRole("button", { name: "ارتقا", exact: true }).click();
      await audit("upgrades " + width);
      await page
        .getByRole("button", { name: "بازگشت به گاراژ", exact: true })
        .click();
      await page
        .getByRole("button", { name: "نمایش جیپ کویر", exact: true })
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
    // Seed only this isolated test browser; never grant currency in the product.
    const progress = () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("kavirsavar_garage_v1")),
      );
    const seed = async (state) => {
      // Stop the previous ride before replacing the isolated fixture.
      await page.goto(testUrl);
      await page.locator(".loading-screen").waitFor({ state: "hidden" });
      await page.evaluate(
        (s) => localStorage.setItem("kavirsavar_garage_v1", JSON.stringify(s)),
        state,
      );
      await page.reload();
      await page.locator(".loading-screen").waitFor({ state: "hidden" });
      await page
        .getByRole("button", { name: "گاراژ و فروشگاه", exact: true })
        .click();
    };
    await seed({
      version: 1,
      coins: 12450,
      owned: ["motorcycle", "jeep"],
      selected: "motorcycle",
    });
    await page.getByRole("button", { name: "ارتقا", exact: true }).click();
    await page
      .getByRole("button", { name: "ارتقای قدرت موتور", exact: true })
      .click();
    let saved = await progress();
    assert.equal(saved.coins, 12200);
    assert.equal(saved.upgrades.motorcycle.engine, 2);
    assert.deepEqual(saved.owned, ["motorcycle", "jeep"]);
    await page.reload();
    await page.locator(".loading-screen").waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "گاراژ و فروشگاه", exact: true })
      .click();
    await page.getByRole("button", { name: "ارتقا", exact: true }).click();
    assert.equal(
      await page
        .getByRole("meter", { name: "سطح قدرت موتور", exact: true })
        .getAttribute("aria-valuenow"),
      "2",
    );
    await page
      .getByRole("button", { name: "ارتقای باک بنزین", exact: true })
      .click();
    assert.equal((await progress()).coins, 11800);
    assert.equal((await progress()).upgrades.motorcycle.fuel, 2);
    console.log(
      "PASS upgrade costs, independent levels, legacy ownership and reload persistence",
    );
    await seed({
      version: 1,
      coins: 1,
      owned: ["motorcycle"],
      selected: "motorcycle",
    });
    await page.getByRole("button", { name: "ارتقا", exact: true }).click();
    for (const part of ["قدرت موتور", "لاستیک‌ها", "کمک‌فنر", "باک بنزین"])
      assert.equal(
        await page
          .getByRole("button", { name: "ارتقای " + part, exact: true })
          .isDisabled(),
        true,
      );
    await seed({
      version: 1,
      coins: 40000,
      owned: ["motorcycle"],
      selected: "motorcycle",
    });
    for (const [name, cost, id] of [
      ["موتور اسپرت", 8000, "sport"],
      ["باگی کویر", 25000, "buggy"],
    ]) {
      await page
        .getByRole("button", { name: "نمایش " + name, exact: true })
        .click();
      await page.locator(".garage-select").click();
      await page.getByRole("button", { name: "انصراف", exact: true }).click();
      const before = (await progress()).coins;
      await page.locator(".garage-select").click();
      await page
        .getByRole("button", { name: "خرید وسیله", exact: true })
        .click();
      saved = await progress();
      assert.equal(saved.coins, before - cost);
      assert.equal(saved.selected, id);
      assert.ok(saved.owned.includes(id));
    }
    console.log(
      "PASS unaffordable upgrades disabled; sport and buggy purchase cancellation, costs and selection",
    );
    await page.setViewportSize({ width: 844, height: 390 });
    for (const [id, name] of [
      ["motorcycle", "موتور کویری"],
      ["sport", "موتور اسپرت"],
      ["jeep", "جیپ کویر"],
      ["buggy", "باگی کویر"],
    ]) {
      await seed({
        version: 1,
        coins: 100,
        owned: ["motorcycle", "sport", "jeep", "buggy"],
        selected: id,
      });
      await page.getByRole("button", { name: "ارتقا", exact: true }).click();
      await page
        .getByRole("button", { name: "آزمایش وسیله", exact: true })
        .click();
      await page.locator(".painted-hud").waitFor();
      await page.waitForTimeout(700);
      const pedal = await page.locator(".art-ctrl-btn.throttle").boundingBox();
      await page.mouse.move(
        pedal.x + pedal.width / 2,
        pedal.y + pedal.height * 0.25,
      );
      assert.equal((await progress()).coins, 100, "fresh ride baseline");
      await page.mouse.down();
      await page.waitForFunction(
        () =>
          JSON.parse(localStorage.getItem("kavirsavar_garage_v1")).coins > 100,
        null,
        { timeout: 20000 },
      );
      await page.mouse.up();
      assert.ok(
        (await progress()).coins > 100,
        "Actual " + name + " ride must collect and persist coins",
      );
      await audit("actual race " + id);
      if (process.env.KAVIR_SCREENSHOT_DIR)
        await page.screenshot({
          path: process.env.KAVIR_SCREENSHOT_DIR + "/race-" + id + ".png",
        });
    }
    console.log("PASS all four vehicles launch, drive and bank real pickups");
    const alpha = await page.evaluate(async () => {
      const out = [];
      for (const name of ["sport-body", "buggy-body"]) {
        const img = new Image();
        img.src = new URL(
          "./assets/art/garage/" + name + ".webp",
          document.baseURI,
        ).href;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        for (const [x, y] of [
          [0, 0],
          [c.width - 1, 0],
          [0, c.height - 1],
          [c.width - 1, c.height - 1],
        ]) {
          if (ctx.getImageData(x, y, 1, 1).data[3] > 1)
            out.push(name + " has an opaque background corner");
        }
      }
      return out;
    });
    assert.deepEqual(alpha, [], alpha.join(" | "));
    console.log("PASS new vehicle sprite exterior alpha");
    assert.equal(errors.length, 0, errors.join(" | "));
    assert.equal(failed.length, 0, failed.join(" | "));
    console.log("PASS browser errors and assets");
  } finally {
    await browser.close();
    if (failed.length) console.error("Failed deployed assets:", failed);
    if (server) await new Promise((resolve) => server.close(resolve));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
