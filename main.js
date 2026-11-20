/* Chat Lost It: hero demo loop + signup form */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Hero demo ---------- */
  const chat = document.getElementById("chat");
  const clockEl = document.getElementById("demoClock");
  const statusEl = document.getElementById("demoStatus");
  const phone = document.getElementById("phone");
  const caps = document.getElementById("caps");
  const lineEl = document.getElementById("heatLine");
  const fillEl = document.getElementById("heatFill");

  if (chat && phone) {
    const names = ["vice_rat", "mxnty", "lowkeyloaf", "ShadowPengu", "deadeye_dee", "bigsoup44", "nocapjames", "kirasleeps", "tunaMelt", "glizzyguard", "papi_pixel", "hailstorm", "OnlyOats", "bruh_moment", "zestyclip"];
    const calm = ["this mission is so long", "go left go left", "chat is he lost", "bro took the scenic route", "the cops are right there", "first time in vice city?", "W stream", "what car is that", "the music in this game", "he's not gonna make it", "just drive normal", "who's here from tiktok", "heist time", "this map is huge"];
    const spam = ["KEKW KEKW KEKW", "NAH NO WAY", "CLIP IT", "OMEGALUL", "💀💀💀", "LMAOOOO", "CLIP THAT", "HE'S COOKED", "W W W W", "WHAT 😭", "ICANT", "BRO WHAT", "NAHHH"];

    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    let uptime = 2 * 3600 + 14 * 60 + 3;
    const fmt = (s) => {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
      return `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
    };

    const addMsg = (hot) => {
      const li = document.createElement("li");
      const b = document.createElement("b");
      b.className = "u" + (1 + Math.floor(Math.random() * 5));
      b.textContent = pick(names);
      li.appendChild(b);
      const t = document.createElement("span");
      t.textContent = hot ? pick(spam) : pick(calm);
      if (hot) t.className = "spam";
      li.appendChild(t);
      chat.appendChild(li);
      while (chat.children.length > 18) chat.removeChild(chat.firstChild);
    };

    /* heat graph: 60 points, trigger at 3.0 (y=26 in a 0..80 box) */
    const N = 60, MAX = 4.2;
    const heat = Array.from({ length: N }, () => 0.6 + Math.random() * 0.6);
    const y = (v) => 80 - (Math.min(v, MAX) / MAX) * 76;
    const draw = () => {
      const step = 300 / (N - 1);
      let d = "";
      heat.forEach((v, i) => { d += (i ? "L" : "M") + (i * step).toFixed(1) + " " + y(v).toFixed(1); });
      lineEl.setAttribute("d", d);
      fillEl.setAttribute("d", d + " L300 80 L0 80 Z");
    };

    const setStatus = (text, cls) => {
      statusEl.textContent = text;
      statusEl.className = "demo__status" + (cls ? " " + cls : "");
    };

    let capTimer = null;
    const runCaps = () => {
      const words = caps.querySelectorAll("span");
      let i = 0;
      clearInterval(capTimer);
      capTimer = setInterval(() => {
        words.forEach((w, j) => w.classList.toggle("on", j === i % words.length));
        i++;
      }, 420);
    };

    if (reduceMotion) {
      for (let i = 0; i < 9; i++) addMsg(i > 3);
      heat.forEach((_, i) => { if (i > 34 && i < 46) heat[i] = 1.2 + Math.sin(((i - 34) / 12) * Math.PI) * 2.6; });
      draw();
      caps.querySelectorAll("span")[2].classList.add("on");
      setStatus("Clip ready", "is-work");
      phone.classList.remove("is-empty");
      return initForm();
    }

    /* timeline for one loop, in ms */
    const CALM = 4500, SPIKE = 3000, WORK = 3600, READY = 6000;
    const CYCLE = CALM + SPIKE + WORK + READY;
    const work = [
      [0, "Cutting from the live buffer"],
      [900, "Transcribing"],
      [1800, "AI scoring the moment"],
      [2700, "Rendering 1080×1920"],
    ];

    let start = performance.now(), lastMsg = 0, lastHeat = 0, lastClock = 0, phase = "";
    let running = true;

    const reset = () => {
      phone.classList.add("is-empty");
      phone.classList.remove("is-ready");
      clearInterval(capTimer);
      setStatus("Watching chat");
    };
    reset();
    draw();

    const tick = (now) => {
      if (!running) return;
      const t = (now - start) % CYCLE;
      if (now - start >= CYCLE) { start = now - t; }

      let p, heatTarget, msgEvery;
      if (t < CALM) { p = "calm"; heatTarget = 0.6 + Math.random() * 0.8; msgEvery = 650; }
      else if (t < CALM + SPIKE) {
        p = "spike";
        const k = (t - CALM) / SPIKE;
        heatTarget = 1 + Math.sin(Math.min(k * 1.6, 1) * Math.PI / 2) * 3 + Math.random() * 0.25;
        msgEvery = 90;
      } else if (t < CALM + SPIKE + WORK) {
        p = "work"; heatTarget = 1.6 - ((t - CALM - SPIKE) / WORK) * 0.9 + Math.random() * 0.3; msgEvery = 320;
      } else { p = "ready"; heatTarget = 0.6 + Math.random() * 0.7; msgEvery = 700; }

      if (p !== phase) {
        phase = p;
        if (p === "calm") reset();
        if (p === "spike") setStatus("Chat lost it", "is-hot");
        if (p === "ready") {
          phone.classList.remove("is-empty");
          phone.classList.add("is-ready");
          setStatus("Clip ready", "is-work");
          runCaps();
        }
      }
      if (p === "work") {
        const wt = t - CALM - SPIKE;
        let label = work[0][1];
        for (const [at, l] of work) if (wt >= at) label = l;
        if (statusEl.textContent !== label) setStatus(label, "is-work");
      }

      if (now - lastMsg > msgEvery) { addMsg(p === "spike" || (p === "work" && Math.random() < 0.4)); lastMsg = now; }
      if (now - lastHeat > 160) {
        heat.shift();
        const prev = heat[heat.length - 1];
        heat.push(prev + (heatTarget - prev) * 0.45);
        draw();
        lastHeat = now;
      }
      /* stream clock: real time, but time-lapsed while the clip is being made (~2 min in 3.6 s) */
      const clockStep = p === "work" ? 30 : 1000;
      if (now - lastClock > clockStep) { uptime += 1; clockEl.textContent = fmt(uptime); lastClock = now; }

      requestAnimationFrame(tick);
    };

    /* pause when off-screen or tab hidden */
    const resume = () => { if (!running) { running = true; start = performance.now() - 0; phase = ""; requestAnimationFrame(tick); } };
    const pause = () => { running = false; };
    const demo = document.querySelector(".demo");
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? resume() : pause()))).observe(demo);
    }
    document.addEventListener("visibilitychange", () => (document.hidden ? pause() : resume()));

    for (let i = 0; i < 8; i++) addMsg(false);
    requestAnimationFrame(tick);
  }

  initForm();

  /* ---------- Signup form ---------- */
  function initForm() {
    const form = document.getElementById("signupForm");
    if (!form || form.dataset.ready) return;
    form.dataset.ready = "1";
    const status = document.getElementById("formStatus");
    const btn = document.getElementById("submitBtn");
    const loadedAt = Date.now();
    const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

    const say = (msg, kind) => { status.textContent = msg; status.className = "form__status" + (kind ? " is-" + kind : ""); };

    form.addEventListener("input", (e) => { if (e.target.getAttribute("aria-invalid") === "true") e.target.removeAttribute("aria-invalid"); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      Object.keys(data).forEach((k) => (data[k] = String(data[k]).trim()));

      const problems = [];
      const flag = (name, msg) => { form.elements[name].setAttribute("aria-invalid", "true"); problems.push([name, msg]); };
      if (!data.name) flag("name", "Add your name.");
      if (!emailOk(data.email || "")) flag("email", "Add an email we can reply to.");
      if (!data.channel) flag("channel", "Add a link to your channel.");
      if (problems.length) {
        say(problems.map((p) => p[1]).join(" "), "err");
        form.elements[problems[0][0]].focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = "Sending...";
      say("");
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, elapsedMs: Date.now() - loadedAt }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) throw new Error(body.error || "The server didn't accept the request.");
        form.classList.add("is-sent");
        say(`Request sent. We'll reply to ${data.email} within 24 hours.`, "ok");
      } catch (err) {
        say(`Your request didn't send: ${err.message} Try again, or DM @chatlostitgg on Instagram.`, "err");
        btn.disabled = false;
        btn.textContent = "Request my slot";
      }
    });
  }
})();
