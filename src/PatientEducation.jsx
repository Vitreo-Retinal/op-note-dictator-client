import { useState, useMemo } from "react";

// ── Styles (matches App.jsx theme) ─────────────────────────────────
const S = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  muted: "#64748b",
  text: "#e2e8f0",
  bright: "#f1f5f9",
  accent: "#6366f1",
  accentLight: "#a5b4fc",
  green: "#4ade80",
  amber: "#f59e0b",
  font: "Georgia, serif",
  mono: "monospace",
};

// ── Categories ─────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "injection", label: "Injections" },
  { id: "procedure", label: "Procedures" },
  { id: "condition", label: "Conditions" },
];

// ── Handout library ────────────────────────────────────────────────
const HANDOUTS = [
  // ── Injection Info ──
  {
    id: "inject-prep",
    category: "injection",
    title: "Preparing for Your Eye Injection",
    tags: ["injection", "prep"],
    content: `PREPARING FOR YOUR EYE INJECTION

What to Expect
Your doctor has recommended an intravitreal injection — a quick, in-office procedure where medication is placed directly inside your eye. The injection itself takes only a few seconds.

Before Your Appointment
• Continue all regular medications unless your doctor says otherwise.
• You may eat and drink normally before your appointment.
• Arrange a ride if you feel more comfortable, though most patients drive themselves.
• You do NOT need to stop blood thinners (aspirin, warfarin, Eliquis, etc.) for eye injections.

What Happens During the Injection
1. Numbing drops and/or gel are applied — you should feel little to no pain.
2. Your eye and eyelids are cleaned with an antiseptic (betadine).
3. A small speculum gently holds your eyelids open.
4. The injection is given through the white part of the eye (sclera).
5. The entire process takes about 5–10 minutes.

Common Sensations
• Mild pressure or a brief pinch during the injection.
• Temporary blurry vision for several hours.
• A small red spot on the white of your eye (subconjunctival hemorrhage) — this is harmless and resolves on its own.
• Floaters or tiny bubbles in your vision — these usually clear within a day or two.

Call Your Doctor If You Experience
• Increasing pain after the first day.
• Significant vision loss.
• Increasing redness that worsens after 2 days.
• Discharge or pus from the eye.
• Flashing lights or a curtain/shadow over your vision.`
  },
  {
    id: "inject-post",
    category: "injection",
    title: "After Your Eye Injection — Post-Injection Care",
    tags: ["injection", "post-op", "care"],
    content: `AFTER YOUR EYE INJECTION — POST-INJECTION CARE

Immediately After
• You may resume normal activities right away, including reading, watching TV, and using your phone.
• Mild discomfort, scratchiness, or tearing is normal for 1–2 days.
• You can use artificial tears (preservative-free) for comfort.

The First 48 Hours
• Avoid rubbing your eye.
• Avoid swimming, hot tubs, or submerging your face in water for 48 hours.
• You may shower and wash your face gently — just avoid direct water pressure to the eye.
• It is okay to sleep on either side.

Your Medications
• Continue all your regular eye drops and medications unless told otherwise.
• If you were given antibiotic drops, use them as directed (typically 4 times a day for 3–4 days).

What's Normal
• A small red spot (blood) on the white of your eye — harmless and clears in 1–2 weeks.
• Floaters or tiny bubbles — usually resolve within a day or two.
• Mild scratchy sensation — improves within 24 hours.

Warning Signs — Call Us Immediately If You Have
• PAIN that is severe or worsening after the first day.
• VISION LOSS — significant decrease from your baseline.
• INCREASING REDNESS after the first 2 days.
• DISCHARGE — any yellow or green pus.
• FLASHES or a CURTAIN/SHADOW in your vision.

Contact Information
If you have concerns, call your retina doctor's office. After hours, the answering service can reach the on-call physician.`
  },
  {
    id: "inject-faq",
    category: "injection",
    title: "Eye Injection FAQ — Common Questions",
    tags: ["injection", "FAQ"],
    content: `EYE INJECTION FAQ — COMMON QUESTIONS

Q: Will the injection hurt?
A: Most patients feel only brief pressure or a mild pinch. Numbing drops are always used, and many patients say it is much less uncomfortable than they expected.

Q: How often will I need injections?
A: This depends on your condition and how you respond to treatment. Some patients start with monthly injections; over time, your doctor may be able to extend the interval. Newer medications (like Vabysmo) may allow injections every 2–4 months.

Q: Can I drive myself home?
A: Most patients can drive after their injection. Your vision may be a little blurry for a few hours, so arrange a ride if that concerns you.

Q: Do I need to stop my blood thinners?
A: No. Do NOT stop aspirin, warfarin (Coumadin), Eliquis, Xarelto, or any blood thinner for eye injections. The risk of stopping these medications is greater than the small risk of a bleed in the eye.

Q: Why do I see floaters or bubbles after the injection?
A: The medication or a small air bubble can cause temporary floaters. These typically resolve within a day or two.

Q: What medications are used for injections?
A: Common retina injection medications include Eylea (aflibercept), Avastin (bevacizumab), Lucentis (ranibizumab), and Vabysmo (faricimab). Your doctor will choose the best one for your condition and insurance coverage.

Q: Is there anything I should avoid after the injection?
A: Avoid rubbing the eye, swimming, or submerging your face in water for 48 hours. Otherwise, you can resume all normal activities.

Q: What are the risks of eye injections?
A: Serious complications are rare. The most serious risk is infection inside the eye (endophthalmitis), which occurs in less than 1 in 2,000 injections. This is why the eye is carefully cleaned with betadine before every injection. Other rare risks include retinal detachment, bleeding, and increased eye pressure.`
  },

  {
    id: "inject-drops",
    category: "injection",
    title: "Eye Drop & Medication Schedule",
    tags: ["drops", "medication", "schedule", "post-op"],
    content: `EYE DROP & MEDICATION SCHEDULE

Why Eye Drops Matter
After eye procedures or injections, your doctor may prescribe eye drops to prevent infection and reduce inflammation. Using them correctly and on schedule is important for your healing.

General Tips for Using Eye Drops
• Wash your hands before putting in drops.
• Tilt your head back and pull down your lower eyelid to create a small pocket.
• Hold the bottle close to your eye (but don't touch your eye with the tip).
• Squeeze one drop into the pocket. Close your eye gently — don't blink hard.
• If using more than one drop at the same time, wait at least 5 minutes between different drops.
• If you also use artificial tears, put them in LAST (at least 5 minutes after your medicated drops).
• Keep drops at room temperature unless your doctor says otherwise.

Common Post-Procedure Drop Schedules

AFTER EYE INJECTION (if prescribed):
• Antibiotic drop (e.g., ofloxacin, moxifloxacin): 4 times a day for 3 days, starting the day of the injection.

AFTER CATARACT SURGERY (typical):
Week 1–2:
• Antibiotic drop: 4 times a day
• Steroid drop (e.g., prednisolone): 4 times a day
• NSAID drop (e.g., ketorolac, bromfenac): 2–4 times a day (or as directed)

Week 3–4:
• Taper steroid to 3 times a day, then 2 times a day (as directed)
• Continue NSAID as directed
• Stop antibiotic after 1–2 weeks (as directed)

AFTER VITRECTOMY (typical):
• Antibiotic drop: 4 times a day for 1–2 weeks
• Steroid drop: 4 times a day, then taper over 4–6 weeks
• Dilating drop (e.g., atropine): as directed by your surgeon

NOTE: Your specific schedule may differ. Always follow the instructions given by YOUR doctor. This is a general guide.

Helpful Reminders
• Set phone alarms for each drop time.
• Keep a simple checklist on your refrigerator.
• Bring all your eye drops to every appointment so your doctor can review them.
• If you run out of drops before your next visit, call your doctor's office for a refill.
• If you miss a dose, put the drop in as soon as you remember, then resume your regular schedule.

Questions?
If you are unsure about your drop schedule, call your doctor's office. It is better to ask than to guess.`
  },

  // ── Procedures ──
  {
    id: "proc-prp",
    category: "procedure",
    title: "Panretinal Photocoagulation (PRP) Laser",
    tags: ["laser", "PRP", "diabetic"],
    content: `PANRETINAL PHOTOCOAGULATION (PRP) LASER

What Is PRP Laser?
PRP is a laser treatment used to treat proliferative diabetic retinopathy — a condition where abnormal new blood vessels grow on the retina. These fragile vessels can bleed and cause severe vision loss. PRP laser helps these abnormal vessels shrink and prevents new ones from forming.

Before the Procedure
• Your pupils will be dilated with eye drops (allow 20–30 minutes).
• Numbing drops or a local anesthetic may be applied.
• The procedure is performed in the office.

During the Procedure
• You sit at a special laser machine (similar to the slit lamp used during exams).
• A contact lens is placed on your eye to focus the laser.
• You will see bright flashes of light and may feel mild discomfort or a dull ache.
• Treatment takes 10–20 minutes per session. Sometimes PRP is done in 2–3 sessions.

After the Procedure
• Your vision will be blurry for several hours (from dilation and the laser).
• You may have a mild headache or aching around the eye — over-the-counter pain relievers can help.
• Night vision and peripheral (side) vision may be somewhat reduced — this is an expected trade-off to protect your central vision.
• Arrange a ride home, as your pupils will be dilated.

What to Watch For
• Significant vision loss.
• New floaters or flashing lights.
• Pain that does not improve with over-the-counter medication.

Follow-Up
• Your doctor will schedule a follow-up to assess the response, usually in 4–6 weeks.
• Additional laser sessions may be needed.`
  },
  {
    id: "proc-laser-tear",
    category: "procedure",
    title: "Laser Treatment for Retinal Tears",
    tags: ["laser", "retinal tear", "retinopexy", "prevention"],
    content: `LASER TREATMENT FOR RETINAL TEARS

What Is Laser Retinopexy?
Laser retinopexy is a procedure used to seal a retinal tear before it can progress to a retinal detachment. The laser creates small burns around the tear that form scar tissue, acting like a "spot weld" to hold the retina in place.

Why Is This Important?
A retinal tear left untreated can allow fluid to seep underneath the retina, causing a retinal detachment — a serious condition that requires surgery and can lead to permanent vision loss. Treating a tear with laser is much simpler than treating a full detachment.

Before the Procedure
• Your pupils will be dilated with eye drops.
• The procedure is performed in the office.
• No fasting or special preparation is needed.

During the Procedure
• You sit at a laser machine (similar to the slit lamp used for eye exams).
• A contact lens is placed on your eye.
• You will see bright flashes and may feel a mild ache or pinch.
• Treatment takes about 5–15 minutes.

After the Procedure
• Your vision will be blurry for several hours from dilation.
• Mild discomfort or headache is normal and resolves quickly.
• You can resume normal activities immediately.
• The laser adhesion takes about 1–2 weeks to fully strengthen.

Precautions for the First 1–2 Weeks
• Avoid very heavy lifting or straining.
• Avoid high-impact activities (contact sports, roller coasters).
• Otherwise, normal activity is fine.

Warning Signs — Call Immediately If
• New flashes of light.
• A sudden increase in floaters.
• A shadow or curtain in your vision.
These could indicate the tear has extended or a detachment is developing despite the laser.

Follow-Up
• Your doctor will recheck your eye in 1–4 weeks to confirm the laser seal is holding.`
  },
  {
    id: "proc-fa",
    category: "procedure",
    title: "Fluorescein Angiography (FA)",
    tags: ["FA", "angiography", "fluorescein", "dye test", "imaging"],
    content: `FLUORESCEIN ANGIOGRAPHY (FA)

What Is Fluorescein Angiography?
Fluorescein angiography is a diagnostic test that uses a special dye and camera to photograph the blood vessels in your retina. It helps your doctor identify leaking vessels, blocked vessels, abnormal new vessel growth, and other problems.

Why Is This Test Done?
Your doctor may order this test to evaluate conditions such as:
• Diabetic retinopathy
• Macular degeneration (wet AMD)
• Retinal vein occlusion
• Macular edema
• Unexplained vision loss
• Tumors or inflammation inside the eye

Before the Test
• Your pupils will be dilated.
• Inform your doctor if you have any allergies, particularly to dyes or iodine.
• You may eat and drink normally.
• The test takes about 15–30 minutes total.

During the Test
• A small IV line or butterfly needle is placed in your arm or hand.
• Fluorescein dye (a bright yellow-orange dye) is injected into the vein.
• As the dye travels through your bloodstream to your eyes (about 10–15 seconds), a special camera takes rapid photographs of your retina.
• Photos are taken over about 5–10 minutes as the dye circulates.

What to Expect After
• Your skin may appear slightly yellow/orange for several hours — this is normal.
• Your urine will be bright orange/yellow for 24–48 hours — this is the dye being filtered by your kidneys and is completely normal.
• Your vision will be blurry from dilation for several hours.
• Mild nausea during the injection is common and brief.

Risks
• Nausea: Brief queasiness occurs in about 5% of patients.
• Allergic reaction: Mild reactions (hives, itching) are uncommon. Severe allergic reactions are very rare (approximately 1 in 200,000).
• Skin infiltration: If the dye leaks from the IV site, it can cause temporary burning and yellow discoloration at the site. This resolves on its own.

Important Notes
• This test uses fluorescein dye, which is NOT the same as iodine-based contrast used for CT scans. If you are allergic to CT contrast or shellfish, you can still have this test (though please inform your doctor of all allergies).
• This test does NOT use radiation.`
  },
  {
    id: "proc-pdt",
    category: "procedure",
    title: "Photodynamic Therapy (PDT)",
    tags: ["PDT", "Visudyne", "verteporfin", "laser", "CSR"],
    content: `PHOTODYNAMIC THERAPY (PDT)

What Is PDT?
Photodynamic therapy (PDT) is a two-step treatment that uses a light-sensitive medication (verteporfin/Visudyne) and a low-energy laser to treat abnormal blood vessels or fluid leakage in the retina. It is commonly used for conditions such as central serous retinopathy (CSR), certain types of wet AMD (polypoidal choroidal vasculopathy), and other choroidal conditions.

How It Works
1. A medication called verteporfin (Visudyne) is infused into your vein over 10 minutes.
2. The medication collects in the abnormal blood vessels in your eye.
3. A special low-energy laser is then applied to the area, which activates the medication.
4. The activated medication damages only the targeted abnormal vessels, while sparing surrounding healthy tissue.

Before the Procedure
• An IV line will be placed in your arm.
• Your pupils will be dilated.
• The entire procedure (infusion + laser) takes about 30 minutes.
• You may eat and drink normally beforehand.

During the Procedure
• The verteporfin infusion runs for 10 minutes.
• Five minutes after the infusion ends, the doctor applies the laser through a contact lens on your eye.
• The laser application takes about 83 seconds.
• You should feel no pain during the laser.

After the Procedure — IMPORTANT SUN PRECAUTIONS
• The verteporfin medication makes your skin and eyes VERY sensitive to sunlight for 48 hours.
• For 48 HOURS after treatment, you MUST:
  — Avoid direct sunlight and bright indoor lights.
  — Wear dark sunglasses, long sleeves, pants, a wide-brimmed hat, and gloves if you go outside.
  — Do NOT sunbathe or sit near uncovered windows.
  — Regular indoor lighting (lamps, overhead lights) is fine.
  — Your car's windshield does NOT provide enough protection — limit driving.
• After 48 hours, you can gradually resume normal sun exposure.

Why Sun Precautions Matter
The medication remains in your bloodstream for about 48 hours. If your skin is exposed to sunlight during this time, the medication can activate and cause a severe sunburn-like reaction.

Follow-Up
• Your doctor will check your response to treatment at a follow-up visit, typically in 4–6 weeks.
• Some patients need repeat PDT treatments.
• PDT may be combined with eye injections for best results.`
  },
  {
    id: "proc-buckle",
    category: "procedure",
    title: "Scleral Buckle Surgery",
    tags: ["scleral buckle", "retinal detachment", "surgery"],
    content: `SCLERAL BUCKLE SURGERY

What Is a Scleral Buckle?
A scleral buckle is a surgical procedure used to repair a retinal detachment. A small silicone band is sewn onto the outside of the eye (around the sclera, the white wall of the eye). This band gently pushes the wall of the eye inward, bringing it back into contact with the detached retina so it can reattach and heal.

When Is It Used?
• Scleral buckle is often used for retinal detachments caused by retinal tears, especially in younger patients or those who have not had cataract surgery.
• It may be used alone or in combination with vitrectomy, laser, or cryotherapy (freezing treatment).

Before Surgery
• The procedure is performed in the operating room under local or general anesthesia.
• Follow fasting instructions — typically nothing to eat or drink after midnight.
• Arrange transportation home.
• Continue regular medications unless told otherwise.

During Surgery
• The surgeon identifies the retinal tear(s) using indirect ophthalmoscopy.
• Cryotherapy (freezing) is applied to seal the retinal tear(s).
• A silicone band or sponge is sewn onto the outside of the eye in the area of the tear.
• Fluid under the retina may be drained.
• The band stays in place permanently in most cases (it is not visible and you will not feel it once healed).
• Surgery takes approximately 1–2 hours.

After Surgery
• You will have an eye patch for 1 day.
• Use prescribed eye drops (antibiotic and anti-inflammatory) as directed.
• Pain is usually mild to moderate — over-the-counter pain medication or a prescribed pain reliever will help.
• Your eye will be red and swollen for 1–2 weeks.
• Vision will be blurry initially — improvement is gradual over weeks to months.

Activity Restrictions
• No heavy lifting (>10 lbs) for 2–4 weeks.
• Avoid bending at the waist — bend at the knees instead.
• Sleep with your head elevated or on the side your doctor recommends.
• No swimming for 4 weeks.
• You may watch TV, read, and use your phone — these activities do not harm the eye.

What to Expect During Recovery
• The eye will be red and tender for 1–2 weeks.
• Double vision is common in the first few weeks (from swelling around the eye muscles) and usually resolves.
• Best final vision may take 3–6 months to achieve.
• If a gas bubble was also placed, you cannot fly until it dissolves.

Call Your Doctor If
• Pain that is severe or worsening despite medication.
• Significant decrease in vision.
• New flashes or increase in floaters.
• A new shadow or curtain in your vision.
• Fever, excessive redness, or discharge.

Success Rate
• Scleral buckle surgery successfully reattaches the retina in approximately 85–90% of cases with a single operation. Some cases may require additional surgery.`
  },
  {
    id: "proc-vitrectomy",
    category: "procedure",
    title: "Vitrectomy Surgery — What to Expect",
    tags: ["surgery", "vitrectomy", "OR"],
    content: `VITRECTOMY SURGERY — WHAT TO EXPECT

What Is a Vitrectomy?
A vitrectomy is a surgical procedure in which the vitreous gel (the clear jelly that fills the eye) is removed. This allows your surgeon to access and repair problems at the back of the eye, such as retinal detachments, macular holes, epiretinal membranes, vitreous hemorrhage, or other retinal conditions.

Before Surgery
• You will have a pre-operative assessment and may need blood work or medical clearance.
• Follow fasting instructions — typically nothing to eat or drink after midnight.
• Continue your regular medications unless your surgeon advises otherwise.
• Arrange transportation — you cannot drive yourself home.

During Surgery
• The procedure is performed in the operating room under local or general anesthesia.
• Three tiny incisions (less than 1 mm) are made in the white part of the eye.
• The vitreous gel is removed and replaced with saline, air, or a gas bubble, depending on your condition.
• Surgery typically takes 30 minutes to 2 hours depending on complexity.

After Surgery
• You may need to maintain a specific head position (face-down positioning) if a gas bubble was used — your surgeon will give specific instructions.
• Use prescribed eye drops as directed (antibiotic and anti-inflammatory drops).
• Wear the eye shield at night for 1–2 weeks.
• Avoid heavy lifting, straining, or bending at the waist for 2 weeks.

If a Gas Bubble Was Placed
• You CANNOT fly in an airplane until the gas bubble dissolves (usually 2–8 weeks depending on the type of gas). Flying with a gas bubble can cause dangerously high eye pressure.
• Inform any anesthesiologist if you need surgery elsewhere while the gas bubble is present — certain anesthetic agents (nitrous oxide) must be avoided.
• The bubble gradually shrinks and is replaced by your eye's own fluid.

Recovery
• Vision improvement is gradual — it may take weeks to months for your best vision to return.
• Mild discomfort, redness, and tearing are normal for the first week.
• Most patients return to light activities within a few days, and normal activities within 2–4 weeks.

Call Your Doctor If You Experience
• Severe pain not relieved by prescribed medication.
• Significant vision loss.
• Increasing redness or discharge.
• Flashes, new floaters, or a shadow/curtain in your vision.`
  },

  // ── Conditions ──
  {
    id: "cond-wet-amd",
    category: "condition",
    title: "Wet Age-Related Macular Degeneration (Wet AMD)",
    tags: ["AMD", "wet", "macular degeneration", "anti-VEGF"],
    content: `WET AGE-RELATED MACULAR DEGENERATION (WET AMD)

What Is Wet AMD?
Age-related macular degeneration (AMD) affects the macula — the central part of the retina responsible for sharp, detailed vision. In wet AMD, abnormal blood vessels grow under the retina and leak fluid or blood, causing rapid vision loss if untreated.

Symptoms
• Blurry or distorted central vision.
• Straight lines appear wavy or bent (metamorphopsia).
• A dark or empty spot in the center of your vision.
• Difficulty reading, recognizing faces, or driving.
• Symptoms can develop suddenly.

Diagnosis
• Your retina specialist uses optical coherence tomography (OCT) imaging — a painless scan that shows fluid and swelling in the retina.
• Fluorescein angiography may be performed — a dye is injected into your arm and photographs are taken of the blood vessels in your eye.

Treatment
• The primary treatment is anti-VEGF injections — medications injected directly into the eye that block the growth of abnormal blood vessels and reduce leakage.
• Common medications: Eylea (aflibercept), Avastin (bevacizumab), Lucentis (ranibizumab), Vabysmo (faricimab).
• Treatment typically starts with monthly injections, then may be extended based on your response.
• Early and consistent treatment gives the best chance of preserving vision.

What You Can Do
• Keep all scheduled appointments — even if your vision feels stable, the disease may still be active.
• Use the Amsler grid daily to monitor for changes (your doctor will provide one).
• Take AREDS2 vitamins as recommended by your doctor (these help the dry form of AMD and may reduce progression risk).
• Do not smoke — smoking significantly increases AMD risk and progression.
• Maintain a healthy diet rich in leafy greens (spinach, kale) and fish.

Prognosis
• With consistent treatment, most patients can stabilize or improve their vision. Some patients achieve significant visual gains. The key is early detection and adherence to treatment.`
  },
  {
    id: "cond-dry-amd",
    category: "condition",
    title: "Dry Age-Related Macular Degeneration (Dry AMD)",
    tags: ["AMD", "dry", "drusen", "geographic atrophy", "AREDS"],
    content: `DRY AGE-RELATED MACULAR DEGENERATION (DRY AMD)

What Is Dry AMD?
Dry AMD is the most common form of age-related macular degeneration, accounting for about 80–90% of cases. It occurs when the macula thins and small yellow deposits called drusen accumulate. Vision loss is usually gradual.

Stages
• Early AMD: Small drusen, usually no vision loss. Found on routine exam.
• Intermediate AMD: Larger drusen and/or pigment changes. Mild vision changes may begin.
• Advanced Dry AMD (Geographic Atrophy): Areas of the retina waste away (atrophy), causing blind spots in central vision.

Symptoms
• Gradual blurring of central vision.
• Need for brighter light when reading.
• Difficulty adapting to low light.
• Colors may appear less vivid.
• In advanced stages, a blurry or blind spot in the center of vision.

Monitoring
• Regular eye exams with OCT imaging to track changes.
• Use the Amsler grid daily at home — report any new distortion, waviness, or missing spots immediately (these could signal conversion to wet AMD, which requires urgent treatment).

Treatment
• AREDS2 vitamins: A specific formula of antioxidants and minerals shown to reduce the risk of progression in intermediate AMD. Ask your doctor if this is right for you. The AREDS2 formula includes: Vitamin C (500 mg), Vitamin E (400 IU), Lutein (10 mg), Zeaxanthin (2 mg), Zinc (80 mg), Copper (2 mg).
• For Geographic Atrophy: Newer treatments (Syfovre, Izervay) are now available that can slow the progression of atrophy. Ask your doctor if you are a candidate.
• There is no treatment to reverse damage already done — the goal is to slow progression.

Lifestyle Recommendations
• Do not smoke.
• Eat a diet rich in leafy green vegetables, fish, and nuts.
• Exercise regularly and manage blood pressure and cholesterol.
• Wear sunglasses with UV protection outdoors.
• Use good lighting when reading or doing close work.`
  },
  {
    id: "cond-dr",
    category: "condition",
    title: "Diabetic Retinopathy",
    tags: ["diabetes", "diabetic", "retinopathy", "DME"],
    content: `DIABETIC RETINOPATHY

What Is Diabetic Retinopathy?
Diabetic retinopathy is a complication of diabetes that damages the blood vessels in the retina. It is the leading cause of blindness in working-age adults but can be managed effectively with early detection and treatment.

Stages
• Mild Nonproliferative: Small areas of balloon-like swelling (microaneurysms) in retinal blood vessels.
• Moderate Nonproliferative: Some blood vessels are blocked, and small hemorrhages appear.
• Severe Nonproliferative: Many blood vessels are blocked, signaling the retina to grow new vessels.
• Proliferative Diabetic Retinopathy (PDR): New, abnormal blood vessels grow on the retina. These fragile vessels can bleed (vitreous hemorrhage) or cause retinal detachment.

Diabetic Macular Edema (DME)
• At any stage, fluid can leak into the macula (center of the retina), causing swelling and blurred central vision. This is called diabetic macular edema (DME) and is the most common cause of vision loss from diabetic retinopathy.

Symptoms
• Often NO symptoms in early stages — this is why regular dilated eye exams are critical.
• Blurry or fluctuating vision.
• Floaters or dark spots.
• Difficulty with color perception.
• Vision loss.

Treatment
• DME: Anti-VEGF injections (Eylea, Avastin, Vabysmo) and/or focal laser.
• PDR: PRP laser treatment and/or anti-VEGF injections. Surgery (vitrectomy) if bleeding or retinal detachment occurs.
• Control of diabetes: The most important factor. Good blood sugar, blood pressure, and cholesterol control significantly reduce the risk of retinopathy progression.

What You Can Do
• Keep your hemoglobin A1c below 7% (or as directed by your physician).
• Control blood pressure and cholesterol.
• Do not smoke.
• Keep all scheduled eye appointments — even if your vision seems fine.
• Report any new symptoms (floaters, blurry vision, vision loss) promptly.`
  },
  {
    id: "cond-rvo",
    category: "condition",
    title: "Retinal Vein Occlusion (RVO)",
    tags: ["RVO", "BRVO", "CRVO", "vein occlusion"],
    content: `RETINAL VEIN OCCLUSION (RVO)

What Is a Retinal Vein Occlusion?
A retinal vein occlusion occurs when a vein that drains blood from the retina becomes blocked, causing blood and fluid to leak into the retina. This can result in swelling (macular edema) and vision loss.

Types
• Branch Retinal Vein Occlusion (BRVO): A smaller branch vein is blocked. Usually affects part of the vision.
• Central Retinal Vein Occlusion (CRVO): The main vein of the retina is blocked. Can cause more significant vision loss.

Risk Factors
• High blood pressure (most common risk factor).
• Diabetes.
• Glaucoma.
• Blood clotting disorders.
• Age over 50.

Symptoms
• Sudden painless blurring or loss of vision, usually in one eye.
• Floaters.
• Dark areas in your vision.

Treatment
• Anti-VEGF injections (Eylea, Avastin, Vabysmo) to reduce macular edema and improve vision.
• Steroid injections or implants in some cases.
• Laser treatment may be needed if abnormal new blood vessels develop.
• Treatment of underlying conditions (blood pressure control, diabetes management).

Prognosis
• With treatment, many patients experience significant improvement in vision.
• BRVO generally has a better visual outcome than CRVO.
• Regular follow-up and ongoing treatment may be needed for months to years.`
  },
  {
    id: "cond-erm",
    category: "condition",
    title: "Epiretinal Membrane (Macular Pucker)",
    tags: ["ERM", "macular pucker", "membrane"],
    content: `EPIRETINAL MEMBRANE (MACULAR PUCKER)

What Is an Epiretinal Membrane?
An epiretinal membrane (ERM) is a thin layer of scar-like tissue that forms on the surface of the macula (the central part of the retina). As this membrane contracts, it can wrinkle or pucker the retina, causing distorted or blurry vision.

Causes
• Most commonly occurs as a normal part of aging.
• Can also develop after eye surgery, retinal tears, inflammation, or trauma.

Symptoms
• Mild: No symptoms — found incidentally during a routine exam.
• Moderate to severe: Blurry or distorted central vision, straight lines appear wavy, difficulty reading or seeing fine detail.

Diagnosis
• OCT imaging clearly shows the membrane and any associated retinal distortion or swelling.

Treatment
• Observation: Mild ERMs with good vision are monitored with regular exams.
• Surgery (vitrectomy with membrane peel): Recommended when the ERM significantly affects vision or is worsening. The surgeon removes the vitreous gel and carefully peels the membrane off the retina.

Surgical Outcomes
• Most patients experience improvement in vision and reduction in distortion after surgery.
• Recovery takes several weeks to months for best vision.
• Risks include cataract progression, retinal tear, and (rarely) retinal detachment.`
  },
  {
    id: "cond-macular-hole",
    category: "condition",
    title: "Macular Hole",
    tags: ["macular hole", "surgery", "face-down"],
    content: `MACULAR HOLE

What Is a Macular Hole?
A macular hole is a small break in the macula — the part of the retina responsible for sharp, central vision. This causes a blind spot or distortion in the center of your vision.

Causes
• Most commonly occurs due to age-related changes in the vitreous gel (the jelly inside the eye). As the vitreous shrinks, it can pull on the macula and create a hole.
• Less commonly: eye trauma, high myopia (nearsightedness), or other retinal conditions.

Symptoms
• Blurry or distorted central vision in one eye.
• A dark or missing spot in the center of your vision.
• Straight lines appear bent or wavy.

Stages
• Stage 1 (Foveal detachment): Small. Sometimes closes on its own.
• Stage 2–3: The hole enlarges. Less likely to close without surgery.
• Stage 4 (Full-thickness with complete vitreous separation): Requires surgery.

Treatment
• Vitrectomy surgery with gas bubble: The vitreous gel is removed, the hole is treated, and a gas bubble is placed inside the eye. The bubble acts as a bandage, holding the edges of the hole together while it heals.
• Face-down positioning: You will need to maintain a face-down position for several days to a week after surgery so the gas bubble presses against the macula. Your surgeon will give specific positioning instructions.

Success Rate
• Surgery successfully closes the macular hole in about 90–95% of cases.
• Vision improvement varies — it depends on how long the hole was present and its size. Early treatment generally gives better results.

Important Reminders
• You CANNOT fly until the gas bubble dissolves.
• Inform any other doctors/anesthesiologists about the gas bubble if you need another procedure.`
  },
  {
    id: "cond-rd",
    category: "condition",
    title: "Retinal Detachment — Warning Signs",
    tags: ["retinal detachment", "emergency", "flashes", "floaters"],
    content: `RETINAL DETACHMENT — WARNING SIGNS

What Is a Retinal Detachment?
A retinal detachment occurs when the retina (the light-sensitive layer at the back of the eye) separates from its underlying support tissue. Without prompt treatment, a retinal detachment can cause permanent vision loss.

This Is an Eye Emergency
If you experience the symptoms below, contact your retina specialist or go to the emergency room immediately. Early treatment dramatically improves outcomes.

Warning Signs
• FLASHES of light — like a camera flash or lightning bolt, especially in your peripheral vision.
• FLOATERS — a sudden increase in floaters (dark spots, cobwebs, strings, or a shower of tiny dots).
• A SHADOW or CURTAIN — a dark shadow or curtain coming across your vision from any direction.
• VISION LOSS — sudden decrease in vision.

Risk Factors
• Previous retinal detachment in the other eye.
• High myopia (nearsightedness).
• Previous eye surgery (especially cataract surgery).
• Family history of retinal detachment.
• Eye trauma.

Treatment
• Retinal detachment requires surgery. Options include pneumatic retinopexy (office-based), scleral buckle, or vitrectomy, depending on the type and severity.
• The sooner the retina is repaired, the better the chance of recovering vision — especially if the central vision (macula) has not yet detached.

Key Message
Do NOT wait and see if symptoms improve. Flashes, new floaters, and shadows/curtains in your vision require same-day evaluation. Call your retina doctor's office immediately.`
  },
  {
    id: "cond-amsler",
    category: "condition",
    title: "How to Use the Amsler Grid",
    tags: ["amsler", "monitoring", "AMD", "home test"],
    content: `HOW TO USE THE AMSLER GRID

What Is the Amsler Grid?
The Amsler grid is a simple chart with a grid pattern and a central dot. It helps you monitor your central vision at home for changes that could indicate worsening macular disease (such as wet AMD or macular edema).

How to Use It — Daily
1. Wear your reading glasses or bifocals (the ones you use for near vision).
2. Hold the grid at a comfortable reading distance (about 12–14 inches).
3. Cover one eye completely.
4. Look directly at the center dot with the uncovered eye.
5. While staring at the center dot, notice if any lines appear wavy, distorted, blurry, or missing.
6. Repeat with the other eye.

What to Look For
• Wavy, bent, or distorted lines.
• Blurry, dark, or missing areas.
• Any change from what you normally see.

If You Notice a Change
• Contact your retina doctor's office that same day.
• A new distortion or missing area could mean your condition is changing and may need treatment.
• Do not wait for your next scheduled appointment.

Tips
• Check your Amsler grid at the same time each day (e.g., with morning coffee).
• Always test each eye separately.
• Keep the grid in a convenient place — on the refrigerator, bathroom mirror, or bedside table.
• Good lighting is important — use your reading lamp.

Your doctor's office can provide you with an Amsler grid card, or you can download one from the American Academy of Ophthalmology website.`
  },
];

