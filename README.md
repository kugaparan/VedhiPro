# VedhiPro — Chemical Engineering Toolkit 🧪

> **வேதி** (*vedhi*) means "chemistry" in Tamil.

![VedhiPro banner](screenshots/banner.svg)

An offline-first, browser-based toolkit of **24 chemical-engineering tools with 130+ individual
calculators** — including an interactive **McCabe-Thiele distillation designer**, **reheat &
regenerative Rankine-cycle analyzers** with a **T–s diagram**, a **Mollier (h–s) chart**, an
interactive **psychrometric chart**, **pinch composite curves**, and an **AI assistant**.
Properties come from a hand-ported **IAPWS-IF97** steam library. No build step, no backend,
no login — pure HTML, CSS and JavaScript.

**🔗 Live demo:** https://YOUR-USERNAME.github.io/VedhiPro/
*(works after you enable GitHub Pages — see "Deploy" below)*

## 📸 Screenshots

> Add your own captures to the `screenshots/` folder (see `screenshots/README.txt`),
> then uncomment the lines below.

<!--
![Home](screenshots/home.png)
![McCabe-Thiele diagram](screenshots/mccabe.png)
![Mollier chart](screenshots/mollier.png)
![Rankine T-s diagram](screenshots/rankine.png)
-->

---

## ✨ Features

Each tool below is a multi-tab workspace — 130+ calculators in total.

**Thermodynamics & steam**
- **Steam tables** (IAPWS-IF97): saturation, quality, superheated, compressed liquid, internal
  energy, state ID, **turbine / isentropic expansion**, **throttling**, **boiler & condenser duty**,
  unit converter, and an interactive **Mollier (h–s) chart**
- **Thermodynamics**: heat duty, entropy, Gibbs, Joule–Thomson, **cubic EOS (PR/SRK) Z-factor**,
  **fugacity coefficient**, **binary VLE (Raoult)**
- **Psychrometrics & HVAC**: interactive **psychrometric chart**, altitude→pressure, heating/cooling,
  stream mixing, adiabatic humidification, drying, sensible/latent loads, cooling coil,
  **cooling tower**, **fresh-air mixing**, **RSHF**

**Fluids**
- **Pipe sizing & ΔP**: Darcy–Weisbach + Colebrook, minor (K-value) losses, velocity-vs-size table,
  **compressible-gas ΔP**
- **Pump head & power**: TDH, standard-motor sizing, **NPSH** + cavitation, pump/system curve,
  **affinity laws**, **series/parallel**, efficiency guide
- **Control valve**: liquid & **gas/choked** sizing, **characteristic curves**, **authority & cavitation**
- **Compressed air**: multistage power, receiver sizing, **leakage estimator & operating cost**

**Process**
- **Mass & energy balance**: stream mixing, **recycle/purge solver**, **separator**, **combustion** (air & flue gas)
- **Reactor / reaction engineering**: conversion, yield, selectivity, stoichiometry, Arrhenius,
  Batch/CSTR/PFR, **CSTRs in series**, **parallel reactions**, **RTD**
- **Heat exchanger**: LMTD sizing, ε-NTU, **shell-&-tube** (Kern + F-factor), **plate HX**
- **Heat transfer**: LMTD, U/fouling, **conduction (wall & cylinder)**, **fins**, **radiation**,
  **natural convection**, **transient (lumped)**
- **Pinch / HEN**: Problem Table targets + **composite & grand-composite curves**
- **Splitter & accumulation**: splitter, mixer network, residence time, tank sizing, surge dynamics, batch filling

**Separation**
- ⭐ **Distillation Designer** — VLE & T-x-y plots, material balance, an **interactive McCabe-Thiele
  diagram** with live sliders, FUG–Kirkbride shortcut design, reboiler/condenser duties, tray **and
  packed-column** sizing, economics and **reflux optimization**
- Shortcut distillation (FUG), membrane, adsorption + **breakthrough**, drying, evaporation,
  crystallization, **cake filtration**

**Energy & economics**
- ⭐ **Rankine analyzer** — regenerative cycle with extraction-pressure sweep **plus a reheat cycle
  with a T–s diagram** (IAPWS-IF97)
- Boiler efficiency, solar PV, CHP, CO₂, **heat-pump COP**, **ORC**, **battery sizing**, **wind**, **biomass**
- Process economics: NPV, IRR, ROI, payback, **equipment-cost scaling (six-tenths + CEPCI)**,
  utility cost, **inflation**

**Reference & AI**
- Aspen Plus helper (property-method picker, error interpreter, **block-selection guide**, wizards)
  + Aspen toolkit (unit converters, **stream-table formatter**)
- Utility calculators: unit converter, Reynolds, **Prandtl**, **Schmidt**, ideal gas, **vapour pressure**,
  **density**, **viscosity**
- 🤖 **AI assistant & tutor** — Q&A, exam/viva/formula-sheet/lab-report/PFD modes
  (bring-your-own Anthropic/OpenAI key, stored only in your browser)

---

## 🛠 Tech stack

- **HTML + CSS + vanilla JavaScript** — no framework, no build tools
- **HTML5 Canvas** for the McCabe-Thiele, Mollier, T–s, psychrometric, pump-curve and pinch charts
- Hand-ported **IAPWS-IF97** steam tables, **Colebrook–White** friction, **Problem Table Algorithm**,
  **Peng-Robinson / SRK** EOS, and the **FUG** shortcut method — all running locally

---

## 🚀 Run locally

No install needed — just open the page:

```bash
# Option 1: double-click index.html

# Option 2: serve it (recommended, avoids any file:// quirks)
python -m http.server 8000
# then open http://localhost:8000
```

---

## 🌐 Deploy free on GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Branch: **main**, folder: **/ (root)** → **Save**.
5. Wait ~1 minute, then your live site is at
   `https://YOUR-USERNAME.github.io/VedhiPro/`.
6. Update the **Live demo** link at the top of this README.

---

## ✅ Verified

Key algorithms were spot-checked against textbook / reference values:

| Check | VedhiPro | Reference |
|---|---|---|
| Steam enthalpy @ 3 MPa, 350 °C | 3116 kJ/kg | 3115.3 (IAPWS) |
| CO₂ compressibility Z (PR) @ 50 °C, 50 bar | 0.76 | ≈0.76 (gen. chart) |
| Reheat-cycle efficiency 8 MPa/480 °C → 1 MPa → 10 kPa | ~40 %, x≈0.94 | textbook range |
| McCabe-Thiele R_min (α=2.4) | 1.186 | 1.186 (analytic pinch) |
| Pinch targets (Linnhoff 4-stream) | Qh=20, Qc=60, pinch 90/80 °C | exact match |
| Methane stoichiometric air-fuel ratio | 17.2 | 17.2 |

---

## ⚠️ Disclaimer

Educational tool using standard correlations and simplifying assumptions. Always
verify against validated software before any real engineering decision.

---

## 👤 Author

**[Your Name]** — Chemical Engineering
[LinkedIn](https://www.linkedin.com/in/YOUR-HANDLE) · [GitHub](https://github.com/YOUR-USERNAME)

## 📄 License

MIT — see [LICENSE](LICENSE).