// ── Print helper ───────────────────────────────────────────────────
function printHandout(handout) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${handout.title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; font-size: 13pt; }
  h1 { font-size: 16pt; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 20px; }
  pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 13pt; line-height: 1.7; }
  @media print { body { margin: 0.5in; } }
</style></head><body>
<pre>${handout.content}</pre>
<script>window.print();</script>
</body></html>`);
  win.document.close();
}

// ── Component ──────────────────────────────────────────────────────
export default function PatientEducation({ onBack }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return HANDOUTS.filter((h) => {
      if (category !== "all" && h.category !== category) return false;
      if (!q) return true;
      return (
        h.title.toLowerCase().includes(q) ||
        h.tags.some((t) => t.toLowerCase().includes(q)) ||
        h.content.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", color: S.muted, fontFamily: S.font, fontSize: "0.78rem", cursor: "pointer" }}>&larr; Home</button>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>Patient Education Library</span>
        <span style={{ fontSize: "0.72rem", color: S.muted, fontFamily: S.mono, marginLeft: "auto" }}>{filtered.length} handout{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Search + Filters */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 20px 0" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search handouts... (e.g. AMD, injection, diabetic, floaters)"
          style={{ display: "block", width: "100%", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 16px", color: S.text, fontFamily: S.font, fontSize: "0.88rem", boxSizing: "border-box", marginBottom: 12 }}
        />
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                background: category === cat.id ? S.accent : "transparent",
                color: category === cat.id ? "#fff" : S.muted,
                border: `1px solid ${category === cat.id ? S.accent : S.border}`,
                borderRadius: 20,
                padding: "5px 14px",
                fontSize: "0.76rem",
                fontFamily: S.mono,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Handout list */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px 48px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: S.muted, fontSize: "0.88rem" }}>
            No handouts match your search.
          </div>
        )}
        {filtered.map((h) => {
          const isOpen = expanded === h.id;
          return (
            <div key={h.id} style={{ background: S.card, border: `1px solid ${isOpen ? S.accent : S.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
              {/* Title row */}
              <button
                onClick={() => setExpanded(isOpen ? null : h.id)}
                style={{ width: "100%", background: "none", border: "none", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: "0.72rem", fontFamily: S.mono, color: S.amber, fontWeight: 700, textTransform: "uppercase", minWidth: 75 }}>
                  {h.category === "injection" ? "Injection" : h.category === "procedure" ? "Procedure" : "Condition"}
                </span>
                <span style={{ fontSize: "0.88rem", color: S.bright, fontFamily: S.font, fontWeight: 600, flex: 1 }}>{h.title}</span>
                <span style={{ color: S.muted, fontSize: "0.8rem", transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>&#9660;</span>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: "0 18px 16px" }}>
                  {/* Tags */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                    {h.tags.map((t) => (
                      <span key={t} style={{ background: "#312e81", color: S.accentLight, padding: "2px 8px", borderRadius: 20, fontSize: "0.62rem", fontFamily: S.mono, fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                  {/* Content */}
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: S.font, fontSize: "0.82rem", color: S.text, lineHeight: 1.65, margin: 0, maxHeight: 500, overflowY: "auto", paddingRight: 8 }}>
                    {h.content}
                  </pre>
                  {/* Print button */}
                  <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                    <button
                      onClick={() => printHandout(h)}
                      style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: "0.8rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}
                    >
                      Print Handout
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
